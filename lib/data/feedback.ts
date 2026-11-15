import "server-only";
import { query, queryOne } from "@/lib/db";

export type FeedbackRow = {
  id: number; rating: number; message: string | null; name: string | null; phone: string | null; ip: string | null;
  created_at: Date; orders: number; delivered: number;
};

/** Feedback from the /thank-you page, newest first, with how many orders (and deliveries) that phone has. */
export async function listFeedback(rating: number | null, page: number, perPage = 20) {
  const where = rating ? "WHERE f.page = 'thanks' AND f.rating = ?" : "WHERE f.page = 'thanks'";
  const params = rating ? [rating] : [];
  const [rows, total, dist] = await Promise.all([
    query<FeedbackRow>(
      `SELECT f.id, f.rating, f.message, f.name, f.phone, f.ip, f.created_at,
              (SELECT COUNT(*) FROM orders o WHERE f.phone IS NOT NULL AND o.phone = f.phone) orders,
              (SELECT COUNT(*) FROM orders o WHERE f.phone IS NOT NULL AND o.phone = f.phone AND o.status = 'delivered') delivered
       FROM page_feedback f ${where} ORDER BY f.id DESC LIMIT ? OFFSET ?`,
      [...params, perPage, (page - 1) * perPage],
    ),
    queryOne<{ n: number }>(`SELECT COUNT(*) n FROM page_feedback f ${where}`, params),
    query<{ rating: number; n: number }>("SELECT rating, COUNT(*) n FROM page_feedback WHERE page = 'thanks' GROUP BY rating"),
  ]);
  const counts = Object.fromEntries([1, 2, 3, 4, 5].map((r) => [r, Number(dist.find((d) => Number(d.rating) === r)?.n ?? 0)])) as Record<number, number>;
  const all = Object.values(counts).reduce((a, b) => a + b, 0);
  const avg = all ? Object.entries(counts).reduce((s, [r, n]) => s + Number(r) * n, 0) / all : 0;
  const count = Number(total?.n ?? 0);
  return { rows, total: count, pages: Math.max(Math.ceil(count / perPage), 1), counts, all, avg };
}
