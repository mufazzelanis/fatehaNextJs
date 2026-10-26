"use server";

import bcrypt from "bcryptjs";
import { refresh } from "next/cache";
import { execute, query, queryOne } from "@/lib/db";
import { adminWith, DENIED, requireAdmin } from "@/lib/auth";
import { diff, logActivity, MASKED } from "@/lib/activity";
import { isPermission, PERMISSION_LABEL, SUPER_ADMIN_SLUG } from "@/lib/permissions";
import type { ActionState } from "@/lib/action-state";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RoleRow = { id: number; name: string; slug: string; permissions: string; is_system: number };
type StaffRow = { id: number; name: string; email: string; role_id: number | null; is_active: number };

async function superAdminRoleId() {
  return (await queryOne<{ id: number }>("SELECT id FROM roles WHERE slug = ?", [SUPER_ADMIN_SLUG]))?.id ?? null;
}

/** Active super admins other than `excludeId` — there must always be at least one. */
async function otherActiveSuperAdmins(excludeId: number) {
  const superId = await superAdminRoleId();
  const row = await queryOne<{ n: number }>(
    "SELECT COUNT(*) n FROM users WHERE role = 'admin' AND is_active = 1 AND id <> ? AND (role_id = ? OR role_id IS NULL)",
    [excludeId, superId],
  );
  return Number(row?.n ?? 0);
}

async function roleName(id: number | null) {
  if (id === null) return "—";
  return (await queryOne<{ name: string }>("SELECT name FROM roles WHERE id = ?", [id]))?.name ?? `#${id}`;
}

export async function createStaff(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminWith("users.manage");
  if (!admin) return DENIED;
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const roleId = Number(formData.get("role_id"));
  const values = { name, email, role_id: String(roleId || "") };

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = "Name is required";
  if (!EMAIL.test(email)) fieldErrors.email = "Enter a valid email";
  if (password.length < 8) fieldErrors.password = "Use at least 8 characters";
  const role = roleId ? await queryOne<RoleRow>("SELECT * FROM roles WHERE id = ?", [roleId]) : null;
  if (!role) fieldErrors.role_id = "Choose a role";
  if (!fieldErrors.email && (await queryOne("SELECT id FROM users WHERE email = ?", [email]))) fieldErrors.email = "This email is already in use";
  if (Object.keys(fieldErrors).length || !role) return { fieldErrors, values };

  const result = await execute(
    "INSERT INTO users (name, email, password_hash, role, role_id, created_by) VALUES (?, ?, ?, 'admin', ?, ?)",
    [name, email, await bcrypt.hash(password, 10), role.id, admin.id],
  );
  await logActivity({
    actor: admin, action: "user.created", module: "users", entityType: "user", entityId: result.insertId,
    description: `Added staff ${name} (${email}) as ${role.name}`,
  });
  refresh();
  return { ok: true, message: `${name} can now sign in at /admin with ${email}` };
}

export async function updateStaff(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminWith("users.manage");
  if (!admin) return DENIED;
  const id = Number(formData.get("id"));
  const staff = await queryOne<StaffRow>("SELECT id, name, email, role_id, is_active FROM users WHERE id = ? AND role = 'admin'", [id]);
  if (!staff) return { error: "Staff member not found" };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const roleId = Number(formData.get("role_id"));
  const isActive = formData.get("is_active") === "on" ? 1 : 0;
  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = "Name is required";
  if (!EMAIL.test(email)) fieldErrors.email = "Enter a valid email";
  else if (await queryOne("SELECT id FROM users WHERE email = ? AND id <> ?", [email, id])) fieldErrors.email = "This email is already in use";
  const role = await queryOne<RoleRow>("SELECT * FROM roles WHERE id = ?", [roleId]);
  if (!role) fieldErrors.role_id = "Choose a role";
  if (Object.keys(fieldErrors).length || !role) return { fieldErrors };

  const superId = await superAdminRoleId();
  const wasSuper = staff.role_id === null || staff.role_id === superId;
  const staysSuper = role.id === superId && isActive === 1;
  if (id === admin.id && !isActive) return { error: "You can't deactivate your own account" };
  if (id === admin.id && role.id !== staff.role_id && wasSuper && !staysSuper) {
    return { error: "You can't remove your own Super Admin role — ask another Super Admin" };
  }
  if (wasSuper && staff.is_active && !staysSuper && (await otherActiveSuperAdmins(id)) === 0) {
    return { error: "This is the last active Super Admin — promote someone else first" };
  }

  const changes = diff(staff as unknown as Record<string, unknown>, { name, email, role_id: role.id, is_active: isActive }, ["name", "email", "role_id", "is_active"])
    .map((c) => c.field === "role_id" ? { ...c, field: "role" } : c.field === "is_active" ? { field: "status", from: c.from ? "active" : "disabled", to: c.to ? "active" : "disabled" } : c);
  for (const c of changes) {
    if (c.field === "role") {
      c.from = await roleName(staff.role_id);
      c.to = role.name;
    }
  }
  if (!changes.length) return { ok: true, message: "Nothing changed" };

  await execute("UPDATE users SET name = ?, email = ?, role_id = ?, is_active = ? WHERE id = ?", [name, email, role.id, isActive, id]);
  await logActivity({
    actor: admin, action: "user.updated", module: "users", entityType: "user", entityId: id,
    description: `Updated staff ${name} (${changes.map((c) => c.field).join(", ")})`, changes,
  });
  refresh();
  return { ok: true, message: "Staff member updated" };
}

export async function resetStaffPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminWith("users.manage");
  if (!admin) return DENIED;
  const id = Number(formData.get("id"));
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { fieldErrors: { password: "Use at least 8 characters" } };
  const staff = await queryOne<StaffRow>("SELECT id, name FROM users WHERE id = ? AND role = 'admin'", [id]);
  if (!staff) return { error: "Staff member not found" };
  await execute("UPDATE users SET password_hash = ? WHERE id = ?", [await bcrypt.hash(password, 10), id]);
  await logActivity({
    actor: admin, action: "user.password_reset", module: "users", entityType: "user", entityId: id,
    description: `Reset the password of ${staff.name}`, changes: [{ field: "password", from: MASKED, to: MASKED }],
  });
  return { ok: true, message: `Password changed. Share it with ${staff.name} privately.` };
}

export async function deleteStaff(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminWith("users.manage");
  if (!admin) return DENIED;
  const id = Number(formData.get("id"));
  if (id === admin.id) return { error: "You can't delete your own account" };
  const staff = await queryOne<StaffRow>("SELECT id, name, email, role_id, is_active FROM users WHERE id = ? AND role = 'admin'", [id]);
  if (!staff) return { error: "Staff member not found" };
  const superId = await superAdminRoleId();
  if ((staff.role_id === null || staff.role_id === superId) && staff.is_active && (await otherActiveSuperAdmins(id)) === 0) {
    return { error: "This is the last active Super Admin" };
  }
  // History keeps the name snapshot; the link to the account is cleared by ON DELETE SET NULL where it exists.
  await execute("UPDATE activity_logs SET user_id = NULL WHERE user_id = ?", [id]);
  await execute("DELETE FROM users WHERE id = ?", [id]);
  await logActivity({
    actor: admin, action: "user.deleted", module: "users", entityType: "user", entityId: id,
    description: `Deleted staff ${staff.name} (${staff.email})`,
  });
  refresh();
  return { ok: true, message: `${staff.name} was removed` };
}

export async function saveRole(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminWith("users.manage");
  if (!admin) return DENIED;
  const id = Number(formData.get("id")) || null;
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  const description = String(formData.get("description") ?? "").trim().slice(0, 255) || null;
  const permissions = [...new Set(formData.getAll("permissions").map(String).filter(isPermission))];

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = "Role name is required";
  if (!permissions.length) fieldErrors.permissions = "Pick at least one permission";
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `role-${Date.now()}`;
  const clash = await queryOne<{ id: number }>("SELECT id FROM roles WHERE (slug = ? OR name = ?) AND id <> ?", [slug, name, id ?? 0]);
  if (clash) fieldErrors.name = "A role with this name already exists";
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  if (id) {
    const role = await queryOne<RoleRow>("SELECT * FROM roles WHERE id = ?", [id]);
    if (!role) return { error: "Role not found" };
    if (role.is_system) return { error: "The Super Admin role always has every permission and can't be edited" };
    const before: string[] = JSON.parse(role.permissions || "[]");
    const added = permissions.filter((p) => !before.includes(p));
    const removed = before.filter((p) => !(permissions as string[]).includes(p));
    await execute("UPDATE roles SET name = ?, description = ?, permissions = ? WHERE id = ?", [name, description, JSON.stringify(permissions), id]);
    const changes = [
      ...(role.name !== name ? [{ field: "name", from: role.name, to: name }] : []),
      ...added.map((p) => ({ field: "permission added", from: null, to: PERMISSION_LABEL[p] ?? p })),
      ...removed.map((p) => ({ field: "permission removed", from: PERMISSION_LABEL[p] ?? p, to: null })),
    ];
    if (changes.length) {
      await logActivity({ actor: admin, action: "role.updated", module: "users", entityType: "role", entityId: id, description: `Updated role ${name}`, changes });
    }
    refresh();
    return { ok: true, message: `Role “${name}” saved — affects its staff immediately` };
  }

  const result = await execute("INSERT INTO roles (name, slug, description, permissions) VALUES (?, ?, ?, ?)", [name, slug, description, JSON.stringify(permissions)]);
  await logActivity({
    actor: admin, action: "role.created", module: "users", entityType: "role", entityId: result.insertId,
    description: `Created role ${name} with ${permissions.length} permission(s)`,
    changes: permissions.map((p) => ({ field: "permission", from: null, to: PERMISSION_LABEL[p] ?? p })),
  });
  refresh();
  return { ok: true, message: `Role “${name}” created` };
}

export async function deleteRole(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminWith("users.manage");
  if (!admin) return DENIED;
  const id = Number(formData.get("id"));
  const role = await queryOne<RoleRow>("SELECT * FROM roles WHERE id = ?", [id]);
  if (!role) return { error: "Role not found" };
  if (role.is_system) return { error: "The Super Admin role can't be deleted" };
  const used = await query<{ name: string }>("SELECT name FROM users WHERE role_id = ? AND role = 'admin'", [id]);
  if (used.length) return { error: `Move ${used.map((u) => u.name).join(", ")} to another role first` };
  await execute("DELETE FROM roles WHERE id = ?", [id]);
  await logActivity({ actor: admin, action: "role.deleted", module: "users", entityType: "role", entityId: id, description: `Deleted role ${role.name}` });
  refresh();
  return { ok: true, message: `Role “${role.name}” deleted` };
}

/** Any signed-in staff member can change their own name and password. */
export async function updateMyProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { fieldErrors: { name: "Name is required" } };
  if (name === admin.name) return { ok: true, message: "Nothing changed" };
  await execute("UPDATE users SET name = ? WHERE id = ?", [name, admin.id]);
  await logActivity({
    actor: { id: admin.id, name }, action: "profile.updated", module: "users", entityType: "user", entityId: admin.id,
    description: "Updated own profile", changes: [{ field: "name", from: admin.name, to: name }],
  });
  refresh();
  return { ok: true, message: "Profile saved" };
}

export async function changeMyPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (next.length < 8) return { fieldErrors: { password: "Use at least 8 characters" } };
  if (next !== confirm) return { fieldErrors: { confirm: "Passwords don't match" } };
  const row = await queryOne<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = ?", [admin.id]);
  if (!row || !(await bcrypt.compare(current, row.password_hash))) {
    return { fieldErrors: { current: "Current password is wrong" } };
  }
  await execute("UPDATE users SET password_hash = ? WHERE id = ?", [await bcrypt.hash(next, 10), admin.id]);
  await logActivity({
    actor: admin, action: "profile.password_changed", module: "users", entityType: "user", entityId: admin.id,
    description: "Changed own password", changes: [{ field: "password", from: MASKED, to: MASKED }],
  });
  return { ok: true, message: "Password changed" };
}
