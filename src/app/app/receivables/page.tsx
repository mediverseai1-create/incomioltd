import Link from 'next/link';
import { getView } from '@/lib/view';
import { PageHeader, Card, Table, Money, Badge, Empty, statusTone } from '@/components/ui';

export const metadata = { title: 'Receivables' };
const FILTERS = [['all', 'All outstanding'], ['overdue', 'Overdue'], ['due_soon', 'Due soon'], ['partial', 'Partially paid'], ['paid', 'Paid']] as const;

export default async function Receivables({ searchParams }: { searchParams: Promise<{ f?: string; q?: string }> }) {
  const v = await getView(); const { f = 'all', q = '' } = await searchParams;
  const priority = new Map(v.priorities.map((p) => [p.customerId + p.currency, p]));
  const lastFollow = new Map<string, string>();
  for (const a of v.f.activities as any[]) if (!lastFollow.has(a.customer_id) || a.created_at > lastFollow.get(a.customer_id)!) lastFollow.set(a.customer_id, a.created_at.slice(0, 10));
  let rows = v.views.filter((i) => i.status !== 'void');
  rows = f === 'paid' ? rows.filter((i) => i.paymentStatus === 'paid') : f === 'overdue' ? rows.filter((i) => i.daysOverdue > 0) : f === 'due_soon' ? rows.filter((i) => i.dueSoon) : f === 'partial' ? rows.filter((i) => i.paymentStatus === 'partial') : rows.filter((i) => i.outstanding.gt(0));
  if (q) rows = rows.filter((i) => (i.reference + (v.custName.get(i.customer_id ?? '') ?? '')).toLowerCase().includes(q.toLowerCase()));
  rows.sort((a, b) => b.daysOverdue - a.daysOverdue);
  return (
    <>
      <PageHeader title="Receivables" sub="Money owed to you, per invoice. Outstanding = invoice amount minus confirmed (approved) payment allocations." />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map(([k, l]) => <Link key={k} href={`/app/receivables?f=${k}`} className={`btn ${f === k ? 'btn-primary' : 'btn-ghost'}`}>{l}</Link>)}
        <form className="ml-auto"><input type="hidden" name="f" value={f} /><input name="q" defaultValue={q} placeholder="Search invoice or customer" className="input w-64" aria-label="Search" /></form>
      </div>
      <Card>
        {rows.length === 0 ? <Empty title="No receivables match" body="Import invoices or change the filter." cta={{ href: '/app/data', label: 'Import data' }} /> :
          <Table head={['Customer', 'Invoice', 'Invoice date', 'Due date', 'Amount', 'Paid', 'Outstanding', 'Aging', 'Status', 'Priority', 'Last follow-up', 'Next action']}>
            {rows.slice(0, 300).map((i) => {
              const p = priority.get((i.customer_id ?? '') + i.currency);
              const next = i.outstanding.lte(0) ? '—' : i.daysOverdue > 60 ? 'Escalate / call' : i.daysOverdue > 0 ? 'Send reminder' : i.dueSoon ? 'Courtesy reminder' : 'Monitor';
              return (
                <tr key={i.id}>
                  <td className="td">{v.custName.get(i.customer_id ?? '') ?? '—'}</td>
                  <td className="td"><Link className="underline" href={`/app/invoices/${i.id}`}>{i.reference}</Link></td>
                  <td className="td">{i.issue_date ?? '—'}</td><td className="td">{i.due_date ?? '—'}</td>
                  <td className="td"><Money v={i.amount} c={i.currency} /></td><td className="td"><Money v={i.paid} c={i.currency} /></td><td className="td font-medium"><Money v={i.outstanding} c={i.currency} /></td>
                  <td className="td">{i.outstanding.gt(0) ? (i.daysOverdue > 0 ? `${i.bucket} days` : 'Not due') : '—'}</td>
                  <td className="td"><Badge tone={statusTone(i.paymentStatus === 'unpaid' && i.daysOverdue > 0 ? 'overdue' : i.paymentStatus)}>{i.paymentStatus === 'unpaid' && i.daysOverdue > 0 ? 'overdue' : i.paymentStatus}</Badge></td>
                  <td className="td">{p ? <Badge tone={statusTone(p.level)}>{p.score}</Badge> : '—'}</td>
                  <td className="td">{(i.customer_id && lastFollow.get(i.customer_id)) || '—'}</td><td className="td">{next}</td>
                </tr>
              );
            })}
          </Table>}
      </Card>
    </>
  );
}
