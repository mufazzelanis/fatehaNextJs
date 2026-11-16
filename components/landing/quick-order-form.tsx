"use client";

import { useActionState, useRef, useState } from "react";
import { placeOrder } from "@/app/actions/order";
import { initialState } from "@/lib/action-state";
import { packagePrice, type CheckoutConfig, type OrderPackage } from "@/lib/checkout";
import { track } from "@/lib/meta/pixel-client";
import { sized } from "@/lib/media";
import { CheckoutTimer } from "../checkout-timer";
import { Spinner } from "../form-bits";
import { PackagePicker } from "./package-picker";

type Product = { id: number; name: string; weight: string | null; price: number; image: string; stock: number };
const tk = (n: number) => `৳${Math.round(n).toLocaleString("en-IN")}`;

const field =
  "block w-full rounded-2xl border-2 border-[#d6e0da] bg-white px-4 py-4 font-sans text-[18px] text-[#14261c] outline-none transition placeholder:text-[#7c8b82] focus:border-[#2f9a6a] focus:ring-4 focus:ring-[#2f9a6a]/15 aria-invalid:border-[#e2401c] sm:py-3.5 sm:text-[17px]";

function Err({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1.5 text-[16px] font-semibold text-[#c2321a]">{msg}</p> : null;
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-[#1d6b4a]/10 sm:p-6">
      <h2 className="mb-4 flex items-center gap-2.5 font-display text-[21px] font-bold text-[#14261c]">
        <span className="grid size-8 place-items-center rounded-full bg-[#1d6b4a] text-[16px] text-white">{n}</span>{title}
      </h2>
      {children}
    </section>
  );
}

/**
 * Quick order form: choose a package → name, phone, address → delivery area → order (cash on delivery).
 * Same server action, fraud checks, live tracking and Facebook events as the landing page form.
 */
export function QuickOrderForm({ product, config, landingId }: { product: Product; config: CheckoutConfig; landingId: number }) {
  const [state, formAction, pending] = useActionState(placeOrder, initialState);
  const v = state.values ?? {};
  const fe = state.fieldErrors ?? {};
  const pk = config.packages;
  // Without packages the page still works: one "package" per quantity the landing allows.
  const items: OrderPackage[] = pk.enabled ? pk.items
    : [{ id: "", qty: 1, title: "১টি", subtitle: "", price: 0, badge: "", freeDelivery: false }];
  const [pkgId, setPkgId] = useState(() => (items.some((p) => p.id === v.package) ? v.package : pk.enabled ? pk.defaultId : ""));
  const [zoneId, setZoneId] = useState(() => (config.zones.some((z) => z.id === v.zone) ? v.zone : config.defaultZone));
  const started = useRef(false);

  const pkg = items.find((p) => p.id === pkgId) ?? items[0];
  const zone = config.zones.find((z) => z.id === zoneId) ?? config.zones[0];
  const price = packagePrice(pkg, product.price);
  const regular = Math.round(product.price * pkg.qty);
  const delivery = pkg.freeDelivery ? 0 : zone?.charge ?? 0;
  const total = price + delivery;
  const outOfStock = product.stock < pkg.qty;
  const accent = config.buttonColor;
  const f = config.fields;

  const pixel = (p: OrderPackage): [Record<string, unknown>, Parameters<typeof track>[2]] => {
    const value = packagePrice(p, product.price);
    return [
      { content_ids: [String(product.id)], content_name: `${product.name}${p.qty > 1 ? ` — ${p.title}` : ""}`, content_type: "product", value, currency: "BDT", num_items: p.qty },
      { items: [{ id: product.id, qty: p.qty }], ...(pk.enabled && p.id ? { pkg: { landing: landingId, id: p.id } } : {}) },
    ];
  };
  const choose = (id: string) => {
    if (id === pkgId) return;
    setPkgId(id);
    const p = items.find((x) => x.id === id);
    if (p) { const [params, opts] = pixel(p); track("AddToCart", params, opts); }
  };
  // InitiateCheckout once, the first time the customer starts filling the form.
  const onFocus = () => {
    if (started.current) return;
    started.current = true;
    const [params, opts] = pixel(pkg);
    track("InitiateCheckout", params, opts);
  };

  return (
    <form action={formAction} onFocus={onFocus} onInput={onFocus} noValidate className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_360px] 2xl:items-start 2xl:gap-6">
      <CheckoutTimer />
      <input type="hidden" name="landing" value={landingId} />
      <input type="hidden" name="package" value={pkg.id} />
      <input type="hidden" name="quantity" value={pkg.qty} />
      <input type="hidden" name="zone" value={zone?.id ?? ""} />

      <div className="min-w-0 space-y-4">
        {pk.enabled && (
          <Step n={1} title={pk.title}>
            <PackagePicker items={pk.items} selected={pkg.id} onSelect={choose} unitPrice={product.price} image={product.image} accent={accent} error={fe.package} />
          </Step>
        )}

        <Step n={pk.enabled ? 2 : 1} title="আপনার তথ্য দিন">
          <div className="space-y-3.5">
            <div>
              <label htmlFor="q-name" className="mb-1.5 block text-[16px] font-semibold text-[#22382b]">{f.name.label}</label>
              <input id="q-name" name="name" defaultValue={v.name} autoComplete="name" placeholder={f.name.placeholder} aria-invalid={!!fe.name} className={field} />
              <Err msg={fe.name} />
            </div>
            <div>
              <label htmlFor="q-phone" className="mb-1.5 block text-[16px] font-semibold text-[#22382b]">{f.phone.label}</label>
              <input id="q-phone" name="phone" type="tel" inputMode="tel" defaultValue={v.phone} autoComplete="tel" placeholder={f.phone.placeholder} aria-invalid={!!fe.phone} className={`${field} tabular-nums`} />
              <Err msg={fe.phone} />
            </div>
            <div>
              <label htmlFor="q-address" className="mb-1.5 block text-[16px] font-semibold text-[#22382b]">{f.address.label}</label>
              <textarea id="q-address" name="address" rows={2} defaultValue={v.address} autoComplete="street-address" placeholder={f.address.placeholder} aria-invalid={!!fe.address} className={field} />
              <Err msg={fe.address} />
            </div>
            {config.customFields.map((cf) => (
              <div key={cf.id}>
                <label htmlFor={`q-${cf.id}`} className="mb-1.5 block text-[16px] font-semibold text-[#22382b]">{cf.label}{cf.required ? " *" : ""}</label>
                {cf.type === "select" ? (
                  <select id={`q-${cf.id}`} name={`cf_${cf.id}`} defaultValue={v[`cf_${cf.id}`] ?? ""} className={field}>
                    <option value="">{cf.placeholder || cf.label}</option>
                    {cf.options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : cf.type === "textarea" ? (
                  <textarea id={`q-${cf.id}`} name={`cf_${cf.id}`} rows={2} defaultValue={v[`cf_${cf.id}`]} placeholder={cf.placeholder} className={field} />
                ) : (
                  <input id={`q-${cf.id}`} name={`cf_${cf.id}`} defaultValue={v[`cf_${cf.id}`]} placeholder={cf.placeholder} className={field} />
                )}
                <Err msg={fe[`cf_${cf.id}`]} />
              </div>
            ))}
            {f.note.enabled && (
              <textarea name="note" rows={2} defaultValue={v.note} placeholder={f.note.placeholder} aria-label={f.note.label} className={`${field} text-[16px]`} />
            )}
          </div>
        </Step>

        <Step n={pk.enabled ? 3 : 2} title="ডেলিভারি এলাকা">
          <div className={`grid gap-2.5 ${config.zones.length === 2 ? "grid-cols-2" : "sm:grid-cols-2"}`}>
            {config.zones.map((z) => {
              const on = z.id === zone?.id;
              return (
                <button key={z.id} type="button" onClick={() => setZoneId(z.id)} aria-pressed={on}
                  className={`rounded-2xl border-2 px-3 py-3.5 text-center transition active:scale-[0.98] ${on ? "" : "border-[#e2e8e4] bg-white"}`}
                  style={on ? { borderColor: accent, backgroundColor: `color-mix(in srgb, ${accent} 7%, white)` } : undefined}>
                  <span className="block font-sans text-[17px] font-bold text-[#14261c]">{z.label}</span>
                  <span className={`block text-[15px] tabular-nums ${pkg.freeDelivery ? "text-[#1d6b4a]" : "text-[#4b6356]"}`}>
                    {pkg.freeDelivery ? <><s className="text-[#8a9a90]">{tk(z.charge)}</s> ফ্রি</> : tk(z.charge)}
                  </span>
                </button>
              );
            })}
          </div>
          <Err msg={fe.zone} />
        </Step>
      </div>

      {/* Summary — sticky beside the form on computers, at the end on phones */}
      <aside id="order-summary" className="rounded-3xl bg-white p-4 shadow-lg ring-1 ring-[#1d6b4a]/10 sm:p-6 2xl:sticky 2xl:top-6">
        <h2 className="font-display text-[21px] font-bold text-[#14261c]">অর্ডার সারাংশ</h2>
        <div className="mt-4 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sized(product.image, 128)} alt="" width={56} height={56} className="size-14 shrink-0 rounded-xl bg-[#f4f8f5] object-contain ring-1 ring-black/5" />
          <div className="min-w-0 flex-1">
            <p className="font-sans text-[16px] font-bold leading-snug text-[#14261c]">{product.name}{product.weight ? ` (${product.weight})` : ""}</p>
            <p className="text-[15px] text-[#4b6356]">{pk.enabled ? pkg.title : ""} × {pkg.qty}</p>
          </div>
        </div>
        <dl className="mt-4 space-y-2 border-t border-dashed border-[#d6e0da] pt-4 text-[16px]">
          <div className="flex justify-between text-[#34503f]"><dt>পণ্যের দাম</dt><dd className="tabular-nums">{regular > price ? <><s className="mr-2 text-[#8a9a90]">{tk(regular)}</s>{tk(price)}</> : tk(price)}</dd></div>
          {regular > price && <div className="flex justify-between font-semibold text-[#c81e1e]"><dt>কম্বো সাশ্রয়</dt><dd className="tabular-nums">−{tk(regular - price)}</dd></div>}
          <div className="flex justify-between text-[#34503f]"><dt>ডেলিভারি ({zone?.label})</dt><dd className="tabular-nums">{delivery ? tk(delivery) : "ফ্রি"}</dd></div>
          <div className="flex justify-between border-t border-[#d6e0da] pt-3 text-[22px] font-extrabold text-[#14261c]"><dt>মোট</dt><dd className="tabular-nums">{tk(total)}</dd></div>
        </dl>
        <p className="mt-3 rounded-xl bg-[#f4f8f5] px-3 py-2.5 text-[15px] text-[#34503f]">💵 ক্যাশ অন ডেলিভারি — পণ্য হাতে পেয়ে টাকা পরিশোধ করুন</p>

        {state.error && <p role="alert" className="mt-3 rounded-xl bg-[#fdf2f0] px-3 py-2.5 text-[16px] font-semibold text-[#b42318] ring-1 ring-[#f5c2b8]">{state.error}</p>}

        <button type="submit" data-track="submit" disabled={pending || outOfStock}
          className="mt-4 flex min-h-16 w-full items-center justify-center gap-2 rounded-2xl px-4 py-4 font-sans text-[21px] font-bold text-white shadow-[0_10px_25px_-8px_rgb(0_0_0/0.45)] transition hover:brightness-105 active:scale-[0.99] disabled:opacity-70"
          style={{ backgroundColor: accent }}>
          {pending ? <><Spinner className="size-5" /> অর্ডার হচ্ছে…</> : outOfStock ? "স্টক শেষ" : <>{config.buttonText} · {tk(total)}</>}
        </button>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-[14px] text-[#4b6356]">🔒 আপনার তথ্য নিরাপদ · অর্ডারের পর আমরা কল করে কনফার্ম করব</p>
      </aside>

      {/* Phones: total + order button always in reach */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#1d6b4a]/10 bg-white/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgb(0_0_0/0.08)] backdrop-blur 2xl:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="min-w-0">
            <p className="truncate text-[13px] text-[#4b6356]">{pk.enabled ? pkg.title : product.name}</p>
            <p className="text-[22px] font-extrabold tabular-nums leading-none text-[#14261c]">{tk(total)}</p>
          </div>
          <button type="submit" disabled={pending || outOfStock}
            className="ml-auto flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl px-4 font-sans text-[19px] font-bold text-white shadow-md active:scale-[0.98] disabled:opacity-70"
            style={{ backgroundColor: accent }}>
            {pending ? <Spinner className="size-5" /> : "অর্ডার করুন →"}
          </button>
        </div>
      </div>
    </form>
  );
}
