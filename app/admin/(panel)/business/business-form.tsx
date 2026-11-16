"use client";

import { useActionState, useState } from "react";
import { saveBusiness } from "@/app/actions/business";
import { initialState } from "@/lib/action-state";
import { SOCIAL_KEYS, SOCIAL_LABEL, type BusinessProfile } from "@/lib/business";
import { FieldError, FormAlert, SubmitButton } from "@/components/form-bits";

const WHERE: [string, string][] = [
  ["Name", "Copyright line on every page, main site footer, landing & combo page header"],
  ["Phone", "Contact page, main site footer & support strip, landing / combo page call button, guide pages, thank-you page, invoices"],
  ["WhatsApp", "Contact page, floating WhatsApp button on landing pages, footer, thank-you page"],
  ["Email & address", "Contact page, footer, invoices"],
  ["Social links", "Contact page, main site footer, thank-you page"],
];

function F({ name, label, value, onChange, hint, placeholder, error, mono, type = "text", rows }: {
  name: keyof BusinessProfile; label: string; value: string; onChange: (v: string) => void; hint?: string; placeholder?: string; error?: string; mono?: boolean; type?: string; rows?: number;
}) {
  const cls = `a-input ${mono ? "font-mono" : "font-sans"}`;
  return (
    <label className="block">
      <span className="a-label">{label}</span>
      {rows
        ? <textarea name={name} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cls} aria-invalid={!!error} />
        : <input name={name} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cls} aria-invalid={!!error} />}
      {hint && !error && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
      <FieldError message={error} />
    </label>
  );
}

/** Admin → Business Info: one form for the name, phones, WhatsApp, email, address, hours and social links. */
export function BusinessForm({ initial }: { initial: BusinessProfile }) {
  const [state, action] = useActionState(saveBusiness, initialState);
  const [b, setB] = useState<Record<keyof BusinessProfile, string>>(() => ({ ...initial, ...(state.values ?? {}) }));
  const set = (k: keyof BusinessProfile) => (v: string) => setB((x) => ({ ...x, [k]: v }));
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} noValidate className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
      <div className="space-y-5">
        <section className="a-card grid gap-4 p-5 sm:grid-cols-2">
          <h2 className="font-medium text-slate-900 sm:col-span-2">Business</h2>
          <F name="name" label="Business name" value={b.name} onChange={set("name")} error={fe.name} hint="e.g. Fatehabd — shown as “© 2026 Fatehabd. All rights reserved.”" />
          <F name="tagline" label="Short description (optional)" value={b.tagline} onChange={set("tagline")} placeholder="Authentic baby food & baby care across Bangladesh" hint="Main site footer" />
        </section>

        <section className="a-card grid gap-4 p-5 sm:grid-cols-2">
          <h2 className="font-medium text-slate-900 sm:col-span-2">Contact</h2>
          <F name="phone" label="Phone (main)" value={b.phone} onChange={set("phone")} type="tel" mono placeholder="01XXXXXXXXX" error={fe.phone} hint="Call buttons everywhere" />
          <F name="phone2" label="Second phone (optional)" value={b.phone2} onChange={set("phone2")} type="tel" mono placeholder="01XXXXXXXXX" error={fe.phone2} />
          <F name="whatsapp" label="WhatsApp number" value={b.whatsapp} onChange={set("whatsapp")} type="tel" mono placeholder="01XXXXXXXXX" error={fe.whatsapp} hint="Type it like a normal number — the 880 country code is added for you" />
          <F name="email" label="Email" value={b.email} onChange={set("email")} type="email" mono placeholder="support@fatehabd.com" error={fe.email} />
          <div className="sm:col-span-2"><F name="address" label="Address" value={b.address} onChange={set("address")} rows={2} placeholder="House, road, area, district" /></div>
          <F name="hours" label="Opening hours (optional)" value={b.hours} onChange={set("hours")} placeholder="every day, 9am – 10pm" hint="Contact page: “We're available every day, 9am – 10pm.”" />
        </section>

        <section className="a-card grid gap-4 p-5 sm:grid-cols-2">
          <h2 className="font-medium text-slate-900 sm:col-span-2">Social & web links <span className="text-xs font-normal text-slate-500">— leave empty to hide</span></h2>
          {SOCIAL_KEYS.map((k) => (
            <F key={k} name={k} label={SOCIAL_LABEL[k]} value={b[k]} onChange={set(k)} mono error={fe[k]}
              placeholder={k === "messenger" ? "https://m.me/yourpage" : k === "website" ? "https://fatehabd.com" : `https://${k}.com/…`} />
          ))}
        </section>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-20">
        <section className="a-card p-5">
          <FormAlert error={state.error} message={state.message} />
          <SubmitButton className="a-btn mt-3 w-full py-2.5" pendingText="Saving…">Save business info</SubmitButton>
        </section>
        <section className="a-card p-5">
          <h2 className="text-sm font-medium text-slate-900">Where this shows</h2>
          <dl className="mt-3 space-y-2.5 text-xs">
            {WHERE.map(([k, v]) => (
              <div key={k}><dt className="font-semibold text-slate-700">{k}</dt><dd className="text-slate-500">{v}</dd></div>
            ))}
          </dl>
        </section>
        <section className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Preview — contact card</p>
          <div className="space-y-1.5 rounded-xl bg-white p-4 text-sm shadow-sm">
            <p className="font-semibold text-slate-900">{b.name || "—"}</p>
            {b.phone && <p className="tabular-nums">📞 {b.phone}{b.phone2 ? ` · ${b.phone2}` : ""}</p>}
            {b.whatsapp && <p>💬 WhatsApp</p>}
            {b.email && <p className="break-all">✉️ {b.email}</p>}
            {b.address && <p>📍 {b.address}</p>}
            {b.hours && <p className="text-slate-500">🕘 {b.hours}</p>}
            <p className="pt-1 text-xs text-slate-400">© {new Date().getFullYear()} {b.name || "…"}. All rights reserved.</p>
          </div>
        </section>
      </aside>
    </form>
  );
}
