"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { AD_KEYS, FIRST_KEY, LAST_KEY, UTM_KEYS, type Touch } from "@/lib/attribution";

const FIRST_TTL = 90 * 86_400_000; // a first visit older than 90 days is replaced

function read(key: string): Touch | null {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null") as Touch | null;
  } catch {
    return null;
  }
}
function write(key: string, t: Touch) {
  try { localStorage.setItem(key, JSON.stringify(t)); } catch {}
}

/** A new visit = arriving with UTM / click-ID tags or from another website. Moving around inside the site is not one. */
function arrival(): Touch | null {
  const q = new URLSearchParams(location.search);
  let ref = "";
  try { ref = document.referrer ? new URL(document.referrer).hostname : ""; } catch {}
  const external = !!ref && ref !== location.hostname;
  const tagged = UTM_KEYS.some((k) => q.get(k)) || q.has("fbclid") || q.has("gclid");
  if (!external && !tagged) return null;
  const t: Touch = { url: `${location.origin}${location.pathname}`, source: external ? ref : "(direct)", at: Date.now() };
  for (const k of [...UTM_KEYS, ...AD_KEYS]) {
    const v = q.get(k);
    // Facebook leaves "{{adset.name}}" untouched where it can't fill it in — skip those.
    if (v && !/^\{\{.*\}\}$/.test(v)) t[k] = v.slice(0, 200);
  }
  if (q.has("fbclid")) t.fbclid = true;
  if (q.has("gclid")) t.gclid = true;
  return t;
}

/**
 * Remembers where this visitor came from (first visit and latest visit) for the order attribution card.
 * Runs on every public page; the checkout forms send it with the order.
 */
export function AttributionTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    const now = arrival();
    const first = read(FIRST_KEY);
    const last = read(LAST_KEY);
    if (now) {
      write(LAST_KEY, now);
      if (!first || Date.now() - first.at > FIRST_TTL) write(FIRST_KEY, now);
    } else if (!first && !last) {
      // Typed the address / bookmark: a direct visit.
      const direct: Touch = { url: `${location.origin}${location.pathname}`, source: "(direct)", at: Date.now() };
      write(FIRST_KEY, direct);
      write(LAST_KEY, direct);
    }
  }, [pathname]);
  return null;
}
