import type { Metadata } from "next";
import Link from "next/link";
import { getCategories, getShopProducts, getStoreConfig, mediaUrl } from "@/lib/data/catalog";
import { toCard } from "@/lib/card";
import { HeroSlider } from "@/components/store/hero-slider";
import { ProductCard } from "@/components/store/product-card";
import { ArrowRightIcon, GridIcon } from "@/components/icons";
import { responsive } from "@/lib/media";

// Category tile art is drawn ~82% of a tile that is 42% of a phone screen.
const CATEGORY_SIZES = "(min-width: 1024px) 220px, (min-width: 640px) 28vw, 34vw";
const CATEGORY_SIDE_SIZES = "(min-width: 1024px) 170px, (min-width: 640px) 22vw, 26vw";
// The first tiles are on screen at load (often the largest thing painted) — fetch those right away.
const tileLoading = (k: number) => (k < 3 ? { fetchPriority: "high" as const } : { loading: "lazy" as const, decoding: "async" as const });

export const metadata: Metadata = {
  title: { absolute: "Fatehabd — Authentic baby food & baby care in Bangladesh" },
  description: "Shop authentic imported baby formula and baby skin care — Aptamil, Enfamil, Similac, Nido, Aveeno. Cash on Delivery all over Bangladesh.",
};

const CATEGORY_TINTS = [
  { card: "from-fb-50 to-white ring-fb-100", blob: "bg-fb-200/70", chip: "bg-fb-100 text-fb-800" },
  { card: "from-[#fff3e6] to-white ring-orange-100", blob: "bg-orange-200/70", chip: "bg-orange-100 text-orange-800" },
  { card: "from-rose-50 to-white ring-rose-100", blob: "bg-rose-200/70", chip: "bg-rose-100 text-rose-800" },
  { card: "from-violet-50 to-white ring-violet-100", blob: "bg-violet-200/70", chip: "bg-violet-100 text-violet-800" },
  { card: "from-sky-50 to-white ring-sky-100", blob: "bg-sky-200/70", chip: "bg-sky-100 text-sky-800" },
  { card: "from-emerald-50 to-white ring-emerald-100", blob: "bg-emerald-200/70", chip: "bg-emerald-100 text-emerald-800" },
];

function SectionHead({ title, href, sub }: { title: string; href?: string; sub?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4 sm:mb-5">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">{title}</h2>
        {sub && <p className="mt-0.5 text-sm text-slate-600">{sub}</p>}
      </div>
      {href && <Link href={href} className="flex shrink-0 items-center gap-1 text-sm font-semibold text-fb-700 transition hover:gap-2">View all <ArrowRightIcon className="size-4" /></Link>}
    </div>
  );
}

export default async function HomePage() {
  const [cfg, categories, all] = await Promise.all([getStoreConfig(), getCategories(), getShopProducts({ sort: "popular" }, 60)]);
  const sections = await Promise.all(categories.slice(0, 6).map((c) => getShopProducts({ category: c.slug }, 10).then((r) => ({ c, r }))));
  // Each slide shows products from the category it links to (or the most popular ones).
  const art = cfg.slides.map((slide) => {
    const hit = sections.find((x) => slide.link.includes(`/category/${x.c.slug}`));
    const pool = hit ? hit.r.products : all.products;
    return pool.slice(0, 2).map((p) => mediaUrl(p.image));
  });
  const featured = all.products.filter((p) => p.is_featured);
  const picks = (featured.length >= 4 ? featured : all.products).slice(0, 10);
  const brands = all.brands;

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-5 sm:space-y-14 sm:py-8">
      <HeroSlider slides={cfg.slides} art={art} />

      {/* Categories */}
      <section>
        <SectionHead title="Shop by category" href="/categories" sub={`${categories.length} categories · ${all.total} products`} />
        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
          {categories.map((c, k) => {
            const tint = CATEGORY_TINTS[k % CATEGORY_TINTS.length];
            const covers = sections.find((s) => s.c.id === c.id)?.r.products.slice(0, 3) ?? [];
            const imgs = c.image ? [mediaUrl(c.image)] : covers.map((p) => mediaUrl(p.image));
            return (
              <Link key={c.id} href={`/shop/category/${c.slug}`}
                className={`group relative flex w-[42%] shrink-0 snap-start flex-col overflow-hidden rounded-[20px] bg-linear-to-b p-3 ring-1 ring-inset transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:w-auto sm:p-4 ${tint.card}`}>
                <div className="relative grid aspect-[5/4] place-items-center">
                  <div className={`absolute inset-x-[8%] bottom-0 top-[6%] rounded-full blur-xl ${tint.blob}`} />
                  {imgs.length > 1 ? (
                    <div className="relative size-full">
                      {imgs.slice(0, 3).map((src, j) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={j} {...responsive(src, j ? CATEGORY_SIDE_SIZES : CATEGORY_SIZES, [96, 128, 192, 256, 384])} alt="" {...tileLoading(k)} width={400} height={400} className={`absolute top-1/2 h-[82%] w-auto -translate-y-1/2 object-contain mix-blend-multiply transition duration-500 ${
                          j === 0 ? "left-1/2 z-10 -translate-x-1/2 group-hover:scale-110" : j === 1 ? "left-[2%] h-[64%] -rotate-12 opacity-90 group-hover:-translate-x-1" : "right-[2%] h-[64%] rotate-12 opacity-90 group-hover:translate-x-1"}`} />
                      ))}
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img {...responsive(imgs[0] ?? mediaUrl(null), CATEGORY_SIZES, [96, 128, 192, 256, 384])} alt="" {...tileLoading(k)} width={400} height={400} className="relative h-[85%] w-auto object-contain mix-blend-multiply transition duration-500 group-hover:scale-110" />
                  )}
                </div>
                <p className="mt-2.5 line-clamp-2 min-h-[2.5em] text-[13.5px] font-bold leading-tight text-ink sm:text-base">{c.name}</p>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tint.chip}`}>{c.products} items</span>
                  <span className="grid size-7 place-items-center rounded-full bg-white text-ink shadow-sm transition group-hover:translate-x-0.5 group-hover:bg-ink group-hover:text-white">
                    <ArrowRightIcon className="size-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
          <Link href="/shop"
            className="group relative flex w-[42%] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-[20px] bg-linear-to-br from-ink to-fb-900 p-4 text-white transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:w-auto">
            <div className="absolute -right-8 -top-8 size-28 rounded-full bg-fb-500/40 blur-2xl" />
            <span className="relative grid size-11 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15"><GridIcon className="size-5" /></span>
            <span className="relative mt-6">
              <span className="block text-3xl font-extrabold tracking-tight">{all.total}+</span>
              <span className="mt-0.5 block text-sm font-medium text-white/75">All products</span>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-fb-300 transition group-hover:gap-2">Browse shop <ArrowRightIcon className="size-3.5" /></span>
            </span>
          </Link>
        </div>
      </section>

      {/* Picks */}
      <section>
        <SectionHead title={featured.length >= 4 ? "Featured products" : "Popular right now"} href="/shop" sub="Loved by parents across Bangladesh" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
          {picks.map((p) => <ProductCard key={p.id} product={toCard(p)} />)}
        </div>
      </section>

      {/* COD promise */}
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-r from-ink to-fb-900 px-6 py-8 text-white sm:px-10">
        <div className="absolute -right-16 -top-16 size-64 rounded-full bg-fb-500/30 blur-3xl" />
        <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/cod-badge-sm.webp" alt="Cash on Delivery" loading="lazy" decoding="async" width={256} height={144} className="h-14 w-auto -rotate-3 sm:h-16" />
            <div>
              <p className="text-xl font-bold sm:text-2xl">Order now, pay when it arrives</p>
              <p className="mt-1 text-sm text-white/75">Cash on Delivery everywhere in Bangladesh · bKash · Nagad · Rocket · Bank</p>
            </div>
          </div>
          <Link href="/shop" className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-fb-700 px-6 font-semibold transition hover:bg-fb-600">Start shopping <ArrowRightIcon className="size-4" /></Link>
        </div>
      </section>

      {sections.filter((s) => s.r.products.length).map(({ c, r }) => (
        <section key={c.id} className="cv-auto">
          <SectionHead title={c.name} href={`/shop/category/${c.slug}`} sub={`${c.products} products`} />
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 md:grid-cols-4 lg:grid-cols-5 [&::-webkit-scrollbar]:hidden">
            {r.products.slice(0, 10).map((p) => (
              <div key={p.id} className="w-[46%] shrink-0 snap-start sm:w-auto"><ProductCard product={toCard(p)} /></div>
            ))}
          </div>
        </section>
      ))}

      {brands.length > 1 && (
        <section className="cv-auto">
          <SectionHead title="Shop by brand" />
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {brands.map((b) => (
              <Link key={b.brand} href={`/shop?brand=${encodeURIComponent(b.brand)}`}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:-translate-y-0.5 hover:border-fb-300 hover:text-fb-700 hover:shadow-md">
                {b.brand} <span className="ml-1 text-xs font-normal text-slate-600">{b.n}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
