import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getOrderByNo } from "@/lib/data/orders";
import { getPaymentConfig } from "@/lib/data/catalog";
import { getMarketingConfig } from "@/lib/meta/config";
import { purchaseEventId } from "@/lib/meta/capi";
import { bdt } from "@/lib/store-config";
import { isPaymentMethod, PAYMENT_LABEL } from "@/lib/payments";
import { isWithinHours, maskPhone } from "@/lib/format";
import { PurchaseEvent } from "@/components/meta/meta-pixel";
import { ClearCart } from "@/components/store/clear-cart";
import { CheckIcon, ClockIcon, PhoneIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Order placed", robots: { index: false } };

export default function SuccessPage({ searchParams }: PageProps<"/checkout/success">) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-14">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-white" />}>
        <Success searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Success({ searchParams }: Pick<PageProps<"/checkout/success">, "searchParams">) {
  const { no } = await searchParams;
  if (typeof no !== "string" || !/^FB\d+$/.test(no)) notFound();
  const order = await getOrderByNo(no);
  if (!order) notFound();
  await connection();
  const fresh = isWithinHours(order.created_at, 2);
  const [marketing, payments] = await Promise.all([getMarketingConfig(), getPaymentConfig()]);
  const method = isPaymentMethod(order.payment_method) ? order.payment_method : "cod";
  const verify = order.payment_status === "pending_verification";
  const fire = fresh && marketing.browserEnabled && marketing.events.Purchase && marketing.purchaseTrigger === "placed";

  return (
    <>
      {fresh && <ClearCart />}
      {fire && (
        <PurchaseEvent order={{
          orderNo: order.order_no,
          value: Number(marketing.purchaseValue === "subtotal" ? order.subtotal : order.total),
          contentIds: order.items.map((i) => String(i.product_id ?? i.product_name)),
          numItems: order.items.reduce((s, i) => s + i.quantity, 0),
          eventId: purchaseEventId(order.order_no),
        }} />
      )}
      <div className="text-center animate-slide-up">
        <span className="relative mx-auto grid size-20 place-items-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-fb-400/30 [animation-iteration-count:2]" />
          <span className="relative grid size-20 place-items-center rounded-full bg-fb-500 text-white shadow-xl shadow-fb-500/30"><CheckIcon className="size-10" strokeWidth={2.6} /></span>
        </span>
        <h1 className="mt-6 text-2xl font-bold text-ink sm:text-3xl">Thank you! Your order is placed</h1>
        <p className="mt-2 text-ink-soft">We&apos;ll call you shortly to confirm it.</p>
        <p className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-dashed border-fb-300 bg-white px-5 py-2.5">
          <span className="text-sm text-slate-600">Order number</span><span className="font-mono text-xl font-bold tracking-wide text-fb-700">#{order.order_no}</span>
        </p>
      </div>

      {verify && (
        <div className="mt-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <ClockIcon className="mt-0.5 size-5 shrink-0" />
          <p>We received your {PAYMENT_LABEL[method]} payment details (TrxID <strong className="font-mono">{order.payment_trx}</strong>). We&apos;ll verify it and confirm your order.</p>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200/80 bg-white">
        <ul className="divide-y divide-slate-100 px-5">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3 py-3 text-sm">
              <span className="text-ink">{i.product_name} <span className="text-slate-400">× {i.quantity}</span></span>
              <span className="font-semibold tabular-nums text-ink">{bdt(i.line_total)}</span>
            </li>
          ))}
        </ul>
        <dl className="space-y-1.5 border-t border-slate-100 bg-slate-50/60 px-5 py-4 text-sm">
          <div className="flex justify-between text-ink-soft"><dt>Subtotal</dt><dd className="tabular-nums">{bdt(order.subtotal)}</dd></div>
          <div className="flex justify-between text-ink-soft"><dt>Delivery</dt><dd className="tabular-nums">{Number(order.shipping_charge) ? bdt(order.shipping_charge) : "Free"}</dd></div>
          <div className="flex justify-between pt-1 text-base font-bold text-ink"><dt>Total · {PAYMENT_LABEL[method]}</dt><dd className="tabular-nums text-fb-700">{bdt(order.total)}</dd></div>
        </dl>
        {fresh && (
          <div className="border-t border-slate-100 px-5 py-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Delivering to</p>
            <p className="mt-1 font-medium text-ink">{order.customer_name} · {maskPhone(order.phone)}</p>
            <p className="text-ink-soft">{order.address}</p>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link href={`/track?no=${order.order_no}`} className="flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white font-semibold text-ink hover:border-fb-300">Track this order</Link>
        <Link href="/shop" className="flex h-12 items-center justify-center rounded-xl bg-fb-500 font-semibold text-white hover:bg-fb-600">Continue shopping</Link>
      </div>
      {method === "cod" && payments.cod.instructions && (
        <p className="mt-6 flex items-center justify-center gap-2 text-center text-sm text-slate-600"><PhoneIcon className="size-4" /> {payments.cod.instructions}</p>
      )}
    </>
  );
}
