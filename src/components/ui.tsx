import type { ReactNode } from "react";
import Icon from "./Icon";
import type { Kpi } from "@/lib/types";

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-midnight sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-slate-600">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function PeriodPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></svg>
      <span>{label}</span>
      <Icon name="down" className="h-3.5 w-3.5" />
    </span>
  );
}

export function Card({ title, right, children, className = "", id }: { title?: string; right?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  const hid = id ? `${id}-h` : undefined;
  return (
    <section className={`card p-4 ${className}`} aria-labelledby={hid}>
      {(title || right) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 id={hid} className="text-sm font-bold text-midnight">{title}</h2>}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function Delta({ value, good = true }: { value: string; good?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${good ? "text-green-700" : "text-red-700"}`}>
      <Icon name="up" className={`h-4 w-4 ${good ? "" : "rotate-180"}`} />
      <span>{value}<span className="sr-only">{good ? " improvement" : " needs attention"}</span></span>
    </span>
  );
}

export function KpiCard({ kpi }: { kpi: Kpi }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium text-slate-600">{kpi.label}</p>
      <p className="mt-2 text-[23px] font-bold tracking-tight text-midnight">{kpi.value}</p>
      {kpi.delta && <div className="mt-2"><Delta value={kpi.delta} good={kpi.good} /></div>}
    </div>
  );
}

export function KpiGrid({ kpis, cols = 4 }: { kpis: Kpi[]; cols?: 3 | 4 | 5 | 6 }) {
  const c = { 3: "xl:grid-cols-3", 4: "xl:grid-cols-4", 5: "xl:grid-cols-5", 6: "xl:grid-cols-6" }[cols];
  return (
    <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${c}`}>
      {kpis.map((k) => <KpiCard key={k.label} kpi={k} />)}
    </div>
  );
}

const TONES: Record<string, string> = {
  green: "bg-green-100 text-green-900",
  amber: "bg-amber-100 text-amber-900",
  red: "bg-red-100 text-red-900",
  blue: "bg-blue-100 text-blue-900",
  slate: "bg-slate-100 text-slate-800",
  gold: "bg-[#FBEFCB] text-[#6B4E0E]",
};

const STATUS_TONE: Record<string, string> = {
  captured: "green", completed: "green", active: "green", verified: "green", healthy: "green", matched: "green", online: "green", approved: "green", resolved: "green", paid: "green", yes: "green", "on schedule": "green", closed: "green",
  authorised: "blue", "pending_approval": "amber", pending: "amber", onboarding: "amber", review: "amber", "under review": "amber", investigating: "amber", open: "amber", updating: "blue", invited: "blue", degraded: "amber", "half-open": "amber", "evidence requested": "amber", exception: "red", stale: "amber", "hold placed": "red",
  declined: "red", rejected: "red", denied: "red", suspended: "red", offline: "red", frozen: "red", escalated: "red", high: "red", medium: "amber", low: "slate", duplicate: "red", gap: "amber", "currency mismatch": "red", "amount mismatch": "amber", "stale batch": "amber",
  refunded: "slate", revoked: "slate", no: "slate", inactive: "slate",
};

export function Badge({ children, tone }: { children: ReactNode; tone?: keyof typeof TONES }) {
  const label = String(children);
  const t = tone ?? STATUS_TONE[label.toLowerCase()] ?? "slate";
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[t]}`}>{label.replace(/_/g, " ")}</span>;
}

export function Notice({ tone = "gold", title, children }: { tone?: "gold" | "blue" | "red"; title?: string; children: ReactNode }) {
  const c = { gold: "border-amber-300 bg-amber-50 text-amber-950", blue: "border-blue-200 bg-blue-50 text-blue-950", red: "border-red-300 bg-red-50 text-red-950" }[tone];
  return (
    <div role="note" className={`rounded-xl border px-4 py-3 text-sm ${c}`}>
      {title && <p className="font-bold">{title}</p>}
      <div>{children}</div>
    </div>
  );
}

export function BarList({ items, dark = false }: { items: { label: string; pct: number }[]; dark?: boolean }) {
  return (
    <ul className="space-y-3.5">
      {items.map((it, i) => (
        <li key={it.label} className="grid grid-cols-[88px_1fr_40px] items-center gap-3 text-sm">
          <span className="font-medium text-slate-800">{it.label}</span>
          <span className="h-3 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${it.label} ${it.pct}%`}>
            <span className="block h-full rounded-full" style={{ width: `${it.pct}%`, background: i === 0 && !dark ? "linear-gradient(90deg,#D4A53A,#081020)" : "linear-gradient(90deg,#F2CE6B,#D4A53A)" }} />
          </span>
          <span className="text-right text-slate-600">{it.pct}%</span>
        </li>
      ))}
    </ul>
  );
}

export function Meter({ pct, label }: { pct: number; label: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-medium text-slate-700"><span>{label}</span><span>{pct}%</span></div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="h-full rounded-full bg-gold-gradient" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-600">{label}</p>
      <p className="mt-0.5 text-lg font-bold text-midnight">{value}</p>
      {sub && <p className="text-xs text-slate-600">{sub}</p>}
    </div>
  );
}

export function VisaCard({ last4 = "1234", className = "" }: { last4?: string; className?: string }) {
  return (
    <div className={`portal-visa relative overflow-hidden rounded-xl p-5 text-white shadow-card ${className}`} role="img" aria-label={`FacePay virtual Visa card ending ${last4}`}>
      <div className="flex items-center justify-between">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-full.png" alt="" className="h-7 w-auto" />
        <span className="rounded bg-gold-gradient px-1.5 py-0.5 text-[10px] font-bold text-midnight">NFC</span>
      </div>
      <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-300">Virtual Card</p>
      <p className="mt-6 text-lg tracking-[0.25em] text-gold-light">•••• •••• •••• {last4}</p>
      <div className="mt-3 flex items-end justify-between">
        <span className="text-xs text-slate-300">Thabo Mokoena</span>
        <span className="text-2xl text-gold-light font-black italic tracking-tight">VISA</span>
      </div>
    </div>
  );
}
