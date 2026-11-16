import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { requirePermission } from "@/lib/auth";
import { adReport, type AdKind, type AdRow, type AdStats } from "@/lib/data/ads";
import { FB_URL_PARAMS } from "@/lib/attribution";
import { renameAd } from "@/app/actions/ads";
import { PageHeader, PanelSkeleton } from "@/components/admin/ui";
import { CopyText } from "@/components/admin/copy-text";

export const metadata = { title: "Ad Performance" };

export default function AdsPage(props: PageProps<"/admin/ads">) {
  return (
    <Suspense fallback={<PanelSkeleton rows={10} />}>
      <Ads {...props} />
    </Suspense>
  );
}

const tk = (n: number) => `৳${Math.round(n).toLocaleString("en-IN")}`;
const day = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
const LEVEL: Record<AdKind, { label: string; filter: string; tone: string }> = {
  campaign: { label: "Campaign", filter: "campaign", tone: "bg-brand-50 text-brand-800 ring-brand-600/15" },
  adset: { label: "Ad set", filter: "adset", tone: "bg-blue-50 text-blue-800 ring-blue-600/15" },
  ad: { label: "Ad", filter: "ad", tone: "bg-violet-50 text-violet-800 ring-violet-600/15" },
};

function Rate({ s }: { s: AdStats }) {
  if (s.deliveryRate === null) return <span className="text-xs text-slate-400">no result yet</span>;
  const pct = Math.round(s.deliveryRate * 100);
  const tone = pct >= 70 ? "bg-emerald-500" : pct >= 45 ? "bg-amber-400" : "bg-rose-500";
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100"><span className={`block h-full ${tone}`} style={{ width: `${pct}%` }} /></span>
      <span className="tabular-nums text-xs font-semibold text-slate-700">{pct}%</span>
    </span>
  );
}

/** One campaign / ad set / ad line: name (editable), ID, numbers, link to its orders. */
function Line({ r, from, to, depth }: { r: AdRow; from: string; to: string; depth: number }) {
  const l = LEVEL[r.kind];
  const ordersHref = `/admin/orders?${l.filter}=${encodeURIComponent(r.id)}&from=${from}&to=${to}`;
  return (
    <div className="grid grid-cols-1 gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_repeat(5,5.5rem)_6rem] sm:items-center" style={{ paddingLeft: `${1 + depth * 1.5}rem` }}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ring-1 ring-inset ${l.tone}`}>{l.label}</span>
          {r.id ? (
            <span className="min-w-0 truncate font-semibold text-slate-900">{r.name || <span className="font-mono font-normal text-slate-700">{r.id}</span>}</span>
          ) : <span className="text-sm italic text-slate-400">(not in the link)</span>}
        </div>
        {r.id && (
          <details className="group mt-0.5">
            <summary className="cursor-pointer list-none text-xs text-slate-400 hover:text-brand-700 [&::-webkit-details-marker]:hidden">
              {r.name ? <span className="font-mono">{r.id}</span> : null} <span className="underline decoration-dotted">{r.name ? "rename" : "give it a name"}</span>
            </summary>
            <form action={renameAd} className="mt-1.5 flex max-w-md gap-2">
              <input type="hidden" name="kind" value={r.kind} />
              <input type="hidden" name="id" value={r.id} />
              <input name="name" defaultValue={r.name} placeholder={`e.g. ${r.kind === "campaign" ? "Dentocare November sale" : r.kind === "adset" ? "Dhaka women 25-45" : "Video 1 — doctor"}`} className="a-input h-8 py-0 text-sm" maxLength={200} />
              <button className="a-btn h-8 py-0 text-sm">Save</button>
            </form>
          </details>
        )}
      </div>
      <Num label="Orders" v={r.orders.toLocaleString("en-IN")} strong />
      <Num label="Revenue" v={tk(r.revenue)} />
      <Num label="Delivered" v={String(r.delivered)} tone="text-emerald-700" />
      <Num label="Cancelled" v={String(r.cancelled)} tone={r.cancelled ? "text-rose-600" : "text-slate-400"} />
      <div className="flex items-center justify-between sm:block"><span className="text-xs text-slate-400 sm:hidden">Delivery rate</span><Rate s={r} /></div>
      {r.id ? <Link href={ordersHref} className="text-sm font-medium text-brand-700 hover:underline sm:text-right">Orders →</Link> : <span />}
    </div>
  );
}

function Num({ label, v, strong, tone = "text-slate-700" }: { label: string; v: string; strong?: boolean; tone?: string }) {
  return (
    <div className="flex items-center justify-between sm:block sm:text-right">
      <span className="text-xs text-slate-400 sm:hidden">{label}</span>
      <span className={`tabular-nums ${strong ? "font-bold text-slate-900" : tone}`}>{v}</span>
    </div>
  );
}

async function Ads({ searchParams }: PageProps<"/admin/ads">) {
  await requirePermission("orders.view");
  await connection();
  const sp = await searchParams;
  const now = new Date();
  const preset = typeof sp.p === "string" ? sp.p : "30";
  const iso = (s: unknown) => (typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "");
  let from = iso(sp.from), to = iso(sp.to);
  if (!from || !to) {
    to = day(now);
    const d = new Date(now);
    if (preset === "month") d.setDate(1);
    else d.setDate(d.getDate() - (Number(preset) || 30) + 1);
    from = day(d);
  }
  const report = await adReport(from, to);
  const tagged = report.campaigns.reduce((s, c) => s + c.orders, 0);
  const presets: [string, string][] = [["7", "7 days"], ["30", "30 days"], ["90", "90 days"], ["month", "This month"]];

  return (
    <>
      <PageHeader title="Ad Performance"
        description="Which campaign, ad set and ad brings orders — and how many of them get delivered. Click a name to see its orders." />

      <form className="mb-4 flex flex-wrap items-end gap-2">
        {presets.map(([k, label]) => (
          <Link key={k} href={`/admin/ads?p=${k}`} className={`rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ${!iso(sp.from) && preset === k ? "bg-brand-700 text-white ring-brand-700" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"}`}>{label}</Link>
        ))}
        <label className="ml-auto text-xs text-slate-500">From<input type="date" name="from" defaultValue={from} className="a-input mt-0.5 h-9 py-0" /></label>
        <label className="text-xs text-slate-500">To<input type="date" name="to" defaultValue={to} className="a-input mt-0.5 h-9 py-0" /></label>
        <button className="a-btn h-9 py-0">Show</button>
      </form>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Orders from ads", tagged.toLocaleString("en-IN"), `${report.total.orders ? Math.round((tagged / report.total.orders) * 100) : 0}% of all ${report.total.orders} orders`],
          ["Revenue from ads", tk(report.campaigns.reduce((s, c) => s + c.revenue, 0)), "not counting cancelled / returned"],
          ["Delivered", report.campaigns.reduce((s, c) => s + c.delivered, 0).toLocaleString("en-IN"), `${report.campaigns.reduce((s, c) => s + c.cancelled, 0)} cancelled / returned`],
          ["Campaigns", String(report.campaigns.length), `${report.campaigns.reduce((s, c) => s + c.children.length, 0)} ad sets · ${report.campaigns.reduce((s, c) => s + c.children.reduce((t, a) => t + a.children.length, 0), 0)} ads`],
        ].map(([k, v, sub]) => (
          <div key={k} className="a-card p-4">
            <p className="text-xs font-medium text-slate-500">{k}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{v}</p>
            <p className="text-xs text-slate-400">{sub}</p>
          </div>
        ))}
      </div>

      <section className="a-card overflow-hidden">
        <div className="hidden grid-cols-[minmax(0,1fr)_repeat(5,5.5rem)_6rem] gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-slate-500 sm:grid">
          <span>Campaign → ad set → ad</span><span className="text-right">Orders</span><span className="text-right">Revenue</span><span className="text-right">Delivered</span><span className="text-right">Cancelled</span><span>Delivery rate</span><span />
        </div>
        {report.campaigns.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-500">No orders from tagged ad links in this period. Add the URL parameters below to your Facebook ads.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {report.campaigns.map((c) => (
              <div key={c.id}>
                <Line r={c} from={from} to={to} depth={0} />
              <details className="group" open={report.campaigns.length <= 3}>
                <summary className="cursor-pointer list-none px-4 pb-2.5 text-xs font-medium text-brand-700 hover:underline [&::-webkit-details-marker]:hidden">
                  <span className="group-open:hidden">▸ Show {c.children.length} ad set{c.children.length === 1 ? "" : "s"} and their ads</span>
                  <span className="hidden group-open:inline">▾ Hide ad sets</span>
                </summary>
                <div className="divide-y divide-slate-100 border-t border-slate-100 bg-slate-50/40">
                  {c.children.map((s) => (
                    <div key={s.id || "-"}>
                      <Line r={s} from={from} to={to} depth={1} />
                      {s.children.filter((a) => a.id || s.children.length > 1).map((a) => <Line key={a.id || "-"} r={a} from={from} to={to} depth={2} />)}
                    </div>
                  ))}
                </div>
              </details>
              </div>
            ))}
          </div>
        )}
      </section>

      {report.untagged.length > 0 && (
        <section className="a-card mt-5 p-5">
          <h2 className="font-medium text-slate-900">Orders without a campaign</h2>
          <p className="text-xs text-slate-500">Organic posts, direct visits, Messenger links… or ads without the URL parameters.</p>
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {report.untagged.map((u) => (
              <li key={u.source} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
                <span className="min-w-0 flex-1 font-medium text-slate-800">{u.source}</span>
                <span className="tabular-nums"><b>{u.orders}</b> orders</span>
                <span className="tabular-nums text-slate-600">{tk(u.revenue)}</span>
                <span className="w-32"><Rate s={u} /></span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <details className="a-card mt-5 p-5" open={report.campaigns.length === 0}>
        <summary className="cursor-pointer font-medium text-slate-900">Set up: Facebook ad URL parameters (copy once, paste in every ad)</summary>
        <div className="mt-3 space-y-3 text-sm text-slate-600">
          <p>Ads Manager → open the ad → <b>Tracking</b> → <b>URL parameters</b> → paste this → Publish. Facebook fills in the IDs and the names of the campaign, ad set and ad, so this report and every order show them automatically.</p>
          <CopyText text={FB_URL_PARAMS} />
          <p className="text-xs text-slate-500">Already using <span className="font-mono">utm_campaign={"{{campaign.id}}"}&amp;utm_content={"{{adset.id}}"}&amp;utm_term={"{{ad.id}}"}</span>? That keeps working — the extra name parameters only add the names. You can also name any ID here with “give it a name”.</p>
        </div>
      </details>
    </>
  );
}
