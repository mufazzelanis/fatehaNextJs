"use client";

import { useEffect } from "react";
import { PhoneIcon, WhatsappIcon } from "../icons";

/** Counts one view per landing per browser session, shows the draft-preview ribbon and floating contact buttons. */
export function LandingExtras({ landingId, preview, phone, whatsapp }: { landingId: number; preview: boolean; phone: string; whatsapp: string }) {
  useEffect(() => {
    if (preview) return;
    const key = `fb_lv_${landingId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {}
    const body = JSON.stringify({ id: landingId });
    if (!navigator.sendBeacon?.("/api/landing-view", new Blob([body], { type: "application/json" }))) {
      fetch("/api/landing-view", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
    }
  }, [landingId, preview]);

  return (
    <>
      {preview && (
        <div className="fixed inset-x-0 top-0 z-50 bg-amber-400 px-4 py-2 text-center font-ui text-sm font-semibold text-amber-950 shadow">
          Preview — this landing page is not published. Only signed-in staff can see it.
        </div>
      )}
      {(phone || whatsapp) && (
        <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-3 pb-[env(safe-area-inset-bottom)]">
          {whatsapp && (
            <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"
              className="grid size-13 place-items-center rounded-full bg-[#25d366] text-white shadow-lg shadow-black/20 transition hover:scale-105">
              <WhatsappIcon className="size-7" />
            </a>
          )}
          {phone && (
            <a href={`tel:${phone}`} aria-label="Call us"
              className="grid size-13 animate-pulse-ring place-items-center rounded-full bg-[#e11d48] text-white shadow-lg shadow-black/20 transition hover:scale-105">
              <PhoneIcon className="size-6" />
            </a>
          )}
        </div>
      )}
    </>
  );
}
