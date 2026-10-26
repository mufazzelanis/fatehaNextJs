import Link from "next/link";
import { Suspense } from "react";
import { requirePermission } from "@/lib/auth";
import { activitySummary, listActivity, type ActivityRow } from "@/lib/data/activity";
import { dateTime } from "@/lib/format";
import { EmptyState, PageHeader, Pagination, PanelSkeleton } from "@/components/admin/ui";
import { AlertIcon, ChevronDownIcon, DownloadIcon, SearchIcon } from "@/components/icons";

export const metadata = { title: "Activity Log" };

const MODULES: Record<string, { label: string; tint: string }> = {
  auth: { label: "Sign-in", tint: "bg-slate-100 text-slate-700" },
  orders: { label: "Orders", tint: "bg-sky-50 text-sky-700" },
  customers: { label: "Customers", tint: "bg-violet-50 text-violet-700" },
  products: { label: "Product", tint: "bg-amber-50 text-amber-800" },
  content: { label: "Content", tint: "bg-emerald-50 text-emerald-700" },
  checkout: { label: "Checkout", tint: "bg-teal-50 text-teal-700" },
  marketing: { label: "Marketing", tint: "bg-indigo-50 text-indigo-700" },
  settings: { label: "Settings", tint: "bg-orange-50 text-orange-700" },
  users: { label: "Users", tint: "bg-rose-50 text-rose-700" },
};

export default function ActivityPage({ searchParams }: PageProps<"/admin/activity">) {
  return (
    <Suspense fallback={<PanelSkeleton rows={12} />}>
      <Activity searchParams={searchParams} />
    </Suspense>
  );
}

const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

function entityLink(r: ActivityRow) {
  if (!r.entity_id) return null;
  if (r.entity_type === "order") return `/admin/orders/${r.entity_id}`;
  if (r.entity_type === "user") return `/admin/activity?user=${r.entity_id}`;
  if (r.entity_type === "role") return "/admin/users?tab=roles";
  if (r.entity_type === "product") return "/admin/products";
  return null;
}

const show = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : String(v));

function device(ua: string | null) {
  if (!ua) return "—";
  const os = /Android/i.test(ua) ? "Android" : /iPhone|iPad/i.test(ua) ? "iOS" : /Windows/i.test(ua) ? "Windows" : /Mac OS/i.test(ua) ? "macOS" : /Linux/i.test(ua) ? "Linux" : "Other";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : /node/i.test(ua) ? "Script" : "Browser";
  return `${browser} · ${os}`;
}

async function Activity({ searchParams }: Pick<PageProps<"/admin/activity">, "searchParams">) {
  await requirePermission("logs.view");
  const sp = await searchParams;
  const filters = {
    user: str(sp.user), module: str(sp.module), q: str(sp.q), from: str(sp.from), to: str(sp.to),
    entity: str(sp.entity), id: str(sp.id), page: Number(str(sp.page)) || 1,
  };
  const [result, summary] = await Promise.all([listActivity(filters), activitySummary()]);

  const qs = (over: Record<string, string | number>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...filters, page: "", ...over })) if (v) p.set(k, String(v));
    const s = p.toString();
    return s ? `?${s}` : "";
  };
  const filtered = filters.user || filters.module || filters.q || filters.from || filters.to || filters.entity;

  return (
    <>
      <PageHeader title="Activity Log" description="Every change staff make, with who, when, from where — and what changed."
        actions={<a href={`/admin/activity-export${qs({})}`} className="a-btn-outline"><DownloadIcon className="size-4" /> Export CSV</a>} />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="a-card p-4 sm:p-5">
          <p className="text-xs font-medium text-slate-500 sm:text-sm">Today</p>
          <p className="mt-2 text-[22px] font-semibold tabular-nums text-slate-900 sm:text-[26px]">{summary.today}</p>
          <p className="text-xs text-slate-400">recorded actions</p>
        </div>
        <Link href={`/admin/activity${qs({ module: "auth", q: "Failed" })}`} className={`a-card p-4 transition hover:shadow-md sm:p-5 ${summary.failedLogins ? "ring-1 ring-rose-200" : ""}`}>
          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500 sm:text-sm">
            {summary.failedLogins > 0 && <AlertIcon className="size-4 text-rose-500" />} Failed sign-ins (24h)
          </p>
          <p className={`mt-2 text-[22px] font-semibold tabular-nums sm:text-[26px] ${summary.failedLogins ? "text-rose-600" : "text-slate-900"}`}>{summary.failedLogins}</p>
          <p className="text-xs text-slate-400">5 in 15 min locks the account</p>
        </Link>
        <div className="a-card col-span-2 p-4 sm:p-5">
          <p className="text-xs font-medium text-slate-500 sm:text-sm">Last 7 days by area</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {summary.byModule.length === 0 && <span className="text-sm text-slate-400">No activity yet</span>}
            {summary.byModule.map((m) => (
              <Link key={m.module} href={`/admin/activity${qs({ module: m.module })}`}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition hover:brightness-95 ${MODULES[m.module]?.tint ?? "bg-slate-100 text-slate-700"}`}>
                {MODULES[m.module]?.label ?? m.module} <span className="tabular-nums opacity-70">{m.n}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <form className="a-card mb-4 grid grid-cols-2 gap-3 p-3 lg:grid-cols-[1.4fr_1fr_1fr_auto_auto_auto] lg:items-end">
        {filters.entity && <input type="hidden" name="entity" value={filters.entity} />}
        {filters.id && <input type="hidden" name="id" value={filters.id} />}
        <div className="relative col-span-2 lg:col-span-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input name="q" defaultValue={filters.q} placeholder="Search description, person or IP…" className="a-input pl-9" />
        </div>
        <select name="user" defaultValue={filters.user} className="a-input col-span-2 sm:col-span-1" aria-label="Person">
          <option value="">Everyone</option>
          <option value="system">Customers & system</option>
          {summary.people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select name="module" defaultValue={filters.module} className="a-input col-span-2 sm:col-span-1" aria-label="Area">
          <option value="">All areas</option>
          {Object.entries(MODULES).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
        </select>
        <input type="date" name="from" defaultValue={filters.from} className="a-input" aria-label="From" />
        <input type="date" name="to" defaultValue={filters.to} className="a-input" aria-label="To" />
        <div className="col-span-2 flex gap-2 lg:col-span-1">
          <button type="submit" className="a-btn flex-1">Filter</button>
          {filtered && <Link href="/admin/activity" className="a-btn-outline">Clear</Link>}
        </div>
      </form>

      <section className="a-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 text-sm text-slate-500 sm:px-5">
          <span>{result.total} entr{result.total === 1 ? "y" : "ies"}{filters.entity === "order" && filters.id ? ` for order ${filters.id}` : ""}</span>
        </div>
        {result.rows.length === 0 ? (
          <EmptyState title="Nothing recorded yet" text="Sign-ins and every change staff make will appear here." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {result.rows.map((r) => {
              const link = entityLink(r);
              const mod = MODULES[r.module];
              const failed = r.action === "auth.login_failed" || r.action === "auth.login_blocked";
              return (
                <li key={r.id}>
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-3 transition hover:bg-slate-50/70 sm:px-5 [&::-webkit-details-marker]:hidden">
                      <span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold ${failed ? "bg-rose-100 text-rose-700" : r.user_name ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-500"}`}>
                        {failed ? "!" : (r.user_name ?? "C").slice(0, 1).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-sans text-sm text-slate-800">{r.description}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                          <span className="font-medium text-slate-500">{r.user_name ?? "Customer / system"}</span>
                          <span>·</span>
                          <span>{dateTime(r.created_at)}</span>
                          <span className={`rounded-full px-2 py-px text-[10px] font-semibold uppercase ${mod?.tint ?? "bg-slate-100 text-slate-600"}`}>{mod?.label ?? r.module}</span>
                          {r.changes.length > 0 && <span className="text-brand-600">{r.changes.length} change{r.changes.length === 1 ? "" : "s"}</span>}
                        </p>
                      </div>
                      <ChevronDownIcon className="mt-1 size-4 shrink-0 text-slate-300 transition group-open:rotate-180" />
                    </summary>
                    <div className="space-y-3 bg-slate-50/60 px-4 pb-4 pt-1 sm:px-5 sm:pl-16">
                      {r.changes.length > 0 && (
                        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                          <table className="w-full min-w-[480px] text-xs">
                            <thead className="bg-slate-50 text-left text-slate-500">
                              <tr><th className="px-3 py-2 font-medium">Field</th><th className="px-3 py-2 font-medium">Before</th><th className="px-3 py-2 font-medium">After</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {r.changes.map((c, i) => (
                                <tr key={i}>
                                  <td className="px-3 py-2 font-medium capitalize text-slate-700">{c.field.replace(/_/g, " ")}</td>
                                  <td className="max-w-64 px-3 py-2 font-sans text-rose-700"><span className="line-through decoration-rose-300">{show(c.from)}</span></td>
                                  <td className="max-w-64 px-3 py-2 font-sans text-emerald-700">{show(c.to)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      <dl className="grid gap-x-6 gap-y-1 text-xs text-slate-500 sm:grid-cols-3">
                        <div><dt className="inline text-slate-400">Action </dt><dd className="inline font-mono">{r.action}</dd></div>
                        <div><dt className="inline text-slate-400">IP </dt><dd className="inline font-mono">{r.ip_address ?? "—"}</dd></div>
                        <div><dt className="inline text-slate-400">Device </dt><dd className="inline">{device(r.user_agent)}</dd></div>
                      </dl>
                      {link && <Link href={link} className="inline-block text-xs font-medium text-brand-700 hover:underline">Open {r.entity_type} →</Link>}
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          <span>Page {result.page} of {result.pages}</span>
          <Pagination page={result.page} pages={result.pages} href={(p) => `/admin/activity${qs({ page: p })}`} />
        </div>
      </section>
    </>
  );
}
