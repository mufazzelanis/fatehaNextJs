import type { MetadataRoute } from "next";
import { cacheLife } from "next/cache";
import { query } from "@/lib/db";

const SITE = (process.env.SITE_URL || "https://fatehabd.com").replace(/\/$/, "");

/** Shop pages, every visible product and category, and live landing pages. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  "use cache";
  cacheLife("hours");
  const [products, categories, landings] = await Promise.all([
    query<{ slug: string; updated_at: Date }>("SELECT slug, updated_at FROM products WHERE is_active = 1 AND in_store = 1"),
    query<{ slug: string; updated_at: Date }>("SELECT slug, updated_at FROM categories WHERE is_active = 1"),
    query<{ slug: string; updated_at: Date }>("SELECT slug, updated_at FROM landing_pages WHERE status = 'published'"),
  ]).catch(() => [[], [], []] as { slug: string; updated_at: Date }[][]);
  return [
    { url: `${SITE}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE}/categories`, changeFrequency: "weekly", priority: 0.6 },
    ...categories.map((c) => ({ url: `${SITE}/shop/category/${c.slug}`, lastModified: c.updated_at, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...products.map((p) => ({ url: `${SITE}/products/${p.slug}`, lastModified: p.updated_at, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...landings.map((l) => ({ url: `${SITE}/${l.slug}`, lastModified: l.updated_at, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...["faq", "contact", "refund-policy", "privacy-policy", "terms-of-service"].map((p) => ({ url: `${SITE}/${p}`, changeFrequency: "monthly" as const, priority: 0.3 })),
  ];
}
