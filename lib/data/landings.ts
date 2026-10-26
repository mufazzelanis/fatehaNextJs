import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { query, queryOne } from "../db";
import { normalizeContent, type LandingContent } from "../content";
import { normalizeCheckout, type CheckoutConfig } from "../checkout";
import { normalizeLandingSettings, type LandingSettings, type LandingStatus } from "../landing";
import { normalizeInvoice, type InvoiceConfig } from "../invoice";
import type { Product } from "./store";

export const LANDING_TAG = "landings";

type Row = {
  id: number; slug: string; name: string; status: LandingStatus; product_id: number | null; content: string | null; checkout: string | null;
  banner_image: string | null; seo_title: string | null; seo_description: string | null; order_prefix: string; footer_name: string | null;
  invoice_name: string | null; views: number; created_at: Date; updated_at: Date;
};

export type Landing = Omit<Row, "content" | "checkout"> & { content: LandingContent; checkout: CheckoutConfig };

const parse = (s: string | null) => {
  try { return s ? JSON.parse(s) : {}; } catch { return {}; }
};
const toLanding = (r: Row): Landing => ({ ...r, views: Number(r.views), content: normalizeContent(parse(r.content)), checkout: normalizeCheckout(parse(r.checkout)) });

/** Any status — the page decides whether it may be shown. Cached per slug. */
export async function getLandingBySlug(slug: string): Promise<Landing | null> {
  "use cache";
  cacheTag(LANDING_TAG, `landing-${slug}`);
  cacheLife("hours");
  const r = await queryOne<Row>("SELECT * FROM landing_pages WHERE slug = ?", [slug]);
  return r ? toLanding(r) : null;
}

export async function getLandingById(id: number): Promise<Landing | null> {
  "use cache";
  cacheTag(LANDING_TAG);
  cacheLife("hours");
  return readLanding(id);
}

/** Uncached (admin + order placement). */
export async function readLanding(id: number): Promise<Landing | null> {
  const r = await queryOne<Row>("SELECT * FROM landing_pages WHERE id = ?", [id]);
  return r ? toLanding(r) : null;
}

export async function getLandingProduct(productId: number | null): Promise<Product | null> {
  "use cache";
  cacheTag(LANDING_TAG, "storefront");
  cacheLife("hours");
  if (!productId) return null;
  return queryOne<Product>("SELECT * FROM products WHERE id = ? AND is_active = 1", [productId]);
}

export async function listLandingOptions() {
  return query<{ id: number; name: string; slug: string; status: LandingStatus }>("SELECT id, name, slug, status FROM landing_pages ORDER BY id");
}

export const landingBannerUrl = (l: Pick<Landing, "banner_image">) => (l.banner_image ? `/media/${l.banner_image}` : "/label-banner.svg");

// ───────────── global settings

export async function getLandingSettings(): Promise<LandingSettings> {
  "use cache";
  cacheTag(LANDING_TAG);
  cacheLife("hours");
  return readLandingSettings();
}

export async function readLandingSettings(): Promise<LandingSettings> {
  const rows = await query<{ key: string; value: string | null }>(
    "SELECT `key`, `value` FROM settings WHERE `key` IN ('landing_settings', 'contact_phone', 'whatsapp_number', 'duplicate_block_minutes')",
  );
  const v = Object.fromEntries(rows.map((r) => [r.key, r.value ?? ""]));
  return normalizeLandingSettings(parse(v.landing_settings ?? null), {
    contactPhone: v.contact_phone ?? "", whatsapp: (v.whatsapp_number ?? "").replace(/\D/g, ""),
    duplicateMinutes: v.duplicate_block_minutes ? Number(v.duplicate_block_minutes) : 30,
  });
}

export async function readInvoiceConfig(): Promise<InvoiceConfig> {
  const r = await queryOne<{ value: string | null }>("SELECT `value` FROM settings WHERE `key` = 'invoice_config'");
  return normalizeInvoice(parse(r?.value ?? null));
}
