import Link from 'next/link';
import { getView } from '@/lib/view';
import { can } from '@/lib/rbac';
import { createInvoice } from '../actions';
import { ActionForm, Field } from '@/components/forms';
import { PageHeader, Card, Table, Money, Badge, Empty, statusTone } from '@/components/ui';

export const metadata = { title: 'Invoices' };
const PAGE = 50;

export default async function Invoices({ searchParams }: { searchParams: Promise<{ q?: string; s?: string; p?: string; sort?: string }> }) {
  const v = await getView(); const { q = '', s = 'all', p = '1', sort = 'date' } = await searchParams;
  let rows = v.views.filter((i) => s === 'all' || i.paymentStatus === s);
  if (q) rows = rows.filter((i) => (i.reference + (v.custName.get(i.customer_id ?? '') ?? '')).toLowerCase().includes(q.toLowerCase()));
  rows.sort((a, b) => sort === 'amount' ? b.outstanding.comparedTo(a.outstanding) : (b.issue_date ?? '').localeCompare(a.issue_date ?? ''));
  const page = Math.max(1, Number(p) || 1), pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const qs = (o: Record<string, string>) => '?' + new URLSearchParams({ q, s, sort, ...o }).toString();
  const writer = can(v.role, 'write_finance');
  return (
    <>
      <PageHeader title="Invoices" sub="Every invoice with its payment history. Upload files from Data & Integrations or add one manually.">
        <Link href="/app/data" className="btn btn-green">Import / extract invoices</Link>
      </PageHeader>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {['all', 'unpaid', 'partial', 'paid', 'overpaid', 'void'].map((k) => <Link key={k} href={`/app/invoices${qs({ s: k, p: '1' })}`} className={`btn ${s === k ? 'btn-primary' : 'btn-ghost'}`}>{k}</Link>)}
        <Link href={`/app/invoices${qs({ sort: sort === 'date' ? 'amount' : 'date' })}`} className="btn btn-ghost">Sort: {sort === 'date' ? 'newest' : 'largest balance'}</Link>
        <form className="ml-auto"><input name="q" defaultValue={q} placeholder="Search reference or customer" className="input w-64" aria-label="Search invoices" /></form>
      </div>
      <Card>
        {rows.length === 0 ? <Empty title="No invoices" body="Import a file or add an invoice manually below." /> :
          <Table head={['Reference', 'Customer', 'Issued', 'Due', 'Amount', 'Outstanding', 'Status', '']}>
            {rows.slice((page - 1) * PAGE, page * PAGE).map((i) => (
              <tr key={i.id}><td className="td"><Link className="underline" href={`/app/invoices/${i.id}`}>{i.reference}</Link></td><td className="td">{v.custName.get(i.customer_id ?? '') ?? '—'}</td>
                <td className="td">{i.issue_date ?? '—'}</td><td className="td">{i.due_date ?? '—'}</td><td className="td"><Money v={i.amount} c={i.currency} /></td><td className="td"><Money v={i.outstanding} c={i.currency} /></td>
                <td className="td"><Badge tone={statusTone(i.paymentStatus)}>{i.paymentStatus}</Badge></td><td className="td">{(v.f.invoices.find((x: any) => x.id === i.id)?.needs_review) && <Badge tone="warn">needs review</Badge>}</td></tr>
            ))}
          </Table>}
        <div className="mt-3 flex items-center justify-between text-sm text-ink-600">
          <span>{rows.length} invoice(s) · page {page} of {pages}</span>
          <span className="flex gap-2">{page > 1 && <Link className="btn btn-ghost" href={`/app/invoices${qs({ p: String(page - 1) })}`}>Previous</Link>}{page < pages && <Link className="btn btn-ghost" href={`/app/invoices${qs({ p: String(page + 1) })}`}>Next</Link>}</span>
        </div>
      </Card>
      {writer && (
        <Card title="Add an invoice" className="mt-4">
          <ActionForm action={createInvoice} submit="Add invoice">
            <div className="grid gap-3 md:grid-cols-4">
              <Field label="Reference" name="reference" required />
              <div><label className="label" htmlFor="customer_id">Customer</label><select id="customer_id" name="customer_id" className="input"><option value="">—</option>{v.f.customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <Field label="Issue date" name="issue_date" type="date" /><Field label="Due date" name="due_date" type="date" />
              <Field label="Amount" name="amount" required placeholder="1250.00" /><Field label="Currency" name="currency" required defaultValue={v.org.primary_currency} />
              <Field label="Direct cost (optional)" name="direct_cost" /><Field label="Service (optional)" name="service" />
              <div><label className="label" htmlFor="business_unit_id">Business unit</label><select id="business_unit_id" name="business_unit_id" className="input"><option value="">—</option>{v.f.units.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
            </div>
          </ActionForm>
        </Card>
      )}
    </>
  );
}
