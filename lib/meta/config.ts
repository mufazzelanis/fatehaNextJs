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
  pixels: PixelEntry[];
  browserEnabled: boolean;
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

export async function getPublicPixelConfig(): Promise<PublicPixelConfig | null> {
  const c = await getMarketingConfig();
  if (!c.pixels.length || (!c.browserEnabled && !c.capiEnabled)) return null;
  return {
    pixelIds: c.pixels.map((p) => p.id),
    browser: c.browserEnabled,
    capi: c.capiEnabled,
    serverPageView: c.serverPageView,
    purchaseTrigger: c.purchaseTrigger,
    events: c.events,
  };
}
