import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { query } from "../db";
import { EVENT_NAMES, type EventName, type PurchaseTrigger, type PublicPixelConfig } from "./shared";

export const MARKETING_TAG = "marketing";
export const DEFAULT_API_VERSION = "v23.0";
export const MAX_PIXELS = 5;

export type PixelEntry = {
  id: string;
  label: string;
  /** Secret — never pass to client components. */
  token: string;
};

export type MarketingConfig = {
  /** Main site pixels (landing pages can have their own — see getLandingPixelScopes). */
  pixels: PixelEntry[];
  browserEnabled: boolean;
  /** The browser-pixel switch itself (on even when only landing pages have pixels). */
  browserSwitch: boolean;
  /** True when the server switch is on and at least one pixel has a token. */
  capiEnabled: boolean;
  capiSwitch: boolean;
  testEventCode: string;
  apiVersion: string;
  purchaseTrigger: PurchaseTrigger;
  purchaseValue: "total" | "subtotal";
  serverPageView: boolean;
  events: Record<EventName, boolean>;
};

const KEYS = [
  "fb_pixels",
  "fb_pixel_id",
  "fb_capi_token",
  "fb_browser_enabled",
  "fb_capi_enabled",
  "fb_test_event_code",
  "fb_api_version",
  "fb_purchase_trigger",
  "fb_purchase_value",
  "fb_server_pageview",
  "fb_events",
] as const;

function parsePixels(v: Record<string, string>): PixelEntry[] {
  try {
    const raw = JSON.parse(v.fb_pixels || "[]") as unknown;
    if (Array.isArray(raw)) {
      return raw
        .filter((p): p is PixelEntry => !!p && typeof p === "object" && /^\d{10,20}$/.test(String((p as PixelEntry).id)))
        .map((p) => ({ id: String(p.id), label: String(p.label ?? "").slice(0, 60), token: String(p.token ?? "") }))
        .slice(0, MAX_PIXELS);
    }
  } catch {}
  // Settings saved by the first version (single pixel).
  const legacy = (v.fb_pixel_id ?? "").replace(/\D/g, "");
  return legacy ? [{ id: legacy, label: "", token: v.fb_capi_token ?? "" }] : [];
}

function parseEvents(raw: string | undefined): Record<EventName, boolean> {
  let stored: Record<string, unknown> = {};
  try {
    stored = JSON.parse(raw || "{}");
  } catch {}
  return Object.fromEntries(EVENT_NAMES.map((e) => [e, stored[e] !== false])) as Record<EventName, boolean>;
}

export async function getMarketingConfig(): Promise<MarketingConfig> {
  "use cache";
  cacheTag(MARKETING_TAG);
  cacheLife("hours");
  const rows = await query<{ key: string; value: string | null }>(
    `SELECT \`key\`, \`value\` FROM settings WHERE \`key\` IN (${KEYS.map(() => "?").join(",")})`,
    [...KEYS],
  );
  const v = Object.fromEntries(rows.map((r) => [r.key, r.value ?? ""])) as Record<string, string>;
  const pixels = parsePixels(v);
  const capiSwitch = v.fb_capi_enabled === "1";
  const trigger = v.fb_purchase_trigger;
  return {
    pixels,
    browserEnabled: pixels.length > 0 && v.fb_browser_enabled !== "0",
    browserSwitch: v.fb_browser_enabled !== "0",
    capiSwitch,
    capiEnabled: capiSwitch && pixels.some((p) => p.token),
    testEventCode: (v.fb_test_event_code ?? "").trim(),
    apiVersion: /^v\d+\.\d+$/.test(v.fb_api_version ?? "") ? v.fb_api_version : DEFAULT_API_VERSION,
    purchaseTrigger: trigger === "confirmed" || trigger === "delivered" ? trigger : "placed",
    purchaseValue: v.fb_purchase_value === "subtotal" ? "subtotal" : "total",
    serverPageView: v.fb_server_pageview !== "0",
    events: parseEvents(v.fb_events),
  };
}

// ───────────── per-landing pixels

export type PixelMode = "main" | "own" | "both";
export type LandingPixelScope = { landingId: number; slug: string; name: string; mode: PixelMode; pixels: PixelEntry[] };

export function parsePixelList(raw: string | null | undefined): PixelEntry[] {
  try {
    const list = JSON.parse(raw || "[]") as unknown;
    if (!Array.isArray(list)) return [];
    return list
      .filter((p): p is PixelEntry => !!p && typeof p === "object" && /^\d{10,20}$/.test(String((p as PixelEntry).id)))
      .map((p) => ({ id: String(p.id), label: String(p.label ?? "").slice(0, 60), token: String(p.token ?? "") }))
      .slice(0, MAX_PIXELS);
  } catch {
    return [];
  }
}

/** Landing pages that use their own pixels (mode own / both). */
export async function getLandingPixelScopes(): Promise<LandingPixelScope[]> {
  "use cache";
  cacheTag(MARKETING_TAG, "landings");
  cacheLife("hours");
  const rows = await query<{ id: number; slug: string; name: string; pixel_mode: string; pixels: string | null }>(
    "SELECT id, slug, name, pixel_mode, pixels FROM landing_pages WHERE pixel_mode IN ('own','both')",
  );
  return rows
    .map((r) => ({ landingId: r.id, slug: r.slug, name: r.name, mode: r.pixel_mode as PixelMode, pixels: parsePixelList(r.pixels) }))
    .filter((r) => r.pixels.length > 0);
}

/**
 * Pixels an event must go to: the landing page's own (and/or the main site's), or the main site's.
 * A landing set to "own" without any pixel falls back to the main site so nothing is lost.
 */
export async function pixelsFor(landingId: number | null | undefined): Promise<PixelEntry[]> {
  const config = await getMarketingConfig();
  if (!landingId) return config.pixels;
  const scope = (await getLandingPixelScopes()).find((s) => s.landingId === landingId);
  if (!scope) return config.pixels;
  if (scope.mode === "own") return scope.pixels;
  const seen = new Set(scope.pixels.map((p) => p.id));
  return [...scope.pixels, ...config.pixels.filter((p) => !seen.has(p.id))];
}

/** The landing page an event URL belongs to (/<slug>… or the landing thank-you page /order/success?l=<slug>). */
export async function landingIdForUrl(url: string | undefined): Promise<number | null> {
  if (!url) return null;
  let path = "";
  let l = "";
  try {
    const u = new URL(url);
    path = u.pathname;
    l = u.searchParams.get("l") ?? "";
  } catch {
    return null;
  }
  const slug = path === "/order/success" ? l : path.split("/")[1] ?? "";
  if (!slug) return null;
  return (await getLandingPixelScopes()).find((s) => s.slug === slug)?.landingId ?? null;
}

export async function getPublicPixelConfig(): Promise<PublicPixelConfig | null> {
  const [c, scopes] = await Promise.all([getMarketingConfig(), getLandingPixelScopes()]);
  const anyPixel = c.pixels.length > 0 || scopes.length > 0;
  const anyToken = c.pixels.some((p) => p.token) || scopes.some((s) => s.pixels.some((p) => p.token));
  const capi = c.capiSwitch && anyToken;
  if (!anyPixel || (!c.browserSwitch && !capi)) return null;
  return {
    pixelIds: c.pixels.map((p) => p.id),
    // Pixel IDs are public (they are in every page's HTML anyway); tokens never leave the server.
    scopes: Object.fromEntries(scopes.map((s) => [s.slug, s.mode === "own" ? s.pixels.map((p) => p.id) : [...new Set([...s.pixels.map((p) => p.id), ...c.pixels.map((p) => p.id)])]])),
    browser: c.browserSwitch,
    capi,
    serverPageView: c.serverPageView,
    purchaseTrigger: c.purchaseTrigger,
    events: c.events,
  };
}
