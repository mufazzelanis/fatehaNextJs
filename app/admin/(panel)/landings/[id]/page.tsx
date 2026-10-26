import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { can, requirePermission } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { readLanding, readLandingSettings, landingBannerUrl } from "@/lib/data/landings";
import { productImageUrl, type Product } from "@/lib/data/store";
import { LANDING_STATUS_META } from "@/lib/landing";
import { bdt } from "@/lib/store-config";
import { PageHeader, PanelSkeleton } from "@/components/admin/ui";
import { ChevronLeftIcon, ExternalIcon, EyeIcon } from "@/components/icons";
import { CopyUrl } from "../landing-forms";
import { ContentEditor } from "./content-editor";
import { CheckoutEditor } from "./checkout-editor";
import { LandingSetupForm } from "./setup-form";

export const metadata = { title: "Edit landing page" };

const TABS = [
  { key: "setup", label: "Setup & URL" },
  { key: "content", label: "Page content" },
  { key: "checkout", label: "Checkout form" },
] as const;

export default function LandingEditorPage(props: PageProps<"/admin/landings/[id]">) {
  return (
    <Suspense fallback={<PanelSkeleton rows={12} />}>
      <LandingEditor {...props} />
    </Suspense>
  );
}

async function LandingEditor({ params, searchParams }: PageProps<"/admin/landings/[id]">) {
  const admin = await requirePermission("content.manage");
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const l = await readLanding(id);
  if (!l) notFound();
  const sp = await searchParams;
  const canCheckout = can(admin, "checkout.manage");
  const tab = TABS.some((t) => t.key === sp.tab) && (sp.tab !== "checkout" || canCheckout) ? (sp.tab as (typeof TABS)[number]["key"]) : "setup";
  const [product, products, stats, settings] = await Promise.all([
    l.product_id ? queryOne<Product>("SELECT * FROM products WHERE id = ?", [l.product_id]) : null,
    query<{ id: number; name: string; price: number; stock: number; is_active: number }>("SELECT id, name, price, stock, is_active FROM products ORDER BY is_active DESC, name"),
    queryOne<{ orders: number; revenue: number; today: number }>(
      `SELECT COUNT(*) AS orders, COALESCE(SUM(CASE WHEN status NOT IN ('cancelled','returned') THEN total END), 0) AS revenue,
         SUM(DATE(created_at) = CURDATE()) AS today FROM orders WHERE landing_id = ?`,
      [id],
    ),
    readLandingSettings(),
  ]);
  const meta = LANDING_STATUS_META[l.status];
  const viewUrl = l.status === "published" ? `/${l.slug}` : `/${l.slug}?preview=1`;

  return (
    <>
      <Link href="/admin/landings" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"><ChevronLeftIcon className="size-4" /> All landing pages</Link>
      <PageHeader title={l.name}
        description={`${bdt(Number(stats?.revenue ?? 0))} revenue · ${stats?.orders ?? 0} orders (${stats?.today ?? 0} today) · ${l.views.toLocaleString("en-IN")} visitors`}
        actions={<>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${meta.className}`}>{meta.label}</span>
          <Link href={`/admin/orders?landing=${l.id}`} className="a-btn-outline">Orders</Link>
          <a href={viewUrl} target="_blank" className="a-btn">{l.status === "published" ? <><ExternalIcon className="size-4" /> Open page</> : <><EyeIcon className="size-4" /> Preview</>}</a>
        </>} />
      <div className="-mt-3 mb-4"><CopyUrl path={`/${l.slug}`} /></div>
      {sp.created === "1" && <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Landing page created as a draft. Edit the content, preview it, then set the status to Live.</p>}

      <div className="-mx-4 mb-5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex w-max gap-1 rounded-xl bg-white p-1 shadow-xs ring-1 ring-slate-200/80">
          {TABS.filter((t) => t.key !== "checkout" || canCheckout).map((t) => (
            <Link key={t.key} href={`/admin/landings/${l.id}${t.key === "setup" ? "" : `?tab=${t.key}`}`} scroll={false}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${tab === t.key ? "bg-brand-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}>{t.label}</Link>
          ))}
        </div>
      </div>

      {tab === "setup" && (
        <LandingSetupForm products={products.map((p) => ({ ...p, price: Number(p.price) }))} defaultFooter={settings.footerName}
          landing={{
            id: l.id, name: l.name, slug: l.slug, status: l.status, product_id: l.product_id, seo_title: l.seo_title ?? "", seo_description: l.seo_description ?? "",
            order_prefix: l.order_prefix, footer_name: l.footer_name ?? "", invoice_name: l.invoice_name ?? "", bannerUrl: landingBannerUrl(l), hasBanner: !!l.banner_image,
          }} />
      )}
      {tab === "content" && <ContentEditor initial={l.content} landingId={l.id} />}
      {tab === "checkout" && (
        <CheckoutEditor initial={l.checkout} landingId={l.id}
          product={{
            id: product?.id ?? 0, name: product?.name ?? "Product", weight: product?.weight ?? null,
            price: Number(product?.price ?? 0), image: productImageUrl(product), stock: Math.max(product?.stock ?? 10, 1),
          }} />
      )}
    </>
  );
}
