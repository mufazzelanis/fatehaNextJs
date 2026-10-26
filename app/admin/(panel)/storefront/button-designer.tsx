"use client";

import { useState } from "react";
import { contrastRatio, DEFAULT_BUTTONS, hexToRgb, parseColor, type ButtonLayout, type ButtonStyle, type StoreButtons } from "@/lib/store-config";
import { ProductCard, type CardProduct } from "@/components/store/product-card";
import { StoreUIProvider } from "@/components/store/store-ui";
import { AlertIcon, RefreshIcon } from "@/components/icons";

const LAYOUTS: { key: ButtonLayout; title: string; text: string }[] = [
  { key: "icon-order", title: "Cart icon + Order now", text: "Small cart icon, big order button" },
  { key: "both", title: "Two full buttons", text: "Add to cart above Order now" },
  { key: "order-only", title: "Order now only", text: "One tap straight to checkout" },
  { key: "cart-only", title: "Add to cart only", text: "Classic shop button" },
];
const SHAPES: { key: StoreButtons["shape"]; label: string; cls: string }[] = [
  { key: "square", label: "Sharp", cls: "rounded-md" },
  { key: "rounded", label: "Rounded", cls: "rounded-xl" },
  { key: "pill", label: "Pill", cls: "rounded-full" },
];
const PRESETS = ["#12b3b8", "#0f7279", "#edfdfd", "#2d2e32", "#ffffff", "#f97316", "#e11d48", "#16a34a", "#2563eb", "#7c3aed", "#facc15", "#e2136e"];
const THEMES: { name: string; cart: Omit<ButtonStyle, "label">; order: Omit<ButtonStyle, "label"> }[] = [
  { name: "FatehaBD teal", cart: { bg: "#edfdfd", text: "#0f7279" }, order: { bg: "#12b3b8", text: "#ffffff" } },
  { name: "Hot orange", cart: { bg: "#fff1e6", text: "#c2410c" }, order: { bg: "#f97316", text: "#ffffff" } },
  { name: "Dark luxe", cart: { bg: "#f1f5f9", text: "#2d2e32" }, order: { bg: "#2d2e32", text: "#ffffff" } },
  { name: "Sale red", cart: { bg: "#fff1f2", text: "#be123c" }, order: { bg: "#e11d48", text: "#ffffff" } },
  { name: "Fresh green", cart: { bg: "#ecfdf5", text: "#047857" }, order: { bg: "#16a34a", text: "#ffffff" } },
];

export function ButtonDesigner({ value, onChange, sample }: { value: StoreButtons; onChange: (b: StoreButtons) => void; sample: CardProduct | null }) {
  const set = (patch: Partial<StoreButtons>) => onChange({ ...value, ...patch });
  const setBtn = (k: "cart" | "order", patch: Partial<ButtonStyle>) => onChange({ ...value, [k]: { ...value[k], ...patch } });
  const showCart = value.layout !== "order-only";
  const showOrder = value.layout !== "cart-only";

  return (
    <section className="a-card p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-medium text-slate-900">Product buttons</h2>
          <p className="mt-0.5 text-xs text-slate-500">Text, colours and layout of the buttons on every product card and product page.</p>
        </div>
        <button type="button" onClick={() => onChange(DEFAULT_BUTTONS)} className="a-btn-outline py-1.5 text-xs"><RefreshIcon className="size-3.5" /> Reset</button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_240px]">
        <div className="min-w-0 space-y-5">
          <div>
            <span className="a-label">Layout</span>
            <div className="grid grid-cols-2 gap-2">
              {LAYOUTS.map((l) => (
                <button key={l.key} type="button" onClick={() => set({ layout: l.key })} aria-pressed={value.layout === l.key}
                  className={`rounded-xl border-2 p-2.5 text-left transition ${value.layout === l.key ? "border-brand-500 bg-brand-50/50" : "border-slate-200 hover:border-slate-300"}`}>
                  <LayoutSketch layout={l.key} />
                  <span className="mt-2 block text-xs font-semibold text-slate-900">{l.title}</span>
                  <span className="block text-[11px] text-slate-500">{l.text}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="a-label">Shape</span>
            <div className="flex gap-2">
              {SHAPES.map((s) => (
                <button key={s.key} type="button" onClick={() => set({ shape: s.key })} aria-pressed={value.shape === s.key}
                  className={`flex flex-1 items-center justify-center gap-2 border-2 px-2 py-2 text-xs font-semibold transition ${s.cls} ${value.shape === s.key ? "border-brand-500 bg-brand-50/50 text-brand-800" : "border-slate-200 text-slate-600"}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="a-label">Quick themes</span>
            <div className="flex flex-wrap gap-2">
              {THEMES.map((t) => (
                <button key={t.name} type="button" onClick={() => onChange({ ...value, cart: { ...value.cart, ...t.cart }, order: { ...value.order, ...t.order } })}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-3 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                  <span className="flex"><span className="size-5 rounded-full ring-2 ring-white" style={{ background: t.cart.bg }} /><span className="-ml-1.5 size-5 rounded-full ring-2 ring-white" style={{ background: t.order.bg }} /></span>
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {showOrder && <ButtonEditor title="“Order now” button" hint="Adds the product and opens checkout" btn={value.order} onChange={(p) => setBtn("order", p)} />}
          {showCart && <ButtonEditor title="“Add to cart” button" hint={value.layout === "icon-order" ? "Shown as an icon on cards; the text is used on the product page and as the tooltip" : "Adds the product and opens the cart"} btn={value.cart} onChange={(p) => setBtn("cart", p)} />}
        </div>

        <div className="min-w-0">
          <span className="a-label">Live preview</span>
          <div className="rounded-2xl bg-[#f4f6f8] p-3 lg:sticky lg:top-24">
            <StoreUIProvider buttons={value} className="pointer-events-none select-none">
              {sample ? <ProductCard product={sample} /> : <p className="p-6 text-center text-xs text-slate-500">Add a product to see the preview.</p>}
            </StoreUIProvider>
            <p className="mt-2 text-center text-[11px] text-slate-500">Preview only — save to publish</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function LayoutSketch({ layout }: { layout: ButtonLayout }) {
  const bar = "h-3 rounded";
  return (
    <span className="block rounded-lg bg-slate-50 p-2">
      <span className="mb-1.5 block h-6 rounded bg-slate-200" />
      {layout === "icon-order" && <span className="flex gap-1"><span className={`${bar} w-3 bg-brand-200`} /><span className={`${bar} flex-1 bg-brand-500`} /></span>}
      {layout === "both" && <span className="block space-y-1"><span className={`${bar} block bg-brand-200`} /><span className={`${bar} block bg-brand-500`} /></span>}
      {layout === "order-only" && <span className={`${bar} block bg-brand-500`} />}
      {layout === "cart-only" && <span className={`${bar} block bg-brand-200`} />}
    </span>
  );
}

function ButtonEditor({ title, hint, btn, onChange }: { title: string; hint: string; btn: ButtonStyle; onChange: (p: Partial<ButtonStyle>) => void }) {
  const ratio = contrastRatio(btn.bg, btn.text);
  return (
    <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4">
      <legend className="px-1 text-sm font-semibold text-slate-900">{title}</legend>
      <p className="-mt-1 text-xs text-slate-500">{hint}</p>
      <label className="block">
        <span className="a-label">Button text</span>
        <input value={btn.label} maxLength={24} onChange={(e) => onChange({ label: e.target.value })} className="a-input" placeholder="e.g. অর্ডার করুন" />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <ColorField label="Background" value={btn.bg} onChange={(bg) => onChange({ bg })} />
        <ColorField label="Text colour" value={btn.text} onChange={(text) => onChange({ text })} />
      </div>
      {ratio < 3 && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
          <AlertIcon className="size-4 shrink-0" /> Low contrast ({ratio.toFixed(1)}:1) — the text may be hard to read.
        </p>
      )}
    </fieldset>
  );
}

/** Colour input: picker, HEX / rgb() text, R-G-B sliders and presets. */
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (hex: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const rgb = hexToRgb(value);
  const text = draft ?? value.toUpperCase();
  const invalid = draft !== null && !parseColor(draft);
  const setChannel = (ch: "r" | "g" | "b", n: number) => {
    const next = { ...rgb, [ch]: Math.max(0, Math.min(255, Math.round(n) || 0)) };
    onChange(`#${[next.r, next.g, next.b].map((x) => x.toString(16).padStart(2, "0")).join("")}`);
  };

  return (
    <div>
      <span className="a-label">{label}</span>
      <div className="flex items-center gap-2">
        <label className="relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-lg shadow-inner ring-1 ring-slate-300" style={{ background: value }} title="Pick a colour">
          <input type="color" value={value} onChange={(e) => { setDraft(null); onChange(e.target.value); }} className="absolute inset-0 size-full cursor-pointer opacity-0" aria-label={`${label} colour picker`} />
        </label>
        <input value={text} onChange={(e) => { setDraft(e.target.value); const c = parseColor(e.target.value); if (c) onChange(c); }}
          onBlur={() => setDraft(null)} aria-invalid={invalid} aria-label={`${label} HEX or RGB`} placeholder="#12B3B8 or rgb(18,179,184)"
          className="a-input min-w-0 flex-1 font-mono uppercase" />
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
          className={`shrink-0 rounded-lg border px-2 py-2 text-[11px] font-bold transition ${open ? "border-brand-400 bg-brand-50 text-brand-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>RGB</button>
      </div>
      <p className="mt-1 font-mono text-[11px] text-slate-400">rgb({rgb.r}, {rgb.g}, {rgb.b})</p>
      {open && (
        <div className="mt-2 space-y-1.5 rounded-lg bg-slate-50 p-2.5">
          {(["r", "g", "b"] as const).map((ch) => (
            <div key={ch} className="flex items-center gap-2">
              <span className={`w-3 text-xs font-bold ${ch === "r" ? "text-rose-600" : ch === "g" ? "text-emerald-600" : "text-blue-600"}`}>{ch.toUpperCase()}</span>
              <input type="range" min={0} max={255} value={rgb[ch]} onChange={(e) => setChannel(ch, Number(e.target.value))}
                className={`h-1.5 flex-1 cursor-pointer ${ch === "r" ? "accent-rose-600" : ch === "g" ? "accent-emerald-600" : "accent-blue-600"}`} aria-label={`${label} ${ch.toUpperCase()}`} />
              <input type="number" min={0} max={255} value={rgb[ch]} onChange={(e) => setChannel(ch, Number(e.target.value))}
                className="w-14 rounded-md border border-slate-200 bg-white px-1.5 py-1 text-right text-xs tabular-nums" aria-label={`${label} ${ch.toUpperCase()} value`} />
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button key={p} type="button" onClick={() => { setDraft(null); onChange(p); }} aria-label={`Use ${p}`} title={p}
            className={`size-5 rounded-full ring-1 ring-slate-300 transition hover:scale-110 ${value === p ? "ring-2 ring-brand-600 ring-offset-1" : ""}`} style={{ background: p }} />
        ))}
      </div>
    </div>
  );
}
