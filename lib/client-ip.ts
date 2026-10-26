/** Visitor IP behind Cloudflare / Nginx: prefers the header the proxy sets, then the first forwarded hop. */
export function clientIpFrom(h: Headers): string | null {
  const ip = h.get("cf-connecting-ip") ?? h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0] ?? "";
  return ip.trim().slice(0, 64) || null;
}
