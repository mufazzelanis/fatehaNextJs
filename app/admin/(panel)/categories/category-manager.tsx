"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { deleteCategory, saveCategory } from "@/app/actions/catalog";
import { initialState } from "@/lib/action-state";
import { FieldError, FormAlert, keepValuesOnSubmit, SubmitButton } from "@/components/form-bits";
import { EditIcon, ExternalIcon, ImageIcon, PlusIcon, TagIcon, TrashIcon } from "@/components/icons";

export type AdminCategory = {
  id: number; name: string; slug: string; description: string | null; sort_order: number; is_active: number;
  products: number; live: number; imageUrl: string | null;
};

export function CategoryManager({ categories, uncategorised }: { categories: AdminCategory[]; uncategorised: number }) {
  const [editing, setEditing] = useState<number | "new" | null>(categories.length ? null : "new");
  const nextSort = Math.max(0, ...categories.map((c) => c.sort_order)) + 10;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div className="min-w-0 space-y-3 xl:col-span-2">
        {uncategorised > 0 && (
          <Link href="/admin/products" className="block rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {uncategorised} product(s) have no category — they appear in the shop but not in any category page.
          </Link>
        )}
        {categories.map((c) =>
          editing === c.id ? (
            <CategoryForm key={c.id} category={c} onDone={() => setEditing(null)} />
          ) : (
            <article key={c.id} className="a-card flex items-center gap-4 p-4">
              <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-50 ring-1 ring-slate-200">
                {c.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.imageUrl} alt="" className="size-full object-cover" />
                ) : <TagIcon className="size-6 text-slate-400" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium text-slate-900">{c.name}</h3>
                  {!c.is_active && <span className="rounded bg-slate-100 px-1.5 py-px text-xs font-medium text-slate-600">Hidden</span>}
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-500">/shop/category/{c.slug} · sort {c.sort_order}</p>
                <p className="mt-1 text-xs text-slate-600">
                  <Link href={`/admin/products?category=${c.id}`} className="font-medium text-brand-700 hover:underline">{c.products} product(s)</Link>
                  <span className="text-slate-400"> · {c.live} live</span>
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <a href={`/shop/category/${c.slug}`} target="_blank" aria-label="View on store" className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"><ExternalIcon className="size-4" /></a>
                <button type="button" onClick={() => setEditing(c.id)} aria-label={`Edit ${c.name}`} className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-brand-700"><EditIcon className="size-4" /></button>
              </div>
            </article>
          ),
        )}
        {!categories.length && editing !== "new" && <p className="a-card p-6 text-center text-sm text-slate-500">No categories yet.</p>}
      </div>

      <div className="min-w-0">
        {editing === "new" ? (
          <CategoryForm category={null} nextSort={nextSort} onDone={() => setEditing(categories.length ? null : "new")} />
        ) : (
          <button type="button" onClick={() => setEditing("new")}
            className="a-card grid w-full place-items-center gap-2 border-dashed p-8 text-sm font-medium text-slate-600 transition hover:border-brand-300 hover:text-brand-700">
            <PlusIcon className="size-6" /> Add a category
          </button>
        )}
      </div>
    </div>
  );
}

function CategoryForm({ category: c, nextSort = 0, onDone }: { category: AdminCategory | null; nextSort?: number; onDone: () => void }) {
  const [state, action, pending] = useActionState(async (prev: typeof initialState, fd: FormData) => {
    const res = await saveCategory(prev, fd);
    if (res.ok) onDone();
    return res;
  }, initialState);
  const [del, delAction] = useActionState(deleteCategory, initialState);
  const [preview, setPreview] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const fe = state.fieldErrors ?? {};

  return (
    <section className="a-card space-y-4 p-5 ring-2 ring-brand-500/20">
      <h2 className="font-medium text-slate-900">{c ? `Edit “${c.name}”` : "New category"}</h2>
      <form onSubmit={keepValuesOnSubmit(action)} className="space-y-4">
        {c && <input type="hidden" name="id" value={c.id} />}
        <label className="block">
          <span className="a-label">Name</span>
          <input name="name" defaultValue={c?.name} required autoFocus className="a-input" aria-invalid={!!fe.name} />
          <FieldError message={fe.name} />
        </label>
        <label className="block">
          <span className="a-label">URL slug (leave empty to generate)</span>
          <input name="slug" defaultValue={c?.slug} className="a-input" aria-invalid={!!fe.slug} />
          <FieldError message={fe.slug} />
        </label>
        <label className="block">
          <span className="a-label">Short description</span>
          <textarea name="description" defaultValue={c?.description ?? ""} rows={2} maxLength={500} className="a-input" />
        </label>
        <div className="flex items-end gap-3">
          <label className="block w-28">
            <span className="a-label">Sort order</span>
            <input name="sort_order" type="number" defaultValue={c?.sort_order ?? nextSort} className="a-input" />
          </label>
          <label className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <input type="checkbox" name="is_active" defaultChecked={c ? !!c.is_active : true} className="size-4 accent-brand-700" /> Visible on store
          </label>
        </div>
        <div className="flex items-center gap-3">
          <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-50 ring-1 ring-slate-200">
            {preview || c?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview ?? c!.imageUrl!} alt="" className="size-full object-cover" />
            ) : <ImageIcon className="size-6 text-slate-400" />}
          </div>
          <label className="a-btn-outline cursor-pointer">
            {c?.imageUrl ? "Change image" : "Add image"}
            <input type="file" name="image" accept="image/jpeg,image/png,image/webp" className="sr-only"
              onChange={(e) => { const f = e.target.files?.[0]; setPreview(f ? URL.createObjectURL(f) : null); }} />
          </label>
        </div>
        <FieldError message={fe.image} />
        <FormAlert error={state.error} message={state.ok ? undefined : state.message} />
        <div className="flex gap-2">
          <SubmitButton className="a-btn flex-1" pendingText="Saving…" pending={pending}>{c ? "Save" : "Add category"}</SubmitButton>
          <button type="button" onClick={onDone} className="a-btn-outline">Cancel</button>
        </div>
      </form>

      {c && (
        <form action={delAction} className="border-t border-slate-100 pt-4">
          <input type="hidden" name="id" value={c.id} />
          <FormAlert error={del.error} />
          {confirm ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-slate-600">Delete “{c.name}”?</span>
              <SubmitButton className="a-btn bg-rose-600 hover:bg-rose-700" pendingText="Deleting…">Delete</SubmitButton>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirm(true)} className="inline-flex items-center gap-1.5 text-sm text-rose-600 hover:underline">
              <TrashIcon className="size-4" /> Delete category
            </button>
          )}
        </form>
      )}
    </section>
  );
}
