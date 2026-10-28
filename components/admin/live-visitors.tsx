"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DEVICE_LABEL, LIVE_DEVICES, LIVE_SOURCES, SECTION_LABEL, SOURCE_LABEL, type LiveStats } from "@/lib/live";

const POLL_MS = 3000;

function ago(ms: number) {
  const s = Math.max(Math.round(ms / 1000), 0);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s ago`;
}

/** 30-minute area chart of people on landing pages. */
function Spark({ data }: { data: number[] }) {
  const w = 300;
  const h = 64;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - 4 - (v / max) * (h - 10)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-16 w-full" aria-hidden="true">
      <defs>
        <linearGradient id="live-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${w},${h} L0,${h} Z`} fill="url(#live-fill)" />
      <path d={line} fill="none" stroke="#6ee7b7" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      <circle cx={pts.at(-1)![0]} cy={pts.at(-1)![1]} r="3.5" fill="#6ee7b7" />
    </svg>
  );
}

function Bar({ label, value, total, tone }: { label: string; value: number; total: number; tone: string }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs"><span className="text-white/75">{label}</span><span className="font-semibold tabular-nums text-white">{value}</span></div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full transition-all duration-700 ${tone}`} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

/**
 * Dashboard hero: people on landing pages right now, refreshed every 3 seconds —
 * who is arriving and leaving, which page, how far down (order form!), and where they came from.
 */
export function LiveVisitors({ initial }: { initial: LiveStats }) {
  const [data, setData] = useState(initial);
  const [offline, setOffline] = useState(false);
  const [delta, setDelta] = useState<{ n: number; key: number } | null>(null);
  // Local clock (ticks every second so "12s ago" stays current) and its offset from the server clock.
  const [clock, setClock] = useState(() => Date.now());
  const [skew, setSkew] = useState(() => Date.now() - new Date(initial.now).getTime());
  const last = useRef(initial.total);

  useEffect(() => {
    const id = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let stopped = false;
    let timer = 0;
    const load = async () => {
      try {
        const res = await fetch("/admin/live", { cache: "no-store" });
        if (res.status === 401 || res.status === 403) { stopped = true; return; }
        const next = (await res.json()) as LiveStats;
        setSkew(Date.now() - new Date(next.now).getTime());
        if (next.total !== last.current) setDelta({ n: next.total - last.current, key: Date.now() });
        last.current = next.total;
        setData(next);
        setOffline(false);
      } catch {
        setOffline(true);
      }
    };
    const tick = async () => {
      if (stopped) return;
      if (document.visibilityState === "visible") await load();
      timer = window.setTimeout(tick, POLL_MS);
    };
    timer = window.setTimeout(tick, POLL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { stopped = true; window.clearTimeout(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, []);

  const serverNow = clock - skew;
  const peak = Math.max(...data.series, data.total);
  const onForm = data.sections.form;

  return (
    <section className="relative mb-6 overflow-hidden rounded-2xl bg-linear-to-br from-[#06231f] via-[#0b3b33] to-[#0f5a4c] text-white shadow-lg shadow-emerald-950/20 ring-1 ring-emerald-900/30">
      <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-emerald-400/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-10 size-64 rounded-full bg-teal-300/10 blur-3xl" />

      <div className="relative grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.15fr_1fr_1fr]">
        {/* Big live number */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">
            <span className="relative flex size-2.5">
              <span className={`absolute inline-flex size-full rounded-full ${offline ? "bg-amber-400" : "animate-ping bg-emerald-400"} opacity-75`} />
              <span className={`relative inline-flex size-2.5 rounded-full ${offline ? "bg-amber-400" : "bg-emerald-400"}`} />
            </span>
            {offline ? "Reconnecting…" : "Live · landing pages"}
          </div>
          <div className="mt-3 flex items-end gap-3">
            <p className="text-6xl font-bold leading-none tabular-nums tracking-tight" aria-live="polite">{data.total}</p>
            {delta && delta.n !== 0 && (
              <span key={delta.key} className={`mb-1.5 animate-fade-in rounded-full px-2 py-0.5 text-sm font-semibold ${delta.n > 0 ? "bg-emerald-400/20 text-emerald-200" : "bg-rose-400/20 text-rose-200"}`}>
                {delta.n > 0 ? `▲ +${delta.n}` : `▼ ${delta.n}`}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-white/70">{data.total === 1 ? "person is" : "people are"} on your landing pages right now</p>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white/[0.07] px-2 py-2.5 ring-1 ring-white/10">
              <p className="text-lg font-semibold tabular-nums text-emerald-300">+{data.arrived5}</p>
              <p className="text-[11px] text-white/60">arrived · 5 min</p>
            </div>
            <div className="rounded-xl bg-white/[0.07] px-2 py-2.5 ring-1 ring-white/10">
              <p className="text-lg font-semibold tabular-nums text-rose-300">−{data.left5}</p>
              <p className="text-[11px] text-white/60">left · 5 min</p>
            </div>
            <div className="rounded-xl bg-white/[0.07] px-2 py-2.5 ring-1 ring-white/10">
              <p className="text-lg font-semibold tabular-nums">{data.today.toLocaleString("en-IN")}</p>
              <p className="text-[11px] text-white/60">visits today</p>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-[11px] text-white/55"><span>Last 30 minutes</span><span>peak {peak}</span></div>
            <Spark data={[...data.series.slice(0, -1), data.total]} />
          </div>
        </div>

        {/* Where they are */}
        <div className="min-w-0 space-y-5">
          <div className={`flex items-center gap-3 rounded-xl px-3.5 py-3 ring-1 ${onForm ? "bg-amber-300/15 ring-amber-300/40" : "bg-white/[0.06] ring-white/10"}`}>
            <span className="text-2xl" aria-hidden="true">🛒</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold"><span className="tabular-nums">{onForm}</span> on the order form now</p>
              <p className="text-xs text-white/60">{onForm ? "Likely to order in the next minutes" : "Nobody is filling the form right now"}</p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/50">Landing pages</p>
            {data.landings.length === 0 ? (
              <p className="text-sm text-white/50">No one on a landing page right now.</p>
            ) : (
              <ul className="space-y-2.5">
                {data.landings.slice(0, 5).map((l) => (
                  <li key={l.id}>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <Link href={`/admin/landings/${l.id}`} className="min-w-0 truncate font-medium hover:underline">{l.name}</Link>
                      <span className="shrink-0 tabular-nums"><b>{l.count}</b>{l.form ? <span className="ml-1.5 text-xs text-amber-200">· {l.form} on form</span> : null}</span>
                    </div>
                    <p className="font-mono text-[11px] text-white/45">/{l.slug}</p>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-400 transition-all duration-700" style={{ width: `${Math.round((l.count / Math.max(data.total, 1)) * 100)}%` }} /></div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            <Bar label={SECTION_LABEL.top} value={data.sections.top} total={data.total} tone="bg-sky-400" />
            <Bar label={SECTION_LABEL.content} value={data.sections.content} total={data.total} tone="bg-violet-400" />
            {LIVE_SOURCES.filter((s) => data.sources[s]).map((s) => (
              <Bar key={s} label={SOURCE_LABEL[s]} value={data.sources[s]} total={data.total} tone={s === "facebook" ? "bg-blue-400" : s === "google" ? "bg-yellow-300" : "bg-slate-300"} />
            ))}
            {LIVE_DEVICES.filter((d) => data.devices[d]).map((d) => (
              <Bar key={d} label={DEVICE_LABEL[d]} value={data.devices[d]} total={data.total} tone="bg-teal-300" />
            ))}
          </div>
        </div>

        {/* Arriving / leaving feed */}
        <div className="min-w-0">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/50">Coming &amp; going</p>
          {data.feed.length === 0 ? (
            <p className="text-sm text-white/50">Visitors will appear here as they open or close a landing page.</p>
          ) : (
            <ul className="max-h-[19rem] space-y-1.5 overflow-y-auto pr-1 [scrollbar-width:thin]">
              {data.feed.map((e, i) => (
                <li key={`${e.kind}-${e.at}-${i}`} className="flex items-center gap-2.5 rounded-lg bg-white/[0.05] px-2.5 py-1.5 text-xs ring-1 ring-white/5">
                  <span className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${e.kind === "arrived" ? "bg-emerald-400/20 text-emerald-300" : "bg-rose-400/15 text-rose-300"}`}>
                    {e.kind === "arrived" ? "↗" : "↘"}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    <b className="font-semibold">{e.kind === "arrived" ? "Arrived" : "Left"}</b>
                    <span className="text-white/60"> · /{e.landing} · {SOURCE_LABEL[e.source].split(" ")[0]} · {DEVICE_LABEL[e.device]}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-white/45">{ago(serverNow - new Date(e.at).getTime())}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
