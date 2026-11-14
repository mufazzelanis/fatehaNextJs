import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { queryOne } from "@/lib/db";
import { normalizeGuides, type GuideContent } from "@/lib/guides";

export const GUIDES_TAG = "guides";

/** Guide page content (admin → Guide Pages); falls back to the built-in content until it is first saved. */
export async function getGuideContent(): Promise<GuideContent> {
  "use cache";
  cacheTag(GUIDES_TAG);
  cacheLife("days");
  const row = await queryOne<{ value: string | null }>("SELECT `value` FROM settings WHERE `key` = 'guide_content'");
  let raw: unknown = null;
  try {
    raw = row?.value ? JSON.parse(row.value) : null;
  } catch {}
  return normalizeGuides(raw);
}
