// Browser side of Meta tracking. Every event fires the pixel and (when the Conversions API is on)
// the same event on the server with a shared event ID, so Meta counts it once.
import { trackServerEvent } from "@/app/actions/pixel";
import type { EventName } from "./shared";

type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue?: unknown[][]; loaded?: boolean; version?: string; push?: unknown };

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

export type PixelSetup = {
  /** Main site pixels. */
  pixelIds: string[];
  /** Landing slug → that page's pixels (used instead of the main ones). */
  scopes: Record<string, string[]>;
  browser: boolean;
  capi: boolean;
  serverPageView: boolean;
  events: Record<EventName, boolean>;
};

let setup: PixelSetup | null = null;
/** Pixels of the page being viewed — events go only to these (fbq trackSingle). */
let active: string[] | null = null;
const initialised = new Set<string>();
const pending: (() => void)[] = [];

function loadScript() {
  if (window.fbq) return;
  const fbq: Fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue!.push(args);
  };
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  window.fbq = fbq;
  window._fbq = fbq;
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);
}

/** Captures ?fbclid= into the _fbc cookie right away, so the server sees it on the very first request. */
function storeFbclid() {
  const fbclid = new URLSearchParams(window.location.search).get("fbclid");
  if (!fbclid || document.cookie.includes("_fbc=")) return;
  const value = `fb.1.${Date.now()}.${fbclid}`;
  document.cookie = `_fbc=${value}; path=/; max-age=${60 * 60 * 24 * 90}; SameSite=Lax`;
}

export function initPixel(config: PixelSetup) {
  if (setup) return;
  setup = config;
  storeFbclid();
}

/** Which pixels this page reports to: a landing page's own (by slug), or the main site's. */
export function pixelsForPage(config: PixelSetup, pathname: string, search: string) {
  const slug = pathname === "/order/success" ? new URLSearchParams(search).get("l") ?? "" : pathname.split("/")[1] ?? "";
  return config.scopes[slug] ?? config.pixelIds;
}

/** Switches the page's pixels (initialising any new one) and releases events that were waiting. */
export function activatePixels(ids: string[]) {
  active = ids;
  if (setup?.browser && ids.length) {
    loadScript();
    for (const id of ids) {
      if (initialised.has(id)) continue;
      initialised.add(id);
      window.fbq!("init", id);
    }
  }
  pending.splice(0).forEach((run) => run());
}

export function newEventId(prefix: string) {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${random}`.slice(0, 80);
}

type TrackOptions = { eventId?: string; quantity?: number; serverSide?: boolean; items?: { id: number; qty: number }[] };

/** Fires a standard event in the browser and mirrors it to the Conversions API. Queues until the pixel is initialised. */
export function track(name: string, params: Record<string, unknown> = {}, options: TrackOptions = {}) {
  const run = () => {
    if (!setup || setup.events[name as EventName] === false) return;
    const eventId = options.eventId ?? newEventId(name.toLowerCase());
    if (setup.browser && window.fbq) for (const id of active ?? []) window.fbq("trackSingle", id, name, params, { eventID: eventId });
    const serverAllowed = options.serverSide !== false && setup.capi && (name !== "PageView" || setup.serverPageView);
    if (serverAllowed) {
      trackServerEvent({ name, eventId, url: window.location.href, quantity: options.quantity, items: options.items }).catch(() => {});
    }
  };
  if (setup && active) run();
  else pending.push(run);
}
