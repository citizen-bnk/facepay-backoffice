import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { actionForMutation, can, isReadOnly } from "@/lib/rbac";
import { apiFetch, usingApi } from "@/lib/data";
import { canApproveRefund, evaluateRefund } from "@/lib/refunds";

const err = (status: number, code: string, message: string) => NextResponse.json({ error: { code, message } }, { status });

/** Prefixes that any signed-in, non-read-only user may POST to (no extra privilege needed). */
const OPEN_MUTATIONS = ["/v1/disputes", "/v1/cases", "/v1/tickets", "/v1/leads", "/v1/preferences", "/v1/exports"];

async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const session = await getSession();
  if (!session) return err(401, "unauthenticated", "Sign in required");
  const { path } = await ctx.params;
  const apiPath = "/" + path.join("/") + (req.nextUrl.search || "");
  const bare = "/" + path.join("/");
  const method = req.method;
  const role = session.user.role;

  if (method !== "GET") {
    // CSRF: browsers always send Origin on cross-site POSTs.
    const origin = req.headers.get("origin");
    if (origin && new URL(origin).host !== req.headers.get("host")) return err(403, "csrf", "Cross-origin request blocked");
    if (isReadOnly(role)) return err(403, "read_only", "Read-only role: mutations are not permitted");
    const action = actionForMutation(bare);
    if (action) {
      if (!can(role, action)) return err(403, "forbidden", `Role ${role} may not perform ${action}`);
    } else if (!OPEN_MUTATIONS.some((p) => bare.startsWith(p))) {
      return err(403, "forbidden", "Unknown mutation");
    }
  }

  const bodyText = method === "GET" ? undefined : await req.text();
  let body: Record<string, unknown> = {};
  if (bodyText) {
    try {
      body = JSON.parse(bodyText);
    } catch {
      return err(400, "bad_request", "Invalid JSON");
    }
  }

  // Business rules enforced server-side regardless of backend.
  if (bare === "/v1/refunds" && method === "POST") {
    const d = evaluateRefund({ amountMinor: Number(body.amountMinor), makerRole: role });
    if (d.decision === "denied") return err(422, "refund_denied", d.reason);
    if (!usingApi) {
      return NextResponse.json({ id: `rf_${Date.now().toString(36)}`, status: d.decision === "direct" ? "completed" : "pending_approval", makerId: session.user.id, note: d.reason });
    }
  }
  const approve = bare.match(/^\/v1\/refunds\/[^/]+\/(approve|reject)$/);
  if (approve) {
    const chk = canApproveRefund({ makerId: String(body.makerId ?? ""), checkerId: session.user.id, checkerRole: role, amountMinor: Number(body.amountMinor) });
    if (!chk.ok) return err(403, "maker_checker", chk.reason);
    if (!usingApi) return NextResponse.json({ status: approve[1] === "approve" ? "approved" : "rejected", checkerId: session.user.id });
  }
  if (bare.startsWith("/v1/transfers") && !usingApi) {
    return NextResponse.json({ id: `tr_${Date.now().toString(36)}`, status: "pending_provider_confirmation" }, { status: 202 });
  }

  if (!usingApi) {
    return NextResponse.json({ ok: true, id: `${bare.split("/")[2] ?? "obj"}_${Date.now().toString(36)}`, status: "accepted", by: session.user.id }, { status: method === "POST" ? 201 : 200 });
  }
  try {
    const res = await apiFetch(apiPath, session, { method, body: bodyText, headers: { "Idempotency-Key": req.headers.get("idempotency-key") ?? crypto.randomUUID() } });
    const text = await res.text();
    return new NextResponse(text, { status: res.status, headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" } });
  } catch {
    return err(502, "upstream_unavailable", "Provider or API unavailable. Nothing was changed; do not treat any payment as completed.");
  }
}

export { handle as GET, handle as POST, handle as PUT, handle as DELETE };
