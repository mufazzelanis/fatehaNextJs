import Link from "next/link";
import type { ReactNode } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { queryOne } from "@/lib/db";
import { LANDING_TAG } from "@/lib/data/landings";
import { enabledGuides, GUIDE_HREF, prettyPhone, type GuideKey } from "@/lib/guides";
import { getGuideContent } from "@/lib/data/guides";
import { LandingFooter } from "@/components/landing/landing-footer";
import { GuideImage } from "./guide-image";
import { ImageZoom } from "./image-zoom";

/** The live landing page for the product, so "অর্ডার করুন" always points somewhere real. */
async function orderHref() {
  "use cache";
  cacheTag(LANDING_TAG);
  cacheLife("hours");
  const l = await queryOne<{ slug: string }>("SELECT slug FROM landing_pages WHERE status = 'published' ORDER BY id LIMIT 1");
  return l ? `/${l.slug}#order` : "/shop";
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
    </svg>
  );
}

/**
 * Shared frame for the product guide pages: brand bar with tabs between the guides, then the page,
 * then "talk to an expert" (call buttons), an order button and links to the other guides.
 * Large type throughout — many readers are older.
 */
export async function GuideShell({ current, children }: { current: GuideKey; children: ReactNode }) {
  const [order, content] = await Promise.all([orderHref(), getGuideContent()]);
  const GUIDES = enabledGuides(content);
  const GUIDE_PRODUCT = content.product;
  const GUIDE_PHONES = content.phones;
  const others = GUIDES.filter((g) => g.href !== GUIDE_HREF[current]);
  return (
    <div className="min-h-screen bg-[#f4f8f5] font-sans text-[#14261c] wrap-anywhere">
      <header className="sticky top-0 z-30 border-b border-[#1d6b4a]/10 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5">
          <Link href={order.split("#")[0]} className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-xl bg-linear-to-br from-[#1d6b4a] to-[#2f9a6a] text-xl text-white shadow-sm" aria-hidden="true">🦷</span>
            <span className="leading-tight">
              <span className="block font-display text-[17px] font-bold text-[#1d6b4a]">{GUIDE_PRODUCT}</span>
              <span className="block text-[12px] text-[#4b6356]">Fateha BD</span>
            </span>
          </Link>
          <nav aria-label="গাইড" className="-mx-1 flex w-full gap-1.5 overflow-x-auto px-1 pb-0.5 sm:w-auto [&::-webkit-scrollbar]:hidden">
            {GUIDES.map((g) => {
              const active = g.href === GUIDE_HREF[current];
              return (
                <Link key={g.href} href={g.href} aria-current={active ? "page" : undefined}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[15px] font-semibold transition ${
                    active ? "bg-[#1d6b4a] text-white shadow-sm" : "bg-[#e8f3ec] text-[#1d6b4a] hover:bg-[#d6ebdf]"}`}>
                  <span aria-hidden="true">{g.icon}</span>{g.short}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main>{children}</main>

      {/* Talk to an expert + order */}
      <section className="px-4 pb-6 pt-4">
        <div className={`mx-auto grid max-w-5xl gap-4 ${GUIDE_PHONES.length ? "md:grid-cols-[1.3fr_1fr]" : ""}`}>
          {GUIDE_PHONES.length > 0 && <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-[#123f2c] via-[#1d6b4a] to-[#2f9a6a] p-6 text-white shadow-lg sm:p-8">
            <div className="pointer-events-none absolute -right-10 -top-10 size-44 rounded-full bg-white/10 blur-2xl" />
            <p className="relative text-[15px] font-semibold text-emerald-100">আপনার দাঁতের যত্নে বিশেষজ্ঞের পরামর্শ</p>
            <h2 className="relative mt-1 font-display text-[26px] font-bold leading-snug sm:text-[30px]">যেকোনো প্রশ্নে কল করুন</h2>
            <p className="relative mt-1 text-[16px] text-white/85">{GUIDE_PRODUCT} — ব্যবহার নিয়ে কোনো প্রশ্ন থাকলে আমাদের সাথে কথা বলুন।</p>
            <div className="relative mt-5 grid gap-3 sm:grid-cols-2">
              {GUIDE_PHONES.map((p) => (
                <a key={p} href={`tel:${p}`}
                  className="flex items-center justify-center gap-2.5 rounded-2xl bg-white px-4 py-3.5 font-bold text-[#1d6b4a] shadow-md transition hover:-translate-y-0.5 active:scale-[0.98]">
                  <PhoneIcon />
                  <span className="text-[20px] tabular-nums tracking-wide">{prettyPhone(p)}</span>
                </a>
              ))}
            </div>
          </div>}
          <div className="flex flex-col justify-between gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#1d6b4a]/10 sm:p-8">
            <div>
              <p className="text-[15px] font-semibold text-[#2f9a6a]">ক্যাশ অন ডেলিভারি</p>
              <h2 className="mt-1 font-display text-[24px] font-bold leading-snug text-[#14261c]">{GUIDE_PRODUCT} অর্ডার করুন</h2>
              <p className="mt-1 text-[16px] text-[#4b6356]">পণ্য হাতে পেয়ে টাকা পরিশোধ করুন, সারা বাংলাদেশে।</p>
            </div>
            <Link href={order}
              className="flex items-center justify-center gap-2 rounded-2xl bg-[#e11d1d] px-5 py-4 text-[20px] font-bold text-white shadow-[0_8px_20px_-6px_rgb(225_29_29/0.6)] transition hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98]">
              অর্ডার করতে ক্লিক করুন <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Other guides */}
      {others.length > 0 && <section className="px-4 pb-12 pt-2">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-3 font-display text-[20px] font-bold text-[#14261c]">আরও জানুন</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {others.map((g) => (
              <Link key={g.href} href={g.href}
                className="group flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#1d6b4a]/10 transition hover:-translate-y-0.5 hover:shadow-md">
                <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#e8f3ec] text-3xl" aria-hidden="true">{g.icon}</span>
                <span className="min-w-0">
                  <span className="block font-display text-[19px] font-bold text-[#1d6b4a] group-hover:underline">{g.label}</span>
                  <span className="block text-[15px] text-[#4b6356]">{g.text}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>}

      <ImageZoom />
      <LandingFooter name="Fatehabd" />
    </div>
  );
}

/** Page hero used by every guide. */
export function GuideHero({ eyebrow, title, text, icon, image }: { eyebrow: string; title: string; text: ReactNode; icon: string; image?: string }) {
  return (
    <section className="relative overflow-hidden bg-linear-to-b from-[#dff4e6] via-[#eef8f1] to-[#f4f8f5] px-4 pb-10 pt-10 sm:pt-14">
      <div className="pointer-events-none absolute -left-16 top-10 size-56 rounded-full bg-[#9fe0b8]/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 -top-10 size-64 rounded-full bg-[#7dd3a8]/25 blur-3xl" />
      <div className="relative mx-auto max-w-3xl text-center">
        <span className="mx-auto grid size-20 place-items-center rounded-3xl bg-white text-5xl shadow-md ring-1 ring-[#1d6b4a]/10" aria-hidden="true">{icon}</span>
        <p className="mt-5 text-[16px] font-semibold text-[#2f9a6a]">{eyebrow}</p>
        <h1 className="mt-1 font-display text-[30px] font-extrabold leading-[1.25] text-[#123f2c] sm:text-[40px]">{title}</h1>
        <div className="mx-auto mt-4 max-w-2xl text-[18px] leading-[1.75] text-[#34503f]">{text}</div>
        {image && <GuideImage src={image} alt={title} sizes="(min-width: 768px) 672px, calc(100vw - 32px)" priority className="mx-auto mt-7 max-w-2xl shadow-lg ring-1 ring-[#1d6b4a]/10" />}
      </div>
    </section>
  );
}
