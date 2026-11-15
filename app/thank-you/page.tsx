import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GuideShell } from "@/components/guide/guide-shell";
import { GuideImage } from "@/components/guide/guide-image";
import { FeedbackForm } from "@/components/guide/feedback-form";
import { getGuideContent } from "@/lib/data/guides";
import { prettyPhone } from "@/lib/guides";

export async function generateMetadata(): Promise<Metadata> {
  const c = await getGuideContent();
  return {
    title: { absolute: `${c.thanks.title} — ${c.product} | Fateha BD` },
    description: c.thanks.text.slice(0, 160),
    alternates: { canonical: "/thank-you" },
  };
}

/** Icon + colour for a follow link, from its address. */
function linkStyle(url: string) {
  if (/facebook\.com|fb\.(com|me)/i.test(url)) return { icon: "f", cls: "bg-[#1877f2] text-white" };
  if (/youtube\.com|youtu\.be/i.test(url)) return { icon: "▶", cls: "bg-[#ff0000] text-white" };
  if (/wa\.me|whatsapp/i.test(url)) return { icon: "✆", cls: "bg-[#25d366] text-white" };
  if (/instagram\.com/i.test(url)) return { icon: "◎", cls: "bg-linear-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white" };
  if (/tiktok\.com/i.test(url)) return { icon: "♪", cls: "bg-black text-white" };
  if (url.startsWith("tel:")) return { icon: "☎", cls: "bg-[#1d6b4a] text-white" };
  return { icon: "↗", cls: "bg-white text-[#1d6b4a] ring-1 ring-[#1d6b4a]/20" };
}
const external = (href: string) => /^https?:/.test(href);

export default async function ThankYouPage() {
  const c = await getGuideContent();
  if (!c.pages.thanks.enabled) notFound();
  const t = c.thanks;
  // No links set yet: WhatsApp + call the first expert number.
  const phone = c.phones[0];
  const links = t.links.length ? t.links : phone
    ? [{ label: "WhatsApp", url: `https://wa.me/88${phone.replace(/^\+?88/, "")}` }, { label: `কল করুন ${prettyPhone(phone)}`, url: `tel:${phone}` }]
    : [];

  return (
    <GuideShell current="thanks">
      {/* Hero */}
      <section className="relative overflow-hidden bg-linear-to-b from-[#dff4e6] via-[#eef8f1] to-[#f4f8f5] px-4 pb-10 pt-10 sm:pt-14">
        <div className="pointer-events-none absolute -left-16 top-10 size-56 rounded-full bg-[#9fe0b8]/30 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 -top-10 size-64 rounded-full bg-[#7dd3a8]/25 blur-3xl" />
        <div className="relative mx-auto max-w-3xl text-center">
          <span className="mx-auto grid size-20 place-items-center rounded-full bg-white text-5xl shadow-md ring-1 ring-[#1d6b4a]/10 motion-safe:animate-float" aria-hidden="true">💚</span>
          <h1 className="mt-5 font-display text-[44px] font-extrabold leading-tight text-[#123f2c] sm:text-[56px]">{t.title}</h1>
          {t.subtitle && <p className="mt-1 font-display text-[22px] font-bold text-[#2f9a6a] sm:text-[26px]">{t.subtitle}</p>}
          {t.text && <p className="mx-auto mt-4 max-w-2xl text-[19px] leading-[1.8] text-[#34503f]">{t.text}</p>}
          {t.image && <GuideImage src={t.image} alt={t.title} sizes="(min-width: 768px) 672px, calc(100vw - 32px)" priority className="mx-auto mt-8 max-w-2xl shadow-lg ring-1 ring-[#1d6b4a]/10" />}
        </div>
      </section>

      {/* Sections: picture beside the text on large screens (alternating), stacked on phones */}
      {t.sections.length > 0 && (
        <div className="space-y-6 px-4 pb-6">
          {t.sections.map((s, i) => (
            <section key={i} className="mx-auto max-w-5xl overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-[#1d6b4a]/10">
              <div className={`grid items-center gap-6 p-6 sm:p-8 ${s.image ? "md:grid-cols-2" : ""}`}>
                {s.image && (
                  <div className={i % 2 ? "md:order-2" : ""}>
                    <GuideImage src={s.image} alt={s.title} sizes="(min-width: 768px) 440px, calc(100vw - 80px)" />
                  </div>
                )}
                <div className={s.image ? "" : "mx-auto max-w-2xl text-center"}>
                  {s.title && <h2 className="font-display text-[28px] font-bold leading-snug text-[#123f2c] sm:text-[32px]">{s.title}</h2>}
                  {s.text && <p className="mt-3 whitespace-pre-line text-[18px] leading-[1.8] text-[#34503f]">{s.text}</p>}
                  {s.buttons.length > 0 && (
                    <div className="mt-5 space-y-3">
                      {s.buttons.map((b, bi) => {
                        const inner = (
                          <>
                            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#e8f3ec] text-3xl" aria-hidden="true">{b.icon}</span>
                            <span className="min-w-0 flex-1">
                              <span className="block font-display text-[20px] font-bold text-[#1d6b4a] group-hover:underline">{b.label}</span>
                              {b.text && <span className="block text-[16px] leading-snug text-[#4b6356]">{b.text}</span>}
                            </span>
                            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#1d6b4a] text-xl text-white transition group-hover:translate-x-1" aria-hidden="true">→</span>
                          </>
                        );
                        const cls = "group flex items-center gap-4 rounded-2xl bg-[#f4f8f5] p-4 ring-1 ring-[#1d6b4a]/10 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md";
                        return external(b.href) || b.href.startsWith("tel:")
                          ? <a key={bi} href={b.href} target={external(b.href) ? "_blank" : undefined} rel="noopener noreferrer" className={cls}>{inner}</a>
                          : <Link key={bi} href={b.href} className={cls}>{inner}</Link>;
                      })}
                    </div>
                  )}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Feedback */}
      {t.feedbackOn && (
        <section id="feedback" className="scroll-mt-24 px-4 pb-6">
          <div className="mx-auto max-w-3xl rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#1d6b4a]/10 sm:p-8">
            <div className="mb-5 text-center">
              <span className="text-4xl" aria-hidden="true">⭐</span>
              <h2 className="mt-2 font-display text-[28px] font-bold text-[#123f2c]">{t.feedbackTitle}</h2>
              {t.feedbackText && <p className="mx-auto mt-2 max-w-xl text-[18px] leading-[1.75] text-[#34503f]">{t.feedbackText}</p>}
            </div>
            <FeedbackForm button={t.feedbackButton} />
          </div>
        </section>
      )}

      {/* Stay with us */}
      {(t.followTitle || links.length > 0) && (
        <section className="px-4 pb-6">
          <div className="mx-auto max-w-3xl rounded-3xl bg-linear-to-br from-[#e8f3ec] to-[#d2ecdc] p-6 text-center sm:p-8">
            {t.followTitle && <h2 className="font-display text-[26px] font-bold text-[#123f2c]">{t.followTitle}</h2>}
            {t.followText && <p className="mx-auto mt-2 max-w-xl text-[18px] leading-[1.75] text-[#34503f]">{t.followText}</p>}
            {links.length > 0 && (
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                {links.map((l, i) => {
                  const st = linkStyle(l.url);
                  return (
                    <a key={i} href={l.url} target={external(l.url) ? "_blank" : undefined} rel="noopener noreferrer"
                      className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-[17px] font-bold shadow-sm transition hover:-translate-y-0.5 active:scale-95 ${st.cls}`}>
                      <span aria-hidden="true" className="text-[18px] leading-none">{st.icon}</span>{l.label}
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Closing */}
      {(t.closingTitle || t.closingName || t.closingText) && (
        <section className="px-4 pb-8 pt-2 text-center">
          {t.closingTitle && <p className="font-display text-[26px] font-bold italic text-[#1d6b4a] sm:text-[30px]">{t.closingTitle}</p>}
          {t.closingName && <p className="mt-2 font-display text-[22px] font-extrabold text-[#123f2c]">{t.closingName}</p>}
          {t.closingText && <p className="mt-1 text-[18px] text-[#4b6356]">{t.closingText}</p>}
        </section>
      )}
    </GuideShell>
  );
}
