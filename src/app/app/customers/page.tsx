import Link from 'next/link';
import Decimal from 'decimal.js';
import { getView } from '@/lib/view';
import { can } from '@/lib/rbac';
import { createCustomer } from '../actions';
import { ActionForm, Field } from '@/components/forms';
import { PageHeader, Card, Table, Money, Empty } from '@/components/ui';

export const metadata = { title: 'Customers' };

export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const v = await getView(); const { q = '' } = await searchParams;
  let rows = v.f.customers as any[];
  if (q) rows = rows.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));
  const stats = (id: string) => {
    const inv = v.views.filter((i) => i.customer_id === id && i.status !== 'void');
    const cur = [...new Set(inv.map((i) => i.currency))];
    return cur.map((c) => ({ c, out: inv.filter((i) => i.currency === c).reduce((s, i) => s.plus(i.outstanding), new Decimal(0)) }));
  };
  return (
    <>
      <PageHeader title="Customers" sub="Financial profile for every customer: balances, payment behaviour and collection history." />
      <form className="mb-3"><input name="q" defaultValue={q} placeholder="Search customers" className="input w-72" aria-label="Search customers" /></form>
      <Card>
        {rows.length === 0 ? <Empty title="No customers" body="Import customers or invoices (customers are created from invoice data) or add one below." cta={{ href: '/app/data', label: 'Import data' }} /> :
          <Table head={['Customer', 'Email', 'Outstanding', 'Avg days vs due']}>
            {rows.slice(0, 300).map((c) => {
              const d = v.delays.get(c.id);
              return <tr key={c.id}><td className="td"><Link className="underline" href={`/app/customers/${c.id}`}>{c.name}</Link></td><td className="td">{c.email ?? '—'}</td>
                <td className="td">{stats(c.id).map((s) => <div key={s.c}><Money v={s.out} c={s.c} /></div>)}{stats(c.id).length === 0 && '—'}</td>
                <td className="td">{d ? `${d.avgDelay > 0 ? '+' : ''}${d.avgDelay.toFixed(1)} (${d.samples} paid)` : 'No payment history'}</td></tr>;
            })}
          </Table>}
      </Card>
      {can(v.role, 'write_finance') && (
        <Card title="Add a customer" className="mt-4"><ActionForm action={createCustomer} submit="Add customer"><div className="grid gap-3 md:grid-cols-3"><Field label="Name" name="name" required /><Field label="Email" name="email" type="email" /><Field label="Phone" name="phone" /></div></ActionForm></Card>
      )}
    </>
  );
}
