"use client";

import { useActionState, useState } from "react";
import { createStaff, deleteRole, deleteStaff, resetStaffPassword, saveRole, updateStaff } from "@/app/actions/users";
import { initialState } from "@/lib/action-state";
import { PERMISSION_GROUPS } from "@/lib/permissions";
import { FieldError, FormAlert, SubmitButton } from "@/components/form-bits";
import { ChevronDownIcon, PlusIcon, ShieldIcon } from "@/components/icons";
import type { RoleView, StaffView } from "./page";

type RoleOption = { id: number; name: string };

const noAutofill = { autoComplete: "off", "data-1p-ignore": "true", "data-lpignore": "true" } as const;

function RoleSelect({ roles, defaultValue, name = "role_id" }: { roles: RoleOption[]; defaultValue?: number | null; name?: string }) {
  return (
    <select name={name} defaultValue={defaultValue ?? ""} className="a-input">
      <option value="" disabled>Choose a role…</option>
      {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
    </select>
  );
}

export function CreateStaffForm({ roles, defaultRoleId }: { roles: RoleOption[]; defaultRoleId?: number }) {
  const [state, action] = useActionState(createStaff, initialState);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="a-card space-y-3 p-5 xl:sticky xl:top-24" autoComplete="off">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand-700"><PlusIcon className="size-5" /></span>
        <div>
          <h2 className="font-medium text-slate-900">Add staff member</h2>
          <p className="text-xs text-slate-500">They sign in at /admin with this email.</p>
        </div>
      </div>
      <label className="block"><span className="a-label">Full name</span><input name="name" defaultValue={state.values?.name} className="a-input" {...noAutofill} /><FieldError message={fe.name} /></label>
      <label className="block"><span className="a-label">Email</span><input name="email" type="email" defaultValue={state.values?.email} className="a-input" {...noAutofill} /><FieldError message={fe.email} /></label>
      <label className="block">
        <span className="a-label">Temporary password (8+ characters)</span>
        <input name="password" autoComplete="new-password" className="a-input font-mono [-webkit-text-security:disc]" data-1p-ignore="true" />
        <FieldError message={fe.password} />
      </label>
      <label className="block"><span className="a-label">Role</span><RoleSelect roles={roles} defaultValue={Number(state.values?.role_id) || defaultRoleId} /><FieldError message={fe.role_id} /></label>
      <FormAlert error={state.error} message={state.message} />
      <SubmitButton className="a-btn w-full" pendingText="Adding…">Add staff member</SubmitButton>
    </form>
  );
}

export function StaffCard({ user, roles, isSelf }: { user: StaffView; roles: RoleOption[]; isSelf: boolean }) {
  const [edit, editAction] = useActionState(updateStaff, initialState);
  const [pw, pwAction] = useActionState(resetStaffPassword, initialState);
  const [del, delAction] = useActionState(deleteStaff, initialState);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fe = edit.fieldErrors ?? {};

  return (
    <details className={`a-card group overflow-hidden ${user.isActive ? "" : "opacity-75"}`}>
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 transition hover:bg-slate-50/60 sm:p-5 [&::-webkit-details-marker]:hidden">
        <span className={`grid size-11 shrink-0 place-items-center rounded-full font-semibold text-white ${user.isActive ? "bg-linear-to-br from-brand-500 to-brand-700" : "bg-slate-400"}`}>
          {user.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-medium text-slate-900">
            <span className="truncate">{user.name}</span>
            {isSelf && <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-sky-700">You</span>}
            {!user.isActive && <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600">Disabled</span>}
          </p>
          <p className="truncate text-sm text-slate-500">{user.email}</p>
        </div>
        <div className="hidden text-right sm:block">
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-800 ring-1 ring-brand-600/15">
            <ShieldIcon className="size-3.5" /> {user.roleName}
          </span>
          <p className="mt-1 text-xs text-slate-400">{user.lastLogin ? `Last login ${user.lastLogin}` : "Never signed in"}</p>
        </div>
        <ChevronDownIcon className="size-5 shrink-0 text-slate-400 transition duration-300 group-open:rotate-180" />
      </summary>

      <div className="grid gap-5 border-t border-slate-100 p-4 sm:p-5 lg:grid-cols-2">
        <form action={editAction} className="space-y-3">
          <input type="hidden" name="id" value={user.id} />
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Profile & access</p>
          <label className="block"><span className="a-label">Name</span><input name="name" defaultValue={user.name} className="a-input" {...noAutofill} /><FieldError message={fe.name} /></label>
          <label className="block"><span className="a-label">Email</span><input name="email" type="email" defaultValue={user.email} className="a-input" {...noAutofill} /><FieldError message={fe.email} /></label>
          <label className="block"><span className="a-label">Role</span><RoleSelect roles={roles} defaultValue={user.roleId} /><FieldError message={fe.role_id} /></label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="is_active" defaultChecked={user.isActive} disabled={isSelf} className="size-4 accent-brand-700" />
            Account active {isSelf && <span className="text-xs text-slate-400">(you can&apos;t disable yourself)</span>}
            {isSelf && <input type="hidden" name="is_active" value="on" />}
          </label>
          <FormAlert error={edit.error} message={edit.message} />
          <SubmitButton className="a-btn" pendingText="Saving…">Save changes</SubmitButton>
        </form>

        <div className="space-y-5">
          <form action={pwAction} className="space-y-3" autoComplete="off">
            <input type="hidden" name="id" value={user.id} />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reset password</p>
            <input name="password" placeholder="New password (8+ characters)" autoComplete="new-password"
              className="a-input font-mono [-webkit-text-security:disc]" data-1p-ignore="true" />
            <FieldError message={pw.fieldErrors?.password} />
            <FormAlert error={pw.error} message={pw.message} />
            <SubmitButton className="a-btn-outline" pendingText="Saving…">Set new password</SubmitButton>
          </form>

          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            Added {user.createdAt} · {user.actions30d} action(s) in the last 30 days ·{" "}
            <a href={`/admin/activity?user=${user.id}`} className="font-medium text-brand-700 underline">View activity</a>
          </div>

          {!isSelf && (
            <form action={delAction} className="space-y-2">
              <input type="hidden" name="id" value={user.id} />
              {confirmDelete ? (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-rose-700">Delete {user.name}? Their history stays in the activity log.</span>
                  <SubmitButton className="rounded-lg bg-rose-600 px-3 py-1.5 font-medium text-white hover:bg-rose-700" pendingText="Deleting…">Yes, delete</SubmitButton>
                  <button type="button" onClick={() => setConfirmDelete(false)} className="a-btn-outline py-1.5">Cancel</button>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmDelete(true)} className="text-sm font-medium text-rose-600 hover:underline">Delete this account…</button>
              )}
              <FormAlert error={del.error} message={del.message} />
            </form>
          )}
        </div>
      </div>
    </details>
  );
}

export function RoleEditor({ role }: { role: RoleView | null }) {
  const [state, action] = useActionState(saveRole, initialState);
  const [delState, delAction] = useActionState(deleteRole, initialState);
  const [perms, setPerms] = useState<string[]>(role?.permissions ?? []);
  const [open, setOpen] = useState(false);
  const all = role?.isSystem || perms.includes("*");
  const fe = state.fieldErrors ?? {};
  const toggle = (key: string) => setPerms((p) => (p.includes(key) ? p.filter((x) => x !== key) : [...p, key]));
  const toggleGroup = (keys: string[], on: boolean) => setPerms((p) => (on ? [...new Set([...p, ...keys])] : p.filter((x) => !keys.includes(x))));

  if (!role && !open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="grid min-h-40 place-items-center rounded-2xl border-2 border-dashed border-slate-300 p-6 text-sm font-medium text-slate-500 transition hover:border-brand-400 hover:bg-brand-50/40 hover:text-brand-700">
        <span className="flex items-center gap-2"><PlusIcon className="size-5" /> Create a custom role</span>
      </button>
    );
  }

  return (
    <form action={action} className="a-card flex flex-col p-5">
      {role && <input type="hidden" name="id" value={role.id} />}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {role?.isSystem ? (
            <p className="flex items-center gap-2 font-medium text-slate-900"><ShieldIcon className="size-4 text-brand-600" /> {role.name}</p>
          ) : (
            <input name="name" defaultValue={role?.name ?? ""} placeholder="Role name, e.g. Call Center" className="a-input font-medium" {...noAutofill} />
          )}
          <FieldError message={fe.name} />
        </div>
        {role && <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{role.users} user{role.users === 1 ? "" : "s"}</span>}
      </div>
      {role?.isSystem ? (
        <p className="mt-2 text-sm text-slate-500">{role.description} — always has every permission.</p>
      ) : (
        <input name="description" defaultValue={role?.description ?? ""} placeholder="What is this role for? (optional)" className="a-input mt-2 text-sm" {...noAutofill} />
      )}

      {!role?.isSystem && (
        <div className="mt-4 space-y-3">
          {PERMISSION_GROUPS.map((g) => {
            const keys = g.permissions.map((p) => p.key as string);
            const checked = keys.filter((k) => perms.includes(k)).length;
            return (
              <fieldset key={g.module} className="rounded-lg border border-slate-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {g.label} <span className="font-normal normal-case text-slate-400">{checked}/{keys.length}</span>
                  </legend>
                  <button type="button" onClick={() => toggleGroup(keys, checked < keys.length)} className="text-xs font-medium text-brand-700 hover:underline">
                    {checked < keys.length ? "Select all" : "Clear"}
                  </button>
                </div>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {g.permissions.map((p) => (
                    <label key={p.key} className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm text-slate-700 hover:bg-slate-50">
                      <input type="checkbox" name="permissions" value={p.key} checked={all || perms.includes(p.key)} onChange={() => toggle(p.key)} className="size-4 accent-brand-700" />
                      {p.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            );
          })}
          <FieldError message={fe.permissions} />
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!role?.isSystem && <SubmitButton className="a-btn" pendingText="Saving…">{role ? "Save role" : "Create role"}</SubmitButton>}
        {!role && <button type="button" onClick={() => setOpen(false)} className="a-btn-outline">Cancel</button>}
        {role && !role.isSystem && (
          <button formAction={delAction} className="a-btn-outline text-rose-600 hover:bg-rose-50">Delete role</button>
        )}
      </div>
      <div className="mt-3 space-y-2">
        <FormAlert error={state.error ?? delState.error} message={state.message ?? delState.message} />
      </div>
    </form>
  );
}
