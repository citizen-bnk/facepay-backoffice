import { describe, expect, it } from "vitest";
import { canApproveRefund, evaluateRefund } from "@/lib/refunds";
import { maskEmail, maskId, maskPhone } from "@/lib/mask";
import { makePdf } from "@/lib/pdf";
import { newSession, signSession, verifySession } from "@/lib/session";

describe("refund checker rule", () => {
  it("cashier within R250 is direct; above needs approval", () => {
    expect(evaluateRefund({ amountMinor: 25_000, makerRole: "merchant_cashier" }).decision).toBe("direct");
    expect(evaluateRefund({ amountMinor: 25_001, makerRole: "merchant_cashier" }).decision).toBe("needs_approval");
  });
  it("owner above the R1,000 threshold needs approval", () => {
    expect(evaluateRefund({ amountMinor: 100_000, makerRole: "merchant_owner" }).decision).toBe("direct");
    expect(evaluateRefund({ amountMinor: 100_001, makerRole: "merchant_owner" }).decision).toBe("needs_approval");
  });
  it("rejects invalid amounts and roles without refund rights", () => {
    expect(evaluateRefund({ amountMinor: 0, makerRole: "merchant_owner" }).decision).toBe("denied");
    expect(evaluateRefund({ amountMinor: 1.5, makerRole: "merchant_owner" }).decision).toBe("denied");
    expect(evaluateRefund({ amountMinor: 100, makerRole: "support_agent" }).decision).toBe("denied");
  });
  it("checker must differ from maker", () => {
    const r = canApproveRefund({ makerId: "u1", checkerId: "u1", checkerRole: "super_user", amountMinor: 200_000 });
    expect(r.ok).toBe(false);
    expect(canApproveRefund({ makerId: "u1", checkerId: "u2", checkerRole: "merchant_owner", amountMinor: 200_000 }).ok).toBe(true);
  });
  it("checker needs authority for the amount", () => {
    expect(canApproveRefund({ makerId: "u1", checkerId: "u2", checkerRole: "merchant_owner", amountMinor: 600_000 }).ok).toBe(false);
    expect(canApproveRefund({ makerId: "u1", checkerId: "u2", checkerRole: "support_agent", amountMinor: 1_000 }).ok).toBe(false);
    expect(canApproveRefund({ makerId: "u1", checkerId: "u2", checkerRole: "finance_operator", amountMinor: 600_000 }).ok).toBe(true);
  });
});

describe("masking", () => {
  it("never returns full identifiers", () => {
    expect(maskEmail("thabo@example.test")).not.toContain("thabo");
    expect(maskPhone("+27821234567")).toContain("***");
    expect(maskId("8001015009087")).toMatch(/\*{4,}/);
  });
});

describe("session cookie", () => {
  const user = { id: "u", name: "N", email: "e@x", role: "customer" as const, tenantId: "t" };
  it("round-trips and rejects tampering", async () => {
    const tok = await signSession(newSession(user));
    expect((await verifySession(tok))?.user.role).toBe("customer");
    const [b, s] = tok.split(".");
    const forged = btoa(JSON.stringify({ ...JSON.parse(atob(b.replace(/-/g, "+").replace(/_/g, "/"))), user: { ...user, role: "super_user" } })).replace(/=+$/, "");
    expect(await verifySession(`${forged}.${s}`)).toBeNull();
  });
  it("rejects expired", async () => {
    const tok = await signSession({ ...newSession(user), exp: 1 });
    expect(await verifySession(tok)).toBeNull();
  });
});

describe("pdf", () => {
  it("produces a PDF header", () => {
    expect(new TextDecoder().decode(makePdf("T", ["a"]).slice(0, 5))).toBe("%PDF-");
  });
});
