import "server-only";
import { execute, query } from "@/lib/db";

export type AdKind = "campaign" | "adset" | "ad";
export const AD_KINDS: AdKind[] = ["campaign", "adset", "ad"];
/** orders column for each level (Facebook URL parameters: campaign.id / adset.id / ad.id). */
const COL: Record<AdKind, "utm_campaign" | "utm_content" | "utm_term"> = { campaign: "utm_campaign", adset: "utm_content", ad: "utm_term" };

/** Remembers names that came in the ad link (campaign_name / adset_name / ad_name) — a name typed in the admin wins. */
export async function learnAdNames(names: Record<AdKind, [string, string]> | null) {
  if (!names) return;
  for (const kind of AD_KINDS) {
    const [id, name] = names[kind];
    if (!id || !name || /^\{\{/.test(name)) continue;
    await execute(
      `INSERT INTO ad_labels (kind, ext_id, name, source) VALUES (?, ?, ?, 'auto')
       ON DUPLICATE KEY UPDATE name = IF(source = 'manual', name, VALUES(name))`,
      [kind, id.slice(0, 200), name.slice(0, 200)],
    ).catch(() => {});
  }
}

/** Names for the given IDs, keyed "kind:id". */
export async function adNames(ids: { kind: AdKind; id: string | null | undefined }[]) {
  const wanted = ids.filter((x): x is { kind: AdKind; id: string } => !!x.id);
  if (!wanted.length) return new Map<string, string>();
  const rows = await query<{ kind: AdKind; ext_id: string; name: string }>(
    `SELECT kind, ext_id, name FROM ad_labels WHERE (kind, ext_id) IN (${wanted.map(() => "(?, ?)").join(",")})`,
    wanted.flatMap((x) => [x.kind, x.id]),
  );
  return new Map(rows.map((r) => [`${r.kind}:${r.ext_id}`, r.name]));
}

export type AdStats = {
  orders: number; revenue: number; delivered: number; cancelled: number; open: number;
  /** Delivered ÷ (delivered + cancelled/returned): how many orders from this ad really end in a sale. */
  deliveryRate: number | null;
  avgOrder: number;
};
export type AdRow = AdStats & { kind: AdKind; id: string; name: string; children: AdRow[] };

const stats = (r: { orders: number; revenue: number; delivered: number; cancelled: number }): AdStats => {
  const orders = Number(r.orders), delivered = Number(r.delivered), cancelled = Number(r.cancelled), revenue = Number(r.revenue);
  const closed = delivered + cancelled;
  return { orders, revenue, delivered, cancelled, open: orders - closed, deliveryRate: closed ? delivered / closed : null, avgOrder: orders ? revenue / orders : 0 };
};

/**
 * Campaign → ad set → ad, with orders, revenue (not cancelled / returned), delivered, cancelled and delivery rate
 * for the period. Orders without a campaign are summed separately (organic / direct / untagged links).
 */
export async function adReport(from: string, to: string) {
  const range = [`${from} 00:00:00`, `${to} 23:59:59`];
  const [rows, untagged] = await Promise.all([
    query<{ c: string; s: string | null; a: string | null; src: string | null; orders: number; revenue: number; delivered: number; cancelled: number }>(
      `SELECT utm_campaign c, utm_content s, utm_term a, MAX(utm_source) src, COUNT(*) orders,
              COALESCE(SUM(CASE WHEN status NOT IN ('cancelled','returned') THEN total END), 0) revenue,
              SUM(status = 'delivered') delivered, SUM(status IN ('cancelled','returned')) cancelled
       FROM orders WHERE utm_campaign IS NOT NULL AND created_at BETWEEN ? AND ?
       GROUP BY utm_campaign, utm_content, utm_term`, range),
    query<{ src: string | null; orders: number; revenue: number; delivered: number; cancelled: number }>(
      `SELECT COALESCE(utm_source, '(direct / not tagged)') src, COUNT(*) orders,
              COALESCE(SUM(CASE WHEN status NOT IN ('cancelled','returned') THEN total END), 0) revenue,
              SUM(status = 'delivered') delivered, SUM(status IN ('cancelled','returned')) cancelled
       FROM orders WHERE utm_campaign IS NULL AND created_at BETWEEN ? AND ? GROUP BY src ORDER BY orders DESC`, range),
  ]);
  const names = await adNames(rows.flatMap((r) => [{ kind: "campaign" as const, id: r.c }, { kind: "adset" as const, id: r.s }, { kind: "ad" as const, id: r.a }]));
  const sum = (list: { orders: number; revenue: number; delivered: number; cancelled: number }[]) => list.reduce(
    (t, r) => ({ orders: t.orders + Number(r.orders), revenue: t.revenue + Number(r.revenue), delivered: t.delivered + Number(r.delivered), cancelled: t.cancelled + Number(r.cancelled) }),
    { orders: 0, revenue: 0, delivered: 0, cancelled: 0 });
  const node = (kind: AdKind, id: string, list: typeof rows, children: AdRow[]): AdRow =>
    ({ kind, id, name: names.get(`${kind}:${id}`) ?? "", ...stats(sum(list)), children });
  const group = <K extends string>(list: typeof rows, key: (r: (typeof rows)[number]) => K) => {
    const m = new Map<K, typeof rows>();
    for (const r of list) m.set(key(r), [...(m.get(key(r)) ?? []), r]);
    return m;
  };
  const byOrders = (a: AdRow, b: AdRow) => b.orders - a.orders || b.revenue - a.revenue;
  const campaigns = [...group(rows, (r) => r.c)].map(([c, cl]) => node("campaign", c,
    cl, [...group(cl, (r) => r.s ?? "")].map(([s, sl]) => node("adset", s, sl,
      [...group(sl, (r) => r.a ?? "")].map(([a, al]) => node("ad", a, al, [])).sort(byOrders))).sort(byOrders))).sort(byOrders);
  const sources = new Map(rows.map((r) => [r.c, r.src]));
  return {
    campaigns: campaigns.map((c) => ({ ...c, source: sources.get(c.id) ?? null })),
    untagged: untagged.map((u) => ({ source: u.src ?? "", ...stats(u) })),
    total: stats(sum([...rows, ...untagged])),
  };
}

/** Admin: give an ID a name (empty = forget it). */
export async function setAdName(kind: AdKind, id: string, name: string) {
  if (!name.trim()) {
    await execute("DELETE FROM ad_labels WHERE kind = ? AND ext_id = ?", [kind, id]);
    return;
  }
  await execute(
    `INSERT INTO ad_labels (kind, ext_id, name, source) VALUES (?, ?, ?, 'manual')
     ON DUPLICATE KEY UPDATE name = VALUES(name), source = 'manual'`,
    [kind, id.slice(0, 200), name.trim().slice(0, 200)],
  );
}

export { COL as AD_COLUMN };
