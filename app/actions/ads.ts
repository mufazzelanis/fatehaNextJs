"use server";

import { refresh } from "next/cache";
import { adminWith } from "@/lib/auth";
import { setAdName, AD_KINDS, type AdKind } from "@/lib/data/ads";
import { logActivity } from "@/lib/activity";

/** Admin → Ad Performance: give a campaign / ad set / ad ID a readable name (empty = remove the name). */
export async function renameAd(formData: FormData) {
  const admin = await adminWith("orders.view");
  if (!admin) return;
  const kind = String(formData.get("kind")) as AdKind;
  const id = String(formData.get("id") ?? "").trim().slice(0, 200);
  const name = String(formData.get("name") ?? "").trim().slice(0, 200);
  if (!AD_KINDS.includes(kind) || !id) return;
  await setAdName(kind, id, name);
  await logActivity({
    actor: { id: admin.id, name: admin.name }, action: "ad.renamed", module: "marketing", entityType: kind, entityId: id,
    description: name ? `Named ${kind} ${id} “${name}”` : `Removed the name of ${kind} ${id}`,
  });
  refresh();
}
