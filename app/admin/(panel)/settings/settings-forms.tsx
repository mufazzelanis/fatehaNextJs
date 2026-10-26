"use client";

import { useActionState } from "react";
import Link from "next/link";
import { blockPhone, saveSettings } from "@/app/actions/admin";
import { initialState } from "@/lib/action-state";
import type { Settings } from "@/lib/data/store";
import { FormAlert, SubmitButton } from "@/components/form-bits";

function Field({ label, name, defaultValue, hint, type = "text", ...rest }: {
  label: string; name: string; defaultValue?: string; hint?: string; type?: string; min?: number; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="a-label">{label}</span>
      <input name={name} type={type} defaultValue={defaultValue} className="a-input font-sans" {...rest} />
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export function StoreSettingsForm({ settings }: { settings: Settings }) {
  const [state, action] = useActionState(saveSettings, initialState);
  return (
    <form action={action} className="space-y-6">
      <section className="a-card space-y-4 p-5">
        <h2 className="font-medium text-slate-900">Order protection</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Main site duplicate-order lock (minutes)" name="duplicate_block_minutes" type="number" min={0} defaultValue={settings.duplicate_block_minutes}
            hint="Rejects a 2nd store order from the same phone while a pending one is newer than this. 0 = off." />
          <p className="self-center rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            Landing pages have their own lock under <Link href="/admin/landing-settings" className="font-medium text-brand-700 underline">Landing Settings</Link>.
          </p>
        </div>
      </section>

      <section className="a-card space-y-4 p-5">
        <h2 className="font-medium text-slate-900">Policy pages</h2>
        <p className="-mt-2 text-xs text-slate-400">Shared by the main site and every landing page footer. Plain text; line breaks are kept.</p>
        {([
          ["refund_policy", "Refund policy"],
          ["privacy_policy", "Privacy policy"],
          ["terms_of_service", "Terms of service"],
        ] as const).map(([key, label]) => (
          <label key={key} className="block">
            <span className="a-label">{label}</span>
            <textarea name={key} rows={4} defaultValue={settings[key]} className="a-input font-sans" />
          </label>
        ))}
      </section>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="flex-1"><FormAlert error={state.error} message={state.message} /></div>
        <SubmitButton pendingText="Saving…">Save settings</SubmitButton>
      </div>
    </form>
  );
}

export function BlockPhoneForm() {
  const [state, action] = useActionState(blockPhone, initialState);
  return (
    <form action={action} className="space-y-2">
      <div className="flex gap-2">
        <input name="phone" placeholder="01XXXXXXXXX" className="a-input" required />
        <SubmitButton className="a-btn shrink-0 bg-rose-600 hover:bg-rose-700">Block</SubmitButton>
      </div>
      <input name="reason" placeholder="Reason (optional)" className="a-input font-sans" />
      <FormAlert error={state.error} message={state.message} />
    </form>
  );
}

