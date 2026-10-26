import "server-only";
import { query, queryOne } from "../db";
import type { Change } from "../activity";

export type ActivityRow = {
  id: number;
  user_id: number | null;
  user_name: string | null;
  action: string;
  module: string;
  entity_type: string | null;
  entity_id: string | null;
  description: string;
  changes: Change[];
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
};

export type ActivityFilters = { user?: string; module?: string; q?: string; from?: string; to?: string; entity?: string; id?: string; page?: number; perPage?: number };

function where(f: ActivityFilters) {
  const w: string[] = [];
  const p: (string | number)[] = [];
  if (f.user === "system") w.push("a.user_id IS NULL");
  else if (f.user && /^\d+$/.test(f.user)) { w.push("a.user_id = ?"); p.push(Number(f.user)); }
  if (f.module && /^[a-z]+$/.test(f.module)) { w.push("a.module = ?"); p.push(f.module); }
  if (f.entity && /^[a-z]+$/.test(f.entity)) { w.push("a.entity_type = ?"); p.push(f.entity); }
  if (f.id && /^[\w@.+-]{1,40}$/.test(f.id)) { w.push("a.entity_id = ?"); p.push(f.id); }
  if (f.q?.trim()) { w.push("(a.description LIKE ? OR a.user_name LIKE ? OR a.ip_address LIKE ?)"); const like = `%${f.q.trim()}%`; p.push(like, like, like); }
  if (f.from && /^\d{4}-\d{2}-\d{2}$/.test(f.from)) { w.push("a.created_at >= ?"); p.push(`${f.from} 00:00:00`); }
  if (f.to && /^\d{4}-\d{2}-\d{2}$/.test(f.to)) { w.push("a.created_at <= ?"); p.push(`${f.to} 23:59:59`); }
  return { sql: w.length ? `WHERE ${w.join(" AND ")}` : "", params: p };
}

function parse(row: Omit<ActivityRow, "changes"> & { changes: string | null }): ActivityRow {
  let changes: Change[] = [];
  try {
    const parsed = row.changes ? JSON.parse(row.changes) : [];
    if (Array.isArray(parsed)) changes = parsed;
  } catch {}
  return { ...row, changes };
}

export async function listActivity(f: ActivityFilters) {
  const perPage = Math.min(Math.max(f.perPage ?? 30, 10), 200);
  const page = Math.max(f.page ?? 1, 1);
  const { sql, params } = where(f);
  const [rows, total] = await Promise.all([
    query<Omit<ActivityRow, "changes"> & { changes: string | null }>(
      `SELECT a.* FROM activity_logs a ${sql} ORDER BY a.id DESC LIMIT ? OFFSET ?`,
      [...params, perPage, (page - 1) * perPage],
    ),
    queryOne<{ n: number }>(`SELECT COUNT(*) n FROM activity_logs a ${sql}`, params),
  ]);
  const count = Number(total?.n ?? 0);
  return { rows: rows.map(parse), total: count, page, pages: Math.max(Math.ceil(count / perPage), 1) };
}

export async function exportActivity(f: ActivityFilters) {
  const { sql, params } = where(f);
  const rows = await query<Omit<ActivityRow, "changes"> & { changes: string | null }>(
    `SELECT a.* FROM activity_logs a ${sql} ORDER BY a.id DESC LIMIT 20000`,
    params,
  );
  return rows.map(parse);
}

export async function activitySummary() {
  const [today, failed, byModule, people] = await Promise.all([
    queryOne<{ n: number }>("SELECT COUNT(*) n FROM activity_logs WHERE created_at >= CURDATE()"),
    queryOne<{ n: number }>("SELECT COUNT(*) n FROM activity_logs WHERE action = 'auth.login_failed' AND created_at >= NOW() - INTERVAL 1 DAY"),
    query<{ module: string; n: number }>("SELECT module, COUNT(*) n FROM activity_logs WHERE created_at >= NOW() - INTERVAL 7 DAY GROUP BY module ORDER BY n DESC"),
    query<{ id: number; name: string }>(
      "SELECT DISTINCT u.id, u.name FROM users u WHERE u.role = 'admin' ORDER BY u.name",
    ),
  ]);
  return { today: Number(today?.n ?? 0), failedLogins: Number(failed?.n ?? 0), byModule: byModule.map((m) => ({ module: m.module, n: Number(m.n) })), people };
}
