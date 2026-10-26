"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { clientIpFrom } from "@/lib/client-ip";
import { execute, queryOne } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/session";
import { normalizePhone } from "@/lib/phone";
import { customerOtpOn, emailLayout, escapeHtml, readNotifyConfig, sendEmail } from "@/lib/notify";
import { checkResetLink, createResetLink, isTrustedDevice, resendOtp, startOtp, trustDevice, verifyOtp } from "@/lib/otp";
import type { ActionState } from "@/lib/action-state";

type UserRow = { id: number; password_hash: string; is_active: number };

// Equalises timing when the account doesn't exist.
const DUMMY_HASH = "$2b$10$WO3cKSmn9X3uFkecC3mn2.oMGeWjBS184Lb4zkl2XtBlQq36I3KR2";

function safeNext(value: FormDataEntryValue | null, fallback: string) {
  const next = String(value ?? "");
  return next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

async function clientIp() {
  const h = await headers();
  return clientIpFrom(h) ?? "unknown";
}

export async function adminLogin(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email and password are required", values: { email } };

  // Brute-force protection: too many recent failures for this email or from this IP.
  const ip = await clientIp();
  const failures = await queryOne<{ n: number }>(
    `SELECT COUNT(*) n FROM activity_logs WHERE action = 'auth.login_failed' AND created_at >= NOW() - INTERVAL ? MINUTE
     AND (entity_id = ? OR ip_address = ?)`,
    [LOCK_MINUTES, email.slice(0, 40), ip],
  );
  if (Number(failures?.n ?? 0) >= MAX_FAILED) {
    return { error: `Too many failed attempts. Try again in ${LOCK_MINUTES} minutes.`, values: { email } };
  }

  const user = await queryOne<UserRow & { name: string }>(
    "SELECT id, name, password_hash, is_active FROM users WHERE email = ? AND role = 'admin'",
    [email],
  );
  const valid = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !valid) {
    await logActivity({
      action: "auth.login_failed", module: "auth", entityType: "email", entityId: email.slice(0, 40),
      description: `Failed admin sign-in for ${email}${user ? "" : " (no such account)"}`,
    });
    return { error: "Invalid email or password", values: { email } };
  }
  if (!user.is_active) {
    await logActivity({
      actor: { id: user.id, name: user.name }, action: "auth.login_blocked", module: "auth", entityType: "email", entityId: email.slice(0, 40),
      description: `Disabled account ${email} tried to sign in`,
    });
    return { error: "This account has been disabled", values: { email } };
  }

  // Second step: a code by email, unless this browser was trusted after an earlier code.
  const notify = await readNotifyConfig();
  if (notify.security.adminOtp && notify.email.enabled && !(await isTrustedDevice(user.id, user.password_hash))) {
    const sent = await startOtp({ purpose: "admin_login", channel: "email", target: email, userId: user.id, payload: { next: safeNext(formData.get("next"), "/admin") } });
    if (!sent.ok) return { error: sent.error, values: { email } };
    await logActivity({ actor: { id: user.id, name: user.name }, action: "auth.otp_sent", module: "auth", entityType: "user", entityId: user.id, description: `Sign-in code emailed to ${user.name}` });
    redirect("/admin/login/verify");
  }
  await execute("UPDATE users SET last_login_at = NOW() WHERE id = ?", [user.id]);
  await createSession(user.id, "admin");
  await logActivity({ actor: { id: user.id, name: user.name }, action: "auth.login", module: "auth", entityType: "user", entityId: user.id, description: `${user.name} signed in` });
  redirect(safeNext(formData.get("next"), "/admin"));
}

/** Step 2 of admin sign-in: the emailed code. */
export async function verifyAdminOtp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const result = await verifyOtp("admin_login", String(formData.get("code") ?? ""));
  if (!result.ok) {
    if (result.restart) redirect("/admin/login?expired=1");
    return { error: result.error };
  }
  const { challenge } = result;
  const user = await queryOne<{ id: number; name: string; password_hash: string; is_active: number }>(
    "SELECT id, name, password_hash, is_active FROM users WHERE id = ? AND role = 'admin'", [challenge.userId ?? 0],
  );
  if (!user || !user.is_active) redirect("/admin/login");
  if (formData.get("trust") === "on") {
    const cfg = await readNotifyConfig();
    await trustDevice(user.id, user.password_hash, cfg.security.trustDays);
  }
  await execute("UPDATE users SET last_login_at = NOW() WHERE id = ?", [user.id]);
  await createSession(user.id, "admin");
  await logActivity({ actor: { id: user.id, name: user.name }, action: "auth.login", module: "auth", entityType: "user", entityId: user.id, description: `${user.name} signed in with an email code${formData.get("trust") === "on" ? " (device trusted)" : ""}` });
  redirect(safeNext(challenge.payload.next ?? null, "/admin"));
}

export async function resendAdminOtp(_prev: ActionState): Promise<ActionState> {
  void _prev;
  const r = await resendOtp("admin_login");
  return r.ok ? { ok: true, message: "A new code is on its way" } : { error: r.error };
}

/** Always answers the same way, so it can't be used to find out which emails are staff accounts. */
export async function requestAdminReset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter your email address", values: { email } };
  const done: ActionState = { ok: true, message: "If that email belongs to a staff account, a reset link is on its way. It works for 30 minutes." };
  const cfg = await readNotifyConfig();
  if (!cfg.email.enabled) return { error: "Email isn't set up on this site yet — ask the super admin to reset your password." };
  const user = await queryOne<{ id: number; name: string; is_active: number }>("SELECT id, name, is_active FROM users WHERE email = ? AND role = 'admin'", [email]);
  if (!user || !user.is_active) return done;
  const link = await createResetLink(user.id, email);
  if ("error" in link) return { error: link.error };
  const site = (process.env.SITE_URL || "https://fatehabd.com").replace(/\/$/, "");
  const url = `${site}/admin/login/reset?i=${link.id}&t=${link.token}`;
  await sendEmail({
    to: email, purpose: "admin.reset", subject: "Reset your FatehaBD admin password",
    text: `Hi ${user.name}, open this link within 30 minutes to choose a new password: ${url}
If you didn't ask for this, ignore this email.`,
    html: emailLayout("Reset your password", `<p>Hi ${escapeHtml(user.name)},</p><p>Someone (hopefully you) asked to reset the password of your FatehaBD admin account. The link works once, for 30 minutes.</p>`,
      { action: { label: "Choose a new password", url }, footer: "Didn't ask for this? Ignore this email — your password stays the same." }),
  });
  await logActivity({ actor: { id: user.id, name: user.name }, action: "auth.reset_requested", module: "auth", entityType: "user", entityId: user.id, description: `Password reset link emailed to ${user.name}` });
  return done;
}

export async function resetAdminPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = Number(formData.get("i"));
  const token = String(formData.get("t") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { fieldErrors: { password: "Use at least 8 characters" } };
  if (password !== String(formData.get("confirm") ?? "")) return { fieldErrors: { confirm: "Passwords don't match" } };
  const link = await checkResetLink(id, token, true);
  if (!link) return { error: "This link has expired or was already used. Ask for a new one." };
  const user = await queryOne<{ id: number; name: string }>("SELECT id, name FROM users WHERE id = ? AND role = 'admin' AND is_active = 1", [link.userId]);
  if (!user) return { error: "This account is not active." };
  await execute("UPDATE users SET password_hash = ? WHERE id = ?", [await bcrypt.hash(password, 10), user.id]);
  await logActivity({ actor: { id: user.id, name: user.name }, action: "auth.password_reset", module: "auth", entityType: "user", entityId: user.id, description: `${user.name} reset their password by email link` });
  redirect("/admin/login?reset=1");
}

export async function adminLogout() {
  const admin = await getAdmin();
  if (admin) await logActivity({ actor: admin, action: "auth.logout", module: "auth", entityType: "user", entityId: admin.id, description: `${admin.name} signed out` });
  await deleteSession("admin");
  redirect("/admin/login");
}

export async function customerLogin(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const rawPhone = String(formData.get("phone") ?? "");
  const password = String(formData.get("password") ?? "");
  const phone = normalizePhone(rawPhone);
  if (!phone || !password) return { error: "মোবাইল নাম্বার ও পাসওয়ার্ড দিন", values: { phone: rawPhone } };

  // Brute-force protection, same rules as staff sign-in.
  const ip = await clientIp();
  const failures = await queryOne<{ n: number }>(
    `SELECT COUNT(*) n FROM activity_logs WHERE action = 'customer.login_failed' AND created_at >= NOW() - INTERVAL ? MINUTE
     AND (entity_id = ? OR ip_address = ?)`,
    [LOCK_MINUTES, phone, ip],
  );
  if (Number(failures?.n ?? 0) >= MAX_FAILED) {
    return { error: `অনেকবার ভুল চেষ্টা হয়েছে। ${LOCK_MINUTES} মিনিট পরে আবার চেষ্টা করুন।`, values: { phone: rawPhone } };
  }

  const user = await queryOne<UserRow>(
    "SELECT id, password_hash, is_active FROM users WHERE phone = ? AND role = 'customer'",
    [phone],
  );
  const valid = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !valid) {
    await logActivity({ action: "customer.login_failed", module: "auth", entityType: "phone", entityId: phone, description: `Failed customer sign-in for ${phone}` });
    return { error: "মোবাইল নাম্বার বা পাসওয়ার্ড সঠিক নয়", values: { phone: rawPhone } };
  }
  if (!user.is_active) return { error: "এই অ্যাকাউন্টটি বন্ধ করা হয়েছে", values: { phone: rawPhone } };

  await execute("UPDATE users SET last_login_at = NOW() WHERE id = ?", [user.id]);
  await createSession(user.id, "customer");
  redirect(safeNext(formData.get("next"), "/account"));
}

export async function customerRegister(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = {
    name: String(formData.get("name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim(),
  };
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const fieldErrors: Record<string, string> = {};
  if (values.name.length < 2) fieldErrors.name = "আপনার নাম লিখুন";
  const phone = normalizePhone(values.phone);
  if (!phone) fieldErrors.phone = "সঠিক ১১ ডিজিটের মোবাইল নাম্বার দিন";
  if (password.length < 6) fieldErrors.password = "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে";
  if (password !== confirm) fieldErrors.confirm = "পাসওয়ার্ড মিলছে না";
  if (Object.keys(fieldErrors).length || !phone) return { fieldErrors, values };

  const exists = await queryOne<{ id: number }>("SELECT id FROM users WHERE phone = ?", [phone]);
  if (exists) return { fieldErrors: { phone: "এই নাম্বার দিয়ে আগেই অ্যাকাউন্ট খোলা হয়েছে, লগইন করুন" }, values };

  const hash = await bcrypt.hash(password, 10);
  // With SMS verification on, the account is created only after the code from the phone is entered.
  if (await customerOtpOn()) {
    const sent = await startOtp({ purpose: "customer_register", channel: "sms", target: phone, payload: { name: values.name.slice(0, 120), address: values.address.slice(0, 500), hash } });
    if (!sent.ok) return { error: sent.error.startsWith("Too many") ? "অনেকবার কোড পাঠানো হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।" : sent.error, values };
    redirect("/account/verify");
  }
  const result = await execute(
    "INSERT INTO users (name, phone, password_hash, role, address) VALUES (?, ?, ?, 'customer', ?)",
    [values.name, phone, hash, values.address || null],
  );
  // Earlier guest orders with this phone still appear in the account (matched by phone), but they are NOT
  // attached to it: the number isn't verified, so their name/address stay hidden from whoever registered it.
  await createSession(result.insertId, "customer");
  redirect("/account");
}

export async function customerLogout() {
  await deleteSession("customer");
  redirect("/");
}
