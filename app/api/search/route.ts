import { suggestProducts } from "@/lib/data/catalog";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  return Response.json(await suggestProducts(q), { headers: { "Cache-Control": "no-store" } });
}
