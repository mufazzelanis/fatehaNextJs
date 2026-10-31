import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { requirePermission } from "@/lib/auth";
import { getClickHistory, getLiveStats, getTrafficReport, type TrafficFilter } from "@/lib/data/live";
import { listLandingOptions } from "@/lib/data/landings";
import { DEVICE_KIND_LABEL, parseDevice } from "@/lib/device";
import { DEVICE_LABEL, duration, LIVE_DEVICES, LIVE_SOURCES, SOURCE_LABEL } from "@/lib/live";
import { dateTime } from "@/lib/format";
import { PageHeader, Pagination, PanelSkeleton } from "@/components/admin/ui";
import { LiveNowCard, LiveVisitorsTable } from "@/components/admin/live-board";

export const metadata = { title: "Live Visitors" };

export default function LiveVisitorsPage({ searchParams }: PageProps<"/admin/live-visitors">) {
  return (
    <Suspense fallback={<PanelSkeleton rows={10} />}>
      <LiveVisitors searchParams={searchParams} />
    </Suspense>
  );
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
/** "YYYY-MM-DD" in Bangladesh time, `back` days ago. */
const bdDate = (back = 0) => new Date(Date.now() + 6 * 3600_000 - back * 86_400_000).toISOString().slice(0, 10);
const hourLabel = (h: number) => `${((h + 11) % 12) + 1}:00 ${h < 12 ? "AM" : "PM"}`;
const hourShort = (h: number) => `${((h + 11) % 12) + 1} ${h < 12 ? "AM" : "PM"}`;
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);

async function LiveVisitors({ searchParams }: Pick<PageProps<"/admin/live-visitors">, "searchParams">) {
  await requirePermission("dashboard.view");
  await connection();
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const hour = (k: string) => (/^\d{1,2}$/.test(one(k)) && Number(one(k)) < 24 ? Number(one(k)) : null);

  const today = bdDate(0);
  const monthStart = `${today.slice(0, 8)}01`;
  const QUICK = [
    { key: "today", label: "Today", from: today, to: today },
    { key: "yesterday", label: "Yesterday", from: bdDate(1), to: bdDate(1) },
    { key: "3d", label: "Last 3 days", from: bdDate(2), to: today },
    { key: "7d", label: "Last 7 days", from: bdDate(6), to: today },
    { key: "30d", label: "Last 30 days", from: bdDate(29), to: today },
    { key: "month", label: "This month", from: monthStart, to: today },
    { key: "all", label: "All (90 days)", from: bdDate(89), to: today },
  ];
  const quick = QUICK.find((q) => q.key === one("range"));
  const custom = !quick && (DAY.test(one("from")) || DAY.test(one("to")));
  const range = quick ?? (custom ? { key: "custom", label: "Custom", from: DAY.test(one("from")) ? one("from") : bdDate(89), to: DAY.test(one("to")) ? one("to") : today } : QUICK[0]);
  const hourFrom = hour("hf");
  const hourTo = hour("ht");
  const landingId = Number(one("landing")) || 0;
  const page = Math.max(Number(one("page")) || 1, 1);
  const filter: TrafficFilter = {
    from: range.from, to: range.to,
    hourFrom: hourFrom !== null && hourTo !== null ? hourFrom : null, hourTo: hourFrom !== null && hourTo !== null ? hourTo : null,
    landing: landingId,
  };

  const [live, report, clicks, landings] = await Promise.all([getLiveStats(), getTrafficReport(filter), getClickHistory(filter, page), listLandingOptions()]);

  const qs = (over: Record<string, string | number>) => {
    const base: Record<string, string | number> = {
      range: quick ? quick.key : "", from: custom ? range.from : "", to: custom ? range.to : "",
      hf: filter.hourFrom ?? "", ht: filter.hourTo ?? "", landing: landingId || "", page: 1,
    };
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...base, ...over })) if (v !== "" && !(k === "page" && v === 1)) p.set(k, String(v));
    const s = p.toString();
    return `/admin/live-visitors${s ? `?${s}` : ""}`;
  };

  const busy = report.hours.filter((h) => h.visits > 0);
  const peak = busy.length ? busy.reduce((a, b) => (b.visits > a.visits ? b : a)) : null;
  const quiet = report.hours.reduce((a, b) => (b.visits < a.visits ? b : a));
  const maxBar = Math.max(...report.hours.map((h) => Math.max(h.visits, h.clicks)), 1);
  const periodLabel = `${range.label}${range.from === range.to ? ` · ${range.from}` : ` · ${range.from} → ${range.to}`}${filter.hourFrom !== null ? ` · ${hourLabel(filter.hourFrom)}–${hourLabel((filter.hourTo! + 1) % 24)}` : ""}`;

  const kpis = [
    { label: "Visitors", value: report.visitors, sub: `${report.visits.toLocaleString("en-IN")} visits · ${report.ips.toLocaleString("en-IN")} unique IPs`, icon: "👥" },
    { label: "Order-button clicks", value: report.clicks, sub: `${report.clickers.toLocaleString("en-IN")} visitors clicked`, icon: "👆" },
    { label: "Click rate", value: `${pct(report.clickers, report.visits)}%`, sub: `Orders: ${report.orders} · ${pct(report.orders, report.visits)}% conversion`, icon: "📈" },
    { label: "Avg. time on page", value: duration(report.avgSeconds), sub: "per visit", icon: "⏱" },
  ];
  const funnel = [
    { label: "Opened the page", value: report.visits, tone: "bg-sky-500" },
    { label: "Reached the order form", value: report.reachedForm, tone: "bg-violet-500" },
    { label: "Clicked an order button", value: report.clickers, tone: "bg-amber-500" },
    { label: "Placed an order", value: report.orders, tone: "bg-emerald-500" },
  ];

  return (
    <>
      <PageHeader title="Live Visitors" description="Who is on your landing pages right now, when traffic peaks, and how many reach the order button." actions={
        <span className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
          <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex size-2 rounded-full bg-emerald-500" /></span>
          Live · updates every 3s
        </span>
      } />

      {/* Period filter */}
      <section className="a-card mb-5 space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Period</span>
          {QUICK.map((q) => (
            <Link key={q.key} href={qs({ range: q.key, from: "", to: "" })}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition ${range.key === q.key ? "bg-brand-700 text-white ring-brand-700" : "text-slate-600 ring-slate-200 hover:bg-slate-50"}`}>{q.label}</Link>
          ))}
        </div>
        <form action="/admin/live-visitors" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_0.8fr_0.8fr_1fr_auto] lg:items-end">
          <label className="block"><span className="a-label">From date</span><input type="date" name="from" defaultValue={range.from} max={today} className="a-input" /></label>
          <label className="block"><span className="a-label">To date</span><input type="date" name="to" defaultValue={range.to} max={today} className="a-input" /></label>
          <label className="block">
            <span className="a-label">From time</span>
            <select name="hf" defaultValue={filter.hourFrom ?? ""} className="a-input">
              <option value="">Any</option>
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="a-label">To time</span>
            <select name="ht" defaultValue={filter.hourTo ?? ""} className="a-input">
              <option value="">Any</option>
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hourLabel((h + 1) % 24)}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="a-label">Landing page</span>
            <select name="landing" defaultValue={landingId || ""} className="a-input">
              <option value="">All landing pages</option>
              {landings.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </label>
          <div className="flex gap-2">
            <button type="submit" className="a-btn flex-1">Apply</button>
            <Link href="/admin/live-visitors" className="a-btn-outline">Reset</Link>
          </div>
        </form>
        <p className="text-xs text-slate-500">Showing: <b className="text-slate-700">{periodLabel}</b>{landingId ? ` · ${landings.find((l) => l.id === landingId)?.name ?? ""}` : ""} · visits are kept for 90 days</p>
      </section>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <LiveNowCard initial={live} />
        {kpis.map((k) => (
          <div key={k.label} className="a-card p-5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-slate-500 sm:text-sm">{k.label}</p>
              <span className="text-lg" aria-hidden="true">{k.icon}</span>
            </div>
            <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-slate-900">{typeof k.value === "number" ? k.value.toLocaleString("en-IN") : k.value}</p>
            <p className="mt-1 text-xs text-slate-500">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Peak / quiet / 24h chart */}
      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_1.6fr]">
        <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-orange-500 via-orange-500 to-amber-500 p-5 text-white shadow-lg shadow-orange-500/20">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-white/85"><span>🔥 Peak time</span><span className="rounded bg-white/20 px-1.5 py-0.5">Most traffic</span></div>
          <p className="mt-3 text-3xl font-bold tracking-tight">{peak ? `${hourShort(peak.hour)} – ${hourShort((peak.hour + 1) % 24)}` : "—"}</p>
          <div className="mt-4 flex justify-between text-sm">
            <span>Visits<br /><b className="text-2xl">{peak?.visits ?? 0}</b></span>
            <span className="text-right">Order clicks<br /><b className="text-2xl">{peak?.clicks ?? 0}</b></span>
          </div>
          <p className="mt-3 text-xs text-white/80">Busiest hour of the selected period — the best time to run ads and keep the phone free.</p>
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-slate-700 to-slate-900 p-5 text-white shadow-lg shadow-slate-900/20">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-white/75"><span>🌙 Quiet time</span><span className="rounded bg-white/15 px-1.5 py-0.5">Least traffic</span></div>
          <p className="mt-3 text-3xl font-bold tracking-tight">{hourShort(quiet.hour)} – {hourShort((quiet.hour + 1) % 24)}</p>
          <div className="mt-4 flex justify-between text-sm">
            <span>Visits<br /><b className="text-2xl">{quiet.visits}</b></span>
            <span className="text-right">Order clicks<br /><b className="text-2xl">{quiet.clicks}</b></span>
          </div>
          <p className="mt-3 text-xs text-white/70">Fewest visitors — a good time to lower the ad budget.</p>
        </div>
        <div className="a-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-medium text-slate-900">Traffic by hour of day</h2>
            <span className="flex items-center gap-3 text-xs text-slate-500"><span className="flex items-center gap-1"><span className="size-2.5 rounded-sm bg-brand-600" /> Visits</span><span className="flex items-center gap-1"><span className="size-2.5 rounded-sm bg-amber-400" /> Order clicks</span></span>
          </div>
          <div className="mt-4 flex h-40 items-end gap-[3px]">
            {report.hours.map((h) => (
              <div key={h.hour} className="group relative flex h-full flex-1 items-end justify-center gap-px" title={`${hourLabel(h.hour)} — ${h.visits} visits, ${h.clicks} order clicks`}>
                <div className="w-1/2 rounded-t bg-brand-600 transition group-hover:bg-brand-500" style={{ height: `${(h.visits / maxBar) * 100}%`, minHeight: h.visits ? 2 : 0 }} />
                <div className="w-1/2 rounded-t bg-amber-400 transition group-hover:bg-amber-300" style={{ height: `${(h.clicks / maxBar) * 100}%`, minHeight: h.clicks ? 2 : 0 }} />
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] tabular-nums text-slate-400"><span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>11 PM</span></div>
        </div>
      </div>

      {/* Funnel + breakdowns */}
      <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr]">
        <section className="a-card p-5">
          <h2 className="font-medium text-slate-900">From visit to order</h2>
          <p className="text-xs text-slate-500">How far visitors get in the selected period</p>
          <ul className="mt-4 space-y-3">
            {funnel.map((f, i) => (
              <li key={f.label}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-slate-700">{i + 1}. {f.label}</span>
                  <span className="tabular-nums"><b className="text-slate-900">{f.value.toLocaleString("en-IN")}</b> <span className="text-xs text-slate-500">{i ? `${pct(f.value, report.visits)}%` : "100%"}</span></span>
                </div>
                <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${f.tone}`} style={{ width: `${report.visits ? Math.max((f.value / report.visits) * 100, f.value ? 1.5 : 0) : 0}%` }} /></div>
              </li>
            ))}
          </ul>
        </section>
        <section className="a-card p-5">
          <h2 className="font-medium text-slate-900">Where visitors came from</h2>
          <ul className="mt-3 space-y-2.5">
            {LIVE_SOURCES.map((s) => (
              <li key={s}>
                <div className="flex justify-between text-sm"><span className="text-slate-700">{SOURCE_LABEL[s]}</span><span className="tabular-nums text-slate-900">{report.sources[s]} <span className="text-xs text-slate-500">{pct(report.sources[s], report.visits)}%</span></span></div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-600" style={{ width: `${pct(report.sources[s], report.visits)}%` }} /></div>
              </li>
            ))}
          </ul>
          <h3 className="mt-5 text-sm font-medium text-slate-900">Devices</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {LIVE_DEVICES.map((d) => (
              <span key={d} className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 ring-1 ring-inset ring-slate-200">{DEVICE_LABEL[d]} <b className="tabular-nums">{report.devices[d]}</b></span>
            ))}
          </div>
        </section>
        <section className="a-card p-5">
          <h2 className="font-medium text-slate-900">By landing page</h2>
          {report.landings.length === 0 ? <p className="mt-3 text-sm text-slate-500">No visits in this period.</p> : (
            <ul className="mt-3 space-y-3">
              {report.landings.map((l) => (
                <li key={l.id} className="text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={qs({ landing: l.id })} className="min-w-0 truncate font-medium text-slate-800 hover:text-brand-700">{l.name}</Link>
                    <span className="shrink-0 tabular-nums font-semibold text-slate-900">{l.visits}</span>
                  </div>
                  <p className="text-xs text-slate-500">/{l.slug} · {l.clicks} clicks · {l.orders} orders · {pct(l.orders, l.visits)}% conversion</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Live table */}
      <div className="mt-5">
        <LiveVisitorsTable initial={live} />
      </div>

      {/* Click history */}
      <section className="a-card mt-5 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-medium text-slate-900">Order &amp; checkout button clicks</h2>
            <p className="text-xs text-slate-500">Every press of an order button, the sticky bar, the confirm button, Call and WhatsApp — {periodLabel}</p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{clicks.total.toLocaleString("en-IN")} clicks</span>
        </div>
        {clicks.rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">No button clicks in this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-50/70 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Time</th>
                  <th className="px-3 py-2.5 font-medium">Button</th>
                  <th className="px-3 py-2.5 font-medium">Visitor IP</th>
                  <th className="px-3 py-2.5 font-medium">Device</th>
                  <th className="px-3 py-2.5 font-medium">Landing page</th>
                  <th className="px-3 py-2.5 font-medium">After</th>
                  <th className="px-5 py-2.5 font-medium">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clicks.rows.map((c) => {
                  const d = parseDevice(c.user_agent);
                  return (
                    <tr key={c.id}>
                      <td className="whitespace-nowrap px-5 py-2.5 text-slate-500">{dateTime(c.created_at)}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex max-w-64 items-center gap-1.5 truncate rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                          c.kind === "submit" ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : c.kind === "call" || c.kind === "whatsapp" ? "bg-rose-50 text-rose-700 ring-rose-600/20" : "bg-sky-50 text-sky-700 ring-sky-600/20"}`}>
                          {c.kind === "submit" ? "✔" : c.kind === "call" ? "📞" : c.kind === "whatsapp" ? "💬" : "🛒"} {c.label}
                        </span>
                        <p className="mt-0.5 text-[11px] text-slate-400">{c.kind === "sticky" ? "Sticky bar (phone)" : c.kind === "submit" ? "Confirm order button" : c.kind === "order" ? "Order button" : c.kind}</p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <span className="font-mono text-xs text-slate-700">{c.ip ?? "—"}</span>
                        {Number(c.ip_visits) > 1 && <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">{c.ip_visits} times</span>}
                      </td>
                      <td className="px-3 py-2.5 text-xs"><p className="text-slate-700">{d ? DEVICE_KIND_LABEL[d.kind] : "—"}</p><p className="text-slate-500">{d ? [d.os, d.browser].filter(Boolean).join(" · ") : ""}</p></td>
                      <td className="px-3 py-2.5 font-mono text-xs text-slate-600">/{c.landing}</td>
                      <td className="px-3 py-2.5 text-xs tabular-nums text-slate-600">{c.seconds !== null ? duration(c.seconds) : "—"}</td>
                      <td className="px-5 py-2.5 text-xs">{c.order_no ? <Link href={`/admin/orders?q=${c.order_no}`} className="font-semibold text-emerald-700 hover:underline">✓ #{c.order_no}</Link> : <span className="text-slate-400">No order yet</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {clicks.pages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
            <p className="text-sm text-slate-500">Page {page} of {clicks.pages}</p>
            <Pagination page={page} pages={clicks.pages} href={(n) => qs({ page: n })} />
          </div>
        )}
      </section>
    </>
  );
}
