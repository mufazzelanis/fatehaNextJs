import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { query, queryOne } from "../db";
import { PIXEL_PAGE_HREF, PIXEL_PAGE_KEYS, type PixelPageKey } from "../guides";
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
  return scope ? withMain(scope, config.pixels) : config.pixels;
}

const withMain = (scope: { mode: PixelMode; pixels: PixelEntry[] }, main: PixelEntry[]) => {
  if (scope.mode === "own") return scope.pixels;
  const seen = new Set(scope.pixels.map((p) => p.id));
  return [...scope.pixels, ...main.filter((p) => !seen.has(p.id))];
};

// ───────────── per-page pixels (content pages: /how-to-use, /ingredients, /dental-care, /thank-you, /reviews)

/** settings.page_pixels = { [pageKey]: { mode, pixels } } — kept apart from the page content because it holds tokens. */
export const PAGE_PIXELS_KEY = "page_pixels";
export type PagePixelSetting = { mode: PixelMode; pixels: PixelEntry[] };

/** Raw per-page pixel settings (server only: includes tokens). */
export async function readPagePixels(): Promise<Record<PixelPageKey, PagePixelSetting>> {
  const row = await queryOne<{ value: string | null }>("SELECT `value` FROM settings WHERE `key` = ?", [PAGE_PIXELS_KEY]);
  let raw: Record<string, { mode?: unknown; pixels?: unknown }> = {};
  try { raw = JSON.parse(row?.value || "{}"); } catch {}
  return Object.fromEntries(PIXEL_PAGE_KEYS.map((k) => {
    const r = raw[k] ?? {};
    const mode: PixelMode = r.mode === "own" || r.mode === "both" ? r.mode : "main";
    return [k, { mode, pixels: parsePixelList(JSON.stringify(r.pixels ?? [])) }];
  })) as Record<PixelPageKey, PagePixelSetting>;
}

/** Any page with its own pixels: landing pages (by slug) and content pages (by path). */
export type PixelScope = { slug: string; name: string; mode: PixelMode; pixels: PixelEntry[]; landingId: number | null };

export async function getPixelScopes(): Promise<PixelScope[]> {
  "use cache";
  cacheTag(MARKETING_TAG, "landings");
  cacheLife("hours");
  const [landings, pages] = await Promise.all([getLandingPixelScopes(), readPagePixels()]);
  const pageScopes = PIXEL_PAGE_KEYS
    .filter((k) => pages[k].mode !== "main" && pages[k].pixels.length > 0)
    .map((k) => ({ slug: PIXEL_PAGE_HREF[k].slice(1), name: PIXEL_PAGE_HREF[k], mode: pages[k].mode, pixels: pages[k].pixels, landingId: null }));
  return [...landings.map((l) => ({ slug: l.slug, name: l.name, mode: l.mode, pixels: l.pixels, landingId: l.landingId })), ...pageScopes];
}

/** Pixels for a browser event, from its page URL (landing slug, content page path, or the landing thank-you page). */
export async function pixelsForUrl(url: string | undefined): Promise<PixelEntry[]> {
  const config = await getMarketingConfig();
  let slug = "";
  try {
    const u = new URL(url ?? "");
    slug = u.pathname === "/order/success" ? u.searchParams.get("l") ?? "" : u.pathname.split("/")[1] ?? "";
  } catch {}
  const scope = slug ? (await getPixelScopes()).find((s) => s.slug === slug) : undefined;
  return scope ? withMain(scope, config.pixels) : config.pixels;
}

export async function getPublicPixelConfig(): Promise<PublicPixelConfig | null> {
  const [c, scopes] = await Promise.all([getMarketingConfig(), getPixelScopes()]);
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
