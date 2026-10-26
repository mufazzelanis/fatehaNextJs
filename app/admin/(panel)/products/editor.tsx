import { notFound } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { StoreProductForm, type EditableProduct } from "./store-product-form";

type Row = {
  id: number; name: string; slug: string; weight: string | null; price: number; regular_price: number | null; stock: number;
  category_id: number | null; brand: string | null; sku: string | null; short_description: string | null; description: string | null;
  image: string | null; images: string | null; is_active: number; in_store: number; is_featured: number;
};

/** Our own <p>…</p> markup back to plain paragraphs; richer HTML is shown as-is. */
function descriptionForEditing(html: string | null) {
  if (!html) return "";
  if (/<(?!\/?(p|br)\b)[a-z]/i.test(html)) return html;
  return html
    .replace(/<\/p>\s*<p>/gi, "\n\n").replace(/<\/?p>/gi, "").replace(/<br\s*\/?>/gi, "\n")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").trim();
}

export async function ProductEditor({ id }: { id: number | null }) {
  const row = id ? await queryOne<Row>("SELECT * FROM products WHERE id = ?", [id]) : null;
  if (id && !row) notFound();
  const [categories, brands, landings, sold] = await Promise.all([
    query<{ id: number; name: string }>("SELECT id, name FROM categories ORDER BY sort_order, name"),
    query<{ brand: string }>("SELECT DISTINCT brand FROM products WHERE brand IS NOT NULL AND brand <> '' ORDER BY brand"),
    id ? query<{ id: number; name: string; slug: string }>("SELECT id, name, slug FROM landing_pages WHERE product_id = ? AND status <> 'archived' ORDER BY id", [id]) : Promise.resolve([]),
    id
      ? queryOne<{ qty: number }>(
          "SELECT COALESCE(SUM(i.quantity),0) AS qty FROM order_items i JOIN orders o ON o.id = i.order_id WHERE i.product_id = ? AND o.status NOT IN ('cancelled','returned')",
          [id],
        )
      : null,
  ]);
  let images: string[] = [];
  try { images = row?.images ? JSON.parse(row.images) : row?.image ? [row.image] : []; } catch {}

  const product: EditableProduct = row
    ? {
        id: row.id, name: row.name, slug: row.slug, weight: row.weight ?? "", price: Number(row.price),
        regular_price: row.regular_price === null ? "" : Number(row.regular_price), stock: row.stock, category_id: row.category_id,
        brand: row.brand ?? "", sku: row.sku ?? "", short_description: row.short_description ?? "",
        description: descriptionForEditing(row.description), images, is_active: !!row.is_active, in_store: !!row.in_store, is_featured: !!row.is_featured,
      }
    : {
        id: null, name: "", slug: "", weight: "", price: "", regular_price: "", stock: "", category_id: categories[0]?.id ?? null,
        brand: "", sku: "", short_description: "", description: "", images: [], is_active: true, in_store: true, is_featured: false,
      };

  return (
    <StoreProductForm product={product} categories={categories} brands={brands.map((b) => b.brand)}
      landings={landings} sold={Number(sold?.qty ?? 0)} />
  );
}
