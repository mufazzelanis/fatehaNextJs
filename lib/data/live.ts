import "server-only";
import { query, queryOne } from "@/lib/db";
import {
  LIVE_DEVICES, LIVE_SECTIONS, LIVE_SOURCES, LIVE_WINDOW_SECONDS,
  type LiveDevice, type LiveEvent, type LiveSection, type LiveSource, type LiveStats, type LiveVisitor,
} from "@/lib/live";

type VisitRow = {
  id: number; landing_id: number; ip: string | null; user_agent: string | null; section: LiveSection; source: LiveSource; device: LiveDevice;
  reached_form: number; clicks: number; order_id: number | null; started_at: Date; last_seen: Date; left_at: Date | null;
};

const zero = <K extends string>(keys: readonly K[]) => Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;

/** Live numbers for the dashboard card and the Live Visitors page — always fresh (never cached). */
export async function getLiveStats(): Promise<LiveStats> {
  const [clock, rows, landings, today] = await Promise.all([
    queryOne<{ now: Date }>("SELECT NOW() AS now"),
    // Visits touching the last 30 minutes (here-now list, minute chart, arrive/leave feed).
    query<VisitRow>(
      `SELECT id, landing_id, ip, user_agent, section, source, device, reached_form, clicks, order_id, started_at, last_seen, left_at
       FROM landing_visits WHERE last_seen >= NOW() - INTERVAL 31 MINUTE ORDER BY last_seen DESC LIMIT 5000`,
    ),
    query<{ id: number; name: string; slug: string }>("SELECT id, name, slug FROM landing_pages"),
    queryOne<{ n: number }>("SELECT COUNT(*) AS n FROM landing_visits WHERE started_at >= CURDATE()"),
  ]);
  const now = (clock?.now ?? new Date()).getTime();
  const windowMs = LIVE_WINDOW_SECONDS * 1000;
  // A visit ends when the page said goodbye, or when its heartbeats stopped.
  const endOf = (r: VisitRow) => (r.left_at ? r.left_at.getTime() : r.last_seen.getTime() + windowMs);
  const isHere = (r: VisitRow) => !r.left_at && now - r.last_seen.getTime() <= windowMs;
  const byId = new Map(landings.map((l) => [l.id, l]));

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

  // How often each IP that is here now has visited in the last 30 days (repeat visitors / suspicious IPs).
  const ips = [...new Set(here.map((r) => r.ip).filter((x): x is string => !!x))].slice(0, 100);
  const ipCounts = ips.length
    ? await query<{ ip: string; n: number }>(
        `SELECT ip, COUNT(*) n FROM landing_visits WHERE started_at >= NOW() - INTERVAL 30 DAY AND ip IN (${ips.map(() => "?").join(",")}) GROUP BY ip`, ips)
    : [];
  const ipVisits = new Map(ipCounts.map((r) => [r.ip, Number(r.n)]));

  const active: LiveVisitor[] = here
    .sort((a, b) => a.started_at.getTime() - b.started_at.getTime())
    .slice(0, 100)
    .map((r) => ({
      id: r.id, ip: r.ip, ipVisits: r.ip ? ipVisits.get(r.ip) ?? 1 : 1, userAgent: r.user_agent, source: r.source, device: r.device,
      landing: byId.get(r.landing_id)?.slug ?? "?", section: r.section, reachedForm: !!r.reached_form, clicks: r.clicks,
      startedAt: r.started_at.toISOString(), ordered: !!r.order_id,
    }));

  // People on a landing page at each of the last 30 minutes.
  const series: number[] = [];
  for (let m = 29; m >= 0; m--) {
    const t = now - m * 60_000;
    series.push(rows.filter((r) => r.started_at.getTime() <= t && endOf(r) >= t).length);
  }

  const feed: LiveEvent[] = [];
  const fiveMin = now - 5 * 60_000;
  let arrived5 = 0;
  let left5 = 0;
  for (const r of rows) {
    const base = { landing: byId.get(r.landing_id)?.slug ?? "?", source: r.source, device: r.device, ip: r.ip };
    if (r.started_at.getTime() >= now - 30 * 60_000) {
      feed.push({ kind: "arrived", at: r.started_at.toISOString(), ...base });
      if (r.started_at.getTime() >= fiveMin) arrived5++;
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
    active,
  };
}

// ───────────── traffic report (Live Visitors page, any period)

export type TrafficFilter = { from: string; to: string; hourFrom: number | null; hourTo: number | null; landing: number };

function where(f: TrafficFilter, col: string, alias: string) {
  const w = [`${alias}.${col} >= ?`, `${alias}.${col} <= ?`];
  const p: (string | number)[] = [`${f.from} 00:00:00`, `${f.to} 23:59:59`];
  if (f.hourFrom !== null && f.hourTo !== null) {
    // e.g. 20 → 02 wraps past midnight
    w.push(f.hourFrom <= f.hourTo ? `HOUR(${alias}.${col}) BETWEEN ? AND ?` : `(HOUR(${alias}.${col}) >= ? OR HOUR(${alias}.${col}) <= ?)`);
    p.push(f.hourFrom, f.hourTo);
  }
  if (f.landing) { w.push(`${alias}.landing_id = ?`); p.push(f.landing); }
  return { sql: w.join(" AND "), params: p };
}

export type TrafficReport = {
  visits: number; visitors: number; ips: number; reachedForm: number; clickers: number; clicks: number; orders: number;
  avgSeconds: number;
  hours: { hour: number; visits: number; clicks: number }[];
  landings: { id: number; name: string; slug: string; visits: number; clicks: number; orders: number }[];
  sources: Record<LiveSource, number>;
  devices: Record<LiveDevice, number>;
};

export async function getTrafficReport(f: TrafficFilter): Promise<TrafficReport> {
  const v = where(f, "started_at", "v");
  const c = where(f, "created_at", "c");
  const [totals, hours, clickHours, landings, sources, devices, clickTotal] = await Promise.all([
    queryOne<{ visits: number; visitors: number; ips: number; reached: number; clickers: number; orders: number; avg_s: number | null }>(
      `SELECT COUNT(*) visits, COUNT(DISTINCT v.sid) visitors, COUNT(DISTINCT v.ip) ips, SUM(v.reached_form) reached,
              SUM(v.clicks > 0) clickers, SUM(v.order_id IS NOT NULL) orders,
              AVG(GREATEST(TIMESTAMPDIFF(SECOND, v.started_at, COALESCE(v.left_at, v.last_seen)), 0)) avg_s
       FROM landing_visits v WHERE ${v.sql}`, v.params),
    query<{ h: number; n: number }>(`SELECT HOUR(v.started_at) h, COUNT(*) n FROM landing_visits v WHERE ${v.sql} GROUP BY h`, v.params),
    query<{ h: number; n: number }>(`SELECT HOUR(c.created_at) h, COUNT(*) n FROM landing_clicks c WHERE ${c.sql} AND c.kind IN ('order','sticky','submit') GROUP BY h`, c.params),
    query<{ id: number; name: string; slug: string; visits: number; clicks: number; orders: number }>(
      `SELECT l.id, l.name, l.slug, COUNT(*) visits, SUM(v.clicks) clicks, SUM(v.order_id IS NOT NULL) orders
       FROM landing_visits v JOIN landing_pages l ON l.id = v.landing_id WHERE ${v.sql} GROUP BY l.id ORDER BY visits DESC`, v.params),
    query<{ k: LiveSource; n: number }>(`SELECT v.source k, COUNT(*) n FROM landing_visits v WHERE ${v.sql} GROUP BY k`, v.params),
    query<{ k: LiveDevice; n: number }>(`SELECT v.device k, COUNT(*) n FROM landing_visits v WHERE ${v.sql} GROUP BY k`, v.params),
    queryOne<{ n: number }>(`SELECT COUNT(*) n FROM landing_clicks c WHERE ${c.sql} AND c.kind IN ('order','sticky','submit')`, c.params),
  ]);
  const hv = new Map(hours.map((r) => [Number(r.h), Number(r.n)]));
  const hc = new Map(clickHours.map((r) => [Number(r.h), Number(r.n)]));
  const src = zero(LIVE_SOURCES);
  for (const r of sources) if (r.k in src) src[r.k] = Number(r.n);
  const dev = zero(LIVE_DEVICES);
  for (const r of devices) if (r.k in dev) dev[r.k] = Number(r.n);
  const n = (x: unknown) => Number(x ?? 0);
  return {
    visits: n(totals?.visits), visitors: n(totals?.visitors), ips: n(totals?.ips), reachedForm: n(totals?.reached),
    clickers: n(totals?.clickers), clicks: n(clickTotal?.n), orders: n(totals?.orders), avgSeconds: Math.round(n(totals?.avg_s)),
    hours: Array.from({ length: 24 }, (_, h) => ({ hour: h, visits: hv.get(h) ?? 0, clicks: hc.get(h) ?? 0 })),
    landings: landings.map((l) => ({ ...l, visits: n(l.visits), clicks: n(l.clicks), orders: n(l.orders) })),
    sources: src, devices: dev,
  };
}

export type ClickRow = {
  id: number; created_at: Date; label: string; kind: string; seconds: number | null; landing: string;
  ip: string | null; ip_visits: number; user_agent: string | null; source: LiveSource | null; order_no: string | null;
};

/** Button-click history for the period (newest first). */
export async function getClickHistory(f: TrafficFilter, page: number, perPage = 25) {
  const c = where(f, "created_at", "c");
  const [rows, total] = await Promise.all([
    query<ClickRow>(
      `SELECT c.id, c.created_at, c.label, c.kind, c.seconds, l.slug landing, v.ip, v.user_agent, v.source, o.order_no,
              (SELECT COUNT(*) FROM landing_visits x WHERE x.ip = v.ip AND x.started_at >= NOW() - INTERVAL 30 DAY) ip_visits
       FROM landing_clicks c
       LEFT JOIN landing_visits v ON v.id = c.visit_id
       LEFT JOIN landing_pages l ON l.id = c.landing_id
       LEFT JOIN orders o ON o.id = v.order_id
       WHERE ${c.sql} ORDER BY c.created_at DESC, c.id DESC LIMIT ? OFFSET ?`,
      [...c.params, perPage, (page - 1) * perPage],
    ),
    queryOne<{ n: number }>(`SELECT COUNT(*) n FROM landing_clicks c WHERE ${c.sql}`, c.params),
  ]);
  const count = Number(total?.n ?? 0);
  return { rows, total: count, pages: Math.max(Math.ceil(count / perPage), 1) };
}
