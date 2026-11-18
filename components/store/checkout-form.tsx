"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { placeStoreOrder, quoteCart } from "@/app/actions/store";
import { initialState } from "@/lib/action-state";
import { bdt, deliveryCharge, type StoreConfig } from "@/lib/store-config";
import { isWallet, PAYMENT_LABEL, type PaymentConfig, type PaymentMethod } from "@/lib/payments";
import { syncCart, useCart } from "./cart-store";
import { track } from "@/lib/meta/pixel-client";
import { sized } from "@/lib/media";
import { CheckoutTimer } from "../checkout-timer";
import { Spinner } from "../form-bits";
import { BagIcon, CashIcon, CheckIcon, LockIcon, ShieldIcon } from "../icons";

type Prefill = { name: string; phone: string; address: string } | null;

const field = "h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-[15px] text-ink outline-none transition placeholder:text-slate-400 focus:border-fb-400 focus:ring-4 focus:ring-fb-500/10 aria-invalid:border-rose-400 disabled:bg-slate-50 disabled:text-slate-400";
const label = "mb-1.5 block text-sm font-medium text-ink-soft";

function Err({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1.5 text-xs font-medium text-rose-600">{msg}</p> : null;
}

const METHOD_STYLE: Record<PaymentMethod, { tint: string; dot: string }> = {
  cod: { tint: "text-ink", dot: "bg-ink" },
  bkash: { tint: "text-[#e2136e]", dot: "bg-[#e2136e]" },
  nagad: { tint: "text-[#ec1c24]", dot: "bg-[#f6921e]" },
  rocket: { tint: "text-[#8c3494]", dot: "bg-[#8c3494]" },
  bank: { tint: "text-fb-700", dot: "bg-fb-500" },
};

function CopyText({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" onClick={() => { navigator.clipboard?.writeText(value).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }).catch(() => {}); }}
      className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-fb-700 ring-1 ring-fb-200 hover:bg-fb-50">
      {done ? "Copied ✓" : "Copy"}
    </button>
  );
}

const noop = () => () => {};

export function StoreCheckout({ store, payments, methods, prefill }: {
  store: StoreConfig; payments: PaymentConfig; methods: PaymentMethod[]; prefill: Prefill;
}) {
  const { items, subtotal } = useCart();
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const [state, action, pending] = useActionState(placeStoreOrder, initialState);
  const v = state.values ?? {};
  const fe = state.fieldErrors ?? {};

  // Only "inside / outside Dhaka" is asked (it sets the delivery charge); the full address goes in one box.
  const [zone, setZone] = useState<"inside" | "outside">(v.zone === "inside" ? "inside" : "outside");
  const [method, setMethod] = useState<PaymentMethod>((v.payment as PaymentMethod) || methods[0]);
  const [checked, setChecked] = useState(false);
  const started = useRef(false);

  // Refresh prices/stock from the server once, so the summary matches what will be charged.
  useEffect(() => {
    if (!items.length || checked) return;
    quoteCart(items.map((i) => i.id)).then((fresh) => { syncCart(fresh); setChecked(true); }).catch(() => setChecked(true));
  }, [items, checked]);

  useEffect(() => {
    if (!items.length || started.current) return;
    started.current = true;
    track("InitiateCheckout", { value: subtotal, currency: "BDT", num_items: items.reduce((s, i) => s + i.qty, 0), content_ids: items.map((i) => String(i.id)), content_type: "product" },
      { items: items.map((i) => ({ id: i.id, qty: i.qty })) });
  }, [items, subtotal]);

  const shipping = deliveryCharge(store, zone === "inside", subtotal);
  const total = subtotal + shipping;

  // The cart lives in this browser, so the server cannot know it. Until the browser has read it, hold the
  // form's space: no "cart is empty" flash, and the footer does not jump when the form appears.
  if (!hydrated) {
    return (
      <div aria-busy="true" aria-label="Loading checkout" className="grid min-h-svh grid-cols-1 content-start gap-6 lg:min-h-160 lg:grid-cols-[1fr_400px] lg:gap-8">
        <div className="space-y-5">
          <div className="h-72 animate-pulse rounded-3xl bg-white" />
          <div className="h-56 animate-pulse rounded-3xl bg-white" />
        </div>
        <div className="h-80 animate-pulse rounded-3xl bg-white" />
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-fb-50 text-fb-700"><BagIcon className="size-8" /></span>
        <p className="mt-4 text-lg font-semibold text-ink">Your cart is empty</p>
        <p className="mt-1 text-sm text-slate-600">Add a few products, then come back to check out.</p>
        <Link href="/shop" className="mt-6 inline-flex h-12 items-center rounded-xl bg-fb-500 px-6 font-semibold text-white hover:bg-fb-600">Browse products</Link>
      </div>
    );
  }

  return (
    <form action={action} noValidate className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px] lg:gap-8">
      <CheckoutTimer />
      <input type="hidden" name="items" value={JSON.stringify(items.map((i) => ({ id: i.id, qty: i.qty })))} />
      <input type="hidden" name="payment" value={method} />
      <input type="hidden" name="zone" value={zone} />

      <div className="min-w-0 space-y-5">
        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7">
          <h2 className="flex items-center gap-2 text-lg font-bold text-ink"><span className="grid size-7 place-items-center rounded-full bg-fb-500 text-sm text-white">1</span> Contact</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="co-name" className={label}>Full name</label>
              <input id="co-name" name="name" defaultValue={v.name ?? prefill?.name} autoComplete="name" className={field} aria-invalid={!!fe.name} placeholder="Your name" />
              <Err msg={fe.name} />
            </div>
            <div>
              <label htmlFor="co-phone" className={label}>Mobile number</label>
              <input id="co-phone" name="phone" type="tel" inputMode="tel" defaultValue={v.phone ?? prefill?.phone} autoComplete="tel" className={field} aria-invalid={!!fe.phone} placeholder="01XXXXXXXXX" />
              <Err msg={fe.phone} />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7">
          <h2 className="flex items-center gap-2 text-lg font-bold text-ink"><span className="grid size-7 place-items-center rounded-full bg-fb-500 text-sm text-white">2</span> Delivery address</h2>
          <div className="mt-5">
            <label htmlFor="co-address" className={label}>Full address</label>
            <textarea id="co-address" name="address" defaultValue={v.address ?? prefill?.address} autoComplete="street-address" rows={2}
              className={`${field} h-auto py-3`} aria-invalid={!!fe.address} placeholder="House, road, area, thana, district — e.g. House 12, Road 3, Mirpur 10, Dhaka" />
            <Err msg={fe.address} />
          </div>
          <div className="mt-4">
            <p className={label}>Delivery area</p>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Delivery area">
              {([["inside", "Inside Dhaka", store.deliveryInside], ["outside", "Outside Dhaka", store.deliveryOutside]] as const).map(([z, name, charge]) => (
                <button key={z} type="button" role="radio" aria-checked={zone === z} onClick={() => setZone(z)}
                  className={`flex items-center justify-between gap-2 rounded-xl border-2 px-4 py-3 text-left transition ${zone === z ? "border-fb-500 bg-fb-50/60 shadow-sm" : "border-slate-200 hover:border-slate-300"}`}>
                  <span className="flex items-center gap-2.5">
                    <span className={`grid size-5 place-items-center rounded-full border-2 ${zone === z ? "border-fb-600" : "border-slate-300"}`}>
                      {zone === z && <span className="size-2.5 rounded-full bg-fb-600" />}
                    </span>
                    <span className="text-[15px] font-semibold text-ink">{name}</span>
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-slate-600">{bdt(charge)}</span>
                </button>
              ))}
            </div>
            <Err msg={fe.zone} />
          </div>
          <div className="mt-4">
            <label htmlFor="co-note" className={label}>Order note <span className="font-normal text-slate-400">(optional)</span></label>
            <textarea id="co-note" name="note" defaultValue={v.note} rows={2} className={`${field} h-auto py-3`} placeholder="Anything we should know about the delivery?" />
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7">
          <h2 className="flex items-center gap-2 text-lg font-bold text-ink"><span className="grid size-7 place-items-center rounded-full bg-fb-500 text-sm text-white">3</span> Payment</h2>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {methods.map((m) => (
              <button key={m} type="button" onClick={() => setMethod(m)} aria-pressed={method === m}
                className={`relative flex h-16 items-center gap-2.5 rounded-2xl border-2 px-3 text-left transition ${method === m ? "border-fb-500 bg-fb-50/60 shadow-sm" : "border-slate-200 hover:border-slate-300"}`}>
                {m === "cod" ? <CashIcon className="size-6 shrink-0 text-ink" /> : <span className={`size-3 shrink-0 rounded-full ${METHOD_STYLE[m].dot}`} />}
                <span className={`text-sm font-bold leading-tight ${METHOD_STYLE[m].tint}`}>{PAYMENT_LABEL[m]}</span>
                {method === m && <CheckIcon className="absolute right-2.5 top-2.5 size-4 text-fb-700" strokeWidth={3} />}
              </button>
            ))}
          </div>
          <Err msg={fe.payment} />

          <div key={method} className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm animate-fade-in">
            {method === "cod" && <p className="text-ink-soft">{payments.cod.instructions}</p>}
            {isWallet(method) && (
              <div className="space-y-3">
                <p className="text-ink-soft">{payments[method].instructions}</p>
                <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-slate-200">
                  <span className="text-xs text-slate-600">{PAYMENT_LABEL[method]} {payments[method].accountType} number</span>
                  <span className="font-mono text-lg font-bold tracking-wider text-ink">{payments[method].number}</span>
                  <CopyText value={payments[method].number} />
                </div>
                <ol className="list-decimal space-y-1 pl-5 text-ink-soft">
                  <li>Open {PAYMENT_LABEL[method]} and choose <strong>{payments[method].accountType === "merchant" ? "Payment" : payments[method].accountType === "agent" ? "Cash Out" : "Send Money"}</strong>.</li>
                  <li>Send <strong className="text-ink">{shipping === null ? "the total" : bdt(total)}</strong> to the number above.</li>
                  <li>Enter your number and the Transaction ID below.</li>
                </ol>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="co-sender" className={label}>Your {PAYMENT_LABEL[method]} number</label>
                    <input id="co-sender" name="sender" defaultValue={v.sender} inputMode="tel" className={field} aria-invalid={!!fe.sender} placeholder="01XXXXXXXXX" />
                    <Err msg={fe.sender} />
                  </div>
                  <div>
                    <label htmlFor="co-trx" className={label}>Transaction ID</label>
                    <input id="co-trx" name="trx" defaultValue={v.trx} className={`${field} font-mono uppercase`} aria-invalid={!!fe.trx} placeholder="e.g. 9BG4XK2L1M" />
                    <Err msg={fe.trx} />
                  </div>
                </div>
              </div>
            )}
            {method === "bank" && (
              <div className="space-y-3">
                <p className="text-ink-soft">{payments.bank.instructions}</p>
                <dl className="grid gap-x-4 gap-y-1.5 rounded-xl bg-white p-3 ring-1 ring-slate-200 sm:grid-cols-2">
                  {[["Bank", payments.bank.bankName], ["Account name", payments.bank.accountName], ["Account number", payments.bank.accountNumber], ["Branch", payments.bank.branch], ["Routing", payments.bank.routing]]
                    .filter(([, x]) => x).map(([k, x]) => (
                      <div key={k}><dt className="text-xs text-slate-600">{k}</dt><dd className="flex items-center gap-2 font-semibold text-ink">{x}{k === "Account number" && <CopyText value={x} />}</dd></div>
                    ))}
                </dl>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="co-sender" className={label}>Account / sender name</label>
                    <input id="co-sender" name="sender" defaultValue={v.sender} className={field} placeholder="Name on the transfer" />
                  </div>
                  <div>
                    <label htmlFor="co-trx" className={label}>Transaction / reference no.</label>
                    <input id="co-trx" name="trx" defaultValue={v.trx} className={`${field} font-mono uppercase`} aria-invalid={!!fe.trx} placeholder="Reference number" />
                    <Err msg={fe.trx} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <aside className="lg:sticky lg:top-36 lg:self-start">
        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-lg font-bold text-ink">Order summary</h2>
          </div>
          <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto px-5">
            {items.map((i) => (
              <li key={i.id} className="flex items-center gap-3 py-3">
                <span className="relative shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sized(i.image, 128)} alt="" width={56} height={56} className="size-14 rounded-xl bg-slate-50 object-contain p-1" />
                  <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-ink text-[10px] font-bold text-white">{i.qty}</span>
                </span>
                <span className="line-clamp-2 min-w-0 flex-1 text-sm text-ink">{i.name}</span>
                <span className="text-sm font-semibold tabular-nums text-ink">{bdt(i.price * i.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="space-y-2 border-t border-slate-100 px-5 py-4 text-sm">
            <div className="flex justify-between text-ink-soft"><dt>Subtotal</dt><dd className="font-semibold text-ink tabular-nums">{bdt(subtotal)}</dd></div>
            <div className="flex justify-between text-ink-soft">
              <dt>Delivery</dt>
              <dd className="font-semibold text-ink tabular-nums">{shipping === 0 ? <span className="text-emerald-600">Free</span> : bdt(shipping)}</dd>
            </div>
            <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-3">
              <dt className="font-bold text-ink">Total</dt>
              <dd key={total} className="text-2xl font-bold text-fb-700 tabular-nums animate-fade-in">{bdt(total)}</dd>
            </div>
          </dl>
          <div className="space-y-3 px-5 pb-5">
            {state.error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{state.error}</p>}
            <button type="submit" data-track="submit" disabled={pending}
              className="cta-fx flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-fb-500 text-base font-bold text-white shadow-lg shadow-fb-500/30 transition hover:bg-fb-600 disabled:opacity-70 [--cta-ring:rgb(24_119_242/0.4)]">
              {pending ? <><Spinner className="size-5" /> Placing order…</> : <>Place order · {bdt(total)}</>}
            </button>
            <p className="flex items-center justify-center gap-1.5 text-xs text-slate-600"><LockIcon className="size-3.5" /> Your details are only used to deliver this order</p>
            <p className="flex items-center justify-center gap-1.5 text-xs text-slate-600"><ShieldIcon className="size-3.5" /> 100% authentic products · {store.deliveryDays}</p>
          </div>
        </div>
      </aside>
    </form>
  );
}
