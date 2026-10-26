// Responsive product images (client-safe). `/media/<file>?w=<width>` returns a resized WebP — see app/media/[file]/route.ts.

/** The only widths the server will produce (any other ?w= is refused, so nobody can fill the disk with sizes). */
export const MEDIA_WIDTHS = [64, 96, 128, 192, 256, 384, 512, 640, 828] as const;
export type MediaWidth = (typeof MEDIA_WIDTHS)[number];

const isMedia = (src: string) => src.startsWith("/media/") && !src.includes("?");

/** One resized copy, e.g. a cart thumbnail. Other images (SVG placeholders, /brand) pass through unchanged. */
export function sized(src: string, w: MediaWidth) {
  return isMedia(src) ? `${src}?w=${w}` : src;
}

/**
 * src + srcSet + sizes for an <img>, so phones download a small WebP instead of the original.
 * `sizes` describes how wide the image is drawn (CSS), e.g. "(min-width: 1024px) 230px, 46vw".
 */
export function responsive(src: string, sizes: string, widths: readonly MediaWidth[] = [128, 192, 256, 384, 512]) {
  if (!isMedia(src)) return { src };
  return {
    src: `${src}?w=${widths[Math.min(2, widths.length - 1)]}`,
    srcSet: widths.map((w) => `${src}?w=${w} ${w}w`).join(", "),
    sizes,
  };
}
