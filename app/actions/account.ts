"use server";

import bcrypt from "bcryptjs";
import { refresh } from "next/cache";
import { execute, queryOne } from "@/lib/db";
import { requireCustomer } from "@/lib/auth";
import type { ActionState } from "@/lib/action-state";

export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const customer = await requireCustomer();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase() || null;
  const address = String(formData.get("address") ?? "").trim().slice(0, 500) || null;

  if (name.length < 2) return { fieldErrors: { name: "আপনার নাম লিখুন" } };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { fieldErrors: { email: "সঠিক ইমেইল দিন" } };
  if (email && (await queryOne("SELECT id FROM users WHERE email = ? AND id <> ?", [email, customer.id]))) {
    return { fieldErrors: { email: "এই ইমেইলটি অন্য অ্যাকাউন্টে ব্যবহৃত হচ্ছে" } };
  }

  await execute("UPDATE users SET name = ?, email = ?, address = ? WHERE id = ?", [name, email, address, customer.id]);
  refresh();
  return { ok: true, message: "প্রোফাইল আপডেট হয়েছে" };
}

export async function changePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const customer = await requireCustomer();
  const current = String(formData.get("current") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 6) return { fieldErrors: { password: "কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড দিন" } };
  if (password !== confirm) return { fieldErrors: { confirm: "পাসওয়ার্ড মিলছে না" } };
  const row = await queryOne<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = ?", [customer.id]);
  if (!row || !(await bcrypt.compare(current, row.password_hash))) {
    return { fieldErrors: { current: "বর্তমান পাসওয়ার্ড সঠিক নয়" } };
  }
  await execute("UPDATE users SET password_hash = ? WHERE id = ?", [await bcrypt.hash(password, 10), customer.id]);
  return { ok: true, message: "পাসওয়ার্ড পরিবর্তন হয়েছে" };
}
