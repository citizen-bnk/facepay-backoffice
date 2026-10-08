import type {
  AdminOverview, Approval, AuditEvent, Channel, Consent, Customer, Device, Integration, Merchant,
  MerchantDashboard, Refund, Settlement, Transaction, TxStatus, Wallet,
} from "./types";
import { maskEmail, maskId, maskName, maskPhone } from "./mask";

/** Deterministic pseudo-random so server renders are stable. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const pick = <T,>(r: () => number, arr: readonly T[]): T => arr[Math.floor(r() * arr.length)];

/** ISO timestamp in SAST (+02:00), `daysAgo` before today, at hh:mm. */
export function sast(daysAgo: number, hhmm: string, now: Date = new Date()): string {
  const d = new Date(now.getTime() - daysAgo * 86_400_000 + 2 * 3_600_000);
  return `${d.toISOString().slice(0, 10)}T${hhmm}:00+02:00`;
}

const CHANNELS: Channel[] = ["face", "face", "face", "nfc", "nfc", "qr", "card", "palm", "fingerprint"];
const STATUSES: TxStatus[] = ["captured", "captured", "captured", "captured", "authorised", "pending", "declined", "refunded"];

const MERCHANTS = [
  { id: "m_abc", name: "ABC Store" },
  { id: "m_karoo", name: "Karoo Fuel Stop" },
  { id: "m_tmc", name: "Table Mountain Cafe" },
  { id: "m_ctp", name: "Cape Town Pharmacy" },
  { id: "m_jtc", name: "Joburg Transit Co" },
  { id: "m_dbn", name: "Durban Books" },
  { id: "m_spz", name: "Soweto Spaza Hub" },
  { id: "m_pth", name: "Pretoria Hardware" },
];

function genTx(n: number, seed: number, merchants: { id: string; name: string }[], idPrefix: string): Transaction[] {
  const r = rng(seed);
  return Array.from({ length: n }, (_, i) => {
    const m = pick(r, merchants);
    const day = Math.floor(r() * 28);
    const hh = String(7 + Math.floor(r() * 14)).padStart(2, "0");
    const mm = String(Math.floor(r() * 60)).padStart(2, "0");
    return {
      id: `${idPrefix}_${String(1000 + i)}`,
      intentId: `pi_${(seed * 31 + i * 7919).toString(36).slice(0, 8)}`,
      merchantId: m.id,
      merchantName: m.name,
      amountMinor: Math.round((20 + r() * 780) * 100),
      currency: "ZAR" as const,
      status: pick(r, STATUSES),
      channel: pick(r, CHANNELS),
      createdAt: sast(day, `${hh}:${mm}`),
    };
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export const merchantTransactions = (): Transaction[] => genTx(46, 11, [MERCHANTS[0]], "txn_abc");
export const platformTransactions = (): Transaction[] => genTx(70, 29, MERCHANTS, "txn");

export function customerRecent(): Transaction[] {
  const mk = (id: string, name: string, minor: number, d: number, t: string, ch: Channel): Transaction => ({
    id, intentId: `pi_${id.slice(-4)}x`, merchantId: `m_${id}`, merchantName: name, amountMinor: minor,
    currency: "ZAR", status: "captured", channel: ch, createdAt: sast(d, t),
  });
  return [
    mk("txn_c1", "Pick n Pay", 25000, 0, "14:32", "face"),
    mk("txn_c2", "Uber", 12000, 0, "14:10", "qr"),
    mk("txn_c3", "BP Fuel", 80000, 1, "18:45", "nfc"),
    mk("txn_c4", "Checkers", 34000, 1, "12:20", "face"),
  ];
}

export function customerTransactions(): Transaction[] {
  const extra = genTx(16, 5, [
    { id: "m_a", name: "Woolworths Food" }, { id: "m_b", name: "Engen Quickshop" },
    { id: "m_c", name: "Vida e Caffe" }, { id: "m_d", name: "Clicks" }, { id: "m_e", name: "Gautrain" },
  ], "txn_cx").map((t, i) => ({ ...t, createdAt: sast(2 + i * 1.7, "10:15") }));
  return [...customerRecent(), ...extra];
}

export const wallet = (): Wallet => ({
  provider: "Sandbox Bank Partner",
  availableBalanceMinor: 1_245_000,
  currency: "ZAR",
  methods: [
    { id: "pm_1", type: "card", maskedDisplay: "FacePay Virtual Card VISA •••• 1234", state: "active" },
    { id: "pm_2", type: "bank", maskedDisplay: "Cheque account •••• 7781", state: "active" },
    { id: "pm_3", type: "wallet", maskedDisplay: "Provider wallet W-••••42", state: "active" },
    { id: "pm_4", type: "card", maskedDisplay: "Debit card MASTERCARD •••• 0098", state: "frozen" },
  ],
  recent: customerRecent(),
});

const days = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
const augLabel = (d: number) => `${d} Aug`;

const merchantVol = [6, 12, 21, 16, 12, 14, 19, 14, 11, 16, 20, 21, 25, 22, 18, 25, 19, 15, 22, 24, 20, 17, 21, 24, 22, 20, 21, 27, 26, 29, 23].map((v) => v * 1000);

export const merchantDashboard = (): MerchantDashboard => ({
  merchantName: "ABC Store",
  period: "1-31 Aug 2026",
  kpis: [
    { label: "Total Transactions", value: "R 245,430", delta: "12%", good: true },
    { label: "Total Customers", value: "1,428", delta: "8%", good: true },
    { label: "Average Transaction", value: "R 172", delta: "5%", good: true },
    { label: "Active Devices", value: "12", delta: "3%", good: true },
  ],
  salesTrend: days(31).map((d) => ({ label: augLabel(d), value: merchantVol[d - 1] })),
  paymentTypes: [
    { label: "Face Pay", pct: 48 }, { label: "NFC / Tap", pct: 22 }, { label: "QR Code", pct: 15 },
    { label: "Card", pct: 10 }, { label: "Other", pct: 5 },
  ],
  refunds: { count: 14, valueMinor: 318_600, pendingApproval: 2 },
  settlement: { status: "On schedule", nextPayoutDate: "2026-09-03", netMinor: 23_664_050, heldMinor: 0 },
  fleet: { total: 14, online: 12, offline: 1, updating: 1, healthPct: 96 },
});

const adminTrend = [1.0, 1.6, 2.2, 2.7, 2.5, 3.1, 2.8, 2.6, 3.4, 3.7, 3.5, 3.9, 4.1, 4.4, 3.8, 3.2, 3.9, 4.2, 4.1, 4.5, 5.0, 4.3, 3.9, 4.4, 4.8, 4.7, 4.9, 5.1, 5.6, 5.3, 5.4];

const CHANNEL_SPLIT = [
  { label: "Face Pay", pct: 48 }, { label: "NFC / Tap", pct: 22 }, { label: "QR Code", pct: 15 },
  { label: "Card", pct: 10 }, { label: "Other", pct: 5 },
];

export const adminOverview = (): AdminOverview => ({
  period: "1 Aug - 31 Aug 2026",
  kpis: [
    { label: "Total Users", value: "245,680", delta: "14%", good: true },
    { label: "Active Merchants", value: "3,428", delta: "11%", good: true },
    { label: "Total Transactions", value: "R 48,320,450", delta: "18%", good: true },
    { label: "Success Rate", value: "99.6%", delta: "0.2%", good: true },
  ],
  trend: days(31).map((d) => ({ label: augLabel(d), value: Math.round(adminTrend[d - 1] * 1_000_000) })),
  byChannel: CHANNEL_SPLIT,
  secondary: [
    { label: "Payment count", value: "281,310", delta: "9%", good: true },
    { label: "Declines", value: "0.4%", delta: "0.1%", good: true },
    { label: "Pending disputes", value: "37", delta: "6", good: false },
    { label: "Settlement exceptions", value: "5", delta: "2", good: false },
    { label: "Active devices", value: "9,214", delta: "4%", good: true },
    { label: "SLA alerts", value: "3", delta: "1", good: false },
  ],
  incidents: [
    { id: "INC-2041", title: "Provider connector latency above p95 target", severity: "medium", age: "42 min", owner: "Integration ops" },
    { id: "INC-2040", title: "Duplicate capture detected on settlement batch SB-0831", severity: "high", age: "3 h", owner: "Finance ops" },
    { id: "INC-2038", title: "Firmware rollout 4.2.1 paused on 12 devices", severity: "low", age: "1 d", owner: "Device tech" },
  ],
});

export const MERCHANT_REFUND_TXNS = merchantTransactions().filter((t) => t.status === "captured").slice(0, 8);

export const refunds = (): Refund[] => [
  { id: "rf_2001", transactionId: "txn_abc_1004", merchantId: "m_abc", amountMinor: 18_000, reason: "Customer returned item", status: "completed", makerId: "u_cashier", makerName: "Sipho Dlamini", makerRole: "merchant_cashier", createdAt: sast(3, "11:20") },
  { id: "rf_2002", transactionId: "txn_abc_1011", merchantId: "m_abc", amountMinor: 64_000, reason: "Duplicate charge reported", status: "pending_approval", makerId: "u_cashier", makerName: "Sipho Dlamini", makerRole: "merchant_cashier", createdAt: sast(0, "09:42") },
  { id: "rf_2003", transactionId: "txn_abc_1019", merchantId: "m_abc", amountMinor: 245_000, reason: "Order cancelled, high value", status: "pending_approval", makerId: "u_owner", makerName: "Aisha Khan", makerRole: "merchant_owner", createdAt: sast(1, "15:05") },
  { id: "rf_2004", transactionId: "txn_abc_1002", merchantId: "m_abc", amountMinor: 9_500, reason: "Wrong amount keyed", status: "completed", makerId: "u_owner", makerName: "Aisha Khan", makerRole: "merchant_owner", createdAt: sast(6, "13:11") },
  { id: "rf_2005", transactionId: "txn_abc_1027", merchantId: "m_abc", amountMinor: 120_000, reason: "Service not delivered", status: "rejected", makerId: "u_cashier", makerName: "Sipho Dlamini", makerRole: "merchant_cashier", checkerId: "u_owner", checkerName: "Aisha Khan", createdAt: sast(8, "10:30") },
];

export const platformRefunds = (): Refund[] => [
  ...refunds().map((r) => r),
  { id: "rf_3001", transactionId: "txn_1012", merchantId: "m_karoo", amountMinor: 780_000, reason: "Fuel pump fault, bulk refund", status: "pending_approval", makerId: "u_m2", makerName: "Karoo Owner", makerRole: "merchant_owner", createdAt: sast(0, "08:15") },
];

export const disputes = () => [
  { id: "dp_501", transactionId: "txn_c3", customer: "T. M.", reason: "Amount differs from receipt", state: "under review", dueBy: sast(-3, "17:00"), owner: "Support" },
  { id: "dp_502", transactionId: "txn_1031", customer: "N. D.", reason: "Not recognised", state: "evidence requested", dueBy: sast(-5, "17:00"), owner: "KYC / Risk" },
  { id: "dp_503", transactionId: "txn_1044", customer: "S. K.", reason: "Duplicate capture", state: "open", dueBy: sast(-2, "17:00"), owner: "Finance" },
  { id: "dp_504", transactionId: "txn_1008", customer: "L. M.", reason: "Goods not received", state: "resolved", dueBy: sast(4, "17:00"), owner: "Support" },
];

export const customerDisputes = () => [
  { id: "dp_501", transactionId: "txn_c3", reason: "Amount differs from receipt", state: "under review", opened: sast(2, "09:00") },
  { id: "dp_498", transactionId: "txn_cx_1003", reason: "Duplicate charge", state: "resolved", opened: sast(19, "16:12") },
];

export const settlements = (): Settlement[] => [
  { id: "SB-0831", provider: "Sandbox Bank Partner", period: "25-31 Aug 2026", grossMinor: 2_464_000, feeMinor: 49_280, netMinor: 2_414_720, reconciliation: "exception", payoutDate: "2026-09-03", merchantName: "ABC Store" },
  { id: "SB-0824", provider: "Sandbox Bank Partner", period: "18-24 Aug 2026", grossMinor: 2_211_300, feeMinor: 44_226, netMinor: 2_167_074, reconciliation: "matched", payoutDate: "2026-08-27", merchantName: "ABC Store" },
  { id: "SB-0817", provider: "Sandbox Bank Partner", period: "11-17 Aug 2026", grossMinor: 2_598_450, feeMinor: 51_969, netMinor: 2_546_481, reconciliation: "matched", payoutDate: "2026-08-20", merchantName: "ABC Store" },
  { id: "SB-0810", provider: "Sandbox Bank Partner", period: "4-10 Aug 2026", grossMinor: 2_307_800, feeMinor: 46_156, netMinor: 2_261_644, reconciliation: "matched", payoutDate: "2026-08-13", merchantName: "ABC Store" },
  { id: "SB-0803", provider: "Sandbox Bank Partner", period: "28 Jul-3 Aug 2026", grossMinor: 1_986_000, feeMinor: 39_720, netMinor: 1_946_280, reconciliation: "stale", payoutDate: "2026-08-06", merchantName: "ABC Store" },
];

export const platformSettlements = (): Settlement[] => [
  ...settlements(),
  { id: "SB-K831", provider: "Sandbox Bank Partner", period: "25-31 Aug 2026", grossMinor: 8_912_400, feeMinor: 178_248, netMinor: 8_734_152, reconciliation: "matched", payoutDate: "2026-09-03", merchantName: "Karoo Fuel Stop" },
  { id: "SB-T831", provider: "Card Acquirer (sandbox)", period: "25-31 Aug 2026", grossMinor: 1_120_900, feeMinor: 33_627, netMinor: 1_087_273, reconciliation: "pending", payoutDate: "2026-09-04", merchantName: "Table Mountain Cafe" },
];

export const reconciliationSummary = () => ({
  kpis: [
    { label: "Intents reconciled", value: "99.2%" },
    { label: "Duplicates", value: "3" },
    { label: "Gaps", value: "4" },
    { label: "Currency mismatches", value: "2" },
    { label: "Stale batches", value: "1" },
  ],
  exceptions: [
    { id: "rx_901", type: "duplicate", ref: "txn_1044", batch: "SB-0831", expected: "R 412.00 x1", actual: "R 412.00 x2", delta: "R 412.00", age: "3 h", state: "open" },
    { id: "rx_902", type: "gap", ref: "pi_9f3a1c2d", batch: "SB-0831", expected: "Settlement line", actual: "Missing", delta: "R 1,250.00", age: "6 h", state: "investigating" },
    { id: "rx_903", type: "currency mismatch", ref: "txn_1021", batch: "SB-T831", expected: "ZAR 780.00", actual: "USD 780.00", delta: "Currency", age: "1 d", state: "open" },
    { id: "rx_904", type: "amount mismatch", ref: "txn_1017", batch: "SB-0824", expected: "R 245.50", actual: "R 254.50", delta: "R 9.00", age: "2 d", state: "resolved" },
    { id: "rx_905", type: "stale batch", ref: "SB-0803", batch: "SB-0803", expected: "Settled by 06 Aug", actual: "No bank statement line", delta: "R 19,462.80", age: "8 d", state: "escalated" },
    { id: "rx_906", type: "duplicate", ref: "txn_1052", batch: "SB-K831", expected: "R 89.00 x1", actual: "R 89.00 x2", delta: "R 89.00", age: "1 d", state: "open" },
    { id: "rx_907", type: "gap", ref: "pi_17ce02aa", batch: "SB-K831", expected: "Capture", actual: "Authorised only", delta: "R 340.00", age: "2 d", state: "open" },
    { id: "rx_908", type: "currency mismatch", ref: "txn_1060", batch: "SB-T831", expected: "ZAR 55.00", actual: "EUR 55.00", delta: "Currency", age: "2 d", state: "investigating" },
    { id: "rx_909", type: "duplicate", ref: "txn_1066", batch: "SB-T831", expected: "R 120.00 x1", actual: "R 120.00 x2", delta: "R 120.00", age: "3 d", state: "resolved" },
    { id: "rx_910", type: "gap", ref: "pi_aa71b00e", batch: "SB-0817", expected: "Settlement line", actual: "Missing", delta: "R 78.00", age: "5 d", state: "resolved" },
  ],
});

export const devices = (): Device[] => {
  const models = ["FacePay POS", "FacePay POS", "Tap Module", "FacePay Handheld", "Kiosk"];
  const rows: Device[] = [];
  const r = rng(77);
  for (let i = 0; i < 14; i++) {
    const conn = i === 6 ? "offline" : i === 9 ? "updating" : "online";
    rows.push({
      id: `dev_${100 + i}`,
      model: models[i % models.length],
      serial: `FP-${2600 + i * 13}-${String(Math.floor(r() * 9000) + 1000)}`,
      merchantName: "ABC Store",
      assignment: ["Till 1", "Till 2", "Till 3", "Kiosk entrance", "Back office", "Mobile 1"][i % 6],
      connection: conn,
      firmware: i === 9 ? "4.2.0 -> 4.2.1" : "4.2.1",
      health: conn === "offline" ? 0 : 88 + Math.floor(r() * 12),
      lastSeen: conn === "offline" ? sast(1, "19:40") : sast(0, "14:2" + (i % 10)),
    });
  }
  return rows;
};

export const platformDevices = (): Device[] => {
  const base = devices();
  const others = ["Karoo Fuel Stop", "Table Mountain Cafe", "Cape Town Pharmacy", "Joburg Transit Co"].flatMap((m, mi) =>
    Array.from({ length: 4 }, (_, i): Device => ({
      id: `dev_${200 + mi * 10 + i}`, model: ["FacePay POS", "Tap Module", "FacePay Handheld", "Kiosk"][i],
      serial: `FP-27${mi}${i}-${3000 + mi * 100 + i}`, merchantName: m, assignment: `Lane ${i + 1}`,
      connection: (mi === 1 && i === 2 ? "offline" : "online") as Device["connection"],
      firmware: mi === 3 ? "4.1.9" : "4.2.1", health: mi === 1 && i === 2 ? 0 : 90 + i, lastSeen: sast(0, "13:5" + i),
    }))
  );
  return [...base, ...others];
};

export const consents = (): Consent[] => [
  { id: "cs_1", modality: "face", purpose: "In-person payment authentication", legalBasis: "Explicit consent (POPIA s.26/27)", version: "v2.1", grantedAt: sast(210, "10:00") },
  { id: "cs_2", modality: "palm", purpose: "In-person payment authentication", legalBasis: "Explicit consent (POPIA s.26/27)", version: "v2.1", grantedAt: sast(96, "16:30") },
  { id: "cs_3", modality: "fingerprint", purpose: "Step-up authentication", legalBasis: "Explicit consent (POPIA s.26/27)", version: "v2.0", grantedAt: sast(300, "09:12"), revokedAt: sast(40, "08:00") },
];

const FIRST = ["Thabo", "Nomsa", "Pieter", "Lindiwe", "Sipho", "Aisha", "Johan", "Zanele", "Kagiso", "Ayanda", "Riaan", "Palesa"];
const LAST = ["Mokoena", "Dube", "van Wyk", "Naidoo", "Khumalo", "Botha", "Mahlangu", "Pillay", "Sithole", "Jacobs"];

export const customers = (): Customer[] => {
  const r = rng(404);
  return Array.from({ length: 24 }, (_, i) => {
    const f = FIRST[i % FIRST.length];
    const l = LAST[(i * 3) % LAST.length];
    const ver = r();
    return {
      id: `cu_${4000 + i}`,
      name: maskName(`${f} ${l}`),
      email: maskEmail(`${f}.${l}@example.test`.toLowerCase().replace(/ /g, "")),
      phone: maskPhone(`+2782${String(1000000 + Math.floor(r() * 8999999))}`),
      idNumber: maskId(String(8001015000000 + Math.floor(r() * 99999999))),
      verification: ver > 0.85 ? "review" : ver > 0.7 ? "pending" : "verified",
      consentActive: r() > 0.18,
      openCases: Math.floor(r() * 3),
      createdAt: sast(Math.floor(r() * 500), "10:00"),
    };
  });
};

export const merchantCustomers = () =>
  customers().slice(0, 12).map((c, i) => ({
    id: c.id, name: c.name, contact: c.email, visits: 3 + ((i * 7) % 28), spentMinor: 120_000 + i * 83_500, lastSeen: sast(i * 2, "12:00"),
  }));

export const merchants = (): Merchant[] =>
  MERCHANTS.map((m, i) => ({
    id: m.id, name: m.name,
    legalEntity: `${m.name} (Pty) Ltd`,
    state: i === 6 ? "onboarding" : i === 7 ? "suspended" : "active",
    rates: i % 2 ? "1.9% + R 0.50" : "1.7% flat",
    rails: ["Face", "NFC", "QR", "Card"].slice(0, 2 + (i % 3)).join(", "),
    terminals: 4 + ((i * 5) % 12),
    settlementProfile: i % 3 === 0 ? "T+2, weekly batch" : "T+1, daily batch",
    contact: maskEmail(`ops@${m.name.toLowerCase().replace(/[^a-z]/g, "")}.example`),
    volumeMinor: 245_430_00 * (8 - i) + i * 1_300_000,
  }));

export const approvals = (): Approval[] => [
  { id: "ap_7001", kind: "role_grant", summary: "Grant Finance operator to L. Nkosi (temporary)", requestedBy: "Lerato Nkosi", requesterId: "u_ops", justification: "Month-end settlement exceptions backlog", expiresAt: sast(-1, "17:00"), status: "pending", approvals: [], required: 2 },
  { id: "ap_7002", kind: "key_rotation", summary: "Rotate production API signing key: Partner connector A", requestedBy: "Integration operator", requesterId: "u_intop", justification: "Scheduled 90-day rotation", expiresAt: sast(-2, "12:00"), status: "pending", approvals: ["Pule Phafane"], required: 2 },
  { id: "ap_7003", kind: "limit_change", summary: "Raise merchant owner direct refund limit R 1,000 to R 1,500 (ABC Store)", requestedBy: "Pule Phafane", requesterId: "u_super", justification: "Merchant request MR-221, risk reviewed", expiresAt: sast(-3, "17:00"), status: "pending", approvals: [], required: 2 },
  { id: "ap_7004", kind: "feature_flag", summary: "Enable palm-scan challenge for 5% of production tenants", requestedBy: "Product", requesterId: "u_prod", justification: "Phase 4 pilot", expiresAt: sast(-4, "17:00"), status: "pending", approvals: [], required: 2 },
  { id: "ap_7005", kind: "break_glass", summary: "Break-glass: read-only DB console, 60 min", requestedBy: "On-call SRE", requesterId: "u_sre", justification: "INC-2040 duplicate capture investigation", expiresAt: sast(0, "23:00"), status: "approved", approvals: ["Pule Phafane", "CISO delegate"], required: 2 },
];

export const keyRotations = (): Approval[] => approvals().filter((a) => a.kind === "key_rotation").concat([
  { id: "ap_7010", kind: "key_rotation", summary: "Rotate sandbox webhook secret: ERP connector", requestedBy: "Integration operator", requesterId: "u_intop", justification: "Contractor offboarded", expiresAt: sast(-1, "09:00"), status: "pending", approvals: [], required: 2 },
  { id: "ap_7011", kind: "key_rotation", summary: "Rotate production vault master wrap key", requestedBy: "Pule Phafane", requesterId: "u_super", justification: "Annual KMS policy", expiresAt: sast(-5, "09:00"), status: "approved", approvals: ["CISO delegate", "Security lead"], required: 2 },
]);

export const auditEvents = (): AuditEvent[] => {
  const acts: [string, string, string][] = [
    ["Pule Phafane", "approval.approve", "ap_7005"], ["Lerato Nkosi", "customer.search (masked)", "cu_4003"],
    ["Aisha Khan", "refund.create", "rf_2003"], ["Sipho Dlamini", "refund.create", "rf_2002"],
    ["Aisha Khan", "refund.reject", "rf_2005"], ["System", "settlement.import", "SB-0831"],
    ["Pule Phafane", "flag.update", "palm_challenge"], ["Integration operator", "key.rotation.request", "ap_7002"],
    ["Thabo Mokoena", "consent.revoke", "cs_3"], ["Naledi Zulu", "audit.export", "audit-2026-08"],
    ["Pule Phafane", "role.grant.request", "ap_7001"], ["System", "device.firmware.rollout", "4.2.1"],
  ];
  return acts.map(([actor, action, object], i) => ({
    id: `ae_${9000 - i}`, at: sast(i * 0.4, `1${i % 10}:${String(10 + i * 4).slice(-2)}`), actor, action,
    tenant: ["t_facepay", "m_abc", "t_cust_thabo"][i % 3], object, hash: `sha256:${(0xa1b2c3 + i * 40503).toString(16)}${(i * 7919 + 99).toString(16)}…`,
  }));
};

export const integrations = (): Integration[] => [
  { id: "int_1", name: "Partner connector A (card acquirer)", env: "production", keyPrefix: "fp_live_7Kq…", lastRotated: "2026-06-12", webhookUrl: "https://hooks.partner-a.example/facepay", deliveryRatePct: 99.7, errors24h: 4, state: "healthy" },
  { id: "int_2", name: "Partner connector A (card acquirer)", env: "sandbox", keyPrefix: "fp_test_9Zd…", lastRotated: "2026-08-02", webhookUrl: "https://sandbox.partner-a.example/facepay", deliveryRatePct: 100, errors24h: 0, state: "healthy" },
  { id: "int_3", name: "Bank settlement importer", env: "production", keyPrefix: "fp_live_2Lm…", lastRotated: "2026-05-30", webhookUrl: "sftp://settle.bank.example/inbound", deliveryRatePct: 97.9, errors24h: 19, state: "degraded" },
  { id: "int_4", name: "ERP sync (ABC Store)", env: "production", keyPrefix: "fp_live_5Tx…", lastRotated: "2026-07-21", webhookUrl: "https://erp.abcstore.example/hooks", deliveryRatePct: 99.1, errors24h: 7, state: "healthy" },
  { id: "int_5", name: "ERP sync (ABC Store)", env: "sandbox", keyPrefix: "fp_test_1Vb…", lastRotated: "2026-07-21", webhookUrl: "https://staging.abcstore.example/hooks", deliveryRatePct: 98.4, errors24h: 2, state: "healthy" },
  { id: "int_6", name: "Risky partner webhook", env: "production", keyPrefix: "fp_live_8Qa…", lastRotated: "2026-03-02", webhookUrl: "https://old.partner-z.example/hook", deliveryRatePct: 71.2, errors24h: 212, state: "frozen" },
];

export const webhookDeliveries = () => [
  { id: "wh_1", event: "payment.captured", target: "erp.abcstore.example", status: "200", attempts: 1, at: sast(0, "14:31") },
  { id: "wh_2", event: "refund.completed", target: "erp.abcstore.example", status: "200", attempts: 1, at: sast(0, "13:02") },
  { id: "wh_3", event: "settlement.ready", target: "hooks.partner-a.example", status: "500", attempts: 4, at: sast(0, "11:48") },
  { id: "wh_4", event: "payment.declined", target: "hooks.partner-a.example", status: "200", attempts: 1, at: sast(0, "10:20") },
  { id: "wh_5", event: "device.offline", target: "erp.abcstore.example", status: "timeout", attempts: 3, at: sast(1, "19:40") },
];

export const teamMembers = () => [
  { id: "u_owner", name: "Aisha Khan", email: "owner@abcstore.demo", role: "Owner", status: "active", lastActive: sast(0, "14:05") },
  { id: "u_cashier", name: "Sipho Dlamini", email: "cashier@abcstore.demo", role: "Cashier", status: "active", lastActive: sast(0, "14:30") },
  { id: "u_t3", name: "Mpho Radebe", email: "mpho@abcstore.demo", role: "Cashier", status: "active", lastActive: sast(1, "17:55") },
  { id: "u_t4", name: "Karen Smit", email: "karen@abcstore.demo", role: "Cashier", status: "invited", lastActive: "" },
];

export const paymentLinks = () => [
  { id: "pl_1", label: "Deposit - catering", amountMinor: 150_000, status: "active", uses: 3, expires: sast(-14, "00:00") },
  { id: "pl_2", label: "Gift card R 500", amountMinor: 50_000, status: "active", uses: 21, expires: sast(-60, "00:00") },
  { id: "pl_3", label: "Invoice INV-0412", amountMinor: 238_900, status: "paid", uses: 1, expires: sast(5, "00:00") },
];

export const tickets = () => [
  { id: "SUP-1042", subject: "Terminal Till 3 shows offline", state: "open", priority: "high", updated: sast(0, "09:10") },
  { id: "SUP-1038", subject: "Settlement SB-0831 exception", state: "waiting on FacePay", priority: "medium", updated: sast(1, "16:00") },
  { id: "SUP-1021", subject: "Add new cashier login", state: "resolved", priority: "low", updated: sast(9, "11:30") },
];

export const supportCases = () => [
  { id: "CASE-7731", customer: "N. D.", subject: "Payment shows pending after 10 minutes", state: "open", priority: "high", paymentStatus: "authorised (awaiting provider confirmation)", updated: sast(0, "10:12") },
  { id: "CASE-7729", customer: "S. K.", subject: "Cannot unlink old card", state: "open", priority: "medium", paymentStatus: "n/a", updated: sast(0, "08:45") },
  { id: "CASE-7722", customer: "L. M.", subject: "Refund not received", state: "waiting provider", priority: "medium", paymentStatus: "refund approved", updated: sast(1, "15:02") },
  { id: "CASE-7710", customer: "A. P.", subject: "Wrong merchant name on receipt", state: "resolved", priority: "low", paymentStatus: "captured", updated: sast(4, "12:00") },
];

export const statements = () => [
  { id: "st_2026_08", period: "August 2026", opening: 1_020_000, closing: 1_245_000, items: 41 },
  { id: "st_2026_07", period: "July 2026", opening: 880_000, closing: 1_020_000, items: 37 },
  { id: "st_2026_06", period: "June 2026", opening: 945_500, closing: 880_000, items: 29 },
  { id: "st_2026_05", period: "May 2026", opening: 1_110_250, closing: 945_500, items: 33 },
];

export const reports = (scope: "merchant" | "admin") =>
  scope === "merchant"
    ? [
        { id: "rp_recon", name: "Daily reconciliation", desc: "Intents, captures, refunds and settlement lines for ABC Store", cadence: "Daily" },
        { id: "rp_sales", name: "Sales & payment types", desc: "Gross, fees, reversals and net by channel", cadence: "Weekly" },
        { id: "rp_refunds", name: "Refunds & chargebacks", desc: "Maker/checker trail for every refund", cadence: "Monthly" },
        { id: "rp_fleet", name: "Terminal fleet health", desc: "Uptime, firmware and connectivity", cadence: "Weekly" },
      ]
    : [
        { id: "rp_susp", name: "Suspicious activity queue", desc: "Open alerts, holds and escalations", cadence: "Daily" },
        { id: "rp_kyc", name: "KYC ageing", desc: "Pending and in-review applications by age", cadence: "Weekly" },
        { id: "rp_mismatch", name: "Reconciliation mismatch exceptions", desc: "Duplicates, gaps, currency and amount mismatches", cadence: "Daily" },
        { id: "rp_disp", name: "Dispute SLA", desc: "Open disputes against SLA target", cadence: "Weekly" },
        { id: "rp_uptime", name: "Device uptime & partner latency", desc: "Fleet uptime and provider p95 latency", cadence: "Weekly" },
      ];

export const riskAlerts = () => [
  { id: "rk_301", kind: "velocity", subject: "cu_4011 (masked)", detail: "9 payments in 4 minutes across 3 merchants", severity: "high", state: "hold placed" },
  { id: "rk_302", kind: "kyc ageing", subject: "cu_4020 (masked)", detail: "Identity review pending 9 days", severity: "medium", state: "open" },
  { id: "rk_303", kind: "liveness failures", subject: "dev_204", detail: "Liveness failure rate 11% (baseline 2%)", severity: "medium", state: "investigating" },
  { id: "rk_304", kind: "consent evidence", subject: "cu_4007 (masked)", detail: "Consent version mismatch v2.0 vs v2.1", severity: "low", state: "open" },
  { id: "rk_305", kind: "merchant risk", subject: "Pretoria Hardware", detail: "Chargeback ratio 1.4%", severity: "high", state: "escalated" },
];

export const staff = () => [
  { id: "u_ops", name: "Lerato Nkosi", role: "Support agent", mfa: "passkey", lastLogin: sast(0, "07:55"), access: "standing", expires: "" },
  { id: "u_super", name: "Pule Phafane", role: "Super user", mfa: "passkey + hardware key", lastLogin: sast(0, "07:30"), access: "standing, break-glass MFA", expires: "" },
  { id: "u_auditor", name: "Naledi Zulu", role: "Auditor (read only)", mfa: "passkey", lastLogin: sast(2, "09:00"), access: "time-limited", expires: sast(-30, "00:00") },
  { id: "u_fin", name: "Dineo Maseko", role: "Finance operator", mfa: "passkey", lastLogin: sast(0, "08:10"), access: "standing", expires: "" },
  { id: "u_kyc", name: "Ruan Pretorius", role: "KYC / Risk analyst", mfa: "passkey", lastLogin: sast(1, "13:40"), access: "standing", expires: "" },
  { id: "u_tech", name: "Jabu Ngcobo", role: "Device technician", mfa: "authenticator app", lastLogin: sast(3, "11:12"), access: "standing", expires: "" },
  { id: "u_intop", name: "Fatima Adams", role: "Integration operator", mfa: "passkey", lastLogin: sast(0, "09:05"), access: "standing", expires: "" },
];

export const systemSettings = () => [
  { key: "Reporting time zone", value: "Africa/Johannesburg (SAST)", note: "Applied to all exports" },
  { key: "Default currency", value: "ZAR", note: "Cross-border subject to integrations" },
  { key: "Session lifetime (staff)", value: "8 hours, idle 30 min", note: "Passkey / MFA re-auth for privileged actions" },
  { key: "Audit retention", value: "7 years, immutable", note: "Tamper-evident hash chain" },
  { key: "Biometric template retention", value: "Until consent revoked + 30 days", note: "Subject to POPIA legal review" },
  { key: "Refund approval threshold", value: "R 1,000 (maker/checker)", note: "Change needs dual approval" },
];

export const tenants = () => [
  { id: "t_facepay", name: "FacePay Platform", type: "platform", env: "production", users: "245,680", state: "active", policy: "pol_platform_v4" },
  ...merchants().slice(0, 6).map((m, i) => ({ id: m.id, name: m.name, type: "merchant", env: "production", users: String(12 + i * 3), state: m.state, policy: "pol_merchant_v3" })),
  { id: "t_sandbox", name: "Partner sandbox", type: "sandbox", env: "sandbox", users: "58", state: "active", policy: "pol_sandbox_v1" },
];

export const policies = () => [
  { id: "pol_platform_v4", name: "Platform access policy", rule: "Privileged roles require passkey + MFA; break-glass needs dual approval, max 60 min", version: "v4", updated: "2026-07-28" },
  { id: "pol_merchant_v3", name: "Merchant tenant policy", rule: "Cashiers cannot change settlement account; owners limited to R 1,000 direct refunds", version: "v3", updated: "2026-06-30" },
  { id: "pol_bio_v2", name: "Biometric consent policy", rule: "Revocation blocks subsequent challenges where no other lawful basis applies", version: "v2", updated: "2026-05-19" },
  { id: "pol_support_v2", name: "Support data policy", rule: "Masked identifiers only; raw biometric media never retrievable", version: "v2", updated: "2026-05-19" },
];

export const limits = () => [
  { id: "lim_1", name: "Cashier direct refund limit", value: "R 250", scope: "Merchant", changeRule: "Dual approval" },
  { id: "lim_2", name: "Owner direct refund limit", value: "R 1,000", scope: "Merchant", changeRule: "Dual approval" },
  { id: "lim_3", name: "Refund approval threshold (maker/checker)", value: "R 1,000", scope: "Platform", changeRule: "Dual approval" },
  { id: "lim_4", name: "Customer daily face-pay limit", value: "R 5,000", scope: "Customer", changeRule: "Dual approval" },
  { id: "lim_5", name: "Step-up above", value: "R 1,500", scope: "Customer", changeRule: "Dual approval" },
  { id: "lim_6", name: "API rate limit per tenant", value: "600 req/min", scope: "Platform", changeRule: "Single approval" },
];

export const partners = () => [
  { id: "pc_1", partner: "Provider connector A", rails: "Card, wallet", env: "production", mtls: "enabled", circuitBreaker: "closed", version: "conn-2026.07" },
  { id: "pc_2", partner: "Bank settlement importer", rails: "EFT, statements", env: "production", mtls: "enabled", circuitBreaker: "half-open", version: "conn-2026.06" },
  { id: "pc_3", partner: "Biometric vendor adapter", rails: "Matching tokens", env: "sandbox", mtls: "enabled", circuitBreaker: "closed", version: "adapter-0.9" },
];

export const flags = () => [
  { id: "ff_palm", name: "palm_challenge", desc: "Palm scan challenge in POS flow", rollout: "5% of tenants", enabled: false },
  { id: "ff_retina", name: "retina_verification", desc: "Future retinal verification (disabled)", rollout: "0%", enabled: false },
  { id: "ff_paylinks", name: "payment_links", desc: "Merchant payment links", rollout: "100%", enabled: true },
  { id: "ff_transfers", name: "customer_transfers", desc: "Customer transfers via provider", rollout: "100%", enabled: true },
  { id: "ff_offline", name: "pos_offline_mode", desc: "Offline queue with explicit unconfirmed state", rollout: "25%", enabled: true },
];

export const monitoring = () => ({
  kpis: [
    { label: "Platform uptime (30d)", value: "99.97%", delta: "0.02%", good: true },
    { label: "Integration error rate", value: "0.31%", delta: "0.05%", good: false },
    { label: "p95 API latency", value: "312 ms", delta: "18 ms", good: true },
    { label: "Privilege approvals pending", value: "4", delta: "1", good: false },
  ],
  latency: Array.from({ length: 24 }, (_, h) => ({ label: `${String(h).padStart(2, "0")}:00`, value: 260 + Math.round(60 * Math.sin(h / 3) + (h % 5) * 6) })),
  errors: Array.from({ length: 24 }, (_, h) => ({ label: `${String(h).padStart(2, "0")}:00`, value: Math.round((0.2 + 0.15 * Math.abs(Math.sin(h / 2.2)) + (h === 11 ? 0.4 : 0)) * 100) / 100 })),
  changes: [
    { id: "cfg_88", at: sast(0, "09:20"), who: "Pule Phafane", change: "Policy pol_platform_v4 published", version: "v4" },
    { id: "cfg_87", at: sast(2, "16:45"), who: "Fatima Adams", change: "Partner A webhook retry policy updated", version: "conn-2026.07" },
    { id: "cfg_86", at: sast(5, "11:02"), who: "Pule Phafane", change: "Flag payment_links 100%", version: "flags-142" },
  ],
});

export const rolesGrants = () => [
  { id: "rg_1", user: "Lerato Nkosi", role: "Support agent", justification: "Standing role", secondApprover: "n/a", expires: "none", status: "active" },
  { id: "rg_2", user: "Naledi Zulu", role: "Auditor (read only)", justification: "FY26 external audit", secondApprover: "CISO delegate", expires: sast(-30, "00:00"), status: "active" },
  { id: "rg_3", user: "Dineo Maseko", role: "Finance operator", justification: "Standing role", secondApprover: "n/a", expires: "none", status: "active" },
];
