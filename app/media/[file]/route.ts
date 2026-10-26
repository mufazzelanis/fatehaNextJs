import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { UPLOAD_DIR, uploadPath } from "@/lib/uploads";
import { MEDIA_WIDTHS } from "@/lib/media";

const TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
const CACHE = "public, max-age=31536000, immutable";
// Resized copies live next to the uploads: storage/cache/<width>/<file>.webp (safe to delete — rebuilt on demand).
const CACHE_DIR = path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, "..", "cache");
// One resize per file+width at a time, even when many visitors ask for it at once.
const pending = new Map<string, Promise<Buffer>>();

async function resized(file: string, width: number, sourceTime: number): Promise<Buffer> {
  const out = path.join(/*turbopackIgnore: true*/ CACHE_DIR, String(width), `${file}.webp`);
  const cached = await stat(out).catch(() => null);
  if (cached && cached.mtimeMs >= sourceTime) return readFile(out);

  const key = `${width}/${file}`;
  let job = pending.get(key);
  if (!job) {
    job = (async () => {
      const data = await sharp(uploadPath(file), { failOn: "none" })
        .rotate() // respect phone-camera orientation
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 78, effort: 4 })
        .toBuffer();
      await mkdir(path.dirname(out), { recursive: true });
      const tmp = `${out}.${process.pid}.tmp`;
      await writeFile(tmp, data);
      await rename(tmp, out);
      return data;
    })().finally(() => pending.delete(key));
    pending.set(key, job);
  }
  return job;
}

export async function GET(request: Request, ctx: RouteContext<"/media/[file]">) {
  const { file } = await ctx.params;
  const type = TYPES[path.extname(file).toLowerCase()];
  // Only plain generated filenames — no path traversal.
  if (!type || !/^[\w.-]+$/.test(file)) return new Response("Not found", { status: 404 });
  const source = await stat(uploadPath(file)).catch(() => null);
  if (!source?.isFile()) return new Response("Not found", { status: 404 });

  const w = new URL(request.url).searchParams.get("w");
  if (w !== null) {
    const width = Number(w);
    if (!(MEDIA_WIDTHS as readonly number[]).includes(width)) return new Response("Unsupported width", { status: 400 });
    try {
      const data = await resized(file, width, source.mtimeMs);
      return new Response(new Uint8Array(data), { headers: { "Content-Type": "image/webp", "Cache-Control": CACHE } });
    } catch {
      // A file sharp can't read still shows — just unoptimised.
    }
  }
  const data = await readFile(uploadPath(file));
  return new Response(new Uint8Array(data), { headers: { "Content-Type": type, "Cache-Control": CACHE } });
}
