import "server-only";
import type {
  AdminOverview, Approval, AuditEvent, Consent, Customer, Device, Integration, Merchant, MerchantDashboard,
  Refund, Settlement, Transaction, Wallet,
} from "./types";
import type { Session } from "./session";
import * as fx from "./fixtures";
import { maskEmail, maskId, maskName, maskPhone } from "./mask";

/** Base URL of facepay-core. When unset, built-in fixtures (same shapes) are used. */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
export const usingApi = API_URL.length > 0;

export async function apiFetch(path: string, session: Session | null, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (session?.apiToken) headers.set("Authorization", `Bearer ${session.apiToken}`);
  return fetch(`${API_URL}${path}`, { ...init, headers, cache: "no-store", signal: AbortSignal.timeout(8000) });
}

/** GET from the API when configured and the payload passes `guard`; otherwise fall back to fixtures. */
async function load<T>(path: string, session: Session, guard: (v: unknown) => v is T, fallback: () => T): Promise<T> {
  if (!usingApi) return fallback();
  try {
    const res = await apiFetch(path, session);
    if (res.ok) {
      const json: unknown = await res.json();
      if (guard(json)) return json;
    }
  } catch {
    /* network error: fall through to fixtures so the portal stays usable */
  }
  return fallback();
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const hasItems = <T,>(v: unknown): v is { items: T[] } => isObj(v) && Array.isArray(v.items);

export const getWallet = (s: Session) =>
  load<Wallet>("/v1/wallet", s, (v): v is Wallet => isObj(v) && typeof v.availableBalanceMinor === "number" && Array.isArray(v.methods), fx.wallet);

export async function getTransactions(s: Session, scope: "customer" | "merchant" | "platform"): Promise<Transaction[]> {
  const fallback = () => (scope === "customer" ? fx.customerTransactions() : scope === "merchant" ? fx.merchantTransactions() : fx.platformTransactions());
  const r = await load<{ items: Transaction[] }>("/v1/transactions?limit=100", s, hasItems<Transaction>, () => ({ items: fallback() }));
  return r.items;
}

export const getAdminOverview = (s: Session) =>
  load<AdminOverview>("/v1/admin/overview", s, (v): v is AdminOverview => isObj(v) && Array.isArray(v.kpis) && Array.isArray(v.trend) && Array.isArray(v.byChannel), fx.adminOverview);

export const getMerchantDashboard = (s: Session) =>
  load<MerchantDashboard>("/v1/merchant/dashboard", s, (v): v is MerchantDashboard => isObj(v) && Array.isArray(v.kpis) && Array.isArray(v.salesTrend) && Array.isArray(v.paymentTypes), fx.merchantDashboard);

export async function getRefunds(s: Session, scope: "merchant" | "platform"): Promise<Refund[]> {
  const r = await load<{ items: Refund[] }>("/v1/refunds", s, hasItems<Refund>, () => ({ items: scope === "merchant" ? fx.refunds() : fx.platformRefunds() }));
  return r.items;
}

export async function getSettlements(s: Session, scope: "merchant" | "platform"): Promise<Settlement[]> {
  const r = await load<{ items: Settlement[] }>("/v1/settlements", s, hasItems<Settlement>, () => ({ items: scope === "merchant" ? fx.settlements() : fx.platformSettlements() }));
  return r.items;
}

export async function getDevices(s: Session, scope: "merchant" | "platform"): Promise<Device[]> {
  const r = await load<{ items: Device[] }>("/v1/devices", s, hasItems<Device>, () => ({ items: scope === "merchant" ? fx.devices() : fx.platformDevices() }));
  return r.items;
}

export async function getMerchants(s: Session): Promise<Merchant[]> {
  const r = await load<{ items: Merchant[] }>("/v1/merchants", s, hasItems<Merchant>, () => ({ items: fx.merchants() }));
  return r.items;
}

/** Customers are always masked, whatever the source returned (defence in depth). */
export async function getCustomers(s: Session): Promise<Customer[]> {
  const r = await load<{ items: Customer[] }>("/v1/customers", s, hasItems<Customer>, () => ({ items: fx.customers() }));
  return r.items.map((c) => ({ ...c, name: maskName(c.name), email: c.email.includes("*") ? c.email : maskEmail(c.email), phone: c.phone.includes("*") ? c.phone : maskPhone(c.phone), idNumber: c.idNumber.includes("*") ? c.idNumber : maskId(c.idNumber) }));
}

export async function getConsents(s: Session): Promise<Consent[]> {
  const r = await load<{ items: Consent[] }>("/v1/consents", s, hasItems<Consent>, () => ({ items: fx.consents() }));
  return r.items;
}

export async function getApprovals(s: Session): Promise<Approval[]> {
  const r = await load<{ items: Approval[] }>("/v1/approvals", s, hasItems<Approval>, () => ({ items: fx.approvals() }));
  return r.items;
}

export async function getAuditEvents(s: Session): Promise<AuditEvent[]> {
  const r = await load<{ items: AuditEvent[] }>("/v1/audit-events", s, hasItems<AuditEvent>, () => ({ items: fx.auditEvents() }));
  return r.items;
}

export async function getIntegrations(s: Session): Promise<Integration[]> {
  const r = await load<{ items: Integration[] }>("/v1/integrations", s, hasItems<Integration>, () => ({ items: fx.integrations() }));
  return r.items;
}
