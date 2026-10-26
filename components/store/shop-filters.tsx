"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { bdt } from "@/lib/store-config";
import { CheckIcon, FilterIcon, XIcon } from "../icons";

type Props = {
  base: string;
  categories: { name: string; slug: string; n: number }[];
  current: { category?: string; brand?: string; min?: number; max?: number; inStock?: boolean; q?: string };
  brands: { brand: string; n: number }[];
  range: { min: number; max: number };
  active: number;
  mobile?: boolean;
};

function useParamNav() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (changes: Record<string, string | null>, path = pathname) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) { if (v === null || v === "") p.delete(k); else p.set(k, v); }
    p.delete("page");
    const s = p.toString();
    router.push(`${path}${s ? `?${s}` : ""}`, { scroll: false });
  };
}

export function SortSelect({ value }: { value: string }) {
  const nav = useParamNav();
  return (
    <select value={value} onChange={(e) => nav({ sort: e.target.value })} aria-label="Sort products"
      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-ink outline-none focus:border-fb-400">
      <option value="">Recommended</option>
      <option value="popular">Best selling</option>
      <option value="newest">Newest</option>
      <option value="price-asc">Price: low to high</option>
      <option value="price-desc">Price: high to low</option>
      <option value="name">Name A–Z</option>
    </select>
  );
}

function Panel({ base, categories, current, brands, range, onDone }: Omit<Props, "mobile" | "active"> & { onDone?: () => void }) {
  const nav = useParamNav();
  const [min, setMin] = useState(current.min ? String(current.min) : "");
  const [max, setMax] = useState(current.max ? String(current.max) : "");
  const keep = (slugPath: string) => {
    const p = new URLSearchParams();
    if (current.q) p.set("q", current.q);
    const s = p.toString();
    return `${slugPath}${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-6 text-sm">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-600">Category</p>
        <ul className="space-y-0.5">
          <li>
            <Link href={keep("/shop")} onClick={onDone} className={`flex items-center justify-between rounded-lg px-3 py-2 transition ${!current.category ? "bg-fb-50 font-semibold text-fb-800" : "text-ink-soft hover:bg-slate-100"}`}>All products</Link>
          </li>
          {categories.map((c) => (
            <li key={c.slug}>
              <Link href={keep(`/shop/category/${c.slug}`)} onClick={onDone}
                className={`flex items-center justify-between rounded-lg px-3 py-2 transition ${current.category === c.slug ? "bg-fb-50 font-semibold text-fb-800" : "text-ink-soft hover:bg-slate-100"}`}>
                {c.name} <span className="text-xs text-slate-400">{c.n}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {brands.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-600">Brand</p>
          <ul className="space-y-0.5">
            {brands.map((b) => {
              const on = current.brand === b.brand;
              return (
                <li key={b.brand}>
                  <button type="button" onClick={() => { nav({ brand: on ? null : b.brand }, base); onDone?.(); }}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition ${on ? "bg-fb-50 font-semibold text-fb-800" : "text-ink-soft hover:bg-slate-100"}`}>
                    <span className={`grid size-4 place-items-center rounded border ${on ? "border-fb-500 bg-fb-500 text-white" : "border-slate-300"}`}>{on && <CheckIcon className="size-3" strokeWidth={3} />}</span>
                    <span className="flex-1">{b.brand}</span><span className="text-xs text-slate-400">{b.n}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-600">Price</p>
        <form onSubmit={(e) => { e.preventDefault(); nav({ min: min || null, max: max || null }, base); onDone?.(); }} className="space-y-2">
          <div className="flex items-center gap-2">
            <input inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} placeholder={bdt(range.min)} aria-label="Minimum price"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 outline-none focus:border-fb-400" />
            <span className="text-slate-400">–</span>
            <input inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} placeholder={bdt(range.max)} aria-label="Maximum price"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 outline-none focus:border-fb-400" />
          </div>
          <button type="submit" className="h-9 w-full rounded-lg bg-ink text-sm font-semibold text-white hover:bg-ink-soft">Apply price</button>
        </form>
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1 text-ink-soft">
        <input type="checkbox" checked={!!current.inStock} onChange={(e) => { nav({ stock: e.target.checked ? "1" : null }, base); onDone?.(); }} className="size-4 accent-fb-500" />
        In stock only
      </label>
    </div>
  );
}

export function ShopFilters(props: Props) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!props.mobile) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-semibold text-ink">Filters</p>
          {props.active > 0 && <Link href={props.base} className="text-xs font-semibold text-fb-700 hover:underline">Clear all</Link>}
        </div>
        <Panel {...props} />
      </div>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="relative flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-ink lg:hidden">
        <FilterIcon className="size-4" /> Filters
        {props.active > 0 && <span className="grid size-5 place-items-center rounded-full bg-fb-500 text-[10px] font-bold text-white">{props.active}</span>}
      </button>
      <div className={`fixed inset-0 z-[60] lg:hidden ${open ? "" : "pointer-events-none"}`} inert={!open}>
        <div onClick={() => setOpen(false)} className={`absolute inset-0 bg-slate-950/40 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`} />
        <div role="dialog" aria-modal="true" aria-label="Filters"
          className={`absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${open ? "translate-y-0" : "translate-y-full"}`}>
          <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-200" />
          <div className="mb-4 flex items-center justify-between">
            <p className="text-lg font-semibold text-ink">Filters</p>
            <button type="button" onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100" aria-label="Close filters"><XIcon className="size-5" /></button>
          </div>
          <Panel {...props} onDone={() => setOpen(false)} />
          {props.active > 0 && <Link href={props.base} onClick={() => setOpen(false)} className="mt-6 flex h-11 items-center justify-center rounded-xl border border-slate-200 font-semibold text-ink">Clear all filters</Link>}
        </div>
      </div>
    </>
  );
}
