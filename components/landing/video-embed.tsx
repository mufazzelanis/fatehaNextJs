"use client";

import { useState } from "react";

/**
 * Click-to-play video: shows a thumbnail with a play button and only loads the YouTube / Facebook player
 * when the visitor taps it — the page stays fast (no third-party scripts on load).
 */
export function VideoEmbed({ embed, thumb, title }: { embed: string; thumb: string | null; title: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-lg sm:rounded-xl">
      {playing ? (
        <iframe src={embed} title={title || "Video"} className="absolute inset-0 size-full border-0"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
      ) : (
        <button type="button" onClick={() => setPlaying(true)} aria-label={`Play video${title ? `: ${title}` : ""}`}
          className="group absolute inset-0 grid size-full place-items-center">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover opacity-90 transition group-hover:opacity-100" />
          ) : (
            <span className="absolute inset-0 bg-linear-to-br from-[#1877f2] to-[#0b3d91]" />
          )}
          <span className="relative grid size-20 place-items-center rounded-full bg-red-600 text-white shadow-[0_8px_30px_rgb(0_0_0/0.45)] ring-4 ring-white/80 transition group-hover:scale-110 sm:size-16">
            <svg viewBox="0 0 24 24" width="34" height="34" fill="currentColor" aria-hidden="true" className="ml-1"><path d="M8 5v14l11-7z" /></svg>
          </span>
          <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-[15px] font-semibold text-white sm:text-xs">ভিডিওটি দেখতে চাপুন</span>
        </button>
      )}
    </div>
  );
}
