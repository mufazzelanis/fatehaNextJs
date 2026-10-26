import "server-only";
import { query, queryOne } from "../db";
import type { OrderStatus } from "../format";

export type Order = {
  id: number;
  order_no: string;
  user_id: number | null;
  customer_name: string;
  phone: string;
  address: string;
  note: string | null;
  shipping_zone: string;
  shipping_label: string | null;
  payment_status: string;
  payment_sender: string | null;
  payment_trx: string | null;
  source: string;
  landing_id: number | null;
  district_id: number | null;
  thana_id: number | null;
  union_id: number | null;
  custom_fields: string | null;
  shipping_charge: number;
  subtotal: number;
  discount: number;
  total: number;
  payment_method: string;
  status: OrderStatus;
  admin_note: string | null;
  ip_address: string | null;
  user_agent: string | null;
  fbp: string | null;
  fbc: string | null;
  event_source_url: string | null;
  pixel_purchase_sent_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type OrderItem = {
  id: number;
  product_id: number | null;
  product_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
};

export type StatusHistory = {
  id: number;
  status: OrderStatus;
  note: string | null;
  created_at: Date;
  changed_by_name: string | null;
};

export type OrderWithItems = Order & { items: OrderItem[]; history: StatusHistory[]; item_count?: number };

export type OrderFilters = {
  status?: string;
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  perPage?: number;
  /** payment_status, e.g. "pending_verification" */
  payment?: string;
  /** "store" | "landing" */
  source?: string;
  method?: string;
  landing?: number;
};

function buildWhere(filters: OrderFilters) {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (filters.status && filters.status !== "all") {
    where.push("o.status = ?");
    params.push(filters.status);
  }
  if (filters.q?.trim()) {
    const like = `%${filters.q.trim()}%`;
    where.push("(o.order_no LIKE ? OR o.phone LIKE ? OR o.customer_name LIKE ? OR o.address LIKE ?)");
    params.push(like, like, like, like);
  }
  if (filters.from && /^\d{4}-\d{2}-\d{2}$/.test(filters.from)) {
    where.push("o.created_at >= ?");
    params.push(`${filters.from} 00:00:00`);
  }
  if (filters.to && /^\d{4}-\d{2}-\d{2}$/.test(filters.to)) {
    where.push("o.created_at <= ?");
    params.push(`${filters.to} 23:59:59`);
  }
  if (filters.payment && ["unpaid", "pending_verification", "paid", "refunded"].includes(filters.payment)) {
    where.push("o.payment_status = ?");
    params.push(filters.payment);
  }
  if (filters.source === "store" || filters.source === "landing") {
    where.push("o.source = ?");
    params.push(filters.source);
  }
  if (filters.landing && filters.landing > 0) {
    where.push("o.landing_id = ?");
    params.push(filters.landing);
  }
  if (filters.method && /^[a-z]{2,10}$/.test(filters.method)) {
    where.push("o.payment_method = ?");
    params.push(filters.method);
  }
  return { sql: where.length ? `WHERE ${where.join(" AND ")}` : "", params };
}

export async function listOrders(filters: OrderFilters) {
  const perPage = Math.min(Math.max(filters.perPage ?? 20, 5), 200);
  const page = Math.max(filters.page ?? 1, 1);
  const { sql, params } = buildWhere(filters);

  const [rows, totalRow] = await Promise.all([
    query<Order & { item_count: number }>(
      `SELECT o.*, (SELECT COALESCE(SUM(quantity),0) FROM order_items i WHERE i.order_id = o.id) AS item_count
       FROM orders o ${sql} ORDER BY o.id DESC LIMIT ? OFFSET ?`,
      [...params, perPage, (page - 1) * perPage],
    ),
    queryOne<{ total: number }>(`SELECT COUNT(*) AS total FROM orders o ${sql}`, params),
  ]);
  const total = Number(totalRow?.total ?? 0);
  return { rows, total, page, perPage, pages: Math.max(Math.ceil(total / perPage), 1) };
}

/** All matching orders (for CSV export), capped for safety. */
export async function exportOrders(filters: OrderFilters) {
  const { sql, params } = buildWhere(filters);
  return query<Order & { items: string }>(
    `SELECT o.*, (SELECT GROUP_CONCAT(CONCAT(product_name, ' x', quantity) SEPARATOR '; ')
                   FROM order_items i WHERE i.order_id = o.id) AS items
     FROM orders o ${sql} ORDER BY o.id DESC LIMIT 10000`,
    params,
  );
}

export async function statusCounts() {
  const rows = await query<{ status: OrderStatus; count: number }>(
    "SELECT status, COUNT(*) AS count FROM orders GROUP BY status",
  );
  const counts: Record<string, number> = { all: 0 };
  for (const row of rows) {
    counts[row.status] = Number(row.count);
    counts.all += Number(row.count);
  }
  return counts;
}

async function withDetails(order: Order | null): Promise<OrderWithItems | null> {
  if (!order) return null;
  const [items, history] = await Promise.all([
    query<OrderItem>("SELECT id, product_id, product_name, unit_price, quantity, line_total FROM order_items WHERE order_id = ?", [order.id]),
    query<StatusHistory>(
      `SELECT h.id, h.status, h.note, h.created_at, u.name AS changed_by_name
       FROM order_status_history h LEFT JOIN users u ON u.id = h.changed_by
       WHERE h.order_id = ? ORDER BY h.id ASC`,
      [order.id],
    ),
  ]);
  return { ...order, items, history };
}

export async function getOrderById(id: number) {
  return withDetails(await queryOne<Order>("SELECT * FROM orders WHERE id = ?", [id]));
}

export async function getOrderByNo(orderNo: string) {
  return withDetails(await queryOne<Order>("SELECT * FROM orders WHERE order_no = ?", [orderNo]));
}

/** Orders that belong to a customer: placed while logged in, or placed as a guest with the same phone. */
export async function getCustomerOrders(userId: number, phone: string) {
  const orders = await query<Order>(
    "SELECT * FROM orders WHERE user_id = ? OR phone = ? ORDER BY id DESC LIMIT 100",
    [userId, phone],
  );
  return Promise.all(orders.map((order) => withDetails(order) as Promise<OrderWithItems>));
}

export async function previousOrdersByPhone(phone: string, excludeId: number) {
  return query<Pick<Order, "id" | "order_no" | "status" | "total" | "created_at">>(
    "SELECT id, order_no, status, total, created_at FROM orders WHERE phone = ? AND id <> ? ORDER BY id DESC LIMIT 10",
    [phone, excludeId],
  );
}

/** Human-readable delivery zone (orders from before editable zones only stored the id). */
export function zoneLabel(order: { shipping_zone: string; shipping_label?: string | null }) {
  if (order.shipping_label) return order.shipping_label;
  return order.shipping_zone === "inside" ? "Inside Dhaka" : order.shipping_zone === "outside" ? "Outside Dhaka" : order.shipping_zone;
}

/** Extra checkout answers stored with the order. */
export function parseCustomFields(raw: string | null): { label: string; value: string }[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => x && typeof x.label === "string" && typeof x.value === "string") : [];
  } catch {
    return [];
  }
}
