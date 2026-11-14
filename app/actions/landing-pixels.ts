"use server";

import { updateTag } from "next/cache";
import { execute, queryOne } from "@/lib/db";
import { adminWith, DENIED } from "@/lib/auth";
import { LANDING_TAG } from "@/lib/data/landings";
import { MARKETING_TAG, MAX_PIXELS, parsePixelList, type PixelEntry, type PixelMode } from "@/lib/meta/config";
import { logActivity } from "@/lib/activity";
import type { ActionState } from "@/lib/action-state";

type Row = { id?: string; label?: string; token?: string; removeToken?: boolean };

/** Saves a landing page's own Facebook pixels (and whether it also reports to the main site pixels). */
export async function saveLandingPixels(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminWith("marketing.manage");
  if (!admin) return DENIED;
  const landingId = Number(formData.get("landing")) || 0;
  const landing = await queryOne<{ id: number; name: string; slug: string; pixels: string | null }>(
    "SELECT id, name, slug, pixels FROM landing_pages WHERE id = ?", [landingId]);
  if (!landing) return { error: "Landing page not found" };

  const mode = String(formData.get("mode")) as PixelMode;
  if (!["main", "own", "both"].includes(mode)) return { error: "Choose which pixels this page uses" };

  let input: Row[] = [];
  try {
    const parsed = JSON.parse(String(formData.get("pixels") ?? "[]"));
    if (Array.isArray(parsed)) input = parsed;
  } catch {
    return { error: "Could not read the pixel list — please try again" };
  }
  const saved = parsePixelList(landing.pixels);
  const fieldErrors: Record<string, string> = {};
  const pixels: PixelEntry[] = [];
  for (const [i, row] of input.entries()) {
    const id = String(row.id ?? "").replace(/\s/g, "");
    const token = String(row.token ?? "").trim();
    if (!id && !token) continue;
    if (!/^\d{10,20}$/.test(id)) { fieldErrors[`pixel_${i}`] = "Pixel ID is a 15–16 digit number from Events Manager"; continue; }
    if (pixels.some((p) => p.id === id)) { fieldErrors[`pixel_${i}`] = "This pixel is already in the list"; continue; }
    if (token && (token.length < 30 || /\s/.test(token))) { fieldErrors[`pixel_${i}`] = "This doesn't look like a Conversions API access token"; continue; }
    // Tokens are write-only: an empty field keeps the saved token.
    const keep = saved.find((p) => p.id === id)?.token ?? "";
    pixels.push({ id, label: String(row.label ?? "").trim().slice(0, 60), token: row.removeToken === true ? "" : token || keep });
  }
  if (pixels.length > MAX_PIXELS) return { error: `Up to ${MAX_PIXELS} pixels per landing page` };
  if (mode !== "main" && !pixels.length) fieldErrors.pixels = "Add at least one pixel, or choose “Use the main site pixels”";
  if (Object.keys(fieldErrors).length) return { error: "Please fix the highlighted fields", fieldErrors };

  await execute("UPDATE landing_pages SET pixel_mode = ?, pixels = ? WHERE id = ?", [mode, pixels.length ? JSON.stringify(pixels) : null, landing.id]);
  updateTag(MARKETING_TAG);
  updateTag(LANDING_TAG);
  updateTag(`landing-${landing.slug}`);
  const label = mode === "main" ? "main site pixels" : mode === "own" ? "its own pixels only" : "its own + main site pixels";
  await logActivity({
    actor: { id: admin.id, name: admin.name }, action: "landing.pixels", module: "marketing", entityType: "landing", entityId: landing.id,
    description: `Landing “${landing.name}” now uses ${label}${pixels.length ? ` (${pixels.map((p) => p.id).join(", ")})` : ""}`,
  });
  return { ok: true, message: "Pixel settings saved — the landing page uses them right away" };
}
