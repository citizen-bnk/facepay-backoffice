import type { Col, Row } from "@/components/DataTable";
import { CHANNEL_LABEL } from "@/lib/format";
import type { Transaction } from "@/lib/types";

export const TX_COLS: Col[] = [
  { key: "id", header: "Transaction", kind: "mono" },
  { key: "createdAt", header: "Date", kind: "date" },
  { key: "merchantName", header: "Merchant" },
  { key: "channel", header: "Channel" },
  { key: "status", header: "Status", kind: "badge" },
  { key: "amountMinor", header: "Amount", kind: "money", align: "right" },
  { key: "intentId", header: "Intent", kind: "mono" },
];

export function txRows(tx: Transaction[]): Row[] {
  return tx.map((t) => ({ ...t, channel: CHANNEL_LABEL[t.channel] ?? t.channel }));
}

export const SETTLEMENT_COLS: Col[] = [
  { key: "id", header: "Batch", kind: "mono" },
  { key: "merchantName", header: "Merchant" },
  { key: "period", header: "Period" },
  { key: "grossMinor", header: "Gross", kind: "money", align: "right" },
  { key: "feeMinor", header: "Fees", kind: "money", align: "right" },
  { key: "netMinor", header: "Net", kind: "money", align: "right" },
  { key: "reconciliation", header: "Reconciliation", kind: "badge" },
  { key: "payoutDate", header: "Payout" },
];

export const DEVICE_COLS: Col[] = [
  { key: "serial", header: "Serial / asset", kind: "mono" },
  { key: "model", header: "Model" },
  { key: "merchantName", header: "Merchant" },
  { key: "assignment", header: "Assignment" },
  { key: "connection", header: "Connection", kind: "badge" },
  { key: "firmware", header: "Firmware" },
  { key: "health", header: "Health %", kind: "number", align: "right" },
  { key: "lastSeen", header: "Last seen", kind: "date" },
];
