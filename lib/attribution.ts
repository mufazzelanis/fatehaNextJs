// Order attribution (like WooCommerce "Origin"): where the customer first came from, where the visit that
// ended in the order came from (UTM tags, referrer, landing page), and the customer's local time.
// Captured in the browser (components/attribution-tracker.tsx), sent with the order, shown on the order page.

export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
export type UtmKey = (typeof UTM_KEYS)[number];

/**
 * Extra ad details Facebook can add to the link (Ads Manager → URL parameters), e.g.
 * campaign_name={{campaign.name}}&adset_name={{adset.name}}&ad_name={{ad.name}}&placement={{placement}}&site_source_name={{site_source_name}}
 */
export const AD_KEYS = ["campaign_name", "adset_name", "ad_name", "placement", "site_source_name"] as const;
export type AdKey = (typeof AD_KEYS)[number];

/** The URL parameters to paste into Facebook Ads Manager (ad → Tracking → URL parameters). */
export const FB_URL_PARAMS =
  "utm_source=fb&utm_medium=paid&utm_campaign={{campaign.id}}&utm_content={{adset.id}}&utm_term={{ad.id}}" +
  "&campaign_name={{campaign.name}}&adset_name={{adset.name}}&ad_name={{ad.name}}&placement={{placement}}&site_source_name={{site_source_name}}";

/** Is this visit from a Facebook / Instagram ad? (then utm_campaign / content / term are campaign / ad set / ad IDs) */
export const isFacebookTouch = (t: Pick<Touch, "utm_source" | "fbclid"> | null | undefined) =>
  !!t && (/^(fb|facebook|ig|instagram|meta|an|msg)/i.test(t.utm_source ?? "") || !!t.fbclid);

export type Touch = {
  /** First page of that visit (no query string). */
  url: string;
  /** Referrer host ("m.facebook.com"), or "(direct)". */
  source: string;
  /** Unix ms. */
  at: number;
} & Partial<Record<UtmKey, string>> & Partial<Record<AdKey, string>> & { fbclid?: boolean; gclid?: boolean };

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
  for (const k of AD_KEYS) {
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
    /** Facebook: ad set ID; other ads: the ad / content tag. */
    content: t?.utm_content || "",
    /** Facebook: ad ID; Google: the keyword. */
    term: t?.utm_term || "",
    /** Names Facebook put in the link (if the URL parameters include them). */
    names: { campaign: t?.campaign_name || "", adset: t?.adset_name || "", ad: t?.ad_name || "" },
    facebook: isFacebookTouch(t),
  };
}
