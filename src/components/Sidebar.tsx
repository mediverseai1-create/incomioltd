'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Logo } from './ui';

export const NAV = [
  ['Overview', '/app'], ['Receivables', '/app/receivables'], ['Invoices', '/app/invoices'], ['Payments', '/app/payments'],
  ['Reconciliation', '/app/reconciliation'], ['Cash Flow', '/app/cash-flow'], ['Collections', '/app/collections'], ['Customers', '/app/customers'],
  ['Profitability', '/app/profitability'], ['Business Units', '/app/business-units'], ['Financial Insights', '/app/insights'], ['Ask Incomio', '/app/ask'],
  ['Reports', '/app/reports'], ['AI Agents', '/app/agents'], ['Data & Integrations', '/app/data'], ['Team & Permissions', '/app/team'],
  ['Usage & Billing', '/app/billing'], ['Settings', '/app/settings'],
] as const;

export function Sidebar({ org, email }: { org: string; email: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const nav = (
    <nav className="flex-1 overflow-y-auto px-3 py-2" aria-label="Main">
      {NAV.map(([label, href]) => {
        const active = href === '/app' ? path === '/app' : path.startsWith(href);
        return (
          <Link key={href} href={href} onClick={() => setOpen(false)}
            className={`mb-0.5 block rounded-md px-3 py-1.5 text-sm ${active ? 'bg-cream-50/15 font-medium text-amber' : 'text-cream-200 hover:bg-cream-50/10'}`}>{label}</Link>
        );
      })}
    </nav>
  );
  return (
    <>
      <div className="flex items-center justify-between bg-wine px-4 py-3 lg:hidden">
        <Logo light href="/app" />
        <button className="text-cream-50" aria-label="Toggle menu" onClick={() => setOpen(!open)}>{open ? 'Close' : 'Menu'}</button>
      </div>
      <aside className={`${open ? 'flex' : 'hidden'} fixed inset-x-0 top-12 bottom-0 z-40 flex-col bg-wine lg:static lg:flex lg:w-60 lg:shrink-0`}>
        <div className="hidden px-5 py-5 lg:block"><Logo light href="/app" /></div>
        <div className="px-5 pb-2 text-xs uppercase tracking-wide text-cream-200/70">{org}</div>
        {nav}
        <div className="border-t border-cream-50/10 p-4 text-xs text-cream-200">
          <div className="truncate">{email}</div>
          <form action="/auth/signout" method="post"><button className="mt-1 underline">Sign out</button></form>
        </div>
      </aside>
    </>
  );
}
