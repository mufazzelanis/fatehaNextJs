"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import { createLanding } from "@/app/actions/landings";
import { initialState } from "@/lib/action-state";
import { landingSlugError, slugifyLanding } from "@/lib/landing";
import { FieldError, FormAlert, keepValuesOnSubmit, SubmitButton } from "@/components/form-bits";
import { CheckIcon, PlusIcon } from "@/components/icons";

const noop = () => () => {};
/** The site's own origin (fatehabd.com in production). */
export function useOrigin() {
  return useSyncExternalStore(noop, () => window.location.origin, () => "");
}

export function CopyUrl({ path }: { path: string }) {
  const origin = useOrigin();
  const [copied, setCopied] = useState(false);
  const url = `${origin}${path}`;
  return (
    <button type="button" title="Copy link"
      onClick={() => { navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {}); }}
      className="mt-0.5 inline-flex max-w-full items-center gap-1.5 truncate font-mono text-xs text-brand-700 hover:underline">
      <span className="truncate">{origin.replace(/^https?:\/\//, "")}{path}</span>
      {copied ? <CheckIcon className="size-3.5 shrink-0 text-emerald-600" /> : <span className="shrink-0 rounded bg-brand-50 px-1 text-[10px] font-sans font-semibold">COPY</span>}
    </button>
  );
}

export function NewLandingForm({ products, landings }: { products: { id: number; name: string }[]; landings: { id: number; name: string }[] }) {
  const [state, action, pending] = useActionState(createLanding, initialState);
  const v = state.values ?? {};
  const fe = state.fieldErrors ?? {};
  const origin = useOrigin();
  const [name, setName] = useState(v.name ?? "");
  const [slug, setSlug] = useState(v.slug ?? "");
  const [touched, setTouched] = useState(!!v.slug);
  const liveErr = slug ? landingSlugError(slug) : null;

  return (
    <section className="a-card p-5 xl:sticky xl:top-24">
      <h2 className="flex items-center gap-2 font-medium text-slate-900"><PlusIcon className="size-4" /> New landing page</h2>
      <p className="mb-4 mt-1 text-xs text-slate-500">It starts as a draft — preview it, then publish.</p>
      <form onSubmit={keepValuesOnSubmit(action)} className="space-y-4">
        <label className="block">
          <span className="a-label">Page name</span>
          <input name="name" value={name} required className="a-input font-sans" placeholder="e.g. Aptamil offer" aria-invalid={!!fe.name}
            onChange={(e) => { setName(e.target.value); if (!touched) setSlug(slugifyLanding(e.target.value)); }} />
          <FieldError message={fe.name} />
        </label>
        <label className="block">
          <span className="a-label">URL</span>
          <div className="flex items-center overflow-hidden rounded-lg border border-slate-200 focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/15">
            <span className="shrink-0 bg-slate-50 px-2.5 py-2 text-xs text-slate-400">{origin.replace(/^https?:\/\//, "") || "fatehabd.com"}/</span>
            <input name="slug" value={slug} className="min-w-0 flex-1 px-2.5 py-2 text-sm outline-none" placeholder="aptamil-offer" aria-invalid={!!(fe.slug || liveErr)}
              onChange={(e) => { setTouched(true); setSlug(slugifyLanding(e.target.value)); }} />
          </div>
          <FieldError message={fe.slug ?? liveErr ?? undefined} />
        </label>
        <label className="block">
          <span className="a-label">Product sold on this page</span>
          <select name="product_id" defaultValue={v.product_id ?? ""} className="a-input" aria-invalid={!!fe.product_id}>
            <option value="">Choose a product…</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <FieldError message={fe.product_id} />
        </label>
        <label className="block">
          <span className="a-label">Start from</span>
          <select name="copy_from" defaultValue={v.copy_from ?? "0"} className="a-input">
            <option value="0">Default template</option>
            {landings.map((l) => <option key={l.id} value={l.id}>Copy of “{l.name}”</option>)}
          </select>
          <span className="mt-1 block text-xs text-slate-400">Copies the text, colours and checkout form; you can change everything after.</span>
        </label>
        <FormAlert error={state.error} />
        <SubmitButton className="a-btn w-full py-2.5" pendingText="Creating…" pending={pending}>Create landing page</SubmitButton>
      </form>
    </section>
  );
}
