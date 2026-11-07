import Decimal from 'decimal.js';
import { getView } from '@/lib/view';
import { can } from '@/lib/rbac';
import { PageHeader, Card, Table, Money, Badge, Empty, Stat, statusTone } from '@/components/ui';
import { MatchActions, RunButton } from './MatchActions';

export const metadata = { title: 'Reconciliation' };

export default async function Reconciliation() {
  const v = await getView();
  const { data: matches } = await v.supabase.from('reconciliation_matches').select('*').eq('organization_id', v.org.id).order('created_at', { ascending: false }).limit(500);
  const { data: reviews } = await v.supabase.from('reconciliation_reviews').select('match_id,decision,note,created_at,reviewer_id').eq('organization_id', v.org.id).order('created_at', { ascending: false }).limit(200);
  const { data: people } = await v.supabase.from('profiles').select('id,full_name,email');
  const who = new Map((people ?? []).map((p) => [p.id, p.full_name || p.email]));
  const revByMatch = new Map<string, any>(); for (const r of reviews ?? []) if (!revByMatch.has(r.match_id)) revByMatch.set(r.match_id, r);
  const inv = new Map<string, any>(v.views.map((i) => [i.id, i])); const pay = new Map<string, any>(v.f.payments.map((p: any) => [p.id, p]));
  const pending = (matches ?? []).filter((m) => m.status === 'pending' || m.status === 'investigate');
  const decided = (matches ?? []).filter((m) => m.status === 'approved' || m.status === 'rejected').slice(0, 20);
  const used = new Map<string, Decimal>(); for (const a of v.f.allocations as any[]) used.set(a.payment_id, (used.get(a.payment_id) ?? new Decimal(0)).plus(a.amount));
  const unmatchedPay = (v.f.payments as any[]).filter((p) => new Decimal(p.amount).gt(used.get(p.id) ?? 0));
  const unmatchedInv = v.views.filter((i) => i.outstanding.gt(0) && i.paid.isZero());
  const approver = can(v.role, 'approve');
  return (
    <>
      <PageHeader title="Reconciliation" sub="Suggested matches are proposals only. An invoice is marked paid only after an authorised person approves the match.">
        {can(v.role, 'write_finance') && <RunButton />}
      </PageHeader>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Awaiting review" value={String(pending.length)} /><Stat label="Unreconciled payments" value={String(unmatchedPay.length)} />
        <Stat label="Unpaid invoices (no payment)" value={String(unmatchedInv.length)} /><Stat label="Duplicate candidates" value={String(pending.filter((m) => m.kind === 'duplicate').length)} tone="terra" />
      </div>
      <Card title="Review queue" className="mt-4">
        {pending.length === 0 ? <Empty title="Nothing to review" body="Click “Find matches” after importing invoices and payments. Suggestions include the evidence behind each match." /> :
          <Table head={['Type', 'Payment', 'Invoice', 'Proposed', 'Confidence', 'Evidence', 'Decision']}>
            {pending.map((m) => {
              const p = pay.get(m.payment_id), i = inv.get(m.invoice_id);
              return (
                <tr key={m.id} className="align-top">
                  <td className="td"><Badge tone={m.kind === 'duplicate' ? 'bad' : m.kind === 'suggested' ? 'info' : 'warn'}>{m.kind}</Badge>{m.status === 'investigate' && <div className="mt-1"><Badge tone="warn">investigating</Badge></div>}</td>
                  <td className="td">{p ? <>{p.reference ?? 'Payment'}<div className="text-xs text-ink-400">{p.payment_date} · {v.custName.get(p.customer_id) ?? 'no customer'}</div><Money v={p.amount} c={p.currency} /></> : '—'}</td>
                  <td className="td">{i ? <>{i.reference}<div className="text-xs text-ink-400">{v.custName.get(i.customer_id) ?? ''} · due {i.due_date}</div>Balance <Money v={i.outstanding} c={i.currency} /></> : '—'}</td>
                  <td className="td">{p && <Money v={m.proposed_amount} c={p.currency} />}</td>
                  <td className="td">{Math.round(m.confidence * 100)}%</td>
                  <td className="td max-w-[260px] text-xs text-ink-600"><ul className="list-disc pl-4">{(m.evidence as any[]).map((e, k) => <li key={k}>{e.detail}</li>)}</ul></td>
                  <td className="td">{approver ? <MatchActions id={m.id} duplicate={m.kind === 'duplicate'} /> : <span className="text-xs text-ink-400">Approver role required</span>}</td>
                </tr>
              );
            })}
          </Table>}
      </Card>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Unreconciled payments">{unmatchedPay.length ? <Table head={['Date', 'Ref', 'Left']}>{unmatchedPay.slice(0, 15).map((p) => <tr key={p.id}><td className="td">{p.payment_date}</td><td className="td">{p.reference ?? '—'}</td><td className="td"><Money v={new Decimal(p.amount).minus(used.get(p.id) ?? 0)} c={p.currency} /></td></tr>)}</Table> : <p className="text-sm text-ink-600">All payments are fully reconciled.</p>}</Card>
        <Card title="Invoices with no payment">{unmatchedInv.length ? <Table head={['Invoice', 'Due', 'Outstanding']}>{unmatchedInv.slice(0, 15).map((i) => <tr key={i.id}><td className="td">{i.reference}</td><td className="td">{i.due_date}</td><td className="td"><Money v={i.outstanding} c={i.currency} /></td></tr>)}</Table> : <p className="text-sm text-ink-600">None.</p>}</Card>
      </div>
      <Card title="Decision log" className="mt-4">
        {decided.length ? <Table head={['When', 'Decision', 'By', 'Type']}>{decided.map((m) => { const r = revByMatch.get(m.id); return <tr key={m.id}><td className="td">{(r?.created_at ?? m.created_at).slice(0, 16).replace('T', ' ')}</td><td className="td"><Badge tone={statusTone(m.status)}>{m.status}</Badge></td><td className="td">{who.get(r?.reviewer_id) ?? '—'}</td><td className="td">{m.kind}</td></tr>; })}</Table> : <p className="text-sm text-ink-600">No decisions yet.</p>}
      </Card>
    </>
  );
}
