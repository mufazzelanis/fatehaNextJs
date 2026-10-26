"use client";

import { useActionState, useState } from "react";
import { setPaymentStatus } from "@/app/actions/catalog";
import { initialState } from "@/lib/action-state";
import { PAYMENT_STATUS_META, type PaymentStatus } from "@/lib/payments";
import { FormAlert, SubmitButton } from "@/components/form-bits";
import { CheckIcon } from "@/components/icons";

export function PaymentForm({ id, status, wallet, readOnly }: { id: number; status: PaymentStatus; wallet: boolean; readOnly: boolean }) {
  const [state, action] = useActionState(setPaymentStatus, initialState);
  const [other, setOther] = useState(false);
  if (readOnly) return null;
  const options: PaymentStatus[] = wallet ? ["pending_verification", "paid", "refunded"] : ["unpaid", "paid", "refunded"];

  return (
    <div className="mt-4 space-y-3">
      {wallet && status === "pending_verification" && !other ? (
        <form action={action} className="space-y-2">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="payment_status" value="paid" />
          <p className="text-xs text-slate-500">Check your merchant app: the Transaction ID and amount must match before you confirm.</p>
          <SubmitButton className="a-btn w-full bg-emerald-600 hover:bg-emerald-700" pendingText="Saving…"><CheckIcon className="size-4" /> Payment received — mark paid</SubmitButton>
          <button type="button" onClick={() => setOther(true)} className="w-full text-center text-xs text-slate-500 hover:text-slate-900">Other status…</button>
        </form>
      ) : (
        <form action={action} className="flex gap-2">
          <input type="hidden" name="id" value={id} />
          <select name="payment_status" defaultValue={status} className="a-input" aria-label="Payment status">
            {options.map((s) => <option key={s} value={s}>{PAYMENT_STATUS_META[s].label}</option>)}
          </select>
          <SubmitButton className="a-btn shrink-0" pendingText="…">Update</SubmitButton>
        </form>
      )}
      <FormAlert error={state.error} message={state.message} />
    </div>
  );
}
