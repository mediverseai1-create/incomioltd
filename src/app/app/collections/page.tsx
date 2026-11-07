import { getView } from '@/lib/view';
import { can } from '@/lib/rbac';
import { logActivity } from '../actions';
import { ActionForm, Field, ApiButton } from '@/components/forms';
import { PageHeader, Card, Table, Money, Badge, Empty, statusTone } from '@/components/ui';
import { DraftActions } from './DraftActions';

export const metadata = { title: 'Collections' };

export default async function Collections() {
  const v = await getView();
  const { data: drafts } = await v.supabase.from('collection_drafts').select('*').eq('organization_id', v.org.id).order('created_at', { ascending: false }).limit(30);
  const acts = [...(v.f.activities as any[])].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const writer = can(v.role, 'write_finance');
  return (
    <>
      <PageHeader title="Collections" sub="Accounts ranked by a transparent priority score. Reminders are drafts only: nothing is sent to customers by Incomio." />
      <Card title="Prioritised accounts">
        {v.priorities.length === 0 ? <Empty title="No outstanding balances" body="Priorities appear when customers have unpaid invoices." /> :
          <Table head={['Customer', 'Outstanding', 'Overdue', 'Oldest (days)', 'Score', 'Why', '']}>
            {v.priorities.slice(0, 40).map((p) => (
              <tr key={p.customerId + p.currency} className="align-top">
                <td className="td font-medium">{v.custName.get(p.customerId)}</td><td className="td"><Money v={p.outstanding} c={p.currency} /></td><td className="td"><Money v={p.overdue} c={p.currency} /></td>
                <td className="td">{p.maxDaysOverdue || '—'}</td><td className="td"><Badge tone={statusTone(p.level)}>{p.score} · {p.level}</Badge></td>
                <td className="td max-w-xs text-xs text-ink-600"><ul className="list-disc pl-4">{p.reasons.map((r) => <li key={r}>{r}</li>)}</ul></td>
                <td className="td">{writer && p.overdue.gt(0) && <ApiButton url="/api/ai/draft" body={{ customerId: p.customerId, currency: p.currency }} label="Draft reminder" />}</td>
              </tr>
            ))}
          </Table>}
      </Card>
      <Card title="Reminder drafts (require approval)" className="mt-4">
        {drafts?.length ? drafts.map((d) => (
          <div key={d.id} className="mb-4 rounded border border-cream-200 p-3">
            <div className="mb-1 flex items-center justify-between text-sm"><b>{v.custName.get(d.customer_id)} — {d.subject}</b><Badge tone={statusTone(d.status)}>{d.status.replace('_', ' ')}</Badge></div>
            <p className="whitespace-pre-wrap text-sm text-ink-600">{d.body}</p>
            <DraftActions id={d.id} status={d.status} canApprove={can(v.role, 'approve')} canLog={writer} />
          </div>
        )) : <p className="text-sm text-ink-600">No drafts yet. Click “Draft reminder” on an overdue account.</p>}
      </Card>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Collection history">{acts.length ? <ul className="space-y-2 text-sm">{acts.slice(0, 25).map((a) => <li key={a.id}><span className="text-ink-400">{a.created_at.slice(0, 10)} · {v.custName.get(a.customer_id)} · {a.channel}</span><br />{a.summary}{a.outcome && <> — <i>{a.outcome}</i></>}{a.follow_up_date && <> · follow up {a.follow_up_date}</>}</li>)}</ul> : <p className="text-sm text-ink-600">Nothing logged yet.</p>}</Card>
        {writer && (
          <Card title="Log collection activity">
            <ActionForm action={logActivity} submit="Log activity">
              <div className="grid gap-3 md:grid-cols-2">
                <div><label className="label" htmlFor="customer_id">Customer</label><select id="customer_id" name="customer_id" required className="input"><option value="">Choose…</option>{v.f.customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                <div><label className="label" htmlFor="channel">Channel</label><select id="channel" name="channel" className="input"><option>call</option><option>email</option><option>meeting</option><option>note</option></select></div>
                <div className="md:col-span-2"><Field label="Summary" name="summary" required /></div>
                <Field label="Outcome" name="outcome" placeholder="Promised to pay on…" /><Field label="Follow-up date" name="follow_up_date" type="date" />
              </div>
            </ActionForm>
          </Card>
        )}
      </div>
    </>
  );
}
