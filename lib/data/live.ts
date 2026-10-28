import "server-only";
import { query, queryOne } from "@/lib/db";
import {
  LIVE_DEVICES, LIVE_SECTIONS, LIVE_SOURCES, LIVE_WINDOW_SECONDS,
  type LiveDevice, type LiveEvent, type LiveSection, type LiveSource, type LiveStats,
} from "@/lib/live";

type Row = {
  landing_id: number; section: LiveSection; source: LiveSource; device: LiveDevice;
  first_seen: Date; last_seen: Date; left_at: Date | null;
};

const zero = <K extends string>(keys: readonly K[]) => Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;

/** Everything the dashboard's live card shows — always fresh (never cached). */
export async function getLiveStats(): Promise<LiveStats> {
  const [clock, rows, landings, today] = await Promise.all([
    queryOne<{ now: Date }>("SELECT NOW() AS now"),
    // Visits touching the last 30 minutes (for "here now", the minute chart and the arrive/leave feed).
    query<Row>(
      `SELECT landing_id, section, source, device, first_seen, last_seen, left_at
       FROM live_visitors WHERE last_seen >= NOW() - INTERVAL 31 MINUTE ORDER BY last_seen DESC LIMIT 5000`,
    ),
    query<{ id: number; name: string; slug: string }>("SELECT id, name, slug FROM landing_pages"),
    queryOne<{ n: number }>("SELECT COUNT(*) AS n FROM live_visitors WHERE first_seen >= CURDATE()"),
  ]);
  const now = (clock?.now ?? new Date()).getTime();
  const windowMs = LIVE_WINDOW_SECONDS * 1000;
  // A visit ends when the page said goodbye, or when its heartbeats stopped.
  const endOf = (r: Row) => (r.left_at ? r.left_at.getTime() : r.last_seen.getTime() + windowMs);
  const isHere = (r: Row) => !r.left_at && now - r.last_seen.getTime() <= windowMs;

  const here = rows.filter(isHere);
  const sections = zero(LIVE_SECTIONS);
  const sources = zero(LIVE_SOURCES);
  const devices = zero(LIVE_DEVICES);
  const perLanding = new Map<number, { count: number; form: number }>();
  for (const r of here) {
    sections[r.section] = (sections[r.section] ?? 0) + 1;
    sources[r.source] = (sources[r.source] ?? 0) + 1;
    devices[r.device] = (devices[r.device] ?? 0) + 1;
    const p = perLanding.get(r.landing_id) ?? { count: 0, form: 0 };
    p.count++;
    if (r.section === "form") p.form++;
    perLanding.set(r.landing_id, p);
  }
  const byId = new Map(landings.map((l) => [l.id, l]));

  // People on a landing page at the end of each of the last 30 minutes.
  const series: number[] = [];
  for (let m = 29; m >= 0; m--) {
    const t = now - m * 60_000;
    series.push(rows.filter((r) => r.first_seen.getTime() <= t && endOf(r) >= t).length);
  }

  const feed: LiveEvent[] = [];
  const fiveMin = now - 5 * 60_000;
  let arrived5 = 0;
  let left5 = 0;
  for (const r of rows) {
    const landing = byId.get(r.landing_id)?.slug ?? "?";
    const base = { landing, source: r.source, device: r.device };
    if (r.first_seen.getTime() >= now - 30 * 60_000) {
      feed.push({ kind: "arrived", at: r.first_seen.toISOString(), ...base });
      if (r.first_seen.getTime() >= fiveMin) arrived5++;
    }
    if (!isHere(r)) {
      const end = Math.min(endOf(r), now);
      feed.push({ kind: "left", at: new Date(end).toISOString(), ...base });
      if (end >= fiveMin) left5++;
    }
  }
  feed.sort((a, b) => b.at.localeCompare(a.at));

  return {
    now: new Date(now).toISOString(),
    total: here.length,
    landings: [...perLanding.entries()]
      .map(([id, v]) => ({ id, name: byId.get(id)?.name ?? `#${id}`, slug: byId.get(id)?.slug ?? "", ...v }))
      .sort((a, b) => b.count - a.count),
    sections, sources, devices, arrived5, left5,
    today: Number(today?.n ?? 0),
    series,
    feed: feed.slice(0, 14),
  };
}
