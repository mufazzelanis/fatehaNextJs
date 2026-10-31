import { execute, queryOne } from "@/lib/db";
import { clientIpFrom } from "@/lib/client-ip";
import { LIVE_DEVICES, LIVE_SECTIONS, LIVE_SOURCES } from "@/lib/live";

const pick = <T extends string>(list: readonly T[], v: unknown, fallback: T): T => (list.includes(v as T) ? (v as T) : fallback);

/** The visit this browser has open on this landing page (a gap of more than 2 minutes starts a new visit). */
const openVisit = (sid: string, landing: number) =>
  queryOne<{ id: number; started_at: Date }>(
    `SELECT id, started_at FROM landing_visits
     WHERE sid = ? AND landing_id = ? AND COALESCE(left_at, last_seen) >= NOW() - INTERVAL 2 MINUTE
     ORDER BY id DESC LIMIT 1`,
    [sid, landing],
  );

/**
 * Beacon from an open landing page:
 * - heartbeat every ~15s (and when the visitor moves to another part of the page)
 * - { click } when an order / checkout button is pressed
 * - { leave } when the page is hidden or closed
 * Only published landing pages count; bots are ignored.
 */
export async function POST(request: Request) {
  const done = new Response(null, { status: 204 });
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(await request.text());
  } catch {
    return done;
  }
  const id = Number(body.id);
  const sid = String(body.sid ?? "");
  if (!Number.isInteger(id) || id <= 0 || !/^[a-z0-9]{12,24}$/.test(sid)) return done;
  const ua = request.headers.get("user-agent") ?? "";
  if (/bot|crawler|spider|facebookexternalhit|preview|lighthouse/i.test(ua)) return done;

  if (body.leave) {
    await execute(
      `UPDATE landing_visits SET left_at = NOW(), last_seen = NOW()
       WHERE sid = ? AND landing_id = ? AND left_at IS NULL ORDER BY id DESC LIMIT 1`,
      [sid, id],
    );
    return done;
  }

  const section = pick(LIVE_SECTIONS, body.s, "top");
  let visit = await openVisit(sid, id);
  if (visit) {
    await execute(
      `UPDATE landing_visits SET last_seen = NOW(), left_at = NULL, section = ?, reached_form = reached_form OR ? WHERE id = ?`,
      [section, section === "form" ? 1 : 0, visit.id],
    );
  } else {
    const res = await execute(
      `INSERT INTO landing_visits (sid, landing_id, ip, user_agent, source, device, section, reached_form)
       SELECT ?, id, ?, ?, ?, ?, ?, ? FROM landing_pages WHERE id = ? AND status = 'published'`,
      [sid, clientIpFrom(request.headers), ua.slice(0, 300) || null, pick(LIVE_SOURCES, body.src, "direct"),
       pick(LIVE_DEVICES, body.dev, "phone"), section, section === "form" ? 1 : 0, id],
    );
    if (!res.affectedRows) return done; // not a published landing page
    visit = { id: res.insertId, started_at: new Date() };
  }

  if (typeof body.click === "string" && body.click.trim()) {
    const kind = pick(["order", "sticky", "submit", "call", "whatsapp"] as const, body.kind, "order");
    await execute(
      `INSERT INTO landing_clicks (visit_id, landing_id, label, kind, seconds)
       SELECT ?, ?, ?, ?, GREATEST(TIMESTAMPDIFF(SECOND, started_at, NOW()), 0) FROM landing_visits WHERE id = ?`,
      [visit.id, id, body.click.trim().slice(0, 80), kind, visit.id],
    );
    await execute("UPDATE landing_visits SET clicks = clicks + 1 WHERE id = ?", [visit.id]);
  }

  if (Math.random() < 0.005) {
    await execute("DELETE FROM landing_visits WHERE last_seen < NOW() - INTERVAL 90 DAY").catch(() => {});
    await execute("DELETE FROM landing_clicks WHERE created_at < NOW() - INTERVAL 90 DAY").catch(() => {});
  }
  return done;
}
