import { NextResponse } from "next/server";
import { findDemoUser } from "@/lib/demo-users";
import { COOKIE_NAME, cookieOptions, newSession, sessionConfigured, signSession } from "@/lib/session";
import { homePath, isRole } from "@/lib/rbac";
import { API_URL, usingApi } from "@/lib/data";
import type { SessionUser } from "@/lib/types";

export async function POST(req: Request) {
  if (!sessionConfigured()) {
    return NextResponse.json({ error: { code: "misconfigured", message: "SESSION_SECRET is not configured" } }, { status: 500 });
  }
  let body: { email?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { code: "bad_request", message: "Invalid JSON" } }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json({ error: { code: "bad_request", message: "Email and password are required" } }, { status: 400 });
  }

  let user: SessionUser | null = null;
  let apiToken: string | undefined;
  if (usingApi) {
    try {
      const res = await fetch(`${API_URL}/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const j = (await res.json()) as { token?: string; user?: SessionUser };
        if (j.token && j.user && isRole(j.user.role)) {
          user = { id: j.user.id, name: j.user.name, email: j.user.email, role: j.user.role, tenantId: j.user.tenantId };
          apiToken = j.token;
        }
      }
    } catch {
      /* API unreachable: demo users still work so the portal can be explored */
      user = findDemoUser(email, password);
    }
  } else {
    user = findDemoUser(email, password);
  }

  if (!user) {
    return NextResponse.json({ error: { code: "invalid_credentials", message: "Incorrect email or password" } }, { status: 401 });
  }
  const token = await signSession(newSession(user, apiToken));
  const res = NextResponse.json({ user, redirect: homePath(user.role) });
  res.cookies.set(COOKIE_NAME, token, cookieOptions);
  return res;
}
