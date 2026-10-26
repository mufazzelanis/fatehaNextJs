import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { requirePermission } from "@/lib/auth";
import { query } from "@/lib/db";
import { mediaUrl } from "@/lib/data/catalog";
import { LANDING_STATUS_META, type LandingStatus } from "@/lib/landing";
import { bdt } from "@/lib/store-config";
import { duplicateLanding, setLandingStatus } from "@/app/actions/landings";
import { PageHeader, PanelSkeleton } from "@/components/admin/ui";
import { EditIcon, ExternalIcon, EyeIcon } from "@/components/icons";
import { CopyUrl, NewLandingForm } from "./landing-forms";

export const metadata = { title: "Landing Pages" };

type Row = {
  id: number; slug: string; name: string; status: LandingStatus; views: number; order_prefix: string; updated_at: Date;
  product_name: string | null; product_image: string | null; price: number | null; stock: number | null;
  orders: number; revenue: number; orders30: number; pending: number;
};

export default function LandingsPage(props: PageProps<"/admin/landings">) {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <Landings {...props} />
    </Suspense>
  );
}

async function Landings({ searchParams }: PageProps<"/admin/landings">) {
  await requirePermission("content.manage");
  await connection();
  const sp = await searchParams;
  const status = typeof sp.status === "string" && sp.status in LANDING_STATUS_META ? (sp.status as LandingStatus) : "";
  const [rows, products] = await Promise.all([
    query<Row>(
      `SELECT l.id, l.slug, l.name, l.status, l.views, l.order_prefix, l.updated_at,
         p.name AS product_name, p.image AS product_image, p.price, p.stock,
         COUNT(o.id) AS orders,
         COALESCE(SUM(CASE WHEN o.status NOT IN ('cancelled','returned') THEN o.total END), 0) AS revenue,
         SUM(o.created_at >= NOW() - INTERVAL 30 DAY) AS orders30,
         SUM(o.status = 'pending') AS pending
       FROM landing_pages l
       LEFT JOIN products p ON p.id = l.product_id
       LEFT JOIN orders o ON o.landing_id = l.id
       ${status ? "WHERE l.status = ?" : ""}
       GROUP BY l.id ORDER BY FIELD(l.status, 'published', 'draft', 'archived'), l.id DESC`,
      status ? [status] : [],
    ),
    query<{ id: number; name: string }>("SELECT id, name FROM products WHERE is_active = 1 ORDER BY name"),
  ]);
  const all = await query<{ id: number; name: string }>("SELECT id, name FROM landing_pages ORDER BY id");
  const totals = rows.reduce((t, r) => ({ views: t.views + Number(r.views), orders: t.orders + Number(r.orders), revenue: t.revenue + Number(r.revenue) }), { views: 0, orders: 0, revenue: 0 });

  return (
    <>
      <PageHeader title="Landing Pages" description="Each landing page has its own URL, product, content, checkout form and order numbers." />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Landing pages" value={String(rows.length)} />
        <Tile label="Visitors" value={totals.views.toLocaleString("en-IN")} />
        <Tile label="Orders" value={totals.orders.toLocaleString("en-IN")} />
        <Tile label="Revenue (not cancelled)" value={bdt(totals.revenue)} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="min-w-0 space-y-3 xl:col-span-2">
          <div className="flex flex-wrap gap-1 rounded-xl bg-white p-1 shadow-xs ring-1 ring-slate-200/80 sm:w-max">
            {[["", "All"], ["published", "Live"], ["draft", "Draft"], ["archived", "Archived"]].map(([k, label]) => (
              <Link key={k} href={k ? `/admin/landings?status=${k}` : "/admin/landings"}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${status === k ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{label}</Link>
            ))}
          </div>

          {rows.length === 0 && <p className="a-card p-8 text-center text-sm text-slate-500">No landing pages here yet — create one on the right.</p>}
          {rows.map((r) => {
            const meta = LANDING_STATUS_META[r.status];
            const conv = Number(r.views) ? ((Number(r.orders) / Number(r.views)) * 100).toFixed(1) : null;
            return (
              <article key={r.id} className="a-card overflow-hidden">
                <div className="flex gap-4 p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mediaUrl(r.product_image)} alt="" className="size-16 shrink-0 rounded-xl border border-slate-100 bg-white object-contain p-1 sm:size-20" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/landings/${r.id}`} className="truncate font-semibold text-slate-900 hover:text-brand-700">{r.name}</Link>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${meta.className}`}>{meta.label}</span>
                      {Number(r.pending) > 0 && <Link href={`/admin/orders?landing=${r.id}&status=pending`} className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">{r.pending} pending</Link>}
                    </div>
                    <CopyUrl path={`/${r.slug}`} />
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {r.product_name ?? <span className="text-rose-600">No product</span>}
                      {r.price != null && <> · {bdt(Number(r.price))}</>}
                      {r.stock != null && <> · <span className={Number(r.stock) <= 10 ? "font-semibold text-amber-600" : ""}>{r.stock} in stock</span></>}
                      <> · orders #{r.order_prefix}…</>
                    </p>
                  </div>
                </div>
                <dl className="grid grid-cols-4 border-t border-slate-100 bg-slate-50/60 text-center text-xs">
                  <Stat label="Visitors" value={Number(r.views).toLocaleString("en-IN")} />
                  <Stat label="Orders" value={String(r.orders)} sub={`${r.orders30 ?? 0} in 30d`} />
                  <Stat label="Conversion" value={conv ? `${conv}%` : "—"} />
                  <Stat label="Revenue" value={bdt(Number(r.revenue))} />
                </dl>
                <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-2.5">
                  <Link href={`/admin/landings/${r.id}`} className="a-btn-outline py-1.5 text-xs"><EditIcon className="size-3.5" /> Edit</Link>
                  <a href={r.status === "published" ? `/${r.slug}` : `/${r.slug}?preview=1`} target="_blank" className="a-btn-outline py-1.5 text-xs">
                    {r.status === "published" ? <><ExternalIcon className="size-3.5" /> Open</> : <><EyeIcon className="size-3.5" /> Preview</>}
                  </a>
                  <Link href={`/admin/orders?landing=${r.id}`} className="a-btn-outline py-1.5 text-xs">Orders</Link>
                  <form action={duplicateLanding}><input type="hidden" name="id" value={r.id} /><button className="a-btn-outline py-1.5 text-xs">Duplicate</button></form>
                  <form action={setLandingStatus} className="ml-auto">
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="status" value={r.status === "published" ? "draft" : "published"} />
                    <button className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${r.status === "published" ? "text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}>
                      {r.status === "published" ? "Unpublish" : "Publish"}
                    </button>
                  </form>
                </div>
              </article>
            );
          })}
        </div>

        <div className="min-w-0">
          <NewLandingForm products={products} landings={all} />
        </div>
      </div>
    </>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="a-card p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="px-2 py-2.5 [&:not(:first-child)]:border-l [&:not(:first-child)]:border-slate-100">
      <dd className="font-semibold text-slate-900">{value}</dd>
      <dt className="text-[11px] text-slate-500">{label}{sub && <span className="block text-slate-400">{sub}</span>}</dt>
    </div>
  );
}
