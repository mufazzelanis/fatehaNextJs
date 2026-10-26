import "server-only";
import { query, queryOne } from "../db";
import type { Order } from "./orders";
import { bucketKeys, type ResolvedRange } from "../date-range";

// Revenue counts every order that wasn't cancelled or returned.
const COUNTED = "status NOT IN ('cancelled','returned')";

export type SeriesPoint = { key: string; label: string; orders: number; revenue: number };

type Totals = { orders: number; counted: number; revenue: number; delivered: number; deliveredRevenue: number; cancelled: number; pending: number; customers: number };

async function totals(start: string, end: string): Promise<Totals & { items: number; newCustomers: number }> {
  const [t, items, fresh] = await Promise.all([
    queryOne<Record<keyof Totals, number>>(
      `SELECT COUNT(*) AS orders, SUM(${COUNTED}) AS counted,
              COALESCE(SUM(CASE WHEN ${COUNTED} THEN total END),0) AS revenue,
              SUM(status = 'delivered') AS delivered,
              COALESCE(SUM(CASE WHEN status = 'delivered' THEN total END),0) AS deliveredRevenue,
              SUM(status IN ('cancelled','returned')) AS cancelled,
              SUM(status = 'pending') AS pending,
              COUNT(DISTINCT phone) AS customers
       FROM orders WHERE created_at >= ? AND created_at < ?`,
      [start, end],
    ),
    queryOne<{ n: number }>(
      `SELECT COALESCE(SUM(i.quantity),0) AS n FROM order_items i JOIN orders o ON o.id = i.order_id
       WHERE o.created_at >= ? AND o.created_at < ? AND o.${COUNTED}`,
      [start, end],
    ),
    // Customers whose very first order falls in the period.
    queryOne<{ n: number }>(
      "SELECT COUNT(*) AS n FROM (SELECT MIN(created_at) AS first FROM orders GROUP BY phone) f WHERE f.first >= ? AND f.first < ?",
      [start, end],
    ),
  ]);
  const n = (v: unknown) => Number(v ?? 0);
  return {
    orders: n(t?.orders), counted: n(t?.counted), revenue: n(t?.revenue), delivered: n(t?.delivered), deliveredRevenue: n(t?.deliveredRevenue),
    cancelled: n(t?.cancelled), pending: n(t?.pending), customers: n(t?.customers), items: n(items?.n), newCustomers: n(fresh?.n),
  };
}

export type PeriodTotals = Awaited<ReturnType<typeof totals>>;

/** Everything the dashboard shows for one period (and the totals of the comparison period). */
export async function getDashboardPeriod(r: ResolvedRange) {
  const fmt = r.bucket === "hour" ? "%H" : r.bucket === "day" ? "%Y-%m-%d" : "%Y-%m";
  const [now, prev, series, statuses, zones, sources, products, recent, pendingNow] = await Promise.all([
    totals(r.start, r.end),
    r.prev ? totals(r.prev.start, r.prev.end) : Promise.resolve(null),
    query<{ k: string; orders: number; revenue: number }>(
      `SELECT DATE_FORMAT(created_at, '${fmt}') AS k, COUNT(*) AS orders, COALESCE(SUM(CASE WHEN ${COUNTED} THEN total END),0) AS revenue
       FROM orders WHERE created_at >= ? AND created_at < ? GROUP BY k`,
      [r.start, r.end],
    ),
    query<{ status: string; n: number }>("SELECT status, COUNT(*) AS n FROM orders WHERE created_at >= ? AND created_at < ? GROUP BY status", [r.start, r.end]),
    query<{ label: string; count: number }>(
      `SELECT COALESCE(shipping_label, CASE shipping_zone WHEN 'inside' THEN 'Inside Dhaka' WHEN 'outside' THEN 'Outside Dhaka' ELSE shipping_zone END) AS label,
              COUNT(*) AS count FROM orders WHERE created_at >= ? AND created_at < ? GROUP BY label ORDER BY count DESC LIMIT 8`,
      [r.start, r.end],
    ),
    query<{ source: string; landing_id: number | null; name: string | null; orders: number; revenue: number }>(
      `SELECT o.source, o.landing_id, l.name, COUNT(*) AS orders, COALESCE(SUM(CASE WHEN o.${COUNTED} THEN o.total END), 0) AS revenue
       FROM orders o LEFT JOIN landing_pages l ON l.id = o.landing_id
       WHERE o.created_at >= ? AND o.created_at < ? GROUP BY o.source, o.landing_id ORDER BY revenue DESC`,
      [r.start, r.end],
    ),
    query<{ product_id: number | null; name: string; qty: number; revenue: number }>(
      `SELECT i.product_id, MAX(i.product_name) AS name, SUM(i.quantity) AS qty, SUM(i.line_total) AS revenue
       FROM order_items i JOIN orders o ON o.id = i.order_id
       WHERE o.created_at >= ? AND o.created_at < ? AND o.${COUNTED}
       GROUP BY COALESCE(i.product_id, i.product_name) ORDER BY qty DESC, revenue DESC LIMIT 6`,
      [r.start, r.end],
    ),
    query<Pick<Order, "id" | "order_no" | "customer_name" | "phone" | "total" | "status" | "created_at">>(
      "SELECT id, order_no, customer_name, phone, total, status, created_at FROM orders WHERE created_at >= ? AND created_at < ? ORDER BY id DESC LIMIT 7",
      [r.start, r.end],
    ),
    queryOne<{ n: number }>("SELECT COUNT(*) AS n FROM orders WHERE status = 'pending'"),
  ]);
  const byKey = new Map(series.map((x) => [x.k, x]));
  return {
    now, prev,
    series: bucketKeys(r).map(({ key, label }): SeriesPoint => ({ key, label, orders: Number(byKey.get(key)?.orders ?? 0), revenue: Number(byKey.get(key)?.revenue ?? 0) })),
    statuses: Object.fromEntries(statuses.map((x) => [x.status, Number(x.n)])) as Record<string, number>,
    zones: zones.map((z) => ({ label: z.label, count: Number(z.count) })),
    sources: sources.map((x) => ({ ...x, orders: Number(x.orders), revenue: Number(x.revenue) })),
    products: products.map((p) => ({ ...p, qty: Number(p.qty), revenue: Number(p.revenue) })),
    recent,
    pendingNow: Number(pendingNow?.n ?? 0),
  };
}

export async function getFirstOrderDate() {
  const r = await queryOne<{ d: string | null }>("SELECT DATE_FORMAT(MIN(created_at), '%Y-%m-%d') AS d FROM orders");
  return r?.d ?? null;
}

export type CustomerRow = {
  phone: string;
  name: string;
  address: string;
  orders: number;
  delivered: number;
  cancelled: number;
  spent: number;
  last_order: Date;
  user_id: number | null;
  blocked: number;
};

export async function listCustomers({ q, page = 1, perPage = 20 }: { q?: string; page?: number; perPage?: number }) {
  const params: (string | number)[] = [];
  let where = "";
  if (q?.trim()) {
    where = "WHERE o.phone LIKE ? OR o.customer_name LIKE ?";
    params.push(`%${q.trim()}%`, `%${q.trim()}%`);
  }
  const [rows, totalRow] = await Promise.all([
    query<CustomerRow>(
      `SELECT o.phone,
              SUBSTRING_INDEX(GROUP_CONCAT(o.customer_name ORDER BY o.id DESC SEPARATOR '\\n'), '\\n', 1) AS name,
              SUBSTRING_INDEX(GROUP_CONCAT(o.address ORDER BY o.id DESC SEPARATOR '\\n'), '\\n', 1) AS address,
              COUNT(*) AS orders,
              SUM(o.status = 'delivered') AS delivered,
              SUM(o.status IN ('cancelled','returned')) AS cancelled,
              COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.total END),0) AS spent,
              MAX(o.created_at) AS last_order,
              (SELECT u.id FROM users u WHERE u.phone = o.phone AND u.role = 'customer' LIMIT 1) AS user_id,
              EXISTS(SELECT 1 FROM blocked_phones b WHERE b.phone = o.phone) AS blocked
       FROM orders o ${where}
       GROUP BY o.phone ORDER BY last_order DESC LIMIT ? OFFSET ?`,
      [...params, perPage, (page - 1) * perPage],
    ),
    queryOne<{ total: number }>(`SELECT COUNT(DISTINCT o.phone) AS total FROM orders o ${where}`, params),
  ]);
  const total = Number(totalRow?.total ?? 0);
  return { rows, total, page, pages: Math.max(Math.ceil(total / perPage), 1) };
}

export async function getRegisteredCustomerCount() {
  const row = await queryOne<{ count: number }>("SELECT COUNT(*) AS count FROM users WHERE role = 'customer'");
  return Number(row?.count ?? 0);
}

export async function listBlockedPhones() {
  return query<{ id: number; phone: string; reason: string | null; created_at: Date }>(
    "SELECT * FROM blocked_phones ORDER BY id DESC",
  );
}
