"use client";

import { useEffect, useState } from "react";
import { PhoneIcon, WhatsappIcon } from "../icons";

type OrderBar = { text: string; price: string; backgroundColor: string; color: string };

/**
 * Counts one view per landing per browser session, shows the draft-preview ribbon, floating contact buttons
 * and — on phones — a large "order" bar fixed to the bottom once the visitor scrolls (hidden at the order form itself).
 */
export function LandingExtras({ landingId, preview, phone, whatsapp, orderBar }: { landingId: number; preview: boolean; phone: string; whatsapp: string; orderBar?: OrderBar }) {
  const [showBar, setShowBar] = useState(false);
  useEffect(() => {
    if (!orderBar) return;
    const form = document.getElementById("order");
    let atForm = false;
    const update = () => setShowBar(!atForm && window.scrollY > 420);
    const io = form ? new IntersectionObserver(([e]) => { atForm = e.isIntersecting; update(); }, { rootMargin: "0px 0px -30% 0px" }) : null;
    if (form && io) io.observe(form);
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => { io?.disconnect(); window.removeEventListener("scroll", update); };
  }, [orderBar]);

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
        <div className={`fixed right-4 z-40 flex flex-col gap-3 pb-[env(safe-area-inset-bottom)] transition-[bottom] duration-300 sm:bottom-4 ${showBar ? "bottom-[92px]" : "bottom-4"}`}>
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
      {orderBar && (
        <div inert={!showBar}
          className={`fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-white/95 px-3 pt-2.5 shadow-[0_-8px_24px_-8px_rgb(0_0_0/0.25)] backdrop-blur transition-transform duration-300 pb-[calc(0.625rem+env(safe-area-inset-bottom))] sm:hidden ${showBar ? "translate-y-0" : "translate-y-full"}`}>
          <a href="#order" style={{ backgroundColor: orderBar.backgroundColor, color: orderBar.color }}
            className="flex h-[62px] items-center justify-between gap-3 rounded-2xl pl-5 pr-2 font-bold shadow-md active:scale-[0.98]">
            <span className="text-[20px] leading-tight">{orderBar.text}</span>
            <span className="rounded-xl bg-white/95 px-3 py-2 text-[19px] font-extrabold tabular-nums text-[#111]">{orderBar.price}</span>
          </a>
        </div>
      )}
    </>
  );
}
