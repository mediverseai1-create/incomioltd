import Decimal from 'decimal.js';
import { getView } from '@/lib/view';
import { D } from '@/lib/money';
import { PageHeader, Card, Table, Money, Notice } from '@/components/ui';

export const metadata = { title: 'Profitability' };

function groupMargin(rows: any[], key: (r: any) => string) {
  const m = new Map<string, { name: string; currency: string; revenue: Decimal; collected: Decimal; discount: Decimal; cost: Decimal; withCost: number; n: number; costed: Decimal }>();
  for (const r of rows) {
    const k = key(r) + '|' + r.currency;
    const g = m.get(k) ?? { name: key(r), currency: r.currency, revenue: new Decimal(0), collected: new Decimal(0), discount: new Decimal(0), cost: new Decimal(0), withCost: 0, n: 0, costed: new Decimal(0) };
    g.revenue = g.revenue.plus(r.amount); g.collected = g.collected.plus(Decimal.min(r.paid, D(r.amount))); g.discount = g.discount.plus(r.discount ?? 0); g.n++;
    if (r.direct_cost !== null && r.direct_cost !== undefined) { g.cost = g.cost.plus(r.direct_cost); g.withCost++; g.costed = g.costed.plus(r.amount); }
    m.set(k, g);
  }
  return [...m.values()].sort((a, b) => b.revenue.comparedTo(a.revenue));
}

function MarginTable({ rows }: { rows: ReturnType<typeof groupMargin> }) {
  return (
    <Table head={['Name', 'Invoiced', 'Collected', 'Discounts', 'Direct cost', 'Margin on costed invoices', 'Cost coverage']}>
      {rows.slice(0, 50).map((g) => {
        const full = g.withCost > 0;
        const margin = full ? g.costed.minus(g.cost) : null;
        return (
          <tr key={g.name + g.currency}><td className="td">{g.name}</td><td className="td"><Money v={g.revenue} c={g.currency} /></td><td className="td"><Money v={g.collected} c={g.currency} /></td><td className="td"><Money v={g.discount} c={g.currency} /></td>
            <td className="td">{full ? <Money v={g.cost} c={g.currency} /> : <span className="text-ink-400">no cost data</span>}</td>
            <td className="td">{margin ? <><Money v={margin} c={g.currency} /> <span className="text-xs text-ink-400">({g.costed.gt(0) ? margin.div(g.costed).times(100).toFixed(1) : '0'}%)</span></> : '—'}</td>
            <td className="td text-xs text-ink-600">{g.withCost}/{g.n} invoices</td></tr>
        );
      })}
    </Table>
  );
}

export default async function Profitability() {
  const v = await getView();
  const rows = v.views.filter((i) => i.status !== 'void');
  const totalCost = rows.filter((r) => r.direct_cost != null).length;
  const exp = new Map<string, Decimal>(); for (const e of v.f.expenses as any[]) exp.set(e.currency, (exp.get(e.currency) ?? new Decimal(0)).plus(e.amount));
  return (
    <>
      <PageHeader title="Profitability" sub="Margins are calculated only where direct cost data exists. Revenue, collected income, expenses and profit are kept separate." />
      <Notice>{rows.length === 0 ? 'No invoices yet.' : totalCost === rows.length ? 'Direct cost is present on every invoice.' : `Direct cost is recorded on ${totalCost} of ${rows.length} invoices. Margins below cover only those invoices; add a direct-cost column when importing invoices to widen coverage.`}</Notice>
      <Card title="By customer"><MarginTable rows={groupMargin(rows, (r) => v.custName.get(r.customer_id ?? '') ?? 'Unassigned')} /></Card>
      <Card title="By service / contract" className="mt-4"><MarginTable rows={groupMargin(rows, (r) => r.service ?? 'Unspecified')} /></Card>
      <Card title="By business unit" className="mt-4"><MarginTable rows={groupMargin(rows, (r) => v.unitName.get(r.business_unit_id ?? '') ?? 'Unassigned')} /></Card>
      <Card title="Recorded expenses (not allocated to invoices)" className="mt-4">
        {exp.size ? <ul className="text-sm">{[...exp.entries()].map(([c, a]) => <li key={c}>{c}: <Money v={a} c={c} /></li>)}</ul> : <p className="text-sm text-ink-600">No expenses recorded. Overall profit is not calculated without expense data.</p>}
      </Card>
    </>
  );
}
