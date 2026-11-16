import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { query } from "@/lib/db";
import { normalizeBusiness, type BusinessProfile } from "@/lib/business";

export const BUSINESS_TAG = "business";
export const BUSINESS_KEY = "business_profile";

/** Business info for public pages (cached; refreshed when it is saved). */
export async function getBusinessProfile(): Promise<BusinessProfile> {
  "use cache";
  cacheTag(BUSINESS_TAG);
  cacheLife("days");
  return readBusinessProfile();
}

/**
 * Uncached. Until Business Info is saved the first time, it is put together from the older separate
 * settings (main site support phone / email / address / Facebook, landing call & WhatsApp numbers, brand name),
 * so nothing that was already filled in is lost.
 */
export async function readBusinessProfile(): Promise<BusinessProfile> {
  const rows = await query<{ key: string; value: string | null }>(
    "SELECT `key`, `value` FROM settings WHERE `key` IN (?, 'contact_phone', 'whatsapp_number', 'brand_name', 'store_config', 'landing_settings')",
    [BUSINESS_KEY],
  );
  const v = Object.fromEntries(rows.map((r) => [r.key, r.value ?? ""])) as Record<string, string>;
  const json = (s: string | undefined) => { try { return JSON.parse(s || "{}") as Record<string, unknown>; } catch { return {}; } };
  if (v[BUSINESS_KEY]) return normalizeBusiness(json(v[BUSINESS_KEY]));
  const store = json(v.store_config);
  const landing = json(v.landing_settings);
  return normalizeBusiness({
    name: landing.footerName || "Fatehabd",
    phone: store.supportPhone || landing.contactPhone || v.contact_phone,
    whatsapp: landing.whatsapp || v.whatsapp_number,
    email: store.supportEmail,
    address: store.supportAddress,
    facebook: store.facebookUrl,
  });
}
