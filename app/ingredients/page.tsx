import type { Metadata } from "next";
import { GuideHero, GuideShell } from "@/components/guide/guide-shell";
import { GUIDE_PRODUCT, INGREDIENTS, INGREDIENTS_INTRO } from "@/lib/guides";

export const metadata: Metadata = {
  title: { absolute: `উপাদান পরিচিতি — ${GUIDE_PRODUCT} | Fateha BD` },
  description: `${GUIDE_PRODUCT}-এ ব্যবহৃত ১৪টি উপাদানের নাম, বৈজ্ঞানিক পরিচয়, প্রাকৃতিক উৎস ও বৈশিষ্ট্য।`,
  alternates: { canonical: "/ingredients" },
};

export default function IngredientsPage() {
  return (
    <GuideShell current="/ingredients">
      <GuideHero eyebrow={INGREDIENTS_INTRO.subtitle} title={INGREDIENTS_INTRO.title} icon="🌿"
        text={INGREDIENTS_INTRO.text.map((t) => <p key={t} className="mt-2 first:mt-0">{t}</p>)} />

      {/* Quick index */}
      <nav aria-label="উপাদানের তালিকা" className="px-4 pb-6">
        <ul className="mx-auto flex max-w-5xl flex-wrap justify-center gap-2">
          {INGREDIENTS.map((g) => (
            <li key={g.no}>
              <a href={`#ingredient-${g.no}`} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[15px] font-semibold text-[#1d6b4a] shadow-sm ring-1 ring-[#1d6b4a]/10 transition hover:bg-[#e8f3ec]">
                <span aria-hidden="true">{g.icon}</span>{g.bn}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <section className="px-4 pb-8">
        <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2">
          {INGREDIENTS.map((g) => (
            <article key={g.no} id={`ingredient-${g.no}`}
              className={`scroll-mt-24 rounded-3xl bg-white p-6 shadow-sm ring-1 ${g.note?.kind === "warning" ? "ring-2 ring-rose-200" : "ring-[#1d6b4a]/10"}`}>
              <div className="flex items-start gap-4">
                <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-[#e8f3ec] to-[#d2ecdc] text-4xl" aria-hidden="true">{g.icon}</span>
                <div className="min-w-0">
                  <p className="text-[14px] font-bold tracking-wider text-[#2f9a6a]">উপাদান {g.no}</p>
                  <h2 className="font-display text-[24px] font-bold leading-tight text-[#123f2c]">{g.bn}</h2>
                  <p className="text-[16px] font-semibold text-[#4b6356]">{g.en}</p>
                </div>
              </div>
              {g.sci && (
                <p className="mt-4 rounded-xl bg-[#f4f8f5] px-4 py-2.5 text-[16px] text-[#34503f]">
                  {g.sciLabel}: <i className="font-semibold not-italic text-[#123f2c] [font-style:italic]">{g.sci}</i>
                </p>
              )}
              <p className="mt-4 text-[18px] leading-[1.75] text-[#22382b]">{g.intro}</p>
              <h3 className="mt-4 text-[16px] font-bold text-[#1d6b4a]">উপাদান পরিচিতি:</h3>
              <ul className="mt-2 space-y-2">
                {g.points.map((p) => (
                  <li key={p} className="flex gap-2.5 text-[17px] leading-[1.7] text-[#22382b]">
                    <span className="mt-[0.65em] size-2 shrink-0 rounded-full bg-[#2f9a6a]" aria-hidden="true" /><span>{p}</span>
                  </li>
                ))}
              </ul>
              {g.footnote && <p className="mt-3 text-[16px] leading-[1.7] text-[#4b6356]">{g.footnote}</p>}
              {g.note && (
                <p className={`mt-4 rounded-2xl p-4 text-[16px] leading-[1.7] ${g.note.kind === "warning"
                  ? "bg-rose-50 font-semibold text-rose-900 ring-1 ring-rose-200" : "bg-sky-50 text-sky-900 ring-1 ring-sky-100"}`}>
                  {g.note.kind === "warning" ? "⚠️ " : "ℹ️ "}{g.note.text}
                </p>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="px-4 pb-8">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-[#1d6b4a]/10 sm:p-8">
          <h2 className="font-display text-[24px] font-bold text-[#123f2c] sm:text-[28px]">{INGREDIENTS_INTRO.closingTitle}</h2>
          {INGREDIENTS_INTRO.closing.map((t) => <p key={t} className="mt-3 text-[18px] leading-[1.75] text-[#34503f]">{t}</p>)}
          <p className="mt-4 font-display text-[20px] font-bold text-[#1d6b4a]">Fateha BD</p>
          <p className="text-[16px] text-[#4b6356]">{INGREDIENTS_INTRO.signature}</p>
        </div>
      </section>
    </GuideShell>
  );
}
