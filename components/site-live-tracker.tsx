"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { HEARTBEAT_MS, isMainSitePath, MAIN_SITE_ID, mainSiteSection, type LiveSection } from "@/lib/live";
import { deviceType, trafficSource, visitorId } from "./landing/use-live-heartbeat";

/**
 * Live Visitors for the main website: one visit per browser (landing id 0) that follows the visitor from page to page —
 * a heartbeat every 15s while the tab is visible, an update on every navigation (current page + section),
 * clicks on [data-track] buttons (add to cart / order now / place order) and a goodbye when the tab is hidden or closed.
 * Landing pages run their own heartbeat (components/landing/use-live-heartbeat.ts).
 */
export function SiteLiveTracker() {
  const pathname = usePathname();
  const state = useRef<{ path: string; on: boolean; send: (leave?: boolean, click?: { label: string; kind: string }) => void } | null>(null);

  // Set up once: the visit spans client-side navigations.
  useEffect(() => {
    const sid = visitorId();
    const src = trafficSource();
    const dev = deviceType();
    const st = {
      path: location.pathname,
      on: isMainSitePath(location.pathname, location.search),
      send(leave = false, click?: { label: string; kind: string }) {
        const section: LiveSection = mainSiteSection(st.path);
        const body = JSON.stringify(leave
          ? { id: MAIN_SITE_ID, sid, leave: 1 }
          : { id: MAIN_SITE_ID, sid, s: section, p: st.path, src, dev, ...(click ? { click: click.label, kind: click.kind } : {}) });
        if (!navigator.sendBeacon?.("/api/live", new Blob([body], { type: "text/plain" }))) {
          fetch("/api/live", { method: "POST", body, keepalive: true }).catch(() => {});
        }
      },
    };
    state.current = st;

    const onClick = (e: MouseEvent) => {
      if (!st.on) return;
      const el = (e.target as Element | null)?.closest<HTMLElement>("[data-track]");
      if (!el) return;
      const label = (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80) || el.dataset.track!;
      st.send(false, { label, kind: el.dataset.track! });
    };
    document.addEventListener("click", onClick, true);

    let beat = 0;
    const start = () => {
      window.clearInterval(beat);
      if (st.on) st.send();
      // Keeps ticking off-site too, so navigating back to a shop page resumes the heartbeat.
      beat = window.setInterval(() => st.on && st.send(), HEARTBEAT_MS);
    };
    const stop = () => { window.clearInterval(beat); if (st.on) st.send(true); };
    const onVisibility = () => (document.visibilityState === "visible" ? start() : stop());
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", stop);
    if (document.visibilityState === "visible") start();

    return () => {
      stop();
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", stop);
    };
  }, []);

  // Navigation inside the site: report the new page right away (or say goodbye when leaving for a landing / admin page).
  useEffect(() => {
    const st = state.current;
    if (!st || st.path === pathname) return;
    const was = st.on;
    st.path = pathname;
    st.on = isMainSitePath(pathname, location.search);
    if (st.on) st.send();
    else if (was) st.send(true);
  }, [pathname]);

  return null;
}
