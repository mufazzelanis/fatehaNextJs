import { can, getAdmin } from "@/lib/auth";
import { exportActivity } from "@/lib/data/activity";
import { logActivity } from "@/lib/activity";

function csvCell(value: unknown) {
  const s = value instanceof Date ? value.toISOString() : String(value ?? "");
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const admin = await getAdmin();
  if (!admin) return new Response("Unauthorized", { status: 401 });
  if (!can(admin, "logs.view")) return new Response("Forbidden", { status: 403 });
  const sp = new URL(request.url).searchParams;
  const rows = await exportActivity({
    user: sp.get("user") ?? undefined, module: sp.get("module") ?? undefined, q: sp.get("q") ?? undefined,
    from: sp.get("from") ?? undefined, to: sp.get("to") ?? undefined, entity: sp.get("entity") ?? undefined, id: sp.get("id") ?? undefined,
  });
  await logActivity({ actor: admin, action: "activity.exported", module: "users", description: `Exported ${rows.length} activity log entr${rows.length === 1 ? "y" : "ies"}` });

  const header = ["Time", "Person", "Area", "Action", "Description", "Changes", "Entity", "IP", "Device"];
  const lines = rows.map((r) =>
    [r.created_at, r.user_name ?? "Customer/system", r.module, r.action, r.description,
     r.changes.map((c) => `${c.field}: ${c.from ?? "—"} → ${c.to ?? "—"}`).join(" | "),
     r.entity_type ? `${r.entity_type} ${r.entity_id ?? ""}` : "", r.ip_address, r.user_agent].map(csvCell).join(","),
  );
  const body = "﻿" + [header.map(csvCell).join(","), ...lines].join("\r\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="activity-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
