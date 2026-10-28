"use client";

import { useActionState, useRef, useState } from "react";
import { placeOrder } from "@/app/actions/order";
import { initialState } from "@/lib/action-state";
import type { CheckoutConfig, CustomField } from "@/lib/checkout";
import { Spinner } from "../form-bits";
import { track } from "@/lib/meta/pixel-client";
import { sized } from "@/lib/media";
import { CheckoutTimer } from "../checkout-timer";

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
    <span className={`grid size-[22px] shrink-0 place-items-center rounded-full border-2 transition sm:size-[15px] sm:border ${checked ? "border-[#4a5bff]" : "border-[#b8bfc9]"}`}>
      <span className={`size-[11px] rounded-full bg-[#4a5bff] transition sm:size-[7px] ${checked ? "scale-100" : "scale-0"}`} />
    </span>
  );
}

function Err({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1.5 text-[16px] font-semibold text-[#c2321a] sm:text-xs sm:font-normal">{msg}</p> : null;
}

const input =
  "block w-full rounded-xl border-2 border-[#cfd4dc] bg-white px-4 py-[15px] text-[18px] text-[#1f2733] sm:rounded-[4px] sm:border sm:px-3 sm:py-[11px] sm:text-[14px] sm:text-[#2d3748] outline-none transition placeholder:text-[#5f6773] focus:border-[#4a5bff] focus:ring-2 focus:ring-[#4a5bff]/15 aria-invalid:border-[#e2401c]";

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
      {!preview && <CheckoutTimer />}
      <input type="hidden" name="zone" value={zone?.id ?? ""} />
      <input type="hidden" name="quantity" value={quantity} />

      {/* LEFT */}
      <div className="min-w-0">
        <h3 className="mb-4 text-[20px] font-bold text-[#1a202c] sm:text-[15px] sm:font-semibold">{config.billingTitle}</h3>
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
              aria-label={f.note.label} className={`${input} min-h-[47px] sm:text-[13px]`} />
          )}
        </div>

        <h3 className="mb-3 mt-7 text-[20px] font-bold text-[#2d3748] sm:text-[15px] sm:font-semibold sm:text-[#4a5568]">{config.shippingTitle}</h3>
        <div className="overflow-hidden rounded-xl border-2 border-[#cfd4dc] sm:rounded-[4px] sm:border sm:border-[#d4d7dd]">
          {config.zones.map((z, i) => (
            <button key={z.id} type="button" onClick={() => setZoneId(z.id)} aria-pressed={zone?.id === z.id}
              className={`flex w-full items-center gap-3 px-4 py-[16px] text-left text-[18px] transition hover:bg-[#f8f9fb] aria-pressed:bg-[#eef0ff] sm:gap-2 sm:px-3 sm:py-[13px] sm:text-[13px] sm:aria-pressed:bg-transparent ${i ? "border-t border-[#d4d7dd]" : ""}`}>
              <Radio checked={zone?.id === z.id} />
              <span className="flex-1 font-sans font-semibold text-[#2d3748] sm:font-normal sm:text-[#4a5568]">{z.label}:</span>
              <span className="font-bold text-[#2d3748] sm:font-normal sm:text-[#4a5568]">{tk(z.charge)}</span>
            </button>
          ))}
        </div>
        <Err msg={fe.zone} />

        <h3 className="mb-3 mt-7 pl-1 text-[20px] font-bold text-[#2d3748] sm:text-[15px] sm:font-semibold sm:text-[#4a5568]">{config.productsTitle}</h3>
        <div className="rounded-xl bg-[#f1f1f1] px-3 pb-3 pt-2 sm:rounded-[4px]">
          <div className="hidden grid-cols-[1fr_auto_auto] gap-3 border-b border-[#d9d9d9] py-2 text-[12px] font-semibold text-[#1a202c] sm:grid">
            <span>Product</span><span className="w-[88px] text-center">Quantity</span><span className="w-[60px] text-right">Price</span>
          </div>
          <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-3 pt-2 sm:grid-cols-[1fr_auto_auto] sm:gap-y-0">
            <div className="col-span-2 flex min-w-0 items-center gap-2.5 sm:col-span-1">
              <span className="hidden sm:contents"><Radio checked /></span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sized(product.image, 128)} alt="" width={34} height={34} className="size-[60px] shrink-0 rounded-lg bg-white object-contain sm:size-[34px] sm:rounded-[3px]" />
              <span className="font-sans text-[18px] font-bold leading-snug text-[#1f2733] sm:text-[13px] sm:font-semibold sm:text-[#2d3748]">{productLabel}</span>
            </div>
            <div className="flex items-center sm:w-[88px] sm:justify-center">
              {config.allowQuantity ? (
                <div className="flex h-12 items-stretch overflow-hidden rounded-xl border-2 border-[#cfd4dc] bg-white text-[20px] font-bold sm:h-[22px] sm:rounded-[2px] sm:border sm:border-[#d4d7dd] sm:text-[12px] sm:font-normal">
                  <button type="button" onClick={() => setQty(Math.max(quantity - 1, 1))} disabled={quantity <= 1} aria-label="কমান"
                    className="w-12 bg-[#f3f3f3] text-[#333] hover:bg-[#e8e8e8] disabled:opacity-50 sm:w-[18px] sm:text-[#555]">−</button>
                  <span className="grid w-12 place-items-center tabular-nums sm:w-[26px]" aria-live="polite">{quantity}</span>
                  <button type="button" onClick={increase} disabled={quantity >= maxQty} aria-label="বাড়ান"
                    className="w-12 bg-[#f3f3f3] text-[#333] hover:bg-[#e8e8e8] disabled:opacity-50 sm:w-[18px] sm:text-[#555]">+</button>
                </div>
              ) : (
                <span className="text-[18px] tabular-nums sm:text-[12px]">× 1</span>
              )}
            </div>
            <span className="text-right text-[20px] font-bold tabular-nums sm:w-[60px] sm:text-[12px] sm:font-normal">{tk(product.price)}</span>
          </div>
          <Err msg={fe.quantity} />
        </div>
      </div>

      {/* RIGHT */}
      <div className="min-w-0">
        <h3 className="mb-4 text-[20px] font-bold text-[#1a202c] sm:text-[15px] sm:font-semibold">{config.orderTitle}</h3>
        <table className="w-full text-[16px] sm:text-[12px]">
          <thead>
            <tr className="border-b border-dashed border-[#cfd4da] text-left text-[15px] font-semibold text-[#1a202c] sm:text-[11.5px]">
              <th className="py-2 font-semibold">Product</th>
              <th className="py-2 font-semibold">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-dashed border-[#cfd4da]">
              <td className="py-2.5 pr-2">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sized(product.image, 96)} alt="" width={34} height={34} className="size-[42px] object-contain sm:size-[34px]" />
                  <span className="flex-1 font-sans text-[#4c51bf]">{productLabel}</span>
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
            <tr className="text-[21px] font-extrabold text-[#111] sm:text-[12px] sm:font-semibold sm:text-[#2d3748]">
              <td className="py-3">Total</td>
              <td className="py-3 tabular-nums">{tk(total)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-5 rounded-[2px] bg-[#f1f5f9] p-3">
          <p className="px-1 pb-2 pt-1 font-sans text-[17px] font-semibold text-[#2d3748] sm:text-[12.5px] sm:font-normal">{config.paymentTitle}</p>
          <div className="relative rounded-[2px] bg-white px-3 py-3 font-sans text-[16px] text-[#3a4250] sm:text-[11.5px] sm:text-[#4a5568] before:absolute before:-top-[7px] before:left-5 before:border-x-[7px] before:border-b-[7px] before:border-x-transparent before:border-b-white">
            {config.paymentText}
          </div>
        </div>

        {config.privacyText && (
          <p className="mt-2 text-justify font-sans text-[13px] leading-[1.5] text-[#5a6577] sm:text-[9.5px] sm:leading-[1.45]">{config.privacyText}</p>
        )}

        {state.error && (
          <p role="alert" className="mt-3 rounded-[3px] border-l-4 border-[#e2401c] bg-[#fdf2f0] px-3 py-2.5 font-sans text-[17px] font-semibold text-[#b42318] sm:text-[13px] sm:font-normal">
            {state.error}
          </p>
        )}

        <button type="submit" disabled={pending || outOfStock}
          style={{ backgroundColor: config.buttonColor }}
          className="mt-4 flex min-h-[64px] w-full items-center justify-center gap-2 rounded-2xl px-4 py-4 font-sans text-[21px] font-bold text-white shadow-lg transition hover:brightness-95 active:scale-[0.99] disabled:opacity-70 sm:mt-3 sm:min-h-0 sm:rounded-[3px] sm:py-[11px] sm:text-[15px] sm:shadow-sm">
          {pending ? <><Spinner className="size-5 sm:size-4" /> অর্ডার হচ্ছে...</> : outOfStock ? "স্টক শেষ"
            : <>{config.buttonText}{config.showTotalOnButton && <>&nbsp; {tk(total)}</>}</>}
        </button>
      </div>
    </form>
  );
}
