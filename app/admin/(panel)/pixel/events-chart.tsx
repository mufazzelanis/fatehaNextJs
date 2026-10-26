"use client";

import { useState } from "react";

export type DayCount = { date: string; ok: number; failed: number };

const W = 640;
const H = 170;
const PAD = { top: 10, right: 8, bottom: 24, left: 34 };
const label = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/** Delivered vs failed server events per day — stacked, status colours with a legend. */
export function EventsChart({ data }: { data: DayCount[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(4, ...data.map((d) => d.ok + d.failed));
  const step = Math.ceil(max / 4);
  const top = step * 4;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const slot = innerW / data.length;
  const barW = Math.min(36, slot * 0.6);
  const y = (v: number) => PAD.top + innerH - (v / top) * innerH;
  const total = data.reduce((s, d) => s + d.ok + d.failed, 0);
  const failed = data.reduce((s, d) => s + d.failed, 0);

  return (
    <section className="a-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">Server events · last {data.length} days</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
            {total} <span className="text-sm font-normal text-slate-500">{total ? `· ${Math.round(((total - failed) / total) * 100)}% delivered` : ""}</span>
          </p>
        </div>
        <div className="flex gap-4 text-xs text-slate-600">
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-emerald-500" /> Delivered</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-rose-500" /> Failed</span>
        </div>
      </div>
      <div className="relative mt-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Delivered and failed server events per day" onMouseLeave={() => setHover(null)}>
          {[0, 1, 2, 3, 4].map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t * step)} y2={y(t * step)} stroke="#e2e8f0" strokeDasharray={t ? "3 4" : undefined} />
              <text x={PAD.left - 6} y={y(t * step) + 4} textAnchor="end" className="fill-slate-400 text-[10px] tabular-nums">{t * step}</text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = PAD.left + slot * i + slot / 2;
            const okTop = y(d.ok);
            const failTop = y(d.ok + d.failed);
            return (
              <g key={d.date} opacity={hover === null || hover === i ? 1 : 0.45}>
                {d.ok > 0 && <rect x={cx - barW / 2} y={okTop} width={barW} height={y(0) - okTop} rx={d.failed ? 0 : 4} className="fill-emerald-500" />}
                {d.failed > 0 && <rect x={cx - barW / 2} y={failTop} width={barW} height={Math.max(okTop - failTop - (d.ok ? 2 : 0), 1)} rx={4} className="fill-rose-500" />}
                <text x={cx} y={H - 6} textAnchor="middle" className="fill-slate-400 text-[10px]">{label(d.date)}</text>
                <rect x={cx - slot / 2} y={PAD.top} width={slot} height={innerH} fill="transparent" onMouseEnter={() => setHover(i)} />
              </g>
            );
          })}
        </svg>
        {hover !== null && (
          <div className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"
            style={{ left: `${((PAD.left + slot * hover + slot / 2) / W) * 100}%` }}>
            <p className="font-medium text-slate-900">{label(data[hover].date)}</p>
            <p className="tabular-nums text-slate-600">{data[hover].ok} delivered · {data[hover].failed} failed</p>
          </div>
        )}
      </div>
    </section>
  );
}
