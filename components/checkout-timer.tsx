"use client";

import { useEffect, useRef } from "react";

/**
 * Hidden fields that tell the server how long the customer took to order:
 * t_page = seconds since the page was opened, t_form = seconds since they first touched the form.
 * Very short times are a sign of bots or copy-paste fake orders (shown on the admin order page).
 */
export function CheckoutTimer() {
  const page = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const root = page.current?.form;
    let started: number | null = null;
    const tick = () => {
      const now = performance.now();
      if (page.current) page.current.value = String(Math.round(now / 1000));
      if (form.current && started !== null) form.current.value = String(Math.round((now - started) / 1000));
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
    </>
  );
}
