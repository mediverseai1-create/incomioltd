import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCtx } from '@/lib/ctx';
import type { ReportContent } from '@/lib/reports';
import { PageHeader, Card, Table } from '@/components/ui';
import { PrintButton } from './PrintButton';

export default async function ReportView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, org } = await getCtx();
  const { data } = await supabase.from('reports').select('*').eq('id', id).eq('organization_id', org.id).maybeSingle();
  if (!data) notFound();
  const c = data.content as ReportContent;
  return (
    <>
      <PageHeader title={data.title} sub={`${org.name} · generated ${data.created_at.slice(0, 16).replace('T', ' ')}`}>
        <Link href="/app/reports" className="btn btn-ghost print:hidden">Back</Link>
        <a href={`/api/reports/${id}/csv`} className="btn btn-ghost print:hidden">Export CSV</a>
        <PrintButton />
      </PageHeader>
      {data.narrative && <Card title="Summary (AI-written from calculated figures)"><p className="whitespace-pre-wrap text-sm">{data.narrative}</p></Card>}
      {c.sections.map((s) => <Card key={s.title} title={s.title} className="mt-4">{s.rows.length ? <Table head={s.columns}>{s.rows.map((r, i) => <tr key={i}>{r.map((x, j) => <td key={j} className="td">{x}</td>)}</tr>)}</Table> : <p className="text-sm text-ink-600">No data.</p>}</Card>)}
      <ul className="mt-4 list-disc pl-5 text-xs text-ink-600">{c.notes.map((n) => <li key={n}>{n}</li>)}</ul>
    </>
  );
}
