import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { query } from "@/lib/db";
import {
  areaName, areaSales, childAreas, daysLeftIn, dealerArea, getDealer, isMonth, LEVEL_LABEL, maskPhone, monthLabel, monthOf, monthOptions, shiftMonth, targetFor,
  type Dealer,
} from "@/lib/dealer";
import { dealerLogout } from "@/app/actions/dealer";
import { bdt } from "@/lib/store-config";
import { STATUS_META, type OrderStatus } from "@/lib/format";
import { DealerLoginForm, MonthPicker, PasswordForm, SubAreaTable } from "@/components/business/dealer-ui";
import { AlertIcon, BriefcaseIcon, ChevronLeftIcon, ClockIcon, LogoutIcon, MapPinIcon, PhoneIcon, TargetIcon, TruckIcon, UsersIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Business — Dealer panel", robots: { index: false } };

type SP = Record<string, string | string[] | undefined>;

export default function BusinessPage({ searchParams }: PageProps<"/business">) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl space-y-4 px-4 py-8"><div className="h-40 animate-pulse rounded-3xl bg-white" /><div className="h-64 animate-pulse rounded-3xl bg-white" /></div>}>
      <Business searchParams={searchParams} />
    </Suspense>
  );
}

async function Business({ searchParams }: { searchParams: Promise<SP> }) {
  const [me, sp] = await Promise.all([getDealer(), searchParams]);
  if (!me) return <SignIn />;
  if (me.status !== "active" || !me.level) return <StatusScreen me={me} justApplied={sp.applied === "1"} />;
  return <Dashboard me={{ ...me, level: me.level }} sp={sp} />;
}

function SignIn() {
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-2 md:items-center md:py-16">
      <div>
        <span className="inline-flex items-center gap-2 rounded-full bg-fb-50 px-3 py-1 text-xs font-semibold text-fb-700 ring-1 ring-fb-200"><BriefcaseIcon className="size-4" /> FatehaBD Business</span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Dealer panel</h1>
        <p className="mt-3 max-w-md leading-relaxed text-ink-soft">Track your monthly target, sales in your area and your sub-dealers — district, thana and union — in one place.</p>
        <ul className="mt-6 space-y-3 text-sm text-ink-soft">
          {[[TargetIcon, "Monthly targets with live progress"], [UsersIcon, "Assign targets to the dealers under you"], [TruckIcon, "See every order placed in your area"]].map(([Icon, t]) => {
            const I = Icon as typeof TargetIcon;
            return <li key={t as string} className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-white text-fb-700 ring-1 ring-slate-200"><I className="size-5" /></span>{t as string}</li>;
          })}
        </ul>
      </div>
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-900/[0.04] sm:p-8">
        <h2 className="text-xl font-bold text-ink">Business login</h2>
        <p className="mb-6 mt-1 text-sm text-slate-600">Sign in with the mobile number you registered with.</p>
        <DealerLoginForm />
        <p className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-600">
          Not a dealer yet? <Link href="/business/register" className="font-semibold text-fb-700 hover:underline">Apply for a dealership</Link>
        </p>
      </div>
    </div>
  );
}

function StatusScreen({ me, justApplied }: { me: Dealer; justApplied: boolean }) {
  const meta = {
    pending: { title: justApplied ? "Application received!" : "Your application is under review", tone: "bg-amber-50 text-amber-900 ring-amber-200", icon: ClockIcon,
      text: "Our team is checking your documents. We'll call you on your registered number; your panel unlocks as soon as you are approved." },
    rejected: { title: "Your application was not approved", tone: "bg-rose-50 text-rose-900 ring-rose-200", icon: AlertIcon, text: "Please contact FatehaBD for details." },
    suspended: { title: "Your dealer account is suspended", tone: "bg-slate-100 text-slate-800 ring-slate-300", icon: AlertIcon, text: "For sales & settlement details, please contact the admin." },
    active: { title: "Your account is being set up", tone: "bg-sky-50 text-sky-900 ring-sky-200", icon: ClockIcon, text: "Please check back shortly." },
  }[me.status];
  const Icon = meta.icon;
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className={`rounded-3xl p-6 ring-1 sm:p-8 ${meta.tone}`}>
        <Icon className="size-10" />
        <h1 className="mt-4 text-2xl font-bold">{meta.title}</h1>
        <p className="mt-2 leading-relaxed opacity-90">{meta.text}</p>
        {me.admin_note && me.status !== "pending" && <p className="mt-4 rounded-xl bg-white/70 px-4 py-3 text-sm"><strong>Note from FatehaBD:</strong> {me.admin_note}</p>}
      </div>
      <dl className="mt-6 grid gap-3 rounded-3xl border border-slate-200/80 bg-white p-6 text-sm sm:grid-cols-2">
        <div><dt className="text-slate-600">Name</dt><dd className="font-semibold text-ink">{me.name}</dd></div>
        <div><dt className="text-slate-600">Applied for</dt><dd className="font-semibold text-ink">{me.applied_level ? LEVEL_LABEL[me.applied_level] : "—"}</dd></div>
        <div><dt className="text-slate-600">Area</dt><dd className="font-semibold text-ink">{areaName(me)}</dd></div>
        <div><dt className="text-slate-600">Mobile</dt><dd className="font-semibold text-ink">{me.phone}</dd></div>
      </dl>
      <form action={dealerLogout} className="mt-6 text-center">
        <button className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-ink"><LogoutIcon className="size-4" /> Log out</button>
      </form>
    </div>
  );
}

async function Dashboard({ me, sp }: { me: Dealer & { level: NonNullable<Dealer["level"]> }; sp: SP }) {
  await connection();
  const current = monthOf(new Date());
  const month = isMonth(sp.month) ? sp.month : current;
  const nextMonth = shiftMonth(month, 1);
  const areaId = dealerArea(me);
  const col = me.level === "district" ? "district_id" : me.level === "thana" ? "thana_id" : "union_id";
  const drillThana = me.level === "district" ? Number(sp.thana) || 0 : 0;

  const [target, nextTarget, sales, lastSales, children, recent] = await Promise.all([
    targetFor(me.id, month),
    targetFor(me.id, nextMonth),
    areaSales(me.level, areaId, month),
    areaSales(me.level, areaId, shiftMonth(month, -1)),
    me.level === "union" ? Promise.resolve(null) : childAreas(me.level, areaId, month),
    query<{ id: number; order_no: string; customer_name: string; phone: string; total: number; status: OrderStatus; created_at: Date; thana: string | null; union_name: string | null }>(
      `SELECT o.id, o.order_no, o.customer_name, o.phone, o.subtotal - o.discount AS total, o.status, o.created_at, t.name AS thana, u.name AS union_name
       FROM orders o LEFT JOIN thanas t ON t.id = o.thana_id LEFT JOIN unions u ON u.id = o.union_id
       WHERE o.${col} = ? ORDER BY o.id DESC LIMIT 8`,
      [areaId],
    ),
  ]);
  const drillRows = drillThana && children?.some((c) => c.id === drillThana) ? await childAreas("thana", drillThana, month) : null;
  const drillName = drillRows ? children!.find((c) => c.id === drillThana)!.name : "";

  const pct = target?.amount ? Math.min(100, Math.round((sales.amount / target.amount) * 100)) : null;
  const assigned = children?.reduce((s, c) => s + (c.target ?? 0), 0) ?? 0;
  const covered = children?.filter((c) => c.dealer).length ?? 0;
  const editable = month >= current;

  const daysLeft = daysLeftIn(month);
  const growth = lastSales.amount ? Math.round(((sales.amount - lastSales.amount) / lastSales.amount) * 100) : null;
  const options = monthOptions(current);
  const labels = Object.fromEntries(options.map((m) => [m, monthLabel(m)]));
  const childLabel = me.level === "district" ? "Thana" : "Union";
  const areaTitle = me.level === "district" ? me.district : me.level === "thana" ? me.thana : me.union_name ?? me.thana;

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:py-8">
      {/* Profile */}
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-fb-600 via-fb-700 to-fb-900 p-5 text-white shadow-xl shadow-fb-900/20 sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-white/10" />
        <div className="relative flex flex-wrap items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/business/photo" alt="" className="size-16 rounded-2xl bg-white/20 object-cover ring-2 ring-white/40 sm:size-20" />
          <div className="min-w-0 flex-1">
            <span className="inline-flex rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold backdrop-blur">{LEVEL_LABEL[me.level]}</span>
            <h1 className="mt-1.5 truncate text-xl font-bold sm:text-2xl">{me.name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/85">
              <span className="inline-flex items-center gap-1.5"><MapPinIcon className="size-4" /> {areaName(me)}</span>
              <span className="inline-flex items-center gap-1.5"><PhoneIcon className="size-4" /> {me.phone}</span>
            </p>
          </div>
          <form action={dealerLogout}>
            <button className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/25"><LogoutIcon className="size-4" /> Log out</button>
          </form>
        </div>
      </section>

      {/* Month */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-ink">{monthLabel(month)}{month === current && <span className="ml-2 align-middle text-xs font-semibold text-fb-700">· this month</span>}</h2>
        <MonthPicker month={month} options={options} labels={labels} extra={drillThana ? { thana: String(drillThana) } : undefined} />
      </div>

      {/* Target cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 md:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-600">My target — {monthLabel(month)}</p>
              <p className="mt-1 text-3xl font-bold text-ink">{target ? bdt(target.amount) : <span className="text-xl text-slate-400">Not set yet</span>}</p>
            </div>
            <span className="grid size-11 place-items-center rounded-2xl bg-fb-50 text-fb-700"><TargetIcon className="size-6" /></span>
          </div>
          <div className="mt-5">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-slate-600">Achieved <strong className="text-lg text-ink">{bdt(sales.amount)}</strong></span>
              {pct != null && <span className="font-bold text-fb-700">{pct}%</span>}
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full transition-all ${pct != null && pct >= 100 ? "bg-emerald-500" : "bg-linear-to-r from-fb-400 to-fb-600"}`} style={{ width: `${pct ?? (sales.amount ? 100 : 0)}%`, opacity: pct == null ? 0.25 : 1 }} />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <Mini label="Orders" value={String(sales.orders)} />
              <Mini label="Delivered" value={bdt(sales.delivered)} />
              <Mini label={daysLeft != null ? "Days left" : "vs last month"} value={daysLeft != null ? String(daysLeft) : growth != null ? `${growth > 0 ? "+" : ""}${growth}%` : "—"} />
            </div>
            {target && target.amount > sales.amount && daysLeft != null && daysLeft > 0 && (
              <p className="mt-4 rounded-xl bg-fb-50 px-3 py-2 text-sm text-fb-900">
                {bdt(target.amount - sales.amount)} to go — about <strong>{bdt(Math.ceil((target.amount - sales.amount) / daysLeft))}</strong> per day.
              </p>
            )}
          </div>
        </section>
        <section className="flex flex-col rounded-3xl border border-slate-200/80 bg-white p-5">
          <p className="text-sm font-medium text-slate-600">Next month — {monthLabel(nextMonth)}</p>
          <p className="mt-1 text-2xl font-bold text-ink">{nextTarget ? bdt(nextTarget.amount) : <span className="text-lg text-slate-400">Not set yet</span>}</p>
          <p className="mt-auto pt-4 text-sm text-slate-600">For sales &amp; settlement details, please contact the admin.</p>
        </section>
      </div>

      {/* Sub-areas */}
      {children && (
        <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white">
          <div className="flex flex-wrap items-end justify-between gap-3 p-5 pb-4">
            <div>
              <h2 className="text-lg font-bold text-ink">{childLabel}s in {areaTitle}</h2>
              <p className="mt-0.5 text-sm text-slate-600">
                {covered} of {children.length} {childLabel.toLowerCase()}s have a dealer
                {me.level === "district" && " · click a thana to see its unions"}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-2.5 text-sm">
              <span className="text-slate-600">Targets for the month: </span>
              <strong className="text-ink">assigned {bdt(assigned)}</strong>
              {target && <span className={assigned > target.amount ? "text-rose-600" : "text-slate-600"}> of {bdt(target.amount)}</span>}
            </div>
          </div>
          {!editable && <p className="mx-5 mb-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">Past month — targets are read-only.</p>}
          <SubAreaTable rows={children} childLabel={childLabel} month={month} editable={editable} showSubDealers={me.level === "district"}
            drillBase={me.level === "district" ? `/business?month=${month}&thana=` : undefined} />
          {me.level === "district" && (
            <DrillPicker areas={children.map((c) => ({ id: c.id, name: c.name }))} selected={drillThana} month={month} />
          )}
        </section>
      )}

      {drillRows && (
        <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-4">
            <div>
              <Link href={`/business?month=${month}`} scroll={false} className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-ink"><ChevronLeftIcon className="size-3.5" /> Close</Link>
              <h2 className="text-lg font-bold text-ink">Unions in {drillName}</h2>
              <p className="mt-0.5 text-sm text-slate-600">Union dealer targets are set by the thana dealer.</p>
            </div>
          </div>
          <SubAreaTable rows={drillRows} childLabel="Union" month={month} editable={false} showSubDealers={false} />
        </section>
      )}

      {/* Recent orders */}
      <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white">
        <h2 className="p-5 pb-3 text-lg font-bold text-ink">Latest orders in your area</h2>
        {recent.length === 0 ? (
          <p className="px-5 pb-6 text-sm text-slate-600">No store orders from your area yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recent.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-ink">#{o.order_no} · {o.customer_name.split(" ")[0]} <span className="text-xs text-slate-400">{maskPhone(o.phone)}</span></p>
                  <p className="truncate text-xs text-slate-600">{[o.union_name, o.thana].filter(Boolean).join(", ")} · {new Date(o.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold text-ink">{bdt(Number(o.total))}</p>
                  <span className={`inline-flex rounded-full px-2 py-px text-[11px] font-medium ring-1 ring-inset ${STATUS_META[o.status]?.className ?? ""}`}>{STATUS_META[o.status]?.label ?? o.status}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <details className="group rounded-3xl border border-slate-200/80 bg-white p-5">
        <summary className="cursor-pointer list-none text-sm font-semibold text-ink">Change password <span className="text-slate-400 group-open:hidden">›</span></summary>
        <div className="mt-4"><PasswordForm /></div>
      </details>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-2 py-3">
      <p className="text-base font-bold text-ink sm:text-lg">{value}</p>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-600">{label}</p>
    </div>
  );
}

/** Dropdown to open the union breakdown of one thana. */
function DrillPicker({ areas, selected, month }: { areas: { id: number; name: string }[]; selected: number; month: string }) {
  return (
    <form action="/business" className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
      <input type="hidden" name="month" value={month} />
      <label htmlFor="drill" className="text-sm font-medium text-ink">View unions of</label>
      <select id="drill" name="thana" defaultValue={selected || ""} className="h-10 rounded-xl border border-slate-200 bg-white pl-3 pr-8 text-sm outline-none focus:border-fb-500">
        <option value="">Select thana…</option>
        {areas.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <button className="h-10 rounded-xl bg-ink px-4 text-sm font-semibold text-white transition hover:bg-black">Show</button>
    </form>
  );
}
