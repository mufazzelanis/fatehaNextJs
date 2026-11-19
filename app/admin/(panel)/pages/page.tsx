import Link from "next/link";
import { Suspense } from "react";
import { can, requirePermission } from "@/lib/auth";
import { getGuideContent } from "@/lib/data/guides";
import { getPageStats } from "@/lib/data/pages";
import { getMarketingConfig, readPagePixels } from "@/lib/meta/config";
import { GUIDE_HREF, GUIDE_KEYS } from "@/lib/guides";
import { PageHeader, PanelSkeleton } from "@/components/admin/ui";
import { ExternalIcon } from "@/components/icons";
import { GuidesEditor } from "./guides-editor";

export const metadata = { title: "Pages" };

export default function PagesPage() {
  return (
    <Suspense fallback={<PanelSkeleton rows={8} />}>
      <Pages />
    </Suspense>
  );
}

const fmt = (n: number) => n.toLocaleString("en-IN");

async function Pages() {
  const admin = await requirePermission("content.manage");
  const paths = [...GUIDE_KEYS.map((k) => GUIDE_HREF[k]), "/reviews"];
  const [content, stats, pagePixels, marketing] = await Promise.all([getGuideContent(), getPageStats(paths), readPagePixels(), getMarketingConfig()]);
  const canPixel = can(admin, "marketing.manage");

  return (
    <>
      <PageHeader title="Pages"
        description="Each page is managed on its own: content, menu name, published / hidden, and its own Facebook pixel & Conversions API." />

      <div className="grid gap-4 lg:grid-cols-3">
        {GUIDE_KEYS.map((k) => {
          const p = content.pages[k];
          const href = GUIDE_HREF[k];
          const st = stats[href];
          const px = pagePixels[k];
          const max = Math.max(...st.days.map((d) => d.views), 1);
          const own = px.mode !== "main" && px.pixels.length > 0;
          return (
            <article key={k} className="a-card flex flex-col overflow-hidden">
              <div className="flex items-start gap-3 p-5 pb-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-2xl ring-1 ring-brand-100">{p.icon}</span>
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/pages${href}`} className="block truncate font-sans text-lg font-semibold text-slate-900 hover:text-brand-700">{p.label}</Link>
                  <a href={href} target="_blank" className="font-mono text-xs text-brand-700 hover:underline">{href} ↗</a>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${p.enabled ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : "bg-slate-100 text-slate-500 ring-slate-300"}`}>
                  {p.enabled ? "Live" : "Hidden"}
                </span>
              </div>
              <p className="line-clamp-2 px-5 font-sans text-sm text-slate-500">{p.text}</p>

              {/* stats */}
              <div className="mx-5 mt-4 grid grid-cols-4 gap-2 text-center">
                <div className="rounded-xl bg-emerald-50 py-2">
                  <p className="flex items-center justify-center gap-1 text-lg font-bold text-emerald-700">
                    {st.now > 0 && <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex size-2 rounded-full bg-emerald-500" /></span>}
                    {fmt(st.now)}
                  </p>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-700/70">Now</p>
                </div>
                {([["Today", st.today], ["7 days", st.week], ["30 days", st.month]] as const).map(([label, n]) => (
                  <div key={label} className="rounded-xl bg-slate-50 py-2">
                    <p className="text-lg font-bold text-slate-900">{fmt(n)}</p>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
                  </div>
                ))}
              </div>
              <div className="mx-5 mt-3 flex h-10 items-end gap-1" title="Page views, last 7 days">
                {st.days.map((d) => (
                  <div key={d.day} className="flex-1 rounded-t bg-brand-500/70" style={{ height: `${Math.max((d.views / max) * 100, 4)}%` }} title={`${d.day}: ${d.views} views`} />
                ))}
              </div>

              {/* pixel */}
              <div className="mx-5 mt-4 rounded-xl bg-slate-50 px-3 py-2 text-xs">
                <span className="font-semibold text-slate-700">Facebook pixel: </span>
                {own ? (
                  <span className="text-violet-700">{px.mode === "own" ? "own pixel" : "own + main pixel"} · <span className="font-mono">{px.pixels.map((x) => x.id).join(", ")}</span>
                    {px.pixels.some((x) => x.token) ? " · CAPI ✓" : " · browser only"}</span>
                ) : (
                  <span className="text-slate-500">main site pixel{marketing.pixels.length ? ` (${marketing.pixels.map((x) => x.id).join(", ")})` : " — not set up yet"}</span>
                )}
              </div>

              <div className="mt-auto flex gap-2 p-5">
                <Link href={`/admin/pages${href}`} className="a-btn flex-1 justify-center">Edit page</Link>
                {canPixel && <Link href={`/admin/pages${href}?tab=pixel`} className="a-btn-outline justify-center">Pixel & CAPI</Link>}
                <a href={href} target="_blank" className="a-btn-outline justify-center px-3" aria-label={`Open ${p.label}`}><ExternalIcon className="size-4" /></a>
              </div>
            </article>
          );
        })}
        <ReviewsCard st={stats["/reviews"]} px={pagePixels.reviews} mainPixels={marketing.pixels.map((x) => x.id)} canPixel={canPixel} />
      </div>

      <h2 className="mb-3 mt-8 font-medium text-slate-900">Shared settings</h2>
      <GuidesEditor initial={content} only="general" />
    </>
  );
}

/** /reviews is managed in Admin → Reviews; shown here too so every page's pixel is in one place. */
function ReviewsCard({ st, px, mainPixels, canPixel }: {
  st: { now: number; today: number; week: number; month: number }; px: { mode: string; pixels: { id: string; token: string }[] }; mainPixels: string[]; canPixel: boolean;
}) {
  const own = px.mode !== "main" && px.pixels.length > 0;
  return (
    <article className="a-card flex flex-col overflow-hidden">
      <div className="flex items-start gap-3 p-5 pb-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-amber-50 text-2xl ring-1 ring-amber-100">⭐</span>
        <div className="min-w-0 flex-1">
          <Link href="/admin/reviews" className="block truncate font-sans text-lg font-semibold text-slate-900 hover:text-brand-700">গ্রাহকদের রিভিউ</Link>
          <a href="/reviews" target="_blank" className="font-mono text-xs text-brand-700 hover:underline">/reviews ↗</a>
        </div>
        <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">Live</span>
      </div>
      <p className="line-clamp-2 px-5 font-sans text-sm text-slate-500">Review form + approved reviews. Approve and edit reviews in Admin → Reviews.</p>
      <div className="mx-5 mt-4 grid grid-cols-4 gap-2 text-center">
        {([["Now", st.now], ["Today", st.today], ["7 days", st.week], ["30 days", st.month]] as const).map(([label, n]) => (
          <div key={label} className={`rounded-xl py-2 ${label === "Now" ? "bg-emerald-50" : "bg-slate-50"}`}>
            <p className={`text-lg font-bold ${label === "Now" ? "text-emerald-700" : "text-slate-900"}`}>{fmt(n)}</p>
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
          </div>
        ))}
      </div>
      <div className="mx-5 mt-4 rounded-xl bg-slate-50 px-3 py-2 text-xs">
        <span className="font-semibold text-slate-700">Facebook pixel: </span>
        {own ? (
          <span className="text-violet-700">{px.mode === "own" ? "own pixel" : "own + main pixel"} · <span className="font-mono">{px.pixels.map((x) => x.id).join(", ")}</span>
            {px.pixels.some((x) => x.token) ? " · CAPI ✓" : " · browser only"}</span>
        ) : (
          <span className="text-slate-500">main site pixel{mainPixels.length ? ` (${mainPixels.join(", ")})` : " — not set up yet"}</span>
        )}
      </div>
      <div className="mt-auto flex gap-2 p-5">
        <Link href="/admin/reviews" className="a-btn flex-1 justify-center">Manage reviews</Link>
        {canPixel && <Link href="/admin/reviews?tab=pixel" className="a-btn-outline justify-center">Pixel & CAPI</Link>}
        <a href="/reviews" target="_blank" className="a-btn-outline justify-center px-3" aria-label="Open the reviews page"><ExternalIcon className="size-4" /></a>
      </div>
    </article>
  );
}
