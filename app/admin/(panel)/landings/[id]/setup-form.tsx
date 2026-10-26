"use client";

import { useActionState, useState } from "react";
import { deleteLanding, saveLandingSetup } from "@/app/actions/landings";
import { initialState } from "@/lib/action-state";
import { landingSlugError, slugifyLanding, type LandingStatus } from "@/lib/landing";
import { bdt } from "@/lib/store-config";
import { FieldError, FormAlert, keepValuesOnSubmit, SubmitButton } from "@/components/form-bits";
import { TrashIcon } from "@/components/icons";
import { useOrigin } from "../landing-forms";

type Setup = {
  id: number; name: string; slug: string; status: LandingStatus; product_id: number | null; seo_title: string; seo_description: string;
  order_prefix: string; footer_name: string; invoice_name: string; bannerUrl: string; hasBanner: boolean;
};

const STATUSES: { key: LandingStatus; title: string; text: string; cls: string }[] = [
  { key: "published", title: "Live", text: "Anyone can open it and order", cls: "border-emerald-400 bg-emerald-50/60" },
  { key: "draft", title: "Draft", text: "Hidden — only staff can preview", cls: "border-amber-400 bg-amber-50/60" },
  { key: "archived", title: "Archived", text: "Closed; orders are kept", cls: "border-slate-400 bg-slate-50" },
];

export function LandingSetupForm({ landing: l, products, defaultFooter }: {
  landing: Setup; products: { id: number; name: string; price: number; stock: number; is_active: number }[]; defaultFooter: string;
}) {
  const [state, action, pending] = useActionState(saveLandingSetup, initialState);
  const fe = state.fieldErrors ?? {};
  const origin = useOrigin().replace(/^https?:\/\//, "") || "fatehabd.com";
  const [slug, setSlug] = useState(l.slug);
  const [status, setStatus] = useState<LandingStatus>(l.status);
  const [productId, setProductId] = useState(String(l.product_id ?? ""));
  const [prefix, setPrefix] = useState(l.order_prefix);
  const [seoTitle, setSeoTitle] = useState(l.seo_title || l.name);
  const [seoDesc, setSeoDesc] = useState(l.seo_description);
  const [banner, setBanner] = useState<string | null>(null);
  const product = products.find((p) => String(p.id) === productId);
  const slugErr = landingSlugError(slug);

  return (
    <>
      <form onSubmit={keepValuesOnSubmit(action)} className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <input type="hidden" name="id" value={l.id} />
        <div className="min-w-0 space-y-6 xl:col-span-2">
          <section className="a-card space-y-4 p-5">
            <h2 className="font-medium text-slate-900">Page & URL</h2>
            <label className="block">
              <span className="a-label">Page name (shown in admin, orders and reports)</span>
              <input name="name" defaultValue={l.name} className="a-input font-sans" aria-invalid={!!fe.name} />
              <FieldError message={fe.name} />
            </label>
            <label className="block">
              <span className="a-label">URL — you choose it</span>
              <div className="flex items-center overflow-hidden rounded-lg border border-slate-200 focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/15">
                <span className="shrink-0 bg-slate-50 px-3 py-2 text-sm text-slate-400">{origin}/</span>
                <input name="slug" value={slug} onChange={(e) => setSlug(slugifyLanding(e.target.value))} className="min-w-0 flex-1 px-3 py-2 text-sm outline-none" aria-invalid={!!(fe.slug || slugErr)} />
              </div>
              <FieldError message={fe.slug ?? slugErr ?? undefined} />
              {slug !== l.slug && !slugErr && <p className="mt-1 text-xs text-amber-700">After saving, the old link /{l.slug} stops working — update your Facebook ads.</p>}
            </label>
            <div>
              <span className="a-label">Status</span>
              <div className="grid gap-2 sm:grid-cols-3">
                {STATUSES.map((s) => (
                  <label key={s.key} className={`cursor-pointer rounded-xl border-2 p-3 transition ${status === s.key ? s.cls : "border-slate-200 hover:border-slate-300"}`}>
                    <input type="radio" name="status" value={s.key} checked={status === s.key} onChange={() => setStatus(s.key)} className="sr-only" />
                    <span className="block text-sm font-semibold text-slate-900">{s.title}</span>
                    <span className="block text-xs text-slate-500">{s.text}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>

          <section className="a-card space-y-4 p-5">
            <h2 className="font-medium text-slate-900">Product</h2>
            <label className="block">
              <span className="a-label">Product sold on this page — price & stock come from Products</span>
              <select name="product_id" value={productId} onChange={(e) => setProductId(e.target.value)} className="a-input" aria-invalid={!!fe.product_id}>
                <option value="">Choose a product…</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}{p.is_active ? "" : " (disabled)"}</option>)}
              </select>
              <FieldError message={fe.product_id} />
            </label>
            {product && (
              <p className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-slate-600">Price <strong className="text-slate-900">{bdt(product.price)}</strong></span>
                <span className={`rounded-lg px-2.5 py-1.5 ${product.stock <= 10 ? "bg-amber-50 text-amber-800" : "bg-slate-50 text-slate-600"}`}>Stock <strong>{product.stock}</strong></span>
                {!product.is_active && <span className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-rose-700">This product is disabled — orders will be refused</span>}
              </p>
            )}
            <div>
              <span className="a-label">Label banner (wide image at the top, approx. 1060×300)</span>
              <div className="overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={banner ?? l.bannerUrl} alt="" className="h-auto w-full" />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <label className="a-btn-outline cursor-pointer">
                  Choose banner…
                  <input type="file" name="banner" accept="image/jpeg,image/png,image/webp" className="sr-only"
                    onChange={(e) => { const f = e.target.files?.[0]; setBanner(f ? URL.createObjectURL(f) : null); }} />
                </label>
                {l.hasBanner && <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" name="remove_banner" className="size-4 accent-rose-600" /> Use the default banner</label>}
              </div>
              <FieldError message={fe.banner} />
            </div>
          </section>

          <section className="a-card space-y-4 p-5">
            <h2 className="font-medium text-slate-900">Google & Facebook preview</h2>
            <label className="block">
              <span className="a-label">Title ({seoTitle.length}/60 recommended)</span>
              <input name="seo_title" value={seoTitle} maxLength={200} onChange={(e) => setSeoTitle(e.target.value)} className="a-input font-sans" />
            </label>
            <label className="block">
              <span className="a-label">Description ({seoDesc.length}/160 recommended)</span>
              <textarea name="seo_description" value={seoDesc} maxLength={300} rows={2} onChange={(e) => setSeoDesc(e.target.value)} className="a-input font-sans" />
            </label>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="truncate text-xs text-emerald-700">{origin} › {slug}</p>
              <p className="mt-0.5 line-clamp-1 font-sans text-lg text-[#1a0dab]">{seoTitle || l.name}</p>
              <p className="mt-0.5 line-clamp-2 font-sans text-sm text-slate-600">{seoDesc || "Add a short description so people know what they get."}</p>
            </div>
          </section>
        </div>

        <div className="min-w-0 space-y-6">
          <section className="a-card space-y-4 p-5">
            <h2 className="font-medium text-slate-900">Orders & invoice</h2>
            <label className="block">
              <span className="a-label">Order number prefix</span>
              <input name="order_prefix" value={prefix} maxLength={5} onChange={(e) => setPrefix(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
                className="a-input font-mono uppercase" aria-invalid={!!fe.order_prefix} />
              <FieldError message={fe.order_prefix} />
              <span className="mt-1 block text-xs text-slate-400">New orders look like <strong className="font-mono text-slate-600">#{prefix || "DC"}10025</strong></span>
            </label>
            <label className="block">
              <span className="a-label">Footer brand name</span>
              <input name="footer_name" defaultValue={l.footer_name} placeholder={defaultFooter} className="a-input font-sans" />
              <span className="mt-1 block text-xs text-slate-400">“© 2026 … All rights reserved.” Empty = Landing Settings default.</span>
            </label>
            <label className="block">
              <span className="a-label">Name on the invoice</span>
              <input name="invoice_name" defaultValue={l.invoice_name} placeholder="Landing invoice design default" className="a-input font-sans" />
              <span className="mt-1 block text-xs text-slate-400">Overrides the company name on invoices of this page&apos;s orders.</span>
            </label>
          </section>
          <div className="space-y-3 xl:sticky xl:top-24">
            <FormAlert error={state.error} message={state.message} />
            <SubmitButton className="a-btn w-full py-2.5" pendingText="Saving…" pending={pending}>Save setup</SubmitButton>
          </div>
        </div>
      </form>
      <DeleteLanding id={l.id} />
    </>
  );
}

function DeleteLanding({ id }: { id: number }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <section className="a-card mt-6 flex flex-wrap items-center justify-between gap-3 border-rose-200 p-5">
      <div>
        <h2 className="font-medium text-rose-700">Delete landing page</h2>
        <p className="mt-0.5 text-sm text-slate-500">Pages with orders are archived instead, so order history stays complete.</p>
      </div>
      {confirm ? (
        <form action={deleteLanding} className="flex gap-2">
          <input type="hidden" name="id" value={id} />
          <button type="button" onClick={() => setConfirm(false)} className="a-btn-outline">Cancel</button>
          <SubmitButton className="a-btn bg-rose-600 hover:bg-rose-700" pendingText="…">Yes, delete</SubmitButton>
        </form>
      ) : (
        <button type="button" onClick={() => setConfirm(true)} className="a-btn-outline text-rose-700"><TrashIcon className="size-4" /> Delete</button>
      )}
    </section>
  );
}
