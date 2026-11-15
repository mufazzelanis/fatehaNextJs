import { guideImage } from "@/lib/guides";

/**
 * Picture on a guide page — plain server-rendered HTML (no JavaScript per picture). Phones download a
 * small copy; tapping opens the full picture via the single <ImageZoom /> mounted by the page shell.
 * `priority` = the first picture people see: loaded right away instead of lazily.
 */
export function GuideImage({ src, alt, sizes, priority, className = "" }: {
  src: string; alt: string; sizes: string; priority?: boolean; className?: string;
}) {
  const img = guideImage(src, sizes);
  const big = src.startsWith("/guides/") ? src : `/media/${src}?w=828`;
  return (
    <button type="button" data-zoom={big} data-zoom-alt={alt} aria-label={`${alt || "ছবি"} — বড় করে দেখুন`}
      className={`group relative block w-full overflow-hidden rounded-2xl bg-[#e8f3ec] ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img {...img} alt={alt} width={1080} height={1080} loading={priority ? "eager" : "lazy"} decoding="async"
        fetchPriority={priority ? "high" : undefined}
        className="block h-auto w-full transition duration-500 group-hover:scale-[1.02]" />
      <span aria-hidden="true" className="absolute bottom-2.5 right-2.5 rounded-full bg-black/55 px-2.5 py-1 text-[13px] font-semibold text-white">🔍 বড় করুন</span>
    </button>
  );
}
