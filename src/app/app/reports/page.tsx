import Link from 'next/link';
import { getCtx } from '@/lib/ctx';
import { can } from '@/lib/rbac';
import { REPORT_KINDS } from '@/lib/reports';
import { PageHeader, Card, Table } from '@/components/ui';
import { ApiButton } from '@/components/forms';

export const metadata = { title: 'Reports' };

export default async function Reports() {
  const { supabase, org, role } = await getCtx();
  const { data } = await supabase.from('reports').select('id,title,kind,created_at').eq('organization_id', org.id).order('created_at', { ascending: false }).limit(50);
  return (
    <>
      <PageHeader title="Reports" sub="Generated reports are snapshots. Open one to export CSV or save as PDF via your browser's print dialog." />
      {can(role, 'write_finance') && (
        <Card title="Generate a report"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(REPORT_KINDS).map(([k, label]) => (
          <div key={k} className="rounded border border-cream-200 p-3"><div className="mb-2 text-sm font-medium">{label}</div><ApiButton url="/api/reports" body={{ kind: k }} label="Generate" /></div>))}</div></Card>
      )}
      <Card title="Saved reports" className="mt-4">
        {data?.length ? <Table head={['Report', 'Created', '']}>{data.map((r) => <tr key={r.id}><td className="td">{r.title}</td><td className="td">{r.created_at.slice(0, 16).replace('T', ' ')}</td><td className="td"><Link href={`/app/reports/${r.id}`} className="underline">Open</Link></td></tr>)}</Table> : <p className="text-sm text-ink-600">No reports yet.</p>}
      </Card>
    </>
  );
}
