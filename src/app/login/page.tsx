import type { Metadata } from "next";
import { Suspense } from "react";
import LoginForm from "@/components/LoginForm";
import { DEMO_USERS } from "@/lib/demo-users";
import { ROLE_LABEL } from "@/lib/rbac";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  const users = DEMO_USERS.map((u) => ({ email: u.email, name: u.name, role: ROLE_LABEL[u.role], blurb: u.blurb }));
  return (
    <div className="on-dark relative min-h-screen bg-midnight text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,165,58,0.18),transparent_55%)]" />
      <main id="main" className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-2">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-full.png" alt="FacePay" className="h-14 w-auto" />
          <h1 className="mt-8 text-3xl font-bold leading-tight sm:text-4xl">One login. <span className="bg-gold-gradient bg-clip-text text-transparent">Every portal.</span></h1>
          <p className="mt-4 max-w-md text-slate-300">Customers, merchants, operations and super users sign in here. You land in the portal your role allows, with the navigation and data your role is permitted to see.</p>
          <p className="mt-8 text-xs font-semibold tracking-[0.3em] text-gold-light">FACE YOUR MONEY</p>
        </div>
        <Suspense><LoginForm users={users} /></Suspense>
      </main>
    </div>
  );
}
