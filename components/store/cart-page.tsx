"use client";

import Link from "next/link";
import { removeFromCart, setQty, toggleWish, useCart, useWishlist } from "./cart-store";
import { bdt } from "@/lib/store-config";
import { sized } from "@/lib/media";
import { quickAdd } from "./product-card";
import { ArrowRightIcon, BagIcon, HeartIcon, MinusIcon, PlusIcon, TrashIcon, TruckIcon } from "../icons";

export function CartView({ freeDeliveryOver }: { freeDeliveryOver: number }) {
  const { items, count, subtotal } = useCart();
  const left = freeDeliveryOver > 0 ? Math.max(freeDeliveryOver - subtotal, 0) : 0;

  if (!items.length) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-fb-50 text-fb-700"><BagIcon className="size-8" /></span>
        <p className="mt-4 text-lg font-semibold text-ink">Your cart is empty</p>
        <Link href="/shop" className="mt-6 inline-flex h-12 items-center rounded-xl bg-fb-500 px-6 font-semibold text-white hover:bg-fb-600">Start shopping</Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
      <div className="min-w-0 space-y-3">
        {freeDeliveryOver > 0 && (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 text-sm">
            <p className="flex items-center gap-2 text-ink-soft"><TruckIcon className="size-4 text-fb-700" />
              {left > 0 ? <>Add <strong className="text-ink">{bdt(left)}</strong> more for free delivery</> : <strong className="text-fb-700">Free delivery unlocked!</strong>}
            </p>
            <div className="mt-2 h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-fb-500 transition-all" style={{ width: `${Math.min((subtotal / freeDeliveryOver) * 100, 100)}%` }} /></div>
          </div>
        )}
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl border border-slate-200/80 bg-white">
          {items.map((i) => (
            <li key={i.id} className="flex gap-4 p-4 sm:p-5">
              <Link href={`/products/${i.slug}`} className="shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sized(i.image, 192)} alt="" width={96} height={96} loading="lazy" className="size-20 rounded-2xl bg-slate-50 object-contain p-2 sm:size-24" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <Link href={`/products/${i.slug}`} className="line-clamp-2 font-medium text-ink hover:text-fb-700">{i.name}</Link>
                  <p className="mt-1 text-sm text-slate-600">{bdt(i.price)} each</p>
                  <button type="button" onClick={() => { toggleWish({ id: i.id, slug: i.slug, name: i.name, price: i.price, image: i.image }); removeFromCart(i.id); }}
                    className="mt-1 text-xs font-medium text-slate-600 hover:text-rose-500">Save for later</button>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <div className="flex h-10 items-center rounded-xl border border-slate-200">
                    <button type="button" onClick={() => setQty(i.id, i.qty - 1)} disabled={i.qty <= 1} className="grid size-10 place-items-center disabled:opacity-30" aria-label="Decrease"><MinusIcon className="size-4" /></button>
                    <span className="w-8 text-center font-semibold tabular-nums">{i.qty}</span>
                    <button type="button" onClick={() => setQty(i.id, i.qty + 1)} disabled={i.qty >= Math.min(i.stock, 20)} className="grid size-10 place-items-center disabled:opacity-30" aria-label="Increase"><PlusIcon className="size-4" /></button>
                  </div>
                  <span className="w-24 text-right font-bold tabular-nums text-ink">{bdt(i.price * i.qty)}</span>
                  <button type="button" onClick={() => removeFromCart(i.id)} className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500" aria-label={`Remove ${i.name}`}><TrashIcon className="size-4" /></button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <aside className="lg:sticky lg:top-36 lg:self-start">
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5">
          <p className="text-lg font-bold text-ink">Summary</p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between text-ink-soft"><dt>Items ({count})</dt><dd className="font-semibold text-ink">{bdt(subtotal)}</dd></div>
            <div className="flex justify-between text-ink-soft"><dt>Delivery</dt><dd className="text-slate-400">at checkout</dd></div>
          </dl>
          <div className="mt-4 flex items-center justify-between border-t border-dashed border-slate-200 pt-4">
            <span className="font-bold text-ink">Subtotal</span><span className="text-2xl font-bold text-fb-700">{bdt(subtotal)}</span>
          </div>
          <Link href="/checkout" className="mt-5 flex h-13 items-center justify-center gap-2 rounded-2xl bg-fb-500 py-3.5 font-bold text-white shadow-lg shadow-fb-500/30 hover:bg-fb-600">
            Proceed to checkout <ArrowRightIcon className="size-5" />
          </Link>
          <Link href="/shop" className="mt-3 block text-center text-sm font-medium text-fb-700 hover:underline">Continue shopping</Link>
        </div>
      </aside>
    </div>
  );
}

export function WishlistView() {
  const wish = useWishlist();
  if (!wish.length) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-rose-50 text-rose-500"><HeartIcon className="size-8" /></span>
        <p className="mt-4 text-lg font-semibold text-ink">No saved products yet</p>
        <p className="mt-1 text-sm text-slate-600">Tap the heart on any product to save it here.</p>
        <Link href="/shop" className="mt-6 inline-flex h-12 items-center rounded-xl bg-fb-500 px-6 font-semibold text-white hover:bg-fb-600">Browse products</Link>
      </div>
    );
  }
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {wish.map((w) => (
        <li key={w.id} className="flex gap-4 rounded-2xl border border-slate-200/80 bg-white p-4">
          <Link href={`/products/${w.slug}`} className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sized(w.image, 192)} alt="" width={80} height={80} loading="lazy" className="size-20 rounded-xl bg-slate-50 object-contain p-1.5" />
          </Link>
          <div className="flex min-w-0 flex-1 flex-col">
            <Link href={`/products/${w.slug}`} className="line-clamp-2 text-sm font-medium text-ink hover:text-fb-700">{w.name}</Link>
            <p className="mt-1 font-bold text-ink">{bdt(w.price)}</p>
            <div className="mt-auto flex gap-2 pt-2">
              <button type="button" onClick={() => { quickAdd({ ...w, regular_price: null, stock: 20, brand: null, category_name: null }); toggleWish(w); }}
                className="h-9 flex-1 rounded-lg bg-fb-500 text-sm font-semibold text-white hover:bg-fb-600">Move to cart</button>
              <button type="button" onClick={() => toggleWish(w)} className="grid size-9 place-items-center rounded-lg text-slate-400 ring-1 ring-slate-200 hover:text-rose-500" aria-label="Remove"><TrashIcon className="size-4" /></button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
