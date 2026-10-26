import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getOrderByNo, zoneLabel } from "@/lib/data/orders";
import { getLandingById, getLandingSettings } from "@/lib/data/landings";
import { DEFAULT_CONTENT } from "@/lib/content";
import { isWithinHours } from "@/lib/format";
import { LandingFooter } from "@/components/landing/landing-footer";
import { PurchaseEvent } from "@/components/meta/meta-pixel";
import { getMarketingConfig } from "@/lib/meta/config";
import { purchaseEventId } from "@/lib/meta/capi";

export const metadata: Metadata = { title: "অর্ডার সফল হয়েছে", robots: { index: false } };

const tk = (n: number) => `${Number(n).toFixed(2)}৳`;

/** Thank-you page for landing-page orders (each landing has its own thank-you text and footer name). */
export default function OrderSuccessPage({ searchParams }: PageProps<"/order/success">) {
  return (
    <div className="min-h-screen bg-[#f3f6f9] font-ui text-[#2d3748]">
      <Suspense fallback={<main className="pb-10"><div className="mx-auto h-[640px] max-w-[575px] animate-pulse border-t-[3px] border-[#4a5bff] bg-white" /></main>}>
        <OrderSummary searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function OrderSummary({ searchParams }: Pick<PageProps<"/order/success">, "searchParams">) {
  const { no } = await searchParams;
  if (typeof no !== "string" || !/^[A-Z]{1,5}\d+$/.test(no)) notFound();
  const order = await getOrderByNo(no);
  // Store orders have their own confirmation page at /checkout/success.
  if (!order || order.source === "store") notFound();
  const [landing, ls] = await Promise.all([order.landing_id ? getLandingById(order.landing_id) : null, getLandingSettings()]);
  const c = landing?.content ?? DEFAULT_CONTENT;
  // Personal details are only shown right after ordering; later lookups go through /track.
  await connection(); // the freshness check below reads the current time
  const fresh = isWithinHours(order.created_at, 2);
  const date = new Date(order.created_at).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Dhaka",
  });
  const zone = zoneLabel(order);
  const pixel = await getMarketingConfig();
  // Browser Purchase pairs with the server Purchase (same event ID) only when purchases are counted at checkout.
  const firePurchase = fresh && pixel.browserEnabled && pixel.events.Purchase && pixel.purchaseTrigger === "placed";

  const meta = [
    ["ORDER NUMBER:", order.order_no],
    ["DATE:", date],
    ["TOTAL:", tk(order.total)],
    ["PAYMENT METHOD:", "Cash on delivery"],
  ];

  return (
    <>
      <main className="pb-10">
        <div className="mx-auto max-w-[575px] border-t-[3px] border-[#4a5bff] bg-white px-5 pb-14 pt-9 shadow-[0_6px_0_-1px_#e3e6fb] sm:px-[42px]">
          <h1 className="text-center font-display text-[30px] font-bold leading-[1.1] text-[#1c8a43] sm:text-[38px]">{c.thankyouTitle}</h1>
          <p className="mx-auto mt-3 max-w-[440px] text-center font-display text-[17px] font-semibold leading-[1.15] text-[#2f4858] sm:text-[19px]">
            {c.thankyouSubtitle}
          </p>
          {firePurchase && (
            <PurchaseEvent order={{
              orderNo: order.order_no,
              value: Number(pixel.purchaseValue === "subtotal" ? order.subtotal : order.total),
              contentIds: order.items.map((i) => String(i.product_id ?? i.product_name)),
              numItems: order.items.reduce((s, i) => s + i.quantity, 0),
              eventId: purchaseEventId(order.order_no),
            }} />
          )}
          <p className="mt-5 pl-1.5 text-[14px] font-semibold text-[#1a202c]">Your order has been received.</p>

          <ul className="mt-4 flex flex-wrap gap-y-3 bg-[#f3f6f9] px-6 py-5 text-[11px]">
            {meta.map(([label, value]) => (
              <li key={label} className="border-r border-dashed border-[#cbd2d9] px-1.5 first:pl-0 last:pr-0.5 [&:not(:first-child)]:pl-2">
                <span className="block text-[#64748b]">{label}</span>
                <strong className="mt-0.5 block font-semibold text-[#4a5568]">{value}</strong>
              </li>
            ))}
          </ul>

          <p className="mt-6 text-[10px] text-[#718096]">Pay with cash upon delivery.</p>

          <section className="mt-3 bg-[#f3f6f9] px-6 pb-4 pt-5">
            <h2 className="text-[15px] font-semibold text-[#1a202c]">Order details</h2>
            <table className="mt-5 w-full max-w-[300px] text-[10.5px] text-[#4a5568]">
              <thead>
                <tr className="border-b border-dashed border-[#b8c0ca] text-left font-semibold text-[#2d3748]">
                  <th className="w-[60%] pb-1.5 font-semibold">Product</th>
                  <th className="pb-1.5 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id} className="border-b border-dashed border-[#b8c0ca]">
                    <td className="py-2 pr-2"><span className="font-sans">{item.product_name}</span> <strong className="text-[#2d3748]">× {item.quantity}</strong></td>
                    <td className="py-2">{tk(item.line_total)}</td>
                  </tr>
                ))}
                <tr><td className="pt-2.5">Subtotal:</td><td className="pt-2.5">{tk(order.subtotal)}</td></tr>
                <tr>
                  <td className="pt-3">Shipping:</td>
                  <td className="pt-3">{tk(order.shipping_charge)} <small className="text-[8px] text-[#64748b]">via {zone}</small></td>
                </tr>
                {Number(order.discount) > 0 && (
                  <tr><td className="pt-3">Discount:</td><td className="pt-3">−{tk(order.discount)}</td></tr>
                )}
                <tr><td className="pt-3">Total:</td><td className="pt-3">{tk(order.total)}</td></tr>
                <tr><td className="pt-3">Payment method:</td><td className="pt-3">Cash on delivery</td></tr>
              </tbody>
            </table>
          </section>

          <section className="mt-4 grid grid-cols-2 gap-6 bg-[#f3f6f9] px-6 pb-9 pt-5">
            <div>
              <h2 className="text-[15px] font-semibold text-[#1a202c]">Billing address</h2>
              <address className="mt-6 pl-2 text-[10.5px] not-italic leading-[1.55] text-[#64748b]">
                {fresh ? (
                  <>
                    <span className="block font-sans">{order.customer_name}</span>
                    <span className="block font-sans">{order.address}</span>
                    <span className="block">{order.phone}</span>
                  </>
                ) : (
                  <span className="block">Hidden for privacy</span>
                )}
              </address>
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-[#1a202c]">Shipping address</h2>
              <p className="mt-6 pl-2 text-[10.5px] text-[#64748b]">N/A</p>
            </div>
          </section>
        </div>
      </main>
      <LandingFooter narrow name={landing?.footer_name || ls.footerName} />
    </>
  );
}
