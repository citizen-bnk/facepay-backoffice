import type { PortalId, Role } from "./types";

export const ROLES: Role[] = [
  "customer",
  "merchant_owner",
  "merchant_cashier",
  "support_agent",
  "kyc_risk_analyst",
  "finance_operator",
  "device_technician",
  "integration_operator",
  "super_user",
  "auditor",
];

export const ROLE_LABEL: Record<Role, string> = {
  customer: "Customer",
  merchant_owner: "Merchant owner",
  merchant_cashier: "Merchant cashier",
  support_agent: "Support agent",
  kyc_risk_analyst: "KYC / Risk analyst",
  finance_operator: "Finance operator",
  device_technician: "Device technician",
  integration_operator: "Integration operator",
  super_user: "Super user",
  auditor: "Auditor (read only)",
};

const STAFF: Role[] = [
  "support_agent",
  "kyc_risk_analyst",
  "finance_operator",
  "device_technician",
  "integration_operator",
  "super_user",
  "auditor",
];

export interface NavItem {
  slug: string; // "" = overview
  label: string;
  icon: string;
  roles: Role[];
}

export interface PortalDef {
  id: PortalId;
  title: string;
  subtitle: string;
  nav: NavItem[];
}

const n = (slug: string, label: string, icon: string, roles: Role[]): NavItem => ({ slug, label, icon, roles });

export const PORTALS: Record<PortalId, PortalDef> = {
  customer: {
    id: "customer",
    title: "Customer Portal",
    subtitle: "My Money",
    nav: [
      n("", "Overview", "home", ["customer"]),
      n("my-money", "My Money", "wallet", ["customer"]),
      n("linked", "Linked Accounts & Cards", "card", ["customer"]),
      n("payments", "Payments", "list", ["customer"]),
      n("transfers", "Transfers", "swap", ["customer"]),
      n("statements", "Statements", "file", ["customer"]),
      n("disputes", "Disputes", "alert", ["customer"]),
      n("consent", "Biometric Consent", "shield", ["customer"]),
      n("settings", "Settings", "settings", ["customer"]),
      n("help", "Help", "help", ["customer"]),
    ],
  },
  merchant: {
    id: "merchant",
    title: "Merchant Portal",
    subtitle: "Merchant Portal",
    nav: [
      n("", "Dashboard", "home", ["merchant_owner", "merchant_cashier"]),
      n("transactions", "Transactions", "list", ["merchant_owner", "merchant_cashier"]),
      n("refunds", "Refunds", "undo", ["merchant_owner", "merchant_cashier"]),
      n("settlements", "Settlements", "bank", ["merchant_owner"]),
      n("customers", "Customers", "users", ["merchant_owner"]),
      n("terminals", "Terminals", "device", ["merchant_owner"]),
      n("payment-links", "Payment Links", "link", ["merchant_owner", "merchant_cashier"]),
      n("integrations", "Integrations", "plug", ["merchant_owner"]),
      n("team", "Team", "team", ["merchant_owner"]),
      n("reports", "Reports", "chart", ["merchant_owner"]),
      n("support", "Support", "help", ["merchant_owner", "merchant_cashier"]),
    ],
  },
  admin: {
    id: "admin",
    title: "Internal Operations",
    subtitle: "Admin Console",
    nav: [
      n("", "Overview", "home", STAFF),
      n("customers", "Customers", "users", ["support_agent", "kyc_risk_analyst", "super_user"]),
      n("merchants", "Merchants", "store", ["support_agent", "kyc_risk_analyst", "finance_operator", "super_user", "auditor"]),
      n("payments", "Payments", "list", ["support_agent", "kyc_risk_analyst", "finance_operator", "super_user", "auditor"]),
      n("refunds", "Refunds & Disputes", "undo", ["support_agent", "kyc_risk_analyst", "finance_operator", "super_user", "auditor"]),
      n("settlements", "Settlements", "bank", ["support_agent", "finance_operator", "super_user", "auditor"]),
      n("reconciliation", "Reconciliation", "scale", ["support_agent", "finance_operator", "super_user", "auditor"]),
      n("devices", "Devices", "device", ["support_agent", "device_technician", "super_user", "auditor"]),
      n("integrations", "Integrations", "plug", ["support_agent", "integration_operator", "super_user", "auditor"]),
      n("risk", "Risk & Compliance", "shield", ["kyc_risk_analyst", "super_user", "auditor"]),
      n("support", "Support", "help", ["support_agent", "super_user"]),
      n("reports", "Reports", "chart", ["support_agent", "kyc_risk_analyst", "finance_operator", "super_user", "auditor"]),
      n("staff", "Staff & Access", "team", ["super_user", "auditor"]),
      n("settings", "System Settings", "settings", ["super_user"]),
      n("audit-log", "Audit Log", "log", ["kyc_risk_analyst", "super_user", "auditor"]),
    ],
  },
  super: {
    id: "super",
    title: "Super-user Console",
    subtitle: "Super Admin",
    nav: [
      n("", "Overview", "home", ["super_user"]),
      n("tenants", "Organisations / Tenants", "store", ["super_user"]),
      n("roles", "Roles", "team", ["super_user"]),
      n("policy-engine", "Policy Engine", "policy", ["super_user"]),
      n("limits-rules", "Limits & Rules", "scale", ["super_user"]),
      n("partner-config", "Partner Config", "plug", ["super_user"]),
      n("feature-flags", "Feature Flags", "flag", ["super_user"]),
      n("monitoring", "Platform Monitoring", "pulse", ["super_user"]),
      n("key-rotation", "Key Rotation Requests", "key", ["super_user"]),
      n("approvals", "Approvals", "check", ["super_user"]),
      n("audit", "Audit & Incident Response", "log", ["super_user", "auditor"]),
    ],
  },
};

export const PORTAL_IDS = Object.keys(PORTALS) as PortalId[];

export function isPortalId(v: string): v is PortalId {
  return (PORTAL_IDS as string[]).includes(v);
}

export function isRole(v: unknown): v is Role {
  return typeof v === "string" && (ROLES as string[]).includes(v);
}

/** Navigation visible to a role inside one portal. */
export function navFor(role: Role, portal: PortalId): NavItem[] {
  return PORTALS[portal].nav.filter((i) => i.roles.includes(role));
}

export function portalsFor(role: Role): PortalId[] {
  return PORTAL_IDS.filter((p) => navFor(role, p).length > 0);
}

/** Landing portal after login. */
export function homePortal(role: Role): PortalId {
  if (role === "customer") return "customer";
  if (role === "merchant_owner" || role === "merchant_cashier") return "merchant";
  if (role === "super_user") return "super";
  return "admin";
}

export function homePath(role: Role): string {
  const p = homePortal(role);
  const first = navFor(role, p)[0];
  return `/${p}${first && first.slug ? "/" + first.slug : ""}`;
}

/** Route-level RBAC used by middleware and the UI. */
export function canAccessPath(role: Role, pathname: string): boolean {
  const parts = pathname.split("/").filter(Boolean);
  const portal = parts[0];
  if (!portal || !isPortalId(portal)) return true;
  const slug = parts[1] ?? "";
  const nav = PORTALS[portal].nav;
  const item = nav.find((i) => i.slug === slug);
  if (!item) return navFor(role, portal).length > 0;
  return item.roles.includes(role);
}

export type Action =
  | "refund:create"
  | "refund:approve"
  | "dispute:update"
  | "consent:revoke"
  | "consent:view"
  | "customer:search"
  | "device:manage"
  | "device:enrol"
  | "integration:manage"
  | "key:request"
  | "key:approve"
  | "approval:decide"
  | "team:manage"
  | "settlement:export"
  | "settings:write"
  | "flags:write"
  | "breakglass:activate"
  | "audit:read"
  | "case:update"
  | "transfer:create"
  | "paylink:create"
  | "role:grant";

export const ACTIONS: Record<Action, Role[]> = {
  "refund:create": ["merchant_owner", "merchant_cashier"],
  "refund:approve": ["merchant_owner", "finance_operator", "super_user"],
  "dispute:update": ["support_agent", "kyc_risk_analyst", "finance_operator", "super_user"],
  "consent:revoke": ["customer"],
  "consent:view": ["customer", "kyc_risk_analyst"],
  "customer:search": ["support_agent", "kyc_risk_analyst", "super_user"],
  "device:manage": ["device_technician", "super_user"],
  "device:enrol": ["device_technician", "merchant_owner"],
  "integration:manage": ["integration_operator", "super_user"],
  "key:request": ["integration_operator", "merchant_owner", "super_user"],
  "key:approve": ["super_user"],
  "approval:decide": ["super_user"],
  "team:manage": ["merchant_owner"],
  "settlement:export": ["merchant_owner", "finance_operator", "super_user", "auditor"],
  "settings:write": ["super_user"],
  "flags:write": ["super_user"],
  "breakglass:activate": ["super_user"],
  "audit:read": ["kyc_risk_analyst", "super_user", "auditor"],
  "case:update": ["support_agent", "super_user"],
  "transfer:create": ["customer"],
  "paylink:create": ["merchant_owner", "merchant_cashier"],
  "role:grant": ["super_user"],
};

/** Read-only roles can never mutate, regardless of the matrix. */
export function isReadOnly(role: Role): boolean {
  return role === "auditor";
}

export function can(role: Role, action: Action): boolean {
  if (isReadOnly(role)) return false;
  return ACTIONS[action].includes(role);
}

/** Roles whose screens must only ever show masked personal data. */
export function seesMaskedData(role: Role): boolean {
  return role !== "customer";
}

/** Raw biometric templates/media are never available to any role; metadata only for some. */
export function canSeeBiometricMetadata(role: Role): boolean {
  return role === "customer" || role === "kyc_risk_analyst";
}

/** Full permission matrix (for the Roles screen and tests). */
export function permissionMatrix(): { role: Role; portals: PortalId[]; actions: Action[] }[] {
  return ROLES.map((role) => ({
    role,
    portals: portalsFor(role),
    actions: (Object.keys(ACTIONS) as Action[]).filter((a) => can(role, a)),
  }));
}

/** Mutating API paths the proxy will forward, with the action required. */
export function actionForMutation(path: string): Action | null {
  if (/^\/v1\/refunds\/[^/]+\/(approve|reject)$/.test(path)) return "refund:approve";
  if (path === "/v1/refunds") return "refund:create";
  if (/^\/v1\/consents\/[^/]+\/revoke$/.test(path)) return "consent:revoke";
  if (/^\/v1\/approvals\/[^/]+\/(approve|deny)$/.test(path)) return "approval:decide";
  if (path === "/v1/devices/enrol") return "device:enrol";
  if (path === "/v1/webhooks/subscriptions") return "integration:manage";
  if (path.startsWith("/v1/transfers")) return "transfer:create";
  if (path.startsWith("/v1/payment-links")) return "paylink:create";
  if (path.startsWith("/v1/keys")) return "key:request";
  if (path.startsWith("/v1/breakglass")) return "breakglass:activate";
  if (path.startsWith("/v1/flags")) return "flags:write";
  if (path.startsWith("/v1/cases") || path.startsWith("/v1/disputes")) return null;
  return null;
}
