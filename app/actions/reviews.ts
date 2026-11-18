"use server";

import { unlink } from "node:fs/promises";
import { refresh, updateTag } from "next/cache";
import { execute, queryOne } from "@/lib/db";
import { adminWith, DENIED } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { uploadPath } from "@/lib/uploads";
import { REVIEWS_TAG } from "@/lib/data/reviews";
import { REVIEW_FILE } from "@/lib/reviews";
import type { ActionState } from "@/lib/action-state";

type Row = { id: number; name: string; publish: string; status: string; media: string | null };
const files = (media: string | null): string[] => {
  try { return (JSON.parse(media || "[]") as unknown[]).filter((f): f is string => typeof f === "string" && REVIEW_FILE.test(f)); } catch { return []; }
};
const clean = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().slice(0, max);

/** Edit what the public page shows (name, text, stars, featured, note) and approve / hide / send back to pending. */
export async function saveReview(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminWith("content.manage");
  if (!admin) return DENIED;
  const id = Number(formData.get("id")) || 0;
  const r = await queryOne<Row>("SELECT id, name, publish, status, media FROM reviews WHERE id = ?", [id]);
  if (!r) return { error: "Review not found" };

  const intent = clean(formData.get("intent"), 10);
  const status = intent === "approve" ? "approved" : intent === "hide" ? "hidden" : intent === "pending" ? "pending" : r.status;
  // The customer said "internal only" — it can never go on the website.
  if (status === "approved" && r.publish === "internal") return { error: "This customer did not allow publishing — it stays internal." };
  const rating = Math.min(Math.max(Math.trunc(Number(formData.get("rating"))) || 5, 1), 5);
  const displayName = clean(formData.get("display_name"), 80);
  const displayText = clean(formData.get("display_text"), 3000);
  const note = clean(formData.get("admin_note"), 500);
  const featured = formData.get("featured") === "on" ? 1 : 0;

  await execute(
    `UPDATE reviews SET display_name = ?, display_text = ?, rating = ?, featured = ?, admin_note = ?, status = ?,
       approved_at = CASE WHEN ? = 'approved' THEN COALESCE(approved_at, NOW()) ELSE approved_at END WHERE id = ?`,
    [displayName || null, displayText || null, rating, featured, note || null, status, status, id],
  );
  updateTag(REVIEWS_TAG);
  if (status !== r.status) {
    await logActivity({
      actor: { id: admin.id, name: admin.name }, action: `review.${status}`, module: "content", entityType: "review", entityId: id,
      description: `${status === "approved" ? "Approved" : status === "hidden" ? "Hid" : "Moved to pending"} the review from ${r.name}`,
    });
  }
  refresh();
  return { ok: true, message: status === "approved" ? "Saved — showing on /reviews" : status === "hidden" ? "Saved — hidden" : "Saved" };
}

/** Quick approve / hide from the list (keeps any edits). */
export async function setReviewStatus(formData: FormData) {
  const admin = await adminWith("content.manage");
  if (!admin) return;
  const id = Number(formData.get("id")) || 0;
  const status = clean(formData.get("status"), 10);
  if (!["approved", "hidden", "pending"].includes(status)) return;
  const r = await queryOne<Row>("SELECT id, name, publish, status, media FROM reviews WHERE id = ?", [id]);
  if (!r || (status === "approved" && r.publish === "internal")) return;
  await execute(
    "UPDATE reviews SET status = ?, approved_at = CASE WHEN ? = 'approved' THEN COALESCE(approved_at, NOW()) ELSE approved_at END WHERE id = ?",
    [status, status, id],
  );
  updateTag(REVIEWS_TAG);
  await logActivity({
    actor: { id: admin.id, name: admin.name }, action: `review.${status}`, module: "content", entityType: "review", entityId: id,
    description: `${status === "approved" ? "Approved" : status === "hidden" ? "Hid" : "Moved to pending"} the review from ${r.name}`,
  });
  refresh();
}

/** Star / un-star: featured reviews come first and run in the moving strip at the top. */
export async function toggleReviewFeatured(formData: FormData) {
  const admin = await adminWith("content.manage");
  if (!admin) return;
  await execute("UPDATE reviews SET featured = 1 - featured WHERE id = ?", [Number(formData.get("id")) || 0]);
  updateTag(REVIEWS_TAG);
  refresh();
}

/** Take one photo / the video off a review (and delete the file). */
export async function removeReviewMedia(formData: FormData) {
  const admin = await adminWith("content.manage");
  if (!admin) return;
  const id = Number(formData.get("id")) || 0;
  const file = clean(formData.get("file"), 80);
  const r = await queryOne<Row>("SELECT id, name, publish, status, media FROM reviews WHERE id = ?", [id]);
  const list = files(r?.media ?? null);
  if (!r || !list.includes(file)) return;
  const rest = list.filter((f) => f !== file);
  await execute("UPDATE reviews SET media = ? WHERE id = ?", [rest.length ? JSON.stringify(rest) : null, id]);
  await unlink(uploadPath(file)).catch(() => {});
  updateTag(REVIEWS_TAG);
  refresh();
}

/** Delete a review for good (spam / test), with its photos and video. */
export async function deleteReview(formData: FormData) {
  const admin = await adminWith("content.manage");
  if (!admin) return;
  const id = Number(formData.get("id")) || 0;
  const r = await queryOne<Row>("SELECT id, name, publish, status, media FROM reviews WHERE id = ?", [id]);
  if (!r) return;
  await execute("DELETE FROM reviews WHERE id = ?", [id]);
  await Promise.all(files(r.media).map((f) => unlink(uploadPath(f)).catch(() => {})));
  updateTag(REVIEWS_TAG);
  await logActivity({
    actor: { id: admin.id, name: admin.name }, action: "review.deleted", module: "content", entityType: "review", entityId: id,
    description: `Deleted the review from ${r.name}`,
  });
  refresh();
}

/** Add a review received elsewhere (phone call, Facebook, WhatsApp) — goes live straight away. */
export async function addReview(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminWith("content.manage");
  if (!admin) return DENIED;
  const name = clean(formData.get("name"), 80);
  const district = clean(formData.get("district"), 60);
  const text = clean(formData.get("story"), 3000);
  const rating = Math.min(Math.max(Math.trunc(Number(formData.get("rating"))) || 5, 1), 5);
  const publish = formData.get("anon") === "on" ? "anon" : "name";
  const featured = formData.get("featured") === "on" ? 1 : 0;
  const values = { name, district, story: text, rating: String(rating) };
  if (name.length < 2) return { error: "Enter the customer's name", fieldErrors: { name: "Required" }, values };
  if (text.length < 10) return { error: "Write the review text", fieldErrors: { story: "Required" }, values };
  const res = await execute(
    `INSERT INTO reviews (name, district, used, story, publish, status, featured, rating, admin_note, approved_at)
     VALUES (?, ?, 'yes', ?, ?, 'approved', ?, ?, ?, NOW())`,
    [name, district || null, text, publish, featured, rating, `Added by ${admin.name}`],
  );
  updateTag(REVIEWS_TAG);
  await logActivity({
    actor: { id: admin.id, name: admin.name }, action: "review.added", module: "content", entityType: "review", entityId: res.insertId,
    description: `Added a ${rating}★ review from ${name}`,
  });
  refresh();
  return { ok: true, message: "Review added — showing on /reviews" };
}
