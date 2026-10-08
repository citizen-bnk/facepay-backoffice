import DataTable from "@/components/DataTable";
import { ApprovalsPanel, BreakGlass, FlagsPanel } from "@/components/Interactive";
import { Columns, LineSpark } from "@/components/charts";
import { Card, KpiGrid, Notice, PageHeader, Badge } from "@/components/ui";
import { getAdminOverview, getApprovals, getAuditEvents } from "@/lib/data";
import { flags, keyRotations, limits, monitoring, partners, policies, rolesGrants, tenants } from "@/lib/fixtures";
import { ACTIONS, ROLES, ROLE_LABEL, can, permissionMatrix, PORTALS } from "@/lib/rbac";
import type { Session } from "@/lib/session";
import { ActionForm } from "@/components/Interactive";
import { OverviewBody } from "./admin";

async function overview(s: Session) {
  const [o, a] = await Promise.all([getAdminOverview(s), getApprovals(s)]);
  const m = monitoring();
  const pending = a.filter((x) => x.status === "pending").length;
  const o2 = { ...o, secondary: [...m.kpis.map((k) => (k.label.startsWith("Privilege") ? { ...k, value: String(pending) } : k)), ...o.secondary.slice(0, 2)] };
  return (
    <OverviewBody o={o2} title="Platform Overview" extra={
      <Card title="Configuration change history" id="cch"><ul className="divide-y divide-slate-100 text-sm">{m.changes.map((c) => <li key={c.id} className="py-2.5"><span className="font-semibold">{c.change}</span><span className="block text-xs text-slate-600">{c.who} · {c.version}</span></li>)}</ul></Card>
    } />
  );
}

function tenantsPage() {
  return (<><PageHeader title="Organisations / Tenants" subtitle="Tenant isolation is enforced across API and UI." /><DataTable caption="Tenants" columns={[{ key: "id", header: "Tenant", kind: "mono" }, { key: "name", header: "Name" }, { key: "type", header: "Type" }, { key: "env", header: "Environment" }, { key: "users", header: "Users" }, { key: "state", header: "State", kind: "badge" }, { key: "policy", header: "Policy", kind: "mono" }]} rows={tenants()} filterKey="type" filterLabel="Type" exportName="tenants" /></>);
}

function rolesPage(s: Session) {
  const mat = permissionMatrix();
  const acts = Object.keys(ACTIONS);
  const portalIds = Object.keys(PORTALS);
  return (
    <>
      <PageHeader title="Roles" subtitle="Role matrix with justification, second approver and expiry for every grant." />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-xs">
          <caption className="p-4 text-left text-sm font-bold">Role matrix (portals and actions)</caption>
          <thead className="bg-slate-50 text-slate-600"><tr><th scope="col" className="px-3 py-3">Role</th>{portalIds.map((p) => <th key={p} scope="col" className="px-2 py-3 capitalize">{p}</th>)}{acts.map((a) => <th key={a} scope="col" className="px-1 py-3 align-bottom"><span className="[writing-mode:vertical-rl] rotate-180">{a}</span></th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {ROLES.map((r) => {
              const row = mat.find((m) => m.role === r)!;
              return (
                <tr key={r}><th scope="row" className="px-3 py-2 font-semibold">{ROLE_LABEL[r]}</th>
                  {portalIds.map((p) => <td key={p} className="px-2 py-2 text-center">{row.portals.includes(p as never) ? <span aria-label="allowed" className="font-bold text-green-700">✓</span> : <span aria-label="denied" className="text-slate-400">–</span>}</td>)}
                  {acts.map((a) => <td key={a} className="px-1 py-2 text-center">{(row.actions as string[]).includes(a) ? <span aria-label="allowed" className="font-bold text-green-700">✓</span> : <span aria-label="denied" className="text-slate-400">–</span>}</td>)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-600">Auditor is read-only: every mutating action is denied regardless of matrix. No role can retrieve raw biometric media.</p>
      <h2 className="mb-3 mt-8 text-base font-bold">Role grants</h2>
      <DataTable caption="Role grants" columns={[{ key: "user", header: "User" }, { key: "role", header: "Role" }, { key: "justification", header: "Justification" }, { key: "secondApprover", header: "Second approver" }, { key: "expires", header: "Expiry", kind: "date" }, { key: "status", header: "Status", kind: "badge" }]} rows={rolesGrants()} exportName="role-grants" />
      <div className="mt-5"><ActionForm title="Request role grant" endpoint="/v1/approvals" submitLabel="Request (needs second approver)" success="Request created and sent for dual approval" disabledReason={can(s.user.role, "role:grant") ? undefined : "Read-only."} fields={[{ name: "user", label: "User email", type: "email" }, { name: "role", label: "Role", type: "select", options: ROLES.map((r) => ROLE_LABEL[r]) }, { name: "justification", label: "Justification", type: "textarea" }, { name: "expiry", label: "Expires after", type: "select", options: ["8 hours", "24 hours", "7 days", "30 days"] }]} /></div>
    </>
  );
}

function policy() {
  return (<><PageHeader title="Policy Engine" subtitle="Versioned, immutable policies. Publishing a new version needs dual approval." /><DataTable caption="Policies" columns={[{ key: "id", header: "Policy", kind: "mono" }, { key: "name", header: "Name" }, { key: "rule", header: "Rule" }, { key: "version", header: "Version" }, { key: "updated", header: "Updated" }]} rows={policies()} exportName="policies" /></>);
}

function limitsRules() {
  return (<><PageHeader title="Limits & Rules" subtitle="Refund limits, thresholds and rate limits." /><DataTable caption="Limits and rules" columns={[{ key: "name", header: "Rule" }, { key: "value", header: "Value" }, { key: "scope", header: "Scope" }, { key: "changeRule", header: "Change control" }]} rows={limits()} exportName="limits" /></>);
}

function partnerConfig() {
  return (<><PageHeader title="Partner Config" subtitle="Provider connectors, mutual TLS and circuit breakers. Connector versions are immutable." /><DataTable caption="Partner configuration" columns={[{ key: "partner", header: "Partner" }, { key: "rails", header: "Rails" }, { key: "env", header: "Environment" }, { key: "mtls", header: "mTLS" }, { key: "circuitBreaker", header: "Circuit breaker", kind: "badge" }, { key: "version", header: "Version", kind: "mono" }]} rows={partners()} exportName="partners" /></>);
}

function featureFlags(s: Session) {
  return (<><PageHeader title="Feature Flags" subtitle="Rollout flags with versioned history." /><FlagsPanel initial={flags()} canWrite={can(s.user.role, "flags:write")} /></>);
}

function monitoringPage() {
  const m = monitoring();
  return (
    <>
      <PageHeader title="Platform Monitoring" subtitle="Metrics tie to versioned event sources. Data refreshed every 60 seconds." />
      <KpiGrid kpis={m.kpis} />
      <div className="mt-5 grid gap-5 lg:grid-cols-2"><Card title="p95 API latency (24h)" id="lat"><LineSpark data={m.latency} unit="ms" label="p95 API latency" /></Card><Card title="Integration error rate % (24h)" id="err"><Columns data={m.errors} label="Integration error rate" /></Card></div>
    </>
  );
}

async function keyRotation(s: Session) {
  const reqs = keyRotations();
  return (
    <>
      <PageHeader title="Key Rotation Requests" subtitle="Dual approval. Secrets are rotated via the vault and never shown in plaintext after creation." />
      <ApprovalsPanel initial={reqs} me={{ id: s.user.id, name: s.user.name }} canDecide={can(s.user.role, "key:approve")} />
      <div className="mt-5"><ActionForm title="Request key rotation" endpoint="/v1/keys/rotation-requests" submitLabel="Request rotation" success="Rotation request created; awaiting two approvers" fields={[{ name: "integration", label: "Integration", type: "select", options: ["Partner connector A", "Bank settlement importer", "ERP connector", "Vault master wrap key"] }, { name: "env", label: "Environment", type: "select", options: ["production", "sandbox"] }, { name: "justification", label: "Justification", type: "textarea" }]} /></div>
    </>
  );
}

async function approvalsPage(s: Session) {
  const a = await getApprovals(s);
  return (<><PageHeader title="Approvals" subtitle="Approve or deny privileged changes. Two distinct approvers; the requester cannot approve." /><ApprovalsPanel initial={a} me={{ id: s.user.id, name: s.user.name }} canDecide={can(s.user.role, "approval:decide")} /></>);
}

async function auditIr(s: Session) {
  const e = await getAuditEvents(s);
  const ro = !can(s.user.role, "breakglass:activate");
  return (
    <>
      <PageHeader title="Audit & Incident Response" subtitle="Immutable audit trail, incident playbooks and break-glass access." />
      {ro && <div className="mb-4"><Notice tone="blue">Read-only access: you can review and export evidence but not change anything.</Notice></div>}
      <DataTable caption="Audit events" columns={[{ key: "at", header: "Time", kind: "date" }, { key: "actor", header: "Actor" }, { key: "action", header: "Action", kind: "mono" }, { key: "tenant", header: "Tenant", kind: "mono" }, { key: "object", header: "Object", kind: "mono" }, { key: "hash", header: "Hash", kind: "mono" }]} rows={e as never} filterKey="actor" filterLabel="Actor" exportName="audit" detailTitleKey="action" />
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <BreakGlass canActivate={!ro} />
        <Card title="Active time-limited access" id="tla"><ul className="divide-y divide-slate-100 text-sm"><li className="flex justify-between py-2.5"><span>On-call SRE: read-only DB console</span><Badge tone="amber">expires 23:00</Badge></li><li className="flex justify-between py-2.5"><span>Naledi Zulu: Auditor</span><Badge tone="slate">30 days</Badge></li></ul></Card>
      </div>
    </>
  );
}

export const superPages = {
  "": overview,
  tenants: tenantsPage,
  roles: rolesPage,
  "policy-engine": policy,
  "limits-rules": limitsRules,
  "partner-config": partnerConfig,
  "feature-flags": featureFlags,
  monitoring: monitoringPage,
  "key-rotation": keyRotation,
  approvals: approvalsPage,
  audit: auditIr,
};
