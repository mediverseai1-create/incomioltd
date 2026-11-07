import Link from 'next/link';
import Decimal from 'decimal.js';
import { fmtMoney } from '@/lib/money';

export function Logo({ light = false, href = '/' }: { light?: boolean; href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2" aria-label="Incomio home">
      <span className={`flex h-7 w-7 items-center justify-center rounded-md font-display text-lg ${light ? 'bg-amber text-wine' : 'bg-wine text-amber'}`}>i</span>
      <span className={`font-display text-xl font-semibold ${light ? 'text-cream-50' : 'text-wine'}`}>Incomio</span>
    </Link>
  );
}

export function PageHeader({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-3xl font-semibold text-wine">{title}</h1>{sub && <p className="mt-1 max-w-2xl text-sm text-ink-600">{sub}</p>}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function Card({ title, children, className = '', action }: { title?: string; children: React.ReactNode; className?: string; action?: React.ReactNode }) {
  return (
    <section className={`card rise ${className}`}>
      {title && <div className="flex items-center justify-between border-b border-cream-200 px-4 py-3"><h2 className="text-base font-semibold text-ink">{title}</h2>{action}</div>}
      <div className="p-4">{children}</div>
    </section>
  );
}

const tones = { wine: 'text-wine', green: 'text-forest', terra: 'text-terra-700', ink: 'text-ink' } as const;
export function Stat({ label, value, hint, tone = 'ink' }: { label: string; value: string; hint?: string; tone?: keyof typeof tones }) {
  return (
    <div className="card rise p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-ink-600">{label}</div>
      <div className={`num mt-1 font-display text-2xl font-semibold ${tones[tone]}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-ink-400">{hint}</div>}
    </div>
  );
}

const badge = {
  neutral: 'bg-cream text-ink-600', good: 'bg-emerald-100 text-forest', warn: 'bg-amber/25 text-amber-900 text-[#7a5112]', bad: 'bg-red-100 text-red-800', info: 'bg-wine/10 text-wine',
} as const;
export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: keyof typeof badge }) {
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${badge[tone]}`}>{children}</span>;
}
export const statusTone = (s: string) => (['paid', 'approved', 'done', 'active', 'connected', 'high_conf'].includes(s) ? 'good' : ['overdue', 'rejected', 'high', 'unpaid', 'failed', 'past_due'].includes(s) ? 'bad' : ['partial', 'pending', 'medium', 'investigate', 'draft', 'in_progress'].includes(s) ? 'warn' : 'neutral') as keyof typeof badge;

export function Empty({ title, body, cta }: { title: string; body: string; cta?: { href: string; label: string } }) {
  return (
    <div className="rounded-lg border border-dashed border-cream-200 bg-cream-50 px-6 py-10 text-center">
      <h3 className="text-lg text-wine">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-ink-600">{body}</p>
      {cta && <Link href={cta.href} className="btn btn-primary mt-4">{cta.label}</Link>}
    </div>
  );
}

export function Money({ v, c }: { v: Decimal.Value; c: string }) { return <span className="num">{fmtMoney(v, c)}</span>; }

export function Table({ head, children, empty }: { head: string[]; children: React.ReactNode; empty?: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse">
        <thead className="border-b border-cream-200 bg-cream-50"><tr>{head.map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-cream-200">{children}</tbody>
      </table>
      {empty}
    </div>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warn'; children: React.ReactNode }) {
  return <div className={`mb-4 rounded-md border px-4 py-3 text-sm ${tone === 'warn' ? 'border-amber bg-amber/10 text-[#6b4710]' : 'border-wine/20 bg-wine/5 text-wine'}`}>{children}</div>;
}

export function TotalsLine({ totals, pick }: { totals: { currency: string; [k: string]: any }[]; pick: string }) {
  if (!totals.length) return <span className="num">—</span>;
  return <>{totals.map((t) => <div key={t.currency}><Money v={t[pick]} c={t.currency} /></div>)}</>;
}
