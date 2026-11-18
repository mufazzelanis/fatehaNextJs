import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { requirePermission } from "@/lib/auth";
import { listReviews, type ReviewRow } from "@/lib/data/reviews";
import { experienceLabel, isVideo, PUBLISH, REVIEW_FILE } from "@/lib/reviews";
import { deleteReview, removeReviewMedia, toggleReviewFeatured } from "@/app/actions/reviews";
import { EmptyState, PageHeader, Pagination, PanelSkeleton } from "@/components/admin/ui";
import { ExternalIcon } from "@/components/icons";
import { AddReviewForm, ConfirmButton, ReviewEditor } from "./review-editor";

export const metadata = { title: "Reviews" };

export default function ReviewsAdminRoute(props: PageProps<"/admin/reviews">) {
  return (
    <Suspense fallback={<PanelSkeleton rows={10} />}>
      <ReviewsAdmin {...props} />
    </Suspense>
  );
}

const TABS = [
  { key: "pending", label: "Waiting", hint: "New reviews to check" },
  { key: "approved", label: "Published", hint: "Showing on /reviews" },
  { key: "hidden", label: "Hidden", hint: "Rejected or taken down" },
  { key: "internal", label: "Internal only", hint: "Customer did not allow publishing" },
  { key: "all", label: "All", hint: "" },
] as const;
type Tab = (typeof TABS)[number]["key"];

const STATUS_PILL: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800", approved: "bg-emerald-100 text-emerald-800", hidden: "bg-slate-200 text-slate-700",
};
const when = (d: Date) => new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dhaka" });
const mediaOf = (m: string | null): string[] => {
  try { return (JSON.parse(m || "[]") as unknown[]).filter((f): f is string => typeof f === "string" && REVIEW_FILE.test(f)); } catch { return []; }
};

async function ReviewsAdmin({ searchParams }: PageProps<"/admin/reviews">) {
  await requirePermission("content.manage");
  await connection();
  const sp = await searchParams;
  const tab = (TABS.find((t) => t.key === sp.tab)?.key ?? "pending") as Tab;
  const page = Math.max(Number(sp.page) || 1, 1);
  const data = await listReviews(tab, page);
  const qs = (p: Record<string, string | number>) => `/admin/reviews?${new URLSearchParams(Object.entries({ tab, ...p }).map(([k, v]) => [k, String(v)]))}`;

  return (
    <>
      <PageHeader title="Reviews"
        description="Customers write reviews on /reviews. Check each one, fix the text if needed, then approve — only approved reviews show on the page."
        actions={<a href="/reviews" target="_blank" className="a-btn-outline">View page <ExternalIcon className="size-3.5" /></a>} />

      <nav className="mb-5 flex gap-1.5 overflow-x-auto pb-1" aria-label="Review status">
        {TABS.map((t) => {
          const n = data.counts[t.key];
          const on = t.key === tab;
          return (
            <Link key={t.key} href={`/admin/reviews?tab=${t.key}`} title={t.hint} aria-current={on ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition ${on ? "bg-brand-700 text-white shadow-sm" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`}>
              {t.label}
              <span className={`rounded-full px-1.5 text-xs tabular-nums ${on ? "bg-white/20" : t.key === "pending" && n ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500"}`}>{n}</span>
            </Link>
          );
        })}
      </nav>

      <details className="a-card mb-5 overflow-hidden" open={data.counts.all === 0}>
        <summary className="cursor-pointer select-none px-5 py-3.5 text-sm font-semibold text-slate-800 hover:bg-slate-50">
          ＋ Add a review yourself <span className="font-normal text-slate-500">— received by phone, Facebook or WhatsApp</span>
        </summary>
        <div className="border-t border-slate-100"><AddReviewForm /></div>
      </details>

      {data.rows.length === 0 ? (
        <EmptyState title={tab === "pending" ? "No reviews waiting" : "Nothing here"} text={tab === "pending" ? "New reviews from /reviews will appear here." : undefined} />
      ) : (
        <div className="space-y-4">
          {data.rows.map((r) => <ReviewItem key={r.id} r={r} />)}
        </div>
      )}
      <div className="mt-5"><Pagination page={page} pages={data.pages} href={(p) => qs({ page: p })} /></div>
    </>
  );
}

function Answer({ q, a }: { q: string; a: string | null | undefined }) {
  if (!a) return null;
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-2 text-sm">
      <dt className="text-slate-500">{q}</dt>
      <dd className="font-medium text-slate-800 wrap-break-word">{a}</dd>
    </div>
  );
}

function ReviewItem({ r }: { r: ReviewRow }) {
  const media = mediaOf(r.media);
  const internal = r.publish === "internal";
  const permission = PUBLISH.find((p) => p[0] === r.publish)?.[1] ?? r.publish;
  return (
    <article id={`r${r.id}`} className={`a-card overflow-hidden ${r.featured ? "ring-2 ring-amber-300" : ""}`}>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-slate-100 bg-slate-50/60 px-5 py-3">
        <span className="font-semibold text-slate-900">{r.name}</span>
        {r.district && <span className="text-sm text-slate-500">{r.district}</span>}
        <span className="text-amber-500" aria-label={`${r.rating} stars`}>{"★".repeat(r.rating)}<span className="text-slate-300">{"★".repeat(5 - r.rating)}</span></span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${internal ? "bg-violet-100 text-violet-800" : STATUS_PILL[r.status]}`}>
          {internal ? "internal only" : r.status === "approved" ? "published" : r.status === "pending" ? "waiting" : "hidden"}
        </span>
        <span className="ml-auto text-xs text-slate-500">#{r.id} · {when(r.created_at)}</span>
        <form action={toggleReviewFeatured}>
          <input type="hidden" name="id" value={r.id} />
          <button title={r.featured ? "Un-feature" : "Feature: first in the list and in the moving strip"} className={`rounded-lg px-2 py-1 text-sm transition hover:bg-amber-50 ${r.featured ? "" : "opacity-30 grayscale hover:opacity-100 hover:grayscale-0"}`}>⭐</button>
        </form>
      </header>

      <div className="grid gap-6 p-5 lg:grid-cols-[1fr_1.15fr]">
        {/* What the customer wrote */}
        <div className="min-w-0 space-y-4">
          <dl className="space-y-1.5">
            <Answer q="Mobile" a={r.phone} />
            <Answer q="Age" a={r.age_range} />
            <Answer q="Used it?" a={r.used === "yes" ? "হ্যাঁ" : r.used === "no" ? "না" : null} />
            <Answer q="How long" a={r.duration} />
            <Answer q="Experience" a={experienceLabel(r.experience)} />
            <Answer q="Liked" a={(r.liked ?? "").split("|").filter(Boolean).join(", ")} />
            <Answer q="Publishing" a={permission} />
            {media.length > 0 && <Answer q="Photo/video" a={r.media_ok ? "✓ may be published" : "✗ not allowed to publish"} />}
          </dl>
          {r.story && (
            <div>
              <p className="a-label">Original experience</p>
              <p className="whitespace-pre-line rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-800 ring-1 ring-slate-100">{r.story}</p>
            </div>
          )}
          {r.suggestion && (
            <div>
              <p className="a-label">Suggestion (never shown on the page)</p>
              <p className="whitespace-pre-line rounded-xl bg-sky-50 p-3 text-sm leading-relaxed text-sky-900 ring-1 ring-sky-100">{r.suggestion}</p>
            </div>
          )}
          {media.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {media.map((f) => (
                <div key={f} className="relative">
                  {isVideo(f) ? (
                    <video src={`/media/${f}`} controls preload="metadata" playsInline className="h-40 max-w-full rounded-xl bg-black" />
                  ) : (
                    <a href={`/media/${f}`} target="_blank">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/media/${f}?w=256`} alt="" className="size-28 rounded-xl object-cover ring-1 ring-slate-200" />
                    </a>
                  )}
                  <form action={removeReviewMedia} className="absolute right-1 top-1">
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="file" value={f} />
                    <button title="Remove this file" className="grid size-6 place-items-center rounded-full bg-black/60 text-xs text-white hover:bg-rose-600">✕</button>
                  </form>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-400">
            {r.ip && <span>IP {r.ip}</span>}
            {r.approved_at && <span>Approved {when(r.approved_at)}</span>}
            <form action={deleteReview} className="ml-auto">
              <input type="hidden" name="id" value={r.id} />
              <ConfirmButton message={`Delete the review from ${r.name} with its photos/video? This cannot be undone.`} className="font-medium text-rose-600 hover:underline">Delete for good</ConfirmButton>
            </form>
          </div>
        </div>

        {/* What the page shows */}
        <div className="min-w-0 rounded-2xl bg-slate-50/70 p-4 ring-1 ring-slate-100">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Shown on /reviews</p>
          <ReviewEditor id={r.id} name={r.name} story={r.story ?? ""} displayName={r.display_name ?? ""} displayText={r.display_text ?? ""}
            rating={r.rating} featured={r.featured === 1} note={r.admin_note ?? ""} status={r.status} internal={internal} anon={r.publish === "anon"} />
        </div>
      </div>
    </article>
  );
}
