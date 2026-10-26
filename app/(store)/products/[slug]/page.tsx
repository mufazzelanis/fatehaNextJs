import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getProductBySlug, getRelatedProducts, getStoreConfig, mediaUrl, safeDescription } from "@/lib/data/catalog";
import { toCard } from "@/lib/card";
import { bdt, discountPercent } from "@/lib/store-config";
import { BuyBox, ProductGallery } from "@/components/store/product-buy";
import { ProductCard } from "@/components/store/product-card";
import { CardSkeleton } from "@/components/store/skeletons";
import { CashIcon, RefreshIcon, ShieldIcon, TruckIcon } from "@/components/icons";

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return {};
  const description = p.short_description ?? `${p.name} — ${bdt(p.price)}. Authentic, with Cash on Delivery across Bangladesh.`;
  return { title: p.name, description, openGraph: { title: p.name, description, images: [mediaUrl(p.image)] } };
}

function ProductSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="aspect-square animate-pulse rounded-3xl bg-white" />
        <div className="space-y-4">
          <div className="h-8 w-3/4 animate-pulse rounded bg-slate-200" />
          <div className="h-10 w-1/3 animate-pulse rounded bg-slate-200" />
          <div className="h-12 animate-pulse rounded-xl bg-slate-200" />
        </div>
      </div>
    </div>
  );
}

export default function ProductPage({ params }: PageProps<"/products/[slug]">) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <Product params={params} />
    </Suspense>
  );
}

async function Product({ params }: Pick<PageProps<"/products/[slug]">, "params">) {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) notFound();
  const cfg = await getStoreConfig();
  const card = toCard(p);
  const off = discountPercent(p.price, p.regular_price);
  const description = safeDescription(p.description);
  const images = p.images.map(mediaUrl);

  // Clean structured data (the old site leaked template code into this block). Google wants absolute URLs.
  const site = (process.env.SITE_URL || "https://fatehabd.com").replace(/\/$/, "");
  const jsonLd = [
    {
      "@context": "https://schema.org", "@type": "Product", name: p.name, image: images.map((i) => `${site}${i}`), sku: p.sku ?? String(p.id),
      ...(p.brand ? { brand: { "@type": "Brand", name: p.brand } } : {}),
      ...(p.short_description ? { description: p.short_description } : {}),
      offers: {
        "@type": "Offer", url: `${site}/products/${p.slug}`, priceCurrency: "BDT", price: p.price.toFixed(2),
        itemCondition: "https://schema.org/NewCondition",
        availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      },
    },
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${site}/` },
        { "@type": "ListItem", position: 2, name: "Shop", item: `${site}/shop` },
        ...(p.category_slug ? [{ "@type": "ListItem", position: 3, name: p.category_name, item: `${site}/shop/category/${p.category_slug}` }] : []),
        { "@type": "ListItem", position: p.category_slug ? 4 : 3, name: p.name, item: `${site}/products/${p.slug}` },
      ],
    },
  ];

  const promises: [typeof CashIcon, string][] = [
    [CashIcon, "Cash on Delivery"],
    [TruckIcon, cfg.deliveryDays],
    [ShieldIcon, "100% authentic product"],
    [RefreshIcon, cfg.returnDays ? `${cfg.returnDays}-day return policy` : "Easy support"],
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-slate-600" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-fb-700">Home</Link><span>/</span>
        <Link href="/shop" className="hover:text-fb-700">Shop</Link>
        {p.category_slug && <><span>/</span><Link href={`/shop/category/${p.category_slug}`} className="hover:text-fb-700">{p.category_name}</Link></>}
      </nav>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-12">
        <ProductGallery images={images} name={p.name} />
        <div className="min-w-0">
          {p.brand && <Link href={`/shop?brand=${encodeURIComponent(p.brand)}`} className="text-xs font-bold uppercase tracking-wider text-fb-700 hover:underline">{p.brand}</Link>}
          <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight text-ink sm:text-3xl">{p.name}</h1>
          <div className="mt-4 flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-bold text-ink sm:text-4xl">{bdt(p.price)}</span>
            {off > 0 && (
              <>
                <span className="text-lg text-slate-400 line-through">{bdt(p.regular_price!)}</span>
                <span className="rounded-lg bg-rose-500 px-2 py-0.5 text-sm font-bold text-white">Save {off}%</span>
              </>
            )}
          </div>
          {p.short_description && <p className="mt-4 leading-relaxed text-ink-soft">{p.short_description}</p>}
          <div className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5">
            <BuyBox product={card} />
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
            {promises.map(([Icon, t]) => (
              <li key={t} className="flex items-center gap-2.5 rounded-xl bg-white px-3 py-2.5 text-ink-soft ring-1 ring-slate-200/80">
                <Icon className="size-5 shrink-0 text-fb-700" /><span className="leading-tight">{t}</span>
              </li>
            ))}
          </ul>
          {p.sku && <p className="mt-4 text-xs text-slate-400">SKU: {p.sku}</p>}
        </div>
      </div>

      <section className="mt-10 rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-8">
        <h2 className="text-lg font-bold text-ink">Description</h2>
        {description ? (
          <div className="prose-store mt-4 text-[15px] leading-relaxed text-ink-soft" dangerouslySetInnerHTML={{ __html: description }} />
        ) : (
          <p className="mt-3 text-sm text-slate-600">{p.name}. Imported and sealed — every unit is checked before dispatch. Need help choosing? Call us any time.</p>
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-bold text-ink">You may also like</h2>
        <Suspense fallback={<div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)}</div>}>
          <Related id={p.id} categoryId={p.category_id} brand={p.brand} />
        </Suspense>
      </section>
    </div>
  );
}

async function Related({ id, categoryId, brand }: { id: number; categoryId: number | null; brand: string | null }) {
  const related = await getRelatedProducts({ id, category_id: categoryId, brand }, 10);
  return (
    <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 md:grid-cols-4 lg:grid-cols-5 [&::-webkit-scrollbar]:hidden">
      {related.map((r) => <div key={r.id} className="w-[46%] shrink-0 snap-start sm:w-auto"><ProductCard product={toCard(r)} /></div>)}
    </div>
  );
}
