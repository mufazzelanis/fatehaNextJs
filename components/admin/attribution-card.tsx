import Link from "next/link";
import { headline, parseAttribution, UTM_KEYS, type Touch } from "@/lib/attribution";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-3 py-1.5 text-sm">
      <dt className="font-medium text-slate-600">{label}</dt>
      <dd className="min-w-0 break-words text-slate-900">{children}</dd>
    </div>
  );
}

function Visit({ title, t }: { title: string; t: Touch }) {
  return (
    <div className="border-t border-slate-100 pt-3">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <dl>
        {t.url && <Row label="Landing page"><a href={t.url} target="_blank" rel="noopener noreferrer" className="text-brand-700 underline decoration-brand-300 hover:decoration-brand-700">{t.url}</a></Row>}
        <Row label="Traffic source">{t.source}{t.fbclid ? <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-semibold text-blue-700">Facebook ad click</span> : null}{t.gclid ? <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800">Google ad click</span> : null}</Row>
        {UTM_KEYS.filter((k) => t[k]).map((k) => (
          <Row key={k} label={`${k}:`}>
            {k === "utm_campaign" ? (
              <Link href={`/admin/orders?campaign=${encodeURIComponent(t[k]!)}`} className="font-mono text-brand-700 hover:underline" title="All orders from this campaign">{t[k]}</Link>
            ) : <span className="font-mono">{t[k]}</span>}
          </Row>
        ))}
        {t.at > 0 && <Row label="Arrived">{new Date(t.at).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</Row>}
      </dl>
    </div>
  );
}

/** "Where did this order come from?" — first visit, the visit that led to the order, and the customer's clock. */
export function AttributionCard({ raw }: { raw: string | null }) {
  const a = parseAttribution(raw);
  const h = headline(a);
  return (
    <section className="a-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-slate-900">Order attribution</h2>
        {h.source && (
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-800 ring-1 ring-inset ring-brand-600/15">
            {h.source}{h.campaign ? " · campaign" : ""}
          </span>
        )}
      </div>
      {!a ? (
        <p className="mt-2 text-sm text-slate-400">Not recorded (orders placed before this feature, or the browser blocked storage).</p>
      ) : (
        <div className="mt-2 space-y-3">
          {h.campaign && (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
              Campaign: <Link href={`/admin/orders?campaign=${encodeURIComponent(h.campaign)}`} className="font-mono font-semibold text-brand-700 hover:underline">{h.campaign}</Link>
            </p>
          )}
          {a.first && <Visit title="First visit" t={a.first} />}
          {a.last && (a.last.at !== a.first?.at || a.last.url !== a.first?.url) && <Visit title="Last visit" t={a.last} />}
          {a.browser && (
            <div className="border-t border-slate-100 pt-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Client&apos;s browser time</p>
              <dl>
                <Row label="Hour:">{a.browser.hour}</Row>
                <Row label="Day:">{a.browser.day}</Row>
                <Row label="Month:">{a.browser.month}</Row>
                {a.browser.tz && <Row label="Time zone:">{a.browser.tz}</Row>}
              </dl>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
