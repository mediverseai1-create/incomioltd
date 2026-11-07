import Link from 'next/link';
import Decimal from 'decimal.js';
import { notFound } from 'next/navigation';
import { getView } from '@/lib/view';
import { fmtMoney } from '@/lib/money';
import { ApiButton } from '@/components/forms';
import { PageHeader, Card, Stat, Table, Money, Badge, statusTone } from '@/components/ui';

export default async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await getView();
  const c = (v.f.customers as any[]).find((x) => x.id === id);
  if (!c) notFound();
  const invs = v.views.filter((i) => i.customer_id === id);
  const pays = (v.f.payments as any[]).filter((p) => p.customer_id === id).sort((a, b) => b.payment_date.localeCompare(a.payment_date));
  const acts = (v.f.activities as any[]).filter((a) => a.customer_id === id).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const d = v.delays.get(id);
  const byCur = [...new Set(invs.map((i) => i.currency))].map((cur) => {
    const rows = invs.filter((i) => i.currency === cur && i.status !== 'void');
    return { cur, invoiced: rows.reduce((s, i) => s.plus(i.amount), new Decimal(0)), out: rows.reduce((s, i) => s.plus(i.outstanding), new Decimal(0)), collected: rows.reduce((s, i) => s.plus(i.paid), new Decimal(0)) };
  });
  const { data: obs } = await v.supabase.from('financial_insights').select('id,title,explanation,confidence,created_at').eq('organization_id', v.org.id).eq('agent_key', `customer:${id}`).order('created_at', { ascending: false }).limit(3);
  return (
    <>
      <PageHeader title={c.name} sub={[c.email, c.phone].filter(Boolean).join(' · ') || 'No contact information'}><Link href="/app/customers" className="btn btn-ghost">Back</Link></PageHeader>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {byCur.map((b) => <Stat key={b.cur} label={`Outstanding (${b.cur})`} value={fmtMoney(b.out, b.cur)} hint={`Invoiced ${fmtMoney(b.invoiced, b.cur)} · collected ${fmtMoney(b.collected, b.cur)}`} tone="wine" />)}
        <Stat label="Average payment timing" value={d ? `${d.avgDelay > 0 ? '+' : ''}${d.avgDelay.toFixed(1)} days` : 'n/a'} hint={d ? `Based on ${d.samples} confirmed payments · late ${(d.lateRate * 100).toFixed(0)}%` : 'No confirmed payments yet'} />
      </div>
      <Card title="AI observations" className="mt-4" action={<ApiButton url="/api/ai/customer" body={{ customerId: id }} label="Generate observations" />}>
        {obs?.length ? obs.map((o) => <div key={o.id} className="mb-3 text-sm"><div className="font-medium">{o.title}</div><p className="text-ink-600">{o.explanation}</p></div>) : <p className="text-sm text-ink-600">None yet. Observations are generated from this customer&apos;s calculated figures.</p>}
      </Card>
      <Card title="Invoices" className="mt-4">
        {invs.length ? <Table head={['Invoice', 'Due', 'Amount', 'Outstanding', 'Status']}>{invs.map((i) => <tr key={i.id}><td className="td"><Link className="underline" href={`/app/invoices/${i.id}`}>{i.reference}</Link></td><td className="td">{i.due_date ?? '—'}</td><td className="td"><Money v={i.amount} c={i.currency} /></td><td className="td"><Money v={i.outstanding} c={i.currency} /></td><td className="td"><Badge tone={statusTone(i.paymentStatus)}>{i.paymentStatus}</Badge></td></tr>)}</Table> : <p className="text-sm text-ink-600">No invoices.</p>}
      </Card>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Payments">{pays.length ? <Table head={['Date', 'Reference', 'Amount']}>{pays.map((p) => <tr key={p.id}><td className="td">{p.payment_date}</td><td className="td">{p.reference ?? '—'}</td><td className="td"><Money v={p.amount} c={p.currency} /></td></tr>)}</Table> : <p className="text-sm text-ink-600">No payments.</p>}</Card>
        <Card title="Collection history">{acts.length ? <ul className="space-y-2 text-sm">{acts.map((a) => <li key={a.id}><span className="text-ink-400">{a.created_at.slice(0, 10)} · {a.channel}</span> — {a.summary}{a.outcome ? ` (${a.outcome})` : ''}</li>)}</ul> : <p className="text-sm text-ink-600">No collection activity logged.</p>}</Card>
      </div>
    </>
  );
}
