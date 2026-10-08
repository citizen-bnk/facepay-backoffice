"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface U { email: string; name: string; role: string; blurb: string }

export default function LoginForm({ users }: { users: U[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState(users[0]?.email ?? "");
  const [password, setPassword] = useState("facepay-demo");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e?: React.FormEvent, creds?: { email: string; password: string }) {
    e?.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(creds ?? { email, password }) });
      const j = await res.json();
      if (!res.ok) {
        setError(j?.error?.message ?? "Sign in failed");
        setBusy(false);
        return;
      }
      const next = params.get("next");
      router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : j.redirect);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-midnight-800/80 p-6 shadow-2xl backdrop-blur sm:p-8">
      <h2 className="text-xl font-bold">Sign in</h2>
      <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="mb-1 block text-xs font-semibold text-slate-200">Email</label>
          <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className="field !border-slate-500 !bg-midnight !text-white" />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-xs font-semibold text-slate-200">Password</label>
          <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="field !border-slate-500 !bg-midnight !text-white" />
        </div>
        {error && <p role="alert" className="rounded-lg bg-red-950 px-3 py-2 text-sm text-red-100">{error}</p>}
        <button type="submit" disabled={busy} className="btn btn-gold w-full py-3">{busy ? "Signing in…" : "Sign in"}</button>
      </form>

      <fieldset className="mt-6">
        <legend className="text-xs font-bold uppercase tracking-wider text-gold-light">Demo users (password: facepay-demo)</legend>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {users.map((u) => (
            <li key={u.email}>
              <button
                type="button"
                onClick={() => { setEmail(u.email); setPassword("facepay-demo"); void submit(undefined, { email: u.email, password: "facepay-demo" }); }}
                aria-pressed={email === u.email}
                className={`h-full w-full rounded-xl border p-3 text-left text-sm transition-colors hover:border-gold ${email === u.email ? "border-gold bg-white/10" : "border-white/15"}`}
              >
                <span className="block font-semibold">{u.name}</span>
                <span className="block text-xs text-gold-light">{u.role}</span>
                <span className="block text-[11px] text-slate-300">{u.email}</span>
              </button>
            </li>
          ))}
        </ul>
      </fieldset>
    </div>
  );
}
