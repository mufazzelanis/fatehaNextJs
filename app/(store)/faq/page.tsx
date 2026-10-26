import type { Metadata } from "next";
import { getPaymentConfig, getStoreConfig } from "@/lib/data/catalog";
import { enabledMethods, PAYMENT_LABEL } from "@/lib/payments";
import { bdt } from "@/lib/store-config";
import { ChevronDownIcon } from "@/components/icons";

export const metadata: Metadata = { title: "FAQ" };

export default async function FaqPage() {
  const [cfg, pay] = await Promise.all([getStoreConfig(), getPaymentConfig()]);
  const methods = enabledMethods(pay).map((m) => PAYMENT_LABEL[m]).join(", ");
  const faqs: [string, string][] = [
    ["Are your products authentic?", "Yes. Every product is imported, sealed and checked before dispatch. If anything looks wrong when it arrives, contact us right away."],
    ["How can I pay?", `You can pay with ${methods}. With Cash on Delivery you pay the delivery person when the parcel reaches you.`],
    ["How much is delivery?", `Inside Dhaka ${bdt(cfg.deliveryInside)}, outside Dhaka ${bdt(cfg.deliveryOutside)}.${cfg.freeDeliveryOver ? ` Orders above ${bdt(cfg.freeDeliveryOver)} get free delivery.` : ""}`],
    ["How long does delivery take?", cfg.deliveryDays],
    ["How do I track my order?", "Use the Track Order page with your order number and mobile number, or sign in to your account to see every order and its status."],
    ["Can I return a product?", cfg.returnDays ? `Unopened products can be returned within ${cfg.returnDays} days. See the return policy for details.` : "Please contact us and we will help."],
  ];
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Frequently asked questions</h1>
      <div className="mt-6 space-y-3">
        {faqs.map(([q, a], i) => (
          <details key={q} open={i === 0} className="group rounded-2xl border border-slate-200/80 bg-white px-5 open:shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold text-ink [&::-webkit-details-marker]:hidden">
              {q}<ChevronDownIcon className="size-5 shrink-0 text-slate-400 transition group-open:rotate-180" />
            </summary>
            <p className="pb-4 leading-relaxed text-ink-soft">{a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
