"use client";

import { useActionState, useRef, useState } from "react";
import { placeOrder } from "@/app/actions/order";
import { initialState } from "@/lib/action-state";
import type { CheckoutConfig, CustomField } from "@/lib/checkout";
import { Spinner } from "../form-bits";
import { track } from "@/lib/meta/pixel-client";

type Props = {
  product: { id: number; name: string; weight: string | null; price: number; image: string; stock: number };
  config: CheckoutConfig;
  /** Admin live preview: renders the form but never submits or tracks. */
  preview?: boolean;
  /** Landing page the order belongs to. */
  landingId?: number;
};

const tk = (n: number) => `${n.toFixed(2)}৳`;

function Radio({ checked }: { checked: boolean }) {
  return (
    <span className={`grid size-[15px] shrink-0 place-items-center rounded-full border transition ${checked ? "border-[#4a5bff]" : "border-[#b8bfc9]"}`}>
      <span className={`size-[7px] rounded-full bg-[#4a5bff] transition ${checked ? "scale-100" : "scale-0"}`} />
    </span>
  );
}

function Err({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1 text-xs text-[#e2401c]">{msg}</p> : null;
}

const input =
  "block w-full rounded-[4px] border border-[#d4d7dd] bg-white px-3 py-[11px] text-[14px] text-[#2d3748] outline-none transition placeholder:text-[#5f6773] focus:border-[#4a5bff] focus:ring-2 focus:ring-[#4a5bff]/15 aria-invalid:border-[#e2401c]";

function CustomInput({ field, value, error }: { field: CustomField; value?: string; error?: string }) {
  const name = `cf_${field.id}`;
  const placeholder = `${field.placeholder || field.label}${field.required ? " *" : ""}`;
  if (field.type === "select") {
    return (
      <select name={name} defaultValue={value ?? ""} aria-label={field.label} aria-invalid={!!error} className={`${input} font-sans`}>
        <option value="">{placeholder}</option>
        {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (field.type === "textarea") {
    return <textarea name={name} defaultValue={value} rows={2} placeholder={placeholder} aria-label={field.label} aria-invalid={!!error} className={`${input} font-sans`} />;
  }
  return <input name={name} defaultValue={value} placeholder={placeholder} aria-label={field.label} aria-invalid={!!error} className={`${input} font-sans`} />;
}

/** Same layout as the original WooCommerce-style checkout block, driven by the admin's checkout settings. */
export function CheckoutForm({ product, config, preview = false, landingId = 0 }: Props) {
  const [state, formAction, pending] = useActionState(placeOrder, initialState);
  const [zoneId, setZoneId] = useState(() =>
    config.zones.some((z) => z.id === state.values?.zone) ? state.values!.zone : config.defaultZone,
  );
  const [qty, setQty] = useState(Number(state.values?.quantity) || 1);
  const checkoutStarted = useRef(false);

  const zone = config.zones.find((z) => z.id === zoneId) ?? config.zones[0];
  const maxQty = config.allowQuantity ? Math.max(Math.min(config.maxQuantity, product.stock), 1) : 1;
  const quantity = Math.min(qty, maxQty);
  const pixelParams = (q: number) => ({
    content_ids: [String(product.id)], content_name: product.name, content_type: "product",
    value: product.price * q, currency: "BDT", num_items: q,
  });
  // InitiateCheckout once, the first time the customer touches the form.
  const onFormFocus = () => {
    if (preview || checkoutStarted.current) return;
    checkoutStarted.current = true;
    track("InitiateCheckout", pixelParams(quantity), { items: [{ id: product.id, qty: quantity }] });
  };
  const increase = () => {
    const next = Math.min(quantity + 1, maxQty);
    if (next === quantity) return;
    setQty(next);
    if (!preview) track("AddToCart", pixelParams(1), { items: [{ id: product.id, qty: 1 }] });
  };
  const subtotal = product.price * quantity;
  const total = subtotal + (zone?.charge ?? 0);
  const outOfStock = product.stock <= 0;
  const fe = state.fieldErrors ?? {};
  const v = state.values ?? {};
  const productLabel = `${product.name}${product.weight ? ` (${product.weight})` : ""}`;
  const f = config.fields;

  return (
    <form action={preview ? undefined : formAction} onSubmit={preview ? (e) => e.preventDefault() : undefined}
      onFocus={onFormFocus} noValidate className="grid gap-x-10 gap-y-8 font-ui text-[#2d3748] md:grid-cols-[1.08fr_0.92fr]">
      <input type="hidden" name="landing" value={landingId} />
      <input type="hidden" name="zone" value={zone?.id ?? ""} />
      <input type="hidden" name="quantity" value={quantity} />

      {/* LEFT */}
      <div className="min-w-0">
        <h3 className="mb-4 text-[15px] font-semibold text-[#1a202c]">{config.billingTitle}</h3>
        <div className="space-y-4">
          <div>
            <input name="name" defaultValue={v.name} placeholder={f.name.placeholder} autoComplete="name"
              aria-label={f.name.label} aria-invalid={!!fe.name} className={`${input} font-sans`} />
            <Err msg={fe.name} />
          </div>
          <div>
            <input name="address" defaultValue={v.address} placeholder={f.address.placeholder} autoComplete="street-address"
              aria-label={f.address.label} aria-invalid={!!fe.address} className={`${input} font-sans`} />
            <Err msg={fe.address} />
          </div>
          <div>
            <input name="phone" defaultValue={v.phone} type="tel" inputMode="tel" placeholder={f.phone.placeholder} autoComplete="tel"
              aria-label={f.phone.label} aria-invalid={!!fe.phone} className={`${input} font-sans`} />
            <Err msg={fe.phone} />
          </div>
          {config.customFields.map((cf) => (
            <div key={cf.id}>
              <CustomInput field={cf} value={v[`cf_${cf.id}`]} error={fe[`cf_${cf.id}`]} />
              <Err msg={fe[`cf_${cf.id}`]} />
            </div>
          ))}
          {f.note.enabled && (
            <textarea name="note" defaultValue={v.note} rows={2} placeholder={f.note.placeholder}
              aria-label={f.note.label} className={`${input} min-h-[47px] text-[13px]`} />
          )}
        </div>

        <h3 className="mb-3 mt-7 text-[15px] font-semibold text-[#4a5568]">{config.shippingTitle}</h3>
        <div className="overflow-hidden rounded-[4px] border border-[#d4d7dd]">
          {config.zones.map((z, i) => (
            <button key={z.id} type="button" onClick={() => setZoneId(z.id)} aria-pressed={zone?.id === z.id}
              className={`flex w-full items-center gap-2 px-3 py-[13px] text-left text-[13px] transition hover:bg-[#f8f9fb] ${i ? "border-t border-[#d4d7dd]" : ""}`}>
              <Radio checked={zone?.id === z.id} />
              <span className="flex-1 font-sans text-[#4a5568]">{z.label}:</span>
              <span className="text-[#4a5568]">{tk(z.charge)}</span>
            </button>
          ))}
        </div>
        <Err msg={fe.zone} />

        <h3 className="mb-3 mt-7 pl-1 text-[15px] font-semibold text-[#4a5568]">{config.productsTitle}</h3>
        <div className="rounded-[4px] bg-[#f1f1f1] px-3 pb-3 pt-2">
          <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-[#d9d9d9] py-2 text-[12px] font-semibold text-[#1a202c]">
            <span>Product</span><span className="w-[88px] text-center">Quantity</span><span className="w-[60px] text-right">Price</span>
          </div>
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 pt-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <Radio checked />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={product.image} alt="" className="size-[34px] shrink-0 rounded-[3px] bg-white object-contain" />
              <span className="font-sans text-[13px] font-semibold leading-snug text-[#2d3748]">{productLabel}</span>
            </div>
            <div className="flex w-[88px] items-center justify-center">
              {config.allowQuantity ? (
                <div className="flex h-[22px] items-stretch overflow-hidden rounded-[2px] border border-[#d4d7dd] bg-white text-[12px]">
                  <button type="button" onClick={() => setQty(Math.max(quantity - 1, 1))} disabled={quantity <= 1} aria-label="কমান"
                    className="w-[18px] bg-[#f3f3f3] text-[#555] hover:bg-[#e8e8e8] disabled:opacity-50">−</button>
                  <span className="grid w-[26px] place-items-center tabular-nums" aria-live="polite">{quantity}</span>
                  <button type="button" onClick={increase} disabled={quantity >= maxQty} aria-label="বাড়ান"
                    className="w-[18px] bg-[#f3f3f3] text-[#555] hover:bg-[#e8e8e8] disabled:opacity-50">+</button>
                </div>
              ) : (
                <span className="text-[12px] tabular-nums">× 1</span>
              )}
            </div>
            <span className="w-[60px] text-right text-[12px] tabular-nums">{tk(product.price)}</span>
          </div>
          <Err msg={fe.quantity} />
        </div>
      </div>

      {/* RIGHT */}
      <div className="min-w-0">
        <h3 className="mb-4 text-[15px] font-semibold text-[#1a202c]">{config.orderTitle}</h3>
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-dashed border-[#cfd4da] text-left text-[11.5px] font-semibold text-[#1a202c]">
              <th className="py-2 font-semibold">Product</th>
              <th className="py-2 font-semibold">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-dashed border-[#cfd4da]">
              <td className="py-2.5 pr-2">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={product.image} alt="" className="size-[34px] object-contain" />
                  <span className="flex-1 font-sans text-[#5a67d8]">{productLabel}</span>
                  <span className="whitespace-nowrap text-[#4a5568]">× {quantity}</span>
                </div>
              </td>
              <td className="py-2.5 text-[#5a67d8] tabular-nums">{tk(subtotal)}</td>
            </tr>
            <tr className="border-b border-dashed border-[#cfd4da] text-[#4a5568]">
              <td className="py-2.5">Subtotal</td>
              <td className="py-2.5 tabular-nums">{tk(subtotal)}</td>
            </tr>
            <tr className="border-b border-dashed border-[#cfd4da] text-[#4a5568]">
              <td className="py-2.5">Shipment</td>
              <td className="space-y-1.5 py-2.5">
                {config.zones.map((z) => (
                  <button key={z.id} type="button" onClick={() => setZoneId(z.id)} className="flex items-start gap-1.5 text-left text-[#5a67d8]">
                    <span className="mt-[1px]"><Radio checked={zone?.id === z.id} /></span>
                    <span className="font-sans">{z.label}: {tk(z.charge)}</span>
                  </button>
                ))}
              </td>
            </tr>
            <tr className="font-semibold text-[#2d3748]">
              <td className="py-3">Total</td>
              <td className="py-3 tabular-nums">{tk(total)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-5 rounded-[2px] bg-[#f1f5f9] p-3">
          <p className="px-1 pb-2 pt-1 font-sans text-[12.5px] text-[#2d3748]">{config.paymentTitle}</p>
          <div className="relative rounded-[2px] bg-white px-3 py-3 font-sans text-[11.5px] text-[#4a5568] before:absolute before:-top-[7px] before:left-5 before:border-x-[7px] before:border-b-[7px] before:border-x-transparent before:border-b-white">
            {config.paymentText}
          </div>
        </div>

        {config.privacyText && (
          <p className="mt-2 text-justify font-sans text-[9.5px] leading-[1.45] text-[#718096]">{config.privacyText}</p>
        )}

        {state.error && (
          <p role="alert" className="mt-3 rounded-[3px] border-l-4 border-[#e2401c] bg-[#fdf2f0] px-3 py-2.5 font-sans text-[13px] text-[#b42318]">
            {state.error}
          </p>
        )}

        <button type="submit" disabled={pending || outOfStock}
          style={{ backgroundColor: config.buttonColor }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-[3px] px-4 py-[11px] font-sans text-[15px] font-bold text-white shadow-sm transition hover:brightness-95 active:scale-[0.99] disabled:opacity-70">
          {pending ? <><Spinner className="size-4" /> অর্ডার হচ্ছে...</> : outOfStock ? "স্টক শেষ"
            : <>{config.buttonText}{config.showTotalOnButton && <>&nbsp; {tk(total)}</>}</>}
        </button>
      </div>
    </form>
  );
}
