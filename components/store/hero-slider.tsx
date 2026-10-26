"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { HeroSlide } from "@/lib/store-config";
import { ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon } from "../icons";

const TONES: Record<HeroSlide["tone"], { bg: string; glow: string; chip: string }> = {
  teal: { bg: "from-[#0fb5ba] via-fb-600 to-[#0a5d63]", glow: "bg-[#7ff3f0]/40", chip: "bg-white/15" },
  dark: { bg: "from-[#1f2937] via-[#243b47] to-[#0b5c63]", glow: "bg-fb-400/35", chip: "bg-fb-400/20" },
  sunset: { bg: "from-[#ff8a3d] via-[#f43f5e] to-[#9d174d]", glow: "bg-amber-300/40", chip: "bg-white/15" },
};
const INTERVAL = 5500;

/** Auto-playing hero carousel: swipe, arrows, progress dots; pauses on hover/touch and when the tab is hidden. */
export function HeroSlider({ slides, art }: { slides: HeroSlide[]; art: string[][] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const n = slides.length;
  const go = useCallback((to: number) => setI(((to % n) + n) % n), [n]);

  // Autoplay is driven by the progress bar's animation (see the dots below), so pausing freezes both together.
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);
  const running = !paused && !hidden;

  return (
    <section className="relative overflow-hidden rounded-[22px] shadow-xl shadow-fb-900/10 sm:rounded-3xl" aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; setPaused(true); }}
      onTouchEnd={(e) => {
        const t = touch.current;
        touch.current = null;
        setPaused(false);
        if (!t) return;
        const dx = e.changedTouches[0].clientX - t.x;
        const dy = e.changedTouches[0].clientY - t.y;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(i + (dx < 0 ? 1 : -1));
      }}>
      <div className="flex transition-transform duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)]" style={{ transform: `translateX(-${i * 100}%)` }}>
        {slides.map((s, k) => {
          const tone = TONES[s.tone];
          const active = k === i;
          const pics = s.image ? [`/media/${s.image}`] : (art[k] ?? []);
          const enter = `transition-all duration-700 ${active ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`;
          return (
            <div key={k} className={`relative w-full shrink-0 overflow-hidden bg-linear-to-br ${tone.bg}`} aria-hidden={!active} role="group" aria-roledescription="slide" aria-label={`${k + 1} of ${n}`}>
              {/* decoration */}
              <div className={`absolute -right-10 -top-16 size-56 rounded-full blur-3xl sm:size-96 ${tone.glow}`} />
              <div className="absolute -bottom-20 -left-10 size-52 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.12)_1px,transparent_1px)] bg-size-[18px_18px] mask-[linear-gradient(to_left,black,transparent_70%)]" />

              <div className="relative grid min-h-[208px] grid-cols-[1fr_38%] items-center gap-2 py-6 pl-5 pr-3 sm:min-h-[340px] sm:grid-cols-[1.1fr_0.9fr] sm:gap-4 sm:px-12 sm:py-10 lg:min-h-[400px]">
                <div className="relative z-10 min-w-0 text-white">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] backdrop-blur sm:text-xs ${tone.chip} ${enter}`}>
                    <span className="size-1.5 rounded-full bg-white" /> FatehaBD
                  </span>
                  <h2 className={`mt-2.5 line-clamp-3 text-[21px] font-extrabold leading-[1.12] tracking-tight drop-shadow-sm sm:mt-4 sm:text-4xl lg:text-5xl ${enter} delay-75`}>{s.title}</h2>
                  <p className={`mt-2 line-clamp-2 max-w-md text-[12.5px] leading-relaxed text-white/85 sm:mt-3 sm:line-clamp-none sm:text-base ${enter} delay-150`}>{s.subtitle}</p>
                  <Link href={s.link} tabIndex={active ? 0 : -1}
                    className={`group/cta mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-white pl-4 pr-1.5 text-[13px] font-bold text-ink shadow-lg shadow-black/15 transition hover:shadow-xl sm:mt-6 sm:h-12 sm:pl-6 sm:text-sm ${enter} delay-200`}>
                    {s.cta}
                    <span className="grid size-7 place-items-center rounded-full bg-ink text-white transition group-hover/cta:translate-x-0.5 sm:size-9"><ArrowRightIcon className="size-3.5 sm:size-4" /></span>
                  </Link>
                </div>

                {/* product art — shown on phones too */}
                <div className="relative flex h-full min-h-[150px] items-center justify-center">
                  <div className="absolute aspect-square w-[92%] max-w-80 rounded-full bg-white/15 ring-1 ring-white/25 sm:w-[80%]" />
                  {pics.length === 1 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={pics[0]} alt="" className={`relative max-h-40 w-auto max-w-full object-contain drop-shadow-2xl transition duration-700 sm:max-h-80 ${active ? "scale-100 opacity-100" : "scale-90 opacity-0"}`} />
                  ) : (
                    <div className="relative h-36 w-full sm:h-72">
                      {pics.slice(0, 2).map((src, j) => (
                        <div key={j}
                          className={`absolute grid aspect-square place-items-center rounded-2xl bg-white p-2 shadow-2xl transition duration-700 sm:rounded-3xl sm:p-4 ${
                            j === 0 ? "left-0 top-0 w-[68%] -rotate-6 sm:left-[4%] sm:w-[52%]" : "bottom-0 right-0 w-[60%] rotate-6 sm:right-[4%] sm:w-[46%]"
                          } ${active ? "translate-y-0 opacity-100" : j ? "translate-y-6 opacity-0" : "-translate-y-6 opacity-0"}`}
                          style={{ transitionDelay: active ? `${150 + j * 120}ms` : "0ms" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt="" className="max-h-full max-w-full object-contain" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {n > 1 && (
        <>
          <button type="button" onClick={() => go(i - 1)} aria-label="Previous slide"
            className="absolute left-3 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/20 text-white backdrop-blur transition hover:scale-105 hover:bg-white/35 sm:grid">
            <ChevronLeftIcon className="size-5" />
          </button>
          <button type="button" onClick={() => go(i + 1)} aria-label="Next slide"
            className="absolute right-3 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/20 text-white backdrop-blur transition hover:scale-105 hover:bg-white/35 sm:grid">
            <ChevronRightIcon className="size-5" />
          </button>
          <div className="absolute bottom-3 left-5 flex items-center gap-1.5 sm:bottom-5 sm:left-1/2 sm:-translate-x-1/2">
            {slides.map((_, k) => (
              <button key={k} type="button" onClick={() => go(k)} aria-label={`Go to slide ${k + 1}`} aria-current={k === i}
                className={`relative h-1.5 overflow-hidden rounded-full transition-all duration-300 ${k === i ? "w-8 bg-white/35" : "w-1.5 bg-white/50 hover:bg-white/80"}`}>
                {k === i && (
                  <span key={i} className="absolute inset-0 origin-left rounded-full bg-white"
                    onAnimationEnd={() => go(i + 1)}
                    style={{ animation: `slide-progress ${INTERVAL}ms linear forwards`, animationPlayState: running ? "running" : "paused" }} />
                )}
              </button>
            ))}
          </div>
          <span className="absolute bottom-2.5 right-4 text-[10px] font-semibold tabular-nums text-white/70 sm:hidden">{String(i + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}</span>
        </>
      )}
    </section>
  );
}
