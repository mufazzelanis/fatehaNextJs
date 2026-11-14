// Order attribution (like WooCommerce "Origin"): where the customer first came from, where the visit that
// ended in the order came from (UTM tags, referrer, landing page), and the customer's local time.
// Captured in the browser (components/attribution-tracker.tsx), sent with the order, shown on the order page.

export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
export type UtmKey = (typeof UTM_KEYS)[number];

export type Touch = {
  /** First page of that visit (no query string). */
  url: string;
  /** Referrer host ("m.facebook.com"), or "(direct)". */
  source: string;
  /** Unix ms. */
  at: number;
} & Partial<Record<UtmKey, string>> & { fbclid?: boolean; gclid?: boolean };

export type Attribution = {
  first: Touch | null;
  last: Touch | null;
  /** Customer's browser clock when ordering. */
  browser?: { hour: string; day: string; month: string; tz?: string };
};

export const FIRST_KEY = "fb_attr_first";
export const LAST_KEY = "fb_attr_last";

const s = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function cleanTouch(raw: unknown): Touch | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  let url = s(r.url, 500);
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") url = "";
  } catch {
    url = "";
  }
  const t: Touch = { url, source: s(r.source, 120) || "(direct)", at: Number.isFinite(Number(r.at)) ? Number(r.at) : 0 };
  for (const k of UTM_KEYS) {
    const v = s(r[k], 200);
    if (v) t[k] = v;
  }
  if (r.fbclid === true) t.fbclid = true;
  if (r.gclid === true) t.gclid = true;
  return t.url || t.utm_source || t.source !== "(direct)" ? t : null;
}

/** Validates what the browser sent (never trusted as-is). */
export function parseAttribution(raw: unknown): Attribution | null {
  let v: unknown = raw;
  if (typeof raw === "string") {
    try {
      v = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!v || typeof v !== "object") return null;
  const r = v as Record<string, unknown>;
  const first = cleanTouch(r.first);
  const last = cleanTouch(r.last) ?? first;
  const b = r.browser && typeof r.browser === "object" ? (r.browser as Record<string, unknown>) : null;
  const browser = b ? { hour: s(b.hour, 10), day: s(b.day, 12), month: s(b.month, 12), tz: s(b.tz, 60) || undefined } : undefined;
  if (!first && !last && !browser) return null;
  return { first, last, browser };
}

/** Campaign / source shown in lists and filters — from the visit that led to the order (else the first one). */
export function headline(a: Attribution | null) {
  const t = a?.last?.utm_campaign || a?.last?.utm_source ? a.last : a?.first;
  return {
    source: t?.utm_source || (t?.source && t.source !== "(direct)" ? t.source : "") || (t ? "(direct)" : ""),
    campaign: t?.utm_campaign || "",
  };
}
