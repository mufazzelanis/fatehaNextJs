import { execute } from "@/lib/db";
import { LIVE_DEVICES, LIVE_SECTIONS, LIVE_SOURCES } from "@/lib/live";

const pick = <T extends string>(list: readonly T[], v: unknown, fallback: T): T => (list.includes(v as T) ? (v as T) : fallback);

/**
 * Heartbeat from an open landing page (every ~15s, on section change, and a final "leave" beacon).
 * One row per browser + landing page; only published landing pages are counted, bots are ignored.
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
  if (/bot|crawler|spider|facebookexternalhit|preview|lighthouse/i.test(request.headers.get("user-agent") ?? "")) return done;

  if (body.leave) {
    await execute("UPDATE live_visitors SET left_at = NOW(), last_seen = NOW() WHERE sid = ? AND landing_id = ? AND left_at IS NULL", [sid, id]);
    return done;
  }

  const section = pick(LIVE_SECTIONS, body.s, "top");
  const source = pick(LIVE_SOURCES, body.src, "direct");
  const device = pick(LIVE_DEVICES, body.dev, "phone");
  // A visitor coming back after more than 2 minutes away starts a new visit (shows as "arrived" again).
  await execute(
    `INSERT INTO live_visitors (sid, landing_id, section, source, device)
     SELECT ?, id, ?, ?, ? FROM landing_pages WHERE id = ? AND status = 'published'
     ON DUPLICATE KEY UPDATE
       first_seen = IF(COALESCE(left_at, last_seen) < NOW() - INTERVAL 2 MINUTE, NOW(), first_seen),
       source = IF(COALESCE(left_at, last_seen) < NOW() - INTERVAL 2 MINUTE, VALUES(source), source),
       last_seen = NOW(), left_at = NULL, section = VALUES(section), device = VALUES(device)`,
    [sid, section, source, device, id],
  );
  if (Math.random() < 0.01) await execute("DELETE FROM live_visitors WHERE last_seen < NOW() - INTERVAL 2 DAY").catch(() => {});
  return done;
}
