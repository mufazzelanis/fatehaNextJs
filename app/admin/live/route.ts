import { can, getAdmin } from "@/lib/auth";
import { getLiveStats } from "@/lib/data/live";

/** Live landing-page visitors for the dashboard card (polled every few seconds). */
export async function GET() {
  const admin = await getAdmin();
  if (!admin) return Response.json({}, { status: 401 });
  if (!can(admin, "dashboard.view")) return Response.json({}, { status: 403 });
  return Response.json(await getLiveStats(), { headers: { "Cache-Control": "private, no-store" } });
}
