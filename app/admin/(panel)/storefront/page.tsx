import { Suspense } from "react";
import { requirePermission } from "@/lib/auth";
import { query } from "@/lib/db";
import { getShopProducts, readStoreConfig } from "@/lib/data/catalog";
import { toCard } from "@/lib/card";
import { PageHeader, PanelSkeleton } from "@/components/admin/ui";
import { StorefrontForm } from "./storefront-form";

export const metadata = { title: "Main Site Settings" };

export default function StorefrontPage() {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <Storefront />
    </Suspense>
  );
}

async function Storefront() {
  await requirePermission("content.manage");
  const [config, districts, categories, sample] = await Promise.all([
    readStoreConfig(),
    query<{ id: number; name: string }>("SELECT id, name FROM districts ORDER BY name"),
    query<{ name: string; slug: string }>("SELECT name, slug FROM categories WHERE is_active = 1 ORDER BY sort_order, name"),
    getShopProducts({ sort: "popular" }, 1).then((r) => (r.products[0] ? toCard(r.products[0]) : null)),
  ]);
  return (
    <>
      <PageHeader title="Main Site Settings" description="fatehabd.com shop: homepage banners, product buttons, announcement, delivery charges and contact details. Landing pages have their own settings."
        actions={<a href="/" target="_blank" className="a-btn-outline">Open store ↗</a>} />
      <StorefrontForm config={config} districts={districts} links={[{ name: "All products", slug: "" }, ...categories]} sample={sample} />
    </>
  );
}
