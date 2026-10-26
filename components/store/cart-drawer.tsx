"use client";

import Link from "next/link";
import { useEffect } from "react";
import { closeDrawer, removeFromCart, setQty, useCart, useDrawer } from "./cart-store";
import { bdt } from "@/lib/store-config";
import { BagIcon, MinusIcon, PlusIcon, TrashIcon, TruckIcon, XIcon } from "../icons";

export function CartDrawer({ freeDeliveryOver }: { freeDeliveryOver: number }) {
  const open = useDrawer();
  const { items, count, subtotal } = useCart();
  const left = freeDeliveryOver > 0 ? Math.max(freeDeliveryOver - subtotal, 0) : 0;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeDrawer(); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div className={`fixed inset-0 z-[60] ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div onClick={closeDrawer} className={`absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`} />
      <aside role="dialog" aria-modal="true" aria-label="Shopping cart"
        className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <p className="text-lg font-semibold text-ink">Your cart <span className="text-sm font-normal text-slate-400">({count})</span></p>
          <button type="button" onClick={closeDrawer} className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Close cart">
            <XIcon className="size-5" />
          </button>
        </div>

        {freeDeliveryOver > 0 && items.length > 0 && (
          <div className="border-b border-slate-100 px-5 py-3 text-sm">
            <p className="flex items-center gap-2 text-ink-soft">
              <TruckIcon className="size-4 text-fb-600" />
              {left > 0 ? <>Add <strong className="text-ink">{bdt(left)}</strong> more for free delivery</> : <strong className="text-fb-700">You&apos;ve unlocked free delivery!</strong>}
            </p>
            <div className="mt-2 h-1.5 rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-fb-500 transition-all duration-500" style={{ width: `${Math.min((subtotal / freeDeliveryOver) * 100, 100)}%` }} />
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <div className="grid flex-1 place-items-center p-8 text-center">
            <div>
              <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-fb-50 text-fb-600"><BagIcon className="size-8" /></span>
              <p className="mt-4 font-semibold text-ink">Your cart is empty</p>
              <p className="mt-1 text-sm text-slate-500">Find something your little one will love.</p>
              <Link href="/shop" onClick={closeDrawer} className="mt-5 inline-flex h-11 items-center rounded-xl bg-fb-500 px-6 font-semibold text-white hover:bg-fb-600">Start shopping</Link>
            </div>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto px-5">
              {items.map((i) => (
                <li key={i.id} className="flex gap-3 py-4">
                  <Link href={`/products/${i.slug}`} onClick={closeDrawer} className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={i.image} alt="" className="size-20 rounded-xl bg-slate-50 object-contain p-1.5" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link href={`/products/${i.slug}`} onClick={closeDrawer} className="line-clamp-2 text-sm font-medium text-ink hover:text-fb-700">{i.name}</Link>
                    <p className="mt-1 text-sm font-semibold text-ink">{bdt(i.price)}</p>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="flex items-center rounded-lg border border-slate-200">
                        <button type="button" onClick={() => setQty(i.id, i.qty - 1)} disabled={i.qty <= 1} className="grid size-8 place-items-center text-slate-600 disabled:opacity-30" aria-label="Decrease"><MinusIcon className="size-3.5" /></button>
                        <span className="w-8 text-center text-sm font-semibold tabular-nums">{i.qty}</span>
                        <button type="button" onClick={() => setQty(i.id, i.qty + 1)} disabled={i.qty >= Math.min(i.stock, 20)} className="grid size-8 place-items-center text-slate-600 disabled:opacity-30" aria-label="Increase"><PlusIcon className="size-3.5" /></button>
                      </div>
                      <button type="button" onClick={() => removeFromCart(i.id)} className="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-500" aria-label={`Remove ${i.name}`}>
                        <TrashIcon className="size-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-slate-100 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
              <div className="flex justify-between text-sm text-ink-soft"><span>Subtotal</span><span className="text-lg font-bold text-ink">{bdt(subtotal)}</span></div>
              <p className="mt-1 text-xs text-slate-400">Delivery charge is calculated at checkout.</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link href="/cart" onClick={closeDrawer} className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 font-semibold text-ink hover:bg-slate-50">View cart</Link>
                <Link href="/checkout" onClick={closeDrawer} className="inline-flex h-12 items-center justify-center rounded-xl bg-fb-500 font-semibold text-white shadow-lg shadow-fb-500/25 hover:bg-fb-600">Checkout</Link>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
