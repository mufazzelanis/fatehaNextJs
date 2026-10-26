import { Suspense } from "react";
import { requirePermission } from "@/lib/auth";
import { query } from "@/lib/db";
import { mediaUrl } from "@/lib/data/catalog";
import { PageHeader, PanelSkeleton } from "@/components/admin/ui";
import { CategoryManager, type AdminCategory } from "./category-manager";

export const metadata = { title: "Categories" };

export default function CategoriesPage() {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <Categories />
    </Suspense>
  );
}

async function Categories() {
  await requirePermission("products.manage");
  const rows = await query<Omit<AdminCategory, "imageUrl"> & { image: string | null }>(
    `SELECT c.id, c.name, c.slug, c.description, c.image, c.sort_order, c.is_active,
       (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS products,
       (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1 AND p.in_store = 1) AS live
     FROM categories c ORDER BY c.sort_order, c.name`,
  );
  const uncategorised = await query<{ n: number }>("SELECT COUNT(*) AS n FROM products WHERE category_id IS NULL");
  return (
    <>
      <PageHeader title="Categories" description="Organise the shop menu. Lower sort numbers appear first in the header and homepage." />
      <CategoryManager
        categories={rows.map((r) => ({ ...r, products: Number(r.products), live: Number(r.live), imageUrl: r.image ? mediaUrl(r.image) : null }))}
        uncategorised={Number(uncategorised[0]?.n ?? 0)} />
    </>
  );
}
