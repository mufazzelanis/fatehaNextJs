import Link from "next/link";
import { Suspense } from "react";
import { requirePermission } from "@/lib/auth";
import { query } from "@/lib/db";
import { getOrderById, parseCustomFields, zoneLabel } from "@/lib/data/orders";
import { readInvoiceConfig } from "@/lib/data/landings";
import { dateTime } from "@/lib/format";
import { isPaymentMethod, PAYMENT_LABEL, PAYMENT_STATUS_META, type PaymentStatus } from "@/lib/payments";
import type { InvoicePaper, InvoiceProfile } from "@/lib/invoice";
import { InvoiceDocument, INVOICE_PRINT_CSS, type InvoiceData } from "@/components/invoice/invoice-document";
import { PrintButton } from "./print-button";

export const metadata = { title: "Invoice", robots: { index: false } };

export default function InvoicePage({ searchParams }: PageProps<"/admin/invoice">) {
  return (
    <Suspense fallback={<p className="p-8 text-center text-slate-500">Loading invoice…</p>}>
      <Invoices searchParams={searchParams} />
    </Suspense>
  );
}

const BN_PAY: Record<string, string> = { cod: "ক্যাশ অন ডেলিভারি", bkash: "বিকাশ", nagad: "নগদ", rocket: "রকেট", bank: "ব্যাংক ট্রান্সফার" };

async function Invoices({ searchParams }: Pick<PageProps<"/admin/invoice">, "searchParams">) {
  await requirePermission("orders.export");
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const ids = one("ids");
  const design = one("design") === "store" || one("design") === "landing" ? (one("design") as "store" | "landing") : "auto";
  const paper = ["a4", "a5", "pos80"].includes(one("paper")) ? (one("paper") as InvoicePaper) : null;
  const list = ids.split(",").map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 100);
  const [config, ...orders] = await Promise.all([readInvoiceConfig(), ...list.map((id) => getOrderById(id))]);
  const found = orders.filter((o) => o !== null);

  const landingIds = [...new Set(found.map((o) => o.landing_id).filter((x): x is number => !!x))];
  const areaIds = found.filter((o) => o.district_id);
  const [landings, areas] = await Promise.all([
    landingIds.length
      ? query<{ id: number; name: string; invoice_name: string | null }>(`SELECT id, name, invoice_name FROM landing_pages WHERE id IN (${landingIds.map(() => "?").join(",")})`, landingIds)
      : Promise.resolve([]),
    areaIds.length
      ? query<{ id: number; area: string }>(
          `SELECT o.id, CONCAT_WS(', ', u.name, t.name, d.name) AS area FROM orders o
           LEFT JOIN districts d ON d.id = o.district_id LEFT JOIN thanas t ON t.id = o.thana_id LEFT JOIN unions u ON u.id = o.union_id
           WHERE o.id IN (${areaIds.map(() => "?").join(",")})`,
          areaIds.map((o) => o.id),
        )
      : Promise.resolve([]),
  ]);

  const qs = (patch: Record<string, string>) => {
    const u = new URLSearchParams({ ids, ...(design !== "auto" ? { design } : {}), ...(paper ? { paper } : {}), ...patch });
    for (const [k, v] of [...u.entries()]) if (!v) u.delete(k);
    return `/admin/invoice?${u}`;
  };

  return (
    <div className="min-h-screen bg-slate-100 py-6 font-ui print:bg-white print:py-0">
      <style>{INVOICE_PRINT_CSS}</style>
      <div className="no-print sticky top-0 z-10 mx-auto mb-6 flex max-w-4xl flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/90 px-4 py-3 shadow-sm backdrop-blur">
        <p className="text-sm text-slate-600"><b className="text-slate-900">{found.length}</b> invoice(s)</p>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-500">Design</span>
          {(["auto", "store", "landing"] as const).map((d) => (
            <Link key={d} href={qs({ design: d === "auto" ? "" : d })}
              className={`rounded-lg px-2.5 py-1.5 font-medium ${design === d ? "bg-brand-700 text-white" : "text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`}>
              {d === "auto" ? "Auto" : d === "store" ? "Main site" : "Landing"}
            </Link>
          ))}
          <span className="ml-2 text-slate-500">Paper</span>
          {([["", "Saved"], ["a4", "A4"], ["a5", "A5"], ["pos80", "80mm"]] as const).map(([k, label]) => (
            <Link key={k} href={qs({ paper: k })}
              className={`rounded-lg px-2.5 py-1.5 font-medium ${(paper ?? "") === k ? "bg-brand-700 text-white" : "text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`}>{label}</Link>
          ))}
          <Link href="/admin/invoice-settings" className="ml-1 text-xs font-medium text-brand-700 underline">Edit designs</Link>
        </div>
        <PrintButton />
      </div>
      <div className="space-y-8 print:space-y-0">
        {found.map((o) => {
          const kind = design === "auto" ? (o.source === "store" ? "store" : "landing") : design;
          const base = config[kind];
          const profile: InvoiceProfile = paper ? { ...base, paper } : base;
          const landing = landings.find((l) => l.id === o.landing_id);
          const status = (o.payment_status as PaymentStatus) in PAYMENT_STATUS_META ? (o.payment_status as PaymentStatus) : "unpaid";
          const method = isPaymentMethod(o.payment_method) ? o.payment_method : "cod";
          const bn = profile.lang === "bn";
          const data: InvoiceData = {
            orderNo: o.order_no,
            date: dateTime(o.created_at),
            customer: o.customer_name,
            phone: o.phone,
            address: o.address,
            area: areas.find((a) => a.id === o.id)?.area || null,
            items: o.items.map((i) => ({ name: i.product_name, price: Number(i.unit_price), qty: i.quantity, total: Number(i.line_total) })),
            subtotal: Number(o.subtotal), shipping: Number(o.shipping_charge), shippingLabel: zoneLabel(o), discount: Number(o.discount), total: Number(o.total),
            payment: {
              method: bn ? BN_PAY[method] : PAYMENT_LABEL[method],
              status: bn ? ({ unpaid: "অপরিশোধিত", pending_verification: "যাচাই চলছে", paid: "পরিশোধিত", refunded: "ফেরত" } as const)[status] : PAYMENT_STATUS_META[status].label,
              paid: status === "paid", trx: o.payment_trx, sender: o.payment_sender,
            },
            note: o.note,
            extra: parseCustomFields(o.custom_fields),
            source: o.source === "store" ? (bn ? "ওয়েবসাইট" : "Website") : landing?.name ?? "Landing page",
          };
          return (
            <InvoiceDocument key={o.id} profile={profile} data={data} nameOverride={kind === "landing" ? landing?.invoice_name : null}
              defaultLogo={kind === "store" ? "/brand/fatehabd-logo.webp" : null} />
          );
        })}
      </div>
      {found.length === 0 && <p className="text-center text-slate-500">No orders found.</p>}
    </div>
  );
}
