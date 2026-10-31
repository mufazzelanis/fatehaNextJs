"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { DEVICE_KIND_LABEL, parseDevice } from "@/lib/device";
import { duration, SECTION_LABEL, SOURCE_LABEL, type LiveStats } from "@/lib/live";

const POLL_MS = 3000;

// One shared poller for every live widget on the page.
type State = { data: LiveStats; skew: number; offline: boolean };
let state: State | null = null;
const listeners = new Set<() => void>();
let timer = 0;
async function load() {
  try {
    const res = await fetch("/admin/live", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as LiveStats;
    state = { data, skew: Date.now() - new Date(data.now).getTime(), offline: false };
  } catch {
    if (state) state = { ...state, offline: true };
  }
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  if (listeners.size === 1) {
    const tick = async () => {
      if (document.visibilityState === "visible") await load();
      timer = window.setTimeout(tick, POLL_MS);
    };
    timer = window.setTimeout(tick, POLL_MS);
  }
  return () => {
    listeners.delete(l);
    if (!listeners.size) window.clearTimeout(timer);
  };
}
function useLive(initial: LiveStats) {
  const s = useSyncExternalStore(subscribe, () => state, () => null);
  return s ?? { data: initial, skew: 0, offline: false };
}
/** A clock that ticks every second, so durations and "x ago" stay current between polls. */
function useClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

/** KPI tile: people on landing pages right now. */
export function LiveNowCard({ initial }: { initial: LiveStats }) {
  const { data, offline } = useLive(initial);
  return (
    <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-[#06231f] via-[#0b3b33] to-[#0f5a4c] p-5 text-white shadow-lg shadow-emerald-950/20">
      <div className="pointer-events-none absolute -right-10 -top-12 size-36 rounded-full bg-emerald-400/20 blur-2xl" />
      <div className="relative flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-200">Active right now</p>
        <span className="relative flex size-2.5">
          <span className={`absolute inline-flex size-full rounded-full opacity-75 ${offline ? "bg-amber-400" : "animate-ping bg-emerald-400"}`} />
          <span className={`relative inline-flex size-2.5 rounded-full ${offline ? "bg-amber-400" : "bg-emerald-400"}`} />
        </span>
      </div>
      <p className="relative mt-2 text-5xl font-bold tabular-nums leading-none" aria-live="polite">{data.total}</p>
      <p className="relative mt-2 text-xs text-white/70">
        {data.sections.form > 0 ? <><b className="text-amber-200">{data.sections.form}</b> on the order form · </> : null}
        +{data.arrived5} / −{data.left5} in 5 min
      </p>
    </div>
  );
}

const SOURCE_TONE: Record<string, string> = {
  facebook: "bg-blue-50 text-blue-700 ring-blue-600/20", google: "bg-amber-50 text-amber-800 ring-amber-600/20",
  other: "bg-violet-50 text-violet-700 ring-violet-600/20", direct: "bg-slate-100 text-slate-600 ring-slate-500/20",
};
const SECTION_TONE: Record<string, string> = { top: "text-sky-700", content: "text-violet-700", form: "font-semibold text-amber-700" };

/** Everyone on a landing page right now, with IP, device, where they are and for how long. */
export function LiveVisitorsTable({ initial }: { initial: LiveStats }) {
  const { data, skew } = useLive(initial);
  const now = useClock() - skew;
  return (
    <section className="a-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="relative flex size-2.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" /></span>
          <h2 className="font-medium text-slate-900">On the landing pages right now</h2>
        </div>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">{data.total} active</span>
      </div>
      {data.active.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-slate-500">Nobody is on a landing page right now. Visitors appear here the moment they open one.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-slate-50/70 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-2.5 font-medium">Visitor IP</th>
                <th className="px-3 py-2.5 font-medium">Device &amp; browser</th>
                <th className="px-3 py-2.5 font-medium">Came from</th>
                <th className="px-3 py-2.5 font-medium">Landing page</th>
                <th className="px-3 py-2.5 font-medium">Where on the page</th>
                <th className="px-3 py-2.5 font-medium">Time on page</th>
                <th className="px-5 py-2.5 font-medium">Order button</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.active.map((v) => {
                const d = parseDevice(v.userAgent);
                const secs = Math.max(Math.round((now - new Date(v.startedAt).getTime()) / 1000), 0);
                return (
                  <tr key={v.id} className={v.section === "form" ? "bg-amber-50/40" : ""}>
                    <td className="whitespace-nowrap px-5 py-2.5">
                      <span className="inline-flex items-center gap-2">
                        <span className="size-2 rounded-full bg-emerald-500" />
                        <span className="font-mono text-xs text-slate-800">{v.ip ?? "—"}</span>
                        {v.ipVisits > 1 && (
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${v.ipVisits >= 10 ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-800"}`}
                            title="Visits from this IP in the last 30 days">{v.ipVisits} times</span>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      <p className="font-medium text-slate-700">{d ? DEVICE_KIND_LABEL[d.kind] : v.device}</p>
                      <p className="text-slate-500">{d ? [d.os, d.browser].filter(Boolean).join(" · ") : "—"}</p>
                    </td>
                    <td className="px-3 py-2.5"><span className={`rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${SOURCE_TONE[v.source]}`}>{SOURCE_LABEL[v.source].split(" /")[0]}</span></td>
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-600">/{v.landing}</td>
                    <td className={`px-3 py-2.5 text-xs ${SECTION_TONE[v.section]}`}>{v.section === "form" ? "🛒 " : ""}{SECTION_LABEL[v.section]}</td>
                    <td className="px-3 py-2.5"><span className="rounded-md bg-sky-50 px-2 py-0.5 font-mono text-xs font-semibold text-sky-700">{duration(secs)}</span></td>
                    <td className="px-5 py-2.5 text-xs">
                      {v.ordered ? <span className="font-semibold text-emerald-700">✓ Ordered</span>
                        : v.clicks > 0 ? <span className="font-semibold text-amber-700">Clicked {v.clicks}×</span>
                          : v.reachedForm ? <span className="text-slate-600">Saw the form</span>
                            : <span className="text-slate-400">Browsing</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
