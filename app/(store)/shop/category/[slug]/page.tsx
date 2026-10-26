import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCategories } from "@/lib/data/catalog";
import { ShopView } from "@/components/store/shop-view";
import { ShopSkeleton } from "@/components/store/skeletons";

export async function generateMetadata({ params }: PageProps<"/shop/category/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const c = (await getCategories()).find((x) => x.slug === slug);
  return c ? { title: c.name, description: c.description ?? `Shop ${c.name} at Fatehabd — authentic, with Cash on Delivery.` } : {};
}

export default function CategoryPage({ params, searchParams }: PageProps<"/shop/category/[slug]">) {
  return (
    <Suspense fallback={<ShopSkeleton />}>
      <Category params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Category({ params, searchParams }: Pick<PageProps<"/shop/category/[slug]">, "params" | "searchParams">) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  if (!(await getCategories()).some((c) => c.slug === slug)) notFound();
  return <ShopView params={sp} categorySlug={slug} />;
}
