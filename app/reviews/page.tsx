import type { Metadata } from "next";
import Link from "next/link";
import { GuideShell, orderHref } from "@/components/guide/guide-shell";
import { getGuideContent } from "@/lib/data/guides";
import { getDistrictNames, getPublishedReviews } from "@/lib/data/reviews";
import { ReviewForm } from "@/components/reviews/review-form";
import { ReviewCard, Stars, StripCard } from "@/components/reviews/review-card";

export async function generateMetadata(): Promise<Metadata> {
  const [c, { count, average }] = await Promise.all([getGuideContent(), getPublishedReviews()]);
  return {
    title: { absolute: `গ্রাহকদের রিভিউ — ${c.product} | Fateha BD` },
    description: count
      ? `${c.product} ব্যবহারকারীদের ${count}টি সত্যিকারের অভিজ্ঞতা — গড় রেটিং ${average.toFixed(1)}/৫। আপনার অভিজ্ঞতাও শেয়ার করুন।`
      : `${c.product} ব্যবহারের অভিজ্ঞতা শেয়ার করুন — আপনার মতামত আমাদের মান ও সেবা উন্নত করতে সাহায্য করবে।`,
    alternates: { canonical: "/reviews" },
  };
}

const bn = (s: string | number) => String(s).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);

function OrderCta({ href, big }: { href: string; big?: boolean }) {
  return (
    <Link href={href}
      className={`cta-fx inline-flex items-center justify-center gap-2.5 rounded-2xl bg-linear-to-r from-[#e11d1d] to-[#f43f3f] font-bold text-white shadow-[0_10px_26px_-8px_rgb(225_29_29/0.7)] transition hover:-translate-y-0.5 ${
        big ? "w-full px-8 py-5 text-[22px] sm:w-auto sm:text-[24px]" : "px-6 py-3.5 text-[18px]"}`}>
      <span aria-hidden="true">🛒</span> এখনই অর্ডার করুন <span aria-hidden="true" className="cta-arrow">→</span>
    </Link>
  );
}

export default async function ReviewsPage() {
  const [c, { reviews, average, count }, districts, order] = await Promise.all([
    getGuideContent(), getPublishedReviews(), getDistrictNames(), orderHref(),
  ]);
  // Moving strip: featured + text reviews; repeated so a short list still fills the screen, then doubled for a seamless loop.
  const stripBase = reviews.filter((r) => r.text).slice(0, 24);
  const strip = stripBase.length ? Array.from({ length: Math.max(1, Math.ceil(6 / stripBase.length)) }, () => stripBase).flat() : [];
  const five = reviews.filter((r) => r.rating === 5).length;

  return (
    <GuideShell current="reviews">
      {/* Hero */}
      <section className="relative overflow-hidden bg-linear-to-b from-[#dff4e6] via-[#eef8f1] to-[#f4f8f5] px-4 pb-8 pt-10 sm:pt-14">
        <div className="pointer-events-none absolute -left-16 top-10 size-56 rounded-full bg-[#9fe0b8]/30 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 -top-10 size-64 rounded-full bg-[#fcd34d]/25 blur-3xl" />
        <div className="relative mx-auto max-w-3xl text-center">
          <p className="text-[16px] font-semibold text-[#2f9a6a]">{c.product}</p>
          <h1 className="mt-1 font-display text-[32px] font-extrabold leading-tight text-[#123f2c] sm:text-[44px]">গ্রাহকদের অভিজ্ঞতা</h1>
          {count > 0 ? (
            <div className="mx-auto mt-5 inline-flex flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-3xl bg-white px-6 py-4 shadow-md ring-1 ring-[#1d6b4a]/10">
              <span className="font-display text-[40px] font-extrabold leading-none text-[#123f2c]">{bn(average.toFixed(1))}</span>
              <span className="text-left">
                <Stars rating={Math.round(average)} size={22} />
                <span className="block text-[15px] text-[#4b6356]">{bn(count)}টি রিভিউ · {bn(Math.round((five / count) * 100))}% দিয়েছেন ৫ স্টার</span>
              </span>
            </div>
          ) : (
            <p className="mx-auto mt-4 max-w-xl text-[18px] leading-relaxed text-[#34503f]">
              {c.product} ব্যবহার করেছেন? আপনার অভিজ্ঞতা শেয়ার করুন — আপনার মতামত আমাদের পণ্যের মান ও গ্রাহকসেবা উন্নত করতে সাহায্য করবে।
            </p>
          )}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a href="#review-form" className="cta-shine inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-[18px] font-bold text-[#1d6b4a] shadow-sm ring-2 ring-[#1d6b4a]/20 transition hover:-translate-y-0.5 hover:ring-[#1d6b4a]/40">
              ✍️ রিভিউ দিন
            </a>
            <OrderCta href={order} />
          </div>
        </div>
      </section>

      {/* Moving reviews */}
      {strip.length > 0 && (
        <section aria-label="গ্রাহকদের রিভিউ" className="reviews-strip relative overflow-hidden py-6 [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]">
          <div className="reviews-track flex w-max gap-4 px-2" style={{ ["--reviews-speed" as string]: `${strip.length * 7}s` }}>
            {[0, 1].map((copy) => (
              <div key={copy} className="flex gap-4" aria-hidden={copy === 1 || undefined}>
                {strip.map((r, i) => <StripCard key={`${copy}-${i}`} r={r} />)}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Form */}
      <section id="review-form" className="scroll-mt-20 px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 text-center">
            <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-white text-4xl shadow-md ring-1 ring-[#1d6b4a]/10" aria-hidden="true">💬</span>
            <h2 className="mt-4 font-display text-[28px] font-extrabold text-[#123f2c] sm:text-[34px]">আপনার অভিজ্ঞতা শেয়ার করুন</h2>
            <p className="mx-auto mt-2 max-w-xl text-[17px] leading-relaxed text-[#4b6356]">
              আপনি {c.product} ব্যবহার করেছেন? পণ্যটি ব্যবহারের অভিজ্ঞতা, আপনার মতামত কিংবা পরামর্শ আমাদের সঙ্গে শেয়ার করুন।
            </p>
          </div>
          <ReviewForm districts={districts} product={c.product} />
        </div>
      </section>

      {/* All reviews */}
      <section id="all-reviews" className="scroll-mt-20 px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
            <h2 className="font-display text-[26px] font-extrabold text-[#123f2c] sm:text-[30px]">সব রিভিউ {count > 0 && <span className="text-[#2f9a6a]">({bn(count)})</span>}</h2>
            {count > 0 && <span className="text-[15px] text-[#6b8576]">যাচাই করা গ্রাহকদের মতামত</span>}
          </div>
          {count > 0 ? (
            <div className="columns-1 gap-4 space-y-4 md:columns-2">
              {reviews.map((r) => <ReviewCard key={r.id} r={r} />)}
            </div>
          ) : (
            <div className="rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-[#1d6b4a]/10">
              <p className="text-5xl" aria-hidden="true">🌱</p>
              <p className="mt-3 font-display text-[22px] font-bold text-[#123f2c]">প্রথম রিভিউটি আপনিই দিন!</p>
              <a href="#review-form" className="mt-4 inline-block text-[17px] font-semibold text-[#1d6b4a] underline underline-offset-4">রিভিউ লিখুন ↑</a>
            </div>
          )}
        </div>
      </section>

      {/* Promo */}
      <section className="px-4 pb-4 pt-6">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-linear-to-br from-[#123f2c] via-[#1d6b4a] to-[#2f9a6a] px-6 py-10 text-center text-white shadow-xl sm:px-12 sm:py-14">
          <div className="pointer-events-none absolute -left-10 -top-10 size-48 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-16 -right-10 size-64 rounded-full bg-[#fcd34d]/20 blur-3xl" />
          <p className="relative text-[16px] font-semibold text-emerald-100">{count > 0 ? `${bn(count)} জন গ্রাহকের আস্থা` : "ক্যাশ অন ডেলিভারি · সারা বাংলাদেশে"}</p>
          <h2 className="relative mt-2 font-display text-[28px] font-extrabold leading-snug sm:text-[38px]">আপনিও পেতে চান সুস্থ দাঁত ও মাড়ি?</h2>
          <p className="relative mx-auto mt-2 max-w-xl text-[17px] text-white/85">{c.product} — পণ্য হাতে পেয়ে টাকা পরিশোধ করুন।</p>
          <div className="relative mt-7"><OrderCta href={order} big /></div>
        </div>
      </section>
    </GuideShell>
  );
}
