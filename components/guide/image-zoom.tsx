"use client";

import { useEffect, useState } from "react";

/**
 * One full-screen picture viewer for the whole page: opens for any [data-zoom] button
 * (see GuideImage). Escape, the ✕ button or a tap anywhere closes it.
 */
export function ImageZoom() {
  const [open, setOpen] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>("[data-zoom]");
      if (!el?.dataset.zoom) return;
      e.preventDefault();
      setOpen({ src: el.dataset.zoom, alt: el.dataset.zoomAlt ?? "" });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = old; window.removeEventListener("keydown", onKey); };
  }, [open]);

  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label={open.alt || "ছবি"} onClick={() => setOpen(null)}
      className="fixed inset-0 z-[60] grid place-items-center bg-black/90 p-3 animate-fade-in">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={open.src} alt={open.alt} className="max-h-[92dvh] w-auto max-w-full rounded-xl object-contain" />
      <button type="button" onClick={() => setOpen(null)} aria-label="বন্ধ করুন"
        className="absolute right-3 top-3 grid size-12 place-items-center rounded-full bg-white/15 text-2xl text-white">✕</button>
    </div>
  );
}
