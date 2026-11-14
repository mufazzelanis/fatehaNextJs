"use client";

import { useActionState, useMemo, useState, useTransition, type ReactNode } from "react";
import { resetGuides, saveGuides } from "@/app/actions/guides";
import { initialState } from "@/lib/action-state";
import {
  DEFAULT_GUIDES, GUIDE_HREF, GUIDE_KEYS, type CareGroupItem, type CareTipItem, type GuideContent, type GuideKey,
  type IngredientItem, type StepTone, type UsageStep,
} from "@/lib/guides";
import { FormAlert, SubmitButton } from "@/components/form-bits";

type Tab = "general" | GuideKey;
const TABS: { id: Tab; label: string }[] = [
  { id: "general", label: "General" }, { id: "usage", label: "🪥 ব্যবহারবিধি" }, { id: "ingredients", label: "🌿 উপাদান" }, { id: "care", label: "🦷 যত্ন গাইড" },
];

// ── small inputs
function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="a-label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}
function Text({ label, value, onChange, hint, placeholder, mono }: { label: string; value: string; onChange: (v: string) => void; hint?: string; placeholder?: string; mono?: boolean }) {
  return <Field label={label} hint={hint}><input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`a-input font-sans ${mono ? "font-mono" : ""}`} /></Field>;
}
function Area({ label, value, onChange, hint, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; hint?: string; rows?: number }) {
  return <Field label={label} hint={hint}><textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className="a-input font-sans leading-relaxed" /></Field>;
}
/** One item per line ↔ string[] (blank lines are dropped when saving). */
function Lines({ label, value, onChange, hint = "One per line", rows }: { label: string; value: string[]; onChange: (v: string[]) => void; hint?: string; rows?: number }) {
  return <Area label={label} value={value.join("\n")} onChange={(v) => onChange(v.split("\n"))} hint={hint} rows={rows ?? Math.min(Math.max(value.length + 1, 3), 10)} />;
}
function Icon({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <Field label="Icon" hint="Any emoji"><input value={value} onChange={(e) => onChange(e.target.value)} className="a-input w-20 text-center text-xl" maxLength={8} /></Field>;
}

/** Move / remove buttons for an item in a list. */
function ItemTools<T>({ list, i, set, label }: { list: T[]; i: number; set: (l: T[]) => void; label: string }) {
  const move = (d: number) => { const l = [...list]; [l[i], l[i + d]] = [l[i + d], l[i]]; set(l); };
  const btn = "grid size-8 place-items-center rounded-lg text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-30";
  return (
    <div className="flex items-center gap-1">
      <button type="button" className={btn} disabled={i === 0} onClick={() => move(-1)} aria-label={`Move ${label} up`} title="Move up">↑</button>
      <button type="button" className={btn} disabled={i === list.length - 1} onClick={() => move(1)} aria-label={`Move ${label} down`} title="Move down">↓</button>
      <button type="button" className={`${btn} text-rose-600 ring-rose-200 hover:bg-rose-50`} aria-label={`Remove ${label}`} title="Remove"
        onClick={() => { if (window.confirm(`Remove “${label}”?`)) set(list.filter((_, j) => j !== i)); }}>✕</button>
    </div>
  );
}
function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} className="w-full rounded-xl border-2 border-dashed border-slate-300 py-3 text-sm font-semibold text-slate-600 transition hover:border-brand-500 hover:text-brand-700">+ {children}</button>;
}

const blankStep = (n: number): UsageStep => ({ step: `ধাপ ${n}`, title: "", icon: "✅", tone: "emerald", points: [], text: "" });
const blankIngredient = (): IngredientItem => ({ bn: "", en: "", sciLabel: "বৈজ্ঞানিক নাম", sci: "", icon: "🌿", intro: "", points: [], footnote: "", noteKind: "", note: "" });
const blankTip = (): CareTipItem => ({ title: "", icon: "✅", points: [], steps: false });
const blankGroup = (): CareGroupItem => ({ title: "", icon: "🦷", tips: [blankTip()] });

/** Admin editor for the three guide pages — everything is saved together with one button. */
export function GuidesEditor({ initial }: { initial: GuideContent }) {
  const [c, setC] = useState(initial);
  const [saved, setSaved] = useState(() => JSON.stringify(initial));
  const [tab, setTab] = useState<Tab>("general");
  const [state, action] = useActionState(async (prev: typeof initialState, fd: FormData) => {
    const r = await saveGuides(prev, fd);
    if (r.ok) setSaved(String(fd.get("content")));
    return r;
  }, initialState);
  const [resetting, startReset] = useTransition();
  const [resetMsg, setResetMsg] = useState("");
  const json = useMemo(() => JSON.stringify(c), [c]);
  const dirty = json !== saved;
  const up = <K extends keyof GuideContent>(k: K, v: GuideContent[K]) => setC((x) => ({ ...x, [k]: v }));

  const usage = c.usage;
  const ing = c.ingredients;
  const care = c.care;
  const tips = care.groups.reduce((s, g) => s + g.tips.length, 0);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="content" value={json} />

      {/* Tabs */}
      <div className="sticky top-16 z-10 -mx-1 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50/95 px-1 py-2 backdrop-blur">
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-white p-1 shadow-xs ring-1 ring-slate-200/80">
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-lg px-3.5 py-2 text-sm font-medium transition ${tab === t.id ? "bg-brand-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {dirty && <span className="text-xs font-medium text-amber-700">● Unsaved changes</span>}
          <SubmitButton pendingText="Saving…">Save guide pages</SubmitButton>
        </div>
      </div>
      <FormAlert error={state.error} message={state.message} />

      {tab === "general" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="a-card space-y-4 p-5">
            <h2 className="font-medium text-slate-900">Product & contact</h2>
            <Text label="Product name" value={c.product} onChange={(v) => up("product", v)} hint="Shown in the header, page titles and the order box." />
            <Lines label="Expert call numbers" value={c.phones} onChange={(v) => up("phones", v)} hint="One number per line (up to 4). Shown as call buttons at the bottom of every guide page. Leave empty to hide." rows={3} />
            <label className="flex items-start gap-3 rounded-lg bg-slate-50 p-3 text-sm">
              <input type="checkbox" checked={c.showOnThankYou} onChange={(e) => up("showOnThankYou", e.target.checked)} className="mt-0.5 size-4 accent-brand-700" />
              <span><b className="font-medium text-slate-900">Show the guides on the order thank-you page</b><br /><span className="text-slate-500">“পণ্য হাতে পাওয়ার আগেই জেনে নিন” cards after a landing-page order.</span></span>
            </label>
          </section>
          <section className="a-card space-y-4 p-5">
            <h2 className="font-medium text-slate-900">Pages</h2>
            {GUIDE_KEYS.map((k) => {
              const p = c.pages[k];
              const set = (patch: Partial<typeof p>) => up("pages", { ...c.pages, [k]: { ...p, ...patch } });
              return (
                <div key={k} className={`rounded-xl p-4 ring-1 ${p.enabled ? "ring-slate-200" : "bg-slate-50 ring-slate-200 opacity-75"}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-900">
                      <input type="checkbox" checked={p.enabled} onChange={(e) => set({ enabled: e.target.checked })} className="size-4 accent-brand-700" />
                      {p.enabled ? "Published" : "Hidden (page shows 404)"}
                    </label>
                    <a href={GUIDE_HREF[k]} target="_blank" className="font-mono text-xs text-brand-700 hover:underline">{GUIDE_HREF[k]} ↗</a>
                  </div>
                  <div className="mt-3 grid grid-cols-[5rem_1fr_1fr] gap-3">
                    <Icon value={p.icon} onChange={(v) => set({ icon: v })} />
                    <Text label="Page name" value={p.label} onChange={(v) => set({ label: v })} />
                    <Text label="Short tab name" value={p.short} onChange={(v) => set({ short: v })} />
                  </div>
                  <div className="mt-3"><Text label="One-line description (cards)" value={p.text} onChange={(v) => set({ text: v })} /></div>
                </div>
              );
            })}
          </section>
        </div>
      )}

      {tab === "usage" && (
        <div className="space-y-5">
          <section className="a-card grid gap-4 p-5 md:grid-cols-2">
            <Text label="Page heading" value={usage.title} onChange={(v) => up("usage", { ...usage, title: v })} />
            <Area label="Intro" value={usage.intro} onChange={(v) => up("usage", { ...usage, intro: v })} rows={2} />
          </section>
          {usage.steps.map((s, i) => {
            const set = (patch: Partial<UsageStep>) => up("usage", { ...usage, steps: usage.steps.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
            return (
              <section key={i} className="a-card space-y-4 p-5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-medium text-slate-900">{s.step || `Step ${i + 1}`}{s.title ? ` — ${s.title}` : ""}</h2>
                  <ItemTools list={usage.steps} i={i} set={(l) => up("usage", { ...usage, steps: l })} label={s.title || `step ${i + 1}`} />
                </div>
                <div className="grid gap-3 sm:grid-cols-[5rem_8rem_1fr_9rem]">
                  <Icon value={s.icon} onChange={(v) => set({ icon: v })} />
                  <Text label="Badge" value={s.step} onChange={(v) => set({ step: v })} placeholder="ধাপ ১" />
                  <Text label="Title" value={s.title} onChange={(v) => set({ title: v })} />
                  <Field label="Colour">
                    <select value={s.tone} onChange={(e) => set({ tone: e.target.value as StepTone })} className="a-input">
                      <option value="amber">Orange</option><option value="indigo">Blue</option><option value="emerald">Green</option>
                    </select>
                  </Field>
                </div>
                <Lines label="Points" value={s.points} onChange={(v) => set({ points: v })} />
                <Area label="Paragraph (optional)" value={s.text} onChange={(v) => set({ text: v })} hint="Shown in a highlighted box above the points." rows={2} />
              </section>
            );
          })}
          <AddButton onClick={() => up("usage", { ...usage, steps: [...usage.steps, blankStep(usage.steps.length + 1)] })}>Add a step</AddButton>
          <section className="a-card grid gap-4 p-5 md:grid-cols-[1fr_2fr]">
            <Text label="Warnings box heading" value={usage.notesTitle} onChange={(v) => up("usage", { ...usage, notesTitle: v })} />
            <Lines label="Warnings" value={usage.notes} onChange={(v) => up("usage", { ...usage, notes: v })} hint="One per line. Leave empty to hide the box." />
          </section>
        </div>
      )}

      {tab === "ingredients" && (
        <div className="space-y-5">
          <section className="a-card grid gap-4 p-5 md:grid-cols-2">
            <Text label="Page heading" value={ing.title} onChange={(v) => up("ingredients", { ...ing, title: v })} />
            <Text label="Small line above the heading" value={ing.subtitle} onChange={(v) => up("ingredients", { ...ing, subtitle: v })} />
            <div className="md:col-span-2"><Lines label="Intro paragraphs" value={ing.text} onChange={(v) => up("ingredients", { ...ing, text: v })} hint="One paragraph per line" /></div>
          </section>
          <p className="text-sm text-slate-500">{ing.items.length} ingredients — numbered in this order on the page.</p>
          {ing.items.map((g, i) => {
            const set = (patch: Partial<IngredientItem>) => up("ingredients", { ...ing, items: ing.items.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
            return (
              <section key={i} className={`a-card space-y-4 p-5 ${g.noteKind === "warning" ? "ring-2 ring-rose-200" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-medium text-slate-900"><span className="mr-1.5">{g.icon}</span>{i + 1}. {g.bn || "New ingredient"} {g.en && <span className="font-normal text-slate-500">({g.en})</span>}</h2>
                  <ItemTools list={ing.items} i={i} set={(l) => up("ingredients", { ...ing, items: l })} label={g.bn || `ingredient ${i + 1}`} />
                </div>
                <div className="grid gap-3 sm:grid-cols-[5rem_1fr_1fr]">
                  <Icon value={g.icon} onChange={(v) => set({ icon: v })} />
                  <Text label="Name (Bangla)" value={g.bn} onChange={(v) => set({ bn: v })} />
                  <Text label="Name (English)" value={g.en} onChange={(v) => set({ en: v })} />
                </div>
                <div className="grid gap-3 sm:grid-cols-[14rem_1fr]">
                  <Text label="Label" value={g.sciLabel} onChange={(v) => set({ sciLabel: v })} placeholder="বৈজ্ঞানিক নাম" />
                  <Text label="Scientific name" value={g.sci} onChange={(v) => set({ sci: v })} hint="Leave empty to hide the line" />
                </div>
                <Area label="Introduction" value={g.intro} onChange={(v) => set({ intro: v })} rows={2} />
                <Lines label="Features (উপাদান পরিচিতি)" value={g.points} onChange={(v) => set({ points: v })} />
                <Area label="Extra line (optional)" value={g.footnote} onChange={(v) => set({ footnote: v })} rows={1} />
                <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
                  <Field label="Note box">
                    <select value={g.noteKind} onChange={(e) => set({ noteKind: e.target.value as IngredientItem["noteKind"] })} className="a-input">
                      <option value="">None</option><option value="info">ℹ️ Note (blue)</option><option value="warning">⚠️ Warning (red)</option>
                    </select>
                  </Field>
                  {g.noteKind && <Area label="Note text" value={g.note} onChange={(v) => set({ note: v })} rows={2} />}
                </div>
              </section>
            );
          })}
          <AddButton onClick={() => up("ingredients", { ...ing, items: [...ing.items, blankIngredient()] })}>Add an ingredient</AddButton>
          <section className="a-card grid gap-4 p-5 md:grid-cols-2">
            <Text label="Closing heading" value={ing.closingTitle} onChange={(v) => up("ingredients", { ...ing, closingTitle: v })} />
            <Text label="Signature line" value={ing.signature} onChange={(v) => up("ingredients", { ...ing, signature: v })} />
            <div className="md:col-span-2"><Lines label="Closing paragraphs" value={ing.closing} onChange={(v) => up("ingredients", { ...ing, closing: v })} hint="One paragraph per line" /></div>
          </section>
        </div>
      )}

      {tab === "care" && (
        <div className="space-y-5">
          <section className="a-card grid gap-4 p-5 md:grid-cols-2">
            <Text label="Page heading" value={care.title} onChange={(v) => up("care", { ...care, title: v })} />
            <Area label="Intro" value={care.text} onChange={(v) => up("care", { ...care, text: v })} rows={2} />
          </section>
          <p className="text-sm text-slate-500">{care.groups.length} topics · {tips} tips — tips are numbered 1–{tips} in this order on the page.</p>
          {care.groups.map((g, gi) => {
            const setGroup = (patch: Partial<CareGroupItem>) => up("care", { ...care, groups: care.groups.map((x, j) => (j === gi ? { ...x, ...patch } : x)) });
            return (
              <section key={gi} className="a-card space-y-4 p-5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-medium text-slate-900">Topic {gi + 1}: {g.icon} {g.title || "New topic"} <span className="font-normal text-slate-500">· {g.tips.length} tips</span></h2>
                  <ItemTools list={care.groups} i={gi} set={(l) => up("care", { ...care, groups: l })} label={g.title || `topic ${gi + 1}`} />
                </div>
                <div className="grid gap-3 sm:grid-cols-[5rem_1fr]">
                  <Icon value={g.icon} onChange={(v) => setGroup({ icon: v })} />
                  <Text label="Topic name" value={g.title} onChange={(v) => setGroup({ title: v })} />
                </div>
                <div className="space-y-3 border-l-2 border-slate-100 pl-4">
                  {g.tips.map((t, ti) => {
                    const setTip = (patch: Partial<CareTipItem>) => setGroup({ tips: g.tips.map((x, j) => (j === ti ? { ...x, ...patch } : x)) });
                    return (
                      <div key={ti} className="space-y-3 rounded-xl bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-slate-800">{t.icon} {t.title || "New tip"}</p>
                          <ItemTools list={g.tips} i={ti} set={(l) => setGroup({ tips: l })} label={t.title || `tip ${ti + 1}`} />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-[5rem_1fr]">
                          <Icon value={t.icon} onChange={(v) => setTip({ icon: v })} />
                          <Text label="Tip title" value={t.title} onChange={(v) => setTip({ title: v })} />
                        </div>
                        <Lines label="Points" value={t.points} onChange={(v) => setTip({ points: v })} />
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input type="checkbox" checked={t.steps} onChange={(e) => setTip({ steps: e.target.checked })} className="size-4 accent-brand-700" />
                          Numbered steps (১, ২, ৩…) instead of ticks
                        </label>
                      </div>
                    );
                  })}
                  <AddButton onClick={() => setGroup({ tips: [...g.tips, blankTip()] })}>Add a tip to “{g.title || "this topic"}”</AddButton>
                </div>
              </section>
            );
          })}
          <AddButton onClick={() => up("care", { ...care, groups: [...care.groups, blankGroup()] })}>Add a topic</AddButton>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
        <button type="button" disabled={resetting}
          onClick={() => {
            if (!window.confirm("Put back the original content from the documents? Your edits will be lost.")) return;
            startReset(async () => {
              const r = await resetGuides();
              if (r.ok) { setC(DEFAULT_GUIDES); setSaved(JSON.stringify(DEFAULT_GUIDES)); }
              setResetMsg(r.ok ? r.message ?? "" : r.error ?? "");
            });
          }}
          className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50">
          {resetting ? "Restoring…" : "Restore original content"}
        </button>
        {resetMsg && <span className="text-sm text-emerald-700">{resetMsg}</span>}
        <SubmitButton pendingText="Saving…">Save guide pages</SubmitButton>
      </div>
    </form>
  );
}
