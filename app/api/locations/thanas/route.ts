import { getThanas } from "@/lib/data/locations";

export async function GET(request: Request) {
  const id = Number(new URL(request.url).searchParams.get("district"));
  if (!Number.isInteger(id) || id <= 0) return Response.json([]);
  return Response.json(await getThanas(id), { headers: { "Cache-Control": "public, max-age=86400" } });
}
