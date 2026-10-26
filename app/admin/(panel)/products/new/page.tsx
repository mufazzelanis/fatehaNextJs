import { Suspense } from "react";
import { requirePermission } from "@/lib/auth";
import { PageHeader, PanelSkeleton } from "@/components/admin/ui";
import { ProductEditor } from "../editor";

export const metadata = { title: "New product" };

export default function NewProductPage() {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <NewProduct />
    </Suspense>
  );
}

async function NewProduct() {
  await requirePermission("products.manage");
  return (
    <>
      <PageHeader title="New product" description="Fill in the details — it appears on the store as soon as you create it." />
      <ProductEditor id={null} />
    </>
  );
}
