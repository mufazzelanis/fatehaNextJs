import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuideHero, GuideShell } from "@/components/guide/guide-shell";
import { getGuideContent } from "@/lib/data/guides";
import { GuideImage } from "@/components/guide/guide-image";

export async function generateMetadata(): Promise<Metadata> {
  const c = await getGuideContent();
  return {
    title: { absolute: `${c.pages.usage.label} — ${c.product} | Fateha BD` },
    description: `${c.product} সঠিকভাবে ব্যবহারের নিয়ম: ${c.usage.steps.map((s) => s.title).filter(Boolean).join(", ")}।`,
    alternates: { canonical: "/how-to-use" },
  };
}

const TONE = {
  amber: { ring: "ring-amber-200", badge: "bg-amber-100 text-amber-800", icon: "from-amber-300 to-orange-400", dot: "bg-amber-500" },
  indigo: { ring: "ring-indigo-200", badge: "bg-indigo-100 text-indigo-800", icon: "from-indigo-400 to-violet-500", dot: "bg-indigo-500" },
  emerald: { ring: "ring-emerald-200", badge: "bg-emerald-100 text-emerald-800", icon: "from-emerald-400 to-teal-500", dot: "bg-emerald-500" },
} as const;

export default async function HowToUsePage() {
  const c = await getGuideContent();
  if (!c.pages.usage.enabled) notFound();
  const u = c.usage;
  return (
    <GuideShell current="usage">
      <GuideHero eyebrow={c.product} title={u.title} text={u.intro} icon={c.pages.usage.icon} image={u.image} />

      <section className="px-4 pb-6">
        <ol className="mx-auto max-w-3xl space-y-5">
          {u.steps.map((s, i) => {
            const t = TONE[s.tone];
            return (
              <li key={i} className={`relative rounded-3xl bg-white p-6 shadow-sm ring-1 sm:p-8 ${t.ring}`}>
                {/* timeline line between steps */}
                {i < u.steps.length - 1 && <span aria-hidden="true" className="absolute -bottom-5 left-13 h-5 w-1 rounded bg-[#cfe6d8] sm:left-15" />}
                {s.image && <GuideImage src={s.image} alt={s.title || s.step} sizes="(min-width: 768px) 704px, calc(100vw - 80px)" className="mb-5" />}
                {(s.title || s.step || s.text || s.points.length > 0) && <div className="flex items-start gap-4 sm:gap-5">
                  <span className={`grid size-14 shrink-0 place-items-center rounded-2xl bg-linear-to-br text-3xl text-white shadow-md sm:size-16 ${t.icon}`} aria-hidden="true">{s.icon}</span>
                  <div className="min-w-0 flex-1">
                    {s.step && <span className={`inline-block rounded-full px-3 py-0.5 text-[14px] font-bold ${t.badge}`}>{s.step}</span>}
                    {s.title && <h2 className="mt-1.5 font-display text-[24px] font-bold leading-snug text-[#123f2c] sm:text-[28px]">{s.title}</h2>}
                    {s.text && <p className="mt-4 rounded-2xl bg-emerald-50 p-4 text-[18px] leading-[1.8] text-[#22382b] ring-1 ring-emerald-100">{s.text}</p>}
                    {s.points.length > 0 && (
                      <ul className="mt-4 space-y-3">
                        {s.points.map((p) => (
                          <li key={p} className="flex gap-3 text-[18px] leading-[1.7] text-[#22382b]">
                            <span className={`mt-[0.7em] size-2.5 shrink-0 rounded-full ${t.dot}`} aria-hidden="true" />
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>}
              </li>
            );
          })}
        </ol>
      </section>

      {u.notes.length > 0 && (
        <section className="px-4 pb-8 pt-4">
          <div className="mx-auto max-w-3xl rounded-3xl border-2 border-amber-300 bg-amber-50 p-6 sm:p-8">
            <h2 className="flex items-center gap-2.5 font-display text-[22px] font-bold text-amber-900 sm:text-[24px]">
              <span aria-hidden="true">⚠️</span> {u.notesTitle}
            </h2>
            <ul className="mt-4 space-y-3">
              {u.notes.map((n) => (
                <li key={n} className="flex gap-3 text-[18px] font-semibold leading-[1.7] text-amber-950">
                  <span aria-hidden="true">✔</span><span>{n}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </GuideShell>
  );
}
