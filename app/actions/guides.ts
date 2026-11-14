"use server";

import { updateTag } from "next/cache";
import { execute } from "@/lib/db";
import { adminWith, DENIED } from "@/lib/auth";
import { GUIDES_TAG } from "@/lib/data/guides";
import { DEFAULT_GUIDES, normalizeGuides } from "@/lib/guides";
import { logActivity } from "@/lib/activity";
import type { ActionState } from "@/lib/action-state";

const actorOf = (a: { id: number; name: string }) => ({ id: a.id, name: a.name });

/** Saves the whole guide content (sent by the editor as JSON); the pages update right away. */
export async function saveGuides(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminWith("content.manage");
  if (!admin) return DENIED;
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("content") ?? ""));
  } catch {
    return { error: "Could not read the content — reload the page and try again." };
  }
  const content = normalizeGuides(raw);
  await execute(
    "INSERT INTO settings (`key`, `value`) VALUES ('guide_content', ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)",
    [JSON.stringify(content)],
  );
  updateTag(GUIDES_TAG);
  await logActivity({
    actor: actorOf(admin), action: "guides.updated", module: "content",
    description: `Updated guide pages (${content.ingredients.items.length} ingredients, ${content.care.groups.reduce((s, g) => s + g.tips.length, 0)} care tips)`,
  });
  return { ok: true, message: "Guide pages saved — the live pages are updated" };
}

/** Puts back the original content from FatehaBD's documents. */
export async function resetGuides(): Promise<ActionState> {
  const admin = await adminWith("content.manage");
  if (!admin) return DENIED;
  await execute("DELETE FROM settings WHERE `key` = 'guide_content'");
  updateTag(GUIDES_TAG);
  await logActivity({ actor: actorOf(admin), action: "guides.reset", module: "content", description: "Reset guide pages to the original content" });
  return { ok: true, message: `Restored the original content (${DEFAULT_GUIDES.ingredients.items.length} ingredients)` };
}
