import { getView } from '@/lib/view';
import { can } from '@/lib/rbac';
import { PageHeader, Card, Badge, Empty, statusTone, Notice } from '@/components/ui';
import { ApiButton } from '@/components/forms';
import { aiConfigured } from '@/lib/ai/gemini';
import { ActionRow } from './ActionRow';

export const metadata = { title: 'AI Agents' };

export default async function Agents() {
  const v = await getView();
  const [{ data: agents }, { data: runs }, { data: actions }, { data: approvals }, { data: people }] = await Promise.all([
    v.supabase.from('ai_agents').select('*').eq('organization_id', v.org.id).order('name'),
    v.supabase.from('ai_agent_runs').select('*').eq('organization_id', v.org.id).order('created_at', { ascending: false }).limit(60),
    v.supabase.from('recommended_actions').select('*').eq('organization_id', v.org.id).order('created_at', { ascending: false }).limit(60),
    v.supabase.from('action_approvals').select('action_id,decision,note,created_at,approver_id').eq('organization_id', v.org.id).order('created_at', { ascending: false }),
    v.supabase.from('profiles').select('id,full_name,email'),
  ]);
  const who = new Map((people ?? []).map((p) => [p.id, p.full_name || p.email]));
  const { data: usage } = await v.supabase.from('usage_records').select('meta').eq('organization_id', v.org.id).eq('kind', 'agent_run');
  const keyOrder = ['financial', 'receivables', 'reconciliation', 'cashflow', 'collections', 'profitability', 'executive'];
  const sorted = [...(agents ?? [])].sort((a, b) => keyOrder.indexOf(a.key) - keyOrder.indexOf(b.key));
  return (
    <>
      <PageHeader title="AI Agents" sub="Agents analyse, recommend and draft. They cannot move money, change records or contact customers; every action needs human approval." />
      {!aiConfigured() && <Notice tone="warn">GEMINI_API_KEY is not configured, so agents cannot run yet. Manual workflows are unaffected.</Notice>}
      <div className="grid gap-4 md:grid-cols-2">
        {sorted.map((a) => {
          const last = runs?.find((r) => r.agent_key === a.key);
          const count = usage?.filter((u) => (u.meta as { agent?: string } | null)?.agent === a.key).length ?? 0;
          return (
            <Card key={a.id}>
              <div className="flex items-start justify-between gap-2"><h3 className="text-lg text-wine">{a.name}</h3><Badge tone={last ? statusTone(last.status === 'completed' ? 'done' : last.status === 'failed' ? 'failed' : 'pending') : 'neutral'}>{last ? last.status : 'never run'}</Badge></div>
              <p className="mt-1 text-sm text-ink-600">{a.purpose}</p>
              <p className="mt-2 text-xs"><b>Capabilities:</b> {a.capabilities.join(', ')}</p>
              <p className="text-xs"><b>Data access:</b> {a.data_scope.join(', ')}</p>
              <p className="text-xs text-ink-600"><b>Runs:</b> {count}{last && ` · last ${last.created_at.slice(0, 16).replace('T', ' ')}`}</p>
              {last?.summary && <p className="mt-2 rounded bg-cream-50 p-2 text-xs">{last.summary}</p>}
              {last?.error && <p className="mt-2 text-xs text-red-700">{last.error}</p>}
              {can(v.role, 'run_ai') && <div className="mt-3"><ApiButton url="/api/agents/run" body={{ agent: a.key }} label="Run agent" className="btn btn-primary" /></div>}
            </Card>
          );
        })}
      </div>
      <Card title="Action workspace" className="mt-6">
        {!actions?.length ? <Empty title="No recommended actions" body="Run an agent. Its suggestions appear here for approval, assignment and tracking." /> :
          <div className="space-y-3">{actions.map((a) => (
            <ActionRow key={a.id} a={a} customer={v.custName.get(a.customer_id ?? '') ?? null} assignee={who.get(a.assignee_id) ?? null} canApprove={can(v.role, 'approve')} canWork={can(v.role, 'write_finance')}
              history={(approvals ?? []).filter((x) => x.action_id === a.id).map((x) => `${x.decision} by ${who.get(x.approver_id) ?? 'unknown'} on ${x.created_at.slice(0, 10)}`)} />
          ))}</div>}
      </Card>
    </>
  );
}
