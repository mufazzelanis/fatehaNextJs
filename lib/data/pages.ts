import "server-only";
import { query } from "@/lib/db";
import { LIVE_WINDOW_SECONDS } from "@/lib/live";

export type PageStats = { now: number; today: number; week: number; month: number; days: { day: string; views: number }[] };

/** Visitors on each page right now, and page views today / 7 days / 30 days (main-site pages). Always fresh. */
export async function getPageStats(paths: string[]): Promise<Record<string, PageStats>> {
  if (!paths.length) return {};
  const marks = paths.map(() => "?").join(",");
  const [now, views] = await Promise.all([
    query<{ page: string; n: number }>(
      `SELECT page, COUNT(*) n FROM landing_visits
       WHERE landing_id = 0 AND left_at IS NULL AND last_seen >= NOW() - INTERVAL ${LIVE_WINDOW_SECONDS} SECOND AND page IN (${marks})
       GROUP BY page`, paths),
    query<{ path: string; day: string; views: number }>(
      `SELECT path, DATE_FORMAT(day, '%Y-%m-%d') day, views FROM page_views
       WHERE path IN (${marks}) AND day >= CURDATE() - INTERVAL 29 DAY`, paths),
  ]);
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" }));
  const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const lastDays = (n: number) => Array.from({ length: n }, (_, i) => { const d = new Date(today); d.setDate(d.getDate() - (n - 1 - i)); return key(d); });
  const d7 = lastDays(7);
  const d30 = new Set(lastDays(30));
  return Object.fromEntries(paths.map((p) => {
    const rows = views.filter((v) => v.path === p);
    const at = (day: string) => Number(rows.find((r) => r.day === day)?.views ?? 0);
    return [p, {
      now: Number(now.find((r) => r.page === p)?.n ?? 0),
      today: at(d7[6]),
      week: d7.reduce((s, d) => s + at(d), 0),
      month: rows.filter((r) => d30.has(r.day)).reduce((s, r) => s + Number(r.views), 0),
      days: d7.map((d) => ({ day: d, views: at(d) })),
    }];
  }));
}
