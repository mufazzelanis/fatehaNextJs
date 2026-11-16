"use server";

import { updateTag } from "next/cache";
import { execute, queryOne } from "@/lib/db";
import { adminWith, DENIED } from "@/lib/auth";
import { BUSINESS_KEY, BUSINESS_TAG, readBusinessProfile } from "@/lib/data/business";
import { businessErrors, normalizeBusiness, type BusinessProfile } from "@/lib/business";
import { LANDING_TAG } from "@/lib/data/landings";
import { STORE_TAG } from "@/lib/data/store";
import { GUIDES_TAG } from "@/lib/data/guides";
import { diff, logActivity } from "@/lib/activity";
import type { ActionState } from "@/lib/action-state";

const FIELDS: (keyof BusinessProfile)[] = ["name", "tagline", "phone", "phone2", "whatsapp", "email", "address", "hours", "facebook", "messenger", "instagram", "youtube", "tiktok", "website"];

/** Saves Business Info; every page that shows the name, phone, WhatsApp, email, address or social links updates. */
export async function saveBusiness(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminWith("settings.manage");
  if (!admin) return DENIED;
  const raw = Object.fromEntries(FIELDS.map((k) => [k, String(formData.get(k) ?? "")]));
  const fieldErrors = businessErrors(raw);
  if (Object.keys(fieldErrors).length) return { error: "Please fix the highlighted fields", fieldErrors, values: raw };

  const before = await readBusinessProfile();
  const next = normalizeBusiness(raw);
  await execute("INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)", [BUSINESS_KEY, JSON.stringify(next)]);
  // Older settings that other parts (SMS / email templates, exports) still read are kept in step.
  await execute("INSERT INTO settings (`key`, `value`) VALUES ('contact_phone', ?), ('whatsapp_number', ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)",
    [next.phone, next.whatsapp]);
  const ls = await queryOne<{ value: string | null }>("SELECT `value` FROM settings WHERE `key` = 'landing_settings'");
  try {
    const parsed = JSON.parse(ls?.value || "{}");
    parsed.footerName = next.name;
    await execute("INSERT INTO settings (`key`, `value`) VALUES ('landing_settings', ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)", [JSON.stringify(parsed)]);
  } catch {}

  for (const tag of [BUSINESS_TAG, LANDING_TAG, STORE_TAG, GUIDES_TAG]) updateTag(tag);
  const changes = diff(before as unknown as Record<string, unknown>, next as unknown as Record<string, unknown>, FIELDS);
  await logActivity({
    actor: { id: admin.id, name: admin.name }, action: "business.updated", module: "settings",
    description: changes.length ? `Updated business info: ${changes.map((c) => c.field).join(", ")}` : "Saved business info (no changes)",
    changes,
  });
  return { ok: true, message: "Saved — the whole website now shows these details" };
}
