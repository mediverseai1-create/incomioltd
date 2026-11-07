import Link from 'next/link';
import Decimal from 'decimal.js';
import { getView } from '@/lib/view';
import { fmtMoney } from '@/lib/money';
import { BUCKETS } from '@/lib/calc/finance';
import { PageHeader, Card, Stat, Empty, Table, Money, Badge, statusTone } from '@/components/ui';
import { Bars, Lines } from '@/components/charts';

export const metadata = { title: 'Overview' };

export default async function Overview({ searchParams }: { searchParams: Promise<{ cur?: string }> }) {
  const v = await getView();
  const sp = await searchParams;
  if (v.f.invoices.length === 0 && v.f.payments.length === 0) {
    return (
      <>
        <PageHeader title={`Welcome, ${v.org.name}`} sub="Your dashboard fills with real figures as soon as you import financial data." />
        <Empty title="Upload your first financial data" body="Import customers, invoices and payments from CSV, XLSX or PDF. Incomio will calculate receivables, aging and collection priorities from your records — nothing is shown until you add data."
          cta={{ href: '/app/data', label: 'Import data' }} />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[['1. Import', 'Map columns, validate and preview before saving.'], ['2. Reconcile', 'Review suggested invoice-to-payment matches.'], ['3. Act', 'Prioritise collections and forecast cash flow.']].map(([t, b]) => <Card key={t}><h3 className="text-lg text-wine">{t}</h3><p className="mt-1 text-sm text-ink-600">{b}</p></Card>)}
        </div>
      </>
    );
  }
  const cur = sp.cur && v.totals.some((t) => t.currency === sp.cur) ? sp.cur : (v.totals.find((t) => t.currency === v.org.primary_currency) ?? v.totals[0])?.currency ?? v.org.primary_currency;
  const t = v.totals.find((x) => x.currency === cur);
  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  const expected = v.views.filter((i) => i.currency === cur && i.outstanding.gt(0) && i.due_date && i.due_date >= today && i.due_date <= in30).reduce((s, i) => s.plus(i.outstanding), new Decimal(0));
  const { count: pendingRecon } = await v.supabase.from('reconciliation_matches').select('id', { count: 'exact', head: true }).eq('organization_id', v.org.id).eq('status', 'pending');
  const dueFollowUps = v.f.activities.filter((a: any) => a.status === 'open' && a.follow_up_date && a.follow_up_date <= today).length;
  const { data: insights } = await v.supabase.from('financial_insights').select('id,title,severity,category').eq('organization_id', v.org.id).eq('review_status', 'new').order('created_at', { ascending: false }).limit(4);

  const aging = BUCKETS.map((b) => ({ name: b === 'not_due' ? 'Not due' : b + ' days', Outstanding: Number(t?.aging[b].toFixed(2) ?? 0) }));
  const byMonth = new Map<string, number>();
  for (const p of v.f.payments.filter((p: any) => p.currency === cur)) byMonth.set(p.payment_date.slice(0, 7), (byMonth.get(p.payment_date.slice(0, 7)) ?? 0) + Number(p.amount));
  const trend = [...byMonth.entries()].sort().slice(-12).map(([name, Collected]) => ({ name, Collected: Number(Collected.toFixed(2)) }));
  const top = v.priorities.filter((p) => p.currency === cur).slice(0, 6);
  const recent = [...v.f.payments].sort((a: any, b: any) => b.payment_date.localeCompare(a.payment_date)).slice(0, 6);

  return (
    <>
      <PageHeader title="Overview" sub={`${v.org.name} · figures are calculated from your records, per currency.`}>
        {v.totals.length > 1 && v.totals.map((x) => <Link key={x.currency} href={`/app?cur=${x.currency}`} className={`btn ${x.currency === cur ? 'btn-primary' : 'btn-ghost'}`}>{x.currency}</Link>)}
      </PageHeader>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Total receivables" value={fmtMoney(t?.outstanding ?? 0, cur)} hint="Invoiced minus confirmed payments" tone="wine" />
        <Stat label="Overdue receivables" value={fmtMoney(t?.overdue ?? 0, cur)} tone="terra" />
        <Stat label="Collected income" value={fmtMoney(t?.collected ?? 0, cur)} hint={t?.collectionRate ? `${t.collectionRate.times(100).toFixed(1)}% of invoiced` : undefined} tone="green" />
        <Stat label="Due in next 30 days" value={fmtMoney(expected, cur)} hint="Outstanding on invoices falling due — not a guarantee" />
        <Stat label="Reconciliation to review" value={String(pendingRecon ?? 0)} hint="Suggested matches awaiting approval" />
        <Stat label="Follow-ups due" value={String(dueFollowUps)} hint="Logged collection follow-ups" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title={`Receivables aging (${cur})`}><Bars data={aging} keys={['Outstanding']} /></Card>
        <Card title={`Payments received by month (${cur})`}>{trend.length ? <Lines data={trend} keys={['Collected']} /> : <p className="text-sm text-ink-600">No payments recorded yet.</p>}</Card>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Priority collections" action={<Link href="/app/collections" className="text-sm text-wine underline">All</Link>}>
          {top.length ? <Table head={['Customer', 'Overdue', 'Score']}>{top.map((p) => <tr key={p.customerId + p.currency}><td className="td">{v.custName.get(p.customerId)}</td><td className="td"><Money v={p.overdue} c={p.currency} /></td><td className="td"><Badge tone={statusTone(p.level)}>{p.score}</Badge></td></tr>)}</Table> : <p className="text-sm text-ink-600">No outstanding customer balances.</p>}
        </Card>
        <Card title="Recent payments" action={<Link href="/app/payments" className="text-sm text-wine underline">All</Link>}>
          {recent.length ? <Table head={['Date', 'Customer', 'Amount']}>{recent.map((p: any) => <tr key={p.id}><td className="td">{p.payment_date}</td><td className="td">{v.custName.get(p.customer_id) ?? '—'}</td><td className="td"><Money v={p.amount} c={p.currency} /></td></tr>)}</Table> : <p className="text-sm text-ink-600">No payments yet.</p>}
        </Card>
        <Card title="Recent insights" action={<Link href="/app/insights" className="text-sm text-wine underline">All</Link>}>
          {insights?.length ? <ul className="space-y-2 text-sm">{insights.map((i) => <li key={i.id} className="flex items-center gap-2"><Badge tone={statusTone(i.severity)}>{i.severity}</Badge>{i.title}</li>)}</ul> : <p className="text-sm text-ink-600">No insights yet. Run an agent from <Link className="underline" href="/app/agents">AI Agents</Link>.</p>}
        </Card>
      </div>
      <p className="mt-6 text-xs text-ink-400">Incomio provides analytical assistance and is not accounting advice. Estimates are not guaranteed outcomes.</p>
    </>
  );
}
