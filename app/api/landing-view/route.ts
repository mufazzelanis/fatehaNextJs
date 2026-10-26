import { execute } from "@/lib/db";

/** View counter for landing pages (one beacon per browser session; bots without JS are not counted). */
export async function POST(request: Request) {
  let id = 0;
  try {
    id = Number((await request.json())?.id);
  } catch {}
  if (!Number.isInteger(id) || id <= 0) return new Response(null, { status: 204 });
  const ua = request.headers.get("user-agent") ?? "";
  if (!/bot|crawler|spider|facebookexternalhit|preview/i.test(ua)) {
    await execute("UPDATE landing_pages SET views = views + 1 WHERE id = ? AND status = 'published'", [id]);
  }
  return new Response(null, { status: 204 });
}
