import Link from "next/link";
import { Suspense } from "react";
import { requirePermission } from "@/lib/auth";
import { query } from "@/lib/db";
import { dateTime } from "@/lib/format";
import { PERMISSION_GROUPS, SUPER_ADMIN_SLUG } from "@/lib/permissions";
import { PageHeader, PanelSkeleton } from "@/components/admin/ui";
import { CheckIcon } from "@/components/icons";
import { CreateStaffForm, RoleEditor, StaffCard } from "./users-forms";

export const metadata = { title: "Users & Roles" };

export default function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  return (
    <Suspense fallback={<PanelSkeleton rows={8} />}>
      <Users searchParams={searchParams} />
    </Suspense>
  );
}

export type RoleView = { id: number; name: string; slug: string; description: string | null; permissions: string[]; isSystem: boolean; users: number };
export type StaffView = {
  id: number; name: string; email: string; roleId: number | null; roleName: string; isActive: boolean;
  lastLogin: string | null; createdAt: string; actions30d: number;
};

async function Users({ searchParams }: Pick<PageProps<"/admin/users">, "searchParams">) {
  const admin = await requirePermission("users.manage");
  const { tab } = await searchParams;
  const showRoles = tab === "roles";

  const [roleRows, staffRows] = await Promise.all([
    query<{ id: number; name: string; slug: string; description: string | null; permissions: string; is_system: number; users: number }>(
      `SELECT r.*, (SELECT COUNT(*) FROM users u WHERE u.role_id = r.id AND u.role = 'admin') AS users
       FROM roles r ORDER BY r.is_system DESC, r.id`,
    ),
    query<{ id: number; name: string; email: string; role_id: number | null; role_name: string | null; is_active: number; last_login_at: Date | null; created_at: Date; actions: number }>(
      `SELECT u.id, u.name, u.email, u.role_id, r.name AS role_name, u.is_active, u.last_login_at, u.created_at,
              (SELECT COUNT(*) FROM activity_logs a WHERE a.user_id = u.id AND a.created_at >= NOW() - INTERVAL 30 DAY) AS actions
       FROM users u LEFT JOIN roles r ON r.id = u.role_id WHERE u.role = 'admin' ORDER BY u.is_active DESC, u.id`,
    ),
  ]);

  const roles: RoleView[] = roleRows.map((r) => {
    let permissions: string[] = [];
    try {
      permissions = JSON.parse(r.permissions);
    } catch {}
    return { id: r.id, name: r.name, slug: r.slug, description: r.description, permissions, isSystem: !!r.is_system, users: Number(r.users) };
  });
  const staff: StaffView[] = staffRows.map((u) => ({
    id: u.id, name: u.name, email: u.email, roleId: u.role_id, roleName: u.role_name ?? "Super Admin", isActive: !!u.is_active,
    lastLogin: u.last_login_at ? dateTime(u.last_login_at) : null, createdAt: dateTime(u.created_at), actions30d: Number(u.actions),
  }));
  const roleOptions = roles.map((r) => ({ id: r.id, name: r.name }));

  return (
    <>
      <PageHeader title="Users & Roles" description="Who can sign in to the admin panel, and what each role is allowed to do." />

      <div className="mb-5 flex w-max gap-1 rounded-xl bg-white p-1 shadow-xs ring-1 ring-slate-200/80">
        <Link href="/admin/users" className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${!showRoles ? "bg-brand-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}>
          Staff <span className="ml-1 opacity-70">{staff.length}</span>
        </Link>
        <Link href="/admin/users?tab=roles" className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${showRoles ? "bg-brand-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}>
          Roles <span className="ml-1 opacity-70">{roles.length}</span>
        </Link>
      </div>

      {!showRoles ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-3 xl:col-span-2">
            {staff.map((u) => (
              <StaffCard key={u.id} user={u} roles={roleOptions} isSelf={u.id === admin.id} />
            ))}
          </div>
          <div>
            <CreateStaffForm roles={roleOptions} defaultRoleId={roles.find((r) => r.slug === "order-manager")?.id ?? roles[0]?.id} />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
            {roles.map((r) => <RoleEditor key={r.id} role={r} />)}
            <RoleEditor role={null} />
          </div>

          <section className="a-card overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-medium text-slate-900">Permission matrix</h2>
              <p className="text-xs text-slate-500">What every role can do at a glance.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-slate-50/70 text-left text-xs text-slate-500">
                  <tr>
                    <th className="sticky left-0 bg-slate-50 px-5 py-2.5 font-medium">Permission</th>
                    {roles.map((r) => <th key={r.id} className="px-3 py-2.5 text-center font-medium">{r.name}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {PERMISSION_GROUPS.map((g) => (
                    <PermissionRows key={g.module} group={g} roles={roles} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function PermissionRows({ group, roles }: { group: (typeof PERMISSION_GROUPS)[number]; roles: RoleView[] }) {
  return (
    <>
      <tr className="bg-slate-50/40">
        <td colSpan={roles.length + 1} className="sticky left-0 px-5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{group.label}</td>
      </tr>
      {group.permissions.map((p) => (
        <tr key={p.key}>
          <td className="sticky left-0 bg-white px-5 py-2 text-slate-700">{p.label}</td>
          {roles.map((r) => {
            const on = r.slug === SUPER_ADMIN_SLUG || r.permissions.includes("*") || r.permissions.includes(p.key);
            return (
              <td key={r.id} className="px-3 py-2 text-center">
                {on ? <CheckIcon className="mx-auto size-4 text-emerald-600" strokeWidth={2.5} aria-label="Allowed" />
                  : <span className="text-slate-300" aria-label="Not allowed">—</span>}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
