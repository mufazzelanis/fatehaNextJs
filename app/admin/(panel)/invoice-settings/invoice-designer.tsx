"use client";

import { useActionState, useState } from "react";
import { saveInvoiceSettings } from "@/app/actions/landings";
import { initialState } from "@/lib/action-state";
import { DEFAULT_INVOICE, type InvoiceConfig, type InvoiceProfile } from "@/lib/invoice";
import { parseColor } from "@/lib/store-config";
import { InvoiceDocument, type InvoiceData } from "@/components/invoice/invoice-document";
import { FormAlert, SubmitButton } from "@/components/form-bits";
import { ImageIcon, RefreshIcon } from "@/components/icons";

type Kind = "store" | "landing";
const KINDS: { key: Kind; title: string; text: string }[] = [
  { key: "store", title: "Main site invoice", text: "Orders from fatehabd.com shop (FB…)" },
  { key: "landing", title: "Landing page invoice", text: "Orders from every landing page" },
];
const ACCENTS = ["#12b3b8", "#087848", "#0f172a", "#2563eb", "#7c3aed", "#e11d48", "#f97316", "#ca8a04"];
const TOGGLES: { key: keyof InvoiceProfile; label: string }[] = [
  { key: "showLogo", label: "Logo" },
  { key: "showPaymentInfo", label: "Payment details" },
  { key: "showCustomerNote", label: "Customer note" },
  { key: "showExtraFields", label: "Extra checkout fields" },
  { key: "showOrderSource", label: "Order source (website / landing name)" },
  { key: "showSignature", label: "Signature line" },
];

export function InvoiceDesigner({ initial, samples }: { initial: InvoiceConfig; samples: Record<Kind, InvoiceData> }) {
  const [state, action] = useActionState(saveInvoiceSettings, initialState);
  const [c, setC] = useState(initial);
  const [kind, setKind] = useState<Kind>("store");
  const [logos, setLogos] = useState<Partial<Record<Kind, { file: File; url: string }>>>({});
  const p = c[kind];
  const set = (patch: Partial<InvoiceProfile>) => setC((x) => ({ ...x, [kind]: { ...x[kind], ...patch } }));
  const previewProfile = logos[kind] ? { ...p, logo: "" } : p;

  function submit(fd: FormData) {
    for (const k of ["store", "landing"] as const) if (logos[k]) fd.set(`logo_${k}`, logos[k]!.file);
    fd.set("config", JSON.stringify(c));
    return action(fd);
  }

  const text = (key: keyof InvoiceProfile, label: string, opts: { max?: number; placeholder?: string; area?: boolean } = {}) => (
    <label className="block">
      <span className="a-label">{label}</span>
      {opts.area ? (
        <textarea value={p[key] as string} rows={3} maxLength={opts.max} placeholder={opts.placeholder} onChange={(e) => set({ [key]: e.target.value })} className="a-input font-sans" />
      ) : (
        <input value={p[key] as string} maxLength={opts.max} placeholder={opts.placeholder} onChange={(e) => set({ [key]: e.target.value })} className="a-input font-sans" />
      )}
    </label>
  );

  return (
    <form action={submit} className="grid grid-cols-1 gap-6 xl:grid-cols-[400px_1fr] 2xl:grid-cols-[440px_1fr]">
      <div className="min-w-0 space-y-5">
        <div className="grid grid-cols-2 gap-2">
          {KINDS.map((k) => (
            <button key={k.key} type="button" onClick={() => setKind(k.key)} aria-pressed={kind === k.key}
              className={`rounded-xl border-2 p-3 text-left transition ${kind === k.key ? "border-brand-500 bg-brand-50/50" : "border-slate-200 bg-white hover:border-slate-300"}`}>
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-900"><span className="size-3 rounded-full" style={{ background: c[k.key].accent }} />{k.title}</span>
              <span className="mt-0.5 block text-xs text-slate-500">{k.text}</span>
            </button>
          ))}
        </div>

        <section className="a-card space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-slate-900">Company</h2>
            <button type="button" onClick={() => { setC((x) => ({ ...x, [kind]: DEFAULT_INVOICE[kind] })); setLogos((l) => ({ ...l, [kind]: undefined })); }}
              className="a-btn-outline py-1 text-xs"><RefreshIcon className="size-3.5" /> Reset this design</button>
          </div>
          {text("companyName", "Company name", { max: 120 })}
          {kind === "landing" && <p className="-mt-2 text-xs text-slate-400">A landing page can override this with its own “Name on the invoice”.</p>}
          {text("tagline", "Tagline", { max: 160 })}
          {text("address", "Address", { max: 300 })}
          <div className="grid gap-3 sm:grid-cols-3">
            {text("phone", "Phone", { max: 40 })}
            {text("email", "Email", { max: 120 })}
            {text("website", "Website", { max: 120 })}
          </div>
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-24 place-items-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50">
              {logos[kind] || p.logo || kind === "store" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logos[kind]?.url ?? (p.logo ? `/media/${p.logo}` : "/brand/fatehabd-logo.webp")} alt="" className="max-h-10 max-w-20 object-contain" />
              ) : <ImageIcon className="size-5 text-slate-400" />}
            </div>
            <label className="a-btn-outline cursor-pointer">
              Upload logo
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) setLogos((l) => ({ ...l, [kind]: { file: f, url: URL.createObjectURL(f) } })); }} />
            </label>
            {(p.logo || logos[kind]) && (
              <button type="button" className="text-xs text-rose-600 hover:underline" onClick={() => { set({ logo: "" }); setLogos((l) => ({ ...l, [kind]: undefined })); }}>Remove</button>
            )}
          </div>
        </section>

        <section className="a-card space-y-4 p-5">
          <h2 className="font-medium text-slate-900">Look</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {text("title", "Invoice title", { max: 40, placeholder: "Invoice / চালান" })}
            <label className="block">
              <span className="a-label">Language of labels</span>
              <select value={p.lang} onChange={(e) => set({ lang: e.target.value as InvoiceProfile["lang"] })} className="a-input">
                <option value="en">English</option>
                <option value="bn">বাংলা</option>
              </select>
            </label>
          </div>
          <div>
            <span className="a-label">Paper</span>
            <div className="grid grid-cols-3 gap-2">
              {([["a4", "A4", "Standard printer"], ["a5", "A5", "Half page"], ["pos80", "80mm", "Thermal / POS"]] as const).map(([k, t, s]) => (
                <button key={k} type="button" onClick={() => set({ paper: k })} aria-pressed={p.paper === k}
                  className={`rounded-xl border-2 px-2 py-2 text-center transition ${p.paper === k ? "border-brand-500 bg-brand-50/50" : "border-slate-200 hover:border-slate-300"}`}>
                  <span className="block text-sm font-semibold text-slate-900">{t}</span>
                  <span className="block text-[11px] text-slate-500">{s}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="a-label">Accent colour</span>
            <div className="flex flex-wrap items-center gap-2">
              {ACCENTS.map((a) => (
                <button key={a} type="button" onClick={() => set({ accent: a })} aria-label={a}
                  className={`size-7 rounded-full ring-1 ring-slate-300 transition hover:scale-110 ${p.accent === a ? "ring-2 ring-brand-600 ring-offset-2" : ""}`} style={{ background: a }} />
              ))}
              <label className="relative size-7 cursor-pointer overflow-hidden rounded-full ring-1 ring-slate-300" style={{ background: p.accent }} title="Custom colour">
                <input type="color" value={p.accent} onChange={(e) => set({ accent: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" />
              </label>
              <input defaultValue={p.accent.toUpperCase()} key={`${kind}${p.accent}`} onBlur={(e) => { const v = parseColor(e.target.value); if (v) set({ accent: v }); }}
                className="a-input w-32 font-mono uppercase" aria-label="HEX or rgb()" />
            </div>
          </div>
        </section>

        <section className="a-card space-y-3 p-5">
          <h2 className="font-medium text-slate-900">Show on the invoice</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {TOGGLES.map((t) => (
              <label key={t.key} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2 text-sm has-checked:border-brand-300 has-checked:bg-brand-50/40">
                <input type="checkbox" checked={p[t.key] as boolean} onChange={(e) => set({ [t.key]: e.target.checked })} className="size-4 accent-brand-700" />
                {t.label}
              </label>
            ))}
          </div>
          {text("footerNote", "Thank-you line", { max: 300 })}
          {text("terms", "Terms / return policy (small print)", { max: 1000, area: true })}
        </section>

        <div className="space-y-3">
          <FormAlert error={state.error} message={state.message} />
          <SubmitButton className="a-btn w-full py-2.5" pendingText="Saving…">Save both invoice designs</SubmitButton>
        </div>
      </div>

      <div className="min-w-0">
        <div className="sticky top-24">
          <p className="mb-2 text-xs font-medium text-slate-500">Live preview — {kind === "store" ? "main site order" : "landing order"} · {p.paper.toUpperCase()}</p>
          <div className="max-h-[calc(100vh-8rem)] overflow-auto rounded-2xl bg-slate-200/70 p-4">
            <div className={p.paper === "a4" ? "xl:[zoom:0.78] 2xl:[zoom:1]" : ""}>
            <InvoiceDocument profile={previewProfile} data={samples[kind]} defaultLogo={logos[kind]?.url ?? (kind === "store" ? "/brand/fatehabd-logo.webp" : null)} />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
