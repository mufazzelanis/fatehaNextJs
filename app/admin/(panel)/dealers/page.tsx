import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { can, requirePermission } from "@/lib/auth";
import { query } from "@/lib/db";
import {
  areaSales, DEALER_SELECT, DEALER_STATUS_META, dealerArea, isDealerLevel, isMonth, LEVEL_LABEL, monthLabel, monthOf, monthOptions,
  type Dealer, type DealerStatus,
} from "@/lib/dealer";
import { bdt } from "@/lib/store-config";
import { dateTime } from "@/lib/format";
import { EmptyState, PageHeader, PanelSkeleton } from "@/components/admin/ui";
import { ExternalIcon, SearchIcon } from "@/components/icons";
import { TargetCell } from "./dealer-forms";

export const metadata = { title: "Dealers" };

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "active", label: "Active" },
  { key: "suspended", label: "Suspended" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
  { key: "targets", label: "Targets" },
] as const;

export default function DealersPage(props: PageProps<"/admin/dealers">) {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <Dealers {...props} />
    </Suspense>
  );
}

async function Dealers({ searchParams }: PageProps<"/admin/dealers">) {
  const admin = await requirePermission("dealers.view");
  await connection();
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const counts = await query<{ status: DealerStatus; n: number }>("SELECT status, COUNT(*) AS n FROM dealers GROUP BY status");
  const count = (s: string) => (s === "all" ? counts.reduce((a, c) => a + Number(c.n), 0) : Number(counts.find((c) => c.status === s)?.n ?? 0));
  const tab = TABS.some((t) => t.key === one("tab")) ? one("tab") : count("pending") > 0 ? "pending" : "active";
  const district = Number(one("district")) || 0;
  const level = isDealerLevel(one("level")) ? one("level") : "";
  const q = one("q").trim().slice(0, 60);
  const current = monthOf(new Date());
  const month = isMonth(one("month")) ? one("month") : current;
  const districts = await query<{ id: number; name: string }>("SELECT id, name FROM districts ORDER BY name");

  const where: string[] = [];
  const args: (string | number)[] = [];
  if (tab === "targets") where.push("dl.status = 'active'");
  else if (tab !== "all") { where.push("dl.status = ?"); args.push(tab); }
  if (district) { where.push("dl.district_id = ?"); args.push(district); }
  if (level) { where.push("COALESCE(dl.level, dl.applied_level) = ?"); args.push(level); }
  else if (tab === "targets") where.push("dl.level = 'district'");
  if (q) { where.push("(dl.name LIKE ? OR dl.phone LIKE ? OR dl.nid_number LIKE ?)"); args.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  const rows = await query<Dealer & { target: number | null }>(
    `${DEALER_SELECT.replace("FROM dealers dl", "FROM dealers dl LEFT JOIN dealer_targets tg ON tg.dealer_id = dl.id AND tg.month = ?").replace("SELECT ", "SELECT tg.amount AS target, ")}
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY FIELD(dl.level,'district','thana','union'), d.name, t.name, dl.id DESC LIMIT 300`,
    [month, ...args],
  );
  const sales = tab === "targets" ? await Promise.all(rows.map((r) => areaSales(r.level!, dealerArea(r), month))) : [];
  const canManage = can(admin, "dealers.manage");
  const href = (patch: Record<string, string | number>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ tab, district: district || "", level, q, month: tab === "targets" && month !== current ? month : "", ...patch })) if (v) u.set(k, String(v));
    return `/admin/dealers?${u}`;
  };
  const totals = tab === "targets" ? { target: rows.reduce((s, r) => s + Number(r.target ?? 0), 0), sales: sales.reduce((s, x) => s + x.amount, 0) } : null;

  return (
    <>
      <PageHeader title="Dealers" description="Review applications, manage district → thana → union dealers and set monthly targets."
        actions={<a href="/business/register" target="_blank" className="a-btn-outline"><ExternalIcon className="size-4" /> Registration page</a>} />

      <div className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex w-max gap-1 rounded-xl bg-white p-1 shadow-xs ring-1 ring-slate-200/80">
          {TABS.map((t) => (
            <Link key={t.key} href={href({ tab: t.key, month: "" })}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition ${tab === t.key ? "bg-brand-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}>
              {t.label}
              {t.key !== "targets" && <span className={`rounded-md px-1.5 text-xs tabular-nums ${tab === t.key ? "bg-white/20" : t.key === "pending" && count("pending") ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500"}`}>{count(t.key)}</span>}
            </Link>
          ))}
        </div>
      </div>

      <form action="/admin/dealers" className="a-card mb-4 flex flex-wrap items-center gap-2 p-3">
        <input type="hidden" name="tab" value={tab} />
        <div className="relative min-w-0 flex-1 basis-56">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input name="q" defaultValue={q} placeholder="Name, mobile or NID…" className="a-input pl-9" />
        </div>
        <select name="district" defaultValue={district || ""} className="a-input w-auto" aria-label="District">
          <option value="">All districts</option>
          {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select name="level" defaultValue={level} className="a-input w-auto" aria-label="Level">
          <option value="">{tab === "targets" ? "District dealers" : "All levels"}</option>
          {(["district", "thana", "union"] as const).map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
        </select>
        {tab === "targets" && (
          <select name="month" defaultValue={month} className="a-input w-auto" aria-label="Month">
            {monthOptions(current).map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
        )}
        <button className="a-btn">Show</button>
      </form>

      {totals && (
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Tile label={`Targets · ${monthLabel(month)}`} value={bdt(totals.target)} />
          <Tile label="Achieved" value={bdt(totals.sales)} />
          <Tile label="Progress" value={totals.target ? `${Math.round((totals.sales / totals.target) * 100)}%` : "—"} />
          <Tile label="Dealers shown" value={String(rows.length)} />
        </div>
      )}

      <div className="a-card overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState title={tab === "pending" ? "No applications waiting" : "No dealers found"} text="New applications from /business/register appear under Pending." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50/80 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Dealer</th>
                  <th className="px-3 py-3">Level</th>
                  <th className="px-3 py-3">Area</th>
                  {tab === "targets" ? (<><th className="px-3 py-3">Target</th><th className="px-4 py-3">Achieved</th></>) : (<><th className="px-3 py-3">Status</th><th className="px-4 py-3">Applied</th></>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, i) => {
                  const lvl = r.level ?? r.applied_level;
                  const pct = r.target ? Math.min(100, Math.round(((sales[i]?.amount ?? 0) / Number(r.target)) * 100)) : null;
                  return (
                    <tr key={r.id} className="transition hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <Link href={`/admin/dealers/${r.id}`} className="font-medium text-slate-900 hover:text-brand-700">{r.name}</Link>
                        <p className="text-xs text-slate-500">{r.phone}</p>
                      </td>
                      <td className="px-3 py-3 text-slate-700">{lvl ? LEVEL_LABEL[lvl] : "—"}{!r.level && r.applied_level && <span className="block text-xs text-slate-400">applied</span>}</td>
                      <td className="px-3 py-3 text-slate-600">{[lvl === "union" ? r.union_name : null, lvl !== "district" ? r.thana : null, r.district].filter(Boolean).join(", ")}</td>
                      {tab === "targets" ? (
                        <>
                          <td className="px-3 py-3"><TargetCell dealerId={r.id} month={month} value={r.target != null ? Number(r.target) : null} readOnly={!canManage} /></td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-slate-900">{bdt(sales[i]?.amount ?? 0)}</span>
                            <span className="ml-2 text-xs text-slate-400">{pct != null ? `${pct}%` : `${sales[i]?.orders ?? 0} orders`}</span>
                            {pct != null && <div className="mt-1 h-1.5 w-32 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-600" style={{ width: `${pct}%` }} /></div>}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${DEALER_STATUS_META[r.status].className}`}>{DEALER_STATUS_META[r.status].label}</span></td>
                          <td className="px-4 py-3 text-xs text-slate-500">{dateTime(r.created_at)}</td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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
