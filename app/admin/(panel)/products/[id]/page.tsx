import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { PageHeader, PanelSkeleton } from "@/components/admin/ui";
import { ProductEditor } from "../editor";

export const metadata = { title: "Edit product" };

export default function EditProductPage(props: PageProps<"/admin/products/[id]">) {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <EditProduct {...props} />
    </Suspense>
  );
}

async function EditProduct({ params, searchParams }: PageProps<"/admin/products/[id]">) {
  await requirePermission("products.manage");
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const created = (await searchParams).created === "1";
  const p = await queryOne<{ name: string }>("SELECT name FROM products WHERE id = ?", [id]);
  if (!p) notFound();
  return (
    <>
      <PageHeader title={p.name} description="Edit details, photos, price and stock. Saved changes go live instantly." />
      {created && (
        <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Product created and live on the store.</p>
      )}
      <ProductEditor id={id} />
    </>
  );
}
