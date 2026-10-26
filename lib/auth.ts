import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { queryOne } from "./db";
import { readSession } from "./session";
import { hasPermission, type Permission } from "./permissions";

export type AdminUser = {
  id: number;
  name: string;
  email: string;
  roleId: number | null;
  roleName: string;
  permissions: string[];
};

export type Customer = { id: number; name: string; phone: string; email: string | null; address: string | null; created_at: Date };

type AdminRow = { id: number; name: string; email: string; role_id: number | null; role_name: string | null; permissions: string | null };

/** Data Access Layer: verifies the session, account status and role against the database (once per request). */
export const getAdmin = cache(async (): Promise<AdminUser | null> => {
  const session = await readSession("admin");
  if (!session) return null;
  const row = await queryOne<AdminRow>(
    `SELECT u.id, u.name, u.email, u.role_id, r.name AS role_name, r.permissions
     FROM users u LEFT JOIN roles r ON r.id = u.role_id
     WHERE u.id = ? AND u.role = 'admin' AND u.is_active = 1`,
    [session.uid],
  );
  if (!row) return null;
  let permissions: string[] = [];
  if (row.role_id === null) {
    permissions = ["*"]; // accounts created before roles existed
  } else {
    try {
      const parsed = JSON.parse(row.permissions ?? "[]");
      if (Array.isArray(parsed)) permissions = parsed.filter((p): p is string => typeof p === "string");
    } catch {}
  }
  return { id: row.id, name: row.name, email: row.email, roleId: row.role_id, roleName: row.role_name ?? "Super Admin", permissions };
});

export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

export function can(admin: Pick<AdminUser, "permissions">, perm: Permission) {
  return hasPermission(admin.permissions, perm);
}

/** Page and action guard: signed in and allowed, otherwise sent to the no-access page. */
export async function requirePermission(perm: Permission): Promise<AdminUser> {
  const admin = await requireAdmin();
  if (!can(admin, perm)) redirect(`/admin/no-access?need=${perm}`);
  return admin;
}

/** For server actions that return a message: the admin when allowed, otherwise null (caller returns DENIED). */
export async function adminWith(perm: Permission): Promise<AdminUser | null> {
  const admin = await requireAdmin();
  return can(admin, perm) ? admin : null;
}

export const DENIED = { error: "You don't have permission to do this. Ask a Super Admin for access." } as const;

export async function getCustomer(): Promise<Customer | null> {
  const session = await readSession("customer");
  if (!session) return null;
  return queryOne<Customer>(
    "SELECT id, name, phone, email, address, created_at FROM users WHERE id = ? AND role = 'customer' AND is_active = 1",
    [session.uid],
  );
}

export async function requireCustomer(): Promise<Customer> {
  const customer = await getCustomer();
  if (!customer) redirect("/account/login");
  return customer;
}
