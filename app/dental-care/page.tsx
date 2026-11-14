import type { Metadata } from "next";
import { GuideHero, GuideShell } from "@/components/guide/guide-shell";
import { bnNum, CARE_GROUPS, CARE_INTRO } from "@/lib/guides";

export const metadata: Metadata = {
  title: { absolute: "দাঁতের যত্ন গাইড — সুস্থ দাঁত ও মাড়ির ২৬টি পরামর্শ | Fateha BD" },
  description: "কখন ও কীভাবে ব্রাশ করবেন, টুথব্রাশ, ফ্লস, মাড়ি, শিশুদের দাঁত, খাবার ও দাঁতের সাধারণ সমস্যা — সহজ বাংলায় ২৬টি পরামর্শ।",
  alternates: { canonical: "/dental-care" },
};

const GROUP_TONE: Record<string, string> = {
  brushing: "from-sky-400 to-cyan-500", daily: "from-amber-300 to-orange-400", problems: "from-rose-400 to-pink-500",
  food: "from-lime-400 to-emerald-500", kids: "from-violet-400 to-fuchsia-500",
};

export default function DentalCarePage() {
  const total = CARE_GROUPS.reduce((s, g) => s + g.tips.length, 0);
  return (
    <GuideShell current="/dental-care">
      <GuideHero eyebrow={`${bnNum(total)}টি জরুরি পরামর্শ`} title={CARE_INTRO.title} text={CARE_INTRO.text} icon="🦷" />

      {/* Topic shortcuts */}
      <nav aria-label="বিষয়" className="z-20 border-y border-[#1d6b4a]/10 bg-[#f4f8f5]/95 px-4 py-2.5 backdrop-blur sm:sticky sm:top-16">
        <ul className="mx-auto flex max-w-5xl gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden">
          {CARE_GROUPS.map((g) => (
            <li key={g.id} className="shrink-0">
              <a href={`#${g.id}`} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[15px] font-semibold text-[#1d6b4a] shadow-sm ring-1 ring-[#1d6b4a]/10 transition hover:bg-[#e8f3ec]">
                <span aria-hidden="true">{g.icon}</span>{g.title}
                <span className="rounded-full bg-[#e8f3ec] px-1.5 text-[13px]">{bnNum(g.tips.length)}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="px-4 pb-6 pt-6">
        <div className="mx-auto max-w-5xl space-y-10">
          {CARE_GROUPS.map((g) => (
            <section key={g.id} id={g.id} className="scroll-mt-32 sm:scroll-mt-36">
              <h2 className="flex items-center gap-3 font-display text-[26px] font-bold text-[#123f2c]">
                <span className={`grid size-12 place-items-center rounded-2xl bg-linear-to-br text-2xl text-white shadow-sm ${GROUP_TONE[g.id]}`} aria-hidden="true">{g.icon}</span>
                {g.title}
              </h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {g.tips.map((t) => (
                  <article key={t.n} id={`tip-${t.n}`} className="scroll-mt-32 sm:scroll-mt-36 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#1d6b4a]/10">
                    <div className="flex items-start gap-3.5">
                      <span className="relative grid size-14 shrink-0 place-items-center rounded-2xl bg-[#e8f3ec] text-3xl" aria-hidden="true">
                        {t.icon}
                        <span className="absolute -right-1.5 -top-1.5 grid min-w-6 place-items-center rounded-full bg-[#1d6b4a] px-1 text-[13px] font-bold text-white">{bnNum(t.n)}</span>
                      </span>
                      <h3 className="pt-1 font-display text-[21px] font-bold leading-snug text-[#123f2c]">{t.title}</h3>
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
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </GuideShell>
  );
}
