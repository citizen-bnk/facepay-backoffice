import { describe, expect, it } from "vitest";
import { ACTIONS, PORTALS, ROLES, actionForMutation, canAccessPath, can, homePath, isReadOnly, navFor, permissionMatrix, portalsFor } from "@/lib/rbac";
import type { Role } from "@/lib/types";

describe("navigation per role", () => {
  it("customers only see the customer portal with the 10 spec items", () => {
    expect(portalsFor("customer")).toEqual(["customer"]);
    expect(navFor("customer", "customer").map((i) => i.label)).toEqual(["Overview", "My Money", "Linked Accounts & Cards", "Payments", "Transfers", "Statements", "Disputes", "Biometric Consent", "Settings", "Help"]);
  });
  it("merchant owner sees all 11 merchant items; cashier is limited", () => {
    expect(navFor("merchant_owner", "merchant")).toHaveLength(11);
    const cashier = navFor("merchant_cashier", "merchant").map((i) => i.slug);
    expect(cashier).not.toContain("settlements");
    expect(cashier).not.toContain("team");
    expect(cashier).toContain("refunds");
  });
  it("super user sees all 10 console items and all 15 internal items", () => {
    expect(navFor("super_user", "super")).toHaveLength(11);
    expect(navFor("super_user", "admin")).toHaveLength(15);
  });
  it("landing paths", () => {
    expect(homePath("customer")).toBe("/customer");
    expect(homePath("merchant_owner")).toBe("/merchant");
    expect(homePath("support_agent")).toBe("/admin");
    expect(homePath("super_user")).toBe("/super");
    expect(homePath("auditor")).toBe("/admin");
  });
});

describe("route access (middleware rule)", () => {
  const deny: [Role, string][] = [
    ["customer", "/merchant"], ["customer", "/admin"], ["customer", "/super"],
    ["merchant_owner", "/customer/consent"], ["merchant_owner", "/admin"], ["merchant_cashier", "/merchant/settlements"], ["merchant_cashier", "/merchant/team"],
    ["support_agent", "/super"], ["support_agent", "/admin/settings"], ["support_agent", "/admin/audit-log"], ["support_agent", "/admin/staff"],
    ["auditor", "/super/approvals"], ["auditor", "/admin/customers"], ["auditor", "/merchant"],
  ];
  it.each(deny)("%s cannot open %s", (role, path) => expect(canAccessPath(role, path)).toBe(false));
  const allow: [Role, string][] = [
    ["customer", "/customer/consent"], ["merchant_owner", "/merchant/team"], ["support_agent", "/admin/customers"], ["support_agent", "/admin/reconciliation"],
    ["super_user", "/super/roles"], ["super_user", "/admin/audit-log"], ["auditor", "/admin/audit-log"], ["auditor", "/super/audit"],
  ];
  it.each(allow)("%s can open %s", (role, path) => expect(canAccessPath(role, path)).toBe(true));
});

describe("action permissions", () => {
  it("auditor is strictly read-only", () => {
    expect(isReadOnly("auditor")).toBe(true);
    for (const a of Object.keys(ACTIONS) as (keyof typeof ACTIONS)[]) expect(can("auditor", a)).toBe(false);
  });
  it("support agent has no biometric/consent view and cannot approve refunds", () => {
    expect(can("support_agent", "consent:view")).toBe(false);
    expect(can("support_agent", "refund:approve")).toBe(false);
    expect(can("support_agent", "customer:search")).toBe(true);
  });
  it("only customers revoke consent; only super user decides approvals", () => {
    expect(ROLES.filter((r) => can(r, "consent:revoke"))).toEqual(["customer"]);
    expect(ROLES.filter((r) => can(r, "approval:decide"))).toEqual(["super_user"]);
  });
  it("matrix covers every role and mutation paths map to actions", () => {
    expect(permissionMatrix()).toHaveLength(ROLES.length);
    expect(actionForMutation("/v1/refunds/rf_1/approve")).toBe("refund:approve");
    expect(actionForMutation("/v1/approvals/ap_1/deny")).toBe("approval:decide");
    expect(Object.keys(PORTALS)).toHaveLength(4);
  });
});
