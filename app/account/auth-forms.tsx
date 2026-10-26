"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { customerLogin, customerRegister } from "@/app/actions/auth";
import { resendCustomerCode, startCustomerCode, verifyCustomerCode } from "@/app/actions/phone-otp";
import { initialState } from "@/lib/action-state";
import { FieldError, FormAlert, SubmitButton } from "@/components/form-bits";

export function LoginForm({ next, otp = false, notice }: { next: string; otp?: boolean; notice?: string | null }) {
  const [state, action] = useActionState(customerLogin, initialState);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {notice && !state.error && <FormAlert message={notice} />}
      <div>
        <label htmlFor="phone" className="label">মোবাইল নাম্বার</label>
        <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" defaultValue={state.values?.phone}
          placeholder="01XXXXXXXXX" className="field tracking-wide" required autoFocus />
      </div>
      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="password" className="label">পাসওয়ার্ড</label>
          {otp && <Link href="/account/forgot" className="text-sm font-medium text-brand-700 hover:underline">পাসওয়ার্ড ভুলে গেছেন?</Link>}
        </div>
        <input id="password" name="password" type="password" autoComplete="current-password" className="field" required />
      </div>
      <FormAlert error={state.error} />
      <SubmitButton className="btn-primary w-full" pendingText="লগইন হচ্ছে...">লগইন করুন</SubmitButton>
      {otp && (
        <Link href={`/account/forgot?mode=login&next=${encodeURIComponent(next)}`} className="btn-ghost w-full">পাসওয়ার্ড ছাড়া SMS কোড দিয়ে লগইন</Link>
      )}
      <p className="text-center text-sm text-slate-600">
        অ্যাকাউন্ট নেই? <Link href="/account/register" className="font-semibold text-brand-700 hover:underline">নতুন অ্যাকাউন্ট খুলুন</Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState(customerRegister, initialState);
  const fe = state.fieldErrors ?? {};
  const v = state.values ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <div>
        <label htmlFor="name" className="label">আপনার নাম</label>
        <input id="name" name="name" autoComplete="name" defaultValue={v.name} className="field" aria-invalid={!!fe.name} required />
        <FieldError message={fe.name} />
      </div>
      <div>
        <label htmlFor="phone" className="label">মোবাইল নাম্বার</label>
        <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" defaultValue={v.phone}
          placeholder="01XXXXXXXXX" className="field tracking-wide" aria-invalid={!!fe.phone} required />
        <FieldError message={fe.phone} />
        <p className="mt-1.5 text-xs text-slate-500">এই নাম্বার দিয়ে আগে করা অর্ডারগুলোও আপনার অ্যাকাউন্টে দেখাবে।</p>
      </div>
      <div>
        <label htmlFor="address" className="label">ঠিকানা <span className="font-normal text-slate-400">(ঐচ্ছিক)</span></label>
        <textarea id="address" name="address" rows={2} defaultValue={v.address} className="field resize-none" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="password" className="label">পাসওয়ার্ড</label>
          <input id="password" name="password" type="password" autoComplete="new-password" className="field" aria-invalid={!!fe.password} required />
          <FieldError message={fe.password} />
        </div>
        <div>
          <label htmlFor="confirm" className="label">পাসওয়ার্ড আবার দিন</label>
          <input id="confirm" name="confirm" type="password" autoComplete="new-password" className="field" aria-invalid={!!fe.confirm} required />
          <FieldError message={fe.confirm} />
        </div>
      </div>
      <FormAlert error={state.error} />
      <SubmitButton className="btn-primary w-full" pendingText="অ্যাকাউন্ট খোলা হচ্ছে...">অ্যাকাউন্ট খুলুন</SubmitButton>
      <p className="text-center text-sm text-slate-600">
        আগেই অ্যাকাউন্ট আছে? <Link href="/account/login" className="font-semibold text-brand-700 hover:underline">লগইন করুন</Link>
      </p>
    </form>
  );
}

/** Phone → SMS code, for "forgot password" (mode reset) or "sign in with a code" (mode login). */
export function PhoneCodeForm({ mode, next }: { mode: "reset" | "login"; next?: string }) {
  const [state, action] = useActionState(startCustomerCode, initialState);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="mode" value={mode} />
      {next && <input type="hidden" name="next" value={next} />}
      <div>
        <label htmlFor="phone" className="label">আপনার অ্যাকাউন্টের মোবাইল নাম্বার</label>
        <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" defaultValue={state.values?.phone}
          placeholder="01XXXXXXXXX" className="field tracking-wide" required autoFocus />
        <p className="mt-1.5 text-xs text-slate-500">এই নাম্বারে ৬ ডিজিটের একটি কোড SMS করা হবে।</p>
      </div>
      <FormAlert error={state.error} />
      <SubmitButton className="btn-primary w-full" pendingText="কোড পাঠানো হচ্ছে...">কোড পাঠান</SubmitButton>
      <p className="text-center text-sm text-slate-600"><Link href="/account/login" className="font-semibold text-brand-700 hover:underline">লগইন পেজে ফিরে যান</Link></p>
    </form>
  );
}

export function CustomerVerifyForm({ masked, purpose, wait }: { masked: string; purpose: "customer_register" | "customer_login" | "customer_reset"; wait: number }) {
  const [state, action] = useActionState(verifyCustomerCode, initialState);
  const fe = state.fieldErrors ?? {};
  const [code, setCode] = useState("");
  const form = useRef<HTMLFormElement>(null);
  const reset = purpose === "customer_reset";
  return (
    <div className="space-y-5">
      <p className="text-center text-slate-600"><b className="text-slate-900">{masked}</b> নাম্বারে ৬ ডিজিটের কোড পাঠানো হয়েছে। কোডটি ৫ মিনিট কাজ করবে।</p>
      <form ref={form} action={action} className="space-y-4">
        <input name="code" value={code} required autoFocus autoComplete="one-time-code" inputMode="numeric" maxLength={6} aria-label="৬ ডিজিটের কোড"
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, "").slice(0, 6);
            setCode(d);
            if (d.length === 6 && !reset) setTimeout(() => form.current?.requestSubmit(), 0);
          }}
          className="field py-4 text-center font-mono text-3xl tracking-[0.5em]" placeholder="••••••" />
        {reset && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="password" className="label">নতুন পাসওয়ার্ড</label>
              <input id="password" name="password" type="password" autoComplete="new-password" className="field" aria-invalid={!!fe.password} required />
              <FieldError message={fe.password} />
            </div>
            <div>
              <label htmlFor="confirm" className="label">আবার দিন</label>
              <input id="confirm" name="confirm" type="password" autoComplete="new-password" className="field" aria-invalid={!!fe.confirm} required />
              <FieldError message={fe.confirm} />
            </div>
          </div>
        )}
        <FormAlert error={state.error} />
        <SubmitButton className="btn-primary w-full" pendingText="যাচাই হচ্ছে...">
          {purpose === "customer_register" ? "যাচাই করে অ্যাকাউন্ট খুলুন" : reset ? "পাসওয়ার্ড পরিবর্তন করুন" : "যাচাই করে লগইন করুন"}
        </SubmitButton>
      </form>
      <ResendCode wait={wait} />
    </div>
  );
}

function ResendCode({ wait }: { wait: number }) {
  const [left, setLeft] = useState(wait);
  const [state, run, pending] = useActionState(async (prev: typeof initialState) => {
    const r = await resendCustomerCode(prev);
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
      <button type="submit" disabled={left > 0 || pending} className="font-semibold text-brand-700 hover:underline disabled:font-normal disabled:text-slate-400 disabled:no-underline">
        {pending ? "পাঠানো হচ্ছে..." : left > 0 ? `${left} সেকেন্ড পরে নতুন কোড নিতে পারবেন` : "কোড পাননি? নতুন কোড পাঠান"}
      </button>
      {(state.error || state.message) && <p className={`mt-1 text-xs ${state.error ? "text-rose-600" : "text-emerald-700"}`}>{state.error ?? state.message}</p>}
    </form>
  );
}
