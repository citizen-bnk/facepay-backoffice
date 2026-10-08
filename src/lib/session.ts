import type { SessionUser } from "./types";
import { isRole } from "./rbac";

export const COOKIE_NAME = "fp_session";
export const SESSION_TTL_S = 60 * 60 * 8;

export interface Session {
  user: SessionUser;
  /** Bearer token for facepay-core when NEXT_PUBLIC_API_URL is set. Never exposed to client JS (httpOnly). */
  apiToken?: string;
  exp: number;
}

function secret(): string | null {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV !== "production") return "dev-only-facepay-session-secret";
  return null;
}

const enc = new TextEncoder();

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array {
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function hmacKey(sec: string, usage: KeyUsage[]): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", enc.encode(sec), { name: "HMAC", hash: "SHA-256" }, false, usage);
}

export function sessionConfigured(): boolean {
  return secret() !== null;
}

export async function signSession(s: Session): Promise<string> {
  const sec = secret();
  if (!sec) throw new Error("SESSION_SECRET is not configured");
  const body = b64url(enc.encode(JSON.stringify(s)));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(sec, ["sign"]), enc.encode(body));
  return `${body}.${b64url(sig)}`;
}

export async function verifySession(token: string | undefined | null, now = Date.now()): Promise<Session | null> {
  if (!token) return null;
  const sec = secret();
  if (!sec) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await hmacKey(sec, ["verify"]), fromB64url(sig) as BufferSource, enc.encode(body));
    if (!ok) return null;
    const s = JSON.parse(new TextDecoder().decode(fromB64url(body))) as Session;
    if (!s?.user || !isRole(s.user.role) || typeof s.exp !== "number" || s.exp * 1000 < now) return null;
    return s;
  } catch {
    return null;
  }
}

export function newSession(user: SessionUser, apiToken?: string): Session {
  return { user, apiToken, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_S };
}

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL_S,
};
