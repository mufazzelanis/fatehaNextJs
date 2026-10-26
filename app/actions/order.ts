"use server";

import { cookies, headers } from "next/headers";
import { after } from "next/server";
import { getMarketingConfig } from "@/lib/meta/config";
import { sendPurchaseForOrder } from "@/lib/meta/capi";
import { redirect } from "next/navigation";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { queryOne, transaction } from "@/lib/db";
import { getCustomer } from "@/lib/auth";
import type { Product } from "@/lib/data/store";
import { readLanding, readLandingSettings } from "@/lib/data/landings";
import { revalidateStock } from "@/lib/data/catalog";
import { alertNewOrder } from "@/lib/notify";
import { logActivity } from "@/lib/activity";
import { clientIpFrom } from "@/lib/client-ip";
import { getOrderByNo } from "@/lib/data/orders";
import { normalizePhone } from "@/lib/phone";
import { bn, STATUS_META, type OrderStatus } from "@/lib/format";
import type { ActionState } from "@/lib/action-state";

export async function placeOrder(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const landing = await readLanding(Math.trunc(Number(formData.get("landing"))) || 0);
  if (!landing || landing.status !== "published" || !landing.product_id) {
    return { error: "দুঃখিত, এই পেজ থেকে এখন অর্ডার নেওয়া হচ্ছে না।" };
  }
  const checkout = landing.checkout;
  const values: Record<string, string> = {
    name: String(formData.get("name") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    note: checkout.fields.note.enabled ? String(formData.get("note") ?? "").trim() : "",
    zone: String(formData.get("zone") ?? ""),
    quantity: String(formData.get("quantity") ?? "1"),
  };

  const fieldErrors: Record<string, string> = {};
  if (values.name.length < 2) fieldErrors.name = "অনুগ্রহ করে আপনার নাম লিখুন";
  if (values.name.length > 120) fieldErrors.name = "নাম অনেক বড় হয়ে গেছে";
  if (values.address.length < 8) fieldErrors.address = "গ্রাম, থানা ও জেলা সহ পূর্ণ ঠিকানা লিখুন";
  if (values.address.length > 500) fieldErrors.address = "ঠিকানা ৫০০ অক্ষরের মধ্যে লিখুন";
  const phone = normalizePhone(values.phone);
  if (!phone) fieldErrors.phone = "সঠিক ১১ ডিজিটের মোবাইল নাম্বার দিন (যেমন 017XXXXXXXX)";

  // Delivery zone and charge come from the admin's checkout settings, never from the browser.
  const zone = checkout.zones.find((z) => z.id === values.zone);
  if (!zone) fieldErrors.zone = "ডেলিভারি এলাকা নির্বাচন করুন";

  const maxQty = checkout.allowQuantity ? checkout.maxQuantity : 1;
  const quantity = Math.trunc(Number(values.quantity));
  if (!Number.isFinite(quantity) || quantity < 1 || quantity > maxQty) {
    fieldErrors.quantity = maxQty === 1 ? "একবারে ১টি অর্ডার করা যাবে" : `পরিমাণ ১ থেকে ${bn(maxQty)} এর মধ্যে হতে হবে`;
  }

  const customFields: { label: string; value: string }[] = [];
  for (const cf of checkout.customFields) {
    const key = `cf_${cf.id}`;
    const value = String(formData.get(key) ?? "").trim().slice(0, cf.type === "textarea" ? 1000 : 200);
    values[key] = value;
    if (cf.required && !value) fieldErrors[key] = `${cf.label} দিন`;
    else if (cf.type === "select" && value && !cf.options.includes(value)) fieldErrors[key] = `${cf.label} থেকে একটি বেছে নিন`;
    else if (value) customFields.push({ label: cf.label, value });
  }
  if (Object.keys(fieldErrors).length || !phone || !zone) {
    return { error: "ফর্মের লাল চিহ্নিত ঘরগুলো ঠিক করুন", fieldErrors, values };
  }

  const blocked = await queryOne<{ id: number }>("SELECT id FROM blocked_phones WHERE phone = ?", [phone]);
  if (blocked) {
    return { error: "দুঃখিত, এই নাম্বার থেকে অর্ডার গ্রহণ করা যাচ্ছে না। আমাদের সাথে যোগাযোগ করুন।", values };
  }

  const blockMinutes = (await readLandingSettings()).duplicateMinutes;
  if (blockMinutes > 0) {
    const recent = await queryOne<{ order_no: string }>(
      `SELECT order_no FROM orders WHERE phone = ? AND status = 'pending'
       AND created_at >= NOW() - INTERVAL ? MINUTE ORDER BY id DESC LIMIT 1`,
      [phone, blockMinutes],
    );
    if (recent) {
      return {
        error: `এই নাম্বার থেকে কিছুক্ষণ আগেই একটি অর্ডার (#${recent.order_no}) করা হয়েছে। আমাদের প্রতিনিধি শীঘ্রই আপনাকে কল করবেন।`,
        values,
      };
    }
  }

  const customer = await getCustomer();
  const requestHeaders = await headers();
  const ip = clientIpFrom(requestHeaders);
  const userAgent = requestHeaders.get("user-agent")?.slice(0, 300) ?? null;
  const shipping = zone.charge;
  // Browser identifiers for the Conversions API, kept so Purchase can also be sent later (on confirm/deliver).
  const cookieStore = await cookies();
  const fbp = cookieStore.get("_fbp")?.value?.slice(0, 255) ?? null;
  const fbc = cookieStore.get("_fbc")?.value?.slice(0, 255) ?? null;
  const sourceUrl = requestHeaders.get("referer")?.slice(0, 500) ?? null;

  let placed: { no: string; orderId: number };
  try {
    placed = await transaction(async (conn) => {
      // Price and stock always come from the database, never from the browser.
      const [productRows] = await conn.query<(Product & RowDataPacket)[]>(
        "SELECT * FROM products WHERE is_active = 1 AND id = ? LIMIT 1 FOR UPDATE",
        [landing.product_id],
      );
      const product = productRows[0];
      if (!product) throw new OrderError("পণ্যটি এই মুহূর্তে পাওয়া যাচ্ছে না");
      if (product.stock < quantity) throw new OrderError("দুঃখিত, পর্যাপ্ত স্টক নেই");

      const subtotal = Number(product.price) * quantity;
      const [result] = await conn.query<ResultSetHeader>(
        `INSERT INTO orders (user_id, customer_name, phone, address, note, shipping_zone, shipping_charge,
                             subtotal, total, ip_address, user_agent, fbp, fbc, event_source_url, shipping_label, custom_fields, source, landing_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'landing', ?)`,
        [customer?.id ?? null, values.name, phone, values.address, values.note.slice(0, 1000) || null,
         zone.id, shipping, subtotal, subtotal + shipping, ip, userAgent, fbp, fbc, sourceUrl,
         zone.label, customFields.length ? JSON.stringify(customFields) : null, landing.id],
      );
      const orderId = result.insertId;
      const no = `${landing.order_prefix || "DC"}${10000 + orderId}`;
      await conn.query("UPDATE orders SET order_no = ? WHERE id = ?", [no, orderId]);
      await conn.query(
        `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, line_total)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, product.id, `${product.name}${product.weight ? ` (${product.weight})` : ""}`, product.price, quantity, subtotal],
      );
      await conn.query("UPDATE products SET stock = stock - ? WHERE id = ?", [quantity, product.id]);
      await conn.query("INSERT INTO order_status_history (order_id, status, note) VALUES (?, 'pending', ?)", [
        orderId,
        "গ্রাহক অর্ডার করেছেন",
      ]);
      return { no, orderId };
    });
  } catch (error) {
    if (error instanceof OrderError) return { error: error.message, values };
    console.error("placeOrder failed", error);
    return { error: "দুঃখিত, অর্ডারটি সম্পন্ন করা যায়নি। আবার চেষ্টা করুন।", values };
  }

  revalidateStock();
  await logActivity({
    action: "order.created", module: "orders", entityType: "order", entityId: placed.orderId,
    description: `New order #${placed.no} from ${values.name} (${phone}) — ${quantity} item(s), ${zone.label} · landing “${landing.name}”`,
  });

  // Admin email + optional customer SMS, after the response so a slow gateway never delays the order.
  after(() => alertNewOrder(placed.orderId));
  // Server-side Purchase right away when the pixel is set to count orders as soon as they are placed.
  const marketing = await getMarketingConfig();
  if (marketing.capiEnabled && marketing.purchaseTrigger === "placed") {
    after(() => sendPurchaseForOrder(placed.orderId));
  }

  redirect(`/order/success?no=${placed.no}`);
}

class OrderError extends Error {}

export type TrackResult = ActionState & {
  order?: {
    order_no: string;
    customer_name: string;
    status: OrderStatus;
    status_bn: string;
    total: number;
    created_at: string;
    items: { name: string; quantity: number }[];
    history: { status: OrderStatus; created_at: string; note: string | null }[];
  };
};

export async function trackOrder(_prev: TrackResult, formData: FormData): Promise<TrackResult> {
  const orderNo = String(formData.get("order_no") ?? "").trim().toUpperCase().replace(/^#/, "");
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const values = { order_no: orderNo, phone: String(formData.get("phone") ?? "") };
  if (!orderNo || !phone) return { error: "অর্ডার নাম্বার ও মোবাইল নাম্বার সঠিকভাবে দিন", values };

  const order = await getOrderByNo(orderNo);
  // Both must match, so order numbers alone can't be used to look up someone else's order.
  if (!order || order.phone !== phone) {
    return { error: "এই তথ্য দিয়ে কোনো অর্ডার পাওয়া যায়নি", values };
  }
  return {
    ok: true,
    values,
    order: {
      order_no: order.order_no,
      customer_name: order.customer_name,
      status: order.status,
      status_bn: STATUS_META[order.status].bn,
      total: Number(order.total),
      created_at: new Date(order.created_at).toISOString(),
      items: order.items.map((i) => ({ name: i.product_name, quantity: i.quantity })),
      history: order.history.map((h) => ({ status: h.status, note: h.note, created_at: new Date(h.created_at).toISOString() })),
    },
  };
}
