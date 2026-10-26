"use server";

import { randomBytes } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { execute, query, queryOne } from "@/lib/db";
import { adminWith, DENIED, requirePermission } from "@/lib/auth";
import { CATALOG_TAG, readPaymentConfig, readStoreConfig } from "@/lib/data/catalog";
import { STORE_TAG } from "@/lib/data/store";
import { normalizePayments, PAYMENT_LABEL, PAYMENT_METHODS } from "@/lib/payments";
import { normalizeStore } from "@/lib/store-config";
import { UPLOAD_DIR, uploadPath } from "@/lib/uploads";
import { diff, logActivity, type Change } from "@/lib/activity";
import type { ActionState } from "@/lib/action-state";

const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_IMAGE = 3 * 1024 * 1024;

async function saveUpload(file: File, prefix: string): Promise<string> {
  const ext = IMAGE_TYPES[file.type];
  if (!ext) throw new UploadError(`“${file.name}” isn't a JPG, PNG or WEBP image`);
  if (file.size > MAX_IMAGE) throw new UploadError(`“${file.name}” is larger than 3MB`);
  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${prefix}-${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
  await writeFile(uploadPath(name), Buffer.from(await file.arrayBuffer()));
  return name;
}
class UploadError extends Error {}

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 150);

/** Plain text with blank lines becomes paragraphs; HTML is kept (it is sanitised when shown). */
function toDescription(text: string): string | null {
  const t = text.trim().slice(0, 20000);
  if (!t) return null;
  if (/<\/?(p|ul|ol|li|strong|b|br|h3|h4|table)\b/i.test(t)) return t;
  return t.split(/\n{2,}/).map((p) => `<p>${p.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>")}</p>`).join("");
}

function revalidateStore() {
  updateTag(CATALOG_TAG);
  updateTag(STORE_TAG);
}

type ProductRow = {
  id: number; name: string; slug: string; weight: string | null; price: number; regular_price: number | null; stock: number;
  image: string | null; images: string | null; category_id: number | null; brand: string | null; sku: string | null;
  short_description: string | null; description: string | null; is_active: number; in_store: number; is_featured: number;
};

export async function saveStoreProduct(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminWith("products.manage");
  if (!admin) return DENIED;
  const id = Number(formData.get("id")) || null;
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const name = get("name").slice(0, 200);
  const slug = slugify(get("slug") || name);
  const price = Number(get("price"));
  const regularRaw = get("regular_price");
  const regular = regularRaw ? Number(regularRaw) : null;
  const stock = Math.trunc(Number(get("stock")));
  const categoryId = Number(get("category_id")) || null;
  const values = {
    name, slug, price, regular_price: regular, stock, category_id: categoryId,
    weight: get("weight").slice(0, 50) || null, brand: get("brand").slice(0, 80) || null, sku: get("sku").slice(0, 60) || null,
    short_description: get("short_description").slice(0, 500) || null, description: toDescription(get("description")),
    is_active: formData.get("is_active") === "on" ? 1 : 0, in_store: formData.get("in_store") === "on" ? 1 : 0,
    is_featured: formData.get("is_featured") === "on" ? 1 : 0,
  };

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = "Product name is required";
  if (!slug) fieldErrors.slug = "Enter a URL slug";
  else if (await queryOne("SELECT id FROM products WHERE slug = ? AND id <> ?", [slug, id ?? 0])) fieldErrors.slug = "Another product already uses this URL";
  if (!(price > 0)) fieldErrors.price = "Price must be greater than 0";
  if (regular !== null && !(regular >= 0)) fieldErrors.regular_price = "Invalid regular price";
  if (!Number.isFinite(stock) || stock < 0) fieldErrors.stock = "Stock can't be negative";
  if (categoryId && !(await queryOne("SELECT id FROM categories WHERE id = ?", [categoryId]))) fieldErrors.category_id = "Choose a category";
  if (Object.keys(fieldErrors).length) return { error: "Please fix the highlighted fields", fieldErrors };

  const existing = id ? await queryOne<ProductRow>("SELECT * FROM products WHERE id = ?", [id]) : null;
  if (id && !existing) return { error: "Product not found" };

  // Images: the editor sends the final order as tokens — an existing filename, or "new:N" for the N-th uploaded file.
  let order: string[] = [];
  try {
    const parsed = JSON.parse(get("images_order") || "[]");
    if (Array.isArray(parsed)) order = parsed.filter((x): x is string => typeof x === "string" && /^(new:\d+|[\w.-]+)$/.test(x));
  } catch {}
  let before: string[] = [];
  try { before = existing?.images ? JSON.parse(existing.images) : existing?.image ? [existing.image] : []; } catch {}
  const added: string[] = [];
  try {
    for (const file of formData.getAll("new_images")) {
      if (file instanceof File && file.size > 0) added.push(await saveUpload(file, `p-${slug}`.slice(0, 60)));
    }
  } catch (e) {
    for (const f of added) await unlink(uploadPath(f)).catch(() => {});
    if (e instanceof UploadError) return { error: e.message, fieldErrors: { images: e.message } };
    throw e;
  }
  const used = new Set<string>();
  const images: string[] = [];
  for (const t of order) {
    const f = t.startsWith("new:") ? added[Number(t.slice(4))] : before.includes(t) ? t : undefined;
    if (f && !used.has(f)) { used.add(f); images.push(f); }
  }
  for (const f of added) if (!used.has(f)) images.push(f); // uploads the order didn't mention go last
  images.splice(12);
  for (const f of added.filter((f) => !images.includes(f))) await unlink(uploadPath(f)).catch(() => {});
  for (const f of before.filter((f) => !images.includes(f))) await unlink(uploadPath(f)).catch(() => {});

  const cols = { ...values, image: images[0] ?? null, images: JSON.stringify(images) };
  let productId = id;
  if (existing) {
    await execute(
      `UPDATE products SET name=?, slug=?, price=?, regular_price=?, stock=?, category_id=?, weight=?, brand=?, sku=?, short_description=?,
         description=?, is_active=?, in_store=?, is_featured=?, image=?, images=? WHERE id=?`,
      [cols.name, cols.slug, cols.price, cols.regular_price, cols.stock, cols.category_id, cols.weight, cols.brand, cols.sku,
       cols.short_description, cols.description, cols.is_active, cols.in_store, cols.is_featured, cols.image, cols.images, id],
    );
  } else {
    const res = await execute(
      `INSERT INTO products (name, slug, price, regular_price, stock, category_id, weight, brand, sku, short_description, description,
         is_active, in_store, is_featured, image, images) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [cols.name, cols.slug, cols.price, cols.regular_price, cols.stock, cols.category_id, cols.weight, cols.brand, cols.sku,
       cols.short_description, cols.description, cols.is_active, cols.in_store, cols.is_featured, cols.image, cols.images],
    );
    productId = res.insertId;
  }

  const changes: Change[] = existing
    ? diff(existing as unknown as Record<string, unknown>, values, ["name", "slug", "price", "regular_price", "stock", "category_id", "brand", "sku", "is_active", "in_store", "is_featured"])
    : [];
  if (added.length) changes.push({ field: "images", from: `${before.length}`, to: `${images.length} (${added.length} new)` });
  else if (existing && JSON.stringify(before) !== JSON.stringify(images)) changes.push({ field: "images", from: `${before.length}`, to: `${images.length} (reordered/removed)` });
  if (existing && (existing.description ?? "") !== (values.description ?? "")) changes.push({ field: "description", from: "…", to: "updated" });
  if (!existing || changes.length) {
    await logActivity({
      actor: admin, action: existing ? "product.updated" : "product.created", module: "products", entityType: "product", entityId: productId!,
      description: existing ? `Updated product “${name}” (${changes.map((c) => c.field).join(", ")})` : `Added product “${name}” at ৳${price}`,
      changes,
    });
  }
  revalidateStore();
  if (!existing) redirect(`/admin/products/${productId}?created=1`);
  refresh();
  return { ok: true, message: changes.length ? "Product saved — live on the store" : "Nothing changed" };
}

export async function deleteStoreProduct(formData: FormData) {
  const admin = await requirePermission("products.manage");
  const id = Number(formData.get("id"));
  const p = await queryOne<ProductRow & { orders: number }>(
    "SELECT p.*, (SELECT COUNT(*) FROM order_items i WHERE i.product_id = p.id) + (SELECT COUNT(*) FROM landing_pages l WHERE l.product_id = p.id) AS orders FROM products p WHERE p.id = ?",
    [id],
  );
  if (!p) redirect("/admin/products");
  if (Number(p.orders) > 0) {
    // Keep order history intact: hide instead of deleting.
    await execute("UPDATE products SET is_active = 0, in_store = 0 WHERE id = ?", [id]);
    await logActivity({ actor: admin, action: "product.archived", module: "products", entityType: "product", entityId: id, description: `Archived “${p.name}” (it has orders or is used by a landing page)` });
  } else {
    let files: string[] = [];
    try { files = p.images ? JSON.parse(p.images) : p.image ? [p.image] : []; } catch {}
    await execute("DELETE FROM products WHERE id = ?", [id]);
    for (const f of files) await unlink(uploadPath(f)).catch(() => {});
    await logActivity({ actor: admin, action: "product.deleted", module: "products", entityType: "product", entityId: id, description: `Deleted product “${p.name}”` });
  }
  revalidateStore();
  redirect("/admin/products");
}

export async function saveCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminWith("products.manage");
  if (!admin) return DENIED;
  const id = Number(formData.get("id")) || null;
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const slug = slugify(String(formData.get("slug") ?? "") || name);
  const description = String(formData.get("description") ?? "").trim().slice(0, 500) || null;
  const sort = Math.trunc(Number(formData.get("sort_order")) || 0);
  const active = formData.get("is_active") === "on" ? 1 : 0;
  if (name.length < 2) return { fieldErrors: { name: "Category name is required" } };
  if (await queryOne("SELECT id FROM categories WHERE slug = ? AND id <> ?", [slug, id ?? 0])) return { fieldErrors: { slug: "This URL is already used" } };

  const existing = id ? await queryOne<{ name: string; slug: string; image: string | null; is_active: number; sort_order: number }>("SELECT * FROM categories WHERE id = ?", [id]) : null;
  let image = existing?.image ?? null;
  const file = formData.get("image");
  try {
    if (file instanceof File && file.size > 0) {
      const saved = await saveUpload(file, `c-${slug}`.slice(0, 50));
      if (image) await unlink(uploadPath(image)).catch(() => {});
      image = saved;
    }
  } catch (e) {
    if (e instanceof UploadError) return { fieldErrors: { image: e.message } };
    throw e;
  }
  if (existing) {
    await execute("UPDATE categories SET name=?, slug=?, description=?, sort_order=?, is_active=?, image=? WHERE id=?", [name, slug, description, sort, active, image, id]);
  } else {
    await execute("INSERT INTO categories (name, slug, description, sort_order, is_active, image) VALUES (?,?,?,?,?,?)", [name, slug, description, sort, active, image]);
  }
  const changes = existing ? diff(existing as unknown as Record<string, unknown>, { name, slug, sort_order: sort, is_active: active }, ["name", "slug", "sort_order", "is_active"]) : [];
  await logActivity({
    actor: admin, action: existing ? "category.updated" : "category.created", module: "products", entityType: "category", entityId: id ?? undefined,
    description: existing ? `Updated category “${name}”` : `Added category “${name}”`, changes,
  });
  revalidateStore();
  refresh();
  return { ok: true, message: existing ? "Category saved" : `Category “${name}” added` };
}

export async function deleteCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminWith("products.manage");
  if (!admin) return DENIED;
  const id = Number(formData.get("id"));
  const c = await queryOne<{ name: string; image: string | null; n: number }>(
    "SELECT c.name, c.image, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS n FROM categories c WHERE c.id = ?",
    [id],
  );
  if (!c) return { error: "Category not found" };
  if (Number(c.n) > 0) return { error: `Move its ${c.n} product(s) to another category first` };
  await execute("DELETE FROM categories WHERE id = ?", [id]);
  if (c.image) await unlink(uploadPath(c.image)).catch(() => {});
  await logActivity({ actor: admin, action: "category.deleted", module: "products", entityType: "category", entityId: id, description: `Deleted category “${c.name}”` });
  revalidateStore();
  refresh();
  return { ok: true, message: "Category deleted" };
}

async function setSetting(key: string, value: string) {
  await execute("INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)", [key, value]);
}

export async function savePayments(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminWith("settings.manage");
  if (!admin) return DENIED;
  let parsed: unknown = {};
  try { parsed = JSON.parse(String(formData.get("config") ?? "{}")); } catch { return { error: "Could not read the form" }; }
  const before = await readPaymentConfig();
  const next = normalizePayments(parsed);
  const changes: Change[] = [];
  for (const m of PAYMENT_METHODS) {
    const a = before[m] as Record<string, unknown>;
    const b = next[m] as Record<string, unknown>;
    for (const k of Object.keys(b)) {
      if (String(a[k] ?? "") !== String(b[k] ?? "")) changes.push({ field: `${PAYMENT_LABEL[m]} ${k}`, from: a[k] as string, to: b[k] as string });
    }
  }
  const asked = (parsed as Record<string, { enabled?: boolean }>) ?? {};
  const blocked = (["bkash", "nagad", "rocket", "bank"] as const).filter((m) => asked[m]?.enabled && !next[m].enabled);
  await setSetting("payment_config", JSON.stringify(next));
  if (changes.length) {
    await logActivity({ actor: admin, action: "payments.updated", module: "settings", description: `Changed payment methods: ${[...new Set(changes.map((c) => c.field.split(" ")[0]))].join(", ")}`, changes });
  }
  revalidateStore();
  refresh();
  if (blocked.length) return { error: `${blocked.map((m) => PAYMENT_LABEL[m]).join(", ")} can't be turned on without a valid number/account. Other changes were saved.` };
  return { ok: true, message: "Payment methods saved — checkout is updated" };
}

export async function saveStorefront(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminWith("content.manage");
  if (!admin) return DENIED;
  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(String(formData.get("config") ?? "{}")); } catch { return { error: "Could not read the form" }; }
  const before = await readStoreConfig();
  // Slide images: "slide_image_N" uploads replace the image of slide N.
  const slides = Array.isArray(parsed.slides) ? (parsed.slides as Record<string, unknown>[]) : [];
  try {
    for (const [i, slide] of slides.entries()) {
      const file = formData.get(`slide_image_${i}`);
      if (file instanceof File && file.size > 0) slide.image = await saveUpload(file, "slide");
    }
  } catch (e) {
    if (e instanceof UploadError) return { error: e.message };
    throw e;
  }
  const next = normalizeStore(parsed);
  const oldImages = before.slides.map((s) => s.image).filter(Boolean);
  for (const f of oldImages.filter((f) => !next.slides.some((s) => s.image === f))) await unlink(uploadPath(f)).catch(() => {});
  await setSetting("store_config", JSON.stringify(next));
  const changes: Change[] = [];
  for (const k of Object.keys(next) as (keyof typeof next)[]) {
    const a = JSON.stringify(before[k]);
    const b = JSON.stringify(next[k]);
    if (a !== b) changes.push({ field: k, from: a.length > 100 ? `${a.slice(0, 97)}…` : a, to: b.length > 100 ? `${b.slice(0, 97)}…` : b });
  }
  if (changes.length) await logActivity({ actor: admin, action: "storefront.updated", module: "content", description: `Changed storefront: ${changes.map((c) => c.field).join(", ")}`, changes });
  revalidateStore();
  refresh();
  return { ok: true, message: "Storefront saved — live now" };
}

export async function setPaymentStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminWith("orders.edit");
  if (!admin) return DENIED;
  const id = Number(formData.get("id"));
  const status = String(formData.get("payment_status") ?? "");
  if (!["unpaid", "pending_verification", "paid", "refunded"].includes(status)) return { error: "Invalid payment status" };
  const order = await queryOne<{ order_no: string; payment_status: string; payment_method: string; payment_trx: string | null }>(
    "SELECT order_no, payment_status, payment_method, payment_trx FROM orders WHERE id = ?",
    [id],
  );
  if (!order) return { error: "Order not found" };
  if (order.payment_status === status) return { ok: true, message: "Nothing changed" };
  await execute("UPDATE orders SET payment_status = ? WHERE id = ?", [status, id]);
  await execute("INSERT INTO order_status_history (order_id, status, note, changed_by) SELECT id, status, ?, ? FROM orders WHERE id = ?", [
    `Payment ${status.replace("_", " ")}${order.payment_trx ? ` (TrxID ${order.payment_trx})` : ""}`, admin.id, id,
  ]);
  await logActivity({
    actor: admin, action: "order.payment", module: "orders", entityType: "order", entityId: id,
    description: `Order #${order.order_no}: payment ${order.payment_status} → ${status}`,
    changes: [{ field: "payment_status", from: order.payment_status, to: status }],
  });
  refresh();
  return { ok: true, message: "Payment status updated" };
}

/** Quick toggle from the products list. */
export async function toggleProductFlag(formData: FormData) {
  const admin = await requirePermission("products.manage");
  const id = Number(formData.get("id"));
  const flag = String(formData.get("flag"));
  if (!["is_active", "is_featured", "in_store"].includes(flag)) return;
  const row = await queryOne<Record<string, number> & { name: string }>(`SELECT name, ${flag} AS v FROM products WHERE id = ?`, [id]);
  if (!row) return;
  await execute(`UPDATE products SET ${flag} = ? WHERE id = ?`, [row.v ? 0 : 1, id]);
  await logActivity({ actor: admin, action: "product.updated", module: "products", entityType: "product", entityId: id, description: `${row.v ? "Turned off" : "Turned on"} ${flag.replace("is_", "").replace("_", " ")} for “${row.name}”`, changes: [{ field: flag, from: row.v, to: row.v ? 0 : 1 }] });
  revalidateStore();
  refresh();
}

export async function listAllCategories() {
  await requirePermission("products.manage");
  return query<{ id: number; name: string }>("SELECT id, name FROM categories ORDER BY sort_order, name");
}
