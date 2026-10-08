import DataTable from "@/components/DataTable";
import { ActionForm, IntegrationConsole, RefundsPanel } from "@/components/Interactive";
import { TrendChart } from "@/components/charts";
import { Badge, BarList, Card, KpiGrid, Meter, Notice, PageHeader, PeriodPill, Stat } from "@/components/ui";
import { getDevices, getMerchantDashboard, getRefunds, getSettlements, getTransactions } from "@/lib/data";
import { merchantCustomers, paymentLinks, reports, teamMembers, tickets, integrations, webhookDeliveries } from "@/lib/fixtures";
import { formatMoney, formatDate } from "@/lib/format";
import { can } from "@/lib/rbac";
import type { Session } from "@/lib/session";
import { DEVICE_COLS, SETTLEMENT_COLS, TX_COLS, txRows } from "./shared";
import Link from "next/link";

async function dashboard(s: Session) {
  const d = await getMerchantDashboard(s);
  const owner = s.user.role === "merchant_owner";
  return (
    <>
      <PageHeader title="Dashboard" right={<PeriodPill label={d.period} />} />
      <KpiGrid kpis={d.kpis} />
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.7fr_1fr]">
        <Card title="Transaction Volume" id="vol"><TrendChart data={d.salesTrend} tone="gold" unit="K" ticks={["1 Aug", "7 Aug", "14 Aug", "21 Aug", "28 Aug"]} domainMax={30000} yTicks={[10000, 20000, 30000]} label="Transaction volume" height={250} /></Card>
        <Card title="Top Payment Methods" id="pm"><div className="pt-3"><BarList items={d.paymentTypes} /></div></Card>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card title="Refunds" id="rf" right={<Link href="/merchant/refunds" className="text-xs font-semibold text-blue-800 underline">Manage</Link>}>
          <div className="grid grid-cols-3 gap-3"><Stat label="Count" value={d.refunds.count} /><Stat label="Value" value={formatMoney(d.refunds.valueMinor, { decimals: 0 })} /><Stat label="Awaiting approval" value={d.refunds.pendingApproval} /></div>
        </Card>
        <Card title="Settlement status" id="ss">
          {owner ? (<><div className="mb-3 flex items-center gap-2"><Badge tone="green">{d.settlement.status}</Badge><span className="text-xs text-slate-600">Next payout {formatDate(d.settlement.nextPayoutDate)}</span></div>
            <div className="grid grid-cols-2 gap-3"><Stat label="Net this period" value={formatMoney(d.settlement.netMinor, { decimals: 0 })} /><Stat label="On hold" value={formatMoney(d.settlement.heldMinor, { decimals: 0 })} /></div></>)
            : <p className="text-sm text-slate-700">Settlement details are available to the merchant owner only.</p>}
        </Card>
        <Card title="Fleet health" id="fh">
          <div className="space-y-3"><Meter pct={d.fleet.healthPct} label="Fleet health" />
            <div className="grid grid-cols-3 gap-3"><Stat label="Online" value={d.fleet.online} /><Stat label="Offline" value={d.fleet.offline} /><Stat label="Updating" value={d.fleet.updating} /></div></div>
        </Card>
      </div>
      {owner && <div className="mt-5 flex flex-wrap gap-3"><a className="btn btn-ghost" href="/api/export/reconciliation?format=csv" download>Download reconciliation (CSV)</a><Link href="/merchant/team" className="btn btn-ghost">Manage users</Link><Link href="/merchant/terminals" className="btn btn-ghost">Request device</Link></div>}
    </>
  );
}

async function transactions(s: Session) {
  const tx = await getTransactions(s, "merchant");
  return (<><PageHeader title="Transactions" subtitle="Initiate, search and refund. Payments show as paid only after provider confirmation." /><DataTable caption="Transactions" columns={TX_COLS} rows={txRows(tx)} filterKey="status" detailTitleKey="id" exportName="transactions" detailNote="Refunds are initiated from the Refunds page against captured transactions." /></>);
}

async function refunds(s: Session) {
  const [r, tx] = await Promise.all([getRefunds(s, "merchant"), getTransactions(s, "merchant")]);
  return (
    <>
      <PageHeader title="Refunds" subtitle="Role limits and maker/checker approval apply." />
      <RefundsPanel initial={r} me={{ id: s.user.id, name: s.user.name }} role={s.user.role} canCreate={can(s.user.role, "refund:create")} canApprove={can(s.user.role, "refund:approve")}
        txns={tx.filter((t) => t.status === "captured").slice(0, 10).map((t) => ({ id: t.id, label: `${t.id} · ${formatMoney(t.amountMinor)}` }))} />
    </>
  );
}

async function settlements(s: Session) {
  const st = await getSettlements(s, "merchant");
  return (
    <>
      <PageHeader title="Settlements" subtitle="Gross, fees, reversals and net by payout batch." right={<div className="flex gap-2"><a className="btn btn-ghost" href="/api/export/reconciliation?format=csv" download>Reconciliation CSV</a><a className="btn btn-ghost" href="/api/export/reconciliation?format=pdf" download>PDF</a></div>} />
      <DataTable caption="Settlement batches" columns={SETTLEMENT_COLS.filter((c) => c.key !== "merchantName")} rows={st as never} filterKey="reconciliation" filterLabel="Reconciliation" exportName="settlements" />
      <div className="mt-4"><Notice tone="blue">Settlement account changes are not possible from this portal for owners alone; they require FacePay finance approval.</Notice></div>
    </>
  );
}

function customers() {
  const rows = merchantCustomers().map((c) => ({ ...c }));
  return (
    <>
      <PageHeader title="Customers" subtitle="Limited view: masked contact, visits and spend only. No identity or biometric data is shared with merchants." />
      <DataTable caption="Customers" columns={[{ key: "name", header: "Customer" }, { key: "contact", header: "Contact (masked)" }, { key: "visits", header: "Visits", kind: "number", align: "right" }, { key: "spentMinor", header: "Spend", kind: "money", align: "right" }, { key: "lastSeen", header: "Last seen", kind: "date" }]} rows={rows} exportName="customers" detailTitleKey="name" />
    </>
  );
}

async function terminals(s: Session) {
  const d = await getDevices(s, "merchant");
  return (
    <>
      <PageHeader title="Terminals" subtitle="Your device fleet. Remote actions are performed by FacePay device technicians." />
      <DataTable caption="Terminals" columns={DEVICE_COLS.filter((c) => c.key !== "merchantName")} rows={d as never} filterKey="connection" filterLabel="Connection" exportName="terminals" detailTitleKey="serial" />
      <div className="mt-5"><ActionForm title="Request a device" endpoint="/v1/devices/enrol" submitLabel="Request device" success="Device request submitted" fields={[{ name: "model", label: "Model", type: "select", options: ["FacePay POS with Screen", "Tap Module", "Handheld", "Kiosk"] }, { name: "quantity", label: "Quantity", type: "number" }, { name: "location", label: "Location" }]} /></div>
    </>
  );
}

function paymentLinksPage() {
  return (
    <>
      <PageHeader title="Payment Links" subtitle="Share a link to take a payment online." />
      <div className="grid gap-5 lg:grid-cols-2">
        <ActionForm title="Create link" endpoint="/v1/payment-links" submitLabel="Create link" success="Payment link created" fields={[{ name: "label", label: "Label" }, { name: "amount", label: "Amount (R)", type: "number" }]} transform={(v) => ({ label: v.label, amountMinor: Math.round(parseFloat(v.amount) * 100) })} />
        <DataTable caption="Payment links" columns={[{ key: "label", header: "Link" }, { key: "amountMinor", header: "Amount", kind: "money", align: "right" }, { key: "status", header: "Status", kind: "badge" }, { key: "uses", header: "Uses", kind: "number" }]} rows={paymentLinks()} exportName="payment-links" />
      </div>
    </>
  );
}

function integrationsPage(s: Session) {
  const items = integrations().filter((i) => i.name.includes("ERP"));
  return (
    <>
      <PageHeader title="Integrations" subtitle="Webhooks and API keys for your store. Secrets are shown once on creation, then only a prefix." />
      <IntegrationConsole items={items} deliveries={webhookDeliveries().filter((d) => d.target.includes("abcstore"))} canManage={can(s.user.role, "key:request")} />
      <div className="mt-5"><ActionForm title="Add webhook endpoint" endpoint="/v1/webhooks/subscriptions" submitLabel="Subscribe" success="Webhook subscription created. Signing secret displayed once" fields={[{ name: "url", label: "HTTPS URL", type: "text", placeholder: "https://" }, { name: "events", label: "Events", type: "select", options: ["payment.*", "refund.*", "settlement.*", "device.*"] }]} disabledReason={can(s.user.role, "integration:manage") || s.user.role === "merchant_owner" ? undefined : "Not permitted for your role."} /></div>
    </>
  );
}

function team(s: Session) {
  return (
    <>
      <PageHeader title="Team" subtitle="Owners manage users. Cashiers cannot change settlement accounts or global settings." />
      <DataTable caption="Team members" columns={[{ key: "name", header: "Name" }, { key: "email", header: "Email" }, { key: "role", header: "Role" }, { key: "status", header: "Status", kind: "badge" }, { key: "lastActive", header: "Last active", kind: "date" }]} rows={teamMembers()} exportName="team" />
      <div className="mt-5"><ActionForm title="Invite team member" endpoint="/v1/team/invitations" submitLabel="Send invite" success="Invitation sent" disabledReason={can(s.user.role, "team:manage") ? undefined : "Only the owner can manage users."} fields={[{ name: "email", label: "Email", type: "email" }, { name: "role", label: "Role", type: "select", options: ["Cashier", "Owner"] }]} /></div>
    </>
  );
}

function reportsPage() {
  return (
    <>
      <PageHeader title="Reports" subtitle="Tenant-bound exports in CSV and PDF with reporting time zone (SAST) and audit trail." />
      <ul className="grid gap-4 md:grid-cols-2">
        {reports("merchant").map((r) => (
          <li key={r.id} className="card flex items-center justify-between gap-4 p-5"><div><h2 className="text-sm font-bold">{r.name}</h2><p className="text-sm text-slate-700">{r.desc}</p><p className="mt-1 text-xs text-slate-600">{r.cadence}</p></div>
            <div className="flex gap-2"><a className="btn btn-ghost !px-3 !py-1" href="/api/export/sales?format=csv" download>CSV<span className="sr-only"> {r.name}</span></a><a className="btn btn-ghost !px-3 !py-1" href="/api/export/sales?format=pdf" download>PDF<span className="sr-only"> {r.name}</span></a></div></li>
        ))}
      </ul>
    </>
  );
}

function support() {
  return (
    <>
      <PageHeader title="Support" subtitle="Raise a ticket or follow up on an existing one." />
      <div className="grid gap-5 lg:grid-cols-2">
        <ActionForm title="New ticket" endpoint="/v1/tickets" submitLabel="Submit ticket" success="Ticket created" fields={[{ name: "subject", label: "Subject" }, { name: "priority", label: "Priority", type: "select", options: ["low", "medium", "high"] }, { name: "details", label: "Details", type: "textarea" }]} />
        <DataTable caption="Tickets" columns={[{ key: "id", header: "Ticket", kind: "mono" }, { key: "subject", header: "Subject" }, { key: "state", header: "State", kind: "badge" }, { key: "priority", header: "Priority", kind: "badge" }, { key: "updated", header: "Updated", kind: "date" }]} rows={tickets()} exportName="tickets" />
      </div>
    </>
  );
}

export const merchantPages = {
  "": dashboard,
  transactions,
  refunds,
  settlements,
  customers,
  terminals,
  "payment-links": paymentLinksPage,
  integrations: integrationsPage,
  team,
  reports: reportsPage,
  support,
};
