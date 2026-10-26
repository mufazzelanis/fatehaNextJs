import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Optimistic redirects only — every page and action re-verifies the session against the database.
const key = new TextEncoder().encode(process.env.SESSION_SECRET ?? "");

async function hasSession(request: NextRequest, cookie: string, role: string) {
  const token = request.cookies.get(cookie)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    return payload.role === role;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    const loggedIn = await hasSession(request, "fb_admin_session", "admin");
    // The login page itself checks the database: a token for a disabled/deleted account must not bounce back to /admin.
    // Sign-in, code, forgot-password and reset pages are public.
    if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) return NextResponse.next();
    if (!loggedIn) {
      const url = new URL("/admin/login", request.url);
      url.searchParams.set("next", pathname + search);
      return NextResponse.redirect(url);
    }
  }

  if (pathname.startsWith("/account")) {
    const loggedIn = await hasSession(request, "fb_user_session", "customer");
    const isAuthPage = ["/account/login", "/account/register", "/account/forgot", "/account/verify"].includes(pathname);
    if (isAuthPage) return NextResponse.next();
    if (!loggedIn) {
      const url = new URL("/account/login", request.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*"],
};
