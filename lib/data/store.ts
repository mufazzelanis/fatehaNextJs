import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { query } from "../db";

export type Product = {
  id: number;
  name: string;
  slug: string;
  weight: string | null;
  price: number;
  regular_price: number | null;
  stock: number;
  image: string | null;
  is_active: number;
};

export type Settings = {
  site_name: string;
  brand_name: string;
  shipping_inside: string;
  shipping_outside: string;
  contact_phone: string;
  whatsapp_number: string;
  duplicate_block_minutes: string;
  announcement: string;
  banner_image: string;
  refund_policy: string;
  privacy_policy: string;
  terms_of_service: string;
};

export const SETTING_KEYS: (keyof Settings)[] = [
  "site_name",
  "brand_name",
  "shipping_inside",
  "shipping_outside",
  "contact_phone",
  "whatsapp_number",
  "duplicate_block_minutes",
  "announcement",
  "banner_image",
  "refund_policy",
  "privacy_policy",
  "terms_of_service",
];

const DEFAULT_SETTINGS: Settings = {
  site_name: "মাশরুম ডেন্টোকেয়ার প্লাস",
  brand_name: "Fateha BD",
  shipping_inside: "50",
  shipping_outside: "100",
  contact_phone: "",
  whatsapp_number: "",
  duplicate_block_minutes: "30",
  announcement: "",
  banner_image: "",
  refund_policy: "",
  privacy_policy: "",
  terms_of_service: "",
};

export const STORE_TAG = "storefront";

export async function getSettings(): Promise<Settings> {
  "use cache";
  cacheTag(STORE_TAG);
  cacheLife("hours");
  const rows = await query<{ key: string; value: string | null }>("SELECT `key`, `value` FROM settings");
  const settings = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    if (row.key in settings) settings[row.key as keyof Settings] = row.value ?? "";
  }
  return settings;
}

export function shippingCharges(settings: Settings) {
  return {
    inside: Number(settings.shipping_inside) || 0,
    outside: Number(settings.shipping_outside) || 0,
  };
}

export function productImageUrl(product: Pick<Product, "image"> | null): string {
  return product?.image ? `/media/${product.image}` : "/product-jar.svg";
}
