"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { initialState, type ActionState } from "@/lib/action-state";
import { FieldError, FormAlert, SubmitButton } from "@/components/form-bits";
import { EyeIcon, PlusIcon, TrashIcon } from "@/components/icons";

export type LandingPixelRow = { id: string; label: string; hasToken: boolean; tokenHint: string };
type Mode = "main" | "own" | "both";
type EditRow = LandingPixelRow & { token: string; removeToken: boolean; showToken: boolean; key: number };

const noAutofill = { autoComplete: "off", spellCheck: false, "data-1p-ignore": "true", "data-lpignore": "true", "data-form-type": "other" } as const;
let nextKey = 1;
const blank = (): EditRow => ({ id: "", label: "", hasToken: false, tokenHint: "", token: "", removeToken: false, showToken: false, key: nextKey++ });

const MODES: { value: Mode; title: string; text: string }[] = [
  { value: "main", title: "Use the main site pixels", text: "Same pixels as the shop (Facebook Pixel page)." },
  { value: "own", title: "Only this page's own pixels", text: "Events from this page and its orders go only to the pixels below — e.g. a separate ad account." },
  { value: "both", title: "Own pixels + main site pixels", text: "Every event goes to both, de-duplicated by event ID." },
];

/**
 * "Pixel & CAPI" tab of a landing page or a content page: which Facebook pixels the page reports to.
 * Tokens are write-only (never sent back to the browser). `target` names the page for the save action.
 */
export function PixelScopeForm({ save, target, kind = "landing page", mode: initialMode, pixels, mainPixels, maxPixels, capiOn }: {
  save: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  target: { name: string; value: string | number };
  kind?: string;
  mode: Mode; pixels: LandingPixelRow[]; mainPixels: string[]; maxPixels: number; capiOn: boolean;
}) {
  const [state, action] = useActionState(save, initialState);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [rows, setRows] = useState<EditRow[]>(() => (pixels.length ? pixels.map((p) => ({ ...p, token: "", removeToken: false, showToken: false, key: nextKey++ })) : [blank()]));
  const update = (key: number, patch: Partial<EditRow>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const fe = state.fieldErrors ?? {};
  const payload = JSON.stringify(rows.map((r) => ({ id: r.id, label: r.label, token: r.token, removeToken: r.removeToken })));

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name={target.name} value={target.value} />
      <input type="hidden" name="pixels" value={payload} />
      <input type="hidden" name="mode" value={mode} />

      <section className="a-card space-y-3 p-5">
        <div>
          <h2 className="font-medium text-slate-900">Which Facebook pixels does this {kind} use?</h2>
          <p className="mt-1 text-sm text-slate-500">
            {kind === "landing page"
              ? "Applies to the page itself, its thank-you page and its orders (Purchase, Delivered, Cancelled — browser and Conversions API)."
              : "Applies to every visit of this page — PageView and the other page events, in the browser and through the Conversions API (server)."}
            Events, purchase timing and the Conversions API switch are shared settings on the <Link href="/admin/pixel" className="font-medium text-brand-700 underline">Facebook Pixel</Link> page.
          </p>
        </div>
        <div className="grid gap-2 md:grid-cols-3" role="radiogroup">
          {MODES.map((m) => (
            <button key={m.value} type="button" role="radio" aria-checked={mode === m.value} onClick={() => setMode(m.value)}
              className={`rounded-xl border-2 p-3 text-left transition ${mode === m.value ? "border-brand-500 bg-brand-50/60" : "border-slate-200 hover:bg-slate-50"}`}>
              <span className="block text-sm font-semibold text-slate-900">{m.title}</span>
              <span className="mt-0.5 block text-xs text-slate-500">{m.text}</span>
            </button>
          ))}
        </div>
        {mode !== "own" && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Main site pixels: {mainPixels.length ? <span className="font-mono">{mainPixels.join(", ")}</span> : <span className="text-amber-700">none set yet</span>}
          </p>
        )}
        {!capiOn && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">The Conversions API switch is off on the Facebook Pixel page — only the browser pixel will run until it is turned on.</p>}
      </section>

      {mode !== "main" && (
        <section className="a-card p-5">
          <h2 className="font-medium text-slate-900">This page&apos;s pixels</h2>
          <p className="mt-1 text-sm text-slate-500">Events Manager → Data sources → your dataset. Add the access token to send server (Conversions API) events too.</p>
          <div className="mt-4 space-y-3">
            {rows.map((r, i) => (
              <div key={r.key} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pixel {i + 1}</p>
                  {rows.length > 1 && (
                    <button type="button" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} aria-label="Remove pixel"
                      className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><TrashIcon className="size-4" /></button>
                  )}
                </div>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="a-label">Pixel / Dataset ID</span>
                    <input value={r.id} onChange={(e) => update(r.key, { id: e.target.value.replace(/[^\d]/g, "") })} inputMode="numeric"
                      placeholder="123456789012345" className="a-input font-mono" aria-invalid={!!fe[`pixel_${i}`]} {...noAutofill} />
                  </label>
                  <label className="block">
                    <span className="a-label">Label (optional)</span>
                    <input value={r.label} onChange={(e) => update(r.key, { label: e.target.value })} placeholder="e.g. Dentocare ad account" className="a-input" {...noAutofill} />
                  </label>
                </div>
                <label className="mt-3 block">
                  <span className="a-label">
                    Conversions API access token{" "}
                    {r.hasToken && !r.removeToken && <span className="text-emerald-600">— saved ({r.tokenHint}), leave empty to keep</span>}
                  </span>
                  <div className="relative">
                    <input value={r.token} onChange={(e) => update(r.key, { token: e.target.value.trim() })} disabled={r.removeToken}
                      placeholder={r.hasToken ? "•••••••• (unchanged)" : "Settings → Conversions API → Generate access token"}
                      className={`a-input pr-10 font-mono ${r.showToken ? "" : "[-webkit-text-security:disc]"}`} {...noAutofill} />
                    <button type="button" onClick={() => update(r.key, { showToken: !r.showToken })} aria-label={r.showToken ? "Hide token" : "Show token"}
                      className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                      <EyeIcon className="size-4" />
                    </button>
                  </div>
                </label>
                {r.hasToken && (
                  <label className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                    <input type="checkbox" checked={r.removeToken} onChange={(e) => update(r.key, { removeToken: e.target.checked, token: "" })} className="size-3.5 accent-rose-600" />
                    Remove the saved token (this pixel becomes browser-only)
                  </label>
                )}
                <FieldError message={fe[`pixel_${i}`]} />
              </div>
            ))}
          </div>
          <FieldError message={fe.pixels} />
          {rows.length < maxPixels && (
            <button type="button" onClick={() => setRows((rs) => [...rs, blank()])} className="a-btn-outline mt-3 py-1.5">
              <PlusIcon className="size-4" /> Add another pixel
            </button>
          )}
        </section>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="flex-1"><FormAlert error={state.error} message={state.message} /></div>
        <SubmitButton pendingText="Saving…">Save pixel settings</SubmitButton>
      </div>
    </form>
  );
}
