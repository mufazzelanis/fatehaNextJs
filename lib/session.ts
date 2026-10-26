import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

export type Role = "admin" | "customer" | "dealer";
export type SessionPayload = { uid: number; role: Role };

export const COOKIE = { admin: "fb_admin_session", customer: "fb_user_session", dealer: "fb_dealer_session" } as const;
const MAX_AGE = { admin: 60 * 60 * 12, customer: 60 * 60 * 24 * 30, dealer: 60 * 60 * 24 * 7 }; // 12h / 30d / 7d

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set to at least 32 characters (see .env.example)");
  }
  return new TextEncoder().encode(secret);
}

export async function encrypt(payload: SessionPayload, maxAgeSeconds: number) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSeconds}s`)
    .sign(secretKey());
}

export async function decrypt(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (typeof payload.uid !== "number" || (payload.role !== "admin" && payload.role !== "customer" && payload.role !== "dealer")) {
      return null;
    }
    return { uid: payload.uid, role: payload.role };
  } catch {
    return null;
  }
}

export async function createSession(uid: number, role: Role) {
  const token = await encrypt({ uid, role }, MAX_AGE[role]);
  (await cookies()).set(COOKIE[role], token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE[role],
  });
}

export async function readSession(role: Role): Promise<SessionPayload | null> {
  const session = await decrypt((await cookies()).get(COOKIE[role])?.value);
  return session?.role === role ? session : null;
}

export async function deleteSession(role: Role) {
  (await cookies()).delete(COOKIE[role]);
}
