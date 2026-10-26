import Link from "next/link";
import { Suspense } from "react";
import { can, requirePermission } from "@/lib/auth";
import { getRegisteredCustomerCount, listCustomers } from "@/lib/data/reports";
import { dateTime, money } from "@/lib/format";
import { toggleBlockPhone } from "@/app/actions/admin";
import { EmptyState, PageHeader, Pagination, PanelSkeleton } from "@/components/admin/ui";
import { BanIcon, SearchIcon } from "@/components/icons";

export const metadata = { title: "Customers" };

export default function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  return (
    <Suspense fallback={<PanelSkeleton rows={10} />}>
      <Customers searchParams={searchParams} />
    </Suspense>
  );
}

async function Customers({ searchParams }: Pick<PageProps<"/admin/customers">, "searchParams">) {
  const admin = await requirePermission("customers.view");
  const canBlock = can(admin, "customers.block");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const page = Number(sp.page) || 1;
  const [result, registered] = await Promise.all([listCustomers({ q, page }), getRegisteredCustomerCount()]);
  const href = (p: number) => `/admin/customers?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;

  return (
    <>
      <PageHeader title="Customers" description={`${result.total} unique buyers · ${registered} registered accounts`} />
      <form className="a-card mb-4 flex gap-2 p-3">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input name="q" defaultValue={q} placeholder="Search by phone or name…" className="a-input pl-9" />
        </div>
        <button type="submit" className="a-btn">Search</button>
      </form>

      <div className="a-card overflow-hidden">
        {result.rows.length === 0 ? <EmptyState title="No customers yet" /> : (
          <>
          {/* Phones: cards */}
          <ul className="divide-y divide-slate-100 md:hidden">
            {result.rows.map((c) => {
              const closed = Number(c.delivered) + Number(c.cancelled);
              const rate = closed ? Math.round((Number(c.delivered) / closed) * 100) : null;
              return (
                <li key={c.phone} className={`px-4 py-3.5 ${c.blocked ? "bg-rose-50/50" : ""}`}>
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-50 font-sans font-semibold text-brand-700">{c.name.slice(0, 1)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-1.5 font-sans font-medium text-slate-900">
                        <span className="truncate">{c.name}</span>
                        {c.user_id && <span className="rounded bg-sky-50 px-1.5 py-0.5 font-ui text-[10px] font-semibold uppercase text-sky-700">Account</span>}
                        {!!c.blocked && <span className="rounded bg-rose-100 px-1.5 py-0.5 font-ui text-[10px] font-semibold uppercase text-rose-700">Blocked</span>}
                      </p>
                      <a href={`tel:${c.phone}`} className="text-xs text-slate-500">{c.phone}</a>
                    </div>
                    {canBlock && <form action={toggleBlockPhone}>
                      <input type="hidden" name="phone" value={c.phone} />
                      <input type="hidden" name="block" value={c.blocked ? "0" : "1"} />
                      <button type="submit" aria-label={c.blocked ? "Unblock" : "Block"}
                        className={`grid size-9 place-items-center rounded-full ring-1 transition active:scale-95 ${c.blocked ? "text-slate-600 ring-slate-200" : "text-rose-600 ring-rose-200"}`}>
                        <BanIcon className="size-4" />
                      </button>
                    </form>}
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <Link href={`/admin/orders?q=${c.phone}`} className="rounded-lg bg-slate-50 py-2">
                      <p className="text-sm font-semibold tabular-nums text-brand-700">{c.orders}</p>
                      <p className="text-[11px] text-slate-500">Orders</p>
                    </Link>
                    <div className="rounded-lg bg-slate-50 py-2">
                      <p className={`text-sm font-semibold tabular-nums ${rate === null ? "text-slate-400" : rate >= 70 ? "text-emerald-600" : rate >= 40 ? "text-amber-600" : "text-rose-600"}`}>
                        {rate === null ? "—" : `${rate}%`}
                      </p>
                      <p className="text-[11px] text-slate-500">Success</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 py-2">
                      <p className="text-sm font-semibold tabular-nums text-slate-900">{money(c.spent)}</p>
                      <p className="text-[11px] text-slate-500">Spent</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Tablets & desktops: table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-3 py-3 text-right font-medium">Orders</th>
                  <th className="px-3 py-3 font-medium">Success</th>
                  <th className="px-3 py-3 text-right font-medium">Spent</th>
                  <th className="px-3 py-3 font-medium">Last order</th>
                  <th className="px-5 py-3 text-right font-medium"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.rows.map((c) => {
                  const closed = Number(c.delivered) + Number(c.cancelled);
                  const rate = closed ? Math.round((Number(c.delivered) / closed) * 100) : null;
                  return (
                    <tr key={c.phone} className={`transition hover:bg-slate-50/80 ${c.blocked ? "bg-rose-50/40" : ""}`}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-50 font-sans font-semibold text-brand-700">{c.name.slice(0, 1)}</span>
                          <div className="min-w-0">
                            <p className="flex items-center gap-2 font-sans font-medium text-slate-900">
                              {c.name}
                              {c.user_id && <span className="rounded bg-sky-50 px-1.5 py-0.5 font-ui text-[10px] font-semibold uppercase text-sky-700">Account</span>}
                              {!!c.blocked && <span className="rounded bg-rose-100 px-1.5 py-0.5 font-ui text-[10px] font-semibold uppercase text-rose-700">Blocked</span>}
                            </p>
                            <p className="text-xs text-slate-500">{c.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        <Link href={`/admin/orders?q=${c.phone}`} className="font-medium text-brand-700 hover:underline">{c.orders}</Link>
                      </td>
                      <td className="px-3 py-3">
                        {rate === null ? <span className="text-slate-400">—</span> : (
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 rounded-full bg-slate-100">
                              <div className={`h-full rounded-full ${rate >= 70 ? "bg-emerald-500" : rate >= 40 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${rate}%` }} />
                            </div>
                            <span className="text-xs tabular-nums text-slate-600">{rate}%</span>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{money(c.spent)}</td>
                      <td className="px-3 py-3 text-slate-500">{dateTime(c.last_order)}</td>
                      <td className="px-5 py-3 text-right">
                        {canBlock && <form action={toggleBlockPhone}>
                          <input type="hidden" name="phone" value={c.phone} />
                          <input type="hidden" name="block" value={c.blocked ? "0" : "1"} />
                          <button type="submit" className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ring-1 transition ${
                            c.blocked ? "text-slate-600 ring-slate-200 hover:bg-white" : "text-rose-600 ring-rose-200 hover:bg-rose-50"}`}>
                            <BanIcon className="size-3.5" /> {c.blocked ? "Unblock" : "Block"}
                          </button>
                        </form>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          <span>Page {result.page} of {result.pages}</span>
          <Pagination page={result.page} pages={result.pages} href={href} />
        </div>
      </div>
    </>
  );
}
