import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { can, requirePermission } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { readLanding } from "@/lib/data/landings";
import { findComboLanding } from "@/lib/data/combo";
import { productImageUrl, type Product } from "@/lib/data/store";
import { createCombo } from "@/app/actions/combo";
import { PageHeader, PanelSkeleton } from "@/components/admin/ui";
import { ExternalIcon } from "@/components/icons";
import { ComboEditor } from "./combo-editor";

export const metadata = { title: "Combo Order Page" };

export default function ComboPage() {
  return (
    <Suspense fallback={<PanelSkeleton rows={10} />}>
      <Combo />
    </Suspense>
  );
}

const tk = (n: number) => `৳${Math.round(n).toLocaleString("en-IN")}`;

async function Combo() {
  const admin = await requirePermission("content.manage");
  await connection();
  const found = await findComboLanding();
  if (!found) {
    return (
      <>
        <PageHeader title="Combo Order Page" description="One page with 1 jar / 2-jar combo / 3-jar combo and the order form — the guide pages' order button opens it." />
        <section className="a-card mx-auto max-w-xl p-8 text-center">
          <p className="text-4xl">🛒</p>
          <h2 className="mt-3 text-lg font-semibold text-slate-900">No combo order page yet</h2>
          <p className="mt-1 text-sm text-slate-500">It is created with 3 packages and the delivery charges of your landing page. Set the prices, then turn it Live.</p>
          <form action={createCombo} className="mt-5"><button className="a-btn">Create the combo order page</button></form>
        </section>
      </>
    );
  }
  const l = (await readLanding(found.id))!;
  const [products, stats, byPkg] = await Promise.all([
    query<Product>("SELECT * FROM products WHERE is_active = 1 ORDER BY name"),
    queryOne<{ orders: number; revenue: number; delivered: number; today: number }>(
      `SELECT COUNT(*) orders, COALESCE(SUM(CASE WHEN status NOT IN ('cancelled','returned') THEN total END), 0) revenue,
              SUM(status = 'delivered') delivered, SUM(DATE(created_at) = CURDATE()) today
       FROM orders WHERE landing_id = ? AND created_at >= NOW() - INTERVAL 30 DAY`, [l.id]),
    // Which package people choose (order items are named "<product> — <package>").
    query<{ qty: number; n: number }>(
      `SELECT i.quantity qty, COUNT(*) n FROM orders o JOIN order_items i ON i.order_id = o.id
       WHERE o.landing_id = ? AND o.created_at >= NOW() - INTERVAL 30 DAY GROUP BY i.quantity ORDER BY i.quantity`, [l.id]),
  ]);
  const live = l.status === "published";
  const totalPkg = byPkg.reduce((s, r) => s + Number(r.n), 0);
  const pixelLabel = l.pixel_mode === "own" ? "own pixel" : l.pixel_mode === "both" ? "own + main pixel" : "main site pixel";

  return (
    <>
      <PageHeader title="Combo Order Page"
        description="1 jar / 2-jar combo / 3-jar combo — prices, free delivery and badges. Customers order on this page; the guide pages' “অর্ডার করতে ক্লিক করুন” button opens it."
        actions={<>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${live ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : "bg-amber-50 text-amber-800 ring-amber-600/20"}`}>{live ? "Live" : "Not live"}</span>
          <a href={live ? `/${l.slug}` : `/${l.slug}?preview=1`} target="_blank" className="a-btn"><ExternalIcon className="size-4" /> {live ? "Open page" : "Preview"}</a>
        </>} />
      <p className="-mt-3 mb-4 font-mono text-xs text-brand-700">/{l.slug}</p>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="a-card p-4"><p className="text-xs text-slate-500">Orders · 30 days</p><p className="mt-1 text-2xl font-bold tabular-nums">{Number(stats?.orders ?? 0)}</p><p className="text-xs text-slate-400">{Number(stats?.today ?? 0)} today</p></div>
        <div className="a-card p-4"><p className="text-xs text-slate-500">Revenue · 30 days</p><p className="mt-1 text-2xl font-bold tabular-nums">{tk(Number(stats?.revenue ?? 0))}</p><p className="text-xs text-slate-400">{Number(stats?.delivered ?? 0)} delivered</p></div>
        <div className="a-card p-4">
          <p className="text-xs text-slate-500">Packages chosen</p>
          {totalPkg ? (
            <div className="mt-1.5 space-y-1">
              {byPkg.map((r) => (
                <div key={r.qty} className="flex items-center gap-2 text-xs">
                  <span className="w-12 text-slate-600">{r.qty} jar{Number(r.qty) > 1 ? "s" : ""}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><span className="block h-full bg-brand-500" style={{ width: `${(Number(r.n) / totalPkg) * 100}%` }} /></span>
                  <span className="w-8 text-right tabular-nums">{Math.round((Number(r.n) / totalPkg) * 100)}%</span>
                </div>
              ))}
            </div>
          ) : <p className="mt-1 text-sm text-slate-400">No orders yet</p>}
        </div>
        <div className="a-card p-4">
          <p className="text-xs text-slate-500">Facebook pixel</p>
          <p className="mt-1 font-semibold text-slate-900">{pixelLabel}</p>
          <p className="text-xs text-slate-400">ViewContent · AddToCart · InitiateCheckout · Purchase + Conversions API</p>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2 text-sm">
        {can(admin, "marketing.manage") && <Link href={`/admin/landings/${l.id}?tab=pixel`} className="a-btn-outline">🎯 Pixel &amp; Conversions API</Link>}
        <Link href={`/admin/landings/${l.id}?tab=content`} className="a-btn-outline">✏️ Page text (title, points, badges)</Link>
        {can(admin, "checkout.manage") && <Link href={`/admin/landings/${l.id}?tab=checkout`} className="a-btn-outline">📋 Order form &amp; delivery charges</Link>}
        <Link href={`/admin/landings/${l.id}`} className="a-btn-outline">🔗 URL &amp; order prefix</Link>
        <Link href={`/admin/orders?landing=${l.id}`} className="a-btn-outline">📦 Orders from this page</Link>
      </div>

      <ComboEditor landingId={l.id} initial={l.checkout.packages} productId={l.product_id ?? products[0]?.id ?? 0} live={live} accent={l.checkout.buttonColor}
        products={products.map((p) => ({ id: p.id, name: p.name, price: Number(p.price), image: productImageUrl(p), stock: p.stock }))} />
    </>
  );
}
