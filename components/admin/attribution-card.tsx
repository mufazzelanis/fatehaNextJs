import Link from "next/link";
import { AD_KEYS, headline, isFacebookTouch, parseAttribution, UTM_KEYS, type Touch } from "@/lib/attribution";
import { adNames, type AdKind } from "@/lib/data/ads";

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-3 py-1.5 text-sm">
      <dt className="font-medium text-slate-600">{label}{hint && <span className="block text-[11px] font-normal text-slate-400">{hint}</span>}</dt>
      <dd className="min-w-0 wrap-break-word text-slate-900">{children}</dd>
    </div>
  );
}

/** utm_campaign / utm_content / utm_term are campaign / ad set / ad IDs when the visit came from a Facebook ad. */
const FB_LEVEL: Partial<Record<(typeof UTM_KEYS)[number], { kind: AdKind; label: string; filter: string }>> = {
  utm_campaign: { kind: "campaign", label: "Campaign", filter: "campaign" },
  utm_content: { kind: "adset", label: "Ad set", filter: "adset" },
  utm_term: { kind: "ad", label: "Ad", filter: "ad" },
};
const AD_LABEL: Record<(typeof AD_KEYS)[number], string> = {
  campaign_name: "Campaign name", adset_name: "Ad set name", ad_name: "Ad name", placement: "Placement", site_source_name: "Site (fb / ig)",
};

function Visit({ title, t, names }: { title: string; t: Touch; names: Map<string, string> }) {
  const fb = isFacebookTouch(t);
  return (
    <div className="border-t border-slate-100 pt-3">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <dl>
        {t.url && <Row label="Landing page"><a href={t.url} target="_blank" rel="noopener noreferrer" className="text-brand-700 underline decoration-brand-300 hover:decoration-brand-700">{t.url}</a></Row>}
        <Row label="Traffic source">{t.source}{t.fbclid ? <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-semibold text-blue-700">Facebook ad click</span> : null}{t.gclid ? <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800">Google ad click</span> : null}</Row>
        {UTM_KEYS.filter((k) => t[k]).map((k) => {
          const level = FB_LEVEL[k];
          const value = t[k]!;
          if (!level || (k !== "utm_campaign" && !fb)) return <Row key={k} label={`${k}:`}><span className="font-mono">{value}</span></Row>;
          const name = names.get(`${level.kind}:${value}`) || (level.kind === "campaign" ? t.campaign_name : level.kind === "adset" ? t.adset_name : t.ad_name) || "";
          return (
            <Row key={k} label={`${k}:`} hint={fb ? `Facebook ${level.label.toLowerCase()} ID` : undefined}>
              <Link href={`/admin/orders?${level.filter}=${encodeURIComponent(value)}`} className="font-mono text-brand-700 hover:underline" title={`All orders from this ${level.label.toLowerCase()}`}>{value}</Link>
              {name && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-700">{name}</span>}
            </Row>
          );
        })}
        {AD_KEYS.filter((k) => t[k] && !k.endsWith("_name")).map((k) => <Row key={k} label={AD_LABEL[k]}>{t[k]}</Row>)}
        {t.at > 0 && <Row label="Arrived">{new Date(t.at).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</Row>}
      </dl>
    </div>
  );
}

/** "Where did this order come from?" — first visit, the visit that led to the order, and the customer's clock. */
export async function AttributionCard({ raw }: { raw: string | null }) {
  const a = parseAttribution(raw);
  const h = headline(a);
  const touches = [a?.first, a?.last].filter((t): t is Touch => !!t);
  const names = await adNames(touches.flatMap((t) => [
    { kind: "campaign" as const, id: t.utm_campaign }, { kind: "adset" as const, id: t.utm_content }, { kind: "ad" as const, id: t.utm_term },
  ]));
  const campaignName = h.campaign ? names.get(`campaign:${h.campaign}`) || h.names.campaign : "";
  return (
    <section className="a-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-slate-900">Order attribution</h2>
        {h.source && (
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-800 ring-1 ring-inset ring-brand-600/15">
            {h.facebook ? "Facebook ad" : h.source}{h.campaign ? " · campaign" : ""}
          </span>
        )}
      </div>
      {!a ? (
        <p className="mt-2 text-sm text-slate-400">Not recorded (orders placed before this feature, or the browser blocked storage).</p>
      ) : (
        <div className="mt-2 space-y-3">
          {h.campaign && (
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <p>
                Campaign: <Link href={`/admin/orders?campaign=${encodeURIComponent(h.campaign)}`} className="font-semibold text-brand-700 hover:underline">{campaignName || <span className="font-mono">{h.campaign}</span>}</Link>
              </p>
              {h.facebook && (h.content || h.term) && (
                <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
                  {h.content && <Link href={`/admin/orders?adset=${encodeURIComponent(h.content)}`} className="hover:text-brand-700 hover:underline">Ad set: <b>{names.get(`adset:${h.content}`) || h.names.adset || h.content}</b></Link>}
                  {h.term && <Link href={`/admin/orders?ad=${encodeURIComponent(h.term)}`} className="hover:text-brand-700 hover:underline">Ad: <b>{names.get(`ad:${h.term}`) || h.names.ad || h.term}</b></Link>}
                  <Link href="/admin/ads" className="ml-auto font-medium text-brand-700 hover:underline">Ad Performance →</Link>
                </p>
              )}
            </div>
          )}
          {a.first && <Visit title="First visit" t={a.first} names={names} />}
          {a.last && (a.last.at !== a.first?.at || a.last.url !== a.first?.url) && <Visit title="Last visit" t={a.last} names={names} />}
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
