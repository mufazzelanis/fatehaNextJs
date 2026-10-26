import "server-only";
import path from "node:path";
import { cacheLife } from "next/cache";

/** Uploaded files live outside /public so they are served after `next build` too (see app/media). */
export const UPLOAD_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), "storage", "uploads");

export function uploadPath(file: string) {
  return path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, path.basename(file));
}

/** Pixel size of an uploaded image (for width/height attributes, so the page doesn't jump while it loads). */
export async function mediaSize(file: string): Promise<{ width: number; height: number } | null> {
  "use cache";
  cacheLife("max"); // upload names are unique, so a name always means the same picture
  try {
    const { default: sharp } = await import("sharp");
    const m = await sharp(uploadPath(file)).metadata();
    return m.width && m.height ? { width: m.width, height: m.height } : null;
  } catch {
    return null;
  }
}
