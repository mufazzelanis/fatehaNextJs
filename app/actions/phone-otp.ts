"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { execute, queryOne } from "@/lib/db";
import { createSession } from "@/lib/session";
import { normalizePhone } from "@/lib/phone";
import { logActivity } from "@/lib/activity";
import { customerOtpOn } from "@/lib/notify";
import { readChallenge, resendOtp, startOtp, verifyOtp, type OtpPurpose } from "@/lib/otp";
import type { ActionState } from "@/lib/action-state";

const CUSTOMER: OtpPurpose[] = ["customer_register", "customer_login", "customer_reset"];


/** The phone is now proven: attach earlier guest orders placed with it. */
async function markVerified(userId: number, phone: string) {
  await execute("UPDATE users SET phone_verified_at = COALESCE(phone_verified_at, NOW()) WHERE id = ?", [userId]);
  await execute("UPDATE orders SET user_id = ? WHERE phone = ? AND user_id IS NULL", [userId, phone]);
}

/** "Forgot password" and "sign in with a code" both start here. */
export async function startCustomerCode(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const mode = formData.get("mode") === "login" ? "login" : "reset";
  const raw = String(formData.get("phone") ?? "");
  const phone = normalizePhone(raw);
  if (!phone) return { error: "সঠিক ১১ ডিজিটের মোবাইল নাম্বার দিন", values: { phone: raw } };
  if (!(await customerOtpOn())) return { error: "এই সুবিধাটি এখন চালু নেই। আমাদের সাথে যোগাযোগ করুন।", values: { phone: raw } };
  const user = await queryOne<{ id: number; is_active: number }>("SELECT id, is_active FROM users WHERE phone = ? AND role = 'customer'", [phone]);
  if (!user) return { error: "এই নাম্বারে কোনো অ্যাকাউন্ট নেই — নতুন অ্যাকাউন্ট খুলুন।", values: { phone: raw } };
  if (!user.is_active) return { error: "এই অ্যাকাউন্টটি বন্ধ করা হয়েছে", values: { phone: raw } };
  const r = await startOtp({ purpose: mode === "login" ? "customer_login" : "customer_reset", channel: "sms", target: phone, userId: user.id, payload: { next: safeNext(formData.get("next")) } });
  if (!r.ok) return { error: banglaError(r.error), values: { phone: raw } };
  redirect("/account/verify");
}

const safeNext = (v: FormDataEntryValue | null) => { const s = String(v ?? ""); return s.startsWith("/") && !s.startsWith("//") ? s : "/account"; };

export async function verifyCustomerCode(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const pending = await readChallenge(CUSTOMER);
  if (!pending) redirect("/account/login?expired=1");
  // A new password is checked before the code is used up.
  let newHash: string | null = null;
  if (pending.purpose === "customer_reset") {
    const pw = String(formData.get("password") ?? "");
    if (pw.length < 6) return { fieldErrors: { password: "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে" } };
    if (pw !== String(formData.get("confirm") ?? "")) return { fieldErrors: { confirm: "পাসওয়ার্ড মিলছে না" } };
    newHash = await bcrypt.hash(pw, 10);
  }
  const result = await verifyOtp(CUSTOMER, String(formData.get("code") ?? ""));
  if (!result.ok) {
    if (result.restart) redirect("/account/login?expired=1");
    return { error: banglaError(result.error) };
  }
  const c = result.challenge;
  const phone = c.target;

  if (c.purpose === "customer_register") {
    if (await queryOne("SELECT id FROM users WHERE phone = ?", [phone])) return { error: "এই নাম্বারে ইতিমধ্যে অ্যাকাউন্ট আছে — লগইন করুন।" };
    const res = await execute(
      "INSERT INTO users (name, phone, password_hash, role, address, phone_verified_at) VALUES (?, ?, ?, 'customer', ?, NOW())",
      [c.payload.name, phone, c.payload.hash, c.payload.address || null],
    );
    await markVerified(res.insertId, phone);
    await createSession(res.insertId, "customer");
    redirect("/account?welcome=1");
  }

  const user = await queryOne<{ id: number; name: string; is_active: number }>("SELECT id, name, is_active FROM users WHERE id = ? AND role = 'customer'", [c.userId ?? 0]);
  if (!user || !user.is_active) return { error: "এই অ্যাকাউন্টটি বন্ধ করা হয়েছে" };
  if (newHash) {
    await execute("UPDATE users SET password_hash = ? WHERE id = ?", [newHash, user.id]);
    await logActivity({ action: "customer.password_reset", module: "customers", entityType: "phone", entityId: phone, description: `${user.name} reset their password with an SMS code` });
  }
  await markVerified(user.id, phone);
  await execute("UPDATE users SET last_login_at = NOW() WHERE id = ?", [user.id]);
  await createSession(user.id, "customer");
  redirect(c.purpose === "customer_login" ? (c.payload.next || "/account") : "/account?reset=1");
}

export async function resendCustomerCode(_prev: ActionState): Promise<ActionState> {
  void _prev;
  const r = await resendOtp(CUSTOMER);
  return r.ok ? { ok: true, message: "নতুন কোড পাঠানো হয়েছে" } : { error: banglaError(r.error) };
}

function banglaError(e: string) {
  if (e.startsWith("Wrong code")) { const n = e.match(/(\d+) attempt/)?.[1]; return n ? `কোড সঠিক নয়। আর ${n} বার চেষ্টা করতে পারবেন।` : "কোড সঠিক নয়।"; }
  if (e.includes("expired")) return "কোডের মেয়াদ শেষ। নতুন কোড নিন।";
  if (e.includes("Too many wrong")) return "অনেকবার ভুল কোড দেওয়া হয়েছে। নতুন কোড নিন।";
  if (e.startsWith("Please wait")) { const n = e.match(/(\d+) seconds/)?.[1]; return `${n} সেকেন্ড পরে আবার চেষ্টা করুন।`; }
  if (e.includes("Too many codes")) return "অনেকবার কোড পাঠানো হয়েছে। এক ঘণ্টা পরে চেষ্টা করুন।";
  return e;
}
