"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { queryOne, transaction } from "@/lib/db";
import { getCustomer } from "@/lib/auth";
import { getPaymentConfig, getProductsByIds, getStoreConfig, revalidateStock } from "@/lib/data/catalog";
import { getSettings } from "@/lib/data/store";
import { resolveArea } from "@/lib/data/locations";
import { deliveryCharge } from "@/lib/store-config";
import { isPaymentMethod, isWallet, PAYMENT_LABEL } from "@/lib/payments";
import { normalizePhone } from "@/lib/phone";
import { clientIpFrom } from "@/lib/client-ip";
import { readCheckoutTiming } from "@/lib/checkout";
import { logActivity } from "@/lib/activity";
import { alertNewOrder } from "@/lib/notify";
import { getMarketingConfig } from "@/lib/meta/config";
import { sendPurchaseForOrder } from "@/lib/meta/capi";
import type { ActionState } from "@/lib/action-state";

export type QuoteLine = { id: number; name: string; slug: string; price: number; stock: number; image: string };

/** Fresh prices and stock for whatever is in the browser cart (unknown/hidden products are dropped). */
export async function quoteCart(ids: number[]): Promise<QuoteLine[]> {
  const products = await getProductsByIds(ids);
  return products.map((p) => ({
    id: p.id, name: p.name, slug: p.slug, price: p.price, stock: p.stock, image: p.image ? `/media/${p.image}` : "/product-jar.svg",
  }));
}

class CheckoutError extends Error {}

type Line = { id: number; qty: number };

function parseItems(raw: FormDataEntryValue | null): Line[] {
  try {
    const parsed = JSON.parse(String(raw ?? "[]"));
    if (!Array.isArray(parsed)) return [];
    const merged = new Map<number, number>();
    for (const x of parsed.slice(0, 50)) {
      const id = Math.trunc(Number(x?.id));
      const qty = Math.trunc(Number(x?.qty));
      if (id > 0 && qty > 0) merged.set(id, Math.min((merged.get(id) ?? 0) + qty, 20));
    }
    return [...merged].map(([id, qty]) => ({ id, qty }));
  } catch {
    return [];
  }
}

export async function placeStoreOrder(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values: Record<string, string> = {};
  for (const k of ["name", "phone", "address", "note", "district", "thana", "union", "payment", "sender", "trx"]) {
    values[k] = String(formData.get(k) ?? "").trim();
  }
  const items = parseItems(formData.get("items"));
  const fieldErrors: Record<string, string> = {};

  if (!items.length) return { error: "Your cart is empty.", values };
  if (values.name.length < 2 || values.name.length > 120) fieldErrors.name = "Please enter your full name";
  const phone = normalizePhone(values.phone);
  if (!phone) fieldErrors.phone = "Enter a valid 11-digit mobile number (e.g. 017XXXXXXXX)";
  if (values.address.length < 5 || values.address.length > 400) fieldErrors.address = "Enter your house, road or village";

  const districtId = Math.trunc(Number(values.district));
  const thanaId = Math.trunc(Number(values.thana));
  const unionId = Math.trunc(Number(values.union)) || null;
  const area = districtId > 0 && thanaId > 0 ? await resolveArea(districtId, thanaId, unionId) : null;
  if (!districtId) fieldErrors.district = "Choose your district";
  else if (!thanaId) fieldErrors.thana = "Choose your thana / upazila";
  else if (!area) fieldErrors.thana = "This area doesn't look right — please choose again";

  const payments = await getPaymentConfig();
  const method = values.payment;
  if (!isPaymentMethod(method) || !payments[method].enabled) fieldErrors.payment = "Choose a payment method";
  let sender: string | null = null;
  let trx: string | null = null;
  if (isPaymentMethod(method) && method !== "cod") {
    trx = values.trx.replace(/\s/g, "").toUpperCase();
    if (!/^[A-Z0-9-]{6,30}$/.test(trx)) fieldErrors.trx = "Enter the Transaction ID from your payment message";
    if (isWallet(method)) {
      sender = normalizePhone(values.sender);
      if (!sender) fieldErrors.sender = `Enter the ${PAYMENT_LABEL[method]} number you paid from`;
    } else {
      sender = values.sender.slice(0, 40) || null;
    }
  }
  if (Object.keys(fieldErrors).length || !phone || !area || !isPaymentMethod(method)) {
    return { error: "Please fix the highlighted fields.", fieldErrors, values };
  }

  if (await queryOne("SELECT id FROM blocked_phones WHERE phone = ?", [phone])) {
    return { error: "Sorry, we can't accept orders from this number. Please contact us.", values };
  }
  if (trx && (await queryOne("SELECT id FROM orders WHERE payment_trx = ? AND payment_method = ?", [trx, method]))) {
    return { error: "This Transaction ID was already used for another order.", fieldErrors: { trx: "Already used" }, values };
  }
  const settings = await getSettings();
  const lock = Number(settings.duplicate_block_minutes) || 0;
  if (lock > 0) {
    const recent = await queryOne<{ order_no: string }>(
      "SELECT order_no FROM orders WHERE phone = ? AND status = 'pending' AND created_at >= NOW() - INTERVAL ? MINUTE ORDER BY id DESC LIMIT 1",
      [phone, lock],
    );
    if (recent) return { error: `You placed order #${recent.order_no} a few minutes ago — we'll call you shortly to confirm it.`, values };
  }

  const [cfg, customer, h, jar] = await Promise.all([getStoreConfig(), getCustomer(), headers(), cookies()]);
  const fullAddress = [values.address, area.union_name, area.thana, area.district].filter(Boolean).join(", ");
  const inside = cfg.insideDistrictIds.includes(districtId);

  let placed: { no: string; orderId: number; count: number; total: number };
  try {
    const timing = readCheckoutTiming(formData);
    placed = await transaction(async (conn) => {
      const ids = items.map((i) => i.id);
      // Prices and stock always come from the database, under a row lock.
      const [rows] = await conn.query<(RowDataPacket & { id: number; name: string; weight: string | null; price: number; stock: number })[]>(
        `SELECT id, name, weight, price, stock FROM products WHERE is_active = 1 AND in_store = 1 AND id IN (${ids.map(() => "?").join(",")}) FOR UPDATE`,
        ids,
      );
      const lines = items.map((i) => {
        const p = rows.find((r) => r.id === i.id);
        if (!p) throw new CheckoutError("Some items in your cart are no longer available. Please review your cart.");
        if (p.stock < i.qty) throw new CheckoutError(`Only ${p.stock} left of “${p.name}”. Please lower the quantity.`);
        return { ...i, name: p.name, price: Number(p.price) };
      });
      const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
      const shipping = deliveryCharge(cfg, districtId, subtotal);
      const [res] = await conn.query<ResultSetHeader>(
        `INSERT INTO orders (user_id, customer_name, phone, address, note, shipping_zone, shipping_label, shipping_charge, subtotal, total,
           payment_method, payment_status, payment_sender, payment_trx, source, district_id, thana_id, union_id,
           ip_address, user_agent, fbp, fbc, event_source_url, page_seconds, checkout_seconds)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'store', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [customer?.id ?? null, values.name, phone, fullAddress, values.note.slice(0, 1000) || null,
         inside ? "inside" : "outside", `${area.district}${inside ? " (inside)" : ""}`, shipping, subtotal, subtotal + shipping,
         method, method === "cod" ? "unpaid" : "pending_verification", sender, trx, districtId, thanaId, unionId,
         clientIpFrom(h), h.get("user-agent")?.slice(0, 300) ?? null,
         jar.get("_fbp")?.value?.slice(0, 255) ?? null, jar.get("_fbc")?.value?.slice(0, 255) ?? null, h.get("referer")?.slice(0, 500) ?? null,
         timing.page, timing.checkout],
      );
      const orderId = res.insertId;
      const no = `FB${10000 + orderId}`;
      await conn.query("UPDATE orders SET order_no = ? WHERE id = ?", [no, orderId]);
      for (const l of lines) {
        const p = rows.find((r) => r.id === l.id)!;
        await conn.query(
          "INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, line_total) VALUES (?, ?, ?, ?, ?, ?)",
          [orderId, l.id, `${l.name}${p.weight ? ` (${p.weight})` : ""}`, l.price, l.qty, l.price * l.qty],
        );
        await conn.query("UPDATE products SET stock = stock - ? WHERE id = ?", [l.qty, l.id]);
      }
      await conn.query("INSERT INTO order_status_history (order_id, status, note) VALUES (?, 'pending', ?)", [
        orderId, `Online order · ${PAYMENT_LABEL[method]}${trx ? ` · TrxID ${trx}` : ""}`,
      ]);
      return { no, orderId, count: lines.reduce((s, l) => s + l.qty, 0), total: subtotal + shipping };
    });
  } catch (error) {
    if (error instanceof CheckoutError) return { error: error.message, values };
    console.error("placeStoreOrder failed", error);
    return { error: "Sorry, we couldn't place the order. Please try again.", values };
  }

  revalidateStock();
  await logActivity({
    action: "order.created", module: "orders", entityType: "order", entityId: placed.orderId,
    description: `New store order #${placed.no} from ${values.name} (${phone}) — ${placed.count} item(s), ৳${placed.total}, ${PAYMENT_LABEL[method]}, ${area.district}`,
  });
  after(() => alertNewOrder(placed.orderId));
  const marketing = await getMarketingConfig();
  if (marketing.capiEnabled && marketing.purchaseTrigger === "placed") after(() => sendPurchaseForOrder(placed.orderId));

  redirect(`/checkout/success?no=${placed.no}`);
}
