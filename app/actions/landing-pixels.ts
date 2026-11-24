"use server";

import { updateTag } from "next/cache";
import { execute, queryOne } from "@/lib/db";
import { adminWith, DENIED } from "@/lib/auth";
import { LANDING_TAG } from "@/lib/data/landings";
import { MARKETING_TAG, MAX_PIXELS, PAGE_PIXELS_KEY, parsePixelList, readPagePixels, type PixelEntry, type PixelMode } from "@/lib/meta/config";
import { PIXEL_PAGE_HREF, PIXEL_PAGE_KEYS, type PixelPageKey } from "@/lib/guides";
import { logActivity } from "@/lib/activity";
import { tokenErrors } from "@/lib/meta/capi";
import type { ActionState } from "@/lib/action-state";

type Row = { id?: string; label?: string; token?: string; removeToken?: boolean };

/**
 * Reads the pixel form (mode + rows). Tokens are write-only: an empty token field keeps the saved one.
 * Returns the cleaned list, or field errors to show.
 */
async function readPixelForm(formData: FormData, saved: PixelEntry[]): Promise<{ mode: PixelMode; pixels: PixelEntry[] } | ActionState> {
  const mode = String(formData.get("mode")) as PixelMode;
  if (!["main", "own", "both"].includes(mode)) return { error: "Choose which pixels this page uses" };
  let input: Row[] = [];
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
    if (!id && !token) continue;
    if (!/^\d{10,20}$/.test(id)) { fieldErrors[`pixel_${i}`] = "Pixel ID is a 15–16 digit number from Events Manager"; continue; }
    if (pixels.some((p) => p.id === id)) { fieldErrors[`pixel_${i}`] = "This pixel is already in the list"; continue; }
    if (token && (token.length < 30 || /\s/.test(token))) { fieldErrors[`pixel_${i}`] = "This doesn't look like a Conversions API access token"; continue; }
    const keep = saved.find((p) => p.id === id)?.token ?? "";
    pixels.push({ id, label: String(row.label ?? "").trim().slice(0, 60), token: row.removeToken === true ? "" : token || keep });
  }
  if (pixels.length > MAX_PIXELS) return { error: `Up to ${MAX_PIXELS} pixels per page` };
  if (mode !== "main" && !pixels.length) fieldErrors.pixels = "Add at least one pixel, or choose “Use the main site pixels”";
  if (Object.keys(fieldErrors).length) return { error: "Please fix the highlighted fields", fieldErrors };
  // A newly typed token must work for its pixel (Facebook is asked) — a wrong token is the usual reason CAPI fails.
  if (mode !== "main") {
    const bad = await tokenErrors(input.map((row, index) => ({
      index, id: String(row.id ?? "").replace(/\s/g, ""), newToken: row.removeToken === true ? "" : String(row.token ?? "").trim(),
    })));
    if (Object.keys(bad).length) return { error: "Facebook refused an access token — see the pixel below", fieldErrors: bad };
  }
  return { mode, pixels };
}

const modeLabel = (mode: PixelMode) => (mode === "main" ? "main site pixels" : mode === "own" ? "its own pixels only" : "its own + main site pixels");

/** Saves a landing page's own Facebook pixels (and whether it also reports to the main site pixels). */
export async function saveLandingPixels(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminWith("marketing.manage");
  if (!admin) return DENIED;
  const landingId = Number(formData.get("landing")) || 0;
  const landing = await queryOne<{ id: number; name: string; slug: string; pixels: string | null }>(
    "SELECT id, name, slug, pixels FROM landing_pages WHERE id = ?", [landingId]);
  if (!landing) return { error: "Landing page not found" };

  const res = await readPixelForm(formData, parsePixelList(landing.pixels));
  if (!("mode" in res)) return res;
  const { mode, pixels } = res;

  await execute("UPDATE landing_pages SET pixel_mode = ?, pixels = ? WHERE id = ?", [mode, pixels.length ? JSON.stringify(pixels) : null, landing.id]);
  updateTag(MARKETING_TAG);
  updateTag(LANDING_TAG);
  updateTag(`landing-${landing.slug}`);
  await logActivity({
    actor: { id: admin.id, name: admin.name }, action: "landing.pixels", module: "marketing", entityType: "landing", entityId: landing.id,
    description: `Landing “${landing.name}” now uses ${modeLabel(mode)}${pixels.length ? ` (${pixels.map((p) => p.id).join(", ")})` : ""}`,
  });
  return { ok: true, message: "Pixel settings saved — the landing page uses them right away" };
}

/** Saves the pixels of one content page (Admin → Pages → <page> → Pixel & CAPI, Admin → Reviews → Pixel & CAPI). */
export async function savePagePixels(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminWith("marketing.manage");
  if (!admin) return DENIED;
  const key = String(formData.get("page")) as PixelPageKey;
  if (!PIXEL_PAGE_KEYS.includes(key)) return { error: "Page not found" };

  const all = await readPagePixels();
  const res = await readPixelForm(formData, all[key].pixels);
  if (!("mode" in res)) return res;
  const next = { ...all, [key]: res };

  await execute(
    "INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)",
    [PAGE_PIXELS_KEY, JSON.stringify(next)],
  );
  updateTag(MARKETING_TAG);
  await logActivity({
    actor: { id: admin.id, name: admin.name }, action: "page.pixels", module: "marketing", entityType: "page", entityId: key,
    description: `Page ${PIXEL_PAGE_HREF[key]} now uses ${modeLabel(res.mode)}${res.pixels.length ? ` (${res.pixels.map((p) => p.id).join(", ")})` : ""}`,
  });
  return { ok: true, message: "Pixel settings saved — the page uses them right away" };
}
