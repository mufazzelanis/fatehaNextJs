"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { uploadLandingImage } from "@/app/actions/landings";
import {
  BLOCK_TYPE_NAMES, BLOCK_TYPES, MAX_BLOCKS, newBlock, SECTION_NAMES, videoEmbed,
  type Block, type BlockType, type BuiltinSection, type LandingContent, type Review, type SectionKey,
} from "@/lib/content";
import { PlusIcon, TrashIcon } from "@/components/icons";

type Patch = (fn: (c: LandingContent) => LandingContent) => void;

const SHOW_FLAG: Partial<Record<BuiltinSection, "showBenefits" | "showPrice" | "showFaq" | "showIngredients">> = {
  benefits: "showBenefits", price: "showPrice", faq: "showFaq", ingredients: "showIngredients",
};
const BLOCK_ICON: Record<BlockType, string> = { text: "¶", image: "▣", video: "▶", reviews: "★" };
const iconBtn = "grid size-8 place-items-center rounded-lg text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-30";
const randomId = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => (b % 36).toString(36)).join("");

export function blockName(b: Block) {
  return b.title.trim() ? `${BLOCK_TYPE_NAMES[b.type]} — ${b.title.trim().slice(0, 40)}` : BLOCK_TYPE_NAMES[b.type];
}

/** Order of the page sections, show / hide, and adding new custom sections. */
export function LayoutEditor({ c, patch }: { c: LandingContent; patch: Patch }) {
  const blocks = new Map(c.blocks.map((b) => [`b:${b.id}`, b]));
  const move = (i: number, d: number) => patch((p) => {
    const layout = [...p.layout];
    [layout[i], layout[i + d]] = [layout[i + d], layout[i]];
    return { ...p, layout };
  });
  const toggle = (key: SectionKey) => patch((p) => {
    const flag = SHOW_FLAG[key as BuiltinSection];
    if (flag) return { ...p, [flag]: !p[flag] };
    return { ...p, blocks: p.blocks.map((b) => (`b:${b.id}` === key ? { ...b, show: !b.show } : b)) };
  });
  const remove = (key: SectionKey) => patch((p) => ({
    ...p, layout: p.layout.filter((k) => k !== key), blocks: p.blocks.filter((b) => `b:${b.id}` !== key),
  }));
  const add = (type: BlockType) => patch((p) => {
    const b = newBlock(type, randomId());
    // New sections go just above the order form.
    return { ...p, blocks: [...p.blocks, b], layout: [...p.layout, `b:${b.id}`] };
  });

  return (
    <div className="space-y-3">
      <ol className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
        <li className="flex items-center gap-3 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
          <span className="grid size-7 place-items-center rounded-md bg-white text-xs ring-1 ring-slate-200">⌂</span>
          Top: product photo + label banner <span className="ml-auto text-xs">always first</span>
        </li>
        {c.layout.map((key, i) => {
          const block = blocks.get(key);
          const flag = SHOW_FLAG[key as BuiltinSection];
          const shown = block ? block.show : flag ? c[flag] : true;
          const name = block ? blockName(block) : SECTION_NAMES[key as BuiltinSection];
          return (
            <li key={key} className={`flex items-center gap-2 px-3 py-2 ${shown ? "bg-white" : "bg-slate-50/80"}`}>
              <span className={`grid size-7 shrink-0 place-items-center rounded-md text-xs ${block ? "bg-violet-50 text-violet-700 ring-1 ring-violet-200" : "bg-slate-100 text-slate-500"}`}>
                {block ? BLOCK_ICON[block.type] : i + 1}
              </span>
              <span className={`min-w-0 flex-1 truncate text-sm ${shown ? "text-slate-800" : "text-slate-400 line-through"}`}>{name}</span>
              {(block || flag) && (
                <button type="button" onClick={() => toggle(key)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${shown ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>
                  {shown ? "Shown" : "Hidden"}
                </button>
              )}
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className={iconBtn} aria-label="Move up">↑</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === c.layout.length - 1} className={iconBtn} aria-label="Move down">↓</button>
              {block ? (
                <button type="button" onClick={() => remove(key)} className={`${iconBtn} text-rose-500 hover:bg-rose-50`} aria-label="Delete section"><TrashIcon className="size-4" /></button>
              ) : <span className="size-8" />}
            </li>
          );
        })}
        <li className="flex items-center gap-3 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
          <span className="grid size-7 place-items-center rounded-md bg-white text-xs ring-1 ring-slate-200">✓</span>
          Order form <span className="ml-auto text-xs">always last</span>
        </li>
      </ol>
      {c.blocks.length < MAX_BLOCKS && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-500">Add a section:</span>
          {BLOCK_TYPES.map((type) => (
            <button key={type} type="button" onClick={() => add(type)} className="a-btn-outline py-1.5">
              <PlusIcon className="size-4" /> {BLOCK_TYPE_NAMES[type]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="a-label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export function Color({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-slate-200 p-2">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0" />
      <span className="flex-1 text-sm text-slate-700">{label}</span>
      <code className="text-xs text-slate-400">{value}</code>
    </label>
  );
}

/** Uploads pictures one by one through the server action; returns the stored file names. */
function ImageUpload({ multiple, onUploaded, label, size }: { multiple: boolean; onUploaded: (files: string[]) => void; label: string; size: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const upload = (files: FileList | null) => {
    if (!files?.length) return;
    setError("");
    start(async () => {
      const saved: string[] = [];
      for (const file of Array.from(files).slice(0, multiple ? 12 : 1)) {
        const fd = new FormData();
        fd.set("image", file);
        const res = await uploadLandingImage(fd);
        if (res.file) saved.push(res.file);
        else { setError(res.error ?? "Upload failed"); break; }
      }
      if (saved.length) onUploaded(saved);
      if (input.current) input.current.value = "";
    });
  };
  return (
    <div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple={multiple} className="sr-only" onChange={(e) => upload(e.target.files)} />
      <button type="button" disabled={pending} onClick={() => input.current?.click()} className="a-btn-outline py-1.5">
        <PlusIcon className="size-4" /> {pending ? "Uploading…" : label}
      </button>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
      <p className="mt-1.5 text-xs"><span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-1.5 py-0.5 font-semibold text-sky-800 ring-1 ring-sky-200">📐 Best size: {size}</span></p>
      <p className="mt-1 text-xs text-slate-400">JPG, PNG or WEBP, up to 3MB each. Phones get a small, fast copy automatically.</p>
    </div>
  );
}

function Thumb({ file, onRemove, onUp, onDown }: { file: string; onRemove: () => void; onUp?: () => void; onDown?: () => void }) {
  return (
    <div className="relative w-28 overflow-hidden rounded-lg ring-1 ring-slate-200">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/media/${file}?w=192`} alt="" className="aspect-square w-full object-cover" />
      <div className="absolute inset-x-1 bottom-1 flex justify-between gap-1">
        <span className="flex gap-1">
          {onUp && <button type="button" onClick={onUp} className="grid size-6 place-items-center rounded bg-white/90 text-xs shadow" aria-label="Move left">←</button>}
          {onDown && <button type="button" onClick={onDown} className="grid size-6 place-items-center rounded bg-white/90 text-xs shadow" aria-label="Move right">→</button>}
        </span>
        <button type="button" onClick={onRemove} className="grid size-6 place-items-center rounded bg-white/90 text-rose-600 shadow" aria-label="Remove image"><TrashIcon className="size-3.5" /></button>
      </div>
    </div>
  );
}

/** Fields for one custom section. */
export function BlockFields({ block: b, onChange }: { block: Block; onChange: (b: Block) => void }) {
  const set = <K extends keyof Block>(k: K, v: Block[K]) => onChange({ ...b, [k]: v });
  const video = b.type === "video" && b.videoUrl.trim() ? videoEmbed(b.videoUrl) : null;
  const setReview = (i: number, patch: Partial<Review>) => set("reviews", b.reviews.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const moveImage = (i: number, d: number) => {
    const next = [...b.images];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    set("images", next);
  };

  return (
    <div className="space-y-4">
      <Field label="Title (optional)"><input value={b.title} onChange={(e) => set("title", e.target.value)} className="a-input font-sans" /></Field>

      {b.type === "video" && (
        <Field label="Video link" hint="Paste a YouTube link (youtube.com/watch?v=…, youtu.be/…, Shorts) or a Facebook video link. The player loads only when the visitor taps play, so the page stays fast.">
          <input value={b.videoUrl} onChange={(e) => set("videoUrl", e.target.value)} placeholder="https://www.youtube.com/watch?v=…" className="a-input font-mono" />
          {b.videoUrl.trim() && (
            <span className={`mt-1 block text-xs ${video ? "text-emerald-600" : "text-rose-600"}`}>
              {video ? `✓ ${video.kind === "youtube" ? "YouTube" : "Facebook"} video recognised` : "This doesn't look like a YouTube or Facebook video link"}
            </span>
          )}
        </Field>
      )}

      {b.type === "image" && (
        <div>
          <span className="a-label">Photos ({b.images.length}/12) — one photo is shown full width, several are shown two per row</span>
          {b.images.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {b.images.map((f, i) => (
                <Thumb key={f} file={f} onRemove={() => set("images", b.images.filter((x) => x !== f))}
                  onUp={i > 0 ? () => moveImage(i, -1) : undefined} onDown={i < b.images.length - 1 ? () => moveImage(i, 1) : undefined} />
              ))}
            </div>
          )}
          {b.images.length < 12 && <ImageUpload multiple size="1080 px wide (any height) — e.g. 1080 × 1080 square or 1080 × 1350 tall" label="Upload photos" onUploaded={(files) => set("images", [...b.images, ...files].slice(0, 12))} />}
        </div>
      )}

      <Field label={b.type === "image" ? "Caption (optional)" : b.type === "text" ? "Text" : "Text above (optional)"}
        hint="**bold**, {price} and line breaks work here too.">
        <textarea rows={b.type === "text" ? 8 : 3} value={b.text} onChange={(e) => set("text", e.target.value)} className="a-input font-sans leading-relaxed" />
      </Field>

      {b.type === "reviews" && (
        <div className="space-y-3">
          <span className="a-label">Reviews ({b.reviews.length}) — write the review, upload a screenshot (e.g. a Messenger message), or both</span>
          {b.reviews.map((r, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Review {i + 1}</span>
                <select value={r.stars} onChange={(e) => setReview(i, { stars: Number(e.target.value) })} aria-label="Stars" className="a-input ml-auto h-8 w-auto py-0 text-sm">
                  {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)}</option>)}
                </select>
                <button type="button" onClick={() => set("reviews", b.reviews.filter((_, j) => j !== i))} className={`${iconBtn} text-rose-500 hover:bg-rose-50`} aria-label="Remove review"><TrashIcon className="size-4" /></button>
              </div>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <input value={r.name} onChange={(e) => setReview(i, { name: e.target.value })} placeholder="Customer name (e.g. রহিম, ঢাকা)" className="a-input font-sans" />
                  <textarea rows={3} value={r.text} onChange={(e) => setReview(i, { text: e.target.value })} placeholder="What the customer said" className="a-input font-sans" />
                </div>
                <div>
                  {r.image
                    ? <Thumb file={r.image} onRemove={() => setReview(i, { image: "" })} />
                    : <ImageUpload multiple={false} size="phone screenshot (e.g. 1080 × 1920)" label="Screenshot" onUploaded={([f]) => setReview(i, { image: f })} />}
                </div>
              </div>
            </div>
          ))}
          {b.reviews.length < 30 && (
            <button type="button" onClick={() => set("reviews", [...b.reviews, { name: "", text: "", stars: 5, image: "" }])} className="a-btn-outline py-1.5">
              <PlusIcon className="size-4" /> Add review
            </button>
          )}
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <Color label="Background" value={b.bg} onChange={(v) => set("bg", v)} />
        <Color label="Text color" value={b.textColor} onChange={(v) => set("textColor", v)} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={b.button} onChange={(e) => set("button", e.target.checked)} className="size-4 accent-brand-600" />
          Show an order button under this section
        </label>
        {b.button && <div className="min-w-56"><Color label="Button color" value={b.buttonColor} onChange={(v) => set("buttonColor", v)} /></div>}
      </div>
    </div>
  );
}
