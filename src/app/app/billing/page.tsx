import { getCtx } from '@/lib/ctx';
import { PLANS, PLAN_KEYS, USAGE_LABELS, paymentLink, type UsageKind } from '@/lib/plans';
import { PageHeader, Card, Badge, Notice, Table, statusTone } from '@/components/ui';

export const metadata = { title: 'Usage & Billing' };

export default async function Billing() {
  const { supabase, org } = await getCtx();
  const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
  const [{ data: sub }, { data: usage }, { data: events }] = await Promise.all([
    supabase.from('subscriptions').select('*').eq('organization_id', org.id).maybeSingle(),
    supabase.from('usage_records').select('kind,units').eq('organization_id', org.id).gte('created_at', monthStart.toISOString()),
    supabase.from('billing_events').select('*').eq('organization_id', org.id).order('created_at', { ascending: false }).limit(20),
  ]);
  const active = sub?.status === 'active' && sub.plan !== 'none' ? (sub.plan as keyof typeof PLANS) : null;
  const used = (k: UsageKind) => (usage ?? []).filter((u) => u.kind === k).reduce((s, u) => s + u.units, 0);
  return (
    <>
      <PageHeader title="Usage & Billing" sub="Plans are billed through an external payment page. Your subscription is activated only after payment is confirmed." />
      <Card title="Current subscription">
        <p className="text-sm">Plan: <b>{active ? PLANS[active].name : 'No active subscription'}</b> <Badge tone={statusTone(sub?.status ?? 'inactive')}>{sub?.status ?? 'inactive'}</Badge>{sub?.current_period_end && <> · renews {sub.current_period_end.slice(0, 10)}</>}</p>
        <p className="mt-2 text-xs text-ink-600">Returning from a payment page does not activate a plan. Activation is recorded by a verified payment confirmation or by an Incomio administrator.</p>
      </Card>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {PLAN_KEYS.map((k) => {
          const link = paymentLink(k); const p = PLANS[k];
          return (
            <Card key={k} className={active === k ? 'ring-2 ring-forest' : ''}>
              <h3 className="text-xl text-wine">{p.name}</h3>
              <div className="num font-display text-3xl">${p.price}<span className="text-sm text-ink-600">/month</span></div>
              <p className="mt-1 text-sm text-ink-600">{p.blurb}</p>
              <div className="mt-3">{active === k ? <Badge tone="good">Current plan</Badge> : link ? <a href={link} target="_blank" rel="noopener noreferrer" className="btn btn-primary">{active ? 'Switch to' : 'Subscribe to'} {p.name}</a> : <span className="text-xs text-ink-600">Payment link not configured yet.</span>}</div>
            </Card>
          );
        })}
      </div>
      <Card title="Usage this month" className="mt-4">
        <Table head={['Operation', 'Used', 'Plan limit']}>{(Object.keys(USAGE_LABELS) as UsageKind[]).map((k) => <tr key={k}><td className="td">{USAGE_LABELS[k]}</td><td className="td">{used(k)}</td><td className="td">{active ? (PLANS[active].limits[k] ?? 'No cap configured') : '—'}</td></tr>)}</Table>
        <p className="mt-2 text-xs text-ink-600">Limits are defined centrally in <code>src/lib/plans.ts</code>. A blank limit means none has been set.</p>
      </Card>
      <Card title="Billing history" className="mt-4">
        {events?.length ? <Table head={['Date', 'Event', 'Plan', 'Amount']}>{events.map((e) => <tr key={e.id}><td className="td">{e.created_at.slice(0, 10)}</td><td className="td">{e.event}</td><td className="td">{e.plan ?? '—'}</td><td className="td">{e.amount ? `${e.amount} ${e.currency ?? ''}` : '—'}</td></tr>)}</Table> : <p className="text-sm text-ink-600">No billing events recorded.</p>}
      </Card>
      {!active && <Notice>Organization ID for payment confirmation: <code>{org.id}</code></Notice>}
    </>
  );
}
