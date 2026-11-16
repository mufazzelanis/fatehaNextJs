import Link from "next/link";
import { getGuideContent } from "@/lib/data/guides";
import { enabledGuides } from "@/lib/guides";
import { responsive } from "@/lib/media";
import { packagePrice } from "@/lib/checkout";
import type { Landing } from "@/lib/data/landings";
import { QuickOrderForm } from "./quick-order-form";
import { LandingFooter } from "./landing-footer";
import { LandingExtras } from "./landing-extras";
import { ViewContentEvent } from "@/components/meta/meta-pixel";

type Product = { id: number; name: string; weight: string | null; price: number; image: string; stock: number };
const tk = (n: number) => `৳${Math.round(n).toLocaleString("en-IN")}`;

function Check() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" className="mt-0.5 shrink-0 text-[#1d9a5b]">
      <circle cx="12" cy="12" r="11" fill="currentColor" opacity=".14" /><path d="m7 12.5 3.2 3.2L17 9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Quick order page (landing type "order"): product + key points, package cards (1 / 2-jar combo / 3-jar combo)
 * and the order form — one short page. Mobile: stacked with a fixed total bar; computer: product beside the form.
 */
export async function QuickOrderPage({ landing: l, product, preview, settings }: {
  landing: Landing; product: Product | null; preview: boolean;
  settings: { footerName: string; contactPhone: string; whatsapp: string; floatingButtons: boolean };
}) {
  const c = l.content;
  const q = c.quick;
  const guides = enabledGuides(await getGuideContent());
  const pk = l.checkout.packages;
  const cheapest = product && pk.enabled ? Math.min(...pk.items.map((p) => packagePrice(p, product.price) / p.qty)) : product?.price ?? 0;

  return (
    <div className="min-h-screen bg-[#f4f8f5] pb-28 font-sans text-[#14261c] wrap-break-word 2xl:pb-0">
      {/* Header */}
      <header className="border-b border-[#1d6b4a]/10 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 2xl:max-w-[1440px]">
          <span className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-xl bg-linear-to-br from-[#1d6b4a] to-[#2f9a6a] text-xl text-white shadow-sm" aria-hidden="true">🦷</span>
            <span className="font-display text-[18px] font-bold leading-tight text-[#1d6b4a]">{settings.footerName || "Fateha BD"}</span>
          </span>
          {settings.contactPhone && (
            <a href={`tel:${settings.contactPhone}`} data-track="call" className="flex items-center gap-2 rounded-full bg-[#e8f3ec] px-3.5 py-2 text-[15px] font-bold text-[#1d6b4a] active:scale-95">
              <span aria-hidden="true">📞</span><span className="tabular-nums">{settings.contactPhone}</span>
            </a>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-5 sm:pt-8 2xl:max-w-[1440px]">
        {product ? (
          <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start lg:gap-8 xl:grid-cols-[380px_minmax(0,1fr)]">
            {/* Product */}
            <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-[#1d6b4a]/10 lg:sticky lg:top-6">
              <div className="grid grid-cols-[112px_1fr] items-center gap-4 bg-linear-to-br from-[#e6f6ec] to-white p-4 sm:grid-cols-[150px_1fr] lg:grid-cols-1 lg:p-6">
                <div className="grid aspect-square place-items-center rounded-2xl bg-white p-2 shadow-md ring-1 ring-black/5 lg:mx-auto lg:w-4/5 lg:p-5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img {...responsive(product.image, "(min-width: 1024px) 300px, 150px", [192, 256, 384, 512])} alt={product.name}
                    width={400} height={400} fetchPriority="high" className="size-full object-contain" />
                </div>
                <div className="lg:text-center">
                  <h1 className="font-display text-[23px] font-bold leading-snug text-[#123f2c] sm:text-[28px]">{q.title || product.name}</h1>
                  {product.weight && <p className="text-[15px] text-[#4b6356]">{product.weight}</p>}
                  <p className="mt-1.5 text-[16px] text-[#34503f]">
                    {pk.enabled && cheapest < product.price ? <>প্রতিটি মাত্র <b className="text-[22px] text-[#c81e1e]">{tk(cheapest)}</b> থেকে</>
                      : <>মূল্য <b className="text-[22px] text-[#c81e1e]">{tk(product.price)}</b></>}
                  </p>
                </div>
              </div>
              <div className="space-y-4 p-4 sm:p-6">
                {q.subtitle && <p className="text-[17px] leading-relaxed text-[#34503f]">{q.subtitle}</p>}
                {q.points.length > 0 && (
                  <ul className="space-y-2.5">
                    {q.points.map((p) => <li key={p} className="flex gap-2.5 text-[17px] leading-snug text-[#22382b]"><Check />{p}</li>)}
                  </ul>
                )}
                {q.trust.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {q.trust.map((t) => <span key={t} className="rounded-full bg-[#f4f8f5] px-3 py-1.5 text-[14px] font-semibold text-[#1d6b4a] ring-1 ring-[#1d6b4a]/10">{t}</span>)}
                  </div>
                )}
              </div>
            </section>

            {/* Packages + form */}
            <div id="order" className="scroll-mt-4">
              <QuickOrderForm landingId={l.id} config={l.checkout}
                product={{ id: product.id, name: product.name, weight: product.weight, price: Number(product.price), image: product.image, stock: product.stock }} />
            </div>
          </div>
        ) : (
          <p className="rounded-3xl bg-white p-10 text-center text-[18px] text-[#4b6356]">পণ্যটি এই মুহূর্তে পাওয়া যাচ্ছে না।</p>
        )}

        {/* Guides */}
        {guides.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 font-display text-[22px] font-bold text-[#14261c]">{q.guidesTitle}</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {guides.map((g) => (
                <Link key={g.href} href={g.href} className="group flex items-center gap-3.5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#1d6b4a]/10 transition hover:-translate-y-0.5 hover:shadow-md">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#e8f3ec] text-2xl" aria-hidden="true">{g.icon}</span>
                  <span className="min-w-0">
                    <span className="block font-display text-[18px] font-bold text-[#1d6b4a] group-hover:underline">{g.label}</span>
                    <span className="block text-[14px] leading-snug text-[#4b6356]">{g.text}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <div className="mt-8"><LandingFooter name={l.footer_name || settings.footerName} /></div>
      {/* live visitors (heartbeat + clicks), view counter, floating call/WhatsApp */}
      <LandingExtras landingId={l.id} preview={preview}
        phone={settings.floatingButtons ? settings.contactPhone : ""} whatsapp={settings.floatingButtons ? settings.whatsapp : ""} />
      {product && <ViewContentEvent product={{ id: product.id, name: product.name, price: Number(product.price) }} />}
    </div>
  );
}
