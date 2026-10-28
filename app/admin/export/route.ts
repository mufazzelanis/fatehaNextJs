import { can, getAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { exportOrders, parseCustomFields, zoneLabel } from "@/lib/data/orders";
import { listLandingOptions } from "@/lib/data/landings";

function csvCell(value: unknown) {
  const s = value instanceof Date ? value.toISOString() : String(value ?? "");
  // Neutralise spreadsheet formula injection and quote everything.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const admin = await getAdmin();
  if (!admin) return new Response("Unauthorized", { status: 401 });
  if (!can(admin, "orders.export")) return new Response("Forbidden", { status: 403 });
  const sp = new URL(request.url).searchParams;
  const rows = await exportOrders({
    status: sp.get("status") ?? undefined,
    q: sp.get("q") ?? undefined,
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
    payment: sp.get("payment") ?? undefined,
    source: sp.get("source") ?? undefined,
    landing: Number(sp.get("landing")) || undefined,
    method: sp.get("method") ?? undefined,
    time: sp.get("time") ?? undefined,
  });

  await logActivity({ actor: admin, action: "order.exported", module: "orders", description: `Exported ${rows.length} order(s) to CSV` });
  const landings = await listLandingOptions();
  const header = ["Order No", "Date", "Source", "Status", "Payment", "Payment status", "Transaction ID", "Customer", "Phone", "Address", "Zone", "Items", "Subtotal", "Shipping", "Discount", "Total", "Note", "Extra fields", "Admin Note"];
  const lines = rows.map((o) =>
    [o.order_no, o.created_at, o.source === "store" ? "Main site" : `Landing: ${landings.find((l) => l.id === o.landing_id)?.name ?? "—"}`,
     o.status, o.payment_method, o.payment_status, o.payment_trx, o.customer_name, o.phone, o.address, zoneLabel(o), o.items, o.subtotal,
     o.shipping_charge, o.discount, o.total, o.note,
     parseCustomFields(o.custom_fields).map((c) => c.label + ": " + c.value).join(" | "), o.admin_note].map(csvCell).join(","),
  );
  // BOM so Excel opens Bangla text correctly.
  const body = "﻿" + [header.map(csvCell).join(","), ...lines].join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
