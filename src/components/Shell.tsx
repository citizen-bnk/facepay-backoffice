"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import Icon from "./Icon";
import type { NavItem } from "@/lib/rbac";
import type { PortalId } from "@/lib/types";

interface Props {
  portal: PortalId;
  title: string;
  subtitle: string;
  nav: NavItem[];
  user: { name: string; roleLabel: string; initials: string };
  switchTo: { portal: PortalId; label: string; href: string }[];
  readOnly: boolean;
  tenantLabel?: string;
  dataSource: string;
  children: ReactNode;
}

export default function Shell({ portal, title, subtitle, nav, user, switchTo, readOnly, tenantLabel, dataSource, children }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const base = `/${portal}`;

  const links = (
    <nav aria-label={`${title} navigation`} className="flex-1 overflow-y-auto px-3 py-2">
      <ul className="space-y-1">
        {nav.map((item) => {
          const href = item.slug ? `${base}/${item.slug}` : base;
          const active = item.slug ? pathname === href || pathname.startsWith(href + "/") : pathname === base;
          return (
            <li key={item.slug || "home"}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${active ? "bg-white text-midnight shadow" : "text-slate-200 hover:bg-white/10"}`}
              >
                <Icon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  const sidebar = (
    <div className="portal-sidebar on-dark flex h-full flex-col bg-gradient-to-b from-[#0D1A30] to-midnight text-white">
      <div className="px-5 pb-3 pt-5">
        <Image src="/logo-full.png" alt="FacePay" width={150} height={40} className="h-8 w-auto" priority />
        <p className="mt-1 text-[11px] font-medium text-slate-300">{subtitle}</p>
      </div>
      {links}
      <div className="border-t border-white/10 p-4 text-[11px] text-slate-300">
        {switchTo.length > 0 && (
          <div className="mb-3 space-y-1">
            {switchTo.map((s) => <Link key={s.portal} href={s.href} className="block rounded px-2 py-1 font-semibold text-gold-light hover:bg-white/10">Switch to {s.label}</Link>)}
          </div>
        )}
        <p>FACE YOUR MONEY</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[208px_1fr]">
      <aside className="sticky top-0 hidden h-screen lg:block">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <button className="absolute inset-0 bg-black/60" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="relative h-full w-72 max-w-[85%]">{sidebar}</div>
        </div>
      )}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
          <button className="rounded-lg p-2 text-midnight hover:bg-slate-100 lg:hidden" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>
            <Icon name="menu" />
          </button>
          <div className="min-w-0 flex-1 text-sm font-semibold text-midnight lg:hidden">{title}</div>
          <div className="hidden flex-1 lg:block" />
          {readOnly && <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">Read-only</span>}
          {tenantLabel && (
            <span className="hidden items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-800 sm:inline-flex">
              {tenantLabel}<Icon name="down" className="h-3.5 w-3.5" />
            </span>
          )}
          {(portal === "admin" || portal === "super") && <Icon name="search" className="hidden h-5 w-5 text-slate-600 sm:block" />}
          <button className="rounded-lg p-2 text-slate-700 hover:bg-slate-100" aria-label="Notifications"><Icon name="bell" /></button>
          <details className="relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg p-1 hover:bg-slate-100" aria-label={`Account menu for ${user.name}`}>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-gold-gradient text-xs font-bold text-midnight">{user.initials}</span>
              <span className="hidden text-left leading-tight sm:block">
                <span className="block text-xs font-semibold text-midnight">{user.name}</span>
                <span className="block text-[11px] text-slate-600">{user.roleLabel}</span>
              </span>
              <Icon name="down" className="h-4 w-4 text-slate-600" />
            </summary>
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
              <p className="px-3 py-1 text-xs text-slate-600">Signed in as {user.roleLabel}</p>
              <form action="/api/auth/logout" method="post">
                <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-midnight hover:bg-slate-100"><Icon name="logout" className="h-4 w-4" />Sign out</button>
              </form>
            </div>
          </details>
        </header>
        <main id="main" className="mx-auto max-w-[1280px] px-4 py-5 sm:px-5" tabIndex={-1}>
          {children}
          <footer className="mt-10 border-t border-slate-200 pt-4 text-xs text-slate-600">
            FACEPAY | FACE YOUR MONEY. {dataSource} Balances shown are sourced from the named provider; FacePay does not hold funds. No raw biometric data is ever displayed.
          </footer>
        </main>
      </div>
    </div>
  );
}
