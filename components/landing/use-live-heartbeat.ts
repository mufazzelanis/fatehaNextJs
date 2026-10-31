"use client";

import { useEffect } from "react";
import { HEARTBEAT_MS, type LiveDevice, type LiveSection, type LiveSource } from "@/lib/live";

/** Same id the checkout form sends with an order, so a visit can be linked to the order it produced. */
export function visitorId() {
  try {
    let id = localStorage.getItem("fb_vid");
    if (!id || !/^[a-z0-9]{12,24}$/.test(id)) {
      id = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => (b % 36).toString(36)).join("");
      localStorage.setItem("fb_vid", id);
    }
    return id;
  } catch {
    return Math.random().toString(36).slice(2, 14).padEnd(12, "0");
  }
}

function trafficSource(): LiveSource {
  const q = new URLSearchParams(location.search);
  const utm = (q.get("utm_source") ?? "").toLowerCase();
  if (q.has("fbclid") || /^(fb|facebook|ig|instagram|meta)/.test(utm)) return "facebook";
  if (q.has("gclid") || utm.startsWith("google")) return "google";
  let ref = "";
  try { ref = document.referrer ? new URL(document.referrer).hostname : ""; } catch {}
  if (/facebook|fb\.|instagram|messenger/.test(ref)) return "facebook";
  if (/google\./.test(ref)) return "google";
  if (ref && ref !== location.hostname) return "other";
  return "direct";
}

function deviceType(): LiveDevice {
  if (!matchMedia("(pointer: coarse)").matches) return "desktop";
  return Math.min(screen.width, screen.height) >= 700 ? "tablet" : "phone";
}

/**
 * Tells the server this landing page is open (admin "Live Visitors"):
 * a heartbeat every 15s while the tab is visible, an update when the visitor reaches the order form,
 * every click on an element marked data-track="order|sticky|submit|call|whatsapp", and a goodbye when the page is hidden or closed.
 */
export function useLiveHeartbeat(landingId: number, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const sid = visitorId();
    const src = trafficSource();
    const dev = deviceType();
    const form = document.getElementById("order");
    let atForm = false;
    let section: LiveSection = "top";

    const send = (leave = false, click?: { label: string; kind: string }) => {
      const body = JSON.stringify(leave ? { id: landingId, sid, leave: 1 } : { id: landingId, sid, s: section, src, dev, ...(click ? { click: click.label, kind: click.kind } : {}) });
      // sendBeacon survives the page closing; text/plain avoids a CORS preflight.
      if (!navigator.sendBeacon?.("/api/live", new Blob([body], { type: "text/plain" }))) {
        fetch("/api/live", { method: "POST", body, keepalive: true }).catch(() => {});
      }
    };
    const currentSection = (): LiveSection => (atForm ? "form" : window.scrollY < window.innerHeight * 0.7 ? "top" : "content");
    const onMove = () => {
      const next = currentSection();
      if (next !== section) { section = next; send(); }
    };

    const io = form ? new IntersectionObserver(([e]) => { atForm = e.isIntersecting; onMove(); }, { threshold: 0.15 }) : null;
    if (form && io) io.observe(form);
    let scrollTimer = 0;
    const onScroll = () => { window.clearTimeout(scrollTimer); scrollTimer = window.setTimeout(onMove, 400); };
    window.addEventListener("scroll", onScroll, { passive: true });
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>("[data-track]");
      if (!el) return;
      const label = (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80) || el.dataset.track!;
      send(false, { label, kind: el.dataset.track! });
    };
    document.addEventListener("click", onClick, true);

    let beat = 0;
    const start = () => { window.clearInterval(beat); section = currentSection(); send(); beat = window.setInterval(() => send(), HEARTBEAT_MS); };
    const stop = () => { window.clearInterval(beat); send(true); };
    const onVisibility = () => (document.visibilityState === "visible" ? start() : stop());
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", stop);
    if (document.visibilityState === "visible") start();

    return () => {
      stop();
      io?.disconnect();
      window.clearTimeout(scrollTimer);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", stop);
    };
  }, [landingId, enabled]);
}
