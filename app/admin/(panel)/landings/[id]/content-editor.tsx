"use client";

import Link from "next/link";
import { useActionState, useState, type ReactNode } from "react";
import { saveLandingContent } from "@/app/actions/admin";
import { initialState } from "@/lib/action-state";
import { DEFAULT_CONTENT, type Block, type Faq, type LandingContent, type LandingTheme } from "@/lib/content";
import { BlockFields, blockName, Color, LayoutEditor } from "./block-editor";
import { FormAlert, SubmitButton } from "@/components/form-bits";
import { ChevronDownIcon, PlusIcon, TrashIcon } from "@/components/icons";

type ColorKey = keyof LandingContent["colors"];
type ThemeKey = keyof LandingTheme;

const THEME_LABELS: [ThemeKey, string][] = [
  ["heroFrom", "Top section color (gradient start)"],
  ["heroTo", "Top section fades into"],
  ["pageBg", "Page background"],
  ["altBg", "Price / ingredients background"],
  ["headingColor", "Headings"],
  ["benefitsTitleBg", "Benefits title highlight"],
  ["benefitsTitleText", "Benefits title text"],
  ["formAccent", "Order form top line"],
];

/** Ready-made color sets — one click restyles the page (buttons keep their own colors). */
const THEME_PRESETS: { name: string; theme: LandingTheme }[] = [
  { name: "Fresh green (original)", theme: DEFAULT_CONTENT.theme },
  { name: "Ocean blue", theme: { heroFrom: "#7cc4ff", heroTo: "#f1f6fb", pageBg: "#f1f6fb", altBg: "#e6eef7", headingColor: "#0b2545", benefitsTitleBg: "#ffd60a", benefitsTitleText: "#0b2545", formAccent: "#1d4ed8" } },
  { name: "Warm orange", theme: { heroFrom: "#ffc078", heroTo: "#fff8f0", pageBg: "#fff8f0", altBg: "#fdeedc", headingColor: "#3b1d00", benefitsTitleBg: "#ff6b00", benefitsTitleText: "#ffffff", formAccent: "#ea580c" } },
  { name: "Royal purple", theme: { heroFrom: "#c9a7ff", heroTo: "#f6f2fd", pageBg: "#f6f2fd", altBg: "#ede5fb", headingColor: "#2e1065", benefitsTitleBg: "#facc15", benefitsTitleText: "#4c1d95", formAccent: "#7c3aed" } },
  { name: "Clean white", theme: { heroFrom: "#e2e8f0", heroTo: "#ffffff", pageBg: "#ffffff", altBg: "#f8fafc", headingColor: "#0f172a", benefitsTitleBg: "#dcfce7", benefitsTitleText: "#166534", formAccent: "#16a34a" } },
];

const COLOR_LABELS: [ColorKey, string][] = [
  ["topButton", "1st order button (top)"],
  ["ctaButton", "2nd order button (after benefits)"],
  ["priceButton", "Price section button"],
  ["faqButton", "FAQ button"],
  ["ingredientsButton", "Ingredients button"],
  ["introBox", "Intro text box background"],
  ["benefitCard", "Benefit card background"],
  ["benefitText", "Benefit card text"],
];

function Section({ title, hint, toggle, children, defaultOpen = false }: {
  title: string; hint?: string; toggle?: ReactNode; children: ReactNode; defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="a-card group overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-slate-900">{title}</p>
          {hint && <p className="text-xs text-slate-500">{hint}</p>}
        </div>
        {toggle}
        <ChevronDownIcon className="size-5 text-slate-400 transition group-open:rotate-180" />
      </summary>
      <div className="space-y-4 border-t border-slate-100 p-5">{children}</div>
    </details>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked}
      onClick={(e) => { e.preventDefault(); onChange(!checked); }}
      className={`flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium transition ${checked ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
      <span className={`relative h-4 w-7 rounded-full transition ${checked ? "bg-emerald-500" : "bg-slate-300"}`}>
        <span className={`absolute top-0.5 size-3 rounded-full bg-white shadow transition-all ${checked ? "left-3.5" : "left-0.5"}`} />
      </span>
      {checked ? "Shown" : "Hidden"}
    </button>
  );
}

function Text({ label, value, onChange, rows, hint }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number; hint?: string;
}) {
  return (
    <label className="block">
      <span className="a-label">{label}</span>
      {rows ? (
        <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} className="a-input font-sans leading-relaxed" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className="a-input font-sans" />
      )}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

function ListEditor({ items, onChange, addLabel, rows = 1 }: {
  items: string[]; onChange: (items: string[]) => void; addLabel: string; rows?: number;
}) {
  const update = (i: number, v: string) => onChange(items.map((x, j) => (j === i ? v : x)));
  const move = (i: number, d: number) => {
    const next = [...items];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="mt-2 w-6 shrink-0 text-right text-xs font-medium text-slate-400">{i + 1}.</span>
          {rows > 1 ? (
            <textarea rows={rows} value={item} onChange={(e) => update(i, e.target.value)} className="a-input font-sans" />
          ) : (
            <input value={item} onChange={(e) => update(i, e.target.value)} className="a-input font-sans" />
          )}
          <ItemActions first={i === 0} last={i === items.length - 1}
            onUp={() => move(i, -1)} onDown={() => move(i, 1)} onRemove={() => onChange(items.filter((_, j) => j !== i))} />
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, ""])} className="a-btn-outline ml-8 py-1.5">
        <PlusIcon className="size-4" /> {addLabel}
      </button>
    </div>
  );
}

function ItemActions({ first, last, onUp, onDown, onRemove }: {
  first: boolean; last: boolean; onUp: () => void; onDown: () => void; onRemove: () => void;
}) {
  const cls = "grid size-8 place-items-center rounded-lg text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-30";
  return (
    <div className="flex shrink-0 gap-1">
      <button type="button" onClick={onUp} disabled={first} className={cls} aria-label="Move up">↑</button>
      <button type="button" onClick={onDown} disabled={last} className={cls} aria-label="Move down">↓</button>
      <button type="button" onClick={onRemove} className={`${cls} text-rose-500 hover:bg-rose-50`} aria-label="Remove">
        <TrashIcon className="size-4" />
      </button>
    </div>
  );
}

function FaqEditor({ faqs, onChange }: { faqs: Faq[]; onChange: (faqs: Faq[]) => void }) {
  const update = (i: number, patch: Partial<Faq>) => onChange(faqs.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const move = (i: number, d: number) => {
    const next = [...faqs];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-3">
      {faqs.map((f, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Question {i + 1}</span>
            <ItemActions first={i === 0} last={i === faqs.length - 1}
              onUp={() => move(i, -1)} onDown={() => move(i, 1)} onRemove={() => onChange(faqs.filter((_, j) => j !== i))} />
          </div>
          <div className="space-y-2">
            <textarea rows={2} value={f.q} onChange={(e) => update(i, { q: e.target.value })} placeholder="Question" className="a-input font-sans" />
            <textarea rows={4} value={f.a} onChange={(e) => update(i, { a: e.target.value })} placeholder="Answer" className="a-input font-sans" />
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...faqs, { q: "", a: "" }])} className="a-btn-outline py-1.5">
        <PlusIcon className="size-4" /> Add question
      </button>
    </div>
  );
}

export function ContentEditor({ initial, landingId }: { initial: LandingContent; landingId: number }) {
  const [state, action] = useActionState(saveLandingContent, initialState);
  const [c, setC] = useState<LandingContent>(initial);
  const [dirty, setDirty] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const set = <K extends keyof LandingContent>(key: K, value: LandingContent[K]) => {
    setC((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };
  const setColor = (key: ColorKey, value: string) => set("colors", { ...c.colors, [key]: value });
  const setTheme = (key: ThemeKey, value: string) => set("theme", { ...c.theme, [key]: value });
  const patch = (fn: (prev: LandingContent) => LandingContent) => { setC(fn); setDirty(true); };
  const setBlock = (b: Block) => set("blocks", c.blocks.map((x) => (x.id === b.id ? b : x)));

  return (
    <form action={action} onSubmit={() => setDirty(false)} className="space-y-4 pb-36 lg:pb-24">
      <input type="hidden" name="landing_id" value={landingId} />
      <input type="hidden" name="content" value={JSON.stringify(c)} />

      <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        <strong>Tips:</strong> write <code className="rounded bg-white px-1">**text**</code> to make it <b>bold</b>, and{" "}
        <code className="rounded bg-white px-1">{"{price}"}</code> to show the current price (set on the product page). Line breaks are kept.
        The product photo comes from <Link href="/admin/products" className="font-medium underline">Products</Link>; the label banner is set on the Setup tab.
      </div>

      <section className="a-card p-5">
        <h2 className="font-medium text-slate-900">Page type</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2" role="radiogroup">
          {([
            ["full", "Full landing page", "The long sales page: banner, intro, benefits, FAQ, ingredients… and the order form at the end."],
            ["order", "Quick order page", "A short page: product, packages (1 / 2-jar combo / 3-jar combo) and the order form. Turn on packages in the Checkout form tab. The guide pages' order button opens this page."],
          ] as const).map(([value, title, text]) => (
            <button key={value} type="button" role="radio" aria-checked={c.pageType === value} onClick={() => set("pageType", value)}
              className={`rounded-xl border-2 p-3.5 text-left transition ${c.pageType === value ? "border-brand-500 bg-brand-50/60" : "border-slate-200 hover:bg-slate-50"}`}>
              <span className="block text-sm font-semibold text-slate-900">{c.pageType === value ? "● " : "○ "}{title}</span>
              <span className="mt-1 block text-xs leading-relaxed text-slate-500">{text}</span>
            </button>
          ))}
        </div>
      </section>

      {c.pageType === "order" && (
        <Section title="Quick order page text" hint="Shown beside the product photo" defaultOpen>
          <Text label="Title (leave empty to use the product name)" value={c.quick.title} onChange={(v) => set("quick", { ...c.quick, title: v })} />
          <Text label="Short text" rows={2} value={c.quick.subtitle} onChange={(v) => set("quick", { ...c.quick, subtitle: v })} />
          <div>
            <span className="a-label">Key points (shown with green ticks)</span>
            <ListEditor items={c.quick.points} onChange={(v) => set("quick", { ...c.quick, points: v })} addLabel="Add point" />
          </div>
          <div>
            <span className="a-label">Trust badges (small chips, up to 4)</span>
            <ListEditor items={c.quick.trust} onChange={(v) => set("quick", { ...c.quick, trust: v.slice(0, 4) })} addLabel="Add badge" />
          </div>
          <Text label="Heading above the guide links" value={c.quick.guidesTitle} onChange={(v) => set("quick", { ...c.quick, guidesTitle: v })} />
        </Section>
      )}

      {c.pageType === "full" && <>
      <Section title="Page layout" hint="Order of the sections, show / hide, and add new sections (text, photos, video, customer reviews)" defaultOpen>
        <LayoutEditor c={c} patch={patch} />
      </Section>

      {c.blocks.map((b) => (
        <Section key={b.id} title={blockName(b)} hint={b.show ? "Custom section" : "Custom section — hidden"}>
          <BlockFields block={b} onChange={setBlock} />
        </Section>
      ))}

      <Section title="Top section" hint="Doctor caption under the photo, approval heading and button text">
        <Text label="Doctor caption (under the product photo)" rows={3} value={c.doctorCaption} onChange={(v) => set("doctorCaption", v)} />
        <Text label="Approval heading" value={c.approvalHeading} onChange={(v) => set("approvalHeading", v)} />
        <Text label="Order button text (used on every button)" value={c.orderButtonText} onChange={(v) => set("orderButtonText", v)} />
      </Section>

      <Section title="Intro text box" hint="The big colored box with the description, doctor and problem list">
        <Text label="Text" rows={18} value={c.introText} onChange={(v) => set("introText", v)}
          hint="Leave an empty line between paragraphs. Leave the whole box empty to hide it." />
      </Section>

      <Section title="Benefits (কার্যকারীতা)" hint={`${c.benefits.length} items — shown two per card`}
        toggle={<Toggle checked={c.showBenefits} onChange={(v) => set("showBenefits", v)} />}>
        <Text label="Title" value={c.benefitsTitle} onChange={(v) => set("benefitsTitle", v)} />
        <ListEditor items={c.benefits} onChange={(v) => set("benefits", v)} addLabel="Add benefit" />
      </Section>

      <Section title="Price section" hint="Product photo with the price text"
        toggle={<Toggle checked={c.showPrice} onChange={(v) => set("showPrice", v)} />}>
        <Text label="Price title (red)" value={c.priceTitle} onChange={(v) => set("priceTitle", v)} />
        <Text label="Subtitle" value={c.priceSubtitle} onChange={(v) => set("priceSubtitle", v)} />
      </Section>

      <Section title="Questions & answers" hint={`${c.faqs.length} questions`}
        toggle={<Toggle checked={c.showFaq} onChange={(v) => set("showFaq", v)} />}>
        <Text label="Title" value={c.faqTitle} onChange={(v) => set("faqTitle", v)} />
        <FaqEditor faqs={c.faqs} onChange={(v) => set("faqs", v)} />
      </Section>

      <Section title="Ingredients, usage & advice" hint={`${c.ingredients.length} ingredients`}
        toggle={<Toggle checked={c.showIngredients} onChange={(v) => set("showIngredients", v)} />}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <Text label="Ingredients title" value={c.ingredientsTitle} onChange={(v) => set("ingredientsTitle", v)} />
            <ListEditor items={c.ingredients} onChange={(v) => set("ingredients", v)} addLabel="Add ingredient" />
          </div>
          <div className="space-y-3">
            <Text label="Usage title" value={c.usageTitle} onChange={(v) => set("usageTitle", v)} />
            <Text label="Usage text" rows={4} value={c.usageText} onChange={(v) => set("usageText", v)} />
            <Text label="Advice title" value={c.adviceTitle} onChange={(v) => set("adviceTitle", v)} />
            <Text label="Advice text" rows={4} value={c.adviceText} onChange={(v) => set("adviceText", v)} />
          </div>
        </div>
      </Section>

      </>}

      <Section title="Order form & thank-you page" hint="Checkout heading and the message after ordering">
        <Text label="Order form heading" value={c.checkoutTitle} onChange={(v) => set("checkoutTitle", v)} />
        <Text label="Thank-you page title" value={c.thankyouTitle} onChange={(v) => set("thankyouTitle", v)} />
        <Text label="Thank-you page subtitle" value={c.thankyouSubtitle} onChange={(v) => set("thankyouSubtitle", v)} />
      </Section>

      {c.pageType === "full" && <>
      <Section title="Theme & background colors" hint="Page colors — pick a ready-made set or choose each color">
        <div className="flex flex-wrap gap-2">
          {THEME_PRESETS.map((p) => (
            <button key={p.name} type="button" onClick={() => set("theme", p.theme)}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
              <span className="h-4 w-8 rounded" style={{ backgroundImage: `linear-gradient(90deg, ${p.theme.heroFrom}, ${p.theme.pageBg})` }} />
              {p.name}
            </button>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {THEME_LABELS.map(([key, label]) => <Color key={key} label={label} value={c.theme[key]} onChange={(v) => setTheme(key, v)} />)}
        </div>
      </Section>

      <Section title="Colors" hint="Buttons, intro box and benefit cards">
        <div className="grid gap-3 sm:grid-cols-2">
          {COLOR_LABELS.map(([key, label]) => (
            <label key={key} className="flex items-center gap-3 rounded-lg border border-slate-200 p-2.5">
              <input type="color" value={c.colors[key]} onChange={(e) => setColor(key, e.target.value)}
                className="h-9 w-12 cursor-pointer rounded border-0 bg-transparent p-0" />
              <span className="flex-1 text-sm text-slate-700">{label}</span>
              <code className="text-xs text-slate-400">{c.colors[key]}</code>
              {c.colors[key] !== DEFAULT_CONTENT.colors[key] && (
                <button type="button" onClick={() => setColor(key, DEFAULT_CONTENT.colors[key])} className="text-xs text-slate-500 underline">Reset</button>
              )}
            </label>
          ))}
        </div>
      </Section>
      </>}

      {/* Sticky save bar */}
      <div className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-30 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgb(15_23_42/0.06)] backdrop-blur lg:bottom-0 lg:left-64">
        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="mr-auto min-w-0 flex-1">
            {dirty ? <span className="text-sm text-amber-700">You have unsaved changes</span> : <FormAlert error={state.error} message={state.message} />}
          </div>
          {confirmReset ? (
            <span className="flex items-center gap-2 text-sm">
              <span className="text-rose-700">Restore all original text?</span>
              <button type="submit" name="reset" value="1" onClick={() => { setC(DEFAULT_CONTENT); setConfirmReset(false); }}
                className="rounded-lg bg-rose-600 px-3 py-2 font-medium text-white hover:bg-rose-700">Yes, reset</button>
              <button type="button" onClick={() => setConfirmReset(false)} className="a-btn-outline">Cancel</button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmReset(true)} className="a-btn-outline">Reset to original</button>
          )}
          <SubmitButton pendingText="Saving…">Save changes</SubmitButton>
        </div>
      </div>
    </form>
  );
}
