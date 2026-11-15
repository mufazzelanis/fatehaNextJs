import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// Order numbers are sequential (DC10183, DC10184…), so the thank-you page must not show a customer's name
// and address to anyone who just types another number. The browser that placed the order gets a signed
// cookie for it; only that browser sees the personal details.

const HOURS = 6;
const name = (orderNo: string) => `fb_o_${orderNo.replace(/[^A-Z0-9]/gi, "")}`;
const sign = (orderNo: string) =>
  createHmac("sha256", process.env.SESSION_SECRET ?? "").update(`order-receipt:${orderNo}`).digest("base64url").slice(0, 32);

/** Call right after the order is saved (server action). */
export async function rememberOrder(orderNo: string) {
  (await cookies()).set(name(orderNo), sign(orderNo), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: HOURS * 3600,
  });
}

/** True when this browser placed the order (within the last few hours). */
export async function placedHere(orderNo: string) {
  const got = (await cookies()).get(name(orderNo))?.value ?? "";
  const want = sign(orderNo);
  return got.length === want.length && timingSafeEqual(Buffer.from(got), Buffer.from(want));
}
