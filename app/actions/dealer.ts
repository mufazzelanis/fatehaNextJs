"use server";

import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { headers } from "next/headers";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { execute, queryOne } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/session";
import { resolveArea } from "@/lib/data/locations";
import { normalizePhone } from "@/lib/phone";
import { alertDealerApplication, readNotifyConfig } from "@/lib/notify";
import { resendOtp, startOtp, verifyOtp } from "@/lib/otp";
import { after } from "next/server";
import { clientIpFrom } from "@/lib/client-ip";
import { logActivity } from "@/lib/activity";
import {
  areaHolder, DEALER_DOC_DIR, dealerDocPath, getDealer, isDealerLevel, isMonth, LEVEL_LABEL, monthLabel, monthOf, targetFor,
} from "@/lib/dealer";
import type { ActionState } from "@/lib/action-state";

const DUMMY_HASH = "$2b$10$WO3cKSmn9X3uFkecC3mn2.oMGeWjBS184Lb4zkl2XtBlQq36I3KR2";
const DOC_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };
const MAX_DOC = 3 * 1024 * 1024;
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

export async function registerDealer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const values = {
    applied_level: get("applied_level"), district: get("district"), thana: get("thana"), union: get("union"),
    name: get("name"), phone: get("phone"), email: get("email"), nid_number: get("nid_number"), address: get("address"),
  };
  const fieldErrors: Record<string, string> = {};
  const level = isDealerLevel(values.applied_level) ? values.applied_level : null;
  if (!level) fieldErrors.applied_level = "Choose the dealership you are applying for";
  const districtId = Number(values.district) || 0;
  const thanaId = Number(values.thana) || 0;
  const unionId = Number(values.union) || null;
  if (!districtId) fieldErrors.district = "Select your district";
  if (!thanaId) fieldErrors.thana = "Select your thana / upazila";
  if (level === "union" && !unionId) fieldErrors.union = "Select your union";
  if (values.name.length < 3) fieldErrors.name = "Enter your full name";
  const phone = normalizePhone(values.phone);
  if (!phone) fieldErrors.phone = "Enter a valid 11-digit mobile number";
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) fieldErrors.email = "Enter a valid email or leave it empty";
  if (!/^(\d{10}|\d{13}|\d{17})$/.test(values.nid_number)) fieldErrors.nid_number = "NID must be 10, 13 or 17 digits";
  const password = String(formData.get("password") ?? "");
  if (password.length < 6) fieldErrors.password = "Use at least 6 characters";
  else if (password !== String(formData.get("password_confirmation") ?? "")) fieldErrors.password_confirmation = "Passwords don't match";
  if (values.address.length < 8) fieldErrors.address = "Enter your full address";

  const files: Record<string, File> = {};
  for (const [key, label, imageOnly] of [["photo", "Your photo", true], ["nid_front", "NID front", false], ["nid_back", "NID back", false], ["bank_slip", "Bank slip", false]] as const) {
    const f = formData.get(key);
    if (!(f instanceof File) || f.size === 0) { fieldErrors[key] = `${label} is required`; continue; }
    const ext = DOC_TYPES[f.type];
    if (!ext || (imageOnly && ext === "pdf")) fieldErrors[key] = imageOnly ? "Use a JPG, PNG or WEBP photo" : "Use an image or PDF";
    else if (f.size > MAX_DOC) fieldErrors[key] = "File must be under 3MB";
    else files[key] = f;
  }

  const area = districtId && thanaId ? await resolveArea(districtId, thanaId, level === "union" ? unionId : null) : null;
  if (districtId && thanaId && !area) fieldErrors.thana = "This thana/union is not in the selected district";
  if (phone && !fieldErrors.phone && (await queryOne("SELECT id FROM dealers WHERE phone = ?", [phone]))) {
    fieldErrors.phone = "This number already has a dealer account — sign in instead";
  }
  if (level && area) {
    const holder = await areaHolder(level, { district_id: districtId, thana_id: thanaId, union_id: unionId });
    if (holder) fieldErrors.applied_level = `This ${level} already has an active ${LEVEL_LABEL[level].toLowerCase()}. Choose another area or level.`;
  }
  if (Object.keys(fieldErrors).length) return { error: "Please fix the highlighted fields", fieldErrors, values };

  await mkdir(DEALER_DOC_DIR, { recursive: true });
  const saved: Record<string, string> = {};
  for (const [key, f] of Object.entries(files)) {
    const name = `${key}-${Date.now()}-${randomBytes(6).toString("hex")}.${DOC_TYPES[f.type]}`;
    await writeFile(dealerDocPath(name), Buffer.from(await f.arrayBuffer()));
    saved[key] = name;
  }
  let id: number;
  try {
    const res = await execute(
      `INSERT INTO dealers (applied_level, name, phone, email, nid_number, password_hash, address, district_id, thana_id, union_id,
         photo, nid_front, nid_back, bank_slip, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'pending')`,
      [level, values.name.slice(0, 120), phone, values.email || null, values.nid_number, await bcrypt.hash(password, 10), values.address.slice(0, 500),
       districtId, thanaId, level === "union" ? unionId : null, saved.photo, saved.nid_front, saved.nid_back, saved.bank_slip],
    );
    id = res.insertId;
  } catch (e) {
    for (const f of Object.values(saved)) await unlink(dealerDocPath(f)).catch(() => {});
    if ((e as { code?: string }).code === "ER_DUP_ENTRY") return { fieldErrors: { phone: "This number already has a dealer account" }, values };
    throw e;
  }
  await logActivity({
    action: "dealer.applied", module: "dealers", entityType: "dealer", entityId: id,
    description: `New ${LEVEL_LABEL[level!]} application from ${values.name} (${phone}) — ${[area!.union_name, area!.thana, area!.district].filter(Boolean).join(", ")}`,
  });
  // Admin email alert, after the response so the applicant never waits for it.
  after(() => alertDealerApplication(id));
  await createSession(id, "dealer");
  redirect("/business?applied=1");
}

export async function dealerLogin(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = String(formData.get("phone") ?? "");
  const password = String(formData.get("password") ?? "");
  const phone = normalizePhone(raw);
  if (!phone || !password) return { error: "Enter your mobile number and password", values: { phone: raw } };

  const ip = clientIpFrom(await headers());
  const failures = await queryOne<{ n: number }>(
    `SELECT COUNT(*) n FROM activity_logs WHERE action = 'dealer.login_failed' AND created_at >= NOW() - INTERVAL ? MINUTE AND (entity_id = ? OR ip_address = ?)`,
    [LOCK_MINUTES, phone, ip],
  );
  if (Number(failures?.n ?? 0) >= MAX_FAILED) return { error: `Too many failed attempts. Try again in ${LOCK_MINUTES} minutes.`, values: { phone: raw } };

  const dealer = await queryOne<{ id: number; name: string; password_hash: string }>("SELECT id, name, password_hash FROM dealers WHERE phone = ?", [phone]);
  const valid = await bcrypt.compare(password, dealer?.password_hash ?? DUMMY_HASH);
  if (!dealer || !valid) {
    await logActivity({ action: "dealer.login_failed", module: "dealers", entityType: "phone", entityId: phone, description: `Failed dealer sign-in for ${phone}` });
    return { error: "Mobile number or password is incorrect", values: { phone: raw } };
  }
  await execute("UPDATE dealers SET last_login_at = NOW() WHERE id = ?", [dealer.id]);
  await createSession(dealer.id, "dealer");
  redirect("/business");
}

export async function dealerLogout() {
  await deleteSession("dealer");
  redirect("/business");
}

/** A district dealer sets targets for their thana dealers; a thana dealer for their union dealers. */
export async function setSubTarget(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await getDealer();
  if (!me || me.status !== "active" || (me.level !== "district" && me.level !== "thana")) return { error: "You can't set targets" };
  const month = String(formData.get("month") ?? "");
  const dealerId = Number(formData.get("dealer_id"));
  const raw = String(formData.get("amount") ?? "").trim();
  const amount = raw === "" ? null : Math.round(Number(raw));
  if (!isMonth(month)) return { error: "Choose a month" };
  await connection();
  if (month < monthOf(new Date())) return { error: "Past months can't be changed" };
  if (amount !== null && (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000_000)) return { error: "Enter a valid amount" };

  const childLevel = me.level === "district" ? "thana" : "union";
  const sub = await queryOne<{ id: number; name: string }>(
    `SELECT id, name FROM dealers WHERE id = ? AND level = ? AND status = 'active' AND ${me.level === "district" ? "district_id" : "thana_id"} = ?`,
    [dealerId, childLevel, me.level === "district" ? me.district_id : me.thana_id],
  );
  if (!sub) return { error: "That dealer is not in your area" };

  const mine = await targetFor(me.id, month);
  if (amount !== null && mine && mine.amount > 0) {
    const others = await queryOne<{ total: number }>(
      `SELECT COALESCE(SUM(t.amount),0) AS total FROM dealer_targets t JOIN dealers dl ON dl.id = t.dealer_id
       WHERE t.month = ? AND dl.level = ? AND dl.status = 'active' AND dl.${me.level === "district" ? "district_id" : "thana_id"} = ? AND dl.id <> ?`,
      [month, childLevel, me.level === "district" ? me.district_id : me.thana_id, dealerId],
    );
    const left = mine.amount - Number(others?.total ?? 0);
    if (amount > left) return { error: `Only ৳${Math.max(left, 0).toLocaleString("en-IN")} of your ৳${mine.amount.toLocaleString("en-IN")} target is left to assign` };
  }

  const before = await targetFor(dealerId, month);
  if (amount === null) await execute("DELETE FROM dealer_targets WHERE dealer_id = ? AND month = ?", [dealerId, month]);
  else {
    await execute(
      `INSERT INTO dealer_targets (dealer_id, month, amount, set_by, set_by_id) VALUES (?, ?, ?, 'dealer', ?)
       ON DUPLICATE KEY UPDATE amount = VALUES(amount), set_by = 'dealer', set_by_id = VALUES(set_by_id)`,
      [dealerId, month, amount, me.id],
    );
  }
  await logActivity({
    action: "dealer.target_set", module: "dealers", entityType: "dealer", entityId: dealerId,
    description: `${me.name} (${LEVEL_LABEL[me.level]}) set ${sub.name}'s ${monthLabel(month)} target to ${amount === null ? "none" : `৳${amount}`}`,
    changes: [{ field: `target ${month}`, from: before?.amount ?? null, to: amount }],
  });
  refresh();
  return { ok: true, message: `Target saved for ${sub.name}` };
}

export async function changeDealerPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await getDealer();
  if (!me) return { error: "Please sign in again" };
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("password") ?? "");
  const row = await queryOne<{ password_hash: string }>("SELECT password_hash FROM dealers WHERE id = ?", [me.id]);
  if (!row || !(await bcrypt.compare(current, row.password_hash))) return { fieldErrors: { current: "Current password is incorrect" } };
  if (next.length < 6) return { fieldErrors: { password: "Use at least 6 characters" } };
  if (next !== String(formData.get("password_confirmation") ?? "")) return { fieldErrors: { password_confirmation: "Passwords don't match" } };
  await execute("UPDATE dealers SET password_hash = ? WHERE id = ?", [await bcrypt.hash(next, 10), me.id]);
  await logActivity({ action: "dealer.password_changed", module: "dealers", entityType: "dealer", entityId: me.id, description: `${me.name} changed their dealer password` });
  return { ok: true, message: "Password changed" };
}

/** Dealer "forgot password": SMS code to the registered number (needs a working SMS gateway). */
export async function startDealerReset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = String(formData.get("phone") ?? "");
  const phone = normalizePhone(raw);
  if (!phone) return { error: "Enter a valid 11-digit mobile number", values: { phone: raw } };
  const cfg = await readNotifyConfig();
  if (!cfg.sms.enabled) return { error: "Password reset by SMS isn't available yet — please contact the admin.", values: { phone: raw } };
  const dealer = await queryOne<{ id: number }>("SELECT id FROM dealers WHERE phone = ?", [phone]);
  if (!dealer) return { error: "No dealer account uses this number", values: { phone: raw } };
  const r = await startOtp({ purpose: "dealer_reset", channel: "sms", target: phone, userId: dealer.id });
  if (!r.ok) return { error: r.error, values: { phone: raw } };
  redirect("/business/verify");
}

export async function verifyDealerReset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const pw = String(formData.get("password") ?? "");
  if (pw.length < 6) return { fieldErrors: { password: "Use at least 6 characters" } };
  if (pw !== String(formData.get("confirm") ?? "")) return { fieldErrors: { confirm: "Passwords don't match" } };
  const result = await verifyOtp("dealer_reset", String(formData.get("code") ?? ""));
  if (!result.ok) {
    if (result.restart) redirect("/business/forgot?expired=1");
    return { error: result.error };
  }
  const id = result.challenge.userId ?? 0;
  await execute("UPDATE dealers SET password_hash = ?, phone_verified_at = COALESCE(phone_verified_at, NOW()) WHERE id = ?", [await bcrypt.hash(pw, 10), id]);
  await logActivity({ action: "dealer.password_reset", module: "dealers", entityType: "dealer", entityId: id, description: `Dealer reset their password with an SMS code` });
  await execute("UPDATE dealers SET last_login_at = NOW() WHERE id = ?", [id]);
  await createSession(id, "dealer");
  redirect("/business");
}

export async function resendDealerCode(_prev: ActionState): Promise<ActionState> {
  void _prev;
  const r = await resendOtp("dealer_reset");
  return r.ok ? { ok: true, message: "A new code is on its way" } : { error: r.error };
}
