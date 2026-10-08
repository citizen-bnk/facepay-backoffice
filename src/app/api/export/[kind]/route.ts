import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { makePdf } from "@/lib/pdf";
import { getTransactions, getSettlements } from "@/lib/data";
import { statements } from "@/lib/fixtures";
import { can, navFor } from "@/lib/rbac";

const csvCell = (v: string | number) => {
  let s = String(v);
  if (/^[=+\-@]/.test(s)) s = "'" + s; // neutralise spreadsheet formula injection
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Tenant-bound exports: statements (customer), reconciliation / sales (merchant, finance). */
export async function GET(req: NextRequest, ctx: { params: Promise<{ kind: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: { code: "unauthenticated", message: "Sign in required" } }, { status: 401 });
  const { kind } = await ctx.params;
  const format = req.nextUrl.searchParams.get("format") === "pdf" ? "pdf" : "csv";
  const role = session.user.role;
  let title = "";
  let header: string[] = [];
  let rows: (string | number)[][] = [];

  if (kind === "statement") {
    if (role !== "customer") return NextResponse.json({ error: { code: "forbidden", message: "Customer statements are only available to their owner" } }, { status: 403 });
    const period = req.nextUrl.searchParams.get("period") ?? "st_2026_08";
    const st = statements().find((s) => s.id === period);
    if (!st) return NextResponse.json({ error: { code: "not_found", message: "Unknown statement" } }, { status: 404 });
    const tx = await getTransactions(session, "customer");
    title = `Statement ${st.period} - ${session.user.name}`;
    header = ["Date", "Description", "Channel", "Status", "Amount (ZAR)"];
    rows = tx.map((t) => [t.createdAt.slice(0, 16).replace("T", " "), t.merchantName, t.channel, t.status, (-t.amountMinor / 100).toFixed(2)]);
    rows.push(["", `Balance sourced from provider: closing ${formatMoney(st.closing)}`, "", "", ""]);
  } else if (kind === "reconciliation" || kind === "sales") {
    const allowed = navFor(role, role === "merchant_owner" ? "merchant" : "admin").some((i) => ["settlements", "reports", "reconciliation"].includes(i.slug)) || can(role, "settlement:export");
    if (!allowed) return NextResponse.json({ error: { code: "forbidden", message: "Not permitted" } }, { status: 403 });
    const merchantScope = role === "merchant_owner" || role === "merchant_cashier";
    const st = await getSettlements(session, merchantScope ? "merchant" : "platform");
    title = kind === "sales" ? "Sales summary" : "Reconciliation";
    header = ["Batch", "Merchant", "Period", "Gross", "Fees", "Net", "Reconciliation", "Payout"];
    rows = st.map((s) => [s.id, s.merchantName ?? "", s.period, (s.grossMinor / 100).toFixed(2), (s.feeMinor / 100).toFixed(2), (s.netMinor / 100).toFixed(2), s.reconciliation, s.payoutDate]);
  } else {
    return NextResponse.json({ error: { code: "not_found", message: "Unknown export" } }, { status: 404 });
  }

  const stamp = `Reporting timezone: Africa/Johannesburg | Tenant: ${session.user.tenantId} | Requested by: ${session.user.email}`;
  if (format === "pdf") {
    const pdf = makePdf(title, [stamp, "", header.join("  |  "), ...rows.map((r) => r.join("  |  "))]);
    return new NextResponse(Buffer.from(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${kind}.pdf"`, "Cache-Control": "no-store" } });
  }
  const csv = [`# ${title}`, `# ${stamp}`, header.map(csvCell).join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\n");
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${kind}.csv"`, "Cache-Control": "no-store" } });
}
