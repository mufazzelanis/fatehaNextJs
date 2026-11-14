import "server-only";
import { execute, query, queryOne } from "@/lib/db";
import { getSettings } from "@/lib/data/store";

const ACTIVE = "(expires_at IS NULL OR expires_at > NOW())";

/** True while this IP is blocked from placing orders. */
export async function isIpBlocked(ip: string | null): Promise<boolean> {
  if (!ip) return false;
  return !!(await queryOne(`SELECT id FROM blocked_ips WHERE ip = ? AND ${ACTIVE}`, [ip]));
}

/**
 * Cancelled orders: block the IP they came from (if turned on in General Settings).
 * Mobile networks share IPs, so the block is temporary by default and an admin can lift it any time.
 * Returns the IPs that were blocked.
 */
export async function autoBlockCancelled(orderIds: number[]): Promise<string[]> {
  const settings = await getSettings();
  if (settings.auto_block_cancel_ip === "0" || !orderIds.length) return [];
  const days = Math.max(Math.round(Number(settings.auto_block_days) || 0), 0);
  const orders = await query<{ id: number; order_no: string; ip_address: string | null }>(
    `SELECT id, order_no, ip_address FROM orders WHERE id IN (${orderIds.map(() => "?").join(",")}) AND ip_address IS NOT NULL AND ip_address <> ''`,
    orderIds,
  );
  const blocked: string[] = [];
  for (const o of orders) {
    // A manual (admin) block is never shortened or replaced by an automatic one.
    await execute(
      `INSERT INTO blocked_ips (ip, reason, source, order_id, expires_at)
       VALUES (?, ?, 'auto', ?, ${days ? "NOW() + INTERVAL ? DAY" : "NULL"})
       ON DUPLICATE KEY UPDATE
         reason = IF(source = 'manual', reason, VALUES(reason)),
         order_id = IF(source = 'manual', order_id, VALUES(order_id)),
         expires_at = IF(source = 'manual', expires_at, VALUES(expires_at))`,
      days ? [o.ip_address!, `Order #${o.order_no} cancelled`, o.id, days] : [o.ip_address!, `Order #${o.order_no} cancelled`, o.id],
    );
    blocked.push(o.ip_address!);
  }
  return blocked;
}

/** An order moved out of "cancelled" (e.g. cancelled by mistake): lift the automatic block it caused. */
export async function liftAutoBlock(orderIds: number[]) {
  if (!orderIds.length) return;
  await execute(`DELETE FROM blocked_ips WHERE source = 'auto' AND order_id IN (${orderIds.map(() => "?").join(",")})`, orderIds);
}

export type BlockedIp = { id: number; ip: string; reason: string | null; source: string; order_id: number | null; expires_at: Date | null; created_at: Date };

export async function listBlockedIps() {
  return query<BlockedIp>(`SELECT * FROM blocked_ips WHERE ${ACTIVE} ORDER BY id DESC LIMIT 500`);
}

export async function blockedIpFor(ip: string | null) {
  if (!ip) return null;
  return queryOne<BlockedIp>(`SELECT * FROM blocked_ips WHERE ip = ? AND ${ACTIVE}`, [ip]);
}
