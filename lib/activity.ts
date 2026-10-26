import "server-only";
import { headers } from "next/headers";
import { execute } from "./db";
import { clientIpFrom } from "./client-ip";

export type ActivityModule =
  | "auth" | "orders" | "customers" | "products" | "content" | "checkout" | "marketing" | "settings" | "users" | "dealers";

export type Change = { field: string; from: unknown; to: unknown };

type LogInput = {
  actor?: { id: number; name: string } | null;
  /** e.g. "order.status_changed" */
  action: string;
  module: ActivityModule;
  entityType?: string;
  entityId?: string | number;
  description: string;
  changes?: Change[];
};

/** Records an audit entry. Never throws — logging must not break the action it describes. */
export async function logActivity(input: LogInput) {
  try {
    let ip: string | null = null;
    let ua: string | null = null;
    try {
      const h = await headers();
      ip = clientIpFrom(h);
      ua = h.get("user-agent")?.slice(0, 300) ?? null;
    } catch {}
    await execute(
      `INSERT INTO activity_logs (user_id, user_name, action, module, entity_type, entity_id, description, changes, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.actor?.id ?? null,
        input.actor?.name ?? null,
        input.action,
        input.module,
        input.entityType ?? null,
        input.entityId === undefined ? null : String(input.entityId),
        input.description.slice(0, 500),
        input.changes?.length ? JSON.stringify(input.changes).slice(0, 60000) : null,
        ip,
        ua,
      ],
    );
  } catch (error) {
    console.error("activity log failed", error);
  }
}

const norm = (v: unknown) => (v instanceof Date ? v.toISOString() : v === undefined ? null : typeof v === "number" ? v : v === null ? null : String(v));

/** Field-by-field differences between two records (only the listed fields). */
export function diff<T extends Record<string, unknown>>(before: T, after: Partial<T>, fields: (keyof T)[]): Change[] {
  const changes: Change[] = [];
  for (const field of fields) {
    if (!(field in after)) continue;
    const a = norm(before[field]);
    const b = norm(after[field]);
    if (String(a ?? "") !== String(b ?? "")) changes.push({ field: String(field), from: a, to: b });
  }
  return changes;
}

/** Secret values are recorded as changed without revealing them. */
export const MASKED = "••••••";
