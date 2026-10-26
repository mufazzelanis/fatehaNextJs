import Link from "next/link";
import { getCategories, getShopProducts, type ShopQuery } from "@/lib/data/catalog";
import { toCard } from "@/lib/card";
import { ProductCard } from "./product-card";
import { ShopFilters, SortSelect } from "./shop-filters";
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from "../icons";

type Params = Record<string, string | string[] | undefined>;
const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

export async function ShopView({ params, categorySlug }: { params: Params; categorySlug?: string }) {
  const query: ShopQuery = {
    category: categorySlug,
    q: str(params.q).slice(0, 80),
    brand: str(params.brand).slice(0, 60),
    min: Number(str(params.min)) || undefined,
    max: Number(str(params.max)) || undefined,
    sort: str(params.sort),
    page: Number(str(params.page)) || 1,
    inStock: str(params.stock) === "1",
  };
  const [result, categories] = await Promise.all([getShopProducts(query), getCategories()]);
  const category = categories.find((c) => c.slug === categorySlug);
  const base = categorySlug ? `/shop/category/${categorySlug}` : "/shop";
  const href = (over: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const merged: Record<string, string | number | undefined> = { q: query.q, brand: query.brand, min: query.min, max: query.max, sort: query.sort, stock: query.inStock ? "1" : "", ...over };
    for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== "" && !(k === "page" && v === 1)) p.set(k, String(v));
    const s = p.toString();
    return `${base}${s ? `?${s}` : ""}`;
  };
  const title = query.q ? `Results for “${query.q}”` : category?.name ?? "All products";
  const active = [query.brand && "brand", query.min && "min", query.max && "max", query.inStock && "stock"].filter(Boolean).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:py-8">
      <nav className="mb-4 flex items-center gap-1.5 text-xs text-slate-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-fb-700">Home</Link><span>/</span>
        <Link href="/shop" className="hover:text-fb-700">Shop</Link>
        {category && <><span>/</span><span className="text-ink">{category.name}</span></>}
      </nav>

      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{result.total} product{result.total === 1 ? "" : "s"}</p>
        </div>
        <div className="flex items-center gap-2">
          <ShopFilters mobile base={base} categories={categories.map((c) => ({ name: c.name, slug: c.slug, n: c.products }))} current={query} brands={result.brands} range={result.priceRange} active={active} />
          <SortSelect value={query.sort ?? ""} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[250px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-36">
            <ShopFilters base={base} categories={categories.map((c) => ({ name: c.name, slug: c.slug, n: c.products }))} current={query} brands={result.brands} range={result.priceRange} active={active} />
          </div>
        </aside>
        <div className="min-w-0">
          {result.products.length === 0 ? (
            <div className="grid place-items-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <span className="grid size-14 place-items-center rounded-2xl bg-fb-50 text-fb-600"><SearchIcon className="size-7" /></span>
              <p className="mt-4 font-semibold text-ink">No products match</p>
              <p className="mt-1 text-sm text-slate-500">Try a different search or clear the filters.</p>
              <Link href={base} className="mt-5 inline-flex h-11 items-center rounded-xl bg-fb-500 px-5 font-semibold text-white hover:bg-fb-600">Clear filters</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {result.products.map((p, k) => <ProductCard key={p.id} product={toCard(p)} priority={k < 4} />)}
            </div>
          )}
          {result.pages > 1 && (
            <nav className="mt-8 flex items-center justify-center gap-1" aria-label="Pagination">
              <Link href={href({ page: Math.max(result.page - 1, 1) })} aria-disabled={result.page === 1}
                className={`grid size-10 place-items-center rounded-xl border border-slate-200 bg-white ${result.page === 1 ? "pointer-events-none opacity-40" : "hover:border-fb-300"}`} aria-label="Previous page"><ChevronLeftIcon className="size-4" /></Link>
              {Array.from({ length: result.pages }, (_, k) => k + 1).filter((n) => n === 1 || n === result.pages || Math.abs(n - result.page) <= 1).map((n, k, arr) => (
                <span key={n} className="flex items-center gap-1">
                  {k > 0 && n - arr[k - 1] > 1 && <span className="px-1 text-slate-400">…</span>}
                  <Link href={href({ page: n })} aria-current={n === result.page ? "page" : undefined}
                    className={`grid size-10 place-items-center rounded-xl text-sm font-semibold ${n === result.page ? "bg-fb-500 text-white" : "border border-slate-200 bg-white text-ink hover:border-fb-300"}`}>{n}</Link>
                </span>
              ))}
              <Link href={href({ page: Math.min(result.page + 1, result.pages) })} aria-disabled={result.page === result.pages}
                className={`grid size-10 place-items-center rounded-xl border border-slate-200 bg-white ${result.page === result.pages ? "pointer-events-none opacity-40" : "hover:border-fb-300"}`} aria-label="Next page"><ChevronRightIcon className="size-4" /></Link>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
