"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { deleteStoreProduct, saveStoreProduct } from "@/app/actions/catalog";
import { initialState } from "@/lib/action-state";
import { discountPercent } from "@/lib/store-config";
import { FieldError, FormAlert, keepValuesOnSubmit, SubmitButton } from "@/components/form-bits";
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, ExternalIcon, ImageIcon, StarIcon, TrashIcon, XIcon } from "@/components/icons";

export type EditableProduct = {
  id: number | null; name: string; slug: string; weight: string; price: number | ""; regular_price: number | ""; stock: number | "";
  category_id: number | null; brand: string; sku: string; short_description: string; description: string;
  images: string[]; is_active: boolean; in_store: boolean; is_featured: boolean;
};

type Img = { key: string; token: string; url: string; file?: File };

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 150);

const MAX_IMAGES = 12;

export function StoreProductForm({ product, categories, brands, landings, sold }: {
  product: EditableProduct; categories: { id: number; name: string }[]; brands: string[];
  landings: { id: number; name: string; slug: string }[]; sold: number;
}) {
  const [state, dispatch, pending] = useActionState(saveStoreProduct, initialState);
  const fe = state.fieldErrors ?? {};
  const isNew = product.id === null;
  const brandList = useId();

  const [name, setName] = useState(product.name);
  const [slug, setSlug] = useState(product.slug);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [price, setPrice] = useState<number | "">(product.price);
  const [regular, setRegular] = useState<number | "">(product.regular_price);
  const fromSaved = (files: string[]): Img[] => files.map((f) => ({ key: f, token: f, url: `/media/${f}` }));
  const [imgs, setImgs] = useState<Img[]>(() => fromSaved(product.images));
  // After a save the server sends the stored list; replace local previews (new uploads now have real filenames).
  const savedKey = product.images.join("|");
  const [syncedKey, setSyncedKey] = useState(savedKey);
  if (savedKey !== syncedKey) {
    setSyncedKey(savedKey);
    setImgs(fromSaved(product.images));
  }
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const blobs = useRef<string[]>([]);
  useEffect(() => () => blobs.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const off = discountPercent(Number(price) || 0, regular === "" ? null : Number(regular));

  function addFiles(list: FileList | File[]) {
    const files = [...list].filter((f) => /^image\/(jpeg|png|webp)$/.test(f.type));
    setImgs((cur) => {
      const room = MAX_IMAGES - cur.length;
      return [...cur, ...files.slice(0, room).map((file) => {
        const url = URL.createObjectURL(file);
        blobs.current.push(url);
        return { key: url, token: "", url, file };
      })];
    });
  }
  const move = (i: number, to: number) =>
    setImgs((cur) => {
      if (to < 0 || to >= cur.length) return cur;
      const next = [...cur];
      const [x] = next.splice(i, 1);
      next.splice(to, 0, x);
      return next;
    });
  const remove = (i: number) => setImgs((cur) => cur.filter((_, j) => j !== i));

  function prepare(fd: FormData) {
    fd.delete("new_images");
    let n = 0;
    const order = imgs.map((im) => {
      if (!im.file) return im.token;
      fd.append("new_images", im.file);
      return `new:${n++}`;
    });
    fd.set("images_order", JSON.stringify(order));
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/products" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeftIcon className="size-4" /> All products
        </Link>
        {!isNew && (
          <a href={`/products/${product.slug}`} target="_blank" className="a-btn-outline"><ExternalIcon className="size-4" /> View on store</a>
        )}
      </div>

      <form onSubmit={keepValuesOnSubmit(dispatch, prepare)} className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {product.id && <input type="hidden" name="id" value={product.id} />}
        <div className="min-w-0 space-y-6 xl:col-span-2">
          <section className="a-card space-y-4 p-5">
            <h2 className="font-medium text-slate-900">Details</h2>
            <label className="block">
              <span className="a-label">Product name</span>
              <input name="name" value={name} required aria-invalid={!!fe.name} className="a-input font-sans"
                onChange={(e) => { setName(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} />
              <FieldError message={fe.name} />
            </label>
            <label className="block">
              <span className="a-label">URL</span>
              <div className="flex items-center overflow-hidden rounded-lg border border-slate-200 focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/15">
                <span className="hidden shrink-0 bg-slate-50 px-3 py-2 text-sm text-slate-400 sm:block">fatehabd.com/products/</span>
                <input name="slug" value={slug} aria-invalid={!!fe.slug} className="min-w-0 flex-1 px-3 py-2 text-sm outline-none"
                  onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value)); }} />
              </div>
              <FieldError message={fe.slug} />
              {!isNew && slug !== product.slug && <p className="mt-1 text-xs text-amber-600">Changing the URL breaks old links shared on Facebook.</p>}
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="a-label">Category</span>
                <select name="category_id" defaultValue={product.category_id ?? ""} className="a-input" aria-invalid={!!fe.category_id}>
                  <option value="">— No category —</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <FieldError message={fe.category_id} />
              </label>
              <label className="block">
                <span className="a-label">Brand</span>
                <input name="brand" defaultValue={product.brand} list={brandList} placeholder="e.g. Aptamil" className="a-input" />
                <datalist id={brandList}>{brands.map((b) => <option key={b} value={b} />)}</datalist>
              </label>
              <label className="block">
                <span className="a-label">SKU / code</span>
                <input name="sku" defaultValue={product.sku} className="a-input" />
              </label>
              <label className="block">
                <span className="a-label">Size / weight</span>
                <input name="weight" defaultValue={product.weight} placeholder="400 gm" className="a-input" />
              </label>
            </div>
          </section>

          <section className="a-card p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-medium text-slate-900">Images <span className="text-sm font-normal text-slate-400">{imgs.length}/{MAX_IMAGES}</span></h2>
              <span className="text-xs text-slate-500">The first image is the main photo</span>
            </div>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {imgs.map((im, i) => (
                <li key={im.key} className={`group relative aspect-square overflow-hidden rounded-xl border bg-white ${i === 0 ? "border-brand-400 ring-2 ring-brand-500/20" : "border-slate-200"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={im.url} alt="" className="size-full object-contain p-2" />
                  {i === 0 && <span className="absolute left-1.5 top-1.5 rounded-md bg-brand-700 px-1.5 py-0.5 text-[10px] font-semibold text-white">MAIN</span>}
                  {im.file && <span className="absolute right-1.5 top-1.5 rounded-md bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">NEW</span>}
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-linear-to-t from-slate-900/70 to-transparent p-1.5 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                    <div className="flex gap-1">
                      <IconBtn label="Move left" onClick={() => move(i, i - 1)} disabled={i === 0}><ChevronLeftIcon className="size-4" /></IconBtn>
                      <IconBtn label="Move right" onClick={() => move(i, i + 1)} disabled={i === imgs.length - 1}><ChevronRightIcon className="size-4" /></IconBtn>
                    </div>
                    <div className="flex gap-1">
                      {i > 0 && <IconBtn label="Make main photo" onClick={() => move(i, 0)}><StarIcon className="size-4" /></IconBtn>}
                      <IconBtn label="Remove image" onClick={() => remove(i)} danger><XIcon className="size-4" /></IconBtn>
                    </div>
                  </div>
                </li>
              ))}
              {imgs.length < MAX_IMAGES && (
                <li>
                  <button type="button" onClick={() => fileInput.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
                    className={`grid aspect-square w-full place-items-center rounded-xl border-2 border-dashed text-center text-xs transition ${
                      dragging ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-300 bg-slate-50 text-slate-500 hover:border-brand-400 hover:text-brand-700"}`}>
                    <span><ImageIcon className="mx-auto mb-1.5 size-7" />Add images<br /><span className="text-slate-400">or drop here</span></span>
                  </button>
                </li>
              )}
            </ul>
            <input ref={fileInput} type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-hidden
              onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
            <FieldError message={fe.images} />
            <p className="mt-3 text-xs text-slate-500">JPG, PNG or WEBP, up to 3MB each. Square photos on a white background look best.</p>
          </section>

          <section className="a-card space-y-4 p-5">
            <h2 className="font-medium text-slate-900">Description</h2>
            <label className="block">
              <span className="a-label">Short summary — shown next to the price</span>
              <textarea name="short_description" defaultValue={product.short_description} rows={2} maxLength={500} className="a-input" />
            </label>
            <label className="block">
              <span className="a-label">Full description — leave a blank line between paragraphs</span>
              <textarea name="description" defaultValue={product.description} rows={10} className="a-input leading-relaxed" />
            </label>
          </section>
        </div>

        <div className="min-w-0 space-y-6">
          <section className="a-card space-y-4 p-5">
            <h2 className="font-medium text-slate-900">Price & stock</h2>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="a-label">Sale price (৳)</span>
                <input name="price" type="number" min={1} step="1" required value={price} aria-invalid={!!fe.price} className="a-input"
                  onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))} />
                <FieldError message={fe.price} />
              </label>
              <label className="block">
                <span className="a-label">Regular price (৳)</span>
                <input name="regular_price" type="number" min={0} step="1" value={regular} aria-invalid={!!fe.regular_price} className="a-input"
                  onChange={(e) => setRegular(e.target.value === "" ? "" : Number(e.target.value))} />
                <FieldError message={fe.regular_price} />
              </label>
            </div>
            <label className="block">
              <span className="a-label">Stock (units)</span>
              <input name="stock" type="number" min={0} step="1" required defaultValue={product.stock} aria-invalid={!!fe.stock} className="a-input" />
              <FieldError message={fe.stock} />
            </label>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-slate-600">Discount badge: <strong className="text-slate-900">{off ? `-${off}%` : "hidden"}</strong></span>
              {!isNew && <span className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-slate-600">Sold: <strong className="text-slate-900">{sold}</strong></span>}
            </div>
          </section>

          <section className="a-card space-y-2 p-5">
            <h2 className="mb-2 font-medium text-slate-900">Visibility</h2>
            <Check name="in_store" defaultChecked={product.in_store} title="Show on the store" text="Listed in the shop, search and categories." />
            <Check name="is_featured" defaultChecked={product.is_featured} title="Featured" text="Shown in “Featured” on the homepage." />
            <Check name="is_active" defaultChecked={product.is_active} title="Available for order" text={landings.length ? "Unchecking also stops orders on its landing pages." : "Unchecking hides it everywhere."} />
          </section>

          {landings.length > 0 && (
            <section className="a-card p-5">
              <h2 className="font-medium text-slate-900">Sold on landing pages</h2>
              <p className="mb-3 mt-1 text-xs text-slate-500">Price and stock here are used by these pages. Their banners and text are edited under Landing Pages.</p>
              <ul className="space-y-1.5">
                {landings.map((l) => (
                  <li key={l.id}><Link href={`/admin/landings/${l.id}`} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm hover:bg-brand-50">
                    <span className="font-medium text-slate-800">{l.name}</span><span className="font-mono text-xs text-slate-500">/{l.slug}</span>
                  </Link></li>
                ))}
              </ul>
            </section>
          )}

          <div className="space-y-3 xl:sticky xl:top-24">
            <FormAlert error={state.error} message={state.message} />
            <SubmitButton className="a-btn w-full py-2.5" pendingText="Saving…" pending={pending}>{isNew ? "Create product" : "Save changes"}</SubmitButton>
          </div>
        </div>
      </form>

      {!isNew && <DeleteProduct id={product.id!} sold={sold} usedByLanding={landings.length > 0} />}
    </>
  );
}

function IconBtn({ children, label, onClick, disabled, danger }: { children: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label}
      className={`grid size-7 place-items-center rounded-md bg-white/90 text-slate-700 shadow-sm transition disabled:opacity-30 ${danger ? "hover:bg-rose-500 hover:text-white" : "hover:bg-white"}`}>
      {children}
    </button>
  );
}

function Check({ name, defaultChecked, title, text }: { name: string; defaultChecked: boolean; title: string; text: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 transition hover:bg-slate-50 has-checked:border-brand-300 has-checked:bg-brand-50/40">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 size-4 accent-brand-700" />
      <span className="text-sm"><span className="font-medium text-slate-900">{title}</span><span className="block text-xs text-slate-500">{text}</span></span>
    </label>
  );
}

function DeleteProduct({ id, sold, usedByLanding }: { id: number; sold: number; usedByLanding: boolean }) {
  const [confirming, setConfirming] = useState(false);
  if (usedByLanding) return null;
  return (
    <section className="a-card mt-6 flex flex-wrap items-center justify-between gap-3 border-rose-200 p-5">
      <div>
        <h2 className="font-medium text-rose-700">{sold > 0 ? "Archive product" : "Delete product"}</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          {sold > 0 ? "This product has orders, so it will be hidden (not erased) to keep order history." : "Removes the product and its images permanently."}
        </p>
      </div>
      {confirming ? (
        <form action={deleteStoreProduct} className="flex gap-2">
          <input type="hidden" name="id" value={id} />
          <button type="button" onClick={() => setConfirming(false)} className="a-btn-outline">Cancel</button>
          <SubmitButton className="a-btn bg-rose-600 hover:bg-rose-700" pendingText="Working…">Yes, {sold > 0 ? "archive" : "delete"}</SubmitButton>
        </form>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className="a-btn-outline text-rose-700 hover:bg-rose-50">
          <TrashIcon className="size-4" /> {sold > 0 ? "Archive" : "Delete"}
        </button>
      )}
    </section>
  );
}
