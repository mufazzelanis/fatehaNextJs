import type { PublicReview } from "@/lib/reviews";

export function Stars({ rating, size = 18 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`${rating} স্টার`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="currentColor" className={n <= rating ? "text-[#f5a623]" : "text-[#d9e2dc]"}>
          <path d="m12 2.8 2.85 5.78 6.38.93-4.62 4.5 1.09 6.35L12 17.36 6.3 20.36l1.09-6.35-4.62-4.5 6.38-.93z" />
        </svg>
      ))}
    </span>
  );
}

const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("");
const HUES = ["from-[#1d6b4a] to-[#2f9a6a]", "from-[#b45309] to-[#f59e0b]", "from-[#4338ca] to-[#7c3aed]", "from-[#be123c] to-[#f43f5e]", "from-[#0e7490] to-[#06b6d4]"];
const dateBn = (iso: string) => new Date(iso).toLocaleDateString("bn-BD", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dhaka" });

function Who({ r }: { r: PublicReview }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden="true" className={`grid size-11 shrink-0 place-items-center rounded-full bg-linear-to-br text-[17px] font-bold text-white shadow-sm ${HUES[r.id % HUES.length]}`}>
        {initials(r.name) || "★"}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 truncate text-[16.5px] font-bold text-[#123f2c]">
          {r.name}
          <span title="যাচাইকৃত গ্রাহক" className="grid size-4.5 shrink-0 place-items-center rounded-full bg-[#2f9a6a] text-[10px] text-white" aria-label="যাচাইকৃত">✓</span>
        </span>
        <span className="block truncate text-[14px] text-[#6b8576]">{[r.district, r.duration && `ব্যবহার: ${r.duration}`].filter(Boolean).join(" · ")}</span>
      </span>
    </div>
  );
}

/** Small card in the moving strip at the top of /reviews (text only, clamped). */
export function StripCard({ r }: { r: PublicReview }) {
  return (
    <article className="flex w-75 shrink-0 flex-col gap-3 rounded-3xl bg-white p-5 shadow-[0_8px_30px_-12px_rgb(18_63_44/0.25)] ring-1 ring-[#1d6b4a]/10 sm:w-85">
      <div className="flex items-center justify-between gap-2">
        <Stars rating={r.rating} />
        {r.experience && <span className="rounded-full bg-[#e8f3ec] px-2.5 py-0.5 text-[13px] font-semibold text-[#1d6b4a]">{r.experience}</span>}
      </div>
      <p className="line-clamp-4 flex-1 text-[16px] leading-[1.7] text-[#22382b]">“{r.text}”</p>
      <Who r={r} />
    </article>
  );
}

/** Full review in the list: text, liked points, photos (tap to zoom) and video. */
export function ReviewCard({ r }: { r: PublicReview }) {
  return (
    <article className={`flex break-inside-avoid flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm ring-1 transition hover:shadow-md sm:p-6 ${r.featured ? "ring-[#f5a623]/50" : "ring-[#1d6b4a]/10"}`}>
      <div className="flex items-start justify-between gap-3">
        <Who r={r} />
        {r.featured && <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[12.5px] font-bold text-amber-800">⭐ সেরা</span>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Stars rating={r.rating} />
        {r.experience && <span className="text-[14.5px] font-semibold text-[#1d6b4a]">{r.experience}</span>}
      </div>
      {r.text && <p className="whitespace-pre-line text-[17px] leading-[1.75] text-[#22382b]">{r.text}</p>}
      {r.liked.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {r.liked.map((l) => <span key={l} className="rounded-full bg-[#f1f8f3] px-3 py-1 text-[13.5px] font-medium text-[#1d6b4a] ring-1 ring-[#1d6b4a]/10">👍 {l}</span>)}
        </div>
      )}
      {r.photos.length > 0 && (
        <div className={`grid gap-2 ${r.photos.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {r.photos.map((p) => (
            <button key={p} type="button" data-zoom={`/media/${p}?w=828`} data-zoom-alt={`${r.name}-এর ছবি`} aria-label="ছবিটি বড় করে দেখুন"
              className="group overflow-hidden rounded-2xl bg-[#e8f3ec]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/media/${p}?w=512`} alt={`${r.name}-এর ছবি`} loading="lazy" decoding="async" width={512} height={512}
                className={`w-full object-cover transition duration-500 group-hover:scale-105 ${r.photos.length === 1 ? "max-h-96" : "aspect-square"}`} />
            </button>
          ))}
        </div>
      )}
      {r.video && (
        <video src={`/media/${r.video}`} controls playsInline preload="metadata" className="max-h-105 w-full rounded-2xl bg-black" />
      )}
      <p className="mt-auto text-[13px] text-[#9db1a5]">{dateBn(r.date)}</p>
    </article>
  );
}
