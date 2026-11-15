"use server";

import { headers } from "next/headers";
import { refresh } from "next/cache";
import { execute, queryOne } from "@/lib/db";
import { adminWith } from "@/lib/auth";
import { clientIpFrom } from "@/lib/client-ip";
import { normalizePhone } from "@/lib/phone";
import { logActivity } from "@/lib/activity";
import type { ActionState } from "@/lib/action-state";

/** Customer feedback from the /thank-you page: 1–5 stars + message, name and phone optional. */
export async function sendFeedback(_prev: ActionState, formData: FormData): Promise<ActionState> {
  // Bots fill every field — real people never see this one.
  if (String(formData.get("website") ?? "")) return { ok: true, message: "ধন্যবাদ! আপনার মতামত পেয়েছি।" };
  const rating = Math.trunc(Number(formData.get("rating")));
  const message = String(formData.get("message") ?? "").trim().slice(0, 2000);
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const rawPhone = String(formData.get("phone") ?? "").trim();
  const values = { rating: String(rating || ""), message, name, phone: rawPhone };
  if (!(rating >= 1 && rating <= 5)) return { error: "অনুগ্রহ করে ১ থেকে ৫ স্টার দিন", fieldErrors: { rating: "স্টার দিন" }, values };
  const phone = rawPhone ? normalizePhone(rawPhone) : null;
  if (rawPhone && !phone) return { error: "সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)", fieldErrors: { phone: "সঠিক নম্বর দিন" }, values };

  const h = await headers();
  const ip = clientIpFrom(h);
  const ua = (h.get("user-agent") ?? "").slice(0, 300);
  if (/bot|crawler|spider|facebookexternalhit|preview/i.test(ua)) return { ok: true, message: "ধন্যবাদ!" };
  if (ip) {
    const recent = await queryOne<{ n: number }>("SELECT COUNT(*) n FROM page_feedback WHERE ip = ? AND created_at >= NOW() - INTERVAL 1 HOUR", [ip]);
    if (Number(recent?.n ?? 0) >= 5) return { error: "আপনি অল্প সময়ে অনেকবার মতামত পাঠিয়েছেন — কিছুক্ষণ পরে আবার চেষ্টা করুন।", values };
  }
  await execute(
    "INSERT INTO page_feedback (page, rating, message, name, phone, ip, user_agent) VALUES ('thanks', ?, ?, ?, ?, ?, ?)",
    [rating, message || null, name || null, phone, ip, ua || null],
  );
  return { ok: true, message: "ধন্যবাদ! আপনার মতামত আমাদের কাছে পৌঁছেছে।" };
}

/** Admin: remove a feedback entry (spam / test). */
export async function deleteFeedback(formData: FormData) {
  const admin = await adminWith("content.manage");
  if (!admin) return;
  const id = Number(formData.get("id")) || 0;
  const row = await queryOne<{ rating: number; name: string | null }>("SELECT rating, name FROM page_feedback WHERE id = ?", [id]);
  if (!row) return;
  await execute("DELETE FROM page_feedback WHERE id = ?", [id]);
  await logActivity({
    actor: { id: admin.id, name: admin.name }, action: "feedback.deleted", module: "content", entityType: "feedback", entityId: id,
    description: `Deleted a ${row.rating}★ feedback${row.name ? ` from ${row.name}` : ""}`,
  });
  refresh();
}
