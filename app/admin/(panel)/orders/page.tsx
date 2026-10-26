import Link from "next/link";
import { Suspense } from "react";
import { can, requirePermission } from "@/lib/auth";
import { listOrders, statusCounts, zoneLabel } from "@/lib/data/orders";
import { listLandingOptions } from "@/lib/data/landings";
import { isPaymentMethod, PAYMENT_LABEL, PAYMENT_METHODS, PAYMENT_STATUS_META, type PaymentStatus } from "@/lib/payments";
import { ORDER_STATUSES, STATUS_META } from "@/lib/format";
import { PageHeader, Pagination, PanelSkeleton, EmptyState } from "@/components/admin/ui";
import { DownloadIcon, SearchIcon } from "@/components/icons";
import { OrdersTable } from "./orders-table";

export const metadata = { title: "Orders" };

export default function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  return (
    <Suspense fallback={<PanelSkeleton rows={10} />}>
      <Orders searchParams={searchParams} />
    </Suspense>
  );
}

const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

async function Orders({ searchParams }: Pick<PageProps<"/admin/orders">, "searchParams">) {
  const admin = await requirePermission("orders.view");
  const sp = await searchParams;
  const filters = {
    status: str(sp.status) || "all",
    q: str(sp.q),
    from: str(sp.from),
    to: str(sp.to),
    page: Number(str(sp.page)) || 1,
    perPage: Number(str(sp.per)) || 20,
    payment: str(sp.payment),
    source: /^ld+$/.test(str(sp.source)) ? "" : str(sp.source),
    landing: Number(str(sp.landing)) || (/^ld+$/.test(str(sp.source)) ? Number(str(sp.source).slice(1)) : 0),
    method: str(sp.method),
  };
  const [result, counts, landings] = await Promise.all([listOrders(filters), statusCounts(), listLandingOptions()]);
  const landingName = (id: number | null) => landings.find((l) => l.id === id)?.name ?? null;

  const qs = (over: Record<string, string | number>) => {
    const p = new URLSearchParams();
    const merged = {
      status: filters.status, q: filters.q, from: filters.from, to: filters.to, per: filters.perPage === 20 ? "" : String(filters.perPage),
      payment: filters.payment, source: filters.source, landing: filters.landing ? String(filters.landing) : "", method: filters.method, ...over,
    };
    for (const [k, v] of Object.entries(merged)) if (v && !(k === "status" && v === "all") && !(k === "page" && String(v) === "1")) p.set(k, String(v));
    const s = p.toString();
    return s ? `?${s}` : "";
  };
  const exportQs = qs({ page: 1 });
  const hasFilters = filters.q || filters.from || filters.to || filters.payment || filters.source || filters.landing || filters.method;

  return (
    <>
      <PageHeader title="Orders" description={`${result.total} order${result.total === 1 ? "" : "s"} found`} actions={
        can(admin, "orders.export") && <a href={`/admin/export${exportQs}`} className="a-btn-outline"><DownloadIcon className="size-4" /> Export CSV</a>
      } />

      <div className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex w-max gap-1 rounded-xl bg-white p-1 shadow-xs ring-1 ring-slate-200/80">
          {(["all", ...ORDER_STATUSES] as const).map((s) => {
            const active = filters.status === s;
            return (
              <Link key={s} href={`/admin/orders${qs({ status: s, page: 1 })}`}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition ${active ? "bg-brand-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}>
                {s === "all" ? "All" : STATUS_META[s].label}
                <span className={`rounded-md px-1.5 text-xs tabular-nums ${active ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>{counts[s] ?? 0}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <form className="a-card mb-4 grid gap-3 p-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
        {filters.status !== "all" && <input type="hidden" name="status" value={filters.status} />}
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input name="q" defaultValue={filters.q} placeholder="Search order no, phone, name or address…" className="a-input pl-9" />
        </div>
        <div className="grid grid-cols-3 gap-3 sm:col-span-4 sm:grid-cols-3 lg:max-w-2xl">
          <select name="source" defaultValue={filters.landing ? `l${filters.landing}` : filters.source} className="a-input" aria-label="Source">
            <option value="">All sources</option>
            <option value="store">Main site (shop)</option>
            <option value="landing">All landing pages</option>
            {landings.length > 0 && (
              <optgroup label="Landing page">
                {landings.map((l) => <option key={l.id} value={`l${l.id}`}>{l.name}</option>)}
              </optgroup>
            )}
          </select>
          <select name="method" defaultValue={filters.method} className="a-input" aria-label="Payment method">
            <option value="">All methods</option>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_LABEL[m]}</option>)}
          </select>
          <select name="payment" defaultValue={filters.payment} className="a-input" aria-label="Payment status">
            <option value="">Any payment</option>
            {(Object.keys(PAYMENT_STATUS_META) as PaymentStatus[]).map((s) => <option key={s} value={s}>{PAYMENT_STATUS_META[s].label}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:contents">
          <label className="block"><span className="a-label">From</span><input type="date" name="from" defaultValue={filters.from} className="a-input" /></label>
          <label className="block"><span className="a-label">To</span><input type="date" name="to" defaultValue={filters.to} className="a-input" /></label>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="a-btn flex-1">Filter</button>
          {hasFilters && <Link href={`/admin/orders${filters.status !== "all" ? `?status=${filters.status}` : ""}`} className="a-btn-outline">Clear</Link>}
        </div>
      </form>

      <div className="a-card overflow-hidden">
        {result.rows.length === 0 ? (
          <EmptyState title="No orders match" text={hasFilters ? "Try different search terms or dates." : "New orders will show up here."} />
        ) : (
          <OrdersTable perms={{ edit: can(admin, "orders.edit"), remove: can(admin, "orders.delete"), export: can(admin, "orders.export") }} orders={result.rows.map((o) => ({
            id: o.id, order_no: o.order_no, customer_name: o.customer_name, phone: o.phone, address: o.address,
            total: Number(o.total), status: o.status, zone: zoneLabel(o), items: Number(o.item_count),
            origin: o.source === "store" ? "Shop" : landingName(o.landing_id) ?? "Landing",
            created_at: new Date(o.created_at).toISOString(), note: o.note,
            pay: isPaymentMethod(o.payment_method) && o.payment_method !== "cod" ? {
              method: PAYMENT_LABEL[o.payment_method], status: o.payment_status,
              label: PAYMENT_STATUS_META[o.payment_status as PaymentStatus]?.label ?? o.payment_status,
              className: PAYMENT_STATUS_META[o.payment_status as PaymentStatus]?.className ?? "bg-slate-100 text-slate-600 ring-slate-300",
            } : o.payment_status === "paid" || o.payment_status === "refunded" ? {
              method: "COD", status: o.payment_status, label: PAYMENT_STATUS_META[o.payment_status].label, className: PAYMENT_STATUS_META[o.payment_status].className,
            } : null,
          }))} />
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          <span>Page {result.page} of {result.pages}</span>
          <Pagination page={result.page} pages={result.pages} href={(p) => `/admin/orders${qs({ page: p })}`} />
        </div>
      </div>
    </>
  );
}
