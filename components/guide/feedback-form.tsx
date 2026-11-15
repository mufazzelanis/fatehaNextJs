"use client";

import { useActionState, useState } from "react";
import { sendFeedback } from "@/app/actions/feedback";
import { initialState } from "@/lib/action-state";

const LABELS = ["", "ভালো লাগেনি", "মোটামুটি", "ভালো", "খুব ভালো", "অসাধারণ"];

/** Stars + message (name / phone optional). Big tap targets — many readers are older. */
export function FeedbackForm({ button }: { button: string }) {
  const [state, action, pending] = useActionState(sendFeedback, initialState);
  const [rating, setRating] = useState(Number(state.values?.rating) || 0);
  const [hover, setHover] = useState(0);
  const shown = hover || rating;

  if (state.ok) {
    return (
      <div className="rounded-3xl bg-emerald-50 p-8 text-center ring-1 ring-emerald-200 animate-fade-in" role="status">
        <p className="text-5xl" aria-hidden="true">💚</p>
        <p className="mt-3 font-display text-[24px] font-bold text-[#123f2c]">{state.message}</p>
        <p className="mt-1 text-[17px] text-[#34503f]">আপনার মতামত আমাদের সেবা আরও ভালো করতে সাহায্য করবে।</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="rating" value={rating || ""} />
      {/* honeypot */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />

      <div className="text-center">
        <p className="text-[17px] font-semibold text-[#22382b]">পণ্যটি আপনার কেমন লেগেছে?</p>
        <div className="mt-2 flex justify-center gap-1.5" role="radiogroup" aria-label="রেটিং" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} স্টার — ${LABELS[n]}`}
              onClick={() => setRating(n)} onMouseEnter={() => setHover(n)}
              className="grid size-14 place-items-center rounded-2xl transition active:scale-90 sm:size-12">
              <svg viewBox="0 0 24 24" width="44" height="44" aria-hidden="true"
                className={`transition ${n <= shown ? "scale-110 text-[#f5a623] drop-shadow" : "text-[#cfd8d3]"}`} fill="currentColor">
                <path d="m12 2.8 2.85 5.78 6.38.93-4.62 4.5 1.09 6.35L12 17.36 6.3 20.36l1.09-6.35-4.62-4.5 6.38-.93z" />
              </svg>
            </button>
          ))}
        </div>
        <p className={`mt-1 h-6 text-[16px] font-bold ${shown ? "text-[#b7791f]" : "text-transparent"}`}>{LABELS[shown] || "—"}</p>
        {state.fieldErrors?.rating && <p className="text-[15px] font-semibold text-rose-600">{state.fieldErrors.rating}</p>}
      </div>

      <label className="block">
        <span className="mb-1 block text-[16px] font-semibold text-[#22382b]">আপনার অভিজ্ঞতা লিখুন</span>
        <textarea name="message" rows={4} defaultValue={state.values?.message} maxLength={2000}
          placeholder="যেমন: কতদিন ব্যবহার করছেন, কী পরিবর্তন দেখেছেন…"
          className="w-full rounded-2xl border border-[#cfe0d6] bg-white px-4 py-3 text-[17px] leading-relaxed outline-none transition focus:border-[#2f9a6a] focus:ring-4 focus:ring-[#2f9a6a]/15" />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[16px] font-semibold text-[#22382b]">নাম <span className="font-normal text-[#6b8576]">(ঐচ্ছিক)</span></span>
          <input name="name" defaultValue={state.values?.name} maxLength={80}
            className="w-full rounded-2xl border border-[#cfe0d6] bg-white px-4 py-3 text-[17px] outline-none focus:border-[#2f9a6a] focus:ring-4 focus:ring-[#2f9a6a]/15" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[16px] font-semibold text-[#22382b]">মোবাইল <span className="font-normal text-[#6b8576]">(ঐচ্ছিক)</span></span>
          <input name="phone" inputMode="tel" defaultValue={state.values?.phone} maxLength={20} placeholder="01XXXXXXXXX"
            aria-invalid={!!state.fieldErrors?.phone}
            className="w-full rounded-2xl border border-[#cfe0d6] bg-white px-4 py-3 text-[17px] tabular-nums outline-none focus:border-[#2f9a6a] focus:ring-4 focus:ring-[#2f9a6a]/15 aria-invalid:border-rose-400" />
        </label>
      </div>
      {state.error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-[16px] font-semibold text-rose-700 ring-1 ring-rose-200">{state.error}</p>}
      <button type="submit" disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1d6b4a] px-5 py-4 text-[20px] font-bold text-white shadow-[0_8px_20px_-6px_rgb(29_107_74/0.6)] transition hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98] disabled:opacity-60">
        {pending ? "পাঠানো হচ্ছে…" : button}
      </button>
    </form>
  );
}
