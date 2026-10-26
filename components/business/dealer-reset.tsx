"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { resendDealerCode, startDealerReset, verifyDealerReset } from "@/app/actions/dealer";
import { initialState } from "@/lib/action-state";
import { FieldError, FormAlert, SubmitButton } from "@/components/form-bits";

const field = "block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[15px] text-ink outline-none transition placeholder:text-slate-400 focus:border-fb-500 focus:ring-4 focus:ring-fb-500/15 aria-invalid:border-rose-400";
const btn = "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-fb-600 font-semibold text-white transition hover:bg-fb-700";

export function DealerForgotForm() {
  const [state, action] = useActionState(startDealerReset, initialState);
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink">Registered mobile number</span>
        <input name="phone" inputMode="tel" autoComplete="tel" required autoFocus defaultValue={state.values?.phone} placeholder="01XXXXXXXXX" className={field} />
      </label>
      <FormAlert error={state.error} />
      <SubmitButton className={btn} pendingText="Sending…">Send me a code</SubmitButton>
      <p className="text-center text-sm"><Link href="/business" className="text-slate-500 hover:text-ink">Back to sign in</Link></p>
    </form>
  );
}

export function DealerVerifyForm({ masked, wait }: { masked: string; wait: number }) {
  const [state, action] = useActionState(verifyDealerReset, initialState);
  const fe = state.fieldErrors ?? {};
  const [left, setLeft] = useState(wait);
  const [resend, runResend, resending] = useActionState(async (prev: typeof initialState) => {
    const r = await resendDealerCode(prev);
    if (r.ok) setLeft(60);
    return r;
  }, initialState);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return (
    <div className="space-y-4">
      <p className="text-center text-sm text-slate-600">We sent a 6-digit code to <b className="text-ink">{masked}</b>.</p>
      <form action={action} className="space-y-4">
        <input name="code" required autoFocus autoComplete="one-time-code" inputMode="numeric" maxLength={6} aria-label="6-digit code" placeholder="••••••"
          className={`${field} text-center font-mono text-2xl tracking-[0.5em]`} />
        <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink">New password</span>
          <input name="password" type="password" autoComplete="new-password" required className={field} aria-invalid={!!fe.password} /><FieldError message={fe.password} /></label>
        <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink">Repeat it</span>
          <input name="confirm" type="password" autoComplete="new-password" required className={field} aria-invalid={!!fe.confirm} /><FieldError message={fe.confirm} /></label>
        <FormAlert error={state.error} />
        <SubmitButton className={btn} pendingText="Saving…">Set password & sign in</SubmitButton>
      </form>
      <form action={runResend} className="text-center text-sm">
        <button type="submit" disabled={left > 0 || resending} className="font-medium text-fb-700 hover:underline disabled:text-slate-400 disabled:no-underline">
          {resending ? "Sending…" : left > 0 ? `Send a new code in ${left}s` : "Send a new code"}
        </button>
        {(resend.error || resend.message) && <p className={`mt-1 text-xs ${resend.error ? "text-rose-600" : "text-emerald-700"}`}>{resend.error ?? resend.message}</p>}
      </form>
    </div>
  );
}
