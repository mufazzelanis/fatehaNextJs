"use client";

import { useEffect, useRef } from "react";
import { FIRST_KEY, LAST_KEY } from "@/lib/attribution";

/**
 * Hidden fields that tell the server how long the customer took to order:
 * t_page = seconds since the page was opened, t_form = seconds since they first touched the form.
 * Very short times are a sign of bots or copy-paste fake orders (shown on the admin order page).
 * Also sends the visitor id (live visitors) and where the customer came from (order attribution).
 */
export function CheckoutTimer() {
  const page = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLInputElement>(null);
  const visitor = useRef<HTMLInputElement>(null);
  const attr = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const root = page.current?.form;
    let started: number | null = null;
    const tick = () => {
      const now = performance.now();
      if (page.current) page.current.value = String(Math.round(now / 1000));
      if (form.current && started !== null) form.current.value = String(Math.round((now - started) / 1000));
      // Landing-page visitor id (created by the live-visitors heartbeat, maybe a moment after this form mounts),
      // so the order can be tied to the visit that produced it.
      try { if (visitor.current) visitor.current.value = localStorage.getItem("fb_vid") ?? ""; } catch {}
      if (attr.current) {
        const d = new Date();
        let first = null, last = null;
        try {
          first = JSON.parse(localStorage.getItem(FIRST_KEY) ?? "null");
          last = JSON.parse(localStorage.getItem(LAST_KEY) ?? "null");
        } catch {}
        attr.current.value = JSON.stringify({
          first, last,
          browser: {
            hour: `${d.getHours()}-${d.getHours() + 1}`,
            day: d.toLocaleDateString("en-US", { weekday: "long" }),
            month: d.toLocaleDateString("en-US", { month: "long" }),
            tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        });
      }
    };
    const onFirstTouch = () => {
      if (started === null) started = performance.now();
      tick();
    };
    const events = ["focusin", "pointerdown", "input", "change"] as const;
    for (const e of events) root?.addEventListener(e, onFirstTouch);
    // Kept current every second (and on every touch), so the values are right whenever the form is sent.
    const id = window.setInterval(tick, 1000);
    tick();
    return () => {
      for (const e of events) root?.removeEventListener(e, onFirstTouch);
      window.clearInterval(id);
    };
  }, []);

  return (
    <>
      <input ref={page} type="hidden" name="t_page" defaultValue="" />
      <input ref={form} type="hidden" name="t_form" defaultValue="" />
      <input ref={visitor} type="hidden" name="vid" defaultValue="" />
      <input ref={attr} type="hidden" name="attr" defaultValue="" />
    </>
  );
}
