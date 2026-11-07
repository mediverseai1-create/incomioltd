import { getView } from '@/lib/view';
import { can } from '@/lib/rbac';
import { fmtMoney } from '@/lib/money';
import { PageHeader, Card, Badge, Empty, statusTone } from '@/components/ui';
import { ApiButton } from '@/components/forms';
import { InsightActions } from './InsightActions';

export const metadata = { title: 'Financial Insights' };

export default async function Insights({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const v = await getView(); const { s = 'new' } = await searchParams;
  let q = v.supabase.from('financial_insights').select('*').eq('organization_id', v.org.id).not('agent_key', 'like', 'customer:%').order('created_at', { ascending: false }).limit(100);
  if (s !== 'all') q = q.eq('review_status', s);
  const { data } = await q;
  return (
    <>
      <PageHeader title="Financial Insights" sub="Findings produced by AI agents from your calculated figures, each with evidence and a review status.">
        {can(v.role, 'run_ai') && <ApiButton url="/api/agents/run" body={{ agent: 'financial' }} label="Generate insights" className="btn btn-primary" />}
      </PageHeader>
      <div className="mb-3 flex gap-2">{['new', 'reviewed', 'dismissed', 'all'].map((k) => <a key={k} href={`?s=${k}`} className={`btn ${s === k ? 'btn-primary' : 'btn-ghost'}`}>{k}</a>)}</div>
      {!data?.length ? <Empty title="No insights" body="Run the Financial Intelligence Agent to analyse your receivables and payments. Requires imported data and a configured Gemini key." /> :
        <div className="space-y-3">{data.map((i) => (
          <Card key={i.id}>
            <div className="flex flex-wrap items-center gap-2"><Badge tone={statusTone(i.severity)}>{i.severity}</Badge><Badge tone="info">{i.category}</Badge>{i.confidence != null && <Badge>confidence {Math.round(i.confidence * 100)}%</Badge>}<Badge tone={statusTone(i.review_status === 'new' ? 'pending' : 'done')}>{i.review_status}</Badge></div>
            <h3 className="mt-2 text-lg text-wine">{i.title}</h3>
            <p className="mt-1 text-sm">{i.explanation}</p>
            {i.financial_impact != null && i.currency && <p className="mt-1 text-sm text-ink-600">Measured impact: <b>{fmtMoney(i.financial_impact, i.currency)}</b></p>}
            {(i.supporting_records as string[] | null)?.length ? <p className="mt-1 text-xs text-ink-600">Supporting records: {(i.supporting_records as string[]).join(', ')}</p> : null}
            {i.recommended_action && <p className="mt-2 text-sm"><b>Recommended:</b> {i.recommended_action}</p>}
            {i.review_status === 'new' && can(v.role, 'write_finance') && <InsightActions id={i.id} />}
          </Card>
        ))}</div>}
    </>
  );
}
