import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { query, queryOne } from "@/lib/db";
import { toPublic, type PublicReview, type ReviewStatus } from "@/lib/reviews";

export const REVIEWS_TAG = "reviews";

export type ReviewRow = {
  id: number; name: string; phone: string | null; district: string | null; age_range: string | null; used: string | null; duration: string | null;
  experience: string | null; liked: string | null; story: string | null; suggestion: string | null; media: string | null;
  publish: string; media_ok: number; status: ReviewStatus; featured: number; rating: number;
  display_name: string | null; display_text: string | null; admin_note: string | null; ip: string | null;
  approved_at: Date | null; created_at: Date;
};

/** Approved reviews for the public page (featured first), plus the average rating. Cached until a review changes. */
export async function getPublishedReviews(): Promise<{ reviews: PublicReview[]; average: number; count: number }> {
  "use cache";
  cacheTag(REVIEWS_TAG);
  cacheLife("hours");
  const rows = await query<ReviewRow>(
    // "internal" (no permission to publish) can never be shown, even if approved by mistake.
    "SELECT * FROM reviews WHERE status = 'approved' AND publish <> 'internal' ORDER BY featured DESC, approved_at DESC, id DESC LIMIT 200",
  );
  const reviews = rows.map(toPublic).filter((r) => r.text || r.photos.length || r.video);
  const average = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  return { reviews, average, count: reviews.length };
}

/** Bangla district names for the form's suggestions. */
export async function getDistrictNames(): Promise<string[]> {
  "use cache";
  cacheTag(REVIEWS_TAG);
  cacheLife("days");
  const rows = await query<{ bn_name: string }>("SELECT bn_name FROM districts WHERE bn_name IS NOT NULL ORDER BY bn_name");
  return rows.map((r) => r.bn_name);
}

/** Admin list, newest first. */
export async function listReviews(status: ReviewStatus | "internal" | "all", page: number, perPage = 20) {
  const where = status === "internal" ? "WHERE publish = 'internal'" : status === "all" ? "" : "WHERE status = ? AND publish <> 'internal'";
  const params = status === "internal" || status === "all" ? [] : [status];
  const [rows, total, counts] = await Promise.all([
    query<ReviewRow>(`SELECT * FROM reviews ${where} ORDER BY id DESC LIMIT ? OFFSET ?`, [...params, perPage, (page - 1) * perPage]),
    queryOne<{ n: number }>(`SELECT COUNT(*) n FROM reviews ${where}`, params),
    queryOne<{ pending: number; approved: number; hidden: number; internal: number; all: number }>(
      `SELECT SUM(status = 'pending' AND publish <> 'internal') pending, SUM(status = 'approved' AND publish <> 'internal') approved,
              SUM(status = 'hidden' AND publish <> 'internal') hidden, SUM(publish = 'internal') internal, COUNT(*) \`all\` FROM reviews`),
  ]);
  const n = Number(total?.n ?? 0);
  const c = (v: unknown) => Number(v ?? 0);
  return {
    rows, total: n, pages: Math.max(Math.ceil(n / perPage), 1),
    counts: { pending: c(counts?.pending), approved: c(counts?.approved), hidden: c(counts?.hidden), internal: c(counts?.internal), all: c(counts?.all) },
  };
}
