"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { RANGE_LABEL, type RangeKey } from "@/lib/date-range";
import { ClockIcon } from "../icons";

const PRESETS: RangeKey[] = ["today", "yesterday", "this_week", "last_week", "this_month", "last_month", "this_year", "last_year", "all"];
const remember = (v: string) => { document.cookie = `fb_dash_range=${encodeURIComponent(v)}; path=/admin; max-age=31536000; samesite=lax`; };

function Pending() {
  const { pending } = useLinkStatus();
  return pending ? <span className="ml-1.5 inline-block size-3 animate-spin rounded-full border-2 border-current border-t-transparent align-[-1px]" /> : null;
}

/** Period picker for the dashboard: preset chips + a custom date range. The choice is remembered (cookie). */
export function RangeFilter({ current, from, to, display, compare }: { current: RangeKey; from: string; to: string; display: string; compare: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);
  const [pending, start] = useTransition();
  const box = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  // On phones the chip row scrolls sideways — keep the selected period in view.
  useEffect(() => {
    const el = strip.current?.querySelector<HTMLElement>("[aria-selected=true]");
    const row = strip.current;
    if (el && row) row.scrollLeft = el.offsetLeft - row.clientWidth / 2 + el.clientWidth / 2;
  }, [current]);
  const today = to > from ? to : from;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <div className="mb-5 space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <div ref={strip} className="-mx-4 min-w-0 basis-full overflow-x-auto scroll-smooth px-4 sm:mx-0 sm:basis-auto sm:px-0 [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max gap-1 rounded-xl bg-white p-1 shadow-xs ring-1 ring-slate-200/80" role="tablist" aria-label="Period">
            {PRESETS.map((k) => (
              <Link key={k} href={`/admin?range=${k}`} scroll={false} role="tab" aria-selected={current === k} onClick={() => remember(k)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${current === k ? "bg-brand-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}>
                {RANGE_LABEL[k]}<Pending />
              </Link>
            ))}
          </div>
        </div>
        <div className="relative" ref={box}>
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
            className={`inline-flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-medium shadow-xs ring-1 transition ${
              current === "custom" ? "bg-brand-700 text-white ring-brand-700" : "bg-white text-slate-700 ring-slate-200/80 hover:bg-slate-50"}`}>
            <ClockIcon className="size-4" /> {current === "custom" ? display : "Custom range"}
            {pending && <span className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />}
          </button>
          {open && (
            <form className="absolute right-0 z-30 mt-2 w-72 space-y-3 rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-200 sm:left-0 sm:right-auto"
              onSubmit={(e) => {
                e.preventDefault();
                remember(`custom:${f}:${t}`);
                setOpen(false);
                start(() => router.push(`/admin?range=custom&from=${f}&to=${t}`, { scroll: false }));
              }}>
              <p className="text-sm font-semibold text-slate-900">Choose dates</p>
              <label className="block"><span className="a-label">From</span><input type="date" value={f} max={today} onChange={(e) => setF(e.target.value)} required className="a-input" /></label>
              <label className="block"><span className="a-label">To</span><input type="date" value={t} min={f} onChange={(e) => setT(e.target.value)} required className="a-input" /></label>
              <div className="flex gap-2">
                <button type="submit" className="a-btn flex-1">Show</button>
                <button type="button" onClick={() => setOpen(false)} className="a-btn-outline">Cancel</button>
              </div>
            </form>
          )}
        </div>
      </div>
      <p className="text-sm text-slate-500">
        <span className="font-medium text-slate-700">{display}</span>
        {compare ? <> · compared with {compare}</> : <> · everything since the first order</>}
      </p>
    </div>
  );
}
