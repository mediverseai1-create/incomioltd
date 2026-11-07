import Decimal from 'decimal.js';
import { getView } from '@/lib/view';
import { can } from '@/lib/rbac';
import { createUnit } from '../actions';
import { ActionForm, Field } from '@/components/forms';
import { PageHeader, Card, Table, Money, Empty, Notice } from '@/components/ui';

export const metadata = { title: 'Business Units' };

export default async function Units() {
  const v = await getView();
  const rows = new Map<string, { name: string; currency: string; invoiced: Decimal; outstanding: Decimal; overdue: Decimal; collected: Decimal }>();
  for (const i of v.views) {
    if (i.status === 'void') continue;
    const name = v.unitName.get(i.business_unit_id ?? '') ?? 'Unassigned'; const k = name + '|' + i.currency;
    const g = rows.get(k) ?? { name, currency: i.currency, invoiced: new Decimal(0), outstanding: new Decimal(0), overdue: new Decimal(0), collected: new Decimal(0) };
    g.invoiced = g.invoiced.plus(i.amount); g.outstanding = g.outstanding.plus(i.outstanding); g.collected = g.collected.plus(Decimal.min(i.paid, new Decimal(i.amount))); if (i.daysOverdue > 0) g.overdue = g.overdue.plus(i.outstanding);
    rows.set(k, g);
  }
  const list = [...rows.values()].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <>
      <PageHeader title="Business Units" sub="Organise records by business, subsidiary, branch, department or location, with consolidated totals per currency." />
      {v.org.structure === 'single' && <Notice>This organization was set up as a single business. You can still add units if you need to split reporting.</Notice>}
      <Card title="Consolidated by unit">
        {list.length === 0 ? <Empty title="No data by unit" body="Create units below, then assign them to invoices (or include a business_unit column when importing invoices)." /> :
          <Table head={['Unit', 'Currency', 'Invoiced', 'Collected', 'Outstanding', 'Overdue']}>{list.map((g) => <tr key={g.name + g.currency}><td className="td">{g.name}</td><td className="td">{g.currency}</td><td className="td"><Money v={g.invoiced} c={g.currency} /></td><td className="td"><Money v={g.collected} c={g.currency} /></td><td className="td"><Money v={g.outstanding} c={g.currency} /></td><td className="td"><Money v={g.overdue} c={g.currency} /></td></tr>)}</Table>}
      </Card>
      <Card title="Units" className="mt-4">
        {v.f.units.length ? <ul className="mb-3 text-sm">{v.f.units.map((u: any) => <li key={u.id}>{u.name} <span className="text-ink-400">({u.kind})</span></li>)}</ul> : <p className="mb-3 text-sm text-ink-600">No units defined.</p>}
        {can(v.role, 'admin') ? <ActionForm action={createUnit} submit="Add unit"><div className="grid gap-3 md:grid-cols-2"><Field label="Name" name="name" required /><div><label className="label" htmlFor="kind">Type</label><select id="kind" name="kind" className="input">{['business', 'subsidiary', 'branch', 'department', 'location'].map((k) => <option key={k}>{k}</option>)}</select></div></div></ActionForm> : <p className="text-xs text-ink-400">Only owners and administrators can add units.</p>}
      </Card>
    </>
  );
}
