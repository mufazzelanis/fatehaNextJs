import "server-only";
import path from "node:path";
import { cache } from "react";
import { query, queryOne } from "./db";
import { readSession } from "./session";

export const DEALER_LEVELS = ["district", "thana", "union"] as const;
export type DealerLevel = (typeof DEALER_LEVELS)[number];
export type DealerStatus = "pending" | "active" | "rejected" | "suspended";
export const isDealerLevel = (v: unknown): v is DealerLevel => typeof v === "string" && (DEALER_LEVELS as readonly string[]).includes(v);

export const LEVEL_LABEL: Record<DealerLevel, string> = { district: "District Dealer", thana: "Thana Dealer", union: "Union Dealer" };
export const DEALER_STATUS_META: Record<DealerStatus, { label: string; className: string }> = {
  pending: { label: "Pending review", className: "bg-amber-50 text-amber-800 ring-amber-600/20" },
  active: { label: "Active", className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  rejected: { label: "Rejected", className: "bg-rose-50 text-rose-700 ring-rose-600/20" },
  suspended: { label: "Suspended", className: "bg-slate-100 text-slate-700 ring-slate-500/20" },
};

/** NID / bank slip scans: kept outside public media, served only to staff through /admin/dealer-doc. */
export const DEALER_DOC_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), "storage", "dealer-docs");
export const dealerDocPath = (file: string) => path.join(/*turbopackIgnore: true*/ DEALER_DOC_DIR, path.basename(file));

export type Dealer = {
  id: number; level: DealerLevel | null; applied_level: DealerLevel | null; name: string; phone: string; email: string | null;
  nid_number: string; address: string; district_id: number; thana_id: number; union_id: number | null;
  photo: string | null; bank_slip: string | null; nid_front: string | null; nid_back: string | null;
  status: DealerStatus; admin_note: string | null; reviewed_at: Date | null; last_login_at: Date | null; created_at: Date;
  district: string; thana: string; union_name: string | null;
};

export const DEALER_SELECT = `SELECT dl.id, dl.level, dl.applied_level, dl.name, dl.phone, dl.email, dl.nid_number, dl.address, dl.district_id, dl.thana_id,
  dl.union_id, dl.photo, dl.bank_slip, dl.nid_front, dl.nid_back, dl.status, dl.admin_note, dl.reviewed_at, dl.last_login_at, dl.created_at,
  d.name AS district, t.name AS thana, u.name AS union_name
  FROM dealers dl JOIN districts d ON d.id = dl.district_id JOIN thanas t ON t.id = dl.thana_id LEFT JOIN unions u ON u.id = dl.union_id`;

export async function getDealerById(id: number) {
  return queryOne<Dealer>(`${DEALER_SELECT} WHERE dl.id = ?`, [id]);
}

/** The signed-in dealer (any status), or null. */
export const getDealer = cache(async (): Promise<Dealer | null> => {
  const session = await readSession("dealer");
  return session ? getDealerById(session.uid) : null;
});

export function areaName(d: Pick<Dealer, "level" | "applied_level" | "district" | "thana" | "union_name">) {
  const level = d.level ?? d.applied_level;
  if (level === "district") return d.district;
  if (level === "thana") return `${d.thana}, ${d.district}`;
  return [d.union_name, d.thana, d.district].filter(Boolean).join(", ");
}

// ───────────── months

/** "2026-10" for a date in Bangladesh time. */
export function monthOf(date: Date) {
  const bd = new Date(date.getTime() + 6 * 3600_000);
  return `${bd.getUTCFullYear()}-${String(bd.getUTCMonth() + 1).padStart(2, "0")}`;
}
export function shiftMonth(month: string, by: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
export const isMonth = (v: unknown): v is string => typeof v === "string" && /^20\d\d-(0[1-9]|1[0-2])$/.test(v);
export function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}
/** Picker options: 12 months back to 2 ahead, newest first. */
export function monthOptions(current: string) {
  return Array.from({ length: 15 }, (_, i) => shiftMonth(current, 2 - i));
}
/** [start, end) of a month in server-local DATETIME strings (orders.created_at is stored in Asia/Dhaka). */
function monthRange(month: string) {
  return [`${month}-01 00:00:00`, `${shiftMonth(month, 1)}-01 00:00:00`] as const;
}

// ───────────── sales & targets

/** Sales that count toward targets: product value of orders that were not cancelled or returned. */
const SALES = "COALESCE(SUM(o.subtotal - o.discount), 0)";
const COUNTED = "o.status NOT IN ('cancelled','returned')";

export type Sales = { amount: number; orders: number; delivered: number };

export async function areaSales(level: DealerLevel, areaId: number, month: string): Promise<Sales> {
  const col = level === "district" ? "district_id" : level === "thana" ? "thana_id" : "union_id";
  const [from, to] = monthRange(month);
  const r = await queryOne<{ amount: number; orders: number; delivered: number }>(
    `SELECT ${SALES} AS amount, COUNT(*) AS orders, COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.subtotal - o.discount END), 0) AS delivered
     FROM orders o WHERE o.${col} = ? AND ${COUNTED} AND o.created_at >= ? AND o.created_at < ?`,
    [areaId, from, to],
  );
  return { amount: Number(r?.amount ?? 0), orders: Number(r?.orders ?? 0), delivered: Number(r?.delivered ?? 0) };
}

/** Sales per child area (thanas of a district, or unions of a thana) for a month. */
export async function salesByChild(level: "district" | "thana", areaId: number, month: string) {
  const [parentCol, childCol] = level === "district" ? ["district_id", "thana_id"] : ["thana_id", "union_id"];
  const [from, to] = monthRange(month);
  const rows = await query<{ id: number; amount: number; orders: number }>(
    `SELECT o.${childCol} AS id, ${SALES} AS amount, COUNT(*) AS orders FROM orders o
     WHERE o.${parentCol} = ? AND o.${childCol} IS NOT NULL AND ${COUNTED} AND o.created_at >= ? AND o.created_at < ? GROUP BY o.${childCol}`,
    [areaId, from, to],
  );
  return new Map(rows.map((r) => [Number(r.id), { amount: Number(r.amount), orders: Number(r.orders) }]));
}

export async function targetFor(dealerId: number, month: string) {
  const r = await queryOne<{ amount: number; set_by: string; note: string | null }>(
    "SELECT amount, set_by, note FROM dealer_targets WHERE dealer_id = ? AND month = ?",
    [dealerId, month],
  );
  return r ? { amount: Number(r.amount), setBy: r.set_by, note: r.note } : null;
}

export type ChildRow = {
  id: number; name: string; bn_name: string | null;
  dealer: { id: number; name: string; phone: string; status: DealerStatus } | null;
  subDealers: number; target: number | null; sales: number; orders: number;
};

/**
 * The areas directly under a dealer (thanas of a district / unions of a thana) with their dealer, target and sales.
 * Only active dealers are shown as the area's dealer.
 */
export async function childAreas(level: "district" | "thana", areaId: number, month: string): Promise<ChildRow[]> {
  const childLevel = level === "district" ? "thana" : "union";
  const [table, parentCol, dealerCol] = level === "district" ? ["thanas", "district_id", "thana_id"] : ["unions", "thana_id", "union_id"];
  const [areas, dealers, subCounts, sales] = await Promise.all([
    query<{ id: number; name: string; bn_name: string | null }>(`SELECT id, name, bn_name FROM ${table} WHERE ${parentCol} = ? ORDER BY name`, [areaId]),
    query<{ id: number; name: string; phone: string; status: DealerStatus; area: number; target: number | null }>(
      `SELECT dl.id, dl.name, dl.phone, dl.status, dl.${dealerCol} AS area, t.amount AS target FROM dealers dl
       LEFT JOIN dealer_targets t ON t.dealer_id = dl.id AND t.month = ?
       WHERE dl.level = ? AND dl.status = 'active' AND dl.${level === "district" ? "district_id" : "thana_id"} = ?`,
      [month, childLevel, areaId],
    ),
    level === "district"
      ? query<{ area: number; n: number }>(
          "SELECT thana_id AS area, COUNT(*) AS n FROM dealers WHERE level = 'union' AND status = 'active' AND district_id = ? GROUP BY thana_id",
          [areaId],
        )
      : Promise.resolve([]),
    salesByChild(level, areaId, month),
  ]);
  return areas.map((a) => {
    const d = dealers.find((x) => Number(x.area) === a.id);
    const s = sales.get(a.id);
    return {
      ...a,
      dealer: d ? { id: d.id, name: d.name, phone: d.phone, status: d.status } : null,
      subDealers: Number(subCounts.find((x) => Number(x.area) === a.id)?.n ?? 0),
      target: d?.target != null ? Number(d.target) : null,
      sales: s?.amount ?? 0,
      orders: s?.orders ?? 0,
    };
  });
}

/** The area id a dealer covers at their level. */
export function dealerArea(d: Pick<Dealer, "level" | "district_id" | "thana_id" | "union_id">) {
  return d.level === "district" ? d.district_id : d.level === "thana" ? d.thana_id : (d.union_id ?? 0);
}

/** Another active dealer already holding this area at this level (one per area). */
export async function areaHolder(level: DealerLevel, d: Pick<Dealer, "district_id" | "thana_id" | "union_id">, exceptId = 0) {
  const col = level === "district" ? "district_id" : level === "thana" ? "thana_id" : "union_id";
  const val = level === "district" ? d.district_id : level === "thana" ? d.thana_id : d.union_id;
  if (!val) return null;
  return queryOne<{ id: number; name: string }>(
    `SELECT id, name FROM dealers WHERE level = ? AND status = 'active' AND ${col} = ? AND id <> ? LIMIT 1`,
    [level, val, exceptId],
  );
}

/** "01712345678" → "017•••••678" for lists other dealers can see. */
export const maskPhone = (p: string) => (p.length >= 11 ? `${p.slice(0, 3)}•••••${p.slice(-3)}` : p);

/** Days remaining (excluding today) in `month` if it is the current month, else null. */
export function daysLeftIn(month: string, now = new Date()) {
  if (month !== monthOf(now)) return null;
  const [y, m] = month.split("-").map(Number);
  const today = new Date(now.getTime() + 6 * 3600_000).getUTCDate();
  return new Date(Date.UTC(y, m, 0)).getUTCDate() - today;
}
