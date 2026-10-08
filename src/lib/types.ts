export type Role =
  | "customer"
  | "merchant_owner"
  | "merchant_cashier"
  | "support_agent"
  | "kyc_risk_analyst"
  | "finance_operator"
  | "device_technician"
  | "integration_operator"
  | "super_user"
  | "auditor";

export type PortalId = "customer" | "merchant" | "admin" | "super";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  tenantId: string;
}

export type TxStatus = "pending" | "authorised" | "captured" | "declined" | "refunded";
export type Channel = "face" | "nfc" | "qr" | "card" | "palm" | "fingerprint";

export interface Transaction {
  id: string;
  intentId: string;
  merchantId: string;
  merchantName: string;
  amountMinor: number;
  currency: "ZAR";
  status: TxStatus;
  channel: Channel;
  createdAt: string;
}

export interface WalletMethod {
  id: string;
  type: "card" | "bank" | "wallet";
  maskedDisplay: string;
  state: "active" | "frozen" | "pending";
}

export interface Wallet {
  provider: string;
  availableBalanceMinor: number;
  currency: "ZAR";
  methods: WalletMethod[];
  recent: Transaction[];
}

export interface Kpi {
  label: string;
  value: string;
  delta?: string;
  /** true when delta is an improvement */
  good?: boolean;
}

export interface SeriesPoint {
  label: string;
  value: number;
}

export interface Split {
  label: string;
  pct: number;
}

export interface AdminOverview {
  period: string;
  kpis: Kpi[];
  trend: SeriesPoint[];
  byChannel: Split[];
  secondary: Kpi[];
  incidents: { id: string; title: string; severity: "low" | "medium" | "high"; age: string; owner: string }[];
}

export interface MerchantDashboard {
  merchantName: string;
  period: string;
  kpis: Kpi[];
  salesTrend: SeriesPoint[];
  paymentTypes: Split[];
  refunds: { count: number; valueMinor: number; pendingApproval: number };
  settlement: { status: string; nextPayoutDate: string; netMinor: number; heldMinor: number };
  fleet: { total: number; online: number; offline: number; updating: number; healthPct: number };
}

export interface Refund {
  id: string;
  transactionId: string;
  merchantId: string;
  amountMinor: number;
  reason: string;
  status: "pending_approval" | "approved" | "rejected" | "completed";
  makerId: string;
  makerName: string;
  makerRole: Role;
  checkerId?: string;
  checkerName?: string;
  createdAt: string;
}

export interface Settlement {
  id: string;
  provider: string;
  period: string;
  grossMinor: number;
  feeMinor: number;
  netMinor: number;
  reconciliation: "matched" | "exception" | "pending" | "stale";
  payoutDate: string;
  merchantName?: string;
}

export interface Device {
  id: string;
  model: string;
  serial: string;
  merchantName: string;
  assignment: string;
  connection: "online" | "offline" | "updating";
  firmware: string;
  health: number;
  lastSeen: string;
}

export interface Consent {
  id: string;
  modality: "face" | "palm" | "fingerprint" | "retina";
  purpose: string;
  legalBasis: string;
  version: string;
  grantedAt: string;
  revokedAt?: string;
}

export interface Customer {
  id: string;
  /** Always masked in staff portals. */
  name: string;
  email: string;
  phone: string;
  idNumber: string;
  verification: "verified" | "pending" | "review";
  consentActive: boolean;
  openCases: number;
  createdAt: string;
}

export interface Merchant {
  id: string;
  name: string;
  legalEntity: string;
  state: "active" | "onboarding" | "suspended";
  rates: string;
  rails: string;
  terminals: number;
  settlementProfile: string;
  contact: string;
  volumeMinor: number;
}

export interface Approval {
  id: string;
  kind: "role_grant" | "key_rotation" | "limit_change" | "feature_flag" | "refund" | "break_glass";
  summary: string;
  requestedBy: string;
  requesterId: string;
  justification: string;
  expiresAt: string;
  status: "pending" | "approved" | "denied";
  approvals: string[];
  required: number;
}

export interface AuditEvent {
  id: string;
  at: string;
  actor: string;
  action: string;
  tenant: string;
  object: string;
  hash: string;
}

export interface Integration {
  id: string;
  name: string;
  env: "sandbox" | "production";
  keyPrefix: string;
  lastRotated: string;
  webhookUrl: string;
  deliveryRatePct: number;
  errors24h: number;
  state: "healthy" | "degraded" | "frozen";
}
