import Link from "next/link";
import { Suspense } from "react";
import { requirePermission } from "@/lib/auth";
import { query } from "@/lib/db";
import { readPaymentConfig } from "@/lib/data/catalog";
import { PAYMENT_LABEL, PAYMENT_METHODS, isPaymentMethod } from "@/lib/payments";
import { bdt } from "@/lib/store-config";
import { PageHeader, PanelSkeleton } from "@/components/admin/ui";
import { PaymentsForm } from "./payments-form";

export const metadata = { title: "Payments" };

export default function PaymentsPage() {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <Payments />
    </Suspense>
  );
}

async function Payments() {
  await requirePermission("settings.manage");
  const [config, usage] = await Promise.all([
    readPaymentConfig(),
    query<{ method: string; n: number; total: number; pending: number }>(
      `SELECT payment_method AS method, COUNT(*) AS n, COALESCE(SUM(total),0) AS total, SUM(payment_status = 'pending_verification') AS pending
       FROM orders WHERE created_at >= NOW() - INTERVAL 30 DAY AND status NOT IN ('cancelled') GROUP BY payment_method`,
    ),
  ]);
  const pending = usage.reduce((s, u) => s + Number(u.pending ?? 0), 0);

  return (
    <>
      <PageHeader title="Payments" description="Choose how customers can pay on the store checkout. The landing page keeps Cash on Delivery." />
      {pending > 0 && (
        <Link href="/admin/orders?payment=pending_verification"
          className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 transition hover:bg-amber-100">
          <span><strong>{pending}</strong> mobile/bank payment(s) are waiting for you to check the Transaction ID.</span>
          <span className="font-medium">Review →</span>
        </Link>
      )}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {PAYMENT_METHODS.map((m) => {
          const u = usage.find((x) => isPaymentMethod(x.method) && x.method === m);
          return (
            <div key={m} className="a-card p-4">
              <p className="flex items-center justify-between text-xs font-medium text-slate-500">
                {PAYMENT_LABEL[m]}
                <span className={`size-2 rounded-full ${config[m].enabled ? "bg-emerald-500" : "bg-slate-300"}`} title={config[m].enabled ? "On" : "Off"} />
              </p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{Number(u?.n ?? 0)} <span className="text-xs font-normal text-slate-400">orders</span></p>
              <p className="text-xs text-slate-500">{bdt(Number(u?.total ?? 0))} · 30 days</p>
            </div>
          );
        })}
      </div>
      <PaymentsForm config={config} />
    </>
  );
}
