"use client";

import { useActionState, useMemo, useState } from "react";
import { saveStorefront } from "@/app/actions/catalog";
import { initialState } from "@/lib/action-state";
import { bdt, type HeroSlide, type StoreConfig } from "@/lib/store-config";
import { FormAlert, SubmitButton } from "@/components/form-bits";
import type { CardProduct } from "@/components/store/product-card";
import { ButtonDesigner } from "./button-designer";
import { ChevronDownIcon, ImageIcon, PlusIcon, SearchIcon, TrashIcon, XIcon } from "@/components/icons";

const TONES: { key: HeroSlide["tone"]; label: string; cls: string }[] = [
  { key: "teal", label: "Teal", cls: "from-fb-600 to-fb-800" },
  { key: "dark", label: "Dark", cls: "from-ink to-slate-900" },
  { key: "sunset", label: "Sunset", cls: "from-orange-400 to-rose-500" },
];

type Slide = HeroSlide & { _key: string; file?: File; preview?: string };

export function StorefrontForm({ config, districts, links, sample }: {
  config: StoreConfig; districts: { id: number; name: string }[]; links: { name: string; slug: string }[]; sample: CardProduct | null;
}) {
  const [state, dispatch] = useActionState(saveStorefront, initialState);
  const [c, setC] = useState(config);
  const [slides, setSlides] = useState<Slide[]>(() => config.slides.map((s, i) => ({ ...s, _key: `s${i}` })));
  // After a save, take the stored slides (uploaded images now have real filenames).
  const savedKey = JSON.stringify(config.slides);
  const [syncedKey, setSyncedKey] = useState(savedKey);
  if (savedKey !== syncedKey) {
    setSyncedKey(savedKey);
    setSlides(config.slides.map((s, i) => ({ ...s, _key: `s${i}-${savedKey.length}` })));
  }
  const [open, setOpen] = useState<string | null>(null);
  const set = (patch: Partial<StoreConfig>) => setC((cur) => ({ ...cur, ...patch }));
  const setSlide = (i: number, patch: Partial<Slide>) => setSlides((cur) => cur.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  function submit(fd: FormData) {
    const clean = slides.map(({ title, subtitle, cta, link, image, tone }) => ({ title, subtitle, cta, link, image, tone }));
    slides.forEach((s, i) => { if (s.file) fd.set(`slide_image_${i}`, s.file); });
    fd.set("config", JSON.stringify({ ...c, slides: clean }));
    return dispatch(fd);
  }

  return (
    <form action={submit} className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div className="min-w-0 space-y-6 xl:col-span-2">
        <ButtonDesigner value={c.buttons} onChange={(buttons) => set({ buttons })} sample={sample} />
        <section className="a-card space-y-3 p-5">
          <h2 className="font-medium text-slate-900">Announcement bar</h2>
          <input value={c.announcement} maxLength={200} onChange={(e) => set({ announcement: e.target.value })} className="a-input" placeholder="Leave empty to hide" />
          {c.announcement && <p className="rounded-lg bg-fb-800 px-3 py-2 text-center text-xs font-medium text-white">{c.announcement}</p>}
        </section>

        <section className="a-card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-medium text-slate-900">Homepage banners <span className="text-sm font-normal text-slate-400">{slides.length}/6</span></h2>
            {slides.length < 6 && (
              <button type="button" className="a-btn-outline"
                onClick={() => { const k = `n${Date.now()}`; setSlides((s) => [...s, { _key: k, title: "New banner", subtitle: "", cta: "Shop now", link: "/shop", image: "", tone: "teal" }]); setOpen(k); }}>
                <PlusIcon className="size-4" /> Add banner
              </button>
            )}
          </div>
          <ol className="space-y-3">
            {slides.map((s, i) => {
              const tone = TONES.find((t) => t.key === s.tone)!;
              const img = s.preview ?? (s.image ? `/media/${s.image}` : null);
              const isOpen = open === s._key;
              return (
                <li key={s._key} className="overflow-hidden rounded-xl border border-slate-200">
                  <button type="button" onClick={() => setOpen(isOpen ? null : s._key)} aria-expanded={isOpen}
                    className={`relative flex w-full items-center gap-3 bg-linear-to-r p-3 text-left text-white ${tone.cls}`}>
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/20 text-xs font-bold">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{s.title || "Untitled"}</span>
                      <span className="block truncate text-xs text-white/80">{s.subtitle || "—"}</span>
                    </span>
                    {img && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt="" className="h-10 w-16 shrink-0 rounded-md bg-white/90 object-contain" />
                    )}
                    <ChevronDownIcon className={`size-5 shrink-0 transition ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="grid gap-3 p-4 sm:grid-cols-2">
                      <label className="block sm:col-span-2">
                        <span className="a-label">Headline</span>
                        <input value={s.title} maxLength={100} onChange={(e) => setSlide(i, { title: e.target.value })} className="a-input" />
                      </label>
                      <label className="block sm:col-span-2">
                        <span className="a-label">Sub text</span>
                        <textarea value={s.subtitle} rows={2} maxLength={240} onChange={(e) => setSlide(i, { subtitle: e.target.value })} className="a-input" />
                      </label>
                      <label className="block">
                        <span className="a-label">Button text</span>
                        <input value={s.cta} maxLength={40} onChange={(e) => setSlide(i, { cta: e.target.value })} className="a-input" />
                      </label>
                      <label className="block">
                        <span className="a-label">Button opens</span>
                        <select value={s.link} onChange={(e) => setSlide(i, { link: e.target.value })} className="a-input">
                          {links.map((l) => { const v = l.slug ? `/shop/category/${l.slug}` : "/shop"; return <option key={v} value={v}>{l.name}</option>; })}
                          {!links.some((l) => (l.slug ? `/shop/category/${l.slug}` : "/shop") === s.link) && <option value={s.link}>{s.link}</option>}
                        </select>
                      </label>
                      <div>
                        <span className="a-label">Colour</span>
                        <div className="flex gap-2">
                          {TONES.map((t) => (
                            <button key={t.key} type="button" onClick={() => setSlide(i, { tone: t.key })} aria-pressed={s.tone === t.key}
                              className={`h-9 flex-1 rounded-lg bg-linear-to-r text-xs font-medium text-white transition ${t.cls} ${s.tone === t.key ? "ring-2 ring-slate-900 ring-offset-2" : "opacity-70 hover:opacity-100"}`}>
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="a-label">Image (optional — product photos are used if empty)</span>
                        <div className="flex items-center gap-2">
                          <label className="a-btn-outline flex-1 cursor-pointer">
                            <ImageIcon className="size-4" /> {img ? "Change" : "Upload"}
                            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
                              onChange={(e) => { const f = e.target.files?.[0]; if (f) setSlide(i, { file: f, preview: URL.createObjectURL(f) }); }} />
                          </label>
                          {img && (
                            <button type="button" className="a-btn-outline" aria-label="Remove image"
                              onClick={() => setSlide(i, { file: undefined, preview: undefined, image: "" })}><XIcon className="size-4" /></button>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-3 sm:col-span-2">
                        <div className="flex gap-2">
                          <button type="button" disabled={i === 0} className="a-btn-outline"
                            onClick={() => setSlides((cur) => { const n = [...cur]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n; })}>Move up</button>
                          <button type="button" disabled={i === slides.length - 1} className="a-btn-outline"
                            onClick={() => setSlides((cur) => { const n = [...cur]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; return n; })}>Move down</button>
                        </div>
                        <button type="button" disabled={slides.length === 1} className="a-btn-outline text-rose-600 hover:bg-rose-50"
                          onClick={() => setSlides((cur) => cur.filter((_, j) => j !== i))}><TrashIcon className="size-4" /> Remove</button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>

        <section className="a-card space-y-4 p-5">
          <h2 className="font-medium text-slate-900">Delivery</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Num label="Inside-area charge (৳)" value={c.deliveryInside} onChange={(v) => set({ deliveryInside: v })} />
            <Num label="Outside charge (৳)" value={c.deliveryOutside} onChange={(v) => set({ deliveryOutside: v })} />
            <Num label="Free delivery over (৳, 0 = off)" value={c.freeDeliveryOver} onChange={(v) => set({ freeDeliveryOver: v })} />
          </div>
          <DistrictPicker districts={districts} value={c.insideDistrictIds} onChange={(ids) => set({ insideDistrictIds: ids })} />
          <label className="block">
            <span className="a-label">Delivery time text</span>
            <input value={c.deliveryDays} maxLength={120} onChange={(e) => set({ deliveryDays: e.target.value })} className="a-input" />
          </label>
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Customers in the selected districts pay {bdt(c.deliveryInside)}; everyone else pays {bdt(c.deliveryOutside)}
            {c.freeDeliveryOver > 0 ? `; orders of ${bdt(c.freeDeliveryOver)} or more ship free` : ""}.
          </p>
        </section>
      </div>

      <div className="min-w-0 space-y-6">
        <section className="a-card space-y-3 p-5">
          <h2 className="font-medium text-slate-900">Contact & support</h2>
          <Text label="Support phone / WhatsApp" value={c.supportPhone} max={20} onChange={(v) => set({ supportPhone: v })} />
          <Text label="Email" value={c.supportEmail} max={120} onChange={(v) => set({ supportEmail: v })} />
          <label className="block">
            <span className="a-label">Address</span>
            <textarea value={c.supportAddress} rows={2} maxLength={300} onChange={(e) => set({ supportAddress: e.target.value })} className="a-input" />
          </label>
          <Text label="Facebook page URL" value={c.facebookUrl} max={200} placeholder="https://facebook.com/…" onChange={(v) => set({ facebookUrl: v })} />
          <Num label="Return policy (days, 0 = hide)" value={c.returnDays} onChange={(v) => set({ returnDays: v })} />
        </section>
        <div className="space-y-3 xl:sticky xl:top-24">
          <FormAlert error={state.error} message={state.message} />
          <SubmitButton className="a-btn w-full py-2.5" pendingText="Saving…">Save storefront</SubmitButton>
        </div>
      </div>
    </form>
  );
}

function Num({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="a-label">{label}</span>
      <input type="number" min={0} value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} className="a-input" />
    </label>
  );
}

function Text({ label, value, onChange, max, placeholder }: { label: string; value: string; onChange: (v: string) => void; max: number; placeholder?: string }) {
  return (
    <label className="block">
      <span className="a-label">{label}</span>
      <input value={value} maxLength={max} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="a-input" />
    </label>
  );
}

function DistrictPicker({ districts, value, onChange }: { districts: { id: number; name: string }[]; value: number[]; onChange: (ids: number[]) => void }) {
  const [term, setTerm] = useState("");
  const matches = useMemo(() => {
    const t = term.trim().toLowerCase();
    return t ? districts.filter((d) => !value.includes(d.id) && d.name.toLowerCase().includes(t)).slice(0, 8) : [];
  }, [term, districts, value]);
  return (
    <div>
      <span className="a-label">Districts charged the inside rate</span>
      <div className="flex flex-wrap gap-1.5">
        {value.map((id) => {
          const d = districts.find((x) => x.id === id);
          return (
            <span key={id} className="inline-flex items-center gap-1 rounded-full bg-fb-50 py-1 pl-3 pr-1 text-sm font-medium text-fb-800 ring-1 ring-fb-200">
              {d?.name ?? `#${id}`}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== id))} aria-label={`Remove ${d?.name}`}
                className="grid size-5 place-items-center rounded-full hover:bg-fb-200"><XIcon className="size-3" /></button>
            </span>
          );
        })}
        {!value.length && <span className="text-sm text-slate-400">None — everyone pays the outside charge</span>}
      </div>
      <div className="relative mt-2">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Add a district…" className="a-input pl-9"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (matches[0]) { onChange([...value, matches[0].id]); setTerm(""); } } }} />
        {matches.length > 0 && (
          <ul className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
            {matches.map((d) => (
              <li key={d.id}>
                <button type="button" onClick={() => { onChange([...value, d.id]); setTerm(""); }} className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50">{d.name}</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
