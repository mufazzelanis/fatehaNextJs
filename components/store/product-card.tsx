"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { addToCart, closeDrawer, toggleWish, useWishlist } from "./cart-store";
import { useButtons } from "./store-ui";
import { bdt, discountPercent } from "@/lib/store-config";
import { track } from "@/lib/meta/pixel-client";
import { BagIcon, HeartIcon } from "../icons";

export type CardProduct = {
  id: number; slug: string; name: string; price: number; regular_price: number | null;
  image: string; stock: number; brand: string | null; category_name: string | null;
};

export function quickAdd(p: CardProduct, qty = 1) {
  addToCart({ id: p.id, slug: p.slug, name: p.name, price: p.price, image: p.image, stock: p.stock }, qty);
  track("AddToCart", { content_ids: [String(p.id)], content_name: p.name, content_type: "product", value: p.price * qty, currency: "BDT" },
    { items: [{ id: p.id, qty }] });
}

/** Admin-styled buttons (colours come from CSS variables set by StoreUIProvider). */
export const cartBtn = "bg-(--cart-bg) text-(--cart-fg) rounded-(--btn-radius) ring-1 ring-inset ring-black/5";
export const orderBtn = "bg-(--order-bg) text-(--order-fg) rounded-(--btn-radius) shadow-md shadow-black/10";
const press = "transition duration-200 hover:brightness-95 active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none disabled:ring-0";

/** Add-to-cart + Order-now pair used on every product card. */
export function CardActions({ product: p, onOrder }: { product: CardProduct; onOrder?: () => void }) {
  const b = useButtons();
  const router = useRouter();
  const soldOut = p.stock <= 0;
  const order = () => {
    if (onOrder) return onOrder();
    quickAdd(p);
    closeDrawer();
    router.push("/checkout");
  };

  if (soldOut) {
    return <button type="button" disabled className={`h-10 w-full text-sm font-semibold ${cartBtn} ${press}`}>Out of stock</button>;
  }
  const cartFull = (
    <button type="button" onClick={() => quickAdd(p)} className={`inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 px-2 text-[13px] font-semibold sm:text-sm ${cartBtn} ${press}`}>
      <BagIcon className="size-4 shrink-0" /> <span className="truncate">{b.cart.label}</span>
    </button>
  );
  const orderFull = (
    <button type="button" onClick={order} className={`inline-flex h-10 min-w-0 flex-1 items-center justify-center px-2 text-[13px] font-bold sm:text-sm ${orderBtn} ${press}`}>
      <span className="truncate">{b.order.label}</span>
    </button>
  );

  if (b.layout === "cart-only") return <div className="flex">{cartFull}</div>;
  if (b.layout === "order-only") return <div className="flex">{orderFull}</div>;
  if (b.layout === "both") return <div className="flex flex-col gap-1.5">{cartFull}{orderFull}</div>;
  return (
    <div className="flex gap-1.5">
      <button type="button" onClick={() => quickAdd(p)} aria-label={b.cart.label} title={b.cart.label}
        className={`grid size-10 shrink-0 place-items-center ${cartBtn} ${press}`}>
        <BagIcon className="size-[18px]" />
      </button>
      {orderFull}
    </div>
  );
}

export function ProductCard({ product: p, priority = false }: { product: CardProduct; priority?: boolean }) {
  const wish = useWishlist();
  const wished = wish.some((w) => w.id === p.id);
  const off = discountPercent(p.price, p.regular_price);
  const soldOut = p.stock <= 0;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white transition duration-300 hover:-translate-y-1 hover:border-fb-200 hover:shadow-xl hover:shadow-slate-900/[0.06]">
      <Link href={`/products/${p.slug}`} className="relative block aspect-square overflow-hidden bg-slate-50" aria-label={p.name}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.image} alt={p.name} loading={priority ? "eager" : "lazy"}
          className={`size-full object-contain p-4 mix-blend-multiply transition duration-500 group-hover:scale-105 ${soldOut ? "opacity-50 grayscale" : ""}`} />
        <div className="absolute left-2.5 top-2.5 flex flex-col gap-1">
          {off > 0 && <span className="rounded-md bg-rose-500 px-2 py-0.5 text-[11px] font-bold text-white">-{off}%</span>}
          {soldOut && <span className="rounded-md bg-ink px-2 py-0.5 text-[11px] font-bold text-white">Sold out</span>}
          {!soldOut && p.stock <= 5 && <span className="rounded-md bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white">Only {p.stock} left</span>}
        </div>
      </Link>
      <button type="button" onClick={() => toggleWish({ id: p.id, slug: p.slug, name: p.name, price: p.price, image: p.image })}
        aria-pressed={wished} aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
        className={`absolute right-2.5 top-2.5 grid size-9 place-items-center rounded-full bg-white/95 shadow-sm ring-1 ring-slate-200 transition hover:scale-110 ${wished ? "text-rose-500" : "text-slate-500"}`}>
        <HeartIcon className={`size-[18px] ${wished ? "fill-current" : ""}`} />
      </button>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        {p.brand && <p className="text-[11px] font-semibold uppercase tracking-wider text-fb-600">{p.brand}</p>}
        <Link href={`/products/${p.slug}`} className="mt-1 line-clamp-2 min-h-[2.6em] text-[13.5px] font-medium leading-snug text-ink transition hover:text-fb-700 sm:text-sm">
          {p.name}
        </Link>
        <div className="mb-3 mt-2 flex flex-wrap items-baseline gap-x-2">
          <span className="text-base font-bold text-ink sm:text-lg">{bdt(p.price)}</span>
          {off > 0 && <span className="text-xs text-slate-400 line-through">{bdt(p.regular_price!)}</span>}
        </div>
        <div className="mt-auto"><CardActions product={p} /></div>
      </div>
    </article>
  );
}
