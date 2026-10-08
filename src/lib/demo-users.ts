import type { Role, SessionUser } from "./types";

export const DEMO_PASSWORD = "facepay-demo";

export interface DemoUser extends SessionUser {
  blurb: string;
}

export const DEMO_USERS: DemoUser[] = [
  { id: "u_thabo", name: "Thabo Mokoena", email: "thabo@facepay.demo", role: "customer", tenantId: "t_cust_thabo", blurb: "Customer portal: My Money, cards, consent" },
  { id: "u_owner", name: "Aisha Khan", email: "owner@abcstore.demo", role: "merchant_owner", tenantId: "m_abc", blurb: "Merchant owner, ABC Store: full merchant portal" },
  { id: "u_cashier", name: "Sipho Dlamini", email: "cashier@abcstore.demo", role: "merchant_cashier", tenantId: "m_abc", blurb: "Merchant cashier: limited refunds, no settlements" },
  { id: "u_ops", name: "Lerato Nkosi", email: "ops@facepay.demo", role: "support_agent", tenantId: "t_facepay", blurb: "Support / ops agent: masked data, never biometrics" },
  { id: "u_super", name: "Pule Phafane", email: "super@facepay.demo", role: "super_user", tenantId: "t_facepay", blurb: "Super user: console, dual approval, break-glass" },
  { id: "u_auditor", name: "Naledi Zulu", email: "auditor@facepay.demo", role: "auditor", tenantId: "t_facepay", blurb: "Auditor: read-only, immutable logs" },
];

export function findDemoUser(email: string, password: string): SessionUser | null {
  if (password !== DEMO_PASSWORD) return null;
  const u = DEMO_USERS.find((d) => d.email === email.trim().toLowerCase());
  if (!u) return null;
  return { id: u.id, name: u.name, email: u.email, role: u.role, tenantId: u.tenantId };
}

export function roleOf(email: string): Role | undefined {
  return DEMO_USERS.find((d) => d.email === email)?.role;
}
