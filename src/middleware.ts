import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, verifySession } from "@/lib/session";
import { canAccessPath, homePath } from "@/lib/rbac";

/** Edge RBAC: authenticate every portal request, then authorise by role and route. */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await verifySession(req.cookies.get(COOKIE_NAME)?.value);
  const isApi = pathname.startsWith("/api/");

  if (pathname === "/login") {
    if (session) return NextResponse.redirect(new URL(homePath(session.user.role), req.url));
    return NextResponse.next();
  }
  if (!session) {
    if (isApi) return NextResponse.json({ error: { code: "unauthenticated", message: "Sign in required" } }, { status: 401 });
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (pathname === "/") return NextResponse.redirect(new URL(homePath(session.user.role), req.url));
  if (!isApi && !canAccessPath(session.user.role, pathname)) {
    return NextResponse.redirect(new URL(homePath(session.user.role) + "?denied=1", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/customer/:path*", "/merchant/:path*", "/admin/:path*", "/super/:path*", "/api/proxy/:path*", "/api/export/:path*"],
};
