"use client";

import { useActionState, useState } from "react";
import { saveGlobalLandingSettings } from "@/app/actions/landings";
import { initialState } from "@/lib/action-state";
import type { LandingSettings } from "@/lib/landing";
import { FormAlert, SubmitButton } from "@/components/form-bits";
import { PhoneIcon, WhatsappIcon } from "@/components/icons";

export function LandingSettingsForm({ initial }: { initial: LandingSettings }) {
  const [state, action] = useActionState(saveGlobalLandingSettings, initialState);
  const [c, setC] = useState(initial);
  const set = (patch: Partial<LandingSettings>) => setC((x) => ({ ...x, ...patch }));

  return (
    <form action={action} className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <input type="hidden" name="config" value={JSON.stringify(c)} />
      <div className="min-w-0 space-y-6 xl:col-span-2">
        <section className="a-card space-y-4 p-5">
          <h2 className="font-medium text-slate-900">Branding defaults</h2>
          <label className="block">
            <span className="a-label">Footer brand name</span>
            <input value={c.footerName} maxLength={120} onChange={(e) => set({ footerName: e.target.value })} className="a-input font-sans" />
            <span className="mt-1 block text-xs text-slate-400">“© 2026 {c.footerName || "…"}. All rights reserved.” on landing pages without their own name.</span>
          </label>
          <label className="block">
            <span className="a-label">Order number prefix for new landing pages</span>
            <input value={c.defaultPrefix} maxLength={5} onChange={(e) => set({ defaultPrefix: e.target.value.toUpperCase().replace(/[^A-Z]/g, "") })} className="a-input w-32 font-mono" />
            <span className="mt-1 block text-xs text-slate-400">Main-site orders always start with FB.</span>
          </label>
        </section>

        <section className="a-card space-y-4 p-5">
          <h2 className="font-medium text-slate-900">Order protection</h2>
          <label className="block">
            <span className="a-label">Duplicate-order lock (minutes)</span>
            <input type="number" min={0} max={1440} value={c.duplicateMinutes} onChange={(e) => set({ duplicateMinutes: Number(e.target.value) || 0 })} className="a-input w-32" />
            <span className="mt-1 block text-xs text-slate-400">A phone with a pending landing order newer than this can&apos;t order again. 0 = off.</span>
          </label>
        </section>

        <section className="a-card space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-medium text-slate-900">Floating call & WhatsApp buttons</h2>
              <p className="mt-0.5 text-xs text-slate-500">Round buttons in the corner of every landing page.</p>
            </div>
            <button type="button" role="switch" aria-checked={c.floatingButtons} onClick={() => set({ floatingButtons: !c.floatingButtons })}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${c.floatingButtons ? "bg-emerald-500" : "bg-slate-300"}`}>
              <span className={`size-5 rounded-full bg-white shadow transition ${c.floatingButtons ? "translate-x-5.5" : "translate-x-0.5"}`} />
            </button>
          </div>
          <div className={`grid gap-4 sm:grid-cols-2 ${c.floatingButtons ? "" : "opacity-60"}`}>
            <label className="block">
              <span className="a-label">Call number</span>
              <input value={c.contactPhone} inputMode="tel" placeholder="01XXXXXXXXX" onChange={(e) => set({ contactPhone: e.target.value })} className="a-input font-mono" />
            </label>
            <label className="block">
              <span className="a-label">WhatsApp (with 880)</span>
              <input value={c.whatsapp} inputMode="tel" placeholder="8801XXXXXXXXX" onChange={(e) => set({ whatsapp: e.target.value })} className="a-input font-mono" />
            </label>
          </div>
        </section>
      </div>

      <div className="min-w-0 space-y-6">
        <section className="a-card p-5">
          <h2 className="mb-3 text-sm font-medium text-slate-900">Preview</h2>
          <div className="relative h-56 overflow-hidden rounded-xl bg-linear-to-b from-[#8df28d] via-[#c9f7c9] to-[#f3f6f9]">
            <div className="absolute inset-x-4 top-4 space-y-2">
              <div className="h-16 rounded bg-white/90" />
              <div className="mx-auto h-3 w-2/3 rounded bg-slate-400/50" />
              <div className="mx-auto h-7 w-24 rounded-lg bg-[#e8232a]" />
            </div>
            {c.floatingButtons && (c.whatsapp || c.contactPhone) && (
              <div className="absolute bottom-3 right-3 flex flex-col gap-2">
                {c.whatsapp && <span className="grid size-9 place-items-center rounded-full bg-[#25d366] text-white shadow"><WhatsappIcon className="size-5" /></span>}
                {c.contactPhone && <span className="grid size-9 place-items-center rounded-full bg-[#e11d48] text-white shadow"><PhoneIcon className="size-4" /></span>}
              </div>
            )}
            <p className="absolute inset-x-0 bottom-0 bg-[#f3f6f9] py-1.5 text-center text-[10px] font-semibold text-slate-500">© 2026 {c.footerName}. All rights reserved.</p>
          </div>
        </section>
        <div className="space-y-3 xl:sticky xl:top-24">
          <FormAlert error={state.error} message={state.message} />
          <SubmitButton className="a-btn w-full py-2.5" pendingText="Saving…">Save landing settings</SubmitButton>
        </div>
      </div>
    </form>
  );
}
