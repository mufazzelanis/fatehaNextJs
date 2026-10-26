import { readFile } from "node:fs/promises";
import path from "node:path";
import { uploadPath } from "@/lib/uploads";

const TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

export async function GET(_request: Request, ctx: RouteContext<"/media/[file]">) {
  const { file } = await ctx.params;
  const type = TYPES[path.extname(file).toLowerCase()];
  // Only plain generated filenames — no path traversal.
  if (!type || !/^[\w.-]+$/.test(file)) return new Response("Not found", { status: 404 });
  try {
    const data = await readFile(uploadPath(file));
    return new Response(new Uint8Array(data), {
      headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
