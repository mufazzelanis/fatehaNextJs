"use client";

import { useActionState, useState, type ReactNode } from "react";
import { saveCheckoutConfig } from "@/app/actions/admin";
import { initialState } from "@/lib/action-state";
import { defaultCheckout, MAX_CUSTOM_FIELDS, MAX_ZONES, type CheckoutConfig, type CustomField, type ShippingZone } from "@/lib/checkout";
import { CheckoutForm } from "@/components/landing/checkout-form";
import { FormAlert, SubmitButton } from "@/components/form-bits";
import { ChevronDownIcon, EyeIcon, PlusIcon, TrashIcon } from "@/components/icons";

type ProductPreview = { id: number; name: string; weight: string | null; price: number; image: string; stock: number };

function Section({ title, hint, children, open = false }: { title: string; hint?: string; children: ReactNode; open?: boolean }) {
  return (
    <details open={open} className="a-card group overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-slate-900">{title}</p>
          {hint && <p className="text-xs text-slate-500">{hint}</p>}
        </div>
        <ChevronDownIcon className="size-5 text-slate-400 transition group-open:rotate-180" />
      </summary>
      <div className="space-y-4 border-t border-slate-100 p-5">{children}</div>
    </details>
  );
}

function Text({ label, value, onChange, hint, rows }: { label: string; value: string; onChange: (v: string) => void; hint?: string; rows?: number }) {
  return (
    <label className="block">
      <span className="a-label">{label}</span>
      {rows ? (
        <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} className="a-input font-sans" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className="a-input font-sans" />
      )}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

function Switch({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 transition hover:bg-slate-50">
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition ${checked ? "bg-brand-600" : "bg-slate-300"}`}>
        <span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${checked ? "left-4.5" : "left-0.5"}`} />
      </button>
      <span className="text-sm">
        <span className="font-medium text-slate-900">{label}</span>
        {hint && <span className="block text-slate-500">{hint}</span>}
      </span>
    </label>
  );
}

const move = <T,>(list: T[], i: number, d: number) => {
  const next = [...list];
  [next[i], next[i + d]] = [next[i + d], next[i]];
  return next;
};

function RowButtons({ i, n, onMove, onRemove }: { i: number; n: number; onMove: (d: number) => void; onRemove: () => void }) {
  const cls = "grid size-8 place-items-center rounded-lg text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-30";
  return (
    <div className="flex shrink-0 gap-1">
      <button type="button" className={cls} disabled={i === 0} onClick={() => onMove(-1)} aria-label="Move up">↑</button>
      <button type="button" className={cls} disabled={i === n - 1} onClick={() => onMove(1)} aria-label="Move down">↓</button>
      <button type="button" className={`${cls} text-rose-500 hover:bg-rose-50`} onClick={onRemove} aria-label="Remove"><TrashIcon className="size-4" /></button>
    </div>
  );
}

export function CheckoutEditor({ initial, product, landingId }: { initial: CheckoutConfig; product: ProductPreview; landingId: number }) {
  const [state, action] = useActionState(saveCheckoutConfig, initialState);
  const [c, setC] = useState<CheckoutConfig>(initial);
  const [dirty, setDirty] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const set = <K extends keyof CheckoutConfig>(key: K, value: CheckoutConfig[K]) => {
    setC((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };
  const setField = (key: keyof CheckoutConfig["fields"], patch: Record<string, unknown>) =>
    set("fields", { ...c.fields, [key]: { ...c.fields[key], ...patch } });
  const setZone = (i: number, patch: Partial<ShippingZone>) => set("zones", c.zones.map((z, j) => (j === i ? { ...z, ...patch } : z)));
  const setCustom = (i: number, patch: Partial<CustomField>) => set("customFields", c.customFields.map((f, j) => (j === i ? { ...f, ...patch } : f)));

  const preview = (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Live preview</span>
        {dirty
          ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">Showing unsaved changes</span>
          : <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">Same as live site</span>}
      </div>
      {/* Preview never submits; key forces a fresh form when zones change */}
      <CheckoutForm key={c.zones.map((z) => z.id).join() + c.defaultZone} product={product} config={c} preview />
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-6 pb-36 lg:pb-24 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="space-y-4">
        {/* The preview is its own <form>, so it must live outside this one (forms can't nest). */}
        <form action={action} onSubmit={() => setDirty(false)} className="space-y-4">
          <input type="hidden" name="landing_id" value={landingId} />
          <input type="hidden" name="config" value={JSON.stringify(c)} />
          <Section title="Customer fields" hint="Name, address and phone are always required for cash on delivery" open>
            <Text label="Section title" value={c.billingTitle} onChange={(v) => set("billingTitle", v)} />
            {(["name", "address", "phone"] as const).map((k) => (
              <div key={k} className="grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-2">
                <Text label={`${k[0].toUpperCase()}${k.slice(1)} — label`} value={c.fields[k].label} onChange={(v) => setField(k, { label: v })} />
                <Text label="Placeholder (shown inside the box)" value={c.fields[k].placeholder} onChange={(v) => setField(k, { placeholder: v })} />
              </div>
            ))}
            <Switch checked={c.fields.note.enabled} onChange={(v) => setField("note", { enabled: v })} label="Show the order note box" hint="Optional message from the customer" />
            {c.fields.note.enabled && (
              <Text label="Note placeholder" value={c.fields.note.placeholder} onChange={(v) => setField("note", { placeholder: v })} />
            )}
          </Section>

          <Section title="Extra fields" hint={`${c.customFields.length}/${MAX_CUSTOM_FIELDS} — e.g. alternative phone, preferred delivery time`}>
            {c.customFields.length === 0 && <p className="text-sm text-slate-400">No extra fields. Answers are saved with each order and shown to staff.</p>}
            {c.customFields.map((f, i) => (
              <div key={f.id} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Field {i + 1}</span>
                  <RowButtons i={i} n={c.customFields.length} onMove={(d) => set("customFields", move(c.customFields, i, d))}
                    onRemove={() => set("customFields", c.customFields.filter((_, j) => j !== i))} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Text label="Label" value={f.label} onChange={(v) => setCustom(i, { label: v })} />
                  <Text label="Placeholder" value={f.placeholder} onChange={(v) => setCustom(i, { placeholder: v })} />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <select value={f.type} onChange={(e) => setCustom(i, { type: e.target.value as CustomField["type"] })} className="a-input w-auto">
                    <option value="text">Short text</option>
                    <option value="textarea">Long text</option>
                    <option value="select">Dropdown</option>
                  </select>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={f.required} onChange={(e) => setCustom(i, { required: e.target.checked })} className="size-4 accent-brand-700" /> Required
                  </label>
                </div>
                {f.type === "select" && (
                  <Text label="Dropdown options (one per line)" rows={3} value={f.options.join("\n")}
                    onChange={(v) => setCustom(i, { options: v.split("\n") })} hint="Empty lines are ignored" />
                )}
              </div>
            ))}
            {c.customFields.length < MAX_CUSTOM_FIELDS && (
              <button type="button" className="a-btn-outline py-1.5"
                onClick={() => set("customFields", [...c.customFields, { id: `field-${Date.now()}`, label: "", placeholder: "", type: "text", options: [], required: false }])}>
                <PlusIcon className="size-4" /> Add field
              </button>
            )}
          </Section>

          <Section title="Delivery zones & charges" hint={`${c.zones.length}/${MAX_ZONES} zones — the charge is added to the order total`} open>
            <Text label="Section title" value={c.shippingTitle} onChange={(v) => set("shippingTitle", v)} />
            {c.zones.map((z, i) => (
              <div key={z.id} className="flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-3">
                <label className="block min-w-40 flex-1"><span className="a-label">Zone name</span>
                  <input value={z.label} onChange={(e) => setZone(i, { label: e.target.value })} placeholder="e.g. Dhaka city" className="a-input font-sans" /></label>
                <label className="block w-28"><span className="a-label">Charge (৳)</span>
                  <input type="number" min={0} value={z.charge} onChange={(e) => setZone(i, { charge: Number(e.target.value) })} className="a-input" /></label>
                <label className="flex items-center gap-1.5 pb-2 text-xs text-slate-600">
                  <input type="radio" name="default_zone_ui" checked={c.defaultZone === z.id} onChange={() => set("defaultZone", z.id)} className="accent-brand-700" /> Default
                </label>
                <RowButtons i={i} n={c.zones.length} onMove={(d) => set("zones", move(c.zones, i, d))}
                  onRemove={() => c.zones.length > 1 && set("zones", c.zones.filter((_, j) => j !== i))} />
              </div>
            ))}
            {c.zones.length < MAX_ZONES && (
              <button type="button" className="a-btn-outline py-1.5" onClick={() => set("zones", [...c.zones, { id: `zone-${Date.now()}`, label: "", charge: 0 }])}>
                <PlusIcon className="size-4" /> Add zone
              </button>
            )}
            <p className="text-xs text-slate-400">Existing orders keep the zone name and charge they were placed with.</p>
          </Section>

          <Section title="Product & quantity">
            <Text label="Section title" value={c.productsTitle} onChange={(v) => set("productsTitle", v)} />
            <Switch checked={c.allowQuantity} onChange={(v) => set("allowQuantity", v)} label="Let customers change the quantity" hint="Off = always 1 per order" />
            {c.allowQuantity && (
              <label className="block w-40"><span className="a-label">Maximum per order</span>
                <input type="number" min={1} max={50} value={c.maxQuantity} onChange={(e) => set("maxQuantity", Number(e.target.value))} className="a-input" /></label>
            )}
          </Section>

          <Section title="Order summary, payment & privacy">
            <Text label="Order summary title" value={c.orderTitle} onChange={(v) => set("orderTitle", v)} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Text label="Payment method title" value={c.paymentTitle} onChange={(v) => set("paymentTitle", v)} />
              <Text label="Payment description" value={c.paymentText} onChange={(v) => set("paymentText", v)} />
            </div>
            <Text label="Privacy note (leave empty to hide)" rows={3} value={c.privacyText} onChange={(v) => set("privacyText", v)} />
          </Section>

          <Section title="Order button" open>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <Text label="Button text" value={c.buttonText} onChange={(v) => set("buttonText", v)} />
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 p-2">
                <input type="color" value={c.buttonColor} onChange={(e) => set("buttonColor", e.target.value)} className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0" />
                <code className="text-xs text-slate-500">{c.buttonColor}</code>
              </label>
            </div>
            <Switch checked={c.showTotalOnButton} onChange={(v) => set("showTotalOnButton", v)} label="Show the total on the button" hint="e.g. “অর্ডার কনফার্ম করুন 850.00৳”" />
          </Section>

          {renderSaveBar()}
        </form>
        <div className="2xl:hidden">
          <button type="button" onClick={() => setShowPreview((s) => !s)} className="a-btn-outline w-full">
            <EyeIcon className="size-4" /> {showPreview ? "Hide preview" : "Show live preview"}
          </button>
          {showPreview && <div className="mt-4">{preview}</div>}
        </div>
      </div>

      <div className="hidden 2xl:block">
        <div className="sticky top-24">{preview}</div>
      </div>
    </div>
  );

  function renderSaveBar() {
    return (
      <div className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-30 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgb(15_23_42/0.06)] backdrop-blur lg:bottom-0 lg:left-64">
        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="mr-auto min-w-0 flex-1">
            {dirty ? <span className="text-sm text-amber-700">Unsaved changes — the preview shows them already</span> : <FormAlert error={state.error} message={state.message} />}
          </div>
          {confirmReset ? (
            <span className="flex items-center gap-2 text-sm">
              <span className="text-rose-700">Reset everything?</span>
              <button type="submit" name="reset" value="1" onClick={() => { setC(defaultCheckout()); setConfirmReset(false); }}
                className="rounded-lg bg-rose-600 px-3 py-2 font-medium text-white hover:bg-rose-700">Yes, reset</button>
              <button type="button" onClick={() => setConfirmReset(false)} className="a-btn-outline">Cancel</button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmReset(true)} className="a-btn-outline">Reset to defaults</button>
          )}
          <SubmitButton pendingText="Saving…">Save checkout</SubmitButton>
        </div>
      </div>
    );
  }
}
