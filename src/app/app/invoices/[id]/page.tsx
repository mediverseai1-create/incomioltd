import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getView } from '@/lib/view';
import { can } from '@/lib/rbac';
import { PageHeader, Card, Stat, Table, Money, Badge, statusTone } from '@/components/ui';
import { fmtMoney } from '@/lib/money';
import { VoidButton } from './VoidButton';

export default async function InvoiceDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await getView();
  const inv = v.views.find((i) => i.id === id);
  if (!inv) notFound();
  const allocs = v.f.allocations.filter((a: any) => a.invoice_id === id);
  const pays = new Map<string, any>(v.f.payments.map((p: any) => [p.id, p]));
  const { data: file } = (inv as any).source_file_id ? await v.supabase.from('imported_files').select('storage_path,filename').eq('id', (inv as any).source_file_id).maybeSingle() : { data: null };
  let url: string | null = null;
  if (file) { const s = await v.supabase.storage.from('financial-files').createSignedUrl(file.storage_path, 300); url = s.data?.signedUrl ?? null; }
  return (
    <>
      <PageHeader title={`Invoice ${inv.reference}`} sub={v.custName.get(inv.customer_id ?? '') ?? 'No customer assigned'}>
        <Link href="/app/invoices" className="btn btn-ghost">Back</Link>
        {can(v.role, 'approve') && inv.status !== 'void' && <VoidButton id={id} />}
      </PageHeader>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Amount" value={fmtMoney(inv.amount, inv.currency)} />
        <Stat label="Paid (confirmed)" value={fmtMoney(inv.paid, inv.currency)} tone="green" />
        <Stat label="Outstanding" value={fmtMoney(inv.outstanding, inv.currency)} tone="wine" />
        <Stat label="Status" value={inv.paymentStatus} hint={inv.daysOverdue > 0 ? `${inv.daysOverdue} days overdue` : inv.due_date ? `Due ${inv.due_date}` : undefined} />
      </div>
      <Card title="Payment history" className="mt-4">
        {allocs.length ? <Table head={['Payment date', 'Reference', 'Allocated', 'Confirmed on']}>{allocs.map((a: any) => <tr key={a.id}><td className="td">{pays.get(a.payment_id)?.payment_date}</td><td className="td">{pays.get(a.payment_id)?.reference ?? '—'}</td><td className="td"><Money v={a.amount} c={inv.currency} /></td><td className="td">{a.created_at.slice(0, 10)}</td></tr>)}</Table>
          : <p className="text-sm text-ink-600">No confirmed payments. Matches appear in <Link className="underline" href="/app/reconciliation">Reconciliation</Link> for approval.</p>}
      </Card>
      {url && <p className="mt-4 text-sm">Source file: <a className="underline" href={url} target="_blank" rel="noreferrer">{file!.filename}</a> <Badge tone="neutral">link expires in 5 min</Badge></p>}
      {(inv as any).needs_review && <p className="mt-2 text-sm text-[#7a5112]">Extracted values on this invoice need human review.</p>}
      <p className="mt-2 text-xs text-ink-400">{inv.status === 'void' ? <Badge tone={statusTone('rejected')}>void</Badge> : null}</p>
    </>
  );
}
