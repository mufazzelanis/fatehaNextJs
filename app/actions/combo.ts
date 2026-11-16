"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { execute, queryOne } from "@/lib/db";
import { adminWith, DENIED } from "@/lib/auth";
import { LANDING_TAG, readLanding } from "@/lib/data/landings";
import { normalizeCheckout, DEFAULT_PACKAGES } from "@/lib/checkout";
import { normalizeContent } from "@/lib/content";
import { logActivity } from "@/lib/activity";
import { findComboLanding } from "@/lib/data/combo";
import type { ActionState } from "@/lib/action-state";

/** Admin → Combo Order Page: packages (1 / 2 / 3 jars…), prices, free delivery, product and Live on/off in one save. */
export async function saveCombo(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminWith("content.manage");
  if (!admin) return DENIED;
  const l = await readLanding(Number(formData.get("landing")) || 0);
  if (!l || l.content.pageType !== "order") return { error: "Combo order page not found" };

  let raw: unknown;
  try { raw = JSON.parse(String(formData.get("packages") ?? "")); } catch { return { error: "Could not read the packages — reload and try again" }; }
  // Same validation as the landing checkout editor.
  const checkout = normalizeCheckout({ ...l.checkout, packages: { ...(raw as object), enabled: true } });
  if (!checkout.packages.enabled) return { error: "Add at least one package with a name" };

  const productId = Number(formData.get("product")) || l.product_id;
  const product = productId ? await queryOne<{ id: number; price: number; name: string }>("SELECT id, price, name FROM products WHERE id = ?", [productId]) : null;
  if (!product) return { error: "Choose the product" };
  const bad = checkout.packages.items.find((p) => p.price > 0 && p.price > Number(product.price) * p.qty);
  if (bad) return { error: `“${bad.title}” costs more than buying ${bad.qty} separately (৳${Number(product.price) * bad.qty}) — check the price` };

  const live = formData.get("live") === "on";
  const status = live ? "published" : l.status === "published" ? "draft" : l.status;
  await execute("UPDATE landing_pages SET checkout = ?, product_id = ?, status = ? WHERE id = ?",
    [JSON.stringify(checkout), product.id, status, l.id]);
  updateTag(LANDING_TAG);
  updateTag(`landing-${l.slug}`);
  await logActivity({
    actor: { id: admin.id, name: admin.name }, action: "combo.saved", module: "content", entityType: "landing", entityId: l.id,
    description: `Combo order page /${l.slug}: ${checkout.packages.items.map((p) => `${p.title} ${p.price ? `৳${p.price}` : "regular price"}${p.freeDelivery ? " + free delivery" : ""}`).join(", ")}${live ? " · Live" : " · not live"}`,
  });
  return { ok: true, message: live ? "Saved — the combo page is live" : "Saved (not live yet — turn on “Live” to publish)" };
}

/** Creates the combo order page if there is none (normally db:setup does this). */
export async function createCombo() {
  const admin = await adminWith("content.manage");
  if (!admin) return;
  if (await findComboLanding()) redirect("/admin/combo");
  const src = await queryOne<{ product_id: number | null; checkout: string | null; order_prefix: string }>(
    "SELECT product_id, checkout, order_prefix FROM landing_pages WHERE product_id IS NOT NULL ORDER BY id LIMIT 1");
  const product = await queryOne<{ id: number }>(
    "SELECT id FROM products WHERE is_active = 1 AND (name LIKE '%ডেন্টোকেয়ার%' OR name LIKE '%dento%') ORDER BY id LIMIT 1");
  let checkoutRaw: Record<string, unknown> = {};
  try { checkoutRaw = JSON.parse(src?.checkout || "{}"); } catch {}
  const checkout = normalizeCheckout({ ...checkoutRaw, packages: { ...DEFAULT_PACKAGES, enabled: true, defaultId: "p2" } });
  const slug = (await queryOne("SELECT id FROM landing_pages WHERE slug = 'order-now'")) ? `combo-order-${Date.now().toString(36)}` : "order-now";
  const res = await execute(
    `INSERT INTO landing_pages (slug, name, status, product_id, content, checkout, order_prefix, seo_title, created_by)
     VALUES (?, 'Combo Order Page', 'draft', ?, ?, ?, ?, 'অর্ডার করুন — কম্বো অফার', ?)`,
    [slug, product?.id ?? src?.product_id ?? null, JSON.stringify(normalizeContent({ pageType: "order" })), JSON.stringify(checkout), src?.order_prefix || "DC", admin.id],
  );
  await logActivity({ actor: { id: admin.id, name: admin.name }, action: "combo.created", module: "content", entityType: "landing", entityId: res.insertId, description: `Created the combo order page /${slug}` });
  updateTag(LANDING_TAG);
  redirect("/admin/combo");
}
