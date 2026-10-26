"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useActionState, useMemo, useState, useTransition } from "react";
import { changeDealerPassword, dealerLogin, setSubTarget } from "@/app/actions/dealer";
import { initialState } from "@/lib/action-state";
import { bdt } from "@/lib/store-config";
import { FieldError, FormAlert, SubmitButton } from "@/components/form-bits";
import { CheckIcon, LockIcon, PhoneIcon, SearchIcon } from "@/components/icons";

const field = "block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[15px] text-ink outline-none transition placeholder:text-slate-400 focus:border-fb-500 focus:ring-4 focus:ring-fb-500/15 aria-invalid:border-rose-400";

export function DealerLoginForm() {
  const [state, action] = useActionState(dealerLogin, initialState);
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink">Mobile number</span>
        <div className="relative">
          <PhoneIcon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input name="phone" inputMode="tel" autoComplete="username" required defaultValue={state.values?.phone} placeholder="01XXXXXXXXX" className={`${field} pl-11`} />
        </div>
      </label>
      <label className="block">
        <span className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-ink">Password
          <Link href="/business/forgot" className="text-xs font-medium text-fb-700 hover:underline">Forgot password?</Link></span>
        <div className="relative">
          <LockIcon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input name="password" type="password" autoComplete="current-password" required className={`${field} pl-11`} />
        </div>
      </label>
      <FormAlert error={state.error} />
      <SubmitButton className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-fb-600 font-semibold text-white transition hover:bg-fb-700" pendingText="Signing in…">
        Sign in to dealer panel
      </SubmitButton>
    </form>
  );
}

/** Month dropdown: changing it reloads the dashboard for that month (works without JS through the Show button). */
export function MonthPicker({ month, options, labels, extra }: { month: string; options: string[]; labels: Record<string, string>; extra?: Record<string, string> }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  return (
    <form action={pathname} className="flex items-center gap-2">
      {extra && Object.entries(extra).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <select name="month" defaultValue={month} aria-label="Month"
        onChange={(e) => { const p = new URLSearchParams(sp.toString()); p.set("month", e.target.value); start(() => router.push(`${pathname}?${p}`, { scroll: false })); }}
        className="h-10 rounded-xl border border-slate-200 bg-white pl-3 pr-8 text-sm font-medium text-ink outline-none focus:border-fb-500 focus:ring-4 focus:ring-fb-500/15">
        {options.map((m) => <option key={m} value={m}>{labels[m]}</option>)}
      </select>
      <noscript><button className="h-10 rounded-xl bg-ink px-4 text-sm font-semibold text-white">Show</button></noscript>
      {pending && <span className="size-4 animate-spin rounded-full border-2 border-fb-500 border-t-transparent" aria-label="Loading" />}
    </form>
  );
}

export type SubRow = {
  id: number; name: string; bn_name: string | null; dealer: { id: number; name: string; phone: string } | null;
  subDealers: number; target: number | null; sales: number; orders: number;
};

/** Thanas of a district / unions of a thana with dealer, target (editable) and achieved sales. */
export function SubAreaTable({ rows, childLabel, month, editable, showSubDealers, drillBase }: {
  rows: SubRow[]; childLabel: string; month: string; editable: boolean; showSubDealers: boolean; /** link prefix; the area id is appended */ drillBase?: string;
}) {
  const [filter, setFilter] = useState<"all" | "with" | "without">("all");
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((r) => (filter === "all" || (filter === "with" ? !!r.dealer : !r.dealer))
      && (!t || r.name.toLowerCase().includes(t) || r.bn_name?.includes(t) || r.dealer?.name.toLowerCase().includes(t)));
  }, [rows, filter, q]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3 sm:px-5">
        <div className="relative min-w-0 flex-1 basis-48">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${childLabel.toLowerCase()} or dealer…`}
            className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-fb-500 focus:ring-4 focus:ring-fb-500/15" />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} aria-label="Show"
          className="h-10 rounded-xl border border-slate-200 bg-white pl-3 pr-8 text-sm outline-none focus:border-fb-500">
          <option value="all">All {childLabel.toLowerCase()}s ({rows.length})</option>
          <option value="with">With dealer ({rows.filter((r) => r.dealer).length})</option>
          <option value="without">No dealer yet ({rows.filter((r) => !r.dealer).length})</option>
        </select>
      </div>

      {/* Desktop */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3">{childLabel}</th>
              <th className="px-3 py-3">Dealer</th>
              {showSubDealers && <th className="px-3 py-3 text-center">Union dealers</th>}
              <th className="px-3 py-3">Target</th>
              <th className="px-5 py-3">Achieved</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shown.map((r) => (
              <tr key={r.id} className="transition hover:bg-slate-50/60">
                <td className="px-5 py-3">
                  {drillBase ? <Link href={`${drillBase}${r.id}`} scroll={false} className="font-semibold text-ink hover:text-fb-700">{r.name}</Link> : <span className="font-semibold text-ink">{r.name}</span>}
                  {r.bn_name && <span className="block text-xs text-slate-400">{r.bn_name}</span>}
                </td>
                <td className="px-3 py-3">
                  {r.dealer ? (
                    <><span className="font-medium text-ink">{r.dealer.name}</span><a href={`tel:${r.dealer.phone}`} className="block text-xs text-slate-500 hover:text-fb-700">{r.dealer.phone}</a></>
                  ) : <span className="text-slate-400">No dealer yet</span>}
                </td>
                {showSubDealers && <td className="px-3 py-3 text-center font-medium text-ink">{r.subDealers}</td>}
                <td className="px-3 py-3">
                  {r.dealer && editable ? <TargetCell dealerId={r.dealer.id} month={month} value={r.target} /> : <span className="text-ink">{r.target != null ? bdt(r.target) : "—"}</span>}
                </td>
                <td className="px-5 py-3"><Achieved sales={r.sales} target={r.target} orders={r.orders} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <ul className="divide-y divide-slate-100 md:hidden">
        {shown.map((r) => (
          <li key={r.id} className="space-y-2 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {drillBase ? <Link href={`${drillBase}${r.id}`} scroll={false} className="font-semibold text-ink">{r.name}</Link> : <p className="font-semibold text-ink">{r.name}</p>}
                <p className="text-xs text-slate-500">
                  {r.dealer ? <>{r.dealer.name} · <a href={`tel:${r.dealer.phone}`} className="text-fb-700">{r.dealer.phone}</a></> : "No dealer yet"}
                  {showSubDealers && <> · {r.subDealers} union dealer{r.subDealers === 1 ? "" : "s"}</>}
                </p>
              </div>
              {!(r.dealer && editable) && <span className="shrink-0 text-sm font-semibold text-ink">{r.target != null ? bdt(r.target) : "—"}</span>}
            </div>
            {r.dealer && editable && <TargetCell dealerId={r.dealer.id} month={month} value={r.target} />}
            <Achieved sales={r.sales} target={r.target} orders={r.orders} />
          </li>
        ))}
      </ul>
      {!shown.length && <p className="p-8 text-center text-sm text-slate-500">Nothing matches.</p>}
    </div>
  );
}

function Achieved({ sales, target, orders }: { sales: number; target: number | null; orders: number }) {
  const pct = target ? Math.min(100, Math.round((sales / target) * 100)) : null;
  return (
    <div className="min-w-36">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-semibold text-ink">{bdt(sales)}</span>
        <span className="text-slate-400">{pct != null ? `${pct}%` : `${orders} order${orders === 1 ? "" : "s"}`}</span>
      </div>
      {pct != null && (
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full ${pct >= 100 ? "bg-emerald-500" : pct >= 50 ? "bg-fb-500" : "bg-amber-400"}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

function TargetCell({ dealerId, month, value }: { dealerId: number; month: string; value: number | null }) {
  const [state, action] = useActionState(setSubTarget, initialState);
  const [v, setV] = useState(value != null ? String(value) : "");
  const dirty = v !== (value != null ? String(value) : "");
  return (
    <form action={action} className="space-y-1">
      <input type="hidden" name="dealer_id" value={dealerId} />
      <input type="hidden" name="month" value={month} />
      <div className="flex items-center gap-1.5">
        <div className="relative">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">৳</span>
          <input name="amount" type="number" min={0} step={100} value={v} onChange={(e) => setV(e.target.value)} placeholder="Not set" aria-label="Target"
            className="h-9 w-32 rounded-lg border border-slate-200 pl-6 pr-2 text-sm outline-none focus:border-fb-500 focus:ring-4 focus:ring-fb-500/15" />
        </div>
        <SubmitButton className={`grid h-9 place-items-center rounded-lg px-3 text-xs font-semibold transition ${dirty ? "bg-fb-600 text-white hover:bg-fb-700" : "bg-slate-100 text-slate-400"}`} pendingText="…">
          {state.ok && !dirty ? <CheckIcon className="size-4 text-emerald-600" /> : "Save"}
        </SubmitButton>
      </div>
      {state.error && <p className="max-w-56 text-xs text-rose-600">{state.error}</p>}
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changeDealerPassword, initialState);
  const fe = state.fieldErrors ?? {};
  const small = "block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-fb-500 focus:ring-4 focus:ring-fb-500/15";
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-3">
      <label className="block"><span className="mb-1 block text-xs font-medium text-slate-600">Current password</span><input name="current" type="password" autoComplete="current-password" className={small} /><FieldError message={fe.current} /></label>
      <label className="block"><span className="mb-1 block text-xs font-medium text-slate-600">New password</span><input name="password" type="password" autoComplete="new-password" className={small} /><FieldError message={fe.password} /></label>
      <label className="block"><span className="mb-1 block text-xs font-medium text-slate-600">Confirm</span><input name="password_confirmation" type="password" autoComplete="new-password" className={small} /><FieldError message={fe.password_confirmation} /></label>
      <div className="flex items-center gap-3 sm:col-span-3">
        <SubmitButton className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white" pendingText="Saving…">Change password</SubmitButton>
        <FormAlert error={state.error} message={state.message} />
      </div>
    </form>
  );
}
