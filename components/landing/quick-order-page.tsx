import { responsive } from "@/lib/media";
import { packagePrice } from "@/lib/checkout";
import type { Landing } from "@/lib/data/landings";
import { QuickOrderForm } from "./quick-order-form";
import { LandingFooter } from "./landing-footer";
import { LandingExtras } from "./landing-extras";
import { ViewContentEvent } from "@/components/meta/meta-pixel";
import Link from "next/link";
import { getPublishedReviews } from "@/lib/data/reviews";
import { Stars } from "@/components/reviews/review-card";
import type { PublicReview } from "@/lib/reviews";

type Product = { id: number; name: string; weight: string | null; price: number; image: string; stock: number };
const tk = (n: number) => `৳${Math.round(n).toLocaleString("en-IN")}`;
const bn = (s: string | number) => String(s).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);

/** One review on the order page: stars, the words, who (photo thumbnail if the customer allowed it). */
function MiniReview({ r, desktop = true }: { r: PublicReview; desktop?: boolean }) {
  return (
    <article className={`${desktop ? "" : "lg:hidden "}flex w-[82%] shrink-0 snap-start flex-col gap-3 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#1d6b4a]/10 sm:w-[46%] lg:w-auto`}>
      <div className="flex items-center justify-between gap-2">
        <Stars rating={r.rating} />
        {r.experience && <span className="rounded-full bg-[#e8f3ec] px-2.5 py-0.5 text-[13px] font-semibold text-[#1d6b4a]">{r.experience}</span>}
      </div>
      <p className="line-clamp-5 flex-1 text-[16px] leading-[1.7] text-[#22382b]">“{r.text}”</p>
      <div className="flex items-center gap-3">
        {r.photos[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/media/${r.photos[0]}?w=96`} alt="" width={44} height={44} loading="lazy" className="size-11 shrink-0 rounded-full object-cover ring-2 ring-white shadow" />
        ) : (
          <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-linear-to-br from-[#1d6b4a] to-[#2f9a6a] text-[16px] font-bold text-white">{r.name.trim()[0] ?? "★"}</span>
        )}
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 truncate text-[15.5px] font-bold text-[#123f2c]">{r.name}<span className="grid size-4 shrink-0 place-items-center rounded-full bg-[#2f9a6a] text-[9px] text-white" aria-label="যাচাইকৃত">✓</span></span>
          <span className="block truncate text-[13.5px] text-[#6b8576]">{[r.district, r.duration && `ব্যবহার: ${r.duration}`].filter(Boolean).join(" · ")}</span>
        </span>
      </div>
    </article>
  );
}

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
  const pk = l.checkout.packages;
  const { reviews, average, count } = await getPublishedReviews();
  const shown = reviews.filter((r) => r.text).slice(0, 6);
  // Computer grid: full rows only (3 or 6); phones swipe through all of them.
  const onDesktop = shown.length >= 6 ? 6 : Math.min(shown.length, 3);
  const cheapest = product && pk.enabled ? Math.min(...pk.items.map((p) => packagePrice(p, product.price) / p.qty)) : product?.price ?? 0;

  return (
    <div className="min-h-screen bg-[#f4f8f5] pb-28 font-sans text-[#14261c] wrap-break-word 2xl:pb-0">
      {/* Header */}
      <header className="border-b border-[#1d6b4a]/10 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 2xl:max-w-360">
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

      <main className="mx-auto max-w-6xl px-4 pt-5 sm:pt-8 2xl:max-w-360">
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
                  {product.weight && <p className="text-[15px] text-[#4b6356]">ওজন: {product.weight}</p>}
                  {/* The price of one jar first; the combo saving is a separate, smaller line. */}
                  <p className="mt-1.5 text-[16px] text-[#34503f]">মূল্য <b className="text-[24px] text-[#c81e1e]">{tk(product.price)}</b> <span className="text-[14px]">(প্রতিটি)</span></p>
                  {pk.enabled && cheapest < product.price && (
                    <p className="mt-1 inline-block rounded-full bg-[#fde8e8] px-3 py-1 text-[14px] font-semibold text-[#c81e1e]">
                      কম্বোতে কিনলে প্রতিটি পড়বে {tk(cheapest)}
                    </p>
                  )}
                  {count > 0 && (
                    <a href="#reviews" className="mt-2 flex w-max items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[14px] font-semibold text-[#34503f] shadow-sm ring-1 ring-[#1d6b4a]/10 transition hover:ring-[#1d6b4a]/30 lg:mx-auto">
                      <Stars rating={Math.round(average)} size={15} /> {bn(average.toFixed(1))} · {bn(count)}টি রিভিউ
                    </a>
                  )}
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

        {/* Customer reviews (approved in Admin → Reviews) — swipe on phones, grid on computers */}
        {shown.length > 0 ? (
          <section id="reviews" aria-labelledby="reviews-title" className="mt-10 scroll-mt-4">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
              <div>
                <h2 id="reviews-title" className="font-display text-[24px] font-bold text-[#14261c] sm:text-[28px]">গ্রাহকরা যা বলছেন</h2>
                <p className="mt-0.5 flex items-center gap-2 text-[15px] text-[#4b6356]">
                  <Stars rating={Math.round(average)} size={17} /> <b className="text-[#14261c]">{bn(average.toFixed(1))}</b> · {bn(count)}টি যাচাই করা রিভিউ
                </p>
              </div>
              <Link href="/reviews" className="cta-shine hidden items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-[15px] font-bold text-[#1d6b4a] shadow-sm ring-1 ring-[#1d6b4a]/15 transition hover:ring-[#1d6b4a]/40 sm:flex">
                সব রিভিউ দেখুন <span aria-hidden="true" className="cta-arrow">→</span>
              </Link>
            </div>
            <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-4 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
              {shown.map((r, i) => <MiniReview key={r.id} r={r} desktop={i < onDesktop} />)}
            </div>
            {shown.length > 1 && <p className="mt-1 text-center text-[13px] text-[#6b8576] lg:hidden" aria-hidden="true">← সোয়াইপ করে আরও দেখুন →</p>}
            <Link href="/reviews" className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-[17px] font-bold text-[#1d6b4a] shadow-sm ring-1 ring-[#1d6b4a]/15 active:scale-[0.98] sm:hidden">
              ⭐ সব রিভিউ দেখুন <span aria-hidden="true">→</span>
            </Link>
          </section>
        ) : (
          <Link href="/reviews" className="mt-8 flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-[#1d6b4a]/10 transition hover:ring-[#1d6b4a]/30">
            <span className="text-2xl" aria-hidden="true">⭐</span>
            <span className="min-w-0 flex-1 text-[16px] text-[#34503f]"><b className="text-[#14261c]">গ্রাহকদের রিভিউ</b> — অন্যদের অভিজ্ঞতা পড়ুন বা নিজের অভিজ্ঞতা শেয়ার করুন</span>
            <span className="text-[#1d6b4a]" aria-hidden="true">→</span>
          </Link>
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
