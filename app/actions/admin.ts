"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { getMarketingConfig } from "@/lib/meta/config";
import { sendPurchaseForOrder } from "@/lib/meta/capi";
import { execute, query, queryOne, transaction } from "@/lib/db";
import { adminWith, DENIED, requirePermission } from "@/lib/auth";
import { SETTING_KEYS, STORE_TAG } from "@/lib/data/store";
import { LANDING_TAG, readLanding } from "@/lib/data/landings";
import { revalidateStock } from "@/lib/data/catalog";
import { isOrderStatus, STATUS_META, type OrderStatus } from "@/lib/format";
import { normalizePhone } from "@/lib/phone";
import { DEFAULT_CONTENT, normalizeContent, type LandingContent } from "@/lib/content";
import { defaultCheckout, normalizeCheckout } from "@/lib/checkout";
import { diff, logActivity, type Change } from "@/lib/activity";
import type { ActionState } from "@/lib/action-state";

// Stock returns to inventory when an order leaves an active state, and is taken again if it comes back.
const RELEASED: OrderStatus[] = ["cancelled", "returned"];

const actorOf = (a: { id: number; name: string }) => ({ id: a.id, name: a.name });

async function applyStatus(orderIds: number[], status: OrderStatus, note: string | null, adminId: number) {
  const changed: { id: number; orderNo: string; from: OrderStatus }[] = [];
  await transaction(async (conn) => {
    for (const id of orderIds) {
      const [rows] = await conn.query<import("mysql2").RowDataPacket[]>(
        "SELECT status, order_no FROM orders WHERE id = ? FOR UPDATE",
        [id],
      );
      const current = rows[0]?.status as OrderStatus | undefined;
      if (!current || current === status) continue;

      const wasReleased = RELEASED.includes(current);
      const nowReleased = RELEASED.includes(status);
      if (wasReleased !== nowReleased) {
        await conn.query(
          `UPDATE products p JOIN order_items i ON i.product_id = p.id
           SET p.stock = p.stock ${nowReleased ? "+" : "-"} i.quantity WHERE i.order_id = ?`,
          [id],
        );
      }
      await conn.query("UPDATE orders SET status = ? WHERE id = ?", [status, id]);
      await conn.query(
        "INSERT INTO order_status_history (order_id, status, note, changed_by) VALUES (?, ?, ?, ?)",
        [id, status, note, adminId],
      );
      changed.push({ id, orderNo: rows[0].order_no, from: current });
    }
  });
  return changed;
}

/** Sends the Conversions API Purchase for orders that just reached the status chosen in Pixel settings. */
async function purchaseOnStatus(orderIds: number[], status: OrderStatus) {
  const config = await getMarketingConfig();
  if (!config.capiEnabled || config.purchaseTrigger === "placed") return;
  const qualifies =
    config.purchaseTrigger === "delivered" ? status === "delivered" : ["confirmed", "processing", "shipped", "delivered"].includes(status);
  if (!qualifies) return;
  after(async () => {
    for (const id of orderIds) await sendPurchaseForOrder(id);
  });
}

export async function resendPurchase(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminWith("marketing.manage");
  if (!admin) return DENIED;
  const id = Number(formData.get("id"));
  const result = await sendPurchaseForOrder(id, { force: true });
  await logActivity({
    actor: actorOf(admin), action: "pixel.purchase_resent", module: "marketing", entityType: "order", entityId: id,
    description: `Re-sent Facebook Purchase for order ${id} — ${result.ok ? "accepted" : `failed: ${result.message}`}`,
  });
  refresh();
  return result.ok ? { ok: true, message: `Purchase sent to Facebook — ${result.message}` } : { error: `Facebook rejected it: ${result.message}` };
}

export async function updateOrderStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminWith("orders.edit");
  if (!admin) return DENIED;
  const id = Number(formData.get("id"));
  const status = formData.get("status");
  const note = String(formData.get("note") ?? "").trim().slice(0, 500) || null;
  if (!id || !isOrderStatus(status)) return { error: "Invalid status" };
  const changed = await applyStatus([id], status, note, admin.id);
  for (const c of changed) {
    await logActivity({
      actor: actorOf(admin), action: "order.status_changed", module: "orders", entityType: "order", entityId: c.id,
      description: `Order #${c.orderNo}: ${STATUS_META[c.from].label} → ${STATUS_META[status].label}${note ? ` (${note})` : ""}`,
      changes: [{ field: "status", from: c.from, to: status }],
    });
  }
  if (changed.length) revalidateStock();
  await purchaseOnStatus([id], status);
  refresh();
  return { ok: true, message: changed.length ? "Status updated" : "Status unchanged" };
}

export async function bulkOrderAction(ids: number[], action: OrderStatus | "delete"): Promise<ActionState> {
  const admin = await adminWith(action === "delete" ? "orders.delete" : "orders.edit");
  if (!admin) return DENIED;
  const clean = ids.map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 500);
  if (!clean.length) return { error: "No orders selected" };

  if (action === "delete") {
    const deleted: string[] = [];
    await transaction(async (conn) => {
      for (const id of clean) {
        const [rows] = await conn.query<import("mysql2").RowDataPacket[]>("SELECT status, order_no FROM orders WHERE id = ?", [id]);
        if (!rows[0]) continue;
        if (!RELEASED.includes(rows[0].status)) {
          await conn.query(
            "UPDATE products p JOIN order_items i ON i.product_id = p.id SET p.stock = p.stock + i.quantity WHERE i.order_id = ?",
            [id],
          );
        }
        await conn.query("DELETE FROM orders WHERE id = ?", [id]);
        deleted.push(rows[0].order_no);
      }
    });
    await logActivity({
      actor: actorOf(admin), action: "order.deleted", module: "orders", entityType: "order", entityId: deleted.length === 1 ? clean[0] : undefined,
      description: `Deleted ${deleted.length} order(s): ${deleted.map((n) => `#${n}`).join(", ")}`,
    });
    if (deleted.length) revalidateStock();
    refresh();
    return { ok: true, message: `${deleted.length} order(s) deleted` };
  }

  if (!isOrderStatus(action)) return { error: "Invalid action" };
  const changed = await applyStatus(clean, action, "Bulk update", admin.id);
  if (changed.length) {
    await logActivity({
      actor: actorOf(admin), action: "order.bulk_status", module: "orders",
      description: `Bulk: ${changed.length} order(s) marked ${STATUS_META[action].label} — ${changed.map((c) => `#${c.orderNo}`).join(", ")}`,
      changes: changed.map((c) => ({ field: `#${c.orderNo} status`, from: c.from, to: action })),
    });
  }
  if (changed.length) revalidateStock();
  await purchaseOnStatus(clean, action);
  refresh();
  return { ok: true, message: `${changed.length} order(s) marked ${action}` };
}

type OrderEditable = {
  order_no: string; customer_name: string; phone: string; address: string; admin_note: string | null;
  shipping_zone: string; shipping_label: string | null; shipping_charge: number; discount: number; subtotal: number; total: number; landing_id: number | null;
};

export async function updateOrderDetails(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminWith("orders.edit");
  if (!admin) return DENIED;
  const id = Number(formData.get("id"));
  const name = String(formData.get("customer_name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const adminNote = String(formData.get("admin_note") ?? "").trim().slice(0, 1000) || null;
  const zoneId = String(formData.get("shipping_zone") ?? "");
  const shipping = Math.max(Number(formData.get("shipping_charge")) || 0, 0);
  const discount = Math.max(Number(formData.get("discount")) || 0, 0);

  if (!id || name.length < 2 || address.length < 3 || !phone) {
    return { error: "Name, a valid phone and address are required" };
  }
  const order = await queryOne<OrderEditable>(
    "SELECT order_no, customer_name, phone, address, admin_note, shipping_zone, shipping_label, shipping_charge, discount, subtotal, total, landing_id FROM orders WHERE id = ?",
    [id],
  );
  if (!order) return { error: "Order not found" };
  // Zone must be one of the order's landing checkout zones, or the order's existing zone.
  const zones = order.landing_id ? ((await readLanding(order.landing_id))?.checkout.zones ?? []) : [];
  const zone = zones.find((z) => z.id === zoneId);
  const zoneLabel = zone?.label ?? (zoneId === order.shipping_zone ? order.shipping_label : null);
  if (!zoneLabel) return { error: "Choose a delivery zone" };
  const total = Math.max(Number(order.subtotal) + shipping - discount, 0);

  const next = { customer_name: name, phone, address, admin_note: adminNote, shipping_label: zoneLabel, shipping_charge: shipping, discount, total };
  const changes = diff(order, next, ["customer_name", "phone", "address", "admin_note", "shipping_label", "shipping_charge", "discount", "total"]);
  if (!changes.length) return { ok: true, message: "Nothing changed" };

  await execute(
    `UPDATE orders SET customer_name = ?, phone = ?, address = ?, admin_note = ?, shipping_zone = ?, shipping_label = ?,
            shipping_charge = ?, discount = ?, total = ? WHERE id = ?`,
    [name, phone, address, adminNote, zoneId, zoneLabel, shipping, discount, total, id],
  );
  await logActivity({
    actor: actorOf(admin), action: "order.updated", module: "orders", entityType: "order", entityId: id,
    description: `Edited order #${order.order_no} (${changes.map((c) => c.field.replace(/_/g, " ")).join(", ")})`,
    changes,
  });
  refresh();
  return { ok: true, message: "Order saved" };
}

export async function deleteOrder(formData: FormData) {
  await requirePermission("orders.delete");
  await bulkOrderAction([Number(formData.get("id"))], "delete");
  redirect("/admin/orders");
}

/** Settings whose values are never written to the activity log. */
const SECRET_KEYS = new Set<string>(["meta_access_token"]);

export async function saveSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminWith("settings.manage");
  if (!admin) return DENIED;
  const rows = await query<{ key: string; value: string | null }>("SELECT `key`, `value` FROM settings");
  const before = Object.fromEntries(rows.map((r) => [r.key, r.value ?? ""]));
  const changes: Change[] = [];
  for (const key of SETTING_KEYS) {
    if (key === "banner_image" || !formData.has(key)) continue;
    const limit = key.endsWith("_policy") || key === "terms_of_service" ? 20000 : 1000;
    const value = String(formData.get(key) ?? "").trim().slice(0, limit);
    if ((before[key] ?? "") === value) continue;
    await execute("INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)", [key, value]);
    const long = value.length > 120 || (before[key] ?? "").length > 120;
    changes.push({
      field: key.replace(/_/g, " "),
      from: SECRET_KEYS.has(key) ? "••••" : long ? `${(before[key] ?? "").length} characters` : before[key] ?? "",
      to: SECRET_KEYS.has(key) ? "••••" : long ? `${value.length} characters` : value,
    });
  }
  if (changes.length) {
    await logActivity({
      actor: actorOf(admin), action: "settings.updated", module: "settings",
      description: `Changed store settings: ${changes.map((c) => c.field).join(", ")}`, changes,
    });
  }
  updateTag(STORE_TAG);
  return { ok: true, message: changes.length ? "Settings saved" : "Nothing changed" };
}

export async function blockPhone(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminWith("customers.block");
  if (!admin) return DENIED;
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300) || null;
  if (!phone) return { error: "Enter a valid 11-digit mobile number" };
  await execute("INSERT INTO blocked_phones (phone, reason) VALUES (?, ?) ON DUPLICATE KEY UPDATE reason = VALUES(reason)", [phone, reason]);
  await logActivity({
    actor: actorOf(admin), action: "customer.blocked", module: "customers", entityType: "phone", entityId: phone,
    description: `Blocked ${phone}${reason ? ` — ${reason}` : ""}`,
  });
  refresh();
  return { ok: true, message: `${phone} blocked` };
}

export async function toggleBlockPhone(formData: FormData) {
  const admin = await requirePermission("customers.block");
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  if (!phone) return;
  const block = formData.get("block") === "1";
  if (block) {
    await execute("INSERT IGNORE INTO blocked_phones (phone, reason) VALUES (?, 'Blocked from customers list')", [phone]);
  } else {
    await execute("DELETE FROM blocked_phones WHERE phone = ?", [phone]);
  }
  await logActivity({
    actor: actorOf(admin), action: block ? "customer.blocked" : "customer.unblocked", module: "customers", entityType: "phone", entityId: phone,
    description: `${block ? "Blocked" : "Unblocked"} ${phone}`,
  });
  refresh();
}

/** Lists which top-level content sections differ, without dumping whole paragraphs into the log. */
function contentChanges(before: LandingContent, after: LandingContent): Change[] {
  const changes: Change[] = [];
  for (const key of Object.keys(after) as (keyof LandingContent)[]) {
    const a = JSON.stringify(before[key]);
    const b = JSON.stringify(after[key]);
    if (a === b) continue;
    const short = (v: unknown) => {
      const s = typeof v === "string" ? v : Array.isArray(v) ? `${v.length} item(s)` : JSON.stringify(v);
      return s.length > 120 ? `${s.slice(0, 117)}…` : s;
    };
    changes.push({ field: key, from: short(before[key]), to: short(after[key]) });
  }
  return changes;
}

export async function saveLandingContent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminWith("content.manage");
  if (!admin) return DENIED;
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(formData.get("content") ?? ""));
  } catch {
    return { error: "Could not read the form data — please try again" };
  }
  const reset = formData.get("reset") === "1";
  const landing = await readLanding(Number(formData.get("landing_id")) || 0);
  if (!landing) return { error: "Landing page not found" };
  // Re-validated on the server so a malformed payload can never break the landing page.
  const content = reset ? DEFAULT_CONTENT : normalizeContent(parsed);
  const previous: LandingContent = landing.content;
  const changes = contentChanges(previous, content);

  await execute("UPDATE landing_pages SET content = ? WHERE id = ?", [JSON.stringify(content), landing.id]);
  if (changes.length) {
    await logActivity({
      actor: actorOf(admin), action: reset ? "content.reset" : "content.updated", module: "content", entityType: "landing", entityId: landing.id,
      description: reset ? `Reset “${landing.name}” content to the original text` : `Edited landing “${landing.name}”: ${changes.map((c) => c.field).join(", ")}`,
      changes,
    });
  }
  updateTag(LANDING_TAG);
  updateTag(`landing-${landing.slug}`);
  return { ok: true, message: reset ? "Content reset to the original text" : "Content saved — the landing page is updated" };
}

export async function saveCheckoutConfig(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminWith("checkout.manage");
  if (!admin) return DENIED;
  const reset = formData.get("reset") === "1";
  let parsed: unknown = {};
  if (!reset) {
    try {
      parsed = JSON.parse(String(formData.get("config") ?? ""));
    } catch {
      return { error: "Could not read the form data — please try again" };
    }
  }
  const landing = await readLanding(Number(formData.get("landing_id")) || 0);
  if (!landing) return { error: "Landing page not found" };
  const previous = landing.checkout;
  const config = reset ? defaultCheckout() : normalizeCheckout(parsed);
  if (!config.zones.length) return { error: "Add at least one delivery zone" };

  const changes: Change[] = [];
  for (const key of Object.keys(config) as (keyof typeof config)[]) {
    const a = JSON.stringify(previous[key]);
    const b = JSON.stringify(config[key]);
    if (a === b) continue;
    const short = (v: unknown) => {
      const s = key === "zones"
        ? (v as { label: string; charge: number }[]).map((z) => `${z.label} ৳${z.charge}`).join(", ")
        : key === "customFields" ? (v as { label: string }[]).map((c) => c.label).join(", ") || "none"
        : typeof v === "string" ? v : JSON.stringify(v);
      return s.length > 160 ? `${s.slice(0, 157)}…` : s;
    };
    changes.push({ field: key, from: short(previous[key]), to: short(config[key]) });
  }

  await execute("UPDATE landing_pages SET checkout = ? WHERE id = ?", [JSON.stringify(config), landing.id]);
  if (changes.length) {
    await logActivity({
      actor: actorOf(admin), action: reset ? "checkout.reset" : "checkout.updated", module: "checkout", entityType: "landing", entityId: landing.id,
      description: reset ? `Reset the checkout form of “${landing.name}” to defaults` : `Edited checkout form of “${landing.name}”: ${changes.map((c) => c.field).join(", ")}`,
      changes,
    });
  }
  updateTag(LANDING_TAG);
  updateTag(`landing-${landing.slug}`);
  return { ok: true, message: reset ? "Checkout reset to defaults" : changes.length ? "Checkout saved — live on the landing page" : "Nothing changed" };
}
