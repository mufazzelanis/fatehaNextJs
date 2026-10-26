import "server-only";
import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { execute, queryOne } from "./db";
import { clientIpFrom } from "./client-ip";
import { emailLayout, escapeHtml, readNotifyConfig, sendEmail, sendSms } from "./notify";
import { fillTemplate } from "./notify-config";

export type OtpPurpose = "admin_login" | "admin_reset" | "customer_register" | "customer_login" | "customer_reset" | "dealer_reset";

const CODE_TTL_MIN = 5;
const LINK_TTL_MIN = 30;
const MAX_ATTEMPTS = 5;
const RESEND_SECONDS = 60;
const MAX_SENDS = 5;
const PER_TARGET_HOUR = 6;
const PER_IP_HOUR = 15;
const COOKIE = "fb_otp";

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be set (32+ characters)");
  return s;
}
const jwtKey = () => new TextEncoder().encode(`otp:${secret()}`);
const hashCode = (purpose: string, code: string) => createHmac("sha256", secret()).update(`${purpose}:${code}`).digest("hex");
const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export const maskEmail = (e: string) => e.replace(/^(.)(.*)(@.*)$/, (_m, a: string, b: string, c: string) => `${a}${"•".repeat(Math.min(b.length, 5))}${c}`);
export const maskPhone = (p: string) => (p.length >= 11 ? `${p.slice(0, 3)}•••••${p.slice(-3)}` : p);

type Row = {
  id: number; purpose: OtpPurpose; channel: "email" | "sms"; target: string; user_id: number | null; code_hash: string; payload: string | null;
  attempts: number; sends: number; expired: number; consumed_at: Date | null; wait: number;
};
export type Challenge = { id: number; purpose: OtpPurpose; channel: "email" | "sms"; target: string; userId: number | null; payload: Record<string, string>; masked: string; wait: number; expired: boolean };

const toChallenge = (r: Row): Challenge => {
  let payload: Record<string, string> = {};
  try { payload = r.payload ? JSON.parse(r.payload) : {}; } catch {}
  return { id: r.id, purpose: r.purpose, channel: r.channel, target: r.target, userId: r.user_id, payload,
    masked: r.channel === "email" ? maskEmail(r.target) : maskPhone(r.target), wait: Math.max(0, Number(r.wait)), expired: !!Number(r.expired) };
};

async function loadRow(id: number) {
  return queryOne<Row>(
    `SELECT *, expires_at < NOW() AS expired, GREATEST(0, ? - TIMESTAMPDIFF(SECOND, last_sent_at, NOW())) AS wait FROM otp_codes WHERE id = ?`,
    [RESEND_SECONDS, id],
  );
}

async function deliver(purpose: OtpPurpose, channel: "email" | "sms", target: string, code: string) {
  if (channel === "email") {
    return sendEmail({
      to: target, purpose: `otp.${purpose}`,
      subject: `${code} is your FatehaBD sign-in code`,
      text: `Your FatehaBD admin sign-in code is ${code}. It expires in ${CODE_TTL_MIN} minutes. If this wasn't you, change your password.`,
      html: emailLayout("Your sign-in code",
        `<p>Use this code to finish signing in to the FatehaBD admin panel:</p>
         <p style="font-size:34px;font-weight:700;letter-spacing:8px;margin:18px 0;color:#0f172a">${escapeHtml(code)}</p>
         <p style="color:#64748b">It expires in ${CODE_TTL_MIN} minutes and works once. If you didn't try to sign in, someone knows your password — change it now.</p>`),
    });
  }
  const cfg = await readNotifyConfig();
  return sendSms({ to: target, purpose: `otp.${purpose}`, text: fillTemplate(cfg.templates.otpSms, { code }) });
}

/** Too many codes for this phone/email or from this IP in the last hour? */
async function rateLimited(target: string, ip: string | null) {
  const t = await queryOne<{ n: number }>("SELECT COALESCE(SUM(sends),0) AS n FROM otp_codes WHERE target = ? AND created_at >= NOW() - INTERVAL 1 HOUR", [target]);
  if (Number(t?.n ?? 0) >= PER_TARGET_HOUR) return "Too many codes were sent to this number/email. Please try again in an hour.";
  if (ip) {
    const i = await queryOne<{ n: number }>("SELECT COALESCE(SUM(sends),0) AS n FROM otp_codes WHERE ip_address = ? AND created_at >= NOW() - INTERVAL 1 HOUR", [ip]);
    if (Number(i?.n ?? 0) >= PER_IP_HOUR) return "Too many codes were requested from this network. Please try again later.";
  }
  return null;
}

/** Creates a code, sends it and remembers the challenge in a short-lived cookie. */
export async function startOtp(opts: { purpose: OtpPurpose; channel: "email" | "sms"; target: string; userId?: number | null; payload?: Record<string, string> }):
  Promise<{ ok: true; masked: string } | { ok: false; error: string }> {
  const ip = clientIpFrom(await headers());
  const limited = await rateLimited(opts.target, ip);
  if (limited) return { ok: false, error: limited };
  // Only the newest code for a purpose + target is valid.
  await execute("UPDATE otp_codes SET consumed_at = NOW() WHERE purpose = ? AND target = ? AND consumed_at IS NULL", [opts.purpose, opts.target]);
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const res = await execute(
    `INSERT INTO otp_codes (purpose, channel, target, user_id, code_hash, payload, expires_at, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, NOW() + INTERVAL ? MINUTE, ?)`,
    [opts.purpose, opts.channel, opts.target, opts.userId ?? null, hashCode(opts.purpose, code), opts.payload ? JSON.stringify(opts.payload) : null, CODE_TTL_MIN, ip],
  );
  const sent = await deliver(opts.purpose, opts.channel, opts.target, code);
  if (!sent.ok) {
    await execute("DELETE FROM otp_codes WHERE id = ?", [res.insertId]);
    return { ok: false, error: opts.channel === "email" ? "Couldn't send the code by email. Please try again or contact the admin." : "কোড পাঠানো যায়নি। কিছুক্ষণ পরে আবার চেষ্টা করুন।" };
  }
  const token = await new SignJWT({ cid: res.insertId, p: opts.purpose }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("15m").sign(jwtKey());
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 15 * 60 });
  return { ok: true, masked: opts.channel === "email" ? maskEmail(opts.target) : maskPhone(opts.target) };
}

/** The pending challenge of this browser for a purpose (or null). */
export async function readChallenge(purposes: OtpPurpose | OtpPurpose[]): Promise<Challenge | null> {
  const list = Array.isArray(purposes) ? purposes : [purposes];
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, jwtKey(), { algorithms: ["HS256"] });
    if (!list.includes(payload.p as OtpPurpose) || typeof payload.cid !== "number") return null;
    const row = await loadRow(payload.cid);
    return row && !row.consumed_at && row.purpose === payload.p ? toChallenge(row) : null;
  } catch {
    return null;
  }
}

export async function resendOtp(purposes: OtpPurpose | OtpPurpose[]): Promise<{ ok: true } | { ok: false; error: string }> {
  const c = await readChallenge(purposes);
  if (!c) return { ok: false, error: "This code request has expired. Please start again." };
  if (c.wait > 0) return { ok: false, error: `Please wait ${c.wait} seconds before asking for a new code.` };
  const row = await loadRow(c.id);
  if (!row || row.sends >= MAX_SENDS) return { ok: false, error: "Too many codes for this request. Please start again later." };
  const limited = await rateLimited(c.target, clientIpFrom(await headers()));
  if (limited) return { ok: false, error: limited };
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const sent = await deliver(c.purpose, c.channel, c.target, code);
  if (!sent.ok) return { ok: false, error: "Couldn't send a new code. Please try again shortly." };
  await execute(
    "UPDATE otp_codes SET code_hash = ?, sends = sends + 1, attempts = 0, last_sent_at = NOW(), expires_at = NOW() + INTERVAL ? MINUTE WHERE id = ?",
    [hashCode(c.purpose, code), CODE_TTL_MIN, c.id],
  );
  return { ok: true };
}

/** Checks a typed code. Success consumes it (one use) and clears the cookie. */
export async function verifyOtp(purposes: OtpPurpose | OtpPurpose[], code: string): Promise<{ ok: true; challenge: Challenge } | { ok: false; error: string; restart?: boolean }> {
  const c = await readChallenge(purposes);
  if (!c) return { ok: false, error: "This code request has expired. Please start again.", restart: true };
  const row = await loadRow(c.id);
  if (!row) return { ok: false, error: "Please start again.", restart: true };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, error: "Too many wrong codes. Please ask for a new code.", restart: false };
  if (Number(row.expired)) return { ok: false, error: "This code has expired. Ask for a new one." };
  const clean = code.replace(/\D/g, "");
  if (clean.length !== 6 || !same(hashCode(row.purpose, clean), row.code_hash)) {
    await execute("UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?", [row.id]);
    const left = MAX_ATTEMPTS - row.attempts - 1;
    return { ok: false, error: left > 0 ? `Wrong code. ${left} attempt${left === 1 ? "" : "s"} left.` : "Too many wrong codes. Please ask for a new code." };
  }
  // Atomic single use (two tabs can't both succeed).
  const used = await execute("UPDATE otp_codes SET consumed_at = NOW() WHERE id = ? AND consumed_at IS NULL", [row.id]);
  if (!used.affectedRows) return { ok: false, error: "This code was already used.", restart: true };
  (await cookies()).delete(COOKIE);
  return { ok: true, challenge: c };
}

export async function clearChallenge() {
  (await cookies()).delete(COOKIE);
}

// ───────────── admin password-reset links

export async function createResetLink(userId: number, email: string): Promise<{ id: number; token: string } | { error: string }> {
  const limited = await rateLimited(email, clientIpFrom(await headers()));
  if (limited) return { error: limited };
  await execute("UPDATE otp_codes SET consumed_at = NOW() WHERE purpose = 'admin_reset' AND target = ? AND consumed_at IS NULL", [email]);
  const token = randomBytes(32).toString("hex");
  const res = await execute(
    "INSERT INTO otp_codes (purpose, channel, target, user_id, code_hash, expires_at, ip_address) VALUES ('admin_reset', 'email', ?, ?, ?, NOW() + INTERVAL ? MINUTE, ?)",
    [email, userId, hashCode("admin_reset", token), LINK_TTL_MIN, clientIpFrom(await headers())],
  );
  return { id: res.insertId, token };
}

export async function checkResetLink(id: number, token: string, consume = false): Promise<{ userId: number; email: string } | null> {
  if (!Number.isInteger(id) || id <= 0 || !/^[a-f0-9]{64}$/.test(token)) return null;
  const row = await loadRow(id);
  if (!row || row.purpose !== "admin_reset" || row.consumed_at || Number(row.expired) || !row.user_id) return null;
  if (!same(hashCode("admin_reset", token), row.code_hash)) return null;
  if (consume) {
    const used = await execute("UPDATE otp_codes SET consumed_at = NOW() WHERE id = ? AND consumed_at IS NULL", [id]);
    if (!used.affectedRows) return null;
  }
  return { userId: row.user_id, email: row.target };
}

// ───────────── "trust this device" for admin sign-in codes

const trustKey = () => new TextEncoder().encode(`trust:${secret()}`);
const TRUST_COOKIE = "fb_admin_trust";
/** Bound to the password: changing the password revokes every trusted device. */
const pwTag = (passwordHash: string) => createHmac("sha256", secret()).update(passwordHash).digest("hex").slice(0, 16);

export async function trustDevice(userId: number, passwordHash: string, days: number) {
  if (days <= 0) return;
  const token = await new SignJWT({ uid: userId, pw: pwTag(passwordHash) }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${days}d`).sign(trustKey());
  (await cookies()).set(TRUST_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/admin", maxAge: days * 86400 });
}

export async function isTrustedDevice(userId: number, passwordHash: string) {
  const token = (await cookies()).get(TRUST_COOKIE)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, trustKey(), { algorithms: ["HS256"] });
    return payload.uid === userId && payload.pw === pwTag(passwordHash);
  } catch {
    return false;
  }
}
