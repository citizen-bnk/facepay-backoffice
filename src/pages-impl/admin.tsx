import DataTable from "@/components/DataTable";
import { ActionForm, IntegrationConsole, RefundsPanel } from "@/components/Interactive";
import { ChannelDonut, TrendChart } from "@/components/charts";
import { Badge, Card, KpiGrid, Notice, PageHeader, PeriodPill } from "@/components/ui";
import { getAdminOverview, getAuditEvents, getCustomers, getDevices, getIntegrations, getMerchants, getRefunds, getSettlements, getTransactions } from "@/lib/data";
import { disputes, platformTransactions, reconciliationSummary, reports, riskAlerts, staff, supportCases, systemSettings, webhookDeliveries } from "@/lib/fixtures";
import { can } from "@/lib/rbac";
import type { Session } from "@/lib/session";
import type { AdminOverview } from "@/lib/types";
import { DEVICE_COLS, SETTLEMENT_COLS, TX_COLS, txRows } from "./shared";

export function OverviewBody({ o, title = "Platform Overview", extra }: { o: AdminOverview; title?: string; extra?: React.ReactNode }) {
  return (
    <>
      <PageHeader title={title} right={<PeriodPill label={o.period} />} />
      <KpiGrid kpis={o.kpis} />
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <Card title="Transaction Trends" id="tt"><TrendChart data={o.trend} tone="blue" unit="M" ticks={["1 Aug", "7 Aug", "14 Aug", "21 Aug", "28 Aug"]} domainMax={6_000_000} yTicks={[0, 2_000_000, 4_000_000, 6_000_000]} label="Transaction trends" height={250} /></Card>
        <Card title="Transactions by Channel" id="tc"><div className="pt-3"><ChannelDonut data={o.byChannel} /></div></Card>
      </div>
      <h2 className="mb-3 mt-8 text-base font-bold">Operations at a glance</h2>
      <KpiGrid kpis={o.secondary} cols={6} />
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card title="Incident & SLA queue" id="inc">
          <ul className="divide-y divide-slate-100 text-sm">
            {o.incidents.map((i) => <li key={i.id} className="flex items-start justify-between gap-3 py-3"><span><span className="font-semibold">{i.title}</span><span className="block text-xs text-slate-600">{i.id} · {i.owner} · {i.age}</span></span><Badge>{i.severity}</Badge></li>)}
          </ul>
        </Card>
        {extra}
      </div>
    </>
  );
}

async function overview(s: Session) {
  const o = await getAdminOverview(s);
  return <OverviewBody o={o} extra={<Card title="Triage" id="tri"><ul className="space-y-2 text-sm"><li>Pending disputes: <strong>37</strong> (3 breaching SLA)</li><li>Settlement exceptions: <strong>5</strong> open</li><li>Devices offline: <strong>1</strong></li></ul></Card>} />;
}

async function customers(s: Session) {
  const c = await getCustomers(s);
  return (
    <>
      <PageHeader title="Customers" subtitle="Masked identifiers, verification status, consent flag and case links. Raw biometric templates and media are never retrievable here." />
      <DataTable caption="Customers (masked)" columns={[{ key: "id", header: "Customer", kind: "mono" }, { key: "name", header: "Name" }, { key: "email", header: "Email" }, { key: "phone", header: "Phone" }, { key: "idNumber", header: "ID", kind: "mono" }, { key: "verification", header: "Verification", kind: "badge" }, { key: "consentActive", header: "Biometric consent", kind: "badge" }, { key: "openCases", header: "Cases", kind: "number", align: "right" }]}
        rows={c.map((x) => ({ ...x, consentActive: x.consentActive ? "yes" : "no" }))} filterKey="verification" filterLabel="Verification" exportName="customers-masked" detailTitleKey="id" detailNote="Consent shown as a flag only. Biometric media and templates are not available to staff." />
    </>
  );
}

async function merchants(s: Session) {
  const m = await getMerchants(s);
  return (
    <>
      <PageHeader title="Merchants" subtitle="Legal entity, contacts, rates, supported rails, terminals and settlement profile." />
      <DataTable caption="Merchants" columns={[{ key: "name", header: "Merchant" }, { key: "legalEntity", header: "Legal entity" }, { key: "state", header: "State", kind: "badge" }, { key: "rates", header: "Rates" }, { key: "rails", header: "Rails" }, { key: "terminals", header: "Terminals", kind: "number", align: "right" }, { key: "settlementProfile", header: "Settlement profile" }, { key: "contact", header: "Operator contact" }]} rows={m as never} filterKey="state" filterLabel="State" exportName="merchants" detailTitleKey="name" />
    </>
  );
}

async function payments(s: Session) {
  const tx = await getTransactions(s, "platform");
  return (
    <>
      <PageHeader title="Payments" subtitle="Intent and provider IDs, timeline and reconciliation state." />
      <DataTable caption="Payments" columns={TX_COLS} rows={txRows(tx.length ? tx : platformTransactions())} filterKey="status" detailTitleKey="id" exportName="payments" detailNote="Funding reference is masked. Timeline: intent created, verification, authorisation, capture, ledger, reconciliation." />
    </>
  );
}

async function refundsDisputes(s: Session) {
  const r = await getRefunds(s, "platform");
  return (
    <>
      <PageHeader title="Refunds & Disputes" subtitle="Refunds above threshold need a different approver. Disputes are worked against SLA." />
      <RefundsPanel initial={r} me={{ id: s.user.id, name: s.user.name }} role={s.user.role} txns={[]} canCreate={false} canApprove={can(s.user.role, "refund:approve")} />
      <h2 className="mb-3 mt-8 text-base font-bold">Disputes</h2>
      <DataTable caption="Disputes" columns={[{ key: "id", header: "Dispute", kind: "mono" }, { key: "transactionId", header: "Transaction", kind: "mono" }, { key: "customer", header: "Customer" }, { key: "reason", header: "Reason" }, { key: "state", header: "State", kind: "badge" }, { key: "dueBy", header: "SLA due", kind: "date" }, { key: "owner", header: "Owner" }]} rows={disputes()} filterKey="state" filterLabel="State" exportName="disputes" />
    </>
  );
}

async function settlements(s: Session) {
  const st = await getSettlements(s, "platform");
  return (<><PageHeader title="Settlements" subtitle="Settlement queues and exceptions across merchants." right={can(s.user.role, "settlement:export") ? <a className="btn btn-ghost" href="/api/export/reconciliation?format=csv" download>Export CSV</a> : undefined} /><DataTable caption="Settlements" columns={SETTLEMENT_COLS} rows={st as never} filterKey="reconciliation" filterLabel="Reconciliation" exportName="settlements" /></>);
}

function reconciliation() {
  const r = reconciliationSummary();
  return (
    <>
      <PageHeader title="Reconciliation" subtitle="Intents, provider authorisations, captures, refunds, settlement files and bank statements." />
      <KpiGrid kpis={r.kpis} cols={5} />
      <h2 className="mb-3 mt-6 text-base font-bold">Exceptions: duplicates, gaps, currency and amount mismatches, stale batches</h2>
      <DataTable caption="Reconciliation exceptions" columns={[{ key: "id", header: "Exception", kind: "mono" }, { key: "type", header: "Type", kind: "badge" }, { key: "ref", header: "Reference", kind: "mono" }, { key: "batch", header: "Batch", kind: "mono" }, { key: "expected", header: "Expected" }, { key: "actual", header: "Actual" }, { key: "delta", header: "Delta" }, { key: "age", header: "Age" }, { key: "state", header: "State", kind: "badge" }]} rows={r.exceptions} filterKey="type" filterLabel="Type" exportName="reconciliation-exceptions" detailTitleKey="id" />
    </>
  );
}

async function devices(s: Session) {
  const d = await getDevices(s, "platform");
  const manage = can(s.user.role, "device:manage");
  return (
    <>
      <PageHeader title="Devices" subtitle="Device fleet: model, serial, merchant, connection, firmware and remote actions." />
      <DataTable caption="Device fleet" columns={DEVICE_COLS} rows={d as never} filterKey="connection" filterLabel="Connection" exportName="devices" detailTitleKey="serial" detailNote={manage ? "Remote actions: restart, firmware rollout, lock. All actions are audited." : "Remote actions are limited to device technicians."} />
      <div className="mt-5"><ActionForm title="Remote action" endpoint="/v1/devices/enrol" submitLabel="Queue action" success="Remote action queued" disabledReason={manage ? undefined : "Your role cannot run remote device actions."} fields={[{ name: "serial", label: "Device serial" }, { name: "action", label: "Action", type: "select", options: ["Restart", "Rollout firmware 4.2.1", "Lock", "Re-attest certificate"] }]} /></div>
    </>
  );
}

async function integrationsConsole(s: Session) {
  const i = await getIntegrations(s);
  return (<><PageHeader title="Integrations" subtitle="Sandbox and production are segregated. Key metadata only; secrets rotate via the vault and are never shown in plaintext." /><IntegrationConsole items={i} deliveries={webhookDeliveries()} canManage={can(s.user.role, "integration:manage")} /></>);
}

function risk() {
  return (<><PageHeader title="Risk & Compliance" subtitle="Alerts, holds, escalations and consent/KYC evidence review. Access is logged and approvals segregated." /><DataTable caption="Risk alerts" columns={[{ key: "id", header: "Alert", kind: "mono" }, { key: "kind", header: "Type" }, { key: "subject", header: "Subject" }, { key: "detail", header: "Detail" }, { key: "severity", header: "Severity", kind: "badge" }, { key: "state", header: "State", kind: "badge" }]} rows={riskAlerts()} filterKey="severity" filterLabel="Severity" exportName="risk-alerts" /></>);
}

function support(s: Session) {
  return (
    <>
      <PageHeader title="Support" subtitle="Minimal customer records and masked payment status. No biometric data is shown in support tools." />
      <div className="mb-4"><Notice tone="blue">Customers appear as initials. Payment status shows provider state only.</Notice></div>
      <DataTable caption="Support cases" columns={[{ key: "id", header: "Case", kind: "mono" }, { key: "customer", header: "Customer (masked)" }, { key: "subject", header: "Subject" }, { key: "paymentStatus", header: "Payment status" }, { key: "state", header: "State", kind: "badge" }, { key: "priority", header: "Priority", kind: "badge" }, { key: "updated", header: "Updated", kind: "date" }]} rows={supportCases()} filterKey="state" filterLabel="State" exportName="cases" detailTitleKey="id" />
      <div className="mt-5"><ActionForm title="Open case" endpoint="/v1/cases" submitLabel="Open case" success="Case opened" disabledReason={can(s.user.role, "case:update") ? undefined : "Read-only."} fields={[{ name: "customerRef", label: "Customer reference (masked ID)" }, { name: "subject", label: "Subject" }]} /></div>
    </>
  );
}

function reportsPage(s: Session) {
  const exp = can(s.user.role, "settlement:export");
  return (
    <>
      <PageHeader title="Reports" subtitle="Internal reports with CSV and PDF export, tenant-bound filters and reporting time zone." />
      <ul className="grid gap-4 md:grid-cols-2">
        {reports("admin").map((r) => <li key={r.id} className="card flex items-center justify-between gap-4 p-5"><div><h2 className="text-sm font-bold">{r.name}</h2><p className="text-sm text-slate-700">{r.desc}</p><p className="mt-1 text-xs text-slate-600">{r.cadence}</p></div>
          <div className="flex gap-2"><a className="btn btn-ghost !px-3 !py-1" href="/api/export/reconciliation?format=csv" download aria-disabled={!exp && undefined}>CSV<span className="sr-only"> {r.name}</span></a><a className="btn btn-ghost !px-3 !py-1" href="/api/export/reconciliation?format=pdf" download>PDF<span className="sr-only"> {r.name}</span></a></div></li>)}
      </ul>
    </>
  );
}

function staffPage() {
  return (<><PageHeader title="Staff & Access" subtitle="Internal users, MFA method and time-limited access." /><DataTable caption="Staff" columns={[{ key: "name", header: "Name" }, { key: "role", header: "Role" }, { key: "mfa", header: "MFA" }, { key: "access", header: "Access" }, { key: "lastLogin", header: "Last login", kind: "date" }, { key: "expires", header: "Expires", kind: "date" }]} rows={staff()} exportName="staff" /></>);
}

function settings(s: Session) {
  const w = can(s.user.role, "settings:write");
  return (<><PageHeader title="System Settings" subtitle="Platform configuration. Changes are versioned and need dual approval." />{!w && <div className="mb-4"><Notice>View only.</Notice></div>}<DataTable caption="System settings" columns={[{ key: "key", header: "Setting" }, { key: "value", header: "Value" }, { key: "note", header: "Note" }]} rows={systemSettings().map((r, i) => ({ id: i, ...r }))} exportName="settings" /></>);
}

async function audit(s: Session) {
  const e = await getAuditEvents(s);
  return (<><PageHeader title="Audit Log" subtitle="Immutable, tamper-evident events with before/after hashes." /><DataTable caption="Audit events" columns={[{ key: "at", header: "Time", kind: "date" }, { key: "actor", header: "Actor" }, { key: "action", header: "Action", kind: "mono" }, { key: "tenant", header: "Tenant", kind: "mono" }, { key: "object", header: "Object", kind: "mono" }, { key: "hash", header: "Hash", kind: "mono" }]} rows={e as never} filterKey="actor" filterLabel="Actor" exportName="audit-log" detailTitleKey="action" /></>);
}

export const adminPages = {
  "": overview,
  customers,
  merchants,
  payments,
  refunds: refundsDisputes,
  settlements,
  reconciliation,
  devices,
  integrations: integrationsConsole,
  risk,
  support,
  reports: reportsPage,
  staff: staffPage,
  settings,
  "audit-log": audit,
};
