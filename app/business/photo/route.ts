import { readFile } from "node:fs/promises";
import path from "node:path";
import { dealerDocPath, getDealer } from "@/lib/dealer";

const TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

/** The signed-in dealer's own profile photo. */
export async function GET() {
  const me = await getDealer();
  const type = me?.photo ? TYPES[path.extname(me.photo).toLowerCase()] : undefined;
  if (!me?.photo || !type) return new Response("Not found", { status: 404 });
  try {
    const data = await readFile(dealerDocPath(me.photo));
    return new Response(new Uint8Array(data), { headers: { "Content-Type": type, "Cache-Control": "private, max-age=3600" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
