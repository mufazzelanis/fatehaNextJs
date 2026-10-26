"use client";

import { useActionState, useState } from "react";
import { registerDealer } from "@/app/actions/dealer";
import { initialState } from "@/lib/action-state";
import { AreaPicker } from "@/components/area-picker";
import { FieldError, FormAlert, SubmitButton } from "@/components/form-bits";
import { CheckCircleIcon, ImageIcon } from "@/components/icons";

type Place = { id: number; name: string; bn_name: string | null };

const field = "block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[15px] text-ink outline-none transition placeholder:text-slate-400 focus:border-fb-500 focus:ring-4 focus:ring-fb-500/15 aria-invalid:border-rose-400 disabled:bg-slate-50 disabled:text-slate-400";
const label = "mb-1.5 block text-sm font-medium text-ink";

const LEVELS = [
  { key: "district", title: "District Dealer", text: "Covers a whole district and manages its thana dealers." },
  { key: "thana", title: "Thana Dealer", text: "Covers one thana / upazila and its union dealers." },
  { key: "union", title: "Union Dealer", text: "Covers one union — closest to customers." },
] as const;

export function DealerRegisterForm({ districts }: { districts: Place[] }) {
  const [state, action] = useActionState(registerDealer, initialState);
  const v = state.values ?? {};
  const fe = state.fieldErrors ?? {};
  const [level, setLevel] = useState(v.applied_level ?? "");

  return (
    <form action={action} className="space-y-8" noValidate>
      <fieldset>
        <legend className="mb-3 text-base font-bold text-ink">1. Dealership you are applying for</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {LEVELS.map((l) => (
            <label key={l.key} className={`relative cursor-pointer rounded-2xl border-2 p-4 transition ${level === l.key ? "border-fb-500 bg-fb-50/60" : "border-slate-200 bg-white hover:border-fb-200"}`}>
              <input type="radio" name="applied_level" value={l.key} checked={level === l.key} onChange={() => setLevel(l.key)} className="sr-only" />
              {level === l.key && <CheckCircleIcon className="absolute right-3 top-3 size-5 text-fb-600" />}
              <span className="block font-semibold text-ink">{l.title}</span>
              <span className="mt-1 block text-xs leading-relaxed text-slate-500">{l.text}</span>
            </label>
          ))}
        </div>
        <FieldError message={fe.applied_level} />
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-base font-bold text-ink">2. Your area</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <AreaPicker districts={districts} defaults={{ district: v.district, thana: v.thana, union: v.union }}
            union={level === "union" ? "required" : level ? "hidden" : "optional"} errors={fe} selectClass={field} labelClass={label} />
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-base font-bold text-ink">3. Your details</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input name="name" label="Full name" defaultValue={v.name} error={fe.name} autoComplete="name" />
          <Input name="phone" label="Mobile number" defaultValue={v.phone} error={fe.phone} inputMode="tel" placeholder="01XXXXXXXXX" autoComplete="tel" />
          <Input name="email" label="Email (optional)" defaultValue={v.email} error={fe.email} type="email" autoComplete="email" />
          <Input name="nid_number" label="NID number" defaultValue={v.nid_number} error={fe.nid_number} inputMode="numeric" />
          <Input name="password" label="Password" error={fe.password} type="password" autoComplete="new-password" />
          <Input name="password_confirmation" label="Confirm password" error={fe.password_confirmation} type="password" autoComplete="new-password" />
          <label className="block sm:col-span-2">
            <span className={label}>Full address</span>
            <textarea name="address" rows={2} defaultValue={v.address} className={field} aria-invalid={!!fe.address} />
            <FieldError message={fe.address} />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1 text-base font-bold text-ink">4. Documents</legend>
        <p className="mb-3 text-sm text-slate-500">Clear photos or PDF, up to 3MB each. Documents are only seen by FatehaBD staff. Files need to be chosen again if the form shows an error.</p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <FileBox name="photo" title="Your photo" accept="image/jpeg,image/png,image/webp" error={fe.photo} />
          <FileBox name="nid_front" title="NID — front" accept="image/jpeg,image/png,image/webp,application/pdf" error={fe.nid_front} />
          <FileBox name="nid_back" title="NID — back" accept="image/jpeg,image/png,image/webp,application/pdf" error={fe.nid_back} />
          <FileBox name="bank_slip" title="Bank deposit slip" accept="image/jpeg,image/png,image/webp,application/pdf" error={fe.bank_slip} />
        </div>
      </fieldset>

      <div className="space-y-3">
        <FormAlert error={state.error} />
        <SubmitButton className="inline-flex h-13 w-full items-center justify-center rounded-xl bg-fb-600 px-8 text-base font-semibold text-white shadow-lg shadow-fb-600/25 transition hover:bg-fb-700 sm:w-auto" pendingText="Submitting…">
          Submit application
        </SubmitButton>
        <p className="text-xs text-slate-500">After review our team activates your account. You can sign in any time to see the status.</p>
      </div>
    </form>
  );
}

function Input({ name, label: text, error, ...props }: { name: string; label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className={label}>{text}</span>
      <input name={name} {...props} className={field} aria-invalid={!!error} />
      <FieldError message={error} />
    </label>
  );
}

function FileBox({ name, title, accept, error }: { name: string; title: string; accept: string; error?: string }) {
  const [preview, setPreview] = useState<{ url: string | null; name: string } | null>(null);
  return (
    <label className={`group relative flex aspect-[4/3] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed text-center transition ${
      error ? "border-rose-300 bg-rose-50/50" : preview ? "border-fb-300 bg-white" : "border-slate-300 bg-slate-50 hover:border-fb-400"}`}>
      <input type="file" name={name} accept={accept} className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; setPreview(f ? { url: f.type.startsWith("image/") ? URL.createObjectURL(f) : null, name: f.name } : null); }} />
      {preview?.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview.url} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        <span className="px-2 text-slate-500">
          <ImageIcon className="mx-auto mb-1 size-7" />
          <span className="block text-xs">{preview ? preview.name : "Tap to upload"}</span>
        </span>
      )}
      <span className="absolute inset-x-0 bottom-0 bg-ink/75 px-2 py-1.5 text-xs font-semibold text-white">{title}</span>
      {error && <span className="absolute inset-x-1 top-1 rounded bg-rose-600 px-1.5 py-0.5 text-[11px] text-white">{error}</span>}
    </label>
  );
}
