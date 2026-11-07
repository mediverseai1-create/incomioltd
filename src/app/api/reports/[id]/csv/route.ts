import { NextResponse } from 'next/server';
import { apiAuth, handle } from '@/lib/api';
import type { ReportContent } from '@/lib/reports';

const esc = (s: string) => { const t = /^[=+\-@]/.test(s) ? "'" + s : s; return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { supabase, org } = await apiAuth();
    const { data } = await supabase.from('reports').select('title,content').eq('id', id).eq('organization_id', org.id).single();
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const c = data.content as ReportContent;
    const out = [data.title, ...c.sections.flatMap((s) => ['', s.title, s.columns.map(esc).join(','), ...s.rows.map((r) => r.map(esc).join(','))])].join('\n');
    return new NextResponse(out, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="incomio-report-${id.slice(0, 8)}.csv"` } });
  } catch (e) { return handle(async () => { throw e; }); }
}
