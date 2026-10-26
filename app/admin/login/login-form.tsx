"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { adminLogin, requestAdminReset, resendAdminOtp, resetAdminPassword, verifyAdminOtp } from "@/app/actions/auth";
import { initialState } from "@/lib/action-state";
import { FieldError, FormAlert, SubmitButton } from "@/components/form-bits";

export function AdminLoginForm({ next, notice }: { next: string; notice: string | null }) {
  const [state, action] = useActionState(adminLogin, initialState);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {notice && !state.error && <FormAlert message={notice} />}
      <div>
        <label htmlFor="email" className="a-label">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" defaultValue={state.values?.email}
          className="a-input py-2.5" placeholder="admin@example.com" required autoFocus />
      </div>
      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="password" className="a-label">Password</label>
          <Link href="/admin/login/forgot" className="text-xs font-medium text-brand-700 hover:underline">Forgot password?</Link>
        </div>
        <input id="password" name="password" type="password" autoComplete="current-password" className="a-input py-2.5" required />
      </div>
      <FormAlert error={state.error} />
      <SubmitButton className="a-btn w-full py-2.5" pendingText="Signing in…">Sign in</SubmitButton>
    </form>
  );
}

/** 6-digit code box: digits only, submits by itself when complete, works with SMS/email autofill. */
export function CodeInput({ onComplete }: { onComplete?: () => void }) {
  const [v, setV] = useState("");
  return (
    <input name="code" value={v} required autoFocus autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} aria-label="6-digit code"
      onChange={(e) => {
        const d = e.target.value.replace(/\D/g, "").slice(0, 6);
        setV(d);
        if (d.length === 6) setTimeout(() => onComplete?.(), 0);
      }}
      className="a-input py-3 text-center font-mono text-2xl tracking-[0.5em]" placeholder="••••••" />
  );
}

export function ResendButton({ wait, action }: { wait: number; action: (prev: typeof initialState) => Promise<typeof initialState> }) {
  const [left, setLeft] = useState(wait);
  const [state, run, pending] = useActionState(async (prev: typeof initialState) => {
    const r = await action(prev);
    if (r.ok) setLeft(60);
    return r;
  }, initialState);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return (
    <form action={run} className="text-center text-sm">
      <button type="submit" disabled={left > 0 || pending} className="font-medium text-brand-700 hover:underline disabled:text-slate-400 disabled:no-underline">
        {pending ? "Sending…" : left > 0 ? `Send a new code in ${left}s` : "Send a new code"}
      </button>
      {(state.error || state.message) && <p className={`mt-1 text-xs ${state.error ? "text-rose-600" : "text-emerald-700"}`}>{state.error ?? state.message}</p>}
    </form>
  );
}

export function AdminVerifyForm({ masked, trustDays, wait }: { masked: string; trustDays: number; wait: number }) {
  const [state, action] = useActionState(verifyAdminOtp, initialState);
  const form = useRef<HTMLFormElement>(null);
  return (
    <div className="space-y-4">
      <p className="text-center text-sm text-slate-600">We emailed a 6-digit code to <b className="text-slate-900">{masked}</b>. It works for 5 minutes.</p>
      <form ref={form} action={action} className="space-y-4">
        <CodeInput onComplete={() => form.current?.requestSubmit()} />
        {trustDays > 0 && (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" name="trust" className="size-4 accent-brand-700" /> Trust this device for {trustDays} days
          </label>
        )}
        <FormAlert error={state.error} />
        <SubmitButton className="a-btn w-full py-2.5" pendingText="Checking…">Verify & sign in</SubmitButton>
      </form>
      <ResendButton wait={wait} action={resendAdminOtp} />
      <p className="text-center text-xs text-slate-400">Can&apos;t find it? Check spam, or <Link href="/admin/login" className="underline">sign in again</Link>.</p>
    </div>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState(requestAdminReset, initialState);
  if (state.ok) return <div className="space-y-4"><FormAlert message={state.message} /><Link href="/admin/login" className="a-btn-outline w-full">Back to sign in</Link></div>;
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="email" className="a-label">Your staff email</label>
        <input id="email" name="email" type="email" autoComplete="username" defaultValue={state.values?.email} className="a-input py-2.5" required autoFocus />
      </div>
      <FormAlert error={state.error} />
      <SubmitButton className="a-btn w-full py-2.5" pendingText="Sending…">Email me a reset link</SubmitButton>
      <p className="text-center text-sm"><Link href="/admin/login" className="text-slate-500 hover:text-slate-900">Back to sign in</Link></p>
    </form>
  );
}

export function ResetForm({ id, token }: { id: number; token: string }) {
  const [state, action] = useActionState(resetAdminPassword, initialState);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="i" value={id} />
      <input type="hidden" name="t" value={token} />
      <div>
        <label htmlFor="password" className="a-label">New password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} className="a-input py-2.5" required autoFocus aria-invalid={!!fe.password} />
        <FieldError message={fe.password} />
      </div>
      <div>
        <label htmlFor="confirm" className="a-label">Repeat it</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" className="a-input py-2.5" required aria-invalid={!!fe.confirm} />
        <FieldError message={fe.confirm} />
      </div>
      <FormAlert error={state.error} />
      <SubmitButton className="a-btn w-full py-2.5" pendingText="Saving…">Set new password</SubmitButton>
    </form>
  );
}
