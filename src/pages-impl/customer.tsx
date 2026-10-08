import Link from "next/link";
import type { ReactNode } from "react";
import DataTable from "@/components/DataTable";
import Icon from "@/components/Icon";
import { ActionForm, ConsentPanel, MethodList, Toggle } from "@/components/Interactive";
import { Badge, Card, Notice, PageHeader, VisaCard } from "@/components/ui";
import { getConsents, getTransactions, getWallet } from "@/lib/data";
import { customerDisputes, statements } from "@/lib/fixtures";
import { formatDateTime, formatMoney, formatRelativeDay } from "@/lib/format";
import type { Session } from "@/lib/session";
import { TX_COLS, txRows } from "./shared";

const AVATAR = ["bg-red-100 text-red-700", "bg-green-100 text-green-700", "bg-green-100 text-green-700", "bg-green-100 text-green-700"];

function QuickAction({ label, icon, href }: { label: string; icon: string; href: string }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-2 text-xs font-semibold text-slate-800">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-gold-gradient text-midnight shadow"><Icon name={icon} className="h-5 w-5" /></span>
      {label}
    </Link>
  );
}

async function overview(s: Session) {
  const w = await getWallet(s);
  return (
    <>
      <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <div className="space-y-5">
          <h1 className="rounded-xl bg-slate-100 px-5 py-3 text-lg font-bold text-midnight">My Money</h1>
          <Card>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600">Available Balance</p>
                <p className="mt-1 text-3xl font-bold text-midnight" data-testid="balance">{formatMoney(w.availableBalanceMinor)}</p>
                <p className="mt-1 text-xs text-slate-600">Sourced from {w.provider}. FacePay does not hold these funds.</p>
              </div>
              <Icon name="eye" className="h-5 w-5 text-gold-text" />
            </div>
            <div className="mt-5 grid grid-cols-4 gap-2 border-t border-slate-100 pt-5">
              <QuickAction label="Pay" icon="scan" href="/customer/payments" />
              <QuickAction label="Transfer" icon="swap" href="/customer/transfers" />
              <QuickAction label="Top Up" icon="plus" href="/customer/my-money" />
              <QuickAction label="Request" icon="down" href="/customer/transfers" />
            </div>
          </Card>
          <Card title="Recent Transactions" id="recent" right={<Link href="/customer/payments" className="text-xs font-semibold text-blue-800 underline">View all</Link>}>
            <ul className="divide-y divide-slate-100">
              {w.recent.slice(0, 4).map((t, i) => (
                <li key={t.id} className="flex items-center gap-3 py-3.5">
                  <span className={`grid h-8 w-8 place-items-center rounded-lg text-xs font-bold ${AVATAR[i % 4]}`} aria-hidden>{t.merchantName[0]}</span>
                  <span className="flex-1 text-sm font-semibold text-slate-900">{t.merchantName}</span>
                  <span className="text-right">
                    <span className="block text-sm font-bold text-red-700">{formatMoney(-t.amountMinor)}</span>
                    <span className="block text-[11px] text-slate-600">{formatRelativeDay(t.createdAt)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <div className="space-y-5">
          <section className="on-dark relative overflow-hidden rounded-2xl bg-gradient-to-br from-ink via-midnight-800 to-[#3a2b0c] p-6 text-white shadow-card" aria-labelledby="getmore">
            <div aria-hidden className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-gold/30 blur-3xl" />
            <h2 id="getmore" className="relative text-lg font-bold">Get More with FacePay</h2>
            <p className="relative mt-2 max-w-xs text-sm text-slate-200">Use your face to pay everywhere. Fast. Secure. Rewarding.</p>
            <Link href="/customer/consent" className="relative mt-5 inline-block rounded-lg border border-gold/60 px-4 py-2 text-xs font-semibold text-gold-light hover:bg-white/10">Learn More</Link>
          </section>
          <Card title="Your Cards" id="cards">
            <VisaCard />
            <Link href="/customer/linked" className="btn btn-ghost mt-4 w-full bg-slate-50">Manage Cards</Link>
          </Card>
        </div>
      </div>
    </>
  );
}

async function myMoney(s: Session) {
  const w = await getWallet(s);
  const tx = await getTransactions(s, "customer");
  const spent = tx.filter((t) => t.status === "captured").reduce((a, t) => a + t.amountMinor, 0);
  return (
    <>
      <PageHeader title="Balances & Activity" subtitle="Balances are shown exactly as returned by your authorised provider." />
      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Available balance"><p className="text-2xl font-bold">{formatMoney(w.availableBalanceMinor)}</p><p className="mt-1 text-xs text-slate-600">Source: {w.provider}</p></Card>
        <Card title="Spent (captured, last 28 days)"><p className="text-2xl font-bold">{formatMoney(spent)}</p></Card>
        <Card title="Pending provider confirmation"><p className="text-2xl font-bold">{tx.filter((t) => t.status === "pending" || t.status === "authorised").length}</p><p className="mt-1 text-xs text-slate-600">Not shown as paid until the provider confirms.</p></Card>
      </div>
      <div className="mt-5"><Notice tone="blue" title="Notices">Provider statement data may lag by a few minutes. Refunds appear after asynchronous provider confirmation.</Notice></div>
      <h2 className="mb-3 mt-6 text-base font-bold">Latest activity</h2>
      <DataTable caption="Latest activity" columns={TX_COLS.slice(0, 6)} rows={txRows(tx).slice(0, 10)} filterKey="status" exportName="my-activity" pageSize={10} />
    </>
  );
}

async function linked(s: Session) {
  const w = await getWallet(s);
  return (
    <>
      <PageHeader title="Linked Accounts & Cards" subtitle="Funding methods linked through provider-authorised flows. FacePay stores tokens, never full card numbers." />
      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <Card title="Linked methods" id="methods"><MethodList methods={w.methods} /><p className="mt-4 text-xs text-slate-600">Linking a new account redirects to your provider to authorise. This portal never sees your credentials.</p></Card>
        <div className="space-y-4"><VisaCard /><Notice tone="blue">Add to Apple Wallet / Google Wallet is available in the FacePay mobile app.</Notice></div>
      </div>
    </>
  );
}

async function payments(s: Session) {
  const tx = await getTransactions(s, "customer");
  return (
    <>
      <PageHeader title="Payments" subtitle="Every payment with provider-confirmed status. Select a row for the timeline and to raise a dispute." />
      <DataTable caption="Payments" columns={TX_COLS} rows={txRows(tx)} filterKey="status" detailTitleKey="merchantName" exportName="payments" detailNote="To dispute this payment, go to Disputes and select this transaction." />
    </>
  );
}

async function transfers(s: Session) {
  const tx = await getTransactions(s, "customer");
  return (
    <>
      <PageHeader title="Transfers" subtitle="Transfers are instructed to your provider. They are shown as pending until the provider confirms." />
      <div className="grid gap-5 lg:grid-cols-2">
        <ActionForm title="New transfer" endpoint="/v1/transfers" submitLabel="Submit for provider confirmation" success="Transfer submitted. It is NOT complete until your provider confirms"
          fields={[{ name: "payee", label: "Payee name or phone", required: true }, { name: "reference", label: "Reference" }, { name: "amount", label: "Amount (R)", type: "number" }, { name: "from", label: "From", type: "select", options: ["FacePay Virtual Card ••1234", "Cheque account ••7781"] }]}
          transform={(v) => ({ ...v, amountMinor: Math.round(parseFloat(v.amount) * 100), currency: "ZAR" })} />
        <Card title="Recent transfers" id="rt">
          <ul className="divide-y divide-slate-100 text-sm">
            {tx.slice(4, 8).map((t) => <li key={t.id} className="flex items-center justify-between py-3"><span>{t.merchantName}<span className="block text-xs text-slate-600">{formatDateTime(t.createdAt)}</span></span><span className="text-right">{formatMoney(t.amountMinor)}<span className="block"><Badge>{t.status}</Badge></span></span></li>)}
          </ul>
        </Card>
      </div>
    </>
  );
}

function statementsPage(): ReactNode {
  const st = statements();
  return (
    <>
      <PageHeader title="Statements" subtitle="Download your statements. Balances are attributed to the named provider." />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <caption className="sr-only">Monthly statements</caption>
          <thead className="bg-slate-50 text-xs uppercase text-slate-600"><tr>{["Period", "Opening", "Closing", "Items", "Export"].map((h) => <th scope="col" key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {st.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-semibold">{r.period}</td>
                <td className="px-4 py-3 tabular-nums">{formatMoney(r.opening)}</td>
                <td className="px-4 py-3 tabular-nums">{formatMoney(r.closing)}</td>
                <td className="px-4 py-3">{r.items}</td>
                <td className="px-4 py-3"><div className="flex gap-2">
                  <a className="btn btn-ghost !px-3 !py-1" href={`/api/export/statement?period=${r.id}&format=csv`} download>CSV<span className="sr-only"> for {r.period}</span></a>
                  <a className="btn btn-ghost !px-3 !py-1" href={`/api/export/statement?period=${r.id}&format=pdf`} download>PDF<span className="sr-only"> for {r.period}</span></a>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

async function disputes(s: Session) {
  const tx = await getTransactions(s, "customer");
  const d = customerDisputes();
  return (
    <>
      <PageHeader title="Disputes" subtitle="Raise and track disputes. Evidence access is minimised." />
      <div className="grid gap-5 lg:grid-cols-2">
        <ActionForm title="Raise a dispute" endpoint="/v1/disputes" submitLabel="Submit dispute" success="Dispute submitted"
          fields={[{ name: "transactionId", label: "Transaction", type: "select", options: tx.slice(0, 12).map((t) => t.id) }, { name: "reason", label: "Reason", type: "select", options: ["Not recognised", "Amount differs", "Duplicate charge", "Goods or services not received"] }, { name: "details", label: "Details", type: "textarea", required: false }]} />
        <Card title="My disputes" id="md">
          <ul className="divide-y divide-slate-100 text-sm">
            {d.map((x) => <li key={x.id} className="flex items-center justify-between py-3"><span><span className="font-semibold">{x.reason}</span><span className="block font-mono text-xs text-slate-600">{x.id} · {x.transactionId} · {formatDateTime(x.opened)}</span></span><Badge>{x.state}</Badge></li>)}
          </ul>
        </Card>
      </div>
    </>
  );
}

async function consent(s: Session) {
  const c = await getConsents(s);
  return (<><PageHeader title="Biometric Consent" subtitle="See what you agreed to and revoke it at any time." /><ConsentPanel initial={c} /></>);
}

function settings(s: Session) {
  return (
    <>
      <PageHeader title="Settings" subtitle="Profile, notifications and security." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Profile" id="prof"><dl className="space-y-2 text-sm"><div className="flex justify-between"><dt className="text-slate-600">Name</dt><dd>{s.user.name}</dd></div><div className="flex justify-between"><dt className="text-slate-600">Email</dt><dd>{s.user.email}</dd></div><div className="flex justify-between"><dt className="text-slate-600">Verification</dt><dd><Badge>verified</Badge></dd></div></dl></Card>
        <Card title="Notifications" id="notif"><div className="divide-y divide-slate-100"><Toggle label="Payment receipts" defaultOn /><Toggle label="Security alerts" defaultOn /><Toggle label="Marketing" /></div></Card>
        <Card title="Security" id="sec"><div className="divide-y divide-slate-100"><Toggle label="Require step-up for payments above R 1,500" defaultOn /><Toggle label="Passkey sign-in" defaultOn /></div></Card>
        <Card title="Your data (POPIA)" id="popia"><p className="text-sm text-slate-700">Request a copy of your data, correction or deletion. Requests are answered within the statutory period.</p><div className="mt-3 flex gap-2"><button className="btn btn-ghost">Request data export</button><button className="btn btn-danger">Request deletion</button></div></Card>
      </div>
    </>
  );
}

function help() {
  const faq = [
    ["Why does my payment show pending?", "A payment is only shown as paid after your provider confirms it. Pending items usually clear within minutes."],
    ["Can I pay without biometrics?", "Yes. Card, QR, NFC and PIN alternatives are always available."],
    ["How do I revoke biometric consent?", "Open Biometric Consent and choose Revoke. Future biometric challenges stop immediately."],
    ["Who holds my money?", "Your provider. FacePay shows balances reported by them and does not hold funds."],
  ];
  return (
    <>
      <PageHeader title="Help" subtitle="Answers and ways to reach us." />
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Card title="Frequently asked questions" id="faq">{faq.map(([q, a]) => <details key={q} className="border-b border-slate-100 py-3"><summary className="cursor-pointer text-sm font-semibold">{q}</summary><p className="mt-2 text-sm text-slate-700">{a}</p></details>)}</Card>
        <ActionForm title="Contact support" endpoint="/v1/tickets" submitLabel="Send" success="Message sent" fields={[{ name: "subject", label: "Subject" }, { name: "message", label: "Message", type: "textarea" }]} />
      </div>
    </>
  );
}

export const customerPages = {
  "": overview,
  "my-money": myMoney,
  linked,
  payments,
  transfers,
  statements: statementsPage,
  disputes,
  consent,
  settings,
  help,
};
