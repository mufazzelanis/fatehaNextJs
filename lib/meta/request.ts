import "server-only";
import { cookies, headers } from "next/headers";
import type { UserData } from "./capi";
import { clientIpFrom } from "../client-ip";

/** Collects the request signals Meta uses for matching (cookies set by the pixel, IP, user agent). */
export async function requestUserData(): Promise<UserData> {
  const [cookieStore, h] = await Promise.all([cookies(), headers()]);
  const data: UserData = {};
  const ip = clientIpFrom(h);
  if (ip) data.client_ip_address = ip;
  const ua = h.get("user-agent");
  if (ua) data.client_user_agent = ua;
  const fbp = cookieStore.get("_fbp")?.value;
  if (fbp) data.fbp = fbp;
  const fbc = cookieStore.get("_fbc")?.value;
  if (fbc) data.fbc = fbc;
  return data;
}
