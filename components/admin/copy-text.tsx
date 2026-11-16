"use client";

import { useState } from "react";

/** A block of text with a Copy button (e.g. the URL parameters to paste into Facebook Ads Manager). */
export function CopyText({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="flex items-stretch gap-2">
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2.5 font-mono text-xs text-emerald-200">{text}</code>
      <button type="button"
        onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1800); } catch {} }}
        className={`shrink-0 rounded-lg px-3 text-sm font-semibold transition ${done ? "bg-emerald-600 text-white" : "bg-brand-700 text-white hover:bg-brand-800"}`}>
        {done ? "Copied ✓" : "Copy"}
      </button>
    </div>
  );
}
