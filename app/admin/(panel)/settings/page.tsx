import Link from "next/link";
import { Suspense } from "react";
import { requirePermission } from "@/lib/auth";
import { query } from "@/lib/db";
import { SETTING_KEYS, type Settings } from "@/lib/data/store";
import { listBlockedPhones } from "@/lib/data/reports";
import { dateTime } from "@/lib/format";
import { toggleBlockPhone, unblockIp } from "@/app/actions/admin";
import { listBlockedIps } from "@/lib/ip-block";
import { PageHeader, PanelSkeleton } from "@/components/admin/ui";
import { BlockIpForm, BlockPhoneForm, StoreSettingsForm } from "./settings-forms";

export const metadata = { title: "General Settings" };

export default function SettingsPage() {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <SettingsView />
    </Suspense>
  );
}

async function SettingsView() {
  await requirePermission("settings.manage");
  const [rows, blocked, blockedIps] = await Promise.all([
    query<{ key: string; value: string | null }>("SELECT `key`, `value` FROM settings"),
    listBlockedPhones(),
    listBlockedIps(),
  ]);
  const settings = Object.fromEntries(SETTING_KEYS.map((k) => [k, rows.find((r) => r.key === k)?.value ?? ""])) as Settings;

  return (
    <>
      <PageHeader title="General Settings" description="Shared by the main site and landing pages: order protection, policy pages, blocked numbers and IPs." />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <StoreSettingsForm settings={settings} />
        </div>
        <div className="space-y-6">
          <section className="a-card p-5">
            <h2 className="font-medium text-slate-900">Blocked numbers</h2>
            <p className="mb-4 mt-1 text-sm text-slate-500">Orders from these phones are rejected at checkout.</p>
            <BlockPhoneForm />
            <ul className="mt-4 divide-y divide-slate-100">
              {blocked.length === 0 && <li className="py-2 text-sm text-slate-400">No blocked numbers.</li>}
              {blocked.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                  <div>
                    <p className="font-medium tabular-nums text-slate-900">{b.phone}</p>
                    <p className="font-sans text-xs text-slate-500">{b.reason || "—"} · {dateTime(b.created_at)}</p>
                  </div>
                  <form action={toggleBlockPhone}>
                    <input type="hidden" name="phone" value={b.phone} />
                    <input type="hidden" name="block" value="0" />
                    <button className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">Unblock</button>
                  </form>
                </li>
              ))}
            </ul>
          </section>

          <section className="a-card p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-medium text-slate-900">Blocked IP addresses</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{blockedIps.length}</span>
            </div>
            <p className="mb-4 mt-1 text-sm text-slate-500">Orders from these IPs are refused. Cancelled orders add their IP here automatically (see Order protection).</p>
            <BlockIpForm />
            <ul className="mt-4 max-h-112 divide-y divide-slate-100 overflow-y-auto">
              {blockedIps.length === 0 && <li className="py-2 text-sm text-slate-400">No blocked IPs.</li>}
              {blockedIps.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2">
                      <span className="font-mono font-medium text-slate-900">{b.ip}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${b.source === "auto" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>{b.source === "auto" ? "Auto" : "Manual"}</span>
                    </p>
                    <p className="truncate font-sans text-xs text-slate-500">
                      {b.order_id ? <Link href={`/admin/orders/${b.order_id}`} className="text-brand-700 hover:underline">{b.reason || "Cancelled order"}</Link> : b.reason || "—"}
                      {" · "}{b.expires_at ? `until ${dateTime(b.expires_at)}` : "permanent"}
                    </p>
                  </div>
                  <form action={unblockIp}>
                    <input type="hidden" name="ip" value={b.ip} />
                    <button className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">Unblock</button>
                  </form>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
