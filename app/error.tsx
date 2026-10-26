"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Friendly fallback when a page fails to render (e.g. the database is briefly unreachable). */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="grid min-h-[70vh] flex-1 place-items-center bg-[#f4f6f8] px-4 py-16 font-ui text-ink">
      <div className="max-w-md text-center">
        <p className="text-5xl">⚠️</p>
        <h1 className="mt-4 text-2xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-slate-500">দুঃখিত, একটি সমস্যা হয়েছে। আবার চেষ্টা করুন — সমস্যা থাকলে কিছুক্ষণ পরে আসুন।</p>
        {error.digest && <p className="mt-2 font-mono text-xs text-slate-400">Ref: {error.digest}</p>}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => reset()} className="inline-flex h-11 items-center rounded-xl bg-fb-500 px-6 font-semibold text-white transition hover:bg-fb-600">Try again</button>
          <Link href="/" className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-6 font-semibold text-ink transition hover:border-fb-300">Go to homepage</Link>
        </div>
      </div>
    </main>
  );
}
