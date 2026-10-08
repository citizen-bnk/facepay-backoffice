import type { Role } from "./types";

/** Amounts in minor units (cents). */

/** Maximum a role may refund directly, without a second approver. */
export const DIRECT_REFUND_LIMIT_MINOR: Partial<Record<Role, number>> = {
  merchant_cashier: 25_000, // R 250
  merchant_owner: 100_000, // R 1,000
};

/** Any refund above this needs a distinct checker, whoever the maker is. */
export const APPROVAL_THRESHOLD_MINOR = 100_000; // R 1,000

/** Highest amount a role may approve as checker. */
export const APPROVAL_LIMIT_MINOR: Partial<Record<Role, number>> = {
  merchant_owner: 500_000, // R 5,000
  finance_operator: 5_000_000, // R 50,000
  super_user: Number.MAX_SAFE_INTEGER,
};

export type RefundDecision =
  | { decision: "direct"; reason: string }
  | { decision: "needs_approval"; reason: string }
  | { decision: "denied"; reason: string };

export function evaluateRefund(input: { amountMinor: number; makerRole: Role }): RefundDecision {
  const { amountMinor, makerRole } = input;
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    return { decision: "denied", reason: "Amount must be a positive whole number of cents." };
  }
  const limit = DIRECT_REFUND_LIMIT_MINOR[makerRole];
  if (limit === undefined) {
    return { decision: "denied", reason: "This role cannot initiate refunds." };
  }
  if (amountMinor > APPROVAL_THRESHOLD_MINOR || amountMinor > limit) {
    return {
      decision: "needs_approval",
      reason: "Above your direct limit: a different approver (checker) must approve before the provider is instructed.",
    };
  }
  return { decision: "direct", reason: "Within your direct refund limit." };
}

export type ApprovalCheck = { ok: true } | { ok: false; reason: string };

/** Maker/checker rule: the checker must be a different user, with authority for the amount. */
export function canApproveRefund(input: {
  makerId: string;
  checkerId: string;
  checkerRole: Role;
  amountMinor: number;
}): ApprovalCheck {
  const { makerId, checkerId, checkerRole, amountMinor } = input;
  if (makerId === checkerId) return { ok: false, reason: "Maker and checker must be different people." };
  const limit = APPROVAL_LIMIT_MINOR[checkerRole];
  if (limit === undefined) return { ok: false, reason: "Your role cannot approve refunds." };
  if (amountMinor > limit) return { ok: false, reason: "Amount exceeds your approval limit; escalate to Finance or a Super user." };
  return { ok: true };
}
