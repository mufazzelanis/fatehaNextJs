import "server-only";
import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import { query, queryOne } from "../db";
import { normalizePayments, type PaymentConfig } from "../payments";
import { normalizeStore, type StoreConfig } from "../store-config";

export const CATALOG_TAG = "catalog";

export type Category = { id: number; name: string; slug: string; description: string | null; image: string | null; sort_order: number; is_active: number; products: number };

export type StoreProduct = {
  id: number;
  name: string;
  slug: string;
  price: number;
  regular_price: number | null;
  stock: number;
  brand: string | null;
  sku: string | null;
  short_description: string | null;
  description: string | null;
  image: string | null;
  images: string[];
  is_featured: number;
  category_id: number | null;
  category_name: string | null;
  category_slug: string | null;
  created_at: Date;
};

type Row = Omit<StoreProduct, "images"> & { images: string | null };

export const mediaUrl = (file: string | null | undefined) => (file ? `/media/${file}` : "/product-jar.svg");

function toProduct(r: Row): StoreProduct {
  let images: string[] = [];
  try {
    const parsed = r.images ? JSON.parse(r.images) : [];
    if (Array.isArray(parsed)) images = parsed.filter((x): x is string => typeof x === "string");
  } catch {}
  if (!images.length && r.image) images = [r.image];
  return { ...r, price: Number(r.price), regular_price: r.regular_price === null ? null : Number(r.regular_price), images };
}

const SELECT = `SELECT p.id, p.name, p.slug, p.price, p.regular_price, p.stock, p.brand, p.sku, p.short_description, p.description,
  p.image, p.images, p.is_featured, p.category_id, p.created_at, c.name AS category_name, c.slug AS category_slug
  FROM products p LEFT JOIN categories c ON c.id = p.category_id`;
const VISIBLE = "p.is_active = 1 AND p.in_store = 1 AND (c.id IS NULL OR c.is_active = 1)";

export async function getCategories(): Promise<Category[]> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("hours");
  const rows = await query<Category>(
    `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1 AND p.in_store = 1) AS products
     FROM categories c WHERE c.is_active = 1 ORDER BY c.sort_order, c.name`,
  );
  return rows.map((r) => ({ ...r, products: Number(r.products) }));
}

export type ShopQuery = { category?: string; q?: string; brand?: string; min?: number; max?: number; sort?: string; page?: number; inStock?: boolean; featured?: boolean };
export type ShopResult = { products: StoreProduct[]; total: number; page: number; pages: number; brands: { brand: string; n: number }[]; priceRange: { min: number; max: number } };

const SORTS: Record<string, string> = {
  newest: "p.created_at DESC, p.id DESC",
  "price-asc": "p.price ASC",
  "price-desc": "p.price DESC",
  name: "p.name ASC",
  popular: "sold DESC, p.sort_order ASC",
};

export async function getShopProducts(q: ShopQuery, perPage = 24): Promise<ShopResult> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("minutes");
  const where = [VISIBLE];
  const params: (string | number)[] = [];
  if (q.category) { where.push("c.slug = ?"); params.push(q.category); }
  if (q.q?.trim()) {
    const words = q.q.trim().split(/\s+/).slice(0, 6);
    for (const w of words) { where.push("(p.name LIKE ? OR p.brand LIKE ? OR c.name LIKE ?)"); params.push(`%${w}%`, `%${w}%`, `%${w}%`); }
  }
  // Brand and price filters don't narrow the brand list / price range themselves.
  const baseWhere = [...where];
  const baseParams = [...params];
  if (q.brand) { where.push("p.brand = ?"); params.push(q.brand); }
  if (q.min && Number.isFinite(q.min)) { where.push("p.price >= ?"); params.push(q.min); }
  if (q.max && Number.isFinite(q.max)) { where.push("p.price <= ?"); params.push(q.max); }
  if (q.inStock) where.push("p.stock > 0");
  if (q.featured) where.push("p.is_featured = 1");
  const sql = where.join(" AND ");
  const page = Math.min(Math.max(Math.trunc(Number(q.page)) || 1, 1), 10000);
  const order = SORTS[q.sort ?? ""] ?? "p.is_featured DESC, p.sort_order ASC, p.id DESC";

  const [rows, total, brands, range] = await Promise.all([
    query<Row & { sold: number }>(
      `${SELECT.replace("FROM products p", ", (SELECT COALESCE(SUM(i.quantity),0) FROM order_items i WHERE i.product_id = p.id) AS sold FROM products p")}
       WHERE ${sql} ORDER BY ${order} LIMIT ? OFFSET ?`,
      [...params, perPage, (page - 1) * perPage],
    ),
    queryOne<{ n: number }>(`SELECT COUNT(*) n FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE ${sql}`, params),
    query<{ brand: string; n: number }>(
      `SELECT p.brand, COUNT(*) n FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE ${baseWhere.join(" AND ")} AND p.brand IS NOT NULL GROUP BY p.brand ORDER BY p.brand`,
      baseParams,
    ),
    queryOne<{ lo: number; hi: number }>(
      `SELECT COALESCE(MIN(p.price),0) lo, COALESCE(MAX(p.price),0) hi FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE ${baseWhere.join(" AND ")}`,
      baseParams,
    ),
  ]);
  const count = Number(total?.n ?? 0);
  return {
    products: rows.map(toProduct),
    total: count,
    page,
    pages: Math.max(Math.ceil(count / perPage), 1),
    brands: brands.map((b) => ({ brand: b.brand, n: Number(b.n) })),
    priceRange: { min: Number(range?.lo ?? 0), max: Number(range?.hi ?? 0) },
  };
}

export async function getProductBySlug(slug: string): Promise<StoreProduct | null> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("minutes");
  const row = await queryOne<Row>(`${SELECT} WHERE p.slug = ? AND ${VISIBLE}`, [slug]);
  return row ? toProduct(row) : null;
}

export async function getRelatedProducts(product: Pick<StoreProduct, "id" | "category_id" | "brand">, limit = 8): Promise<StoreProduct[]> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("hours");
  const rows = await query<Row>(
    `${SELECT} WHERE ${VISIBLE} AND p.id <> ? ORDER BY (p.category_id <=> ?) DESC, (p.brand <=> ?) DESC, p.is_featured DESC, p.id DESC LIMIT ?`,
    [product.id, product.category_id, product.brand, limit],
  );
  return rows.map(toProduct);
}

export async function getProductsByIds(ids: number[]): Promise<StoreProduct[]> {
  const clean = [...new Set(ids.map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 100);
  if (!clean.length) return [];
  const rows = await query<Row>(`${SELECT} WHERE ${VISIBLE} AND p.id IN (${clean.map(() => "?").join(",")})`, clean);
  return rows.map(toProduct);
}

export async function suggestProducts(term: string, limit = 6) {
  const t = term.trim().slice(0, 60);
  if (t.length < 2) return [];
  const rows = await query<Row>(
    `${SELECT} WHERE ${VISIBLE} AND (p.name LIKE ? OR p.brand LIKE ?) ORDER BY (p.name LIKE ?) DESC, p.is_featured DESC LIMIT ?`,
    [`%${t}%`, `%${t}%`, `${t}%`, limit],
  );
  return rows.map(toProduct).map((p) => ({ id: p.id, name: p.name, slug: p.slug, price: p.price, image: mediaUrl(p.image), category: p.category_name }));
}

export async function getStoreConfig(): Promise<StoreConfig> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("hours");
  return readStoreConfig();
}

export async function readStoreConfig(): Promise<StoreConfig> {
  const row = await queryOne<{ value: string | null }>("SELECT `value` FROM settings WHERE `key` = 'store_config'");
  try {
    return normalizeStore(row?.value ? JSON.parse(row.value) : {});
  } catch {
    return normalizeStore({});
  }
}

export async function getPaymentConfig(): Promise<PaymentConfig> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("hours");
  return readPaymentConfig();
}

export async function readPaymentConfig(): Promise<PaymentConfig> {
  const row = await queryOne<{ value: string | null }>("SELECT `value` FROM settings WHERE `key` = 'payment_config'");
  try {
    return normalizePayments(row?.value ? JSON.parse(row.value) : {});
  } catch {
    return normalizePayments({});
  }
}

/** Plain-text-safe description: keeps only simple formatting tags (no attributes, no scripts). */
export function safeDescription(html: string | null): string {
  if (!html) return "";
  const allowed = new Set(["p", "br", "ul", "ol", "li", "strong", "b", "em", "i", "h3", "h4", "table", "thead", "tbody", "tr", "td", "th"]);
  // Allowed tags are swapped for placeholders, everything else is escaped, then the clean tags go back in —
  // so odd markup like <svg/onload=…> or an unclosed "<img" can only ever end up as text.
  const kept: string[] = [];
  const marked = html
    .replace(/<(script|style|iframe|object|embed|noscript|template|svg|math)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<!--[\s\S]*?-->|<![^>]*>/g, "")
    .replace(/<(\/?)([a-z][a-z0-9]*)\b[^>]*>/gi, (_m, close: string, name: string) => {
      const n = name.toLowerCase();
      if (!allowed.has(n)) return "";
      kept.push(`<${close}${n}>`);
      return `\u0001${kept.length - 1}\u0001`;
    });
  return marked
    .replace(/&(?!(?:[a-z]+|#\d+|#x[0-9a-f]+);)/gi, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\u0001(\d+)\u0001/g, (_m, i: string) => kept[Number(i)] ?? "");
}

/** Orders changed stock: refresh cached product/landing data in the background (stale-while-revalidate). */
export function revalidateStock() {
  revalidateTag(CATALOG_TAG, "max");
  revalidateTag("storefront", "max");
}
