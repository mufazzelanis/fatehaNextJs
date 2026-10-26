import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { can, requirePermission } from "@/lib/auth";
import { query } from "@/lib/db";
import { getDistricts } from "@/lib/data/locations";
import {
  areaName, areaSales, childAreas, DEALER_STATUS_META, dealerArea, getDealerById, LEVEL_LABEL, monthLabel, monthOf, shiftMonth,
} from "@/lib/dealer";
import { bdt } from "@/lib/store-config";
import { dateTime } from "@/lib/format";
import { PageHeader, PanelSkeleton } from "@/components/admin/ui";
import { ChevronLeftIcon, PhoneIcon } from "@/components/icons";
import { DeleteDealerButton, ProfileForm, ReviewPanel, TargetCell } from "../dealer-forms";

export const metadata = { title: "Dealer" };

export default function DealerPage(props: PageProps<"/admin/dealers/[id]">) {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <DealerView {...props} />
    </Suspense>
  );
}

async function DealerView({ params }: PageProps<"/admin/dealers/[id]">) {
  const admin = await requirePermission("dealers.view");
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const d = await getDealerById(id);
  if (!d) notFound();
  await connection();
  const canManage = can(admin, "dealers.manage");
  const current = monthOf(new Date());
  const months = [-2, -1, 0, 1, 2].map((n) => shiftMonth(current, n));

  const [targets, districts, activity] = await Promise.all([
    query<{ month: string; amount: number; set_by: string }>(`SELECT month, amount, set_by FROM dealer_targets WHERE dealer_id = ? AND month IN (${months.map(() => "?").join(",")})`, [id, ...months]),
    getDistricts(),
    query<{ id: number; user_name: string | null; description: string; created_at: Date }>(
      "SELECT id, user_name, description, created_at FROM activity_logs WHERE entity_type = 'dealer' AND entity_id = ? ORDER BY id DESC LIMIT 12",
      [String(id)],
    ),
  ]);
  const perMonth = d.level && d.status === "active" ? await Promise.all(months.map((m) => areaSales(d.level!, dealerArea(d), m))) : null;
  const subs = d.level && d.level !== "union" && d.status === "active" ? await childAreas(d.level, dealerArea(d), current) : null;
  const docs = ([["photo", "Photo"], ["nid_front", "NID front"], ["nid_back", "NID back"], ["bank_slip", "Bank slip"]] as const)
    .map(([k, label]) => ({ label, file: d[k] }));
  const status = DEALER_STATUS_META[d.status];

  return (
    <>
      <Link href="/admin/dealers" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"><ChevronLeftIcon className="size-4" /> All dealers</Link>
      <PageHeader title={d.name}
        description={`${d.level ? LEVEL_LABEL[d.level] : `Applied for ${d.applied_level ? LEVEL_LABEL[d.applied_level] : "—"}`} · ${areaName(d)}`}
        actions={<>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${status.className}`}>{status.label}</span>
          <a href={`tel:${d.phone}`} className="a-btn-outline"><PhoneIcon className="size-4" /> Call</a>
        </>} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="min-w-0 space-y-6 xl:col-span-2">
          <section className="a-card p-5">
            <h2 className="mb-4 font-medium text-slate-900">Documents</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {docs.map(({ label, file }) => (
                <div key={label}>
                  {file ? (
                    <a href={`/admin/dealer-doc/${file}`} target="_blank" className="group block aspect-[4/3] overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                      {file.endsWith(".pdf") ? (
                        <span className="grid size-full place-items-center text-sm font-semibold text-rose-600">PDF ↗</span>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`/admin/dealer-doc/${file}`} alt={label} className="size-full object-cover transition group-hover:scale-105" />
                      )}
                    </a>
                  ) : <div className="grid aspect-[4/3] place-items-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">Missing</div>}
                  <p className="mt-1.5 text-xs font-medium text-slate-600">{label}</p>
                </div>
              ))}
            </div>
            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-slate-500">NID number</dt><dd className="select-all font-mono font-medium text-slate-900">{d.nid_number}</dd></div>
              <div><dt className="text-xs text-slate-500">Email</dt><dd className="text-slate-900">{d.email ?? "—"}</dd></div>
              <div className="sm:col-span-2"><dt className="text-xs text-slate-500">Address</dt><dd className="text-slate-900">{d.address}</dd></div>
              <div><dt className="text-xs text-slate-500">Applied</dt><dd className="text-slate-900">{dateTime(d.created_at)}</dd></div>
              <div><dt className="text-xs text-slate-500">Last sign-in</dt><dd className="text-slate-900">{d.last_login_at ? dateTime(d.last_login_at) : "Never"}</dd></div>
            </dl>
          </section>

          {perMonth && (
            <section className="a-card overflow-hidden">
              <h2 className="px-5 pb-3 pt-5 font-medium text-slate-900">Targets & sales</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead className="bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr><th className="px-5 py-2.5">Month</th><th className="px-3 py-2.5">Target</th><th className="px-3 py-2.5">Sales</th><th className="px-5 py-2.5">Orders</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {months.map((m, i) => {
                      const t = targets.find((x) => x.month === m);
                      return (
                        <tr key={m} className={m === current ? "bg-brand-50/30" : ""}>
                          <td className="px-5 py-3 font-medium text-slate-900">{monthLabel(m)}{m === current && <span className="ml-1.5 text-xs text-brand-700">now</span>}
                            {t && t.set_by === "dealer" && <span className="block text-xs font-normal text-slate-400">set by upper dealer</span>}</td>
                          <td className="px-3 py-3"><TargetCell dealerId={d.id} month={m} value={t ? Number(t.amount) : null} readOnly={!canManage} /></td>
                          <td className="px-3 py-3 font-medium text-slate-900">{bdt(perMonth[i].amount)}{t && Number(t.amount) > 0 && <span className="ml-1.5 text-xs text-slate-400">{Math.round((perMonth[i].amount / Number(t.amount)) * 100)}%</span>}</td>
                          <td className="px-5 py-3 text-slate-600">{perMonth[i].orders}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {subs && (
            <section className="a-card overflow-hidden">
              <h2 className="px-5 pb-3 pt-5 font-medium text-slate-900">{d.level === "district" ? "Thanas" : "Unions"} — {monthLabel(current)}</h2>
              <ul className="divide-y divide-slate-100 text-sm">
                {subs.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5">
                    <span className="font-medium text-slate-900">{s.name}</span>
                    <span className="text-slate-600">
                      {s.dealer ? <Link href={`/admin/dealers/${s.dealer.id}`} className="text-brand-700 hover:underline">{s.dealer.name}</Link> : <span className="text-slate-400">No dealer</span>}
                      <span className="text-slate-400"> · target {s.target != null ? bdt(s.target) : "—"} · sales {bdt(s.sales)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {canManage && (
            <section className="a-card p-5">
              <h2 className="mb-4 font-medium text-slate-900">Edit details</h2>
              <ProfileForm districts={districts} dealer={{ id: d.id, name: d.name, phone: d.phone, email: d.email, address: d.address, district_id: d.district_id, thana_id: d.thana_id, union_id: d.union_id, level: d.level }} />
            </section>
          )}
        </div>

        <div className="min-w-0 space-y-6">
          {canManage && (
            <section className="a-card p-5">
              <h2 className="mb-4 font-medium text-slate-900">{d.status === "pending" ? "Review application" : "Account"}</h2>
              <ReviewPanel id={d.id} status={d.status} level={d.level} appliedLevel={d.applied_level} hasUnion={!!d.union_id} />
              {d.admin_note && <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600"><strong>Note:</strong> {d.admin_note}</p>}
            </section>
          )}
          <section className="a-card p-5">
            <h2 className="mb-3 font-medium text-slate-900">Activity</h2>
            {activity.length === 0 ? <p className="text-sm text-slate-400">Nothing yet.</p> : (
              <ul className="space-y-2.5">
                {activity.map((a) => (
                  <li key={a.id} className="text-sm"><p className="text-slate-700">{a.description}</p><p className="text-xs text-slate-400">{a.user_name ?? "Dealer"} · {dateTime(a.created_at)}</p></li>
                ))}
              </ul>
            )}
          </section>
          {canManage && <div className="flex justify-end"><DeleteDealerButton id={d.id} /></div>}
        </div>
      </div>
    </>
  );
}
