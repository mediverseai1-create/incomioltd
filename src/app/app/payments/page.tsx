import Link from 'next/link';
import Decimal from 'decimal.js';
import { getView } from '@/lib/view';
import { can } from '@/lib/rbac';
import { createPayment } from '../actions';
import { ActionForm, Field } from '@/components/forms';
import { PageHeader, Card, Table, Money, Badge, Empty } from '@/components/ui';

export const metadata = { title: 'Payments' };

export default async function Payments({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const v = await getView(); const { q = '' } = await searchParams;
  const used = new Map<string, Decimal>();
  for (const a of v.f.allocations as any[]) used.set(a.payment_id, (used.get(a.payment_id) ?? new Decimal(0)).plus(a.amount));
  let rows = [...v.f.payments].sort((a: any, b: any) => b.payment_date.localeCompare(a.payment_date));
  if (q) rows = rows.filter((p: any) => ((p.reference ?? '') + (v.custName.get(p.customer_id) ?? '')).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageHeader title="Payments" sub="Incoming payments. A payment counts toward an invoice only after a reconciliation match is approved.">
        <Link href="/app/reconciliation" className="btn btn-green">Reconcile</Link>
      </PageHeader>
      <form className="mb-3"><input name="q" defaultValue={q} placeholder="Search reference or customer" className="input w-72" aria-label="Search payments" /></form>
      <Card>
        {rows.length === 0 ? <Empty title="No payments yet" body="Import payment receipts or bank transactions, or record one below." cta={{ href: '/app/data', label: 'Import data' }} /> :
          <Table head={['Date', 'Reference', 'Customer', 'Amount', 'Allocated', 'Unallocated', 'Status']}>
            {rows.slice(0, 300).map((p: any) => {
              const u = used.get(p.id) ?? new Decimal(0); const left = new Decimal(p.amount).minus(u);
              return <tr key={p.id}><td className="td">{p.payment_date}</td><td className="td">{p.reference ?? '—'}</td><td className="td">{v.custName.get(p.customer_id) ?? '—'}</td><td className="td"><Money v={p.amount} c={p.currency} /></td><td className="td"><Money v={u} c={p.currency} /></td><td className="td"><Money v={left} c={p.currency} /></td>
                <td className="td"><Badge tone={left.lte(0) ? 'good' : u.gt(0) ? 'warn' : 'neutral'}>{left.lte(0) ? 'reconciled' : u.gt(0) ? 'partly reconciled' : 'unreconciled'}</Badge></td></tr>;
            })}
          </Table>}
      </Card>
      {can(v.role, 'write_finance') && (
        <Card title="Record a payment" className="mt-4">
          <ActionForm action={createPayment} submit="Record payment">
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Payment date" name="payment_date" type="date" required /><Field label="Amount" name="amount" required /><Field label="Currency" name="currency" required defaultValue={v.org.primary_currency} />
              <Field label="Reference" name="reference" />
              <div><label className="label" htmlFor="customer_id">Customer</label><select id="customer_id" name="customer_id" className="input"><option value="">—</option>{v.f.customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <Field label="Method" name="method" placeholder="Bank transfer" />
            </div>
          </ActionForm>
        </Card>
      )}
    </>
  );
}
