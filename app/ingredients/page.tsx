import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuideHero, GuideShell } from "@/components/guide/guide-shell";
import { getGuideContent } from "@/lib/data/guides";
import { bnNum } from "@/lib/guides";

export async function generateMetadata(): Promise<Metadata> {
  const c = await getGuideContent();
  return {
    title: { absolute: `${c.pages.ingredients.label} — ${c.product} | Fateha BD` },
    description: `${c.product}-এ ব্যবহৃত ${bnNum(c.ingredients.items.length)}টি উপাদানের নাম, বৈজ্ঞানিক পরিচয়, প্রাকৃতিক উৎস ও বৈশিষ্ট্য।`,
    alternates: { canonical: "/ingredients" },
  };
}

const no = (i: number) => bnNum(i + 1).padStart(2, "০");

export default async function IngredientsPage() {
  const c = await getGuideContent();
  if (!c.pages.ingredients.enabled) notFound();
  const g = c.ingredients;
  return (
    <GuideShell current="ingredients">
      <GuideHero eyebrow={g.subtitle} title={g.title} icon={c.pages.ingredients.icon}
        text={g.text.map((t) => <p key={t} className="mt-2 first:mt-0">{t}</p>)} />

      {/* Quick index */}
      <nav aria-label="উপাদানের তালিকা" className="px-4 pb-6">
        <ul className="mx-auto flex max-w-5xl flex-wrap justify-center gap-2">
          {g.items.map((it, i) => (
            <li key={i}>
              <a href={`#ingredient-${i + 1}`} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[15px] font-semibold text-[#1d6b4a] shadow-sm ring-1 ring-[#1d6b4a]/10 transition hover:bg-[#e8f3ec]">
                <span aria-hidden="true">{it.icon}</span>{it.bn}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <section className="px-4 pb-8">
        <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2">
          {g.items.map((it, i) => (
            <article key={i} id={`ingredient-${i + 1}`}
              className={`scroll-mt-24 rounded-3xl bg-white p-6 shadow-sm ring-1 ${it.noteKind === "warning" ? "ring-2 ring-rose-200" : "ring-[#1d6b4a]/10"}`}>
              <div className="flex items-start gap-4">
                <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-[#e8f3ec] to-[#d2ecdc] text-4xl" aria-hidden="true">{it.icon}</span>
                <div className="min-w-0">
                  <p className="text-[14px] font-bold tracking-wider text-[#2f9a6a]">উপাদান {no(i)}</p>
                  <h2 className="font-display text-[24px] font-bold leading-tight text-[#123f2c]">{it.bn}</h2>
                  {it.en && <p className="text-[16px] font-semibold text-[#4b6356]">{it.en}</p>}
                </div>
              </div>
              {it.sci && (
                <p className="mt-4 rounded-xl bg-[#f4f8f5] px-4 py-2.5 text-[16px] text-[#34503f]">
                  {it.sciLabel || "বৈজ্ঞানিক নাম"}: <i className="font-semibold text-[#123f2c]">{it.sci}</i>
                </p>
              )}
              {it.intro && <p className="mt-4 text-[18px] leading-[1.75] text-[#22382b]">{it.intro}</p>}
              {it.points.length > 0 && (
                <>
                  <h3 className="mt-4 text-[16px] font-bold text-[#1d6b4a]">উপাদান পরিচিতি:</h3>
                  <ul className="mt-2 space-y-2">
                    {it.points.map((p) => (
                      <li key={p} className="flex gap-2.5 text-[17px] leading-[1.7] text-[#22382b]">
                        <span className="mt-[0.65em] size-2 shrink-0 rounded-full bg-[#2f9a6a]" aria-hidden="true" /><span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {it.footnote && <p className="mt-3 text-[16px] leading-[1.7] text-[#4b6356]">{it.footnote}</p>}
              {it.noteKind && it.note && (
                <p className={`mt-4 rounded-2xl p-4 text-[16px] leading-[1.7] ${it.noteKind === "warning"
                  ? "bg-rose-50 font-semibold text-rose-900 ring-1 ring-rose-200" : "bg-sky-50 text-sky-900 ring-1 ring-sky-100"}`}>
                  {it.noteKind === "warning" ? "⚠️ " : "ℹ️ "}{it.note}
                </p>
              )}
            </article>
          ))}
        </div>
      </section>

      {(g.closingTitle || g.closing.length > 0) && (
        <section className="px-4 pb-8">
          <div className="mx-auto max-w-3xl rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-[#1d6b4a]/10 sm:p-8">
            {g.closingTitle && <h2 className="font-display text-[24px] font-bold text-[#123f2c] sm:text-[28px]">{g.closingTitle}</h2>}
            {g.closing.map((t) => <p key={t} className="mt-3 text-[18px] leading-[1.75] text-[#34503f]">{t}</p>)}
            <p className="mt-4 font-display text-[20px] font-bold text-[#1d6b4a]">Fateha BD</p>
            {g.signature && <p className="text-[16px] text-[#4b6356]">{g.signature}</p>}
          </div>
        </section>
      )}
    </GuideShell>
  );
}
