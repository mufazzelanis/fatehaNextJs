import { can, getAdmin } from "@/lib/auth";
import { queryOne } from "@/lib/db";

/** Live counters for the admin sidebar — only for sections this staff member may open. */
export async function GET() {
  const admin = await getAdmin();
  if (!admin) return Response.json({}, { status: 401 });
  const row = await queryOne<{ pending: number; verify: number; dealers: number; low: number; drafts: number; live: number }>(
    `SELECT
       (SELECT COUNT(*) FROM orders WHERE status = 'pending') AS pending,
       (SELECT COUNT(*) FROM orders WHERE payment_status = 'pending_verification' AND status NOT IN ('cancelled','returned')) AS verify,
       (SELECT COUNT(*) FROM dealers WHERE status = 'pending') AS dealers,
       (SELECT COUNT(*) FROM products WHERE is_active = 1 AND stock <= 5) AS low,
       (SELECT COUNT(*) FROM landing_pages WHERE status = 'draft') AS drafts,
       (SELECT COUNT(*) FROM landing_visits WHERE left_at IS NULL AND last_seen >= NOW() - INTERVAL 40 SECOND) AS live`,
  );
  const n = (v: unknown) => Number(v ?? 0);
  const badges: Record<string, { count: number; tone: "rose" | "amber" | "slate" | "live"; title: string }> = {};
  if (can(admin, "orders.view") && n(row?.pending)) badges["/admin/orders"] = { count: n(row?.pending), tone: "rose", title: "Pending orders" };
  if (can(admin, "settings.manage") && n(row?.verify)) badges["/admin/payments"] = { count: n(row?.verify), tone: "amber", title: "Payments to verify" };
  if (can(admin, "dealers.view") && n(row?.dealers)) badges["/admin/dealers"] = { count: n(row?.dealers), tone: "amber", title: "Dealer applications" };
  if (can(admin, "products.manage") && n(row?.low)) badges["/admin/products"] = { count: n(row?.low), tone: "amber", title: "Low stock (≤5)" };
  if (can(admin, "content.manage") && n(row?.drafts)) badges["/admin/landings"] = { count: n(row?.drafts), tone: "slate", title: "Draft landing pages" };
  if (can(admin, "dashboard.view") && n(row?.live)) badges["/admin/live-visitors"] = { count: n(row?.live), tone: "live", title: "On landing pages right now" };
  return Response.json(badges, { headers: { "Cache-Control": "private, no-store" } });
}
