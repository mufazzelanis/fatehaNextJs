"use server";

import { randomBytes } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { execute, queryOne } from "@/lib/db";
import { adminWith, DENIED, requirePermission } from "@/lib/auth";
import { LANDING_TAG, readInvoiceConfig, readLanding, readLandingSettings } from "@/lib/data/landings";
import { DEFAULT_CONTENT } from "@/lib/content";
import { defaultCheckout } from "@/lib/checkout";
import { isOrderPrefix, landingSlugError, LANDING_STATUSES, normalizeLandingSettings, slugifyLanding, type LandingStatus } from "@/lib/landing";
import { normalizeInvoice } from "@/lib/invoice";
import { UPLOAD_DIR, uploadPath } from "@/lib/uploads";
import { diff, logActivity, type Change } from "@/lib/activity";
import type { ActionState } from "@/lib/action-state";

const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

async function saveImage(file: File, prefix: string) {
  const ext = IMAGE_TYPES[file.type];
  if (!ext) throw new ImageError("Use a JPG, PNG or WEBP image");
  if (file.size > 3 * 1024 * 1024) throw new ImageError("Image must be under 3MB");
  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${prefix}-${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
  await writeFile(uploadPath(name), Buffer.from(await file.arrayBuffer()));
  return name;
}
class ImageError extends Error {}

function revalidate(...slugs: (string | null | undefined)[]) {
  updateTag(LANDING_TAG);
  for (const s of new Set(slugs)) if (s) updateTag(`landing-${s}`);
}

async function slugTaken(slug: string, exceptId = 0) {
  return !!(await queryOne("SELECT id FROM landing_pages WHERE slug = ? AND id <> ?", [slug, exceptId]));
}

/** "dentocare" → "dentocare-2" … when taken. */
async function freeSlug(base: string) {
  let slug = base.slice(0, 74);
  for (let i = 2; await slugTaken(slug); i++) slug = `${base.slice(0, 74)}-${i}`;
  return slug;
}

export async function createLanding(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminWith("content.manage");
  if (!admin) return DENIED;
  const name = String(formData.get("name") ?? "").trim().slice(0, 150);
  const slug = slugifyLanding(String(formData.get("slug") ?? "") || name);
  const productId = Number(formData.get("product_id")) || null;
  const from = Number(formData.get("copy_from")) || 0;
  const values = { name, slug, product_id: String(productId ?? ""), copy_from: String(from) };

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = "Give the landing page a name";
  const slugErr = landingSlugError(slug);
  if (slugErr) fieldErrors.slug = slugErr;
  else if (await slugTaken(slug)) fieldErrors.slug = "Another landing page already uses this URL";
  if (!productId || !(await queryOne("SELECT id FROM products WHERE id = ?", [productId]))) fieldErrors.product_id = "Choose the product this page sells";
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  const source = from ? await readLanding(from) : null;
  const settings = await readLandingSettings();
  const res = await execute(
    `INSERT INTO landing_pages (slug, name, status, product_id, content, checkout, banner_image, seo_title, seo_description, order_prefix, footer_name, invoice_name, created_by)
     VALUES (?, ?, 'draft', ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)`,
    [slug, name, productId, JSON.stringify(source?.content ?? DEFAULT_CONTENT), JSON.stringify(source?.checkout ?? defaultCheckout()),
     name, source?.seo_description ?? null, source?.order_prefix ?? settings.defaultPrefix, source?.footer_name ?? null, source?.invoice_name ?? null, admin.id],
  );
  await logActivity({
    actor: admin, action: "landing.created", module: "content", entityType: "landing", entityId: res.insertId,
    description: `Created landing page “${name}” at /${slug}${source ? ` (copied from “${source.name}”)` : ""}`,
  });
  revalidate(slug);
  redirect(`/admin/landings/${res.insertId}?created=1`);
}

export async function duplicateLanding(formData: FormData) {
  const admin = await requirePermission("content.manage");
  const src = await readLanding(Number(formData.get("id")) || 0);
  if (!src) redirect("/admin/landings");
  const slug = await freeSlug(`${src.slug}-copy`);
  const res = await execute(
    `INSERT INTO landing_pages (slug, name, status, product_id, content, checkout, banner_image, seo_title, seo_description, order_prefix, footer_name, invoice_name, created_by)
     VALUES (?, ?, 'draft', ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)`,
    [slug, `${src.name} (copy)`.slice(0, 150), src.product_id, JSON.stringify(src.content), JSON.stringify(src.checkout), src.seo_title, src.seo_description,
     src.order_prefix, src.footer_name, src.invoice_name, admin.id],
  );
  await logActivity({ actor: admin, action: "landing.duplicated", module: "content", entityType: "landing", entityId: res.insertId, description: `Duplicated “${src.name}” as /${slug}` });
  revalidate(slug);
  redirect(`/admin/landings/${res.insertId}?created=1`);
}

export async function setLandingStatus(formData: FormData) {
  const admin = await requirePermission("content.manage");
  const l = await readLanding(Number(formData.get("id")) || 0);
  const status = String(formData.get("status")) as LandingStatus;
  if (!l || !LANDING_STATUSES.includes(status) || l.status === status) return;
  if (status === "published" && !l.product_id) return;
  await execute("UPDATE landing_pages SET status = ? WHERE id = ?", [status, l.id]);
  await logActivity({
    actor: admin, action: `landing.${status}`, module: "content", entityType: "landing", entityId: l.id,
    description: `${status === "published" ? "Published" : status === "draft" ? "Unpublished" : "Archived"} landing page “${l.name}” (/${l.slug})`,
    changes: [{ field: "status", from: l.status, to: status }],
  });
  revalidate(l.slug);
  refresh();
}

export async function deleteLanding(formData: FormData) {
  const admin = await requirePermission("content.manage");
  const l = await readLanding(Number(formData.get("id")) || 0);
  if (!l) redirect("/admin/landings");
  const orders = await queryOne<{ n: number }>("SELECT COUNT(*) AS n FROM orders WHERE landing_id = ?", [l.id]);
  if (Number(orders?.n ?? 0) > 0) {
    // Orders keep pointing at their landing page, so it is archived instead of erased.
    await execute("UPDATE landing_pages SET status = 'archived' WHERE id = ?", [l.id]);
    await logActivity({ actor: admin, action: "landing.archived", module: "content", entityType: "landing", entityId: l.id, description: `Archived landing page “${l.name}” (it has ${orders?.n} orders)` });
  } else {
    await execute("DELETE FROM landing_pages WHERE id = ?", [l.id]);
    if (l.banner_image) await unlink(uploadPath(l.banner_image)).catch(() => {});
    await logActivity({ actor: admin, action: "landing.deleted", module: "content", entityType: "landing", entityId: l.id, description: `Deleted landing page “${l.name}” (/${l.slug})` });
  }
  revalidate(l.slug);
  redirect("/admin/landings");
}

/** Name, URL, status, product, banner, SEO, order prefix, footer & invoice name of one landing page. */
export async function saveLandingSetup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminWith("content.manage");
  if (!admin) return DENIED;
  const l = await readLanding(Number(formData.get("id")) || 0);
  if (!l) return { error: "Landing page not found" };
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const next = {
    name: get("name").slice(0, 150),
    slug: slugifyLanding(get("slug")),
    status: (LANDING_STATUSES as readonly string[]).includes(get("status")) ? (get("status") as LandingStatus) : l.status,
    product_id: Number(get("product_id")) || null,
    seo_title: get("seo_title").slice(0, 200) || null,
    seo_description: get("seo_description").slice(0, 300) || null,
    order_prefix: get("order_prefix").toUpperCase(),
    footer_name: get("footer_name").slice(0, 120) || null,
    invoice_name: get("invoice_name").slice(0, 120) || null,
  };
  const fieldErrors: Record<string, string> = {};
  if (next.name.length < 2) fieldErrors.name = "Give the landing page a name";
  const slugErr = landingSlugError(next.slug);
  if (slugErr) fieldErrors.slug = slugErr;
  else if (await slugTaken(next.slug, l.id)) fieldErrors.slug = "Another landing page already uses this URL";
  if (!next.product_id || !(await queryOne("SELECT id FROM products WHERE id = ?", [next.product_id]))) fieldErrors.product_id = "Choose the product this page sells";
  if (!isOrderPrefix(next.order_prefix)) fieldErrors.order_prefix = "1–5 English capital letters, e.g. DC";
  if (Object.keys(fieldErrors).length) return { error: "Please fix the highlighted fields", fieldErrors };

  let banner = l.banner_image;
  const file = formData.get("banner");
  try {
    if (file instanceof File && file.size > 0) {
      banner = await saveImage(file, "banner");
      if (l.banner_image) await unlink(uploadPath(l.banner_image)).catch(() => {});
    } else if (formData.get("remove_banner") === "on" && l.banner_image) {
      await unlink(uploadPath(l.banner_image)).catch(() => {});
      banner = null;
    }
  } catch (e) {
    if (e instanceof ImageError) return { fieldErrors: { banner: e.message } };
    throw e;
  }

  await execute(
    `UPDATE landing_pages SET name=?, slug=?, status=?, product_id=?, seo_title=?, seo_description=?, order_prefix=?, footer_name=?, invoice_name=?, banner_image=? WHERE id=?`,
    [next.name, next.slug, next.status, next.product_id, next.seo_title, next.seo_description, next.order_prefix, next.footer_name, next.invoice_name, banner, l.id],
  );
  const changes: Change[] = diff(l as unknown as Record<string, unknown>, next,
    ["name", "slug", "status", "product_id", "seo_title", "seo_description", "order_prefix", "footer_name", "invoice_name"]);
  if (banner !== l.banner_image) changes.push({ field: "banner", from: l.banner_image ? "old banner" : "default", to: banner ? "new banner" : "default" });
  if (changes.length) {
    await logActivity({
      actor: admin, action: "landing.updated", module: "content", entityType: "landing", entityId: l.id,
      description: `Updated landing page “${next.name}” (${changes.map((c) => c.field).join(", ")})`, changes,
    });
  }
  revalidate(l.slug, next.slug);
  refresh();
  return { ok: true, message: changes.length ? (next.slug !== l.slug ? `Saved — the page now lives at /${next.slug}` : "Saved") : "Nothing changed" };
}

async function setSetting(key: string, value: string) {
  await execute("INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)", [key, value]);
}

export async function saveGlobalLandingSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminWith("settings.manage");
  if (!admin) return DENIED;
  let parsed: unknown = {};
  try { parsed = JSON.parse(String(formData.get("config") ?? "{}")); } catch { return { error: "Could not read the form" }; }
  const before = await readLandingSettings();
  const next = normalizeLandingSettings(parsed);
  await setSetting("landing_settings", JSON.stringify(next));
  const changes: Change[] = (Object.keys(next) as (keyof typeof next)[])
    .filter((k) => before[k] !== next[k]).map((k) => ({ field: k, from: before[k], to: next[k] }));
  if (changes.length) {
    await logActivity({ actor: admin, action: "landing.settings", module: "settings", description: `Changed landing settings: ${changes.map((c) => c.field).join(", ")}`, changes });
  }
  updateTag(LANDING_TAG);
  refresh();
  return { ok: true, message: changes.length ? "Landing settings saved" : "Nothing changed" };
}

export async function saveInvoiceSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminWith("settings.manage");
  if (!admin) return DENIED;
  let parsed: Record<string, Record<string, unknown>> = {};
  try { parsed = JSON.parse(String(formData.get("config") ?? "{}")); } catch { return { error: "Could not read the form" }; }
  const before = await readInvoiceConfig();
  try {
    for (const k of ["store", "landing"] as const) {
      const file = formData.get(`logo_${k}`);
      if (file instanceof File && file.size > 0) {
        parsed[k] = { ...(parsed[k] ?? {}), logo: await saveImage(file, `invoice-logo-${k}`) };
      }
    }
  } catch (e) {
    if (e instanceof ImageError) return { error: e.message };
    throw e;
  }
  const next = normalizeInvoice(parsed);
  for (const k of ["store", "landing"] as const) {
    const old = before[k].logo;
    if (old && old !== next.store.logo && old !== next.landing.logo) await unlink(uploadPath(old)).catch(() => {});
  }
  await setSetting("invoice_config", JSON.stringify(next));
  const changes: Change[] = [];
  for (const k of ["store", "landing"] as const) {
    for (const f of Object.keys(next[k]) as (keyof typeof next.store)[]) {
      if (before[k][f] !== next[k][f]) changes.push({ field: `${k === "store" ? "Main site" : "Landing"} ${f}`, from: before[k][f], to: next[k][f] });
    }
  }
  if (changes.length) {
    await logActivity({ actor: admin, action: "invoice.settings", module: "settings", description: `Changed invoice design (${changes.length} field${changes.length === 1 ? "" : "s"})`, changes: changes.slice(0, 40) });
  }
  refresh();
  return { ok: true, message: changes.length ? "Invoice design saved" : "Nothing changed" };
}
