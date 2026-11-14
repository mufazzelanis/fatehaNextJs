"use server";

import { updateTag } from "next/cache";
import { execute } from "@/lib/db";
import { adminWith, DENIED } from "@/lib/auth";
import { GUIDES_TAG, readGuideContent } from "@/lib/data/guides";
import { DEFAULT_GUIDES, GUIDE_HREF, GUIDE_KEYS, normalizeGuides, type GuideKey } from "@/lib/guides";
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
  let content = normalizeGuides(raw);
  // Saving one page (Admin → Pages → <page>) changes only that page, so two people editing
  // different pages never overwrite each other. "general" = product name, phones, thank-you cards.
  const page = String(formData.get("page") ?? "");
  if (page) {
    const current = await readGuideContent();
    if ((GUIDE_KEYS as readonly string[]).includes(page)) {
      const k = page as GuideKey;
      content = { ...current, pages: { ...current.pages, [k]: content.pages[k] }, [k]: content[k] };
    } else if (page === "general") {
      content = { ...current, product: content.product, phones: content.phones, showOnThankYou: content.showOnThankYou };
    } else {
      return { error: "Unknown page" };
    }
  }
  await execute(
    "INSERT INTO settings (`key`, `value`) VALUES ('guide_content', ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)",
    [JSON.stringify(content)],
  );
  updateTag(GUIDES_TAG);
  await logActivity({
    actor: actorOf(admin), action: "guides.updated", module: "content",
    description: page && page !== "general"
      ? `Updated page ${GUIDE_HREF[page as GuideKey]} (${content.pages[page as GuideKey].enabled ? "published" : "hidden"})`
      : page === "general"
        ? "Updated the shared page settings (product name, call numbers, thank-you cards)"
        : `Updated guide pages (${content.ingredients.items.length} ingredients, ${content.care.groups.reduce((s, g) => s + g.tips.length, 0)} care tips)`,
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
