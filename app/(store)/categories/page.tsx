import type { Metadata } from "next";
import Link from "next/link";
import { getCategories, getShopProducts, mediaUrl } from "@/lib/data/catalog";
import { ArrowRightIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const categories = await getCategories();
  const covers = await Promise.all(categories.map((c) => getShopProducts({ category: c.slug }, 4)));
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-ink sm:text-3xl">All categories</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {categories.map((c, i) => (
          <Link key={c.id} href={`/shop/category/${c.slug}`} className="group overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 transition hover:-translate-y-1 hover:shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-ink">{c.name}</p>
                <p className="text-sm text-slate-500">{c.products} products</p>
              </div>
              <span className="grid size-10 place-items-center rounded-full bg-fb-50 text-fb-600 transition group-hover:bg-fb-500 group-hover:text-white"><ArrowRightIcon className="size-5" /></span>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {covers[i].products.map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p.id} src={mediaUrl(p.image)} alt="" className="aspect-square w-full rounded-xl bg-slate-50 object-contain p-1.5" />
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
