// Turns a browser user-agent string into a short "Phone · Android · Chrome" description (client-safe, no dependencies).

export type DeviceKind = "phone" | "tablet" | "computer" | "bot";
export type DeviceInfo = { kind: DeviceKind; os: string; browser: string };

export function parseDevice(ua: string | null | undefined): DeviceInfo | null {
  if (!ua) return null;
  const s = ua.toLowerCase();
  if (/bot|crawler|spider|crawl|facebookexternalhit|headless|lighthouse|preview/.test(s)) return { kind: "bot", os: "", browser: "Bot" };

  const os =
    /iphone|ipod/.test(s) ? "iPhone"
    : /ipad/.test(s) || (/macintosh/.test(s) && /mobile/.test(s)) ? "iPad"
    : /android/.test(s) ? `Android${s.match(/android (\d+)/)?.[1] ? ` ${s.match(/android (\d+)/)![1]}` : ""}`
    : /windows/.test(s) ? "Windows"
    : /mac os x|macintosh/.test(s) ? "Mac"
    : /cros/.test(s) ? "ChromeOS"
    : /linux/.test(s) ? "Linux"
    : "";

  const browser =
    /fban|fbav|fb_iab/.test(s) ? "Facebook app"
    : /instagram/.test(s) ? "Instagram app"
    : /\bwv\b|; wv\)/.test(s) ? "In-app browser"
    : /edg\//.test(s) ? "Edge"
    : /opr\/|opera/.test(s) ? "Opera"
    : /samsungbrowser/.test(s) ? "Samsung Internet"
    : /ucbrowser/.test(s) ? "UC Browser"
    : /firefox|fxios/.test(s) ? "Firefox"
    : /crios|chrome\//.test(s) ? "Chrome"
    : /safari/.test(s) ? "Safari"
    : "";

  const tablet = /ipad|tablet/.test(s) || (/android/.test(s) && !/mobile/.test(s));
  const phone = !tablet && /mobile|iphone|ipod|android/.test(s);
  return { kind: tablet ? "tablet" : phone ? "phone" : "computer", os, browser };
}

export const DEVICE_KIND_LABEL: Record<DeviceKind, string> = { phone: "Phone", tablet: "Tablet", computer: "Computer", bot: "Bot" };

/** Device kinds the admin can filter by ("human" = everything except bots). */
export const DEVICE_FILTERS = ["human", "phone", "tablet", "computer", "bot"] as const;
export type DeviceFilter = (typeof DEVICE_FILTERS)[number];
export const DEVICE_FILTER_LABEL: Record<DeviceFilter, string> = {
  human: "No bots", phone: "Phone", tablet: "Tablet", computer: "Computer", bot: "Bots only",
};

/**
 * The same rules as parseDevice(), as SQL — so filters and counts in the database match the Device column.
 * `ua` is a trusted SQL expression (a column), never user input.
 */
export function deviceKindSql(ua: string) {
  const u = `LOWER(COALESCE(${ua}, ''))`;
  return `(CASE
    WHEN ${u} = '' THEN 'unknown'
    WHEN ${u} REGEXP 'bot|crawler|spider|crawl|facebookexternalhit|headless|lighthouse|preview' THEN 'bot'
    WHEN ${u} REGEXP 'ipad|tablet' OR (${u} LIKE '%android%' AND ${u} NOT LIKE '%mobile%') THEN 'tablet'
    WHEN ${u} REGEXP 'mobile|iphone|ipod|android' THEN 'phone'
    ELSE 'computer' END)`;
}
