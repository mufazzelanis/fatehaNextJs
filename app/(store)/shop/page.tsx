import type { Metadata } from "next";
import { Suspense } from "react";
import { ShopView } from "@/components/store/shop-view";
import { ShopSkeleton } from "@/components/store/skeletons";

export const metadata: Metadata = { title: "Shop all products", description: "Authentic imported baby food and baby care with Cash on Delivery across Bangladesh." };

export default function ShopPage({ searchParams }: PageProps<"/shop">) {
  return (
    <Suspense fallback={<ShopSkeleton />}>
      <Shop searchParams={searchParams} />
    </Suspense>
  );
}

async function Shop({ searchParams }: Pick<PageProps<"/shop">, "searchParams">) {
  return <ShopView params={await searchParams} />;
}
