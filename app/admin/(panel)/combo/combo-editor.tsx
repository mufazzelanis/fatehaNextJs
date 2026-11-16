"use client";

import { useActionState, useState } from "react";
import { saveCombo } from "@/app/actions/combo";
import { initialState } from "@/lib/action-state";
import { MAX_PACKAGES, packagePrice, type OrderPackage, type PackagesConfig } from "@/lib/checkout";
import { PackagePicker } from "@/components/landing/package-picker";
import { FormAlert, SubmitButton } from "@/components/form-bits";
import { PlusIcon, TrashIcon } from "@/components/icons";

type Product = { id: number; name: string; price: number; image: string; stock: number };
const bnNum = (n: number) => String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);
const iconBtn = "grid size-8 place-items-center rounded-lg text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-30";

/** Combo prices, badges, free delivery and Live on/off — with the customer's view right beside it. */
export function ComboEditor({ landingId, initial, products, productId, live, accent }: {
  landingId: number; initial: PackagesConfig; products: Product[]; productId: number; live: boolean; accent: string;
}) {
  const [state, action] = useActionState(saveCombo, initialState);
  const [pk, setPk] = useState(initial);
  const [pid, setPid] = useState(productId);
  const [isLive, setLive] = useState(live);
  const product = products.find((p) => p.id === pid) ?? products[0];
  const set = (i: number, patch: Partial<OrderPackage>) => setPk((x) => ({ ...x, items: x.items.map((p, j) => (j === i ? { ...p, ...patch } : p)) }));
  const move = (i: number, d: number) => setPk((x) => { const items = [...x.items]; [items[i], items[i + d]] = [items[i + d], items[i]]; return { ...x, items }; });
  const remove = (i: number) => setPk((x) => {
    const items = x.items.filter((_, j) => j !== i);
    return { ...x, items, defaultId: items.some((p) => p.id === x.defaultId) ? x.defaultId : items[0]?.id ?? "" };
  });
  const add = () => setPk((x) => {
    let n = x.items.length + 1;
    while (x.items.some((p) => p.id === `p${n}`)) n++;
    const qty = Math.max(...x.items.map((p) => p.qty), 0) + 1;
    return { ...x, items: [...x.items, { id: `p${n}`, qty, title: `${bnNum(qty)}টি জারের কম্বো`, subtitle: "", price: 0, badge: "", freeDelivery: false }] };
  });

  return (
    <form action={action} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start">
      <input type="hidden" name="landing" value={landingId} />
      <input type="hidden" name="packages" value={JSON.stringify(pk)} />
      <input type="hidden" name="product" value={pid} />
      {isLive && <input type="hidden" name="live" value="on" />}

      <div className="space-y-4">
        <section className="a-card grid gap-4 p-5 sm:grid-cols-2">
          <label className="block">
            <span className="a-label">Product</span>
            <select value={pid} onChange={(e) => setPid(Number(e.target.value))} className="a-input">
              {products.map((p) => <option key={p.id} value={p.id}>{p.name} — ৳{p.price}</option>)}
            </select>
            <span className="mt-1 block text-xs text-slate-500">Regular price ৳{product?.price} per jar · stock {product?.stock}</span>
          </label>
          <label className="block">
            <span className="a-label">Heading above the packages</span>
            <input value={pk.title} onChange={(e) => setPk({ ...pk, title: e.target.value })} className="a-input font-sans" />
          </label>
        </section>

        {pk.items.map((p, i) => {
          const regular = (product?.price ?? 0) * p.qty;
          const price = packagePrice(p, product?.price ?? 0);
          const save = regular - price;
          return (
            <section key={p.id} className={`a-card space-y-3 p-5 ${pk.defaultId === p.id ? "ring-2 ring-brand-300" : ""}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="grid size-8 place-items-center rounded-full bg-brand-700 text-sm font-bold text-white">{p.qty}</span>
                <h2 className="font-medium text-slate-900">{p.title || "New package"}</h2>
                <label className="ml-2 flex items-center gap-1.5 text-xs text-slate-600">
                  <input type="radio" checked={pk.defaultId === p.id} onChange={() => setPk({ ...pk, defaultId: p.id })} className="accent-brand-600" />
                  Selected when the page opens
                </label>
                <span className="ml-auto flex gap-1">
                  <button type="button" className={iconBtn} disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">↑</button>
                  <button type="button" className={iconBtn} disabled={i === pk.items.length - 1} onClick={() => move(i, 1)} aria-label="Move down">↓</button>
                  <button type="button" className={`${iconBtn} text-rose-500 hover:bg-rose-50`} disabled={pk.items.length === 1} onClick={() => remove(i)} aria-label="Remove package"><TrashIcon className="size-4" /></button>
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-[6rem_1fr_1fr]">
                <label className="block"><span className="a-label">Jars</span>
                  <input type="number" min={1} max={20} value={p.qty} onChange={(e) => set(i, { qty: Math.min(Math.max(Number(e.target.value) || 1, 1), 20) })} className="a-input" /></label>
                <label className="block"><span className="a-label">Name</span>
                  <input value={p.title} onChange={(e) => set(i, { title: e.target.value })} className="a-input font-sans" /></label>
                <label className="block"><span className="a-label">Small line</span>
                  <input value={p.subtitle} onChange={(e) => set(i, { subtitle: e.target.value })} placeholder="e.g. প্রায় ২ মাসের কোর্স" className="a-input font-sans" /></label>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
                <label className="block">
                  <span className="a-label">Price for the whole package (৳)</span>
                  <input type="number" min={0} value={p.price || ""} placeholder={String(regular)} onChange={(e) => set(i, { price: Math.max(Number(e.target.value) || 0, 0) })} className="a-input text-lg font-semibold" />
                  <span className={`mt-1 block text-xs ${save > 0 ? "font-semibold text-emerald-700" : "text-slate-500"}`}>
                    {save > 0 ? `Customer saves ৳${save} (regular ৳${regular}) · ৳${Math.round(price / p.qty)} per jar` : `Empty = regular price ৳${regular}, no discount`}
                  </span>
                </label>
                <label className="block"><span className="a-label">Badge (optional)</span>
                  <input value={p.badge} onChange={(e) => set(i, { badge: e.target.value })} placeholder="জনপ্রিয় / সবচেয়ে সাশ্রয়ী" className="a-input font-sans" /></label>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={p.freeDelivery} onChange={(e) => set(i, { freeDelivery: e.target.checked })} className="size-4 accent-brand-600" />
                🚚 Free delivery with this package
              </label>
            </section>
          );
        })}
        {pk.items.length < MAX_PACKAGES && (
          <button type="button" onClick={add} className="w-full rounded-xl border-2 border-dashed border-slate-300 py-3 text-sm font-semibold text-slate-600 transition hover:border-brand-500 hover:text-brand-700">
            <PlusIcon className="mr-1 inline size-4" /> Add a package (e.g. 4 or 5 jars)
          </button>
        )}
      </div>

      {/* Right: what the customer sees + publish */}
      <aside className="space-y-4 xl:sticky xl:top-20">
        <section className="a-card p-5">
          <label className="flex cursor-pointer items-center justify-between gap-3">
            <span>
              <span className="block font-medium text-slate-900">Live</span>
              <span className="block text-xs text-slate-500">{isLive ? "Customers can order; the guide pages' order button opens this page" : "Hidden — only you can preview it"}</span>
            </span>
            <button type="button" role="switch" aria-checked={isLive} onClick={() => setLive(!isLive)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${isLive ? "bg-emerald-500" : "bg-slate-300"}`}>
              <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${isLive ? "left-5.5" : "left-0.5"}`} />
            </button>
          </label>
          <div className="mt-4 flex items-center justify-end gap-3">
            <div className="min-w-0 flex-1"><FormAlert error={state.error} message={state.message} /></div>
            <SubmitButton pendingText="Saving…">Save</SubmitButton>
          </div>
        </section>
        <section className="rounded-2xl bg-[#f4f8f5] p-4 ring-1 ring-slate-200">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Customer&apos;s view (live preview)</p>
          {product && <PreviewPicker pk={pk} product={product} accent={accent} />}
        </section>
      </aside>
    </form>
  );
}

function PreviewPicker({ pk, product, accent }: { pk: PackagesConfig; product: Product; accent: string }) {
  const [sel, setSel] = useState(pk.defaultId);
  const selected = pk.items.some((p) => p.id === sel) ? sel : pk.defaultId;
  return <PackagePicker items={pk.items.filter((p) => p.title)} selected={selected} onSelect={setSel} unitPrice={product.price} image={product.image} accent={accent} />;
}
