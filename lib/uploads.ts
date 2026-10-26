import "server-only";
import path from "node:path";

/** Uploaded files live outside /public so they are served after `next build` too (see app/media). */
export const UPLOAD_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), "storage", "uploads");

export function uploadPath(file: string) {
  return path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, path.basename(file));
}
