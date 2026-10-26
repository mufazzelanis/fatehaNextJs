import { readFile } from "node:fs/promises";
import path from "node:path";
import { can, getAdmin } from "@/lib/auth";
import { dealerDocPath } from "@/lib/dealer";

const TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".pdf": "application/pdf" };

/** Dealer NID / bank-slip scans — staff with dealer access only, never cached by shared caches. */
export async function GET(_request: Request, ctx: RouteContext<"/admin/dealer-doc/[file]">) {
  const admin = await getAdmin();
  if (!admin || !can(admin, "dealers.view")) return new Response("Forbidden", { status: 403 });
  const { file } = await ctx.params;
  const type = TYPES[path.extname(file).toLowerCase()];
  if (!type || !/^[\w.-]+$/.test(file)) return new Response("Not found", { status: 404 });
  try {
    const data = await readFile(dealerDocPath(file));
    return new Response(new Uint8Array(data), {
      headers: { "Content-Type": type, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
