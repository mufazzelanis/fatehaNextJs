import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { can, requirePermission } from "@/lib/auth";
import { getGuideContent } from "@/lib/data/guides";
import { getPageStats } from "@/lib/data/pages";
import { getMarketingConfig, MAX_PIXELS, readPagePixels } from "@/lib/meta/config";
import { GUIDE_HREF, guideKeyFromSlug } from "@/lib/guides";
import { savePagePixels } from "@/app/actions/landing-pixels";
import { PageHeader, Pagination, PanelSkeleton } from "@/components/admin/ui";
import { listFeedback } from "@/lib/data/feedback";
import { deleteFeedback } from "@/app/actions/feedback";
import { dateTime } from "@/lib/format";
import { ChevronLeftIcon, ExternalIcon } from "@/components/icons";
import { PixelScopeForm } from "@/components/admin/pixel-scope-form";
import { GuidesEditor } from "../guides-editor";

export const metadata = { title: "Edit page" };

export default function PageEditorRoute(props: PageProps<"/admin/pages/[page]">) {
  return (
    <Suspense fallback={<PanelSkeleton rows={10} />}>
      <PageEditor {...props} />
    </Suspense>
  );
}

async function PageEditor({ params, searchParams }: PageProps<"/admin/pages/[page]">) {
  const admin = await requirePermission("content.manage");
  const key = guideKeyFromSlug((await params).page);
  if (!key) notFound();
  const href = GUIDE_HREF[key];
  const canPixel = can(admin, "marketing.manage");
  const sp = await searchParams;
  const tab = sp.tab === "pixel" && canPixel ? "pixel" : sp.tab === "feedback" && key === "thanks" ? "feedback" : "content";
  const [content, stats] = await Promise.all([getGuideContent(), getPageStats([href])]);
  const p = content.pages[key];
  const st = stats[href];
  const tabs = [
    { key: "content", label: "Content" },
    ...(key === "thanks" ? [{ key: "feedback", label: "⭐ Feedback" }] : []),
    ...(canPixel ? [{ key: "pixel", label: "Pixel & CAPI" }] : []),
  ];

  return (
    <>
      <Link href="/admin/pages" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"><ChevronLeftIcon className="size-4" /> All pages</Link>
      <PageHeader title={`${p.icon} ${p.label}`}
        description={`${st.now} here now · ${st.today.toLocaleString("en-IN")} views today · ${st.week.toLocaleString("en-IN")} in 7 days · ${st.month.toLocaleString("en-IN")} in 30 days`}
        actions={<>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${p.enabled ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : "bg-slate-100 text-slate-500 ring-slate-300"}`}>{p.enabled ? "Live" : "Hidden"}</span>
          <a href={href} target="_blank" className="a-btn"><ExternalIcon className="size-4" /> Open page</a>
        </>} />
      <p className="-mt-3 mb-4 font-mono text-xs text-brand-700">{href}</p>

      <div className="mb-5 flex w-max gap-1 rounded-xl bg-white p-1 shadow-xs ring-1 ring-slate-200/80">
        {tabs.map((t) => (
          <Link key={t.key} href={`/admin/pages${href}${t.key === "content" ? "" : `?tab=${t.key}`}`} scroll={false}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${tab === t.key ? "bg-brand-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}>{t.label}</Link>
        ))}
      </div>

      {tab === "content" && <GuidesEditor key={key} initial={content} only={key} />}
      {tab === "pixel" && <PixelTab pageKey={key} />}
      {tab === "feedback" && <FeedbackTab rating={Number(sp.rating) || null} page={Math.max(Number(sp.page) || 1, 1)} />}
    </>
  );
}

/** Pixel ids, labels and whether a token is saved — tokens never leave the server. */
async function PixelTab({ pageKey }: { pageKey: ReturnType<typeof guideKeyFromSlug> & string }) {
  const [all, config] = await Promise.all([readPagePixels(), getMarketingConfig()]);
  const s = all[pageKey];
  return (
    <PixelScopeForm save={savePagePixels} target={{ name: "page", value: pageKey }} kind="page" mode={s.mode}
      pixels={s.pixels.map((x) => ({ id: x.id, label: x.label, hasToken: !!x.token, tokenHint: x.token ? `••••${x.token.slice(-4)}` : "" }))}
      mainPixels={config.pixels.map((x) => x.id)} maxPixels={MAX_PIXELS} capiOn={config.capiSwitch} />
  );
}

const STARS = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

/** Customer feedback from /thank-you: average, star breakdown (click to filter), and each message. */
async function FeedbackTab({ rating, page }: { rating: number | null; page: number }) {
  const r = rating && rating >= 1 && rating <= 5 ? rating : null;
  const fb = await listFeedback(r, page);
  const qs = (p: { rating?: number | null; page?: number }) => {
    const q = new URLSearchParams({ tab: "feedback" });
    const rr = p.rating === undefined ? r : p.rating;
    if (rr) q.set("rating", String(rr));
    if (p.page && p.page > 1) q.set("page", String(p.page));
    return `/admin/pages/thank-you?${q}`;
  };
  return (
    <div className="space-y-5">
      <section className="a-card grid gap-6 p-5 md:grid-cols-[14rem_1fr]">
        <div className="text-center md:border-r md:border-slate-100 md:pr-6">
          <p className="text-5xl font-bold text-slate-900">{fb.all ? fb.avg.toFixed(1) : "—"}</p>
          <p className="mt-1 text-xl tracking-wider text-amber-500">{STARS(Math.round(fb.avg))}</p>
          <p className="mt-1 text-sm text-slate-500">{fb.all.toLocaleString("en-IN")} feedback</p>
        </div>
        <div className="space-y-1.5">
          {[5, 4, 3, 2, 1].map((n) => {
            const pct = fb.all ? Math.round((fb.counts[n] / fb.all) * 100) : 0;
            return (
              <Link key={n} href={qs({ rating: r === n ? null : n, page: 1 })} scroll={false}
                className={`flex items-center gap-3 rounded-lg px-2 py-1 text-sm transition hover:bg-slate-50 ${r === n ? "bg-amber-50 ring-1 ring-amber-200" : ""}`}>
                <span className="w-10 font-medium text-slate-700">{n} ★</span>
                <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} /></span>
                <span className="w-16 text-right tabular-nums text-slate-500">{fb.counts[n]} · {pct}%</span>
              </Link>
            );
          })}
          {r && <Link href={qs({ rating: null, page: 1 })} className="inline-block pt-1 text-sm font-medium text-brand-700 hover:underline">Show all ratings</Link>}
        </div>
      </section>

      <section className="a-card overflow-hidden">
        {fb.rows.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-500">{r ? `No ${r}★ feedback yet.` : "No feedback yet. Customers can send it from the bottom of the /thank-you page."}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {fb.rows.map((f) => (
              <li key={f.id} className="flex gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className={`text-lg tracking-wider ${f.rating >= 4 ? "text-amber-500" : f.rating === 3 ? "text-amber-400" : "text-rose-500"}`}>{STARS(f.rating)}</span>
                    <span className="font-medium text-slate-900">{f.name || "Anonymous"}</span>
                    {f.phone && <a href={`tel:${f.phone}`} className="font-mono text-sm text-slate-600 hover:text-brand-700">{f.phone}</a>}
                    {Number(f.delivered) > 0 ? (
                      <Link href={`/admin/orders?q=${f.phone}`} className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">✓ Verified buyer · {f.delivered} delivered</Link>
                    ) : Number(f.orders) > 0 ? (
                      <Link href={`/admin/orders?q=${f.phone}`} className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700 ring-1 ring-inset ring-sky-600/20">{f.orders} order(s)</Link>
                    ) : f.phone ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">No orders with this number</span> : null}
                  </div>
                  {f.message ? <p className="mt-1.5 whitespace-pre-line font-sans text-[15px] leading-relaxed text-slate-700">{f.message}</p> : <p className="mt-1 text-sm italic text-slate-400">Stars only, no message</p>}
                  <p className="mt-1.5 text-xs text-slate-400">{dateTime(f.created_at)}{f.ip ? ` · IP ${f.ip}` : ""}</p>
                </div>
                <form action={deleteFeedback} className="shrink-0">
                  <input type="hidden" name="id" value={f.id} />
                  <button type="submit" className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-600 ring-1 ring-rose-200 transition hover:bg-rose-50" title="Delete (spam / test)">Delete</button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
          <span>{fb.total} shown{r ? ` (${r}★)` : ""}</span>
          <Pagination page={page} pages={fb.pages} href={(p) => qs({ page: p })} />
        </div>
      </section>
    </div>
  );
}
