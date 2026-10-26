import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { dateTime } from "@/lib/format";
import { hasPermission, PERMISSION_GROUPS } from "@/lib/permissions";
import { PageHeader, PanelSkeleton } from "@/components/admin/ui";
import { CheckIcon } from "@/components/icons";
import { PasswordForm, ProfileForm } from "./account-forms";

export const metadata = { title: "My account" };

export default function AccountPage() {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <Account />
    </Suspense>
  );
}

async function Account() {
  const admin = await requireAdmin();
  const recent = await query<{ id: number; description: string; created_at: Date; ip_address: string | null }>(
    "SELECT id, description, created_at, ip_address FROM activity_logs WHERE user_id = ? ORDER BY id DESC LIMIT 8",
    [admin.id],
  );

  return (
    <>
      <PageHeader title="My account" description="Your profile, password and what your role lets you do." />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <section className="a-card flex items-center gap-4 p-5">
            <span className="grid size-14 place-items-center rounded-2xl bg-linear-to-br from-brand-500 to-brand-700 text-xl font-semibold text-white">
              {admin.name.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <p className="text-lg font-semibold text-slate-900">{admin.name}</p>
              <p className="text-sm text-slate-500">{admin.email}</p>
              <span className="mt-1 inline-block rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-800 ring-1 ring-brand-600/15">{admin.roleName}</span>
            </div>
          </section>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ProfileForm name={admin.name} email={admin.email} />
            <PasswordForm />
          </div>
        </div>

        <div className="space-y-6">
          <section className="a-card p-5">
            <h2 className="font-medium text-slate-900">Your permissions</h2>
            <ul className="mt-3 space-y-3">
              {PERMISSION_GROUPS.map((g) => (
                <li key={g.module}>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{g.label}</p>
                  <ul className="mt-1 space-y-1">
                    {g.permissions.map((p) => {
                      const on = hasPermission(admin.permissions, p.key);
                      return (
                        <li key={p.key} className={`flex items-center gap-2 text-sm ${on ? "text-slate-700" : "text-slate-300"}`}>
                          {on ? <CheckIcon className="size-4 text-emerald-600" strokeWidth={2.5} /> : <span className="w-4 text-center">—</span>}
                          {p.label}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          </section>
          <section className="a-card p-5">
            <h2 className="font-medium text-slate-900">Your recent activity</h2>
            {recent.length === 0 ? <p className="mt-2 text-sm text-slate-400">Nothing yet.</p> : (
              <ul className="mt-3 space-y-2.5">
                {recent.map((r) => (
                  <li key={r.id} className="text-sm">
                    <p className="font-sans text-slate-700">{r.description}</p>
                    <p className="text-xs text-slate-400">{dateTime(r.created_at)}{r.ip_address ? ` · ${r.ip_address}` : ""}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
