"use client";

import { useActionState, useState } from "react";
import { retryFailed, saveMarketingSettings, sendTestEvent, verifyConnection, type VerifyState } from "@/app/actions/marketing";
import { initialState } from "@/lib/action-state";
import { EVENT_INFO, EVENT_NAMES, type EventName } from "@/lib/meta/shared";
import { FieldError, FormAlert, SubmitButton } from "@/components/form-bits";
import { CheckCircleIcon, AlertIcon, EyeIcon, PlusIcon, TrashIcon } from "@/components/icons";

export type PixelRow = { id: string; label: string; hasToken: boolean; tokenHint: string };

type Settings = {
  pixels: PixelRow[];
  browserEnabled: boolean;
  capiSwitch: boolean;
  testEventCode: string;
  apiVersion: string;
  purchaseTrigger: "placed" | "confirmed" | "delivered";
  purchaseValue: "total" | "subtotal";
  serverPageView: boolean;
  events: Record<EventName, boolean>;
  maxPixels: number;
};

type EditRow = PixelRow & { token: string; removeToken: boolean; showToken: boolean; key: number };

// Stop browsers and password managers from treating these fields as a login form.
const noAutofill = { autoComplete: "off", spellCheck: false, "data-1p-ignore": "true", "data-lpignore": "true", "data-form-type": "other" } as const;

function Check({ name, defaultChecked, title, text }: { name: string; defaultChecked: boolean; title: string; text: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 transition hover:bg-slate-50 has-[:checked]:border-brand-300 has-[:checked]:bg-brand-50/40">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 size-4 accent-brand-700" />
      <span className="text-sm">
        <span className="font-medium text-slate-900">{title}</span>
        <span className="block text-slate-500">{text}</span>
      </span>
    </label>
  );
}

function Choice({ name, value, checked, title, text }: { name: string; value: string; checked: boolean; title: string; text: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 transition hover:bg-slate-50 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50/60">
      <input type="radio" name={name} value={value} defaultChecked={checked} className="mt-0.5 size-4 accent-brand-700" />
      <span className="text-sm">
        <span className="font-medium text-slate-900">{title}</span>
        <span className="block text-slate-500">{text}</span>
      </span>
    </label>
  );
}

let nextKey = 1;

export function PixelSettingsForm({ settings }: { settings: Settings }) {
  const [state, action] = useActionState(saveMarketingSettings, initialState);
  const [rows, setRows] = useState<EditRow[]>(() =>
    (settings.pixels.length ? settings.pixels : [{ id: "", label: "", hasToken: false, tokenHint: "" }]).map((p) => ({
      ...p, token: "", removeToken: false, showToken: false, key: nextKey++,
    })),
  );
  const fe = state.fieldErrors ?? {};
  const update = (key: number, patch: Partial<EditRow>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const payload = JSON.stringify(rows.map((r) => ({ id: r.id, label: r.label, token: r.token, removeToken: r.removeToken })));

  return (
    <form action={action} className="space-y-6" autoComplete="off">
      <input type="hidden" name="pixels" value={payload} />

      <section className="a-card p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-medium text-slate-900">Pixels</h2>
            <p className="text-xs text-slate-500">Events Manager → Data sources → your dataset. Add backup pixels from other ad accounts too — every event goes to all of them.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{rows.length}/{settings.maxPixels}</span>
        </div>

        <div className="space-y-3">
          {rows.map((r, i) => (
            <div key={r.key} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pixel {i + 1}{i === 0 ? " · primary" : ""}</span>
                {rows.length > 1 && (
                  <button type="button" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-rose-600 hover:bg-rose-50">
                    <TrashIcon className="size-3.5" /> Remove
                  </button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-[1.2fr_1fr]">
                <label className="block">
                  <span className="a-label">Pixel / Dataset ID</span>
                  <input value={r.id} onChange={(e) => update(r.key, { id: e.target.value.replace(/[^\d]/g, "") })}
                    inputMode="numeric" placeholder="123456789012345" className="a-input font-mono" aria-invalid={!!fe[`pixel_${i}`]} {...noAutofill} />
                </label>
                <label className="block">
                  <span className="a-label">Label (optional)</span>
                  <input value={r.label} onChange={(e) => update(r.key, { label: e.target.value })} placeholder="e.g. Main ad account" className="a-input" {...noAutofill} />
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
        {rows.length < settings.maxPixels && (
          <button type="button" onClick={() => setRows((rs) => [...rs, { id: "", label: "", hasToken: false, tokenHint: "", token: "", removeToken: false, showToken: false, key: nextKey++ }])}
            className="a-btn-outline mt-3 py-1.5">
            <PlusIcon className="size-4" /> Add another pixel
          </button>
        )}
      </section>

      <section className="a-card space-y-3 p-5">
        <h2 className="font-medium text-slate-900">Tracking channels</h2>
        <Check name="fb_browser_enabled" defaultChecked={settings.browserEnabled} title="Browser pixel"
          text="Loads fbevents.js on public pages (never on the admin panel)." />
        <Check name="fb_capi_enabled" defaultChecked={settings.capiSwitch} title="Conversions API (server-side)"
          text="Sends every event from the server too — recovers events lost to ad blockers and iOS, improves match quality." />
        <FieldError message={fe.capi} />
        <Check name="fb_server_pageview" defaultChecked={settings.serverPageView} title="Also send PageView from the server"
          text="More complete data. Turn off to save server requests on high traffic." />
        <div className="grid gap-4 pt-1 sm:grid-cols-2">
          <label className="block">
            <span className="a-label">Test Event Code (optional)</span>
            <input name="fb_test_event_code" defaultValue={settings.testEventCode} placeholder="TEST12345" className="a-input font-mono" {...noAutofill} />
            <span className="mt-1 block text-xs text-slate-400">Only while testing — remove it before running ads.</span>
          </label>
          <label className="block">
            <span className="a-label">Graph API version</span>
            <input name="fb_api_version" defaultValue={settings.apiVersion} placeholder="v23.0" className="a-input font-mono" aria-invalid={!!fe.fb_api_version} {...noAutofill} />
            <FieldError message={fe.fb_api_version} />
          </label>
        </div>
      </section>

      <section className="a-card p-5">
        <h2 className="font-medium text-slate-900">Events</h2>
        <p className="mb-3 text-xs text-slate-500">Turn individual events on or off for both the browser and the server.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {EVENT_NAMES.map((e) => (
            <Check key={e} name={`event_${e}`} defaultChecked={settings.events[e]} title={e} text={EVENT_INFO[e]} />
          ))}
        </div>
      </section>

      <section className="a-card space-y-3 p-5">
        <div>
          <h2 className="font-medium text-slate-900">Purchase</h2>
          <p className="text-xs text-slate-500">Cash-on-delivery stores often get fake orders — reporting later keeps your ad optimisation clean.</p>
        </div>
        <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Report a Purchase…</p>
        <Choice name="fb_purchase_trigger" value="placed" checked={settings.purchaseTrigger === "placed"} title="When the order is placed"
          text="Counts every order right away. Browser + server Purchase, deduplicated. Fastest learning." />
        <Choice name="fb_purchase_trigger" value="confirmed" checked={settings.purchaseTrigger === "confirmed"} title="When you confirm the order"
          text="Fake/unreachable orders are never reported. Sent from the server when the status becomes Confirmed (or later)." />
        <Choice name="fb_purchase_trigger" value="delivered" checked={settings.purchaseTrigger === "delivered"} title="When the order is delivered"
          text="Only real, paid sales optimise your ads. Slower feedback to Meta." />
        <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Purchase value</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Choice name="fb_purchase_value" value="total" checked={settings.purchaseValue === "total"} title="Order total" text="Products + delivery charge − discount" />
          <Choice name="fb_purchase_value" value="subtotal" checked={settings.purchaseValue === "subtotal"} title="Products only" text="Excludes the delivery charge — truer ROAS" />
        </div>
      </section>

      <div className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-10 lg:bottom-3 -mx-1 flex flex-wrap items-center justify-end gap-3 rounded-xl border border-slate-200 bg-white/90 px-4 py-3 shadow-lg backdrop-blur">
        <div className="min-w-0 flex-1"><FormAlert error={state.error} message={state.message} /></div>
        <SubmitButton pendingText="Saving…">Save pixel settings</SubmitButton>
      </div>
    </form>
  );
}

export function VerifyPanel({ disabled }: { disabled: boolean }) {
  const [state, action, pending] = useActionState<VerifyState>(verifyConnection, {});
  return (
    <section className="a-card p-5">
      <h2 className="font-medium text-slate-900">Connection check</h2>
      <p className="mb-3 mt-1 text-xs text-slate-500">Asks Facebook whether each pixel and token work, and when the pixel last received an event.</p>
      <form action={action}>
        <button type="submit" disabled={disabled || pending} className="a-btn-outline w-full">
          {pending ? "Checking…" : "Verify connection"}
        </button>
      </form>
      {disabled && <p className="mt-2 text-xs text-slate-400">Save a pixel first.</p>}
      {state.error && <p className="mt-3 text-sm text-rose-600">{state.error}</p>}
      {state.checks && (
        <ul className="mt-3 space-y-2">
          {state.checks.map((c) => (
            <li key={c.id} className={`rounded-lg border p-3 text-sm ${c.ok ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
              <p className="flex items-center gap-2 font-medium text-slate-900">
                {c.ok ? <CheckCircleIcon className="size-4 text-emerald-600" /> : <AlertIcon className="size-4 text-rose-600" />}
                {c.name ?? c.label ?? "Pixel"} <span className="font-mono text-xs font-normal text-slate-500">{c.id}</span>
              </p>
              <p className={`mt-0.5 text-xs ${c.ok ? "text-emerald-800" : "text-rose-700"}`}>{c.message}</p>
              {c.ok && (
                <p className="mt-0.5 text-xs text-slate-500">
                  Last event received: {c.lastFired ? new Date(c.lastFired).toLocaleString("en-GB", { timeZone: "Asia/Dhaka" }) : "never"}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function TestEventForm({ defaultCode, disabled }: { defaultCode: string; disabled: boolean }) {
  const [state, action] = useActionState(sendTestEvent, initialState);
  return (
    <section className="a-card p-5">
      <h2 className="font-medium text-slate-900">Send a test event</h2>
      <p className="mb-3 mt-1 text-xs text-slate-500">
        Events Manager → your dataset → <b>Test events</b> → copy the code, then send a test Purchase from the server.
      </p>
      {disabled ? (
        <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">Turn on the Conversions API and save a token first.</p>
      ) : (
        <form action={action} className="space-y-3" autoComplete="off">
          <input name="test_code" defaultValue={defaultCode} placeholder="TEST12345" className="a-input font-mono" {...noAutofill} />
          <FormAlert error={state.error} message={state.message} />
          <SubmitButton className="a-btn-outline w-full" pendingText="Sending…">Send test Purchase</SubmitButton>
        </form>
      )}
    </section>
  );
}

export function RetryButton({ count }: { count: number }) {
  const [state, action] = useActionState(retryFailed, initialState);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <SubmitButton className="a-btn-outline py-1.5 text-xs" pendingText="Retrying…">Retry {count} failed</SubmitButton>
      {(state.error || state.message) && (
        <span className={`text-xs ${state.error ? "text-rose-600" : "text-emerald-700"}`}>{state.error ?? state.message}</span>
      )}
    </form>
  );
}
