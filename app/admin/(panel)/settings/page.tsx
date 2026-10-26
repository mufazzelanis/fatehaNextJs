import { Suspense } from "react";
import { requirePermission } from "@/lib/auth";
import { query } from "@/lib/db";
import { SETTING_KEYS, type Settings } from "@/lib/data/store";
import { listBlockedPhones } from "@/lib/data/reports";
import { dateTime } from "@/lib/format";
import { toggleBlockPhone } from "@/app/actions/admin";
import { PageHeader, PanelSkeleton } from "@/components/admin/ui";
import { BlockPhoneForm, StoreSettingsForm } from "./settings-forms";

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
  const [rows, blocked] = await Promise.all([
    query<{ key: string; value: string | null }>("SELECT `key`, `value` FROM settings"),
    listBlockedPhones(),
  ]);
  const settings = Object.fromEntries(SETTING_KEYS.map((k) => [k, rows.find((r) => r.key === k)?.value ?? ""])) as Settings;

  return (
    <>
      <PageHeader title="General Settings" description="Shared by the main site and landing pages: order protection, policy pages and blocked numbers." />
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
        </div>
      </div>
    </>
  );
}
