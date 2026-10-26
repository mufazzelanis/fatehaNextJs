import Link from "next/link";
import { Suspense } from "react";
import { requireCustomer } from "@/lib/auth";
import { getCustomerOrders } from "@/lib/data/orders";
import { bn, STATUS_META, taka } from "@/lib/format";
import { OrderTimeline } from "@/components/order-timeline";
import { ArrowRightIcon, ChevronDownIcon } from "@/components/icons";

export default function AccountOrdersPage() {
  return (
    <Suspense fallback={<div className="space-y-4">{[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-3xl bg-slate-100" />)}</div>}>
      <Orders />
    </Suspense>
  );
}

function bnDate(value: Date) {
  return new Date(value).toLocaleDateString("bn-BD", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dhaka" });
}

async function Orders() {
  const customer = await requireCustomer();
  const orders = await getCustomerOrders(customer.id, customer.phone);
  const active = orders.filter((o) => !["delivered", "cancelled", "returned"].includes(o.status)).length;
  const delivered = orders.filter((o) => o.status === "delivered");
  const spent = delivered.reduce((sum, o) => sum + Number(o.total), 0);

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        {[
          ["মোট অর্ডার", bn(orders.length)],
          ["চলমান", bn(active)],
          ["মোট কেনাকাটা", taka(spent)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-200/80 bg-white px-2 py-4 text-center shadow-xs sm:p-5">
            <p className="truncate font-display text-xl font-bold text-brand-800 sm:text-3xl">{value}</p>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">{label}</p>
          </div>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="font-display text-xl font-bold text-slate-900">এখনো কোনো অর্ডার নেই</p>
          <p className="mt-2 text-slate-600">মাশরুম ডেন্টোকেয়ার প্লাস অর্ডার করে দাঁতের যত্ন শুরু করুন।</p>
          <Link href="/shop" className="btn-primary mt-6">এখনই অর্ডার করুন <ArrowRightIcon className="size-5" /></Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {orders.map((o, i) => (
            <details key={o.id} open={i === 0} className="group overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition open:shadow-lg open:shadow-brand-900/5">
              <summary className="flex cursor-pointer list-none items-center gap-3 p-4 sm:p-5 [&::-webkit-details-marker]:hidden">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-ui text-base font-bold text-slate-900 sm:text-lg">#{o.order_no}</p>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset sm:text-sm ${STATUS_META[o.status].className}`}>{STATUS_META[o.status].bn}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="truncate text-sm text-slate-500">{bnDate(o.created_at)} · {bn(o.items.reduce((s, it) => s + it.quantity, 0))} টি পণ্য</p>
                    <span className="shrink-0 font-display text-base font-bold text-brand-700 sm:text-lg">{taka(o.total)}</span>
                  </div>
                </div>
                <ChevronDownIcon className="size-5 shrink-0 text-slate-400 transition duration-300 group-open:rotate-180" />
              </summary>
              <div className="border-t border-slate-100 p-5">
                <OrderTimeline status={o.status} history={o.history} />
                <div className="mt-6 grid gap-4 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
                  <div>
                    <p className="font-semibold text-slate-500">ডেলিভারি ঠিকানা</p>
                    {o.user_id === customer.id ? (
                      <>
                        <p className="mt-1 text-slate-800">{o.customer_name}, {o.phone}</p>
                        <p className="text-slate-700">{o.address}</p>
                      </>
                    ) : (
                      // Matched only by phone number (guest order) — the phone isn't verified, so personal details stay hidden.
                      <p className="mt-1 text-slate-500">গোপনীয়তার জন্য ঠিকানা লুকানো আছে (অ্যাকাউন্টে লগইন না করে দেওয়া অর্ডার)।</p>
                    )}
                  </div>
                  <ul className="space-y-1 text-slate-700">
                    {o.items.map((it) => (
                      <li key={it.id} className="flex justify-between gap-2"><span>{it.product_name} × {bn(it.quantity)}</span><span>{taka(it.line_total)}</span></li>
                    ))}
                    <li className="flex justify-between gap-2"><span>ডেলিভারি চার্জ</span><span>{taka(o.shipping_charge)}</span></li>
                    {Number(o.discount) > 0 && <li className="flex justify-between gap-2 text-emerald-700"><span>ছাড়</span><span>− {taka(o.discount)}</span></li>}
                    <li className="flex justify-between gap-2 border-t border-dashed border-slate-300 pt-1 font-bold text-slate-900"><span>সর্বমোট</span><span>{taka(o.total)}</span></li>
                  </ul>
                </div>
              </div>
            </details>
          ))}
          <div className="pt-2 text-center">
            <Link href="/shop" className="btn-ghost">আবার অর্ডার করুন <ArrowRightIcon className="size-5" /></Link>
          </div>
        </div>
      )}
    </>
  );
}
