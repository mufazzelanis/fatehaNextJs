"use server";

import { adminWith } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { getOrderById, zoneLabel } from "@/lib/data/orders";
import { headline, parseAttribution } from "@/lib/attribution";
import { PAYMENT_LABEL, isPaymentMethod } from "@/lib/payments";
import type { OrderStatus } from "@/lib/format";

export type QuickOrder = {
  id: number;
  orderNo: string;
  status: OrderStatus;
  name: string;
  phone: string;
  address: string;
  zone: string;
  note: string | null;
  adminNote: string | null;
  items: { name: string; qty: number; price: number; total: number }[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  payment: string;
  paymentStatus: string;
  trx: string | null;
  origin: string;
  campaign: string;
  source: string;
  ip: string | null;
  createdAt: string;
  history: { status: OrderStatus; note: string | null; at: string; by: string | null }[];
  /** Same phone's other orders — spot repeat buyers and fake / cancelling customers before calling. */
  customer: { orders: number; delivered: number; cancelled: number; returned: number };
};

/** Everything the mobile order popup shows, loaded when it opens. */
export async function getQuickOrder(id: number): Promise<QuickOrder | null> {
  const admin = await adminWith("orders.view");
  if (!admin || !Number.isInteger(id) || id <= 0) return null;
  const o = await getOrderById(id);
  if (!o) return null;
  const [landing, stats] = await Promise.all([
    o.landing_id ? queryOne<{ name: string }>("SELECT name FROM landing_pages WHERE id = ?", [o.landing_id]) : null,
    query<{ status: OrderStatus; n: number }>("SELECT status, COUNT(*) n FROM orders WHERE phone = ? AND id <> ? GROUP BY status", [o.phone, o.id]),
  ]);
  const count = (s: OrderStatus) => Number(stats.find((r) => r.status === s)?.n ?? 0);
  const h = headline(parseAttribution(o.attribution));
  return {
    id: o.id, orderNo: o.order_no, status: o.status, name: o.customer_name, phone: o.phone, address: o.address,
    zone: zoneLabel(o), note: o.note, adminNote: o.admin_note,
    items: o.items.map((i) => ({ name: i.product_name, qty: Number(i.quantity), price: Number(i.unit_price), total: Number(i.line_total) })),
    subtotal: Number(o.subtotal), shipping: Number(o.shipping_charge), discount: Number(o.discount), total: Number(o.total),
    payment: isPaymentMethod(o.payment_method) ? PAYMENT_LABEL[o.payment_method] : o.payment_method,
    paymentStatus: o.payment_status, trx: o.payment_trx,
    origin: o.source === "store" ? "Shop" : landing?.name ?? "Landing",
    campaign: o.utm_campaign ?? h.campaign ?? "", source: o.utm_source ?? h.source ?? "",
    ip: o.ip_address, createdAt: new Date(o.created_at).toISOString(),
    history: o.history.map((x) => ({ status: x.status, note: x.note, at: new Date(x.created_at).toISOString(), by: x.changed_by_name ?? null })),
    customer: { orders: stats.reduce((s, r) => s + Number(r.n), 0), delivered: count("delivered"), cancelled: count("cancelled"), returned: count("returned") },
  };
}
