"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AGE_RANGES, DURATIONS, EXPERIENCES, LIKED, MAX_PHOTO_MB, MAX_PHOTOS, MAX_VIDEO_MB, MEDIA_CHOICES, MEDIA_PERMIT, PUBLISH, USED,
} from "@/lib/reviews";

type Errors = Record<string, string>;
const EMOJI: Record<string, string> = { very_good: "😍", good: "😊", ok: "🙂", unhappy: "😞" };
const bn = (n: number) => String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);

function Section({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#1d6b4a]/10 sm:p-7">
      <legend className="sr-only">{title}</legend>
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-[#1d6b4a] to-[#2f9a6a] text-[17px] font-bold text-white shadow-sm" aria-hidden="true">{n}</span>
        <h3 className="font-display text-[21px] font-bold text-[#123f2c]">{title}</h3>
      </div>
      <div className="space-y-6">{children}</div>
    </fieldset>
  );
}

function Q({ label, hint, error, children, id }: { label: string; hint?: string; error?: string; children: ReactNode; id: string }) {
  return (
    <div id={`q-${id}`} className="scroll-mt-28">
      <p className="text-[17px] font-semibold leading-snug text-[#22382b]">{label}</p>
      {hint && <p className="mt-0.5 text-[14.5px] text-[#6b8576]">{hint}</p>}
      <div className="mt-2.5">{children}</div>
      {error && <p role="alert" className="mt-2 text-[15px] font-semibold text-rose-600">⚠ {error}</p>}
    </div>
  );
}

/** Pill buttons for one choice (radio) or several (checkbox). */
function Pills({ name, options, value, onChange, multi }: {
  name: string; options: readonly (readonly [string, string])[]; value: string | string[]; onChange: (v: string) => void; multi?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2" role={multi ? "group" : "radiogroup"}>
      {options.map(([v, label]) => {
        const on = multi ? (value as string[]).includes(v) : value === v;
        return (
          <label key={v} className={`relative flex cursor-pointer select-none items-center gap-2 rounded-2xl border-2 px-4 py-2.5 text-[16px] font-semibold transition active:scale-[0.97] has-focus-visible:ring-4 has-focus-visible:ring-[#2f9a6a]/25 ${
            on ? "border-[#1d6b4a] bg-[#1d6b4a] text-white shadow-md" : "border-[#cfe0d6] bg-white text-[#22382b] hover:border-[#2f9a6a] hover:bg-[#f1f8f3]"}`}>
            <input type={multi ? "checkbox" : "radio"} name={name} value={v} checked={on} onChange={() => onChange(v)} className="sr-only" />
            <span aria-hidden="true" className={`grid size-5 shrink-0 place-items-center border-2 text-[12px] ${multi ? "rounded-md" : "rounded-full"} ${on ? "border-white bg-white text-[#1d6b4a]" : "border-[#b5c9bd]"}`}>{on ? "✓" : ""}</span>
            {label}
          </label>
        );
      })}
    </div>
  );
}

const inputCls = "w-full rounded-2xl border-2 border-[#cfe0d6] bg-white px-4 py-3 text-[17px] outline-none transition placeholder:text-[#9db1a5] focus:border-[#2f9a6a] focus:ring-4 focus:ring-[#2f9a6a]/15 aria-invalid:border-rose-400";

export function ReviewForm({ districts, product }: { districts: string[]; product: string }) {
  const [v, setV] = useState({ name: "", phone: "", district: "", age: "", used: "", duration: "", experience: "", story: "", suggestion: "", publish: "", media_ok: "", mediaChoice: "" });
  const [liked, setLiked] = useState<string[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const honey = useRef<HTMLInputElement>(null);
  const set = (k: keyof typeof v) => (val: string) => { setV((s) => ({ ...s, [k]: val })); setErrors((e) => ({ ...e, [k]: "" })); };

  const photoUrls = usePreviews(photos);
  const videoList = useMemo(() => (video ? [video] : []), [video]);
  const videoUrl = usePreviews(videoList)[0];
  const hasMedia = photos.length > 0 || !!video;

  function addPhotos(list: FileList | null) {
    const picked = [...(list ?? [])].filter((f) => f.type.startsWith("image/"));
    const big = picked.find((f) => f.size > MAX_PHOTO_MB * 1024 * 1024);
    setErrors((e) => ({ ...e, media: big ? `"${big.name}" ছবিটি ${MAX_PHOTO_MB}MB-এর বেশি — ছোট ছবি দিন` : "" }));
    setPhotos((p) => [...p, ...picked.filter((f) => f.size <= MAX_PHOTO_MB * 1024 * 1024)].slice(0, MAX_PHOTOS));
  }
  function pickVideo(list: FileList | null) {
    const f = list?.[0];
    if (!f) return;
    if (f.size > MAX_VIDEO_MB * 1024 * 1024) { setErrors((e) => ({ ...e, media: `ভিডিওটি ${MAX_VIDEO_MB}MB-এর বেশি — ছোট ভিডিও দিন` })); return; }
    setErrors((e) => ({ ...e, media: "" }));
    setVideo(f);
  }

  function validate(): Errors {
    const e: Errors = {};
    if (v.name.trim().length < 2) e.name = "আপনার নাম লিখুন";
    if (v.phone.trim() && !/^(\+?88)?01[3-9]\d{8}$/.test(v.phone.replace(/[\s-]/g, ""))) e.phone = "সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)";
    if (v.district.trim().length < 2) e.district = "আপনার জেলা লিখুন";
    if (!v.age) e.age = "বয়সের পরিসর বেছে নিন";
    if (!v.used) e.used = "হ্যাঁ অথবা না বেছে নিন";
    if (v.used === "yes" && !v.duration) e.duration = "কতদিন ব্যবহার করছেন বেছে নিন";
    if (v.used === "yes" && !v.experience) e.experience = "আপনার অভিজ্ঞতা কেমন বেছে নিন";
    if (v.story.trim().length < 10) e.story = "আপনার অভিজ্ঞতা অন্তত এক লাইনে লিখুন";
    if (!v.publish) e.publish = "প্রকাশের অনুমতি বেছে নিন";
    if (hasMedia && !v.media_ok) e.media_ok = "ছবি/ভিডিও প্রকাশের অনুমতি বেছে নিন";
    return e;
  }

  function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (progress !== null) return;
    const e = validate();
    setErrors(e);
    const first = Object.keys(e).find((k) => e[k]);
    if (first) {
      setFormError("লাল চিহ্নিত ঘরগুলো পূরণ করুন");
      document.getElementById(`q-${first}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setFormError("");
    const fd = new FormData();
    for (const [k, val] of Object.entries(v)) if (k !== "mediaChoice") fd.append(k, val);
    liked.forEach((l) => fd.append("liked", l));
    if (v.mediaChoice === "photo") photos.forEach((p) => fd.append("photos", p));
    if (v.mediaChoice === "video" && video) fd.append("video", video);
    fd.append("website", honey.current?.value ?? "");

    // XHR (not fetch) so a big video shows real upload progress.
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/reviews");
    xhr.upload.onprogress = (p) => p.lengthComputable && setProgress(Math.round((p.loaded / p.total) * 100));
    xhr.onload = () => {
      setProgress(null);
      let res: { ok?: boolean; error?: string; fieldErrors?: Errors } = {};
      try { res = JSON.parse(xhr.responseText); } catch {}
      if (res.ok) {
        setDone(true);
        document.getElementById("review-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      setFormError(res.error || (xhr.status === 413 ? "ফাইলটি অনেক বড় — ছোট ফাইল দিন।" : "জমা দেওয়া যায়নি — আবার চেষ্টা করুন।"));
      if (res.fieldErrors) setErrors(res.fieldErrors);
    };
    xhr.onerror = () => { setProgress(null); setFormError("ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।"); };
    setProgress(0);
    xhr.send(fd);
  }

  if (done) {
    return (
      <div className="animate-slide-up rounded-3xl bg-linear-to-br from-emerald-50 to-white p-8 text-center shadow-sm ring-1 ring-emerald-200 sm:p-12" role="status">
        <p className="text-6xl" aria-hidden="true">💚</p>
        <h3 className="mt-4 font-display text-[28px] font-bold text-[#123f2c]">ধন্যবাদ, {v.name.trim().split(" ")[0]}!</h3>
        <p className="mx-auto mt-2 max-w-md text-[17px] leading-relaxed text-[#34503f]">
          আপনার অভিজ্ঞতা আমাদের কাছে পৌঁছেছে। যাচাইয়ের পর {v.publish === "internal" ? "এটি শুধু আমাদের অভ্যন্তরীণ মতামত হিসেবে থাকবে।" : "এটি এই পেজে প্রকাশ করা হবে।"}
        </p>
      </div>
    );
  }

  const busy = progress !== null;
  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <input ref={honey} name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 opacity-0" />

      <Section n="১" title="ব্যক্তিগত তথ্য">
        <div className="grid gap-5 sm:grid-cols-2">
          <Q id="name" label="১. আপনার নাম *" error={errors.name}>
            <input value={v.name} onChange={(e) => set("name")(e.target.value)} maxLength={80} autoComplete="name" aria-invalid={!!errors.name} className={inputCls} placeholder="যেমন: রহিমা বেগম" />
          </Q>
          <Q id="district" label="২. আপনার জেলা *" error={errors.district}>
            <input value={v.district} onChange={(e) => set("district")(e.target.value)} maxLength={60} list="review-districts" aria-invalid={!!errors.district} className={inputCls} placeholder="যেমন: ঢাকা" />
            <datalist id="review-districts">{districts.map((d) => <option key={d} value={d} />)}</datalist>
          </Q>
        </div>
        <Q id="phone" label="মোবাইল নম্বর (ঐচ্ছিক)" hint="প্রকাশ করা হবে না — প্রয়োজনে যোগাযোগের জন্য" error={errors.phone}>
          <input value={v.phone} onChange={(e) => set("phone")(e.target.value)} inputMode="tel" maxLength={20} autoComplete="tel" aria-invalid={!!errors.phone} className={`${inputCls} tabular-nums sm:max-w-xs`} placeholder="01XXXXXXXXX" />
        </Q>
        <Q id="age" label="৩. আপনার বয়সের পরিসর *" error={errors.age}>
          <Pills name="age" options={AGE_RANGES.map((a) => [a, a] as const)} value={v.age} onChange={set("age")} />
        </Q>
        <Q id="used" label={`৪. আপনি কি ${product} ব্যবহার করেছেন? *`} error={errors.used}>
          <Pills name="used" options={USED} value={v.used} onChange={set("used")} />
        </Q>
      </Section>

      <Section n="২" title="পণ্য ব্যবহারের অভিজ্ঞতা">
        {v.used !== "no" && <>
          <Q id="duration" label="৫. কতদিন ধরে পণ্যটি ব্যবহার করছেন?" error={errors.duration}>
            <Pills name="duration" options={DURATIONS.map((d) => [d, d] as const)} value={v.duration} onChange={set("duration")} />
          </Q>
          <Q id="experience" label="৬. পণ্যটি ব্যবহারের অভিজ্ঞতা কেমন?" error={errors.experience}>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4" role="radiogroup">
              {EXPERIENCES.map(([k, label]) => {
                const on = v.experience === k;
                return (
                  <label key={k} className={`flex cursor-pointer flex-col items-center gap-1 rounded-2xl border-2 p-3.5 text-center transition active:scale-[0.97] has-focus-visible:ring-4 has-focus-visible:ring-[#2f9a6a]/25 ${
                    on ? "border-[#1d6b4a] bg-[#e8f3ec] shadow-md" : "border-[#cfe0d6] bg-white hover:border-[#2f9a6a]"}`}>
                    <input type="radio" name="experience" value={k} checked={on} onChange={() => set("experience")(k)} className="sr-only" />
                    <span className={`text-4xl transition ${on ? "scale-125" : "grayscale-40"}`} aria-hidden="true">{EMOJI[k]}</span>
                    <span className={`text-[16px] font-bold ${on ? "text-[#1d6b4a]" : "text-[#22382b]"}`}>{label}</span>
                  </label>
                );
              })}
            </div>
          </Q>
          <Q id="liked" label="৭. পণ্যটির কোন বিষয়টি আপনার ভালো লেগেছে?" hint="একাধিক বেছে নিতে পারেন">
            <Pills name="liked" multi options={LIKED.map((l) => [l, l] as const)} value={liked}
              onChange={(l) => setLiked((s) => (s.includes(l) ? s.filter((x) => x !== l) : [...s, l]))} />
          </Q>
        </>}
        <Q id="story" label="৮. পণ্যটি ব্যবহার করার সময় আপনার ব্যক্তিগত অভিজ্ঞতা লিখুন *" error={errors.story}>
          <textarea value={v.story} onChange={(e) => set("story")(e.target.value)} rows={5} maxLength={3000} aria-invalid={!!errors.story}
            className={`${inputCls} leading-relaxed`} placeholder="যেমন: কতদিন ব্যবহার করছেন, কী পরিবর্তন দেখেছেন, কেমন লেগেছে…" />
          <p className="mt-1 text-right text-[13px] tabular-nums text-[#9db1a5]">{bn(v.story.length)}/৩০০০</p>
        </Q>
        <Q id="suggestion" label="৯. পণ্যটি সম্পর্কে আপনার কোনো পরামর্শ বা মতামত আছে কি?">
          <textarea value={v.suggestion} onChange={(e) => set("suggestion")(e.target.value)} rows={3} maxLength={2000} className={`${inputCls} leading-relaxed`} placeholder="(ঐচ্ছিক)" />
        </Q>
      </Section>

      <Section n="৩" title="ছবি ও ভিডিও (ঐচ্ছিক)">
        <Q id="media" label="১০. আপনার পণ্য ব্যবহারের অভিজ্ঞতার সঙ্গে সম্পর্কিত কোনো ছবি বা ভিডিও শেয়ার করতে চান?" error={errors.media}>
          <Pills name="mediaChoice" options={MEDIA_CHOICES} value={v.mediaChoice} onChange={(c) => { set("mediaChoice")(c); if (c !== "photo") setPhotos([]); if (c !== "video") setVideo(null); }} />
          {v.mediaChoice === "photo" && (
            <div className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-5">
              {photoUrls.map((u, i) => (
                <div key={u} className="relative aspect-square overflow-hidden rounded-2xl bg-[#e8f3ec] ring-1 ring-[#1d6b4a]/10 animate-fade-in">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt="" className="size-full object-cover" />
                  <button type="button" onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))} aria-label="ছবিটি সরান"
                    className="absolute right-1.5 top-1.5 grid size-8 place-items-center rounded-full bg-black/60 text-white transition hover:bg-rose-600">✕</button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-[#9fcdb2] bg-[#f1f8f3] text-center text-[#1d6b4a] transition hover:border-[#1d6b4a] hover:bg-[#e8f3ec] has-focus-visible:ring-4 has-focus-visible:ring-[#2f9a6a]/25">
                  <span className="text-3xl" aria-hidden="true">📷</span>
                  <span className="text-[14px] font-bold">ছবি দিন</span>
                  <span className="text-[12px] text-[#6b8576]">{bn(photos.length)}/{bn(MAX_PHOTOS)}</span>
                  <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
                </label>
              )}
            </div>
          )}
          {v.mediaChoice === "video" && (
            <div className="mt-4">
              {videoUrl ? (
                <div className="relative overflow-hidden rounded-2xl bg-black ring-1 ring-[#1d6b4a]/10 sm:max-w-md animate-fade-in">
                  <video src={videoUrl} controls playsInline preload="metadata" className="max-h-80 w-full" />
                  <button type="button" onClick={() => setVideo(null)} className="absolute right-2 top-2 rounded-full bg-black/65 px-3 py-1.5 text-[14px] font-semibold text-white hover:bg-rose-600">✕ সরান</button>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center gap-4 rounded-2xl border-2 border-dashed border-[#9fcdb2] bg-[#f1f8f3] p-5 text-[#1d6b4a] transition hover:border-[#1d6b4a] hover:bg-[#e8f3ec] has-focus-visible:ring-4 has-focus-visible:ring-[#2f9a6a]/25 sm:max-w-md">
                  <span className="text-4xl" aria-hidden="true">🎬</span>
                  <span><span className="block text-[17px] font-bold">ভিডিও বেছে নিন</span><span className="block text-[14px] text-[#6b8576]">MP4 / WebM, সর্বোচ্চ {bn(MAX_VIDEO_MB)}MB</span></span>
                  <input type="file" accept="video/mp4,video/webm,video/quicktime,video/*" className="sr-only" onChange={(e) => { pickVideo(e.target.files); e.target.value = ""; }} />
                </label>
              )}
            </div>
          )}
        </Q>
      </Section>

      <Section n="৪" title="প্রকাশের অনুমতি">
        <Q id="publish" label="১১. আপনার দেওয়া অভিজ্ঞতা Fateha BD-এর ওয়েবসাইট বা সোশ্যাল মিডিয়ায় প্রকাশের অনুমতি দিচ্ছেন কি? *" error={errors.publish}>
          <Choices name="publish" options={PUBLISH} value={v.publish} onChange={set("publish")} />
        </Q>
        {hasMedia && (
          <Q id="media_ok" label="১২. আপনার ছবি বা ভিডিও প্রকাশের জন্য আলাদা অনুমতি *" error={errors.media_ok}>
            <Choices name="media_ok" options={MEDIA_PERMIT} value={v.media_ok} onChange={set("media_ok")} />
          </Q>
        )}
      </Section>

      {formError && <p role="alert" className="rounded-2xl bg-rose-50 px-5 py-3.5 text-[16px] font-semibold text-rose-700 ring-1 ring-rose-200 animate-fade-in">⚠ {formError}</p>}

      <button type="submit" disabled={busy}
        className="cta-fx relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-linear-to-r from-[#1d6b4a] to-[#2f9a6a] px-6 py-4.5 text-[21px] font-bold text-white shadow-[0_10px_24px_-8px_rgb(29_107_74/0.7)] transition hover:-translate-y-0.5 disabled:cursor-wait [--cta-ring:rgb(47_154_106/0.45)]">
        {busy && <span aria-hidden="true" className="absolute inset-y-0 left-0 bg-white/20 transition-[width]" style={{ width: `${progress}%` }} />}
        <span className="relative">{busy ? (progress && progress < 100 ? `আপলোড হচ্ছে… ${bn(progress)}%` : "জমা হচ্ছে…") : "আমার অভিজ্ঞতা জমা দিন"}</span>
        {!busy && <span aria-hidden="true" className="cta-arrow relative">✓</span>}
      </button>
      <p className="flex items-start justify-center gap-2 text-center text-[15px] leading-relaxed text-[#4b6356]">
        <span aria-hidden="true">🔒</span>
        আপনার তথ্য আপনার অনুমতি ছাড়া প্রকাশ করা হবে না। অভিজ্ঞতা প্রকাশের আগে প্রয়োজন অনুযায়ী আপনার সঙ্গে যোগাযোগ করা হতে পারে।
      </p>
    </form>
  );
}

/** Long radio choices, one per line. */
function Choices({ name, options, value, onChange }: { name: string; options: readonly (readonly [string, string])[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid gap-2" role="radiogroup">
      {options.map(([k, label]) => {
        const on = value === k;
        return (
          <label key={k} className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 px-4 py-3.5 text-[16.5px] leading-snug transition active:scale-[0.99] has-focus-visible:ring-4 has-focus-visible:ring-[#2f9a6a]/25 ${
            on ? "border-[#1d6b4a] bg-[#e8f3ec] font-semibold text-[#123f2c]" : "border-[#cfe0d6] bg-white text-[#22382b] hover:border-[#2f9a6a]"}`}>
            <input type="radio" name={name} value={k} checked={on} onChange={() => onChange(k)} className="sr-only" />
            <span aria-hidden="true" className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 ${on ? "border-[#1d6b4a]" : "border-[#b5c9bd]"}`}>
              {on && <span className="size-2.5 rounded-full bg-[#1d6b4a]" />}
            </span>
            {label}
          </label>
        );
      })}
    </div>
  );
}

/** Object URLs for local previews, revoked when the files change. */
function usePreviews(files: File[]) {
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => urls.forEach((x) => URL.revokeObjectURL(x)), [urls]);
  return urls;
}
