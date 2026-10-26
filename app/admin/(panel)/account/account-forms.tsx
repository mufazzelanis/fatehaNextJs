"use client";

import { useActionState } from "react";
import { changeMyPassword, updateMyProfile } from "@/app/actions/users";
import { initialState } from "@/lib/action-state";
import { FieldError, FormAlert, SubmitButton } from "@/components/form-bits";

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [state, action] = useActionState(updateMyProfile, initialState);
  return (
    <form action={action} className="a-card space-y-3 p-5">
      <h2 className="font-medium text-slate-900">Profile</h2>
      <label className="block"><span className="a-label">Name</span><input name="name" defaultValue={name} className="a-input" /><FieldError message={state.fieldErrors?.name} /></label>
      <label className="block"><span className="a-label">Email</span><input value={email} disabled className="a-input bg-slate-50 text-slate-500" /></label>
      <p className="text-xs text-slate-400">Ask a Super Admin to change your email or role.</p>
      <FormAlert error={state.error} message={state.message} />
      <SubmitButton pendingText="Saving…">Save profile</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changeMyPassword, initialState);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="a-card space-y-3 p-5">
      <h2 className="font-medium text-slate-900">Change password</h2>
      <label className="block"><span className="a-label">Current password</span><input name="current" type="password" autoComplete="current-password" className="a-input" /><FieldError message={fe.current} /></label>
      <label className="block"><span className="a-label">New password</span><input name="password" type="password" autoComplete="new-password" className="a-input" /><FieldError message={fe.password} /></label>
      <label className="block"><span className="a-label">Confirm new password</span><input name="confirm" type="password" autoComplete="new-password" className="a-input" /><FieldError message={fe.confirm} /></label>
      <FormAlert error={state.error} message={state.message} />
      <SubmitButton pendingText="Updating…">Update password</SubmitButton>
    </form>
  );
}
