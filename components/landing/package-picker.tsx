"use client";

import { packagePrice, type OrderPackage } from "@/lib/checkout";
import { sized } from "@/lib/media";

const tk = (n: number) => `৳${Math.round(n).toLocaleString("en-IN")}`;
const bnDigits = (s: string | number) => String(s).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);

/**
 * Package cards (1 jar / 2-jar combo / 3-jar combo…): big tap targets, the jars drawn ×qty, the price,
 * the regular price struck through and the saving when the combo is cheaper, badge and free delivery.
 */
export function PackagePicker({ items, selected, onSelect, unitPrice, image, accent = "#1d6b4a", error }: {
  items: OrderPackage[]; selected: string; onSelect: (id: string) => void; unitPrice: number; image: string; accent?: string; error?: string;
}) {
  return (
    <div role="radiogroup" aria-label="প্যাকেজ" className="grid gap-3">
      {items.map((p) => {
        const price = packagePrice(p, unitPrice);
        const regular = Math.round(unitPrice * p.qty);
        const save = regular - price;
        const on = p.id === selected;
        return (
          <button key={p.id} type="button" role="radio" aria-checked={on} onClick={() => onSelect(p.id)}
            className={`relative flex w-full items-center gap-3 rounded-2xl border-2 bg-white p-3.5 text-left transition active:scale-[0.99] sm:gap-4 sm:p-4 ${
              on ? "shadow-[0_10px_30px_-12px_rgb(0_0_0/0.35)]" : "border-[#e2e8e4] hover:border-[#b9cfc2]"}`}
            style={on ? { borderColor: accent, backgroundColor: `color-mix(in srgb, ${accent} 6%, white)` } : undefined}>
            {p.badge && (
              <span className="absolute -top-3 right-3 rounded-full px-3 py-0.5 text-[13px] font-bold text-white shadow-sm sm:text-xs" style={{ backgroundColor: accent }}>
                {p.badge}
              </span>
            )}
            <span className={`grid size-7 shrink-0 place-items-center rounded-full border-2 transition ${on ? "" : "border-[#b7c3bc]"}`} style={on ? { borderColor: accent } : undefined}>
              <span className={`size-3.5 rounded-full transition ${on ? "scale-100" : "scale-0"}`} style={{ backgroundColor: accent }} />
            </span>
            {/* jars ×qty */}
            <span className="relative flex h-16 shrink-0 items-end sm:h-[72px]" style={{ width: `${44 + Math.min(p.qty - 1, 4) * 18}px` }} aria-hidden="true">
              {Array.from({ length: Math.min(p.qty, 5) }, (_, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={sized(image, 128)} alt="" width={48} height={48}
                  className="absolute bottom-0 size-12 rounded-lg bg-white object-contain ring-1 ring-black/5 sm:size-14"
                  style={{ left: `${i * 18}px`, zIndex: 10 - i, transform: `translateY(${i % 2 ? -4 : 0}px)` }} />
              ))}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-sans text-[19px] font-bold leading-tight text-[#14261c] sm:text-[18px]">{p.title}</span>
              {p.subtitle && <span className="mt-0.5 block text-[15px] leading-snug text-[#4b6356] sm:text-sm">{p.subtitle}</span>}
              <span className="mt-1.5 flex flex-wrap gap-1.5">
                {save > 0 && <span className="rounded-md bg-[#fde8e8] px-2 py-0.5 text-[13px] font-bold text-[#c81e1e]">{bnDigits(save)} টাকা সাশ্রয়</span>}
                {p.freeDelivery && <span className="rounded-md bg-[#e3f5ea] px-2 py-0.5 text-[13px] font-bold text-[#1d6b4a]">🚚 ফ্রি ডেলিভারি</span>}
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block text-[22px] font-extrabold tabular-nums leading-none text-[#14261c] sm:text-[24px]">{tk(price)}</span>
              {save > 0 && <span className="mt-1 block text-[15px] tabular-nums text-[#8a9a90] line-through">{tk(regular)}</span>}
            </span>
          </button>
        );
      })}
      {error && <p className="text-[16px] font-semibold text-[#c2321a]">{error}</p>}
    </div>
  );
}
