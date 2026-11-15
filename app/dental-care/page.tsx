import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuideHero, GuideShell } from "@/components/guide/guide-shell";
import { getGuideContent } from "@/lib/data/guides";
import { GuideImage } from "@/components/guide/guide-image";
import { bnNum } from "@/lib/guides";

export async function generateMetadata(): Promise<Metadata> {
  const c = await getGuideContent();
  const total = c.care.groups.reduce((s, g) => s + g.tips.length, 0);
  return {
    title: { absolute: `${c.pages.care.label} — সুস্থ দাঁত ও মাড়ির ${bnNum(total)}টি পরামর্শ | Fateha BD` },
    description: `${c.care.groups.map((g) => g.title).join(", ")} — সহজ বাংলায় ${bnNum(total)}টি পরামর্শ।`,
    alternates: { canonical: "/dental-care" },
  };
}

const TONES = ["from-sky-400 to-cyan-500", "from-amber-300 to-orange-400", "from-rose-400 to-pink-500", "from-lime-400 to-emerald-500", "from-violet-400 to-fuchsia-500"];

export default async function DentalCarePage() {
  const c = await getGuideContent();
  if (!c.pages.care.enabled) notFound();
  const groups = c.care.groups;
  const total = groups.reduce((s, g) => s + g.tips.length, 0);
  // Tips are numbered 1…N across the whole page, in the order they are shown.
  const start = groups.map((_, gi) => groups.slice(0, gi).reduce((s, g) => s + g.tips.length, 0));
  return (
    <GuideShell current="care">
      <GuideHero eyebrow={`${bnNum(total)}টি জরুরি পরামর্শ`} title={c.care.title} text={c.care.text} icon={c.pages.care.icon} image={c.care.image} />

      {/* Topic shortcuts */}
      {groups.length > 1 && (
        <nav aria-label="বিষয়" className="z-20 border-y border-[#1d6b4a]/10 bg-[#f4f8f5]/95 px-4 py-2.5 backdrop-blur sm:sticky sm:top-16">
          <ul className="mx-auto flex max-w-5xl gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden">
            {groups.map((g, gi) => (
              <li key={gi} className="shrink-0">
                <a href={`#topic-${gi + 1}`} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[15px] font-semibold text-[#1d6b4a] shadow-sm ring-1 ring-[#1d6b4a]/10 transition hover:bg-[#e8f3ec]">
                  <span aria-hidden="true">{g.icon}</span>{g.title}
                  <span className="rounded-full bg-[#e8f3ec] px-1.5 text-[13px]">{bnNum(g.tips.length)}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="px-4 pb-6 pt-6">
        <div className="mx-auto max-w-5xl space-y-10">
          {groups.map((g, gi) => (
            <section key={gi} id={`topic-${gi + 1}`} className="scroll-mt-32 sm:scroll-mt-36">
              <h2 className="flex items-center gap-3 font-display text-[26px] font-bold text-[#123f2c]">
                <span className={`grid size-12 place-items-center rounded-2xl bg-linear-to-br text-2xl text-white shadow-sm ${TONES[gi % TONES.length]}`} aria-hidden="true">{g.icon}</span>
                {g.title}
              </h2>
              {g.image && <GuideImage src={g.image} alt={g.title} sizes="(min-width: 1024px) 1024px, calc(100vw - 32px)" className="mt-4" />}
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {g.tips.map((t, ti) => {
                  const n = start[gi] + ti + 1;
                  return (
                    <article key={ti} id={`tip-${n}`} className="scroll-mt-32 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#1d6b4a]/10 sm:scroll-mt-36">
                      {t.image && <GuideImage src={t.image} alt={t.title || `পরামর্শ ${bnNum(n)}`} sizes="(min-width: 768px) 460px, calc(100vw - 80px)" className="mb-5" />}
                      <div className="flex items-start gap-3.5">
                        <span className="relative grid size-14 shrink-0 place-items-center rounded-2xl bg-[#e8f3ec] text-3xl" aria-hidden="true">
                          {t.icon}
                          <span className="absolute -right-1.5 -top-1.5 grid min-w-6 place-items-center rounded-full bg-[#1d6b4a] px-1 text-[13px] font-bold text-white">{bnNum(n)}</span>
                        </span>
                        {t.title && <h3 className="pt-1 font-display text-[21px] font-bold leading-snug text-[#123f2c]">{t.title}</h3>}
                      </div>
                      {t.steps ? (
                        <ol className="mt-4 space-y-2.5">
                          {t.points.map((p, i) => (
                            <li key={p} className="flex gap-3 text-[17px] leading-[1.7] text-[#22382b]">
                              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-[#1d6b4a] text-[14px] font-bold text-white">{bnNum(i + 1)}</span>
                              <span>{p}</span>
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <ul className="mt-4 space-y-2.5">
                          {t.points.map((p) => (
                            <li key={p} className="flex gap-3 text-[17px] leading-[1.7] text-[#22382b]">
                              <span className="mt-[0.4em] text-[#2f9a6a]" aria-hidden="true">✔</span><span>{p}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </GuideShell>
  );
}
