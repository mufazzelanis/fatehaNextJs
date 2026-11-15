"use client";

import { useEffect, useState } from "react";
import { guideImage } from "@/lib/guides";

/**
 * Picture on a guide page. Phones download the small copy; tapping opens it full screen
 * (the pictures carry Bangla text, so readers can zoom in to read it). Escape / tap closes.
 */
export function GuideImage({ src, alt, sizes, priority, className = "" }: {
  src: string; alt: string; sizes: string; priority?: boolean; className?: string;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = old; window.removeEventListener("keydown", onKey); };
  }, [open]);
  const img = guideImage(src, sizes);
  const big = src.startsWith("/guides/") ? src : `/media/${src}?w=828`;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={`${alt || "ছবি"} — বড় করে দেখুন`}
        className={`group relative block w-full overflow-hidden rounded-2xl bg-[#e8f3ec] ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img {...img} alt={alt} width={1080} height={1080} loading={priority ? "eager" : "lazy"} decoding="async"
          fetchPriority={priority ? "high" : undefined}
          className="block h-auto w-full transition duration-500 group-hover:scale-[1.02]" />
        <span aria-hidden="true" className="absolute bottom-2.5 right-2.5 rounded-full bg-black/55 px-2.5 py-1 text-[13px] font-semibold text-white">🔍 বড় করুন</span>
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label={alt || "ছবি"} onClick={() => setOpen(false)}
          className="fixed inset-0 z-[60] grid place-items-center bg-black/90 p-3 animate-fade-in">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={big} alt={alt} className="max-h-[92dvh] w-auto max-w-full rounded-xl object-contain" />
          <button type="button" onClick={() => setOpen(false)} aria-label="বন্ধ করুন"
            className="absolute right-3 top-3 grid size-12 place-items-center rounded-full bg-white/15 text-2xl text-white">✕</button>
        </div>
      )}
    </>
  );
}
