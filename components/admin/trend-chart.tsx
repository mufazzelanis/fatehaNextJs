"use client";

import { useState } from "react";
import type { SeriesPoint } from "@/lib/data/reports";

type Metric = "revenue" | "orders";

const W = 720;
const H = 240;
const PAD = { top: 16, right: 12, bottom: 28, left: 52 };

function niceMax(value: number) {
  if (value <= 0) return 4;
  const pow = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => (s * pow * 4) >= value) ?? 10;
  return step * pow * 4;
}

const fmt = (metric: Metric, v: number) => (metric === "revenue" ? `৳${Math.round(v).toLocaleString("en-IN")}` : String(v));

/** One measure at a time (toggle) — never two y-scales on one plot. */
/** `caption` describes the period (e.g. "This month · 1 Oct – 26 Oct 2026"); points are hours, days or months. */
export function TrendChart({ data, caption, unit = "day" }: { data: SeriesPoint[]; caption: string; unit?: "hour" | "day" | "month" }) {
  const [metric, setMetric] = useState<Metric>("revenue");
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const values = data.map((d) => d[metric]);
  const max = niceMax(Math.max(...values));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (data.length > 1 ? (i / (data.length - 1)) * innerW : innerW / 2);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const line = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(values.length - 1)},${PAD.top + innerH} L${x(0)},${PAD.top + innerH} Z`;
  const total = values.reduce((a, b) => a + b, 0);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const h = hover !== null ? data[hover] : null;

  return (
    <div className="a-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{metric === "revenue" ? "Revenue" : "Orders"} · {caption}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{fmt(metric, total)}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-slate-100 p-0.5 text-sm" role="tablist">
            {(["revenue", "orders"] as Metric[]).map((m) => (
              <button key={m} type="button" role="tab" aria-selected={metric === m} onClick={() => setMetric(m)}
                className={`rounded-md px-3 py-1.5 font-medium capitalize transition ${metric === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                {m}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setShowTable((s) => !s)} className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100">
            {showTable ? "Chart" : "Table"}
          </button>
        </div>
      </div>

      {showTable ? (
        <div className="mt-4 max-h-64 overflow-auto rounded-lg border border-slate-100">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-xs text-slate-500">
              <tr><th className="px-3 py-2 font-medium">{unit === "hour" ? "Hour" : unit === "month" ? "Month" : "Date"}</th><th className="px-3 py-2 text-right font-medium">Orders</th><th className="px-3 py-2 text-right font-medium">Revenue</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums">
              {data.map((d) => (
                <tr key={d.key}><td className="px-3 py-1.5 text-slate-600">{d.label}</td><td className="px-3 py-1.5 text-right">{d.orders}</td><td className="px-3 py-1.5 text-right">{fmt("revenue", d.revenue)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative mt-4">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img"
            aria-label={`${metric} per ${unit}, ${caption}`} onMouseLeave={() => setHover(null)}>
            <defs>
              <linearGradient id="trend-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="var(--color-brand-500)" stopOpacity="0.22" />
                <stop offset="1" stopColor="var(--color-brand-500)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeDasharray={t ? "3 4" : undefined} />
                <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" className="fill-slate-400 text-[11px] tabular-nums">
                  {metric === "revenue" && t >= 1000 ? `${t / 1000}k` : t}
                </text>
              </g>
            ))}
            {data.map((d, i) => {
              const step = Math.ceil(data.length / 7);
              // Every n-th label, plus the last one — skipping a regular label that would collide with it.
              return (i === data.length - 1 || (i % step === 0 && data.length - 1 - i >= Math.max(2, step * 0.6))) && (
              <text key={d.key} x={x(i)} y={H - 8} textAnchor="middle" className="fill-slate-400 text-[11px]">{d.label}</text>
              );
            })}
            <path d={area} fill="url(#trend-fill)" />
            <path d={line} fill="none" stroke="var(--color-brand-600)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {hover !== null && (
              <>
                <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} stroke="#94a3b8" strokeDasharray="3 3" />
                <circle cx={x(hover)} cy={y(values[hover])} r="5" fill="var(--color-brand-600)" stroke="#fff" strokeWidth="2" />
              </>
            )}
            {/* hit targets wider than the marks */}
            {data.map((d, i) => (
              <rect key={d.key} x={x(i) - innerW / data.length / 2} y={PAD.top} width={innerW / data.length} height={innerH}
                fill="transparent" onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)} />
            ))}
          </svg>
          {h && hover !== null && (
            <div className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"
              style={{ left: `${(x(hover) / W) * 100}%` }}>
              <p className="font-medium text-slate-900">{h.label}</p>
              <p className="mt-0.5 tabular-nums text-slate-600">{h.orders} orders · {fmt("revenue", h.revenue)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
