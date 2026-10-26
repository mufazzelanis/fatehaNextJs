"use client";

import { useActionState, useState } from "react";
import { savePayments } from "@/app/actions/catalog";
import { initialState } from "@/lib/action-state";
import { PAYMENT_LABEL, type PaymentConfig, type WalletConfig } from "@/lib/payments";
import { FormAlert, SubmitButton } from "@/components/form-bits";

const WALLET_COLOR = { bkash: "bg-[#e2136e]", nagad: "bg-[#f6921e]", rocket: "bg-[#8c3494]" } as const;

export function PaymentsForm({ config }: { config: PaymentConfig }) {
  const [state, action] = useActionState(savePayments, initialState);
  const [c, setC] = useState(config);
  const set = <K extends keyof PaymentConfig>(k: K, patch: Partial<PaymentConfig[K]>) => setC((cur) => ({ ...cur, [k]: { ...cur[k], ...patch } }));
  const anyOn = c.cod.enabled || c.bkash.enabled || c.nagad.enabled || c.rocket.enabled || c.bank.enabled;

  return (
    <form action={action} className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <input type="hidden" name="config" value={JSON.stringify(c)} />

      <Method title="Cash on Delivery" badge={<span className="grid size-9 place-items-center rounded-lg bg-emerald-600 text-xs font-bold text-white">COD</span>}
        enabled={c.cod.enabled} onToggle={(v) => set("cod", { enabled: v })}>
        <label className="block">
          <span className="a-label">Note shown at checkout</span>
          <input value={c.cod.instructions} onChange={(e) => set("cod", { instructions: e.target.value })} className="a-input" maxLength={300} />
        </label>
      </Method>

      {(["bkash", "nagad", "rocket"] as const).map((m) => (
        <Wallet key={m} id={m} wallet={c[m]} onChange={(patch) => set(m, patch)} />
      ))}

      <Method title="Bank Transfer" badge={<span className="grid size-9 place-items-center rounded-lg bg-slate-800 text-xs font-bold text-white">BANK</span>}
        enabled={c.bank.enabled} onToggle={(v) => set("bank", { enabled: v })}
        warning={c.bank.enabled && c.bank.accountNumber.trim().length < 4 ? "Enter the account number to turn this on" : undefined}>
        <div className="grid gap-3 sm:grid-cols-2">
          {([["bankName", "Bank name", "Dutch-Bangla Bank"], ["accountName", "Account name", ""], ["accountNumber", "Account number", ""],
            ["branch", "Branch", ""], ["routing", "Routing number", ""]] as const).map(([k, label, ph]) => (
            <label key={k} className="block">
              <span className="a-label">{label}</span>
              <input value={c.bank[k]} placeholder={ph} onChange={(e) => set("bank", { [k]: e.target.value })} className="a-input" />
            </label>
          ))}
        </div>
        <label className="block">
          <span className="a-label">Instructions</span>
          <textarea value={c.bank.instructions} rows={2} onChange={(e) => set("bank", { instructions: e.target.value })} className="a-input" maxLength={500} />
        </label>
      </Method>

      <div className="space-y-3 lg:col-span-2">
        {!anyOn && <p className="text-sm text-amber-700">At least one method must stay on — Cash on Delivery will be kept on.</p>}
        <FormAlert error={state.error} message={state.message} />
        <SubmitButton className="a-btn w-full py-2.5 sm:w-auto sm:px-8" pendingText="Saving…">Save payment methods</SubmitButton>
      </div>
    </form>
  );
}

function Wallet({ id, wallet: w, onChange }: { id: "bkash" | "nagad" | "rocket"; wallet: WalletConfig; onChange: (p: Partial<WalletConfig>) => void }) {
  const digits = w.number.replace(/\D/g, "");
  const valid = /^(?:\+?88)?01[3-9]\d{8}$/.test(digits) || (id === "rocket" && /^01[3-9]\d{9}$/.test(digits));
  return (
    <Method title={PAYMENT_LABEL[id]} badge={<span className={`grid size-9 place-items-center rounded-lg text-[11px] font-bold text-white ${WALLET_COLOR[id]}`}>{PAYMENT_LABEL[id].slice(0, 2)}</span>}
      enabled={w.enabled} onToggle={(v) => onChange({ enabled: v })}
      warning={w.enabled && !valid ? `Enter a valid ${PAYMENT_LABEL[id]} number to turn this on` : undefined}>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="block">
          <span className="a-label">{PAYMENT_LABEL[id]} number</span>
          <input value={w.number} inputMode="tel" placeholder={id === "rocket" ? "01XXXXXXXXX(X)" : "01XXXXXXXXX"} onChange={(e) => onChange({ number: e.target.value })}
            className="a-input font-mono" aria-invalid={w.number !== "" && !valid} />
        </label>
        <label className="block">
          <span className="a-label">Account type</span>
          <select value={w.accountType} onChange={(e) => onChange({ accountType: e.target.value as WalletConfig["accountType"] })} className="a-input">
            <option value="personal">Personal — Send Money</option>
            <option value="merchant">Merchant — Payment</option>
            <option value="agent">Agent — Cash In</option>
          </select>
        </label>
      </div>
      <label className="block">
        <span className="a-label">Instructions for the customer</span>
        <textarea value={w.instructions} rows={2} onChange={(e) => onChange({ instructions: e.target.value })} className="a-input" maxLength={500} />
      </label>
    </Method>
  );
}

function Method({ title, badge, enabled, onToggle, warning, children }: {
  title: string; badge: React.ReactNode; enabled: boolean; onToggle: (v: boolean) => void; warning?: string; children: React.ReactNode;
}) {
  return (
    <section className={`a-card p-5 transition ${enabled ? "ring-2 ring-emerald-500/20" : ""}`}>
      <div className="flex items-center gap-3">
        {badge}
        <h2 className="flex-1 font-medium text-slate-900">{title}</h2>
        <button type="button" role="switch" aria-checked={enabled} aria-label={`${title} ${enabled ? "on" : "off"}`} onClick={() => onToggle(!enabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${enabled ? "bg-emerald-500" : "bg-slate-300"}`}>
          <span className={`size-5 rounded-full bg-white shadow transition ${enabled ? "translate-x-5.5" : "translate-x-0.5"}`} />
        </button>
      </div>
      <div className={`mt-4 space-y-3 ${enabled ? "" : "opacity-60"}`}>{children}</div>
      {warning && <p className="mt-3 text-xs font-medium text-amber-700">{warning}</p>}
    </section>
  );
}
