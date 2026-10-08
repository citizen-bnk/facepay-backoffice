import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, verifySession, type Session } from "./session";
import { canAccessPath, homePath } from "./rbac";

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  return verifySession(jar.get(COOKIE_NAME)?.value);
}

export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}

/** Defence in depth: re-check route RBAC in server components, not only in middleware. */
export async function requireAccess(pathname: string): Promise<Session> {
  const s = await requireSession();
  if (!canAccessPath(s.user.role, pathname)) redirect(homePath(s.user.role) + "?denied=1");
  return s;
}
