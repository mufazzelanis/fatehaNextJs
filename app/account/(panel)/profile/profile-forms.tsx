"use client";

import { useActionState } from "react";
import { changePassword, updateProfile } from "@/app/actions/account";
import { initialState } from "@/lib/action-state";
import { FieldError, FormAlert, SubmitButton } from "@/components/form-bits";

const card = "rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm";

export function ProfileForm({ customer }: { customer: { name: string; phone: string; email: string; address: string } }) {
  const [state, action] = useActionState(updateProfile, initialState);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className={`${card} space-y-4`}>
      <h2 className="font-display text-xl font-bold text-slate-900">প্রোফাইল তথ্য</h2>
      <div>
        <label htmlFor="name" className="label">নাম</label>
        <input id="name" name="name" defaultValue={customer.name} className="field" aria-invalid={!!fe.name} />
        <FieldError message={fe.name} />
      </div>
      <div>
        <label htmlFor="phone" className="label">মোবাইল নাম্বার</label>
        <input id="phone" value={customer.phone} disabled className="field bg-slate-50 text-slate-500" />
      </div>
      <div>
        <label htmlFor="email" className="label">ইমেইল <span className="font-normal text-slate-400">(ঐচ্ছিক)</span></label>
        <input id="email" name="email" type="email" defaultValue={customer.email} className="field" aria-invalid={!!fe.email} />
        <FieldError message={fe.email} />
      </div>
      <div>
        <label htmlFor="address" className="label">ডিফল্ট ঠিকানা</label>
        <textarea id="address" name="address" rows={3} defaultValue={customer.address} className="field resize-none" />
      </div>
      <FormAlert error={state.error} message={state.message} />
      <SubmitButton className="btn-primary w-full" pendingText="সেভ হচ্ছে...">সেভ করুন</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, initialState);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className={`${card} space-y-4 self-start`}>
      <h2 className="font-display text-xl font-bold text-slate-900">পাসওয়ার্ড পরিবর্তন</h2>
      <div>
        <label htmlFor="current" className="label">বর্তমান পাসওয়ার্ড</label>
        <input id="current" name="current" type="password" autoComplete="current-password" className="field" aria-invalid={!!fe.current} />
        <FieldError message={fe.current} />
      </div>
      <div>
        <label htmlFor="password" className="label">নতুন পাসওয়ার্ড</label>
        <input id="password" name="password" type="password" autoComplete="new-password" className="field" aria-invalid={!!fe.password} />
        <FieldError message={fe.password} />
      </div>
      <div>
        <label htmlFor="confirm" className="label">নতুন পাসওয়ার্ড আবার দিন</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" className="field" aria-invalid={!!fe.confirm} />
        <FieldError message={fe.confirm} />
      </div>
      <FormAlert error={state.error} message={state.message} />
      <SubmitButton className="btn-ghost w-full" pendingText="পরিবর্তন হচ্ছে...">পাসওয়ার্ড পরিবর্তন করুন</SubmitButton>
    </form>
  );
}
