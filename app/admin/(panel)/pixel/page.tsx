import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { requirePermission } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { getMarketingConfig, MAX_PIXELS } from "@/lib/meta/config";
import { dateTime } from "@/lib/format";
import { EmptyState, PageHeader, PanelSkeleton } from "@/components/admin/ui";
import { EventsChart, type DayCount } from "./events-chart";
import { PixelSettingsForm, RetryButton, TestEventForm, VerifyPanel } from "./pixel-forms";

export const metadata = { title: "Facebook Pixel" };

export default function PixelPage({ searchParams }: PageProps<"/admin/pixel">) {
  return (
    <Suspense fallback={<PanelSkeleton rows={10} />}>
      <Pixel searchParams={searchParams} />
    </Suspense>
  );
}

type LogRow = {
  id: number; event_name: string; event_id: string; order_id: number | null; order_no: string | null; pixel_id: string | null;
  success: number; http_status: number | null; is_test: number; retried: number; response: string | null; created_at: Date;
};

async function Pixel({ searchParams }: Pick<PageProps<"/admin/pixel">, "searchParams">) {
  await requirePermission("marketing.manage");
  await connection(); // renders dates relative to now — always at request time
  const { log, event } = await searchParams;
  const failedOnly = log === "failed";
  const eventFilter = typeof event === "string" && /^[A-Za-z]{3,30}$/.test(event) ? event : "";
  const config = await getMarketingConfig();
  // While testing, count test events too so the numbers move; otherwise only real traffic.
  const testFilter = config.testEventCode ? "1 = 1" : "is_test = 0";

  const where: string[] = [];
  const params: string[] = [];
  if (failedOnly) where.push("l.success = 0");
  if (eventFilter) {
    where.push("l.event_name = ?");
    params.push(eventFilter);
  }

  const [stats, byEvent, rows, retryable, daily, unsent] = await Promise.all([
    queryOne<{ total: number; ok: number; failed: number }>(
      `SELECT COUNT(*) total, COALESCE(SUM(success),0) ok, COALESCE(SUM(success = 0),0) failed FROM pixel_event_log WHERE created_at >= NOW() - INTERVAL 1 DAY AND ${testFilter}`,
    ),
    query<{ event_name: string; total: number; ok: number }>(
      `SELECT event_name, COUNT(*) total, SUM(success) ok FROM pixel_event_log
       WHERE created_at >= NOW() - INTERVAL 7 DAY AND ${testFilter} GROUP BY event_name ORDER BY total DESC`,
    ),
    query<LogRow>(
      `SELECT l.id, l.event_name, l.event_id, l.order_id, l.pixel_id, l.success, l.http_status, l.is_test, l.retried, l.response, l.created_at,
              o.order_no
       FROM pixel_event_log l LEFT JOIN orders o ON o.id = l.order_id
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY l.id DESC LIMIT 80`,
      params,
    ),
    queryOne<{ count: number }>(
      "SELECT COUNT(*) count FROM pixel_event_log WHERE success = 0 AND retried = 0 AND payload IS NOT NULL AND created_at >= NOW() - INTERVAL 7 DAY",
    ),
    query<{ day: string; ok: number; failed: number }>(
      `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') day, SUM(success) ok, SUM(success = 0) failed FROM pixel_event_log
       WHERE created_at >= CURDATE() - INTERVAL 6 DAY AND ${testFilter} GROUP BY day`,
    ),
    queryOne<{ count: number }>(
      `SELECT COUNT(*) count FROM orders WHERE pixel_purchase_sent_at IS NULL AND status NOT IN ('cancelled','returned')
       AND created_at >= NOW() - INTERVAL 7 DAY`,
    ),
  ]);

  const byDay = new Map(daily.map((d) => [d.day, d]));
  const series: DayCount[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" }));
    d.setDate(d.getDate() - (6 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { date: key, ok: Number(byDay.get(key)?.ok ?? 0), failed: Number(byDay.get(key)?.failed ?? 0) };
  });

  const withToken = config.pixels.filter((p) => p.token).length;
  const pixelLabel = new Map(config.pixels.map((p) => [p.id, p.label]));
  const statusCards = [
    {
      label: "Browser Pixel",
      value: config.browserEnabled ? "Active" : config.pixels.length ? "Off" : "Not set up",
      ok: config.browserEnabled,
      sub: config.pixels.length ? `${config.pixels.length} pixel${config.pixels.length > 1 ? "s" : ""}: ${config.pixels.map((p) => p.label || p.id).join(", ")}` : "Add your Pixel ID below",
    },
    {
      label: "Conversions API",
      value: config.capiEnabled ? "Active" : "Off",
      ok: config.capiEnabled,
      sub: config.capiEnabled
        ? config.testEventCode ? `⚠ Test mode (${config.testEventCode})` : `${withToken} pixel${withToken > 1 ? "s" : ""} · Graph ${config.apiVersion}`
        : "Needs a pixel with an access token",
    },
    {
      label: "Server events (24h)",
      value: String(stats?.total ?? 0),
      ok: Number(stats?.failed ?? 0) === 0,
      sub: `${stats?.ok ?? 0} delivered · ${stats?.failed ?? 0} failed`,
    },
    {
      label: "Purchase reported",
      value: config.purchaseTrigger === "placed" ? "On order" : config.purchaseTrigger === "confirmed" ? "On confirm" : "On delivery",
      ok: config.events.Purchase,
      sub: !config.events.Purchase ? "Purchase event is off"
        : config.purchaseTrigger === "placed" ? `Browser + server · value: ${config.purchaseValue === "total" ? "order total" : "products only"}`
        : `${unsent?.count ?? 0} recent orders waiting`,
    },
  ];

  const filterHref = (over: { log?: string; event?: string }) => {
    const p = new URLSearchParams();
    const l = over.log ?? (failedOnly ? "failed" : "");
    const e = over.event ?? eventFilter;
    if (l) p.set("log", l);
    if (e) p.set("event", e);
    const s = p.toString();
    return `/admin/pixel${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Facebook Pixel & Conversions API" description="Browser pixel and server-side events, deduplicated by a shared event ID." />

      {config.testEventCode && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Test mode is on.</strong> Every server event carries test code <code>{config.testEventCode}</code>, so it shows under Test events
          and <strong>is not used for ads</strong>. Clear the Test Event Code when you finish testing.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statusCards.map((c) => (
          <div key={c.label} className="a-card p-5">
            <p className="text-sm font-medium text-slate-500">{c.label}</p>
            <p className="mt-2 flex items-center gap-2 text-xl font-semibold text-slate-900">
              <span className={`size-2.5 rounded-full ${c.ok ? "bg-emerald-500" : "bg-slate-300"}`} />
              {c.value}
            </p>
            <p className="mt-1 truncate text-xs text-slate-500" title={c.sub}>{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <EventsChart data={series} />
          <PixelSettingsForm
            settings={{
              pixels: config.pixels.map((p) => ({ id: p.id, label: p.label, hasToken: !!p.token, tokenHint: p.token ? `••••${p.token.slice(-4)}` : "" })),
              browserEnabled: config.browserEnabled || !config.pixels.length,
              capiSwitch: config.capiSwitch,
              testEventCode: config.testEventCode,
              apiVersion: config.apiVersion,
              purchaseTrigger: config.purchaseTrigger,
              purchaseValue: config.purchaseValue,
              serverPageView: config.serverPageView,
              events: config.events,
              maxPixels: MAX_PIXELS,
            }}
          />
        </div>
        <div className="space-y-6">
          <VerifyPanel disabled={!config.pixels.length} />
          <TestEventForm defaultCode={config.testEventCode} disabled={!config.capiEnabled} />

          <section className="a-card p-5">
            <h2 className="font-medium text-slate-900">By event · last 7 days</h2>
            {byEvent.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">No server events yet.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {byEvent.map((e) => {
                  const pct = e.total ? Math.round((Number(e.ok) / e.total) * 100) : 0;
                  return (
                    <li key={e.event_name}>
                      <Link href={filterHref({ event: e.event_name })} className="group block">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-700 group-hover:text-slate-900">{e.event_name}</span>
                          <span className="tabular-nums text-slate-900">{Number(e.ok)}<span className="text-slate-400"> / {e.total}</span></span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-rose-100">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="a-card p-5 text-sm text-slate-600">
            <h2 className="font-medium text-slate-900">How it works</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs leading-relaxed">
              <li>Browser and server copies share one <b>event ID</b>, so Meta counts each event once.</li>
              <li>Server events include <b>_fbp / _fbc</b> (ad click IDs are captured on landing), IP and device.</li>
              <li>Purchase adds SHA-256 hashed <b>phone (880…)</b>, name and country for high match quality.</li>
              <li>Temporary errors are retried automatically once; anything still failing can be retried here for 7 days.</li>
              <li>Access tokens stay on the server — the browser only sees pixel IDs.</li>
            </ul>
          </section>
        </div>
      </div>

      <section className="a-card mt-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-medium text-slate-900">Server event log</h2>
            <p className="text-xs text-slate-500">
              Last 80 Conversions API deliveries{eventFilter ? ` · ${eventFilter}` : ""} (kept 30 days)
              {eventFilter && <> · <Link href={filterHref({ event: "" })} className="text-brand-700 underline">clear filter</Link></>}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {Number(retryable?.count ?? 0) > 0 && config.capiEnabled && <RetryButton count={Number(retryable?.count)} />}
            <div className="flex rounded-lg bg-slate-100 p-0.5 text-sm">
              <Link href={filterHref({ log: "" })} className={`rounded-md px-3 py-1.5 font-medium ${!failedOnly ? "bg-white shadow-sm" : "text-slate-500"}`}>All</Link>
              <Link href={filterHref({ log: "failed" })} className={`rounded-md px-3 py-1.5 font-medium ${failedOnly ? "bg-white shadow-sm" : "text-slate-500"}`}>Failed</Link>
            </div>
          </div>
        </div>
        {rows.length === 0 ? (
          <EmptyState title={failedOnly ? "No failed events" : "No server events yet"}
            text={config.capiEnabled ? "Events appear here as visitors browse and order." : "Turn on the Conversions API to start sending events."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-slate-50/70 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Time</th>
                  <th className="px-3 py-2.5 font-medium">Event</th>
                  <th className="px-3 py-2.5 font-medium">Pixel</th>
                  <th className="px-3 py-2.5 font-medium">Order</th>
                  <th className="px-3 py-2.5 font-medium">Result</th>
                  <th className="px-5 py-2.5 font-medium">Facebook response</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap px-5 py-2.5 text-slate-500">{dateTime(r.created_at)}</td>
                    <td className="px-3 py-2.5">
                      <span className="font-medium text-slate-900">{r.event_name}</span>
                      {!!r.is_test && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800">Test</span>}
                      <p className="max-w-52 truncate font-mono text-[11px] text-slate-400" title={r.event_id}>{r.event_id}</p>
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      {r.pixel_id ? <><span className="text-slate-700">{pixelLabel.get(r.pixel_id) || "—"}</span><p className="font-mono text-slate-400">{r.pixel_id}</p></> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      {r.order_id ? <Link href={`/admin/orders/${r.order_id}`} className="text-brand-700 hover:underline">#{r.order_no ?? r.order_id}</Link> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                        r.success ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : "bg-rose-50 text-rose-700 ring-rose-600/20"}`}>
                        {r.success ? "Sent" : "Failed"}{r.http_status ? ` · ${r.http_status}` : ""}
                      </span>
                      {!r.success && !!r.retried && <p className="mt-0.5 text-[11px] text-slate-400">retried</p>}
                    </td>
                    <td className="max-w-80 px-5 py-2.5 text-xs text-slate-500"><p className="line-clamp-2" title={r.response ?? ""}>{r.response}</p></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
