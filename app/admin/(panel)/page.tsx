import Link from "next/link";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { can, requireAdmin } from "@/lib/auth";
import { PAGE_PERMISSION } from "@/lib/permissions";
import { getDashboardPeriod, getFirstOrderDate, type PeriodTotals } from "@/lib/data/reports";
import { query, queryOne } from "@/lib/db";
import { isRangeKey, RANGE_LABEL, resolveRange, type RangeKey } from "@/lib/date-range";
import { dateTime, money, ORDER_STATUSES, STATUS_META } from "@/lib/format";
import { PageHeader, PanelSkeleton, StatusBadge, EmptyState } from "@/components/admin/ui";
import { TrendChart } from "@/components/admin/trend-chart";
import { RangeFilter } from "@/components/admin/range-filter";
import { LiveVisitors } from "@/components/admin/live-visitors";
import { getLiveStats } from "@/lib/data/live";
import { AlertIcon, ArrowRightIcon, BagIcon, BoxIcon, CashIcon, CheckCircleIcon, ClockIcon, RefreshIcon, TargetIcon, UsersIcon } from "@/components/icons";

export const metadata = { title: "Dashboard" };

export default function DashboardPage(props: PageProps<"/admin">) {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <Dashboard {...props} />
    </Suspense>
  );
}

/** Change vs. the comparison period. `inverse` for metrics where lower is better (cancellations). */
function Delta({ now, before, inverse = false, label }: { now: number; before: number | null; inverse?: boolean; label: string | null }) {
  if (before === null || label === null) return <span className="text-xs text-slate-400">all time</span>;
  if (!before) return now ? <span className="text-xs font-medium text-emerald-600">▲ new <span className="font-normal text-slate-400">vs. {label}</span></span>
    : <span className="text-xs text-slate-400">— vs. {label}</span>;
  const pct = Math.round(((now - before) / before) * 100);
  const good = inverse ? pct <= 0 : pct >= 0;
  return (
    <span className={`text-xs font-medium ${pct === 0 ? "text-slate-500" : good ? "text-emerald-600" : "text-rose-600"}`} title={`Before: ${before.toLocaleString("en-IN")}`}>
      {pct === 0 ? "■" : pct > 0 ? "▲" : "▼"} {Math.abs(pct)}% <span className="font-normal text-slate-400">vs. {label}</span>
    </span>
  );
}

const rate = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);
const aov = (t: PeriodTotals) => (t.counted ? t.revenue / t.counted : 0);
const cancelRate = (t: PeriodTotals) => rate(t.cancelled, t.orders);
const deliveryRate = (t: PeriodTotals) => (t.delivered + t.cancelled ? rate(t.delivered, t.delivered + t.cancelled) : null);

async function Dashboard({ searchParams }: PageProps<"/admin">) {
  const admin = await requireAdmin();
  if (!can(admin, "dashboard.view")) {
    // Staff without dashboard access land on the first section they can use.
    const first = Object.entries(PAGE_PERMISSION).find(([href, perm]) => href !== "/admin" && can(admin, perm));
    redirect(first ? first[0] : "/admin/account");
  }

  // Period: ?range=… (from the filter), else the last one used (cookie), else today.
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const saved = decodeURIComponent((await cookies()).get("fb_dash_range")?.value ?? "");
  let key: RangeKey = "today";
  let from = one("from");
  let to = one("to");
  if (isRangeKey(one("range"))) key = one("range") as RangeKey;
  else if (saved.startsWith("custom:")) { key = "custom"; [, from, to] = saved.split(":"); }
  else if (isRangeKey(saved)) key = saved;
  const r = resolveRange(key, { from, to, firstOrder: key === "all" ? await getFirstOrderDate() : null });
  const cmp = r.prev?.label ?? null;

  const [d, lowStock, own, live] = await Promise.all([
    getDashboardPeriod(r),
    // Products of live landing pages + store products that are about to run out.
    query<{ id: number; name: string; stock: number; landing: string | null }>(
      `SELECT p.id, p.name, p.stock, MIN(l.name) AS landing FROM products p LEFT JOIN landing_pages l ON l.product_id = p.id AND l.status = 'published'
       WHERE p.is_active = 1 AND ((l.id IS NOT NULL AND p.stock <= 20) OR (p.in_store = 1 AND p.stock <= 5)) GROUP BY p.id ORDER BY p.stock LIMIT 5`,
    ),
    queryOne<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = ?", [admin.id]),
    getLiveStats(),
  ]);
  // The setup script's demo password must never stay in production.
  const defaultPassword = !!own && (await bcrypt.compare("admin12345", own.password_hash));
  const { now, prev } = d;
  const ordersLink = (extra = "") => `/admin/orders?from=${r.from}&to=${r.to}${extra}`;

  const cards = [
    { label: "Orders", value: now.orders.toLocaleString("en-IN"), sub: <Delta now={now.orders} before={prev?.orders ?? null} label={cmp} />, icon: BagIcon, tint: "bg-brand-50 text-brand-700", href: ordersLink() },
    { label: "Revenue", hint: "not cancelled / returned", value: money(now.revenue), sub: <Delta now={now.revenue} before={prev?.revenue ?? null} label={cmp} />, icon: CashIcon, tint: "bg-sky-50 text-sky-700" },
    { label: "Average order", value: money(Math.round(aov(now))), sub: <Delta now={aov(now)} before={prev ? aov(prev) : null} label={cmp} />, icon: TargetIcon, tint: "bg-indigo-50 text-indigo-700" },
    { label: "Items sold", value: now.items.toLocaleString("en-IN"), sub: <Delta now={now.items} before={prev?.items ?? null} label={cmp} />, icon: BoxIcon, tint: "bg-emerald-50 text-emerald-700" },
    { label: "Delivered", hint: money(now.deliveredRevenue), value: now.delivered.toLocaleString("en-IN"), sub: <Delta now={now.delivered} before={prev?.delivered ?? null} label={cmp} />, icon: CheckCircleIcon, tint: "bg-teal-50 text-teal-700", href: ordersLink("&status=delivered") },
    { label: "Cancelled / returned", hint: `${cancelRate(now)}% of orders`, value: now.cancelled.toLocaleString("en-IN"), sub: <Delta now={now.cancelled} before={prev?.cancelled ?? null} inverse label={cmp} />, icon: RefreshIcon, tint: "bg-rose-50 text-rose-700", href: ordersLink("&status=cancelled") },
    { label: "Customers", hint: `${now.newCustomers} new`, value: now.customers.toLocaleString("en-IN"), sub: <Delta now={now.customers} before={prev?.customers ?? null} label={cmp} />, icon: UsersIcon, tint: "bg-violet-50 text-violet-700" },
    { label: "Pending right now", hint: `${now.pending} from this period`, value: d.pendingNow.toLocaleString("en-IN"), sub: <Link href="/admin/orders?status=pending" className="text-xs font-medium text-brand-700 hover:underline">Review now →</Link>, icon: ClockIcon, tint: "bg-amber-50 text-amber-700" },
  ];
  const statusTotal = Object.values(d.statuses).reduce((a, b) => a + b, 0);
  const zoneTotal = d.zones.reduce((s, z) => s + z.count, 0);
  const sourceTotal = d.sources.reduce((s, x) => s + x.revenue, 0);
  const dr = deliveryRate(now);
  const caption = `${RANGE_LABEL[r.key]} · ${r.display}`;

  return (
    <>
      <PageHeader title="Dashboard" description="Pick a period — every number, chart and list below follows it." actions={
        <Link href={ordersLink()} className="a-btn">View these orders <ArrowRightIcon className="size-4" /></Link>
      } />

      <LiveVisitors initial={live} />

      <RangeFilter current={r.key} from={r.from} to={r.to} display={r.display} compare={cmp} />

      {defaultPassword && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <AlertIcon className="size-5 shrink-0" />
          <span><strong>Security:</strong> you are still using the default password. Change it before going live.</span>
          <Link href="/admin/account" className="ml-auto font-semibold underline">Change password</Link>
        </div>
      )}
      {lowStock.length > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertIcon className="mt-0.5 size-5 shrink-0" />
          <ul className="min-w-0 flex-1 space-y-0.5">
            {lowStock.map((p) => (
              <li key={p.id}>Low stock: <strong>{p.stock}</strong> left of <Link href={`/admin/products/${p.id}`} className="font-medium underline">{p.name}</Link>{p.landing ? <span className="text-amber-700"> · sold on “{p.landing}”</span> : null}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {cards.map(({ label, hint, value, sub, icon: Icon, tint, href }) => {
          const body = (
            <>
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-slate-500 sm:text-sm">{label}</p>
                <span className={`grid size-8 shrink-0 place-items-center rounded-lg sm:size-9 ${tint}`}><Icon className="size-4 sm:size-5" /></span>
              </div>
              <p className="mt-2 truncate text-[22px] font-semibold leading-none tabular-nums text-slate-900 sm:mt-3 sm:text-[28px]">{value}</p>
              {hint && <p className="mt-1 truncate text-xs text-slate-400">{hint}</p>}
              <div className="mt-2">{sub}</div>
            </>
          );
          const cls = "a-card block p-4 transition hover:-translate-y-0.5 hover:shadow-md sm:p-5";
          return href ? <Link key={label} href={href} className={cls}>{body}</Link> : <div key={label} className={cls}>{body}</div>;
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2"><TrendChart data={d.series} caption={caption} unit={r.bucket} /></div>

        <div className="a-card p-5">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-medium text-slate-500">Orders by status</p>
            {dr !== null && <p className="text-xs text-slate-500">Delivery success <strong className="text-slate-900">{dr}%</strong></p>}
          </div>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{statusTotal} <span className="text-sm font-normal text-slate-400">orders</span></p>
          <ul className="mt-5 space-y-3">
            {ORDER_STATUSES.map((s) => {
              const n = d.statuses[s] ?? 0;
              const pct = statusTotal ? (n / statusTotal) * 100 : 0;
              return (
                <li key={s}>
                  <Link href={ordersLink(`&status=${s}`)} className="group block">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-slate-600 group-hover:text-slate-900">
                        <span className={`size-2 rounded-full ${STATUS_META[s].dot}`} />{STATUS_META[s].label}
                      </span>
                      <span className="tabular-nums text-slate-900">{n}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${STATUS_META[s].dot}`} style={{ width: `${pct}%` }} />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="a-card min-w-0 overflow-hidden xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <p className="font-medium text-slate-900">Latest orders in this period</p>
            <Link href={ordersLink()} className="text-sm font-medium text-brand-700 hover:underline">View all {now.orders > 7 ? `(${now.orders})` : ""}</Link>
          </div>
          {d.recent.length === 0 ? (
            <EmptyState title="No orders in this period" text="Try a longer period such as This month or All time." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {d.recent.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="flex items-center gap-4 px-5 py-3 transition hover:bg-slate-50">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100 font-sans text-sm font-semibold text-slate-600">
                      {o.customer_name.slice(0, 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-sans text-sm font-medium text-slate-900">{o.customer_name}</p>
                      <p className="truncate text-xs text-slate-500">#{o.order_no} · {o.phone} · {dateTime(o.created_at)}</p>
                    </div>
                    <StatusBadge status={o.status} />
                    <span className="hidden w-20 text-right text-sm font-medium tabular-nums text-slate-900 sm:block">{money(o.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="a-card p-5">
          <p className="text-sm font-medium text-slate-500">Best sellers</p>
          {d.products.length === 0 ? <p className="mt-3 text-sm text-slate-400">No sales in this period.</p> : (
            <ol className="mt-4 space-y-3">
              {d.products.map((p, i) => (
                <li key={`${p.product_id}-${p.name}`} className="flex items-center gap-3 text-sm">
                  <span className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${i === 0 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500"}`}>{i + 1}</span>
                  {p.product_id ? <Link href={`/admin/products/${p.product_id}`} className="min-w-0 flex-1 truncate font-sans text-slate-700 hover:text-brand-700">{p.name}</Link>
                    : <span className="min-w-0 flex-1 truncate font-sans text-slate-700">{p.name}</span>}
                  <span className="shrink-0 text-right tabular-nums"><strong className="text-slate-900">{p.qty}</strong> <span className="text-xs text-slate-400">· {money(p.revenue)}</span></span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="a-card p-5">
          <p className="text-sm font-medium text-slate-500">Sales by source</p>
          {d.sources.length === 0 ? <p className="mt-3 text-sm text-slate-400">No orders in this period.</p> : (
            <ul className="mt-4 space-y-3">
              {d.sources.map((x) => {
                const label = x.source === "store" ? "Main site (shop)" : x.name ?? "Landing page";
                const href = x.source === "store" ? ordersLink("&source=store") : x.landing_id ? ordersLink(`&landing=${x.landing_id}`) : ordersLink("&source=landing");
                const pct = sourceTotal ? (x.revenue / sourceTotal) * 100 : 0;
                return (
                  <li key={`${x.source}-${x.landing_id}`}>
                    <Link href={href} className="group block">
                      <div className="flex justify-between gap-2 text-sm">
                        <span className="truncate text-slate-600 group-hover:text-slate-900">{label}</span>
                        <span className="shrink-0 tabular-nums text-slate-900">{money(x.revenue)} <span className="text-slate-400">· {x.orders} orders</span></span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                        <div className={`h-full rounded-full ${x.source === "store" ? "bg-sky-500" : "bg-brand-600"}`} style={{ width: `${pct}%` }} />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="a-card p-5">
          <p className="text-sm font-medium text-slate-500">Delivery areas</p>
          {zoneTotal === 0 ? <p className="mt-3 text-sm text-slate-400">No orders in this period.</p> : (
            <ul className="mt-4 space-y-3">
              {d.zones.map((z) => (
                <li key={z.label}>
                  <div className="flex justify-between text-sm">
                    <span className="truncate font-sans text-slate-600">{z.label}</span>
                    <span className="tabular-nums text-slate-900">{z.count} <span className="text-slate-400">· {Math.round((z.count / zoneTotal) * 100)}%</span></span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-brand-600" style={{ width: `${(z.count / zoneTotal) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
