"use client";

import { useState, type ReactNode } from "react";
import { Badge, Card, Notice } from "./ui";
import { formatDateTime, formatMoney } from "@/lib/format";
import { canApproveRefund, evaluateRefund } from "@/lib/refunds";
import type { Approval, Consent, Refund, Role } from "@/lib/types";

export async function mutate(path: string, body: unknown): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  try {
    const res = await fetch(`/api/proxy${path}`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, data };
  } catch {
    return { ok: false, data: { error: { message: "Network error. Nothing was changed." } } };
  }
}

const errMsg = (d: Record<string, unknown>) => ((d.error as { message?: string } | undefined)?.message ?? "Request failed");

export interface FieldDef { name: string; label: string; type?: "text" | "number" | "select" | "textarea" | "email"; options?: string[]; placeholder?: string; required?: boolean }

/** Generic create/submit form that posts through the RBAC-enforcing proxy. */
export function ActionForm({ title, endpoint, fields, submitLabel, success, disabledReason, transform }: {
  title: string; endpoint: string; fields: FieldDef[]; submitLabel: string; success: string; disabledReason?: string;
  transform?: (v: Record<string, string>) => unknown;
}) {
  const [vals, setVals] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const id = title.replace(/\W/g, "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await mutate(endpoint, transform ? transform(vals) : vals);
    setBusy(false);
    setMsg(r.ok ? { tone: "ok", text: success + (r.data.status ? ` (status: ${String(r.data.status).replace(/_/g, " ")})` : "") } : { tone: "err", text: errMsg(r.data) });
    if (r.ok) setVals({});
  }

  return (
    <Card title={title} id={id}>
      {disabledReason && <p className="mb-3 text-sm text-slate-700">{disabledReason}</p>}
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2" aria-describedby={`${id}-m`}>
        {fields.map((f) => (
          <div key={f.name} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
            <label className="label" htmlFor={`${id}-${f.name}`}>{f.label}</label>
            {f.type === "select" ? (
              <select id={`${id}-${f.name}`} className="field" required={f.required !== false} disabled={!!disabledReason} value={vals[f.name] ?? ""} onChange={(e) => setVals({ ...vals, [f.name]: e.target.value })}>
                <option value="">Select…</option>
                {f.options?.map((o) => <option key={o}>{o}</option>)}
              </select>
            ) : f.type === "textarea" ? (
              <textarea id={`${id}-${f.name}`} rows={3} className="field" required={f.required !== false} disabled={!!disabledReason} placeholder={f.placeholder} value={vals[f.name] ?? ""} onChange={(e) => setVals({ ...vals, [f.name]: e.target.value })} />
            ) : (
              <input id={`${id}-${f.name}`} type={f.type ?? "text"} min={f.type === "number" ? 0.01 : undefined} step={f.type === "number" ? "0.01" : undefined} className="field" required={f.required !== false} disabled={!!disabledReason} placeholder={f.placeholder} value={vals[f.name] ?? ""} onChange={(e) => setVals({ ...vals, [f.name]: e.target.value })} />
            )}
          </div>
        ))}
        <div className="sm:col-span-2">
          <button className="btn btn-gold" disabled={busy || !!disabledReason}>{busy ? "Submitting…" : submitLabel}</button>
        </div>
      </form>
      <div id={`${id}-m`} aria-live="polite" className="mt-3">
        {msg && <Notice tone={msg.tone === "ok" ? "blue" : "red"}>{msg.text}</Notice>}
      </div>
    </Card>
  );
}

/** Refunds: role limits, maker/checker approval, create form. */
export function RefundsPanel({ initial, me, role, txns, canCreate, canApprove }: {
  initial: Refund[]; me: { id: string; name: string }; role: Role; txns: { id: string; label: string }[]; canCreate: boolean; canApprove: boolean;
}) {
  const [rows, setRows] = useState(initial);
  const [msg, setMsg] = useState<string>("");
  const [txn, setTxn] = useState("");
  const [amt, setAmt] = useState("");
  const [reason, setReason] = useState("");

  const amountMinor = Math.round(parseFloat(amt || "0") * 100);
  const preview = amt ? evaluateRefund({ amountMinor, makerRole: role }) : null;

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const r = await mutate("/v1/refunds", { transactionId: txn, amountMinor, reason });
    if (!r.ok) return setMsg(errMsg(r.data));
    const status = (r.data.status as Refund["status"]) ?? "pending_approval";
    setRows([{ id: String(r.data.id ?? `rf_${Date.now()}`), transactionId: txn, merchantId: "m_abc", amountMinor, reason, status, makerId: me.id, makerName: me.name, makerRole: role, createdAt: new Date().toISOString() }, ...rows]);
    setMsg(status === "completed" ? "Refund instructed to the provider. Final status will update asynchronously." : "Refund submitted. A different approver must approve it before the provider is instructed.");
    setAmt(""); setReason(""); setTxn("");
  }

  async function decide(r: Refund, action: "approve" | "reject") {
    const res = await mutate(`/v1/refunds/${r.id}/${action}`, { makerId: r.makerId, amountMinor: r.amountMinor });
    if (!res.ok) return setMsg(errMsg(res.data));
    setRows(rows.map((x) => (x.id === r.id ? { ...x, status: action === "approve" ? "approved" : "rejected", checkerId: me.id, checkerName: me.name } : x)));
    setMsg(`Refund ${r.id} ${action === "approve" ? "approved" : "rejected"} and logged in the audit trail.`);
  }

  return (
    <div className="space-y-5">
      <Notice tone="blue" title="Refund rules">
        Cashiers can refund up to R 250 directly; owners up to R 1,000. Anything above needs approval by a <strong>different</strong> person (maker/checker). Every step is written to the audit log.
      </Notice>
      <div aria-live="polite">{msg && <Notice tone="gold">{msg}</Notice>}</div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <caption className="sr-only">Refund requests</caption>
          <thead className="bg-slate-50 text-xs uppercase text-slate-600"><tr>{["Refund", "Transaction", "Amount", "Reason", "Requested by", "Status", "Action"].map((h) => <th scope="col" key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => {
              const chk = canApproveRefund({ makerId: r.makerId, checkerId: me.id, checkerRole: role, amountMinor: r.amountMinor });
              return (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-mono text-xs">{r.id}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.transactionId}</td>
                  <td className="px-4 py-3 tabular-nums">{formatMoney(r.amountMinor)}</td>
                  <td className="px-4 py-3">{r.reason}</td>
                  <td className="px-4 py-3">{r.makerName}<span className="block text-xs text-slate-600">{formatDateTime(r.createdAt)}</span></td>
                  <td className="px-4 py-3"><Badge>{r.status}</Badge>{r.checkerName && <span className="block text-xs text-slate-600">Checker: {r.checkerName}</span>}</td>
                  <td className="px-4 py-3">
                    {r.status === "pending_approval" ? (
                      canApprove && chk.ok ? (
                        <div className="flex gap-2"><button className="btn btn-dark !px-3 !py-1" onClick={() => decide(r, "approve")}>Approve</button><button className="btn btn-danger !px-3 !py-1" onClick={() => decide(r, "reject")}>Reject</button></div>
                      ) : (
                        <span className="text-xs text-slate-700">{!canApprove ? "No approval rights" : chk.ok ? "" : chk.reason}</span>
                      )
                    ) : <span className="text-xs text-slate-500">-</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {canCreate && (
        <Card title="New refund" id="newrefund">
          <form onSubmit={create} className="grid gap-3 sm:grid-cols-3">
            <div><label className="label" htmlFor="rf-txn">Captured transaction</label>
              <select id="rf-txn" required className="field" value={txn} onChange={(e) => setTxn(e.target.value)}><option value="">Select…</option>{txns.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select></div>
            <div><label className="label" htmlFor="rf-amt">Amount (R)</label>
              <input id="rf-amt" required type="number" min="0.01" step="0.01" className="field" value={amt} onChange={(e) => setAmt(e.target.value)} /></div>
            <div><label className="label" htmlFor="rf-reason">Reason</label>
              <input id="rf-reason" required className="field" value={reason} onChange={(e) => setReason(e.target.value)} /></div>
            <div className="sm:col-span-3 flex flex-wrap items-center gap-3">
              <button className="btn btn-gold" disabled={!preview || preview.decision === "denied"}>Submit refund</button>
              {preview && <span className="text-sm text-slate-700" aria-live="polite">{preview.reason}</span>}
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}

/** Customer biometric consent list with revoke. */
export function ConsentPanel({ initial }: { initial: Consent[] }) {
  const [rows, setRows] = useState(initial);
  const [msg, setMsg] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);

  async function revoke(c: Consent) {
    const r = await mutate(`/v1/consents/${c.id}/revoke`, {});
    if (!r.ok) return setMsg(errMsg(r.data));
    setRows(rows.map((x) => (x.id === c.id ? { ...x, revokedAt: new Date().toISOString() } : x)));
    setConfirm(null);
    setMsg(`${c.modality} consent revoked. Future ${c.modality} challenges are blocked unless another lawful basis applies.`);
  }

  return (
    <div className="space-y-4">
      <Notice tone="blue" title="Your biometric data">FacePay stores purpose-specific matching tokens, never raw images. You can revoke consent at any time and keep paying with non-biometric methods (card, QR, NFC, PIN).</Notice>
      <div aria-live="polite">{msg && <Notice tone="gold">{msg}</Notice>}</div>
      <ul className="grid gap-4 md:grid-cols-2">
        {rows.map((c) => (
          <li key={c.id} className="card p-5">
            <div className="flex items-center justify-between"><h3 className="text-base font-bold capitalize">{c.modality}</h3><Badge>{c.revokedAt ? "revoked" : "active"}</Badge></div>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-slate-600">Purpose</dt><dd className="text-right">{c.purpose}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-600">Legal basis</dt><dd className="text-right">{c.legalBasis}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-600">Consent version</dt><dd>{c.version}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-600">Granted</dt><dd>{formatDateTime(c.grantedAt)}</dd></div>
              {c.revokedAt && <div className="flex justify-between gap-3"><dt className="text-slate-600">Revoked</dt><dd>{formatDateTime(c.revokedAt)}</dd></div>}
            </dl>
            {!c.revokedAt && (confirm === c.id ? (
              <div className="mt-4 flex items-center gap-2"><span className="text-sm">Revoke {c.modality} consent?</span><button className="btn btn-danger !py-1" onClick={() => revoke(c)}>Yes, revoke</button><button className="btn btn-ghost !py-1" onClick={() => setConfirm(null)}>Cancel</button></div>
            ) : (
              <button className="btn btn-danger mt-4" onClick={() => setConfirm(c.id)}>Revoke consent</button>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Dual-approval queue (privileged changes, key rotation, break-glass). */
export function ApprovalsPanel({ initial, me, canDecide }: { initial: Approval[]; me: { id: string; name: string }; canDecide: boolean }) {
  const [rows, setRows] = useState(initial);
  const [msg, setMsg] = useState("");

  async function decide(a: Approval, action: "approve" | "deny") {
    const r = await mutate(`/v1/approvals/${a.id}/${action}`, {});
    if (!r.ok) return setMsg(errMsg(r.data));
    setRows(rows.map((x) => {
      if (x.id !== a.id) return x;
      if (action === "deny") return { ...x, status: "denied" };
      const approvals = [...x.approvals, me.name];
      return { ...x, approvals, status: approvals.length >= x.required ? "approved" : "pending" };
    }));
    setMsg(`${a.id} ${action === "approve" ? "approval recorded" : "denied"}; written to the audit log.`);
  }

  return (
    <div className="space-y-4">
      <Notice tone="blue" title="Dual approval">Privileged changes need two distinct approvers, neither of whom is the requester. Requests expire automatically.</Notice>
      <div aria-live="polite">{msg && <Notice tone="gold">{msg}</Notice>}</div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <caption className="sr-only">Approval requests</caption>
          <thead className="bg-slate-50 text-xs uppercase text-slate-600"><tr>{["Request", "Requested by", "Justification", "Expires", "Approvals", "Status", "Action"].map((h) => <th scope="col" key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((a) => {
              const own = a.requesterId === me.id;
              const already = a.approvals.includes(me.name);
              return (
                <tr key={a.id}>
                  <td className="px-4 py-3"><span className="font-semibold">{a.summary}</span><span className="block font-mono text-xs text-slate-600">{a.id} · {a.kind.replace(/_/g, " ")}</span></td>
                  <td className="px-4 py-3">{a.requestedBy}</td>
                  <td className="px-4 py-3">{a.justification}</td>
                  <td className="px-4 py-3">{formatDateTime(a.expiresAt)}</td>
                  <td className="px-4 py-3">{a.approvals.length}/{a.required}{a.approvals.length > 0 && <span className="block text-xs text-slate-600">{a.approvals.join(", ")}</span>}</td>
                  <td className="px-4 py-3"><Badge>{a.status}</Badge></td>
                  <td className="px-4 py-3">
                    {a.status !== "pending" ? "-" : !canDecide ? <span className="text-xs">Read-only</span> : own ? <span className="text-xs text-slate-700">You requested this; a second person must approve.</span> : already ? <span className="text-xs">You approved</span> : (
                      <div className="flex gap-2"><button className="btn btn-dark !px-3 !py-1" onClick={() => decide(a, "approve")}>Approve</button><button className="btn btn-danger !px-3 !py-1" onClick={() => decide(a, "deny")}>Deny</button></div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function FlagsPanel({ initial, canWrite }: { initial: { id: string; name: string; desc: string; rollout: string; enabled: boolean }[]; canWrite: boolean }) {
  const [rows, setRows] = useState(initial);
  const [msg, setMsg] = useState("");
  async function toggle(f: (typeof rows)[number]) {
    const r = await mutate(`/v1/flags/${f.id}`, { enabled: !f.enabled });
    if (!r.ok) return setMsg(errMsg(r.data));
    setRows(rows.map((x) => (x.id === f.id ? { ...x, enabled: !f.enabled } : x)));
    setMsg(`${f.name} ${!f.enabled ? "enabled" : "disabled"}. Change versioned and audited.`);
  }
  return (
    <div className="space-y-4">
      <div aria-live="polite">{msg && <Notice tone="gold">{msg}</Notice>}</div>
      <ul className="grid gap-4 md:grid-cols-2">
        {rows.map((f) => (
          <li key={f.id} className="card flex items-center justify-between gap-4 p-5">
            <div><p className="font-mono text-sm font-bold">{f.name}</p><p className="text-sm text-slate-700">{f.desc}</p><p className="mt-1 text-xs text-slate-600">Rollout: {f.rollout}</p></div>
            <button role="switch" aria-checked={f.enabled} aria-label={`${f.name} ${f.enabled ? "on" : "off"}`} disabled={!canWrite} onClick={() => toggle(f)} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${f.enabled ? "bg-gold" : "bg-slate-400"}`}>
              <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${f.enabled ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Break-glass, time-limited elevated access. */
export function BreakGlass({ canActivate }: { canActivate: boolean }) {
  const [just, setJust] = useState("");
  const [mfa, setMfa] = useState("");
  const [minutes, setMinutes] = useState("30");
  const [active, setActive] = useState<{ until: Date; pending: boolean } | null>(null);
  const [msg, setMsg] = useState("");

  async function go(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(mfa)) return setMsg("Enter your 6-digit MFA code.");
    const r = await mutate("/v1/breakglass", { justification: just, minutes: Number(minutes) });
    if (!r.ok) return setMsg(errMsg(r.data));
    setActive({ until: new Date(Date.now() + Number(minutes) * 60_000), pending: true });
    setMsg("Break-glass requested. A second approver must approve before access is granted; it then expires automatically.");
    setJust(""); setMfa("");
  }

  return (
    <Card title="Break-glass access (time-limited)" id="bg">
      <form onSubmit={go} className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-3"><label className="label" htmlFor="bg-j">Justification (recorded in audit log)</label><input id="bg-j" required className="field" value={just} onChange={(e) => setJust(e.target.value)} disabled={!canActivate} placeholder="Incident / ticket reference and reason" /></div>
        <div><label className="label" htmlFor="bg-m">Duration</label><select id="bg-m" className="field" value={minutes} onChange={(e) => setMinutes(e.target.value)} disabled={!canActivate}><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="60">60 minutes (max)</option></select></div>
        <div><label className="label" htmlFor="bg-c">MFA code</label><input id="bg-c" inputMode="numeric" autoComplete="one-time-code" className="field" value={mfa} onChange={(e) => setMfa(e.target.value)} disabled={!canActivate} placeholder="6 digits" /></div>
        <div className="flex items-end"><button className="btn btn-danger" disabled={!canActivate}>Request break-glass</button></div>
      </form>
      <div aria-live="polite" className="mt-3 space-y-2">
        {msg && <Notice tone="gold">{msg}</Notice>}
        {active && <p className="text-sm font-semibold text-red-800">Pending second approval. If approved, access ends at {active.until.toLocaleTimeString("en-GB", { timeZone: "Africa/Johannesburg" })} SAST.</p>}
      </div>
    </Card>
  );
}

/** Freeze / unfreeze card or method (client state; instructs provider via API when configured). */
export function MethodList({ methods }: { methods: { id: string; type: string; maskedDisplay: string; state: string }[] }) {
  const [rows, setRows] = useState(methods);
  async function toggle(m: (typeof rows)[number]) {
    const next = m.state === "frozen" ? "active" : "frozen";
    const r = await mutate(`/v1/methods/${m.id}/${next === "frozen" ? "freeze" : "unfreeze"}`, {});
    if (r.ok) setRows(rows.map((x) => (x.id === m.id ? { ...x, state: next } : x)));
  }
  return (
    <ul className="divide-y divide-slate-100">
      {rows.map((m) => (
        <li key={m.id} className="flex items-center justify-between gap-3 py-3">
          <div><p className="text-sm font-semibold">{m.maskedDisplay}</p><p className="text-xs capitalize text-slate-600">{m.type}</p></div>
          <div className="flex items-center gap-3"><Badge>{m.state}</Badge><button className="btn btn-ghost !px-3 !py-1" onClick={() => toggle(m)}>{m.state === "frozen" ? "Unfreeze" : "Freeze"}</button></div>
        </li>
      ))}
    </ul>
  );
}

export function Toggle({ label, defaultOn = false }: { label: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="text-sm font-medium">{label}</span>
      <button role="switch" aria-checked={on} aria-label={label} onClick={() => setOn(!on)} className={`relative h-7 w-12 rounded-full ${on ? "bg-gold" : "bg-slate-400"}`}>
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

export function Segmented({ options, children }: { options: string[]; children: (v: string) => ReactNode }) {
  const [v, setV] = useState(options[0]);
  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Environment" className="inline-flex rounded-xl bg-slate-200 p-1">
        {options.map((o) => (
          <button key={o} role="tab" aria-selected={v === o} onClick={() => setV(o)} className={`rounded-lg px-4 py-1.5 text-sm font-semibold capitalize ${v === o ? "bg-midnight text-white" : "text-slate-800"}`}>{o}</button>
        ))}
      </div>
      <div role="tabpanel">{children(v)}</div>
    </div>
  );
}

export function IntegrationConsole({ items, deliveries, canManage }: {
  items: { id: string; name: string; env: string; keyPrefix: string; lastRotated: string; webhookUrl: string; deliveryRatePct: number; errors24h: number; state: string }[];
  deliveries: { id: string; event: string; target: string; status: string; attempts: number; at: string }[];
  canManage: boolean;
}) {
  const [frozen, setFrozen] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState("");
  async function rotate(i: (typeof items)[number]) {
    const r = await mutate("/v1/keys/rotation-requests", { integrationId: i.id });
    setMsg(r.ok ? `Key rotation requested for ${i.name} (${i.env}). Secrets are rotated via the vault and never shown in plaintext; the new secret is displayed once on creation.` : errMsg(r.data));
  }
  return (
    <Segmented options={["production", "sandbox"]}>
      {(env) => (
        <div className="space-y-5">
          {env === "production" ? <Notice tone="red" title="Production environment">Changes here affect live payments and need dual approval where policy requires.</Notice> : <Notice tone="blue" title="Sandbox environment">Segregated credentials, tenants and rails. No real money moves.</Notice>}
          <div aria-live="polite">{msg && <Notice tone="gold">{msg}</Notice>}</div>
          <div className="grid gap-4 lg:grid-cols-2">
            {items.filter((i) => i.env === env).map((i) => {
              const state = frozen[i.id] ? "frozen" : i.state;
              return (
                <div key={i.id} className="card p-5">
                  <div className="flex items-start justify-between gap-2"><h3 className="font-bold">{i.name}</h3><Badge>{state}</Badge></div>
                  <dl className="mt-3 space-y-1 text-sm">
                    <div className="flex justify-between"><dt className="text-slate-600">API key (prefix only)</dt><dd className="font-mono text-xs">{i.keyPrefix}</dd></div>
                    <div className="flex justify-between"><dt className="text-slate-600">Last rotated</dt><dd>{i.lastRotated}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-slate-600">Webhook</dt><dd className="truncate font-mono text-xs">{i.webhookUrl}</dd></div>
                    <div className="flex justify-between"><dt className="text-slate-600">Delivery rate</dt><dd>{i.deliveryRatePct}%</dd></div>
                    <div className="flex justify-between"><dt className="text-slate-600">Errors (24h)</dt><dd>{i.errors24h}</dd></div>
                  </dl>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button className="btn btn-ghost !py-1" disabled={!canManage} onClick={() => rotate(i)}>Request key rotation</button>
                    {env === "production" && <button className="btn btn-danger !py-1" disabled={!canManage} onClick={() => setFrozen({ ...frozen, [i.id]: !frozen[i.id] })}>{state === "frozen" ? "Unfreeze" : "Freeze integration"}</button>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <caption className="p-4 text-left text-sm font-bold">Webhook deliveries and error log</caption>
              <thead className="bg-slate-50 text-xs uppercase text-slate-600"><tr>{["Event", "Target", "Result", "Attempts", "Time"].map((h) => <th scope="col" key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {deliveries.map((d) => <tr key={d.id}><td className="px-4 py-3 font-mono text-xs">{d.event}</td><td className="px-4 py-3">{d.target}</td><td className="px-4 py-3"><Badge tone={d.status === "200" ? "green" : "red"}>{d.status}</Badge></td><td className="px-4 py-3">{d.attempts}</td><td className="px-4 py-3">{formatDateTime(d.at)}</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Segmented>
  );
}
