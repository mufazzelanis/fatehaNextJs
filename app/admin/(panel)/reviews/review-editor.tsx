"use client";

import { useActionState, useState } from "react";
import { addReview, saveReview } from "@/app/actions/reviews";
import { initialState } from "@/lib/action-state";

function StarPicker({ name, value, onChange }: { name: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-0.5" role="radiogroup" aria-label="Stars">
      <input type="hidden" name={name} value={value} />
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} stars`} onClick={() => onChange(n)}
          className={`text-[22px] leading-none transition hover:scale-110 ${n <= value ? "text-amber-400" : "text-slate-300"}`}>★</button>
      ))}
    </div>
  );
}

type EditorProps = {
  id: number; name: string; story: string; displayName: string; displayText: string; rating: number; featured: boolean;
  note: string; status: string; internal: boolean; anon: boolean;
};

/** Edit what /reviews shows, then Approve / Hide / Save. The customer's original answers stay untouched. */
export function ReviewEditor(p: EditorProps) {
  const [state, action, pending] = useActionState(saveReview, initialState);
  const [rating, setRating] = useState(p.rating);
  const btn = "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold shadow-xs transition active:scale-[0.97] disabled:opacity-50";
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={p.id} />
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="block">
          <span className="a-label">Name shown {p.anon && <span className="text-amber-600">(customer asked to hide the name — shows “একজন গ্রাহক”)</span>}</span>
          <input name="display_name" defaultValue={p.displayName} placeholder={p.name} maxLength={80} disabled={p.anon} className="a-input disabled:bg-slate-50" />
        </label>
        <div>
          <span className="a-label">Stars</span>
          <StarPicker name="rating" value={rating} onChange={setRating} />
        </div>
      </div>
      <label className="block">
        <span className="a-label">Review text shown <span className="text-slate-400">— fix spelling, shorten; the original is kept on the left</span></span>
        <textarea name="display_text" defaultValue={p.displayText || p.story} rows={5} maxLength={3000} className="a-input leading-relaxed" />
      </label>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="block">
          <span className="a-label">Private note (staff only)</span>
          <input name="admin_note" defaultValue={p.note} maxLength={500} placeholder="e.g. called and confirmed" className="a-input" />
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
          <input type="checkbox" name="featured" defaultChecked={p.featured} className="size-4 accent-amber-500" /> ⭐ Featured (first + top strip)
        </label>
      </div>
      {state.error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{state.error}</p>}
      {state.ok && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">✓ {state.message}</p>}
      <div className="flex flex-wrap gap-2">
        {p.internal ? (
          <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">🔒 Internal only — the customer did not allow publishing.</p>
        ) : p.status !== "approved" ? (
          <button name="intent" value="approve" disabled={pending} className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`}>✓ Save & approve</button>
        ) : null}
        <button name="intent" value="save" disabled={pending} className={`${btn} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}>Save</button>
        {p.status === "approved" && <button name="intent" value="hide" disabled={pending} className={`${btn} bg-slate-700 text-white hover:bg-slate-800`}>Hide from page</button>}
        {p.status === "hidden" && <button name="intent" value="pending" disabled={pending} className={`${btn} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}>Back to pending</button>}
        {p.status === "pending" && !p.internal && <button name="intent" value="hide" disabled={pending} className={`${btn} border border-slate-200 bg-white text-slate-600 hover:bg-slate-50`}>Reject (hide)</button>}
      </div>
    </form>
  );
}

/** Add a review received by phone / Facebook / WhatsApp — published straight away. */
export function AddReviewForm() {
  const [state, action, pending] = useActionState(addReview, initialState);
  const [rating, setRating] = useState(Number(state.values?.rating) || 5);
  return (
    <form action={action} key={state.ok ? state.message : "form"} className="grid gap-3 p-5 sm:grid-cols-2">
      <label className="block">
        <span className="a-label">Customer name *</span>
        <input name="name" defaultValue={state.values?.name} maxLength={80} aria-invalid={!!state.fieldErrors?.name} className="a-input" />
      </label>
      <label className="block">
        <span className="a-label">District</span>
        <input name="district" defaultValue={state.values?.district} maxLength={60} className="a-input" />
      </label>
      <label className="block sm:col-span-2">
        <span className="a-label">Review text *</span>
        <textarea name="story" defaultValue={state.values?.story} rows={4} maxLength={3000} aria-invalid={!!state.fieldErrors?.story} className="a-input leading-relaxed" />
      </label>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <StarPicker name="rating" value={rating} onChange={setRating} />
        <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" name="featured" className="size-4 accent-amber-500" /> ⭐ Featured</label>
        <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" name="anon" className="size-4" /> Hide the name</label>
        <button disabled={pending} className="a-btn ml-auto">{pending ? "Adding…" : "Add & publish"}</button>
      </div>
      {state.error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 sm:col-span-2">{state.error}</p>}
      {state.ok && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 sm:col-span-2">✓ {state.message}</p>}
    </form>
  );
}

/** Submit button that asks first (delete for good). */
export function ConfirmButton({ message, className, children }: { message: string; className?: string; children: React.ReactNode }) {
  return <button className={className} onClick={(e) => { if (!window.confirm(message)) e.preventDefault(); }}>{children}</button>;
}
