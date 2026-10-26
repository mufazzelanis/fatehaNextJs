"use server";

import { refresh, updateTag } from "next/cache";
import { execute } from "@/lib/db";
import { adminWith, DENIED } from "@/lib/auth";
import { logActivity, MASKED, type Change } from "@/lib/activity";
import { getMarketingConfig, MARKETING_TAG, MAX_PIXELS, type PixelEntry } from "@/lib/meta/config";
import { EVENT_NAMES } from "@/lib/meta/shared";
import { customerUserData, retryFailedEvents, sendServerEvents, verifyPixels, type PixelCheck } from "@/lib/meta/capi";
import { requestUserData } from "@/lib/meta/request";
import type { ActionState } from "@/lib/action-state";

async function setSetting(key: string, value: string) {
  await execute("INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)", [key, value]);
}

type PixelInput = { id?: unknown; label?: unknown; token?: unknown; removeToken?: unknown };

export async function saveMarketingSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminWith("marketing.manage");
  if (!admin) return DENIED;
  const current = await getMarketingConfig();

  let input: PixelInput[] = [];
  try {
    const parsed = JSON.parse(String(formData.get("pixels") ?? "[]"));
    if (Array.isArray(parsed)) input = parsed;
  } catch {
    return { error: "Could not read the pixel list — please try again" };
  }

  const fieldErrors: Record<string, string> = {};
  const pixels: PixelEntry[] = [];
  for (const [i, row] of input.entries()) {
    const id = String(row.id ?? "").replace(/\s/g, "");
    const token = String(row.token ?? "").trim();
    if (!id && !token) continue; // empty row
    if (!/^\d{10,20}$/.test(id)) {
      fieldErrors[`pixel_${i}`] = "Pixel ID is a 15–16 digit number from Events Manager";
      continue;
    }
    if (pixels.some((p) => p.id === id)) {
      fieldErrors[`pixel_${i}`] = "This pixel is already in the list";
      continue;
    }
    if (token && (token.length < 30 || /\s/.test(token))) {
      fieldErrors[`pixel_${i}`] = "This doesn't look like a Conversions API access token";
      continue;
    }
    // Tokens are write-only: an empty field keeps the saved token for this pixel.
    const saved = current.pixels.find((p) => p.id === id)?.token ?? "";
    pixels.push({ id, label: String(row.label ?? "").trim().slice(0, 60), token: row.removeToken === true ? "" : token || saved });
  }
  if (pixels.length > MAX_PIXELS) return { error: `Up to ${MAX_PIXELS} pixels are supported` };

  const version = String(formData.get("fb_api_version") ?? "").trim();
  if (version && !/^v\d+\.\d+$/.test(version)) fieldErrors.fb_api_version = "Use the format v23.0";
  const capiOn = formData.get("fb_capi_enabled") === "on";
  if (capiOn && !pixels.some((p) => p.token)) fieldErrors.capi = "Add an access token to at least one pixel to use the Conversions API";
  if (Object.keys(fieldErrors).length) return { error: "Please fix the highlighted fields", fieldErrors };

  const trigger = String(formData.get("fb_purchase_trigger") ?? "placed");
  const events = Object.fromEntries(EVENT_NAMES.map((e) => [e, formData.get(`event_${e}`) === "on"]));

  const browserOn = formData.get("fb_browser_enabled") === "on";
  const serverPv = formData.get("fb_server_pageview") === "on";
  const testCode = String(formData.get("fb_test_event_code") ?? "").trim().slice(0, 50);
  const triggerValue = ["placed", "confirmed", "delivered"].includes(trigger) ? trigger : "placed";
  const valueMode = formData.get("fb_purchase_value") === "subtotal" ? "subtotal" : "total";

  await setSetting("fb_pixels", JSON.stringify(pixels));
  await setSetting("fb_browser_enabled", browserOn ? "1" : "0");
  await setSetting("fb_capi_enabled", capiOn ? "1" : "0");
  await setSetting("fb_server_pageview", serverPv ? "1" : "0");
  await setSetting("fb_test_event_code", testCode);
  await setSetting("fb_api_version", version);
  await setSetting("fb_purchase_trigger", triggerValue);
  await setSetting("fb_purchase_value", valueMode);
  await setSetting("fb_events", JSON.stringify(events));
  // Remove keys from the single-pixel version so they can't be picked up again.
  await execute("DELETE FROM settings WHERE `key` IN ('fb_pixel_id', 'fb_capi_token')");

  const changes: Change[] = [];
  const pixelsBefore = current.pixels.map((p) => p.label ? p.id + " (" + p.label + ")" : p.id).join(", ") || "none";
  const pixelsAfter = pixels.map((p) => p.label ? p.id + " (" + p.label + ")" : p.id).join(", ") || "none";
  if (pixelsBefore !== pixelsAfter) changes.push({ field: "pixels", from: pixelsBefore, to: pixelsAfter });
  for (const p of pixels) {
    const old = current.pixels.find((x) => x.id === p.id)?.token ?? "";
    if (old !== p.token) changes.push({ field: "access token " + p.id, from: old ? MASKED : "none", to: p.token ? MASKED : "removed" });
  }
  const flags: [string, unknown, unknown][] = [
    ["browser pixel", current.browserEnabled || !current.pixels.length, browserOn], ["conversions API", current.capiSwitch, capiOn],
    ["server PageView", current.serverPageView, serverPv], ["test event code", current.testEventCode, testCode],
    ["purchase trigger", current.purchaseTrigger, triggerValue], ["purchase value", current.purchaseValue, valueMode],
    ["events", JSON.stringify(current.events), JSON.stringify(events)],
  ];
  for (const [field, from, to] of flags) if (String(from) !== String(to)) changes.push({ field, from, to });
  if (changes.length) {
    await logActivity({ actor: admin, action: "pixel.settings_updated", module: "marketing", description: "Changed Facebook Pixel settings: " + changes.map((c) => c.field).join(", "), changes });
  }
  updateTag(MARKETING_TAG);
  refresh();
  return { ok: true, message: `Saved — ${pixels.length} pixel${pixels.length === 1 ? "" : "s"}, ${pixels.filter((p) => p.token).length} with Conversions API` };
}

export async function sendTestEvent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminWith("marketing.manage");
  if (!admin) return DENIED;
  const code = String(formData.get("test_code") ?? "").trim();
  if (!code) return { error: "Enter the Test Event Code from Events Manager → Test events" };
  const user = { ...customerUserData({ phone: "01700000000", name: "Test Customer" }), ...(await requestUserData()) };
  const result = await sendServerEvents(
    [{
      event_name: "Purchase",
      event_id: `test_${Date.now()}`,
      user_data: user,
      custom_data: { currency: "BDT", value: 1, content_type: "product", content_ids: ["test"] },
    }],
    { testCode: code },
  );
  await logActivity({ actor: admin, action: "pixel.test_event", module: "marketing", description: "Sent a Facebook test event (" + code + ") — " + (result.ok ? "accepted" : "rejected: " + result.message) });
  refresh();
  return result.ok
    ? { ok: true, message: `Test Purchase sent — open Events Manager → Test events to see it (${result.message})` }
    : { error: `Facebook returned an error: ${result.message}` };
}

export type VerifyState = { checks?: PixelCheck[]; error?: string };

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- useActionState passes the previous state
export async function verifyConnection(_prev: VerifyState): Promise<VerifyState> {
  if (!(await adminWith("marketing.manage"))) return { error: DENIED.error };
  const checks = await verifyPixels();
  return checks.length ? { checks } : { error: "Add a pixel first" };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- useActionState passes the previous state
export async function retryFailed(_prev: ActionState): Promise<ActionState> {
  const admin = await adminWith("marketing.manage");
  if (!admin) return DENIED;
  const { retried, succeeded } = await retryFailedEvents();
  if (retried) await logActivity({ actor: admin, action: "pixel.retry", module: "marketing", description: "Retried " + retried + " failed Facebook event(s), " + succeeded + " delivered" });
  refresh();
  if (!retried) return { message: "Nothing to retry — no failed events from the last 7 days" };
  return succeeded === retried
    ? { ok: true, message: `All ${retried} failed event(s) were delivered` }
    : { error: `${succeeded} of ${retried} delivered. Check the responses below — the token or pixel may be wrong.` };
}
