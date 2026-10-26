"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { addToCart, closeDrawer, toggleWish, useWishlist } from "./cart-store";
import { bdt } from "@/lib/store-config";
import { track } from "@/lib/meta/pixel-client";
import { BagIcon, HeartIcon, MinusIcon, PlusIcon } from "../icons";
import { cartBtn, orderBtn, type CardProduct } from "./product-card";
import { useButtons } from "./store-ui";

/** Image gallery with hover zoom (desktop) and swipeable thumbnails. */
export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const src = images[active] ?? images[0];
  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-3xl border border-slate-200/80 bg-white"
        onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }); }}
        onMouseLeave={() => setZoom(null)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={name} fetchPriority="high"
          className="size-full object-contain p-6 transition-transform duration-200 sm:p-10"
          style={zoom ? { transform: "scale(1.8)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined} />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
          {images.map((img, i) => (
            <button key={img} type="button" onClick={() => setActive(i)} aria-label={`Image ${i + 1}`} aria-pressed={i === active}
              className={`size-20 shrink-0 overflow-hidden rounded-xl border-2 bg-white p-1.5 transition ${i === active ? "border-fb-500" : "border-transparent ring-1 ring-slate-200 hover:ring-fb-300"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="" className="size-full object-contain" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function BuyBox({ product: p }: { product: CardProduct }) {
  const router = useRouter();
  const b = useButtons();
  const [qty, setQty] = useState(1);
  const wish = useWishlist();
  const wished = wish.some((w) => w.id === p.id);
  const soldOut = p.stock <= 0;
  const max = Math.max(Math.min(p.stock, 20), 1);
  const viewed = useRef(false);

  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    track("ViewContent", { content_ids: [String(p.id)], content_name: p.name, content_type: "product", value: p.price, currency: "BDT" }, { items: [{ id: p.id, qty: 1 }] });
  }, [p]);

  const add = (buyNow: boolean) => {
    addToCart({ id: p.id, slug: p.slug, name: p.name, price: p.price, image: p.image, stock: p.stock }, qty);
    track("AddToCart", { content_ids: [String(p.id)], content_name: p.name, content_type: "product", value: p.price * qty, currency: "BDT" }, { items: [{ id: p.id, qty }] });
    if (buyNow) { closeDrawer(); router.push("/checkout"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${soldOut ? "bg-rose-50 text-rose-700" : p.stock <= 5 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
          {soldOut ? "Out of stock" : p.stock <= 5 ? `Only ${p.stock} left` : `In stock (${p.stock} available)`}
        </span>
      </div>
      {!soldOut && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-ink-soft">Quantity</span>
          <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-white">
            <button type="button" onClick={() => setQty((q) => Math.max(q - 1, 1))} disabled={qty <= 1} className="grid size-11 place-items-center text-ink disabled:opacity-30" aria-label="Decrease quantity"><MinusIcon className="size-4" /></button>
            <span className="w-10 text-center font-semibold tabular-nums" aria-live="polite">{qty}</span>
            <button type="button" onClick={() => setQty((q) => Math.min(q + 1, max))} disabled={qty >= max} className="grid size-11 place-items-center text-ink disabled:opacity-30" aria-label="Increase quantity"><PlusIcon className="size-4" /></button>
          </div>
          {qty > 1 && <span className="text-sm text-slate-500">= <strong className="text-ink">{bdt(p.price * qty)}</strong></span>}
        </div>
      )}
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
        <button type="button" disabled={soldOut} onClick={() => add(false)}
          className={`inline-flex h-12 min-w-0 items-center justify-center gap-2 px-2 font-semibold transition hover:brightness-95 active:scale-[0.98] disabled:bg-slate-100 disabled:text-slate-400 ${cartBtn}`}>
          <BagIcon className="size-5 shrink-0" /> <span className="truncate">{b.cart.label}</span>
        </button>
        <button type="button" disabled={soldOut} onClick={() => add(true)}
          className={`inline-flex h-12 min-w-0 items-center justify-center px-2 font-bold transition hover:brightness-95 active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none ${orderBtn}`}>
          <span className="truncate">{b.order.label}</span>
        </button>
        <button type="button" onClick={() => toggleWish({ id: p.id, slug: p.slug, name: p.name, price: p.price, image: p.image })}
          aria-pressed={wished} aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          className={`grid size-12 place-items-center rounded-xl border border-slate-200 transition hover:border-rose-200 ${wished ? "bg-rose-50 text-rose-500" : "bg-white text-slate-500"}`}>
          <HeartIcon className={`size-5 ${wished ? "fill-current" : ""}`} />
        </button>
      </div>
    </div>
  );
}
