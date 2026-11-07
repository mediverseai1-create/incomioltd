import Decimal from 'decimal.js';
import type { View } from './view';
import { BUCKETS } from './calc/finance';
import { D } from './money';

export type Section = { title: string; columns: string[]; rows: string[][] };
export type ReportContent = { sections: Section[]; notes: string[] };
export const REPORT_KINDS: Record<string, string> = {
  aging: 'Receivables aging report', collections: 'Collections performance report', reconciliation: 'Payment reconciliation report', cashflow: 'Cash-flow summary',
  customer_income: 'Customer income report', profitability: 'Profitability report', executive: 'Executive financial summary', multi_business: 'Multi-business financial report',
};
const f = (d: Decimal.Value) => D(d).toFixed(2);

export async function buildReport(kind: string, v: View): Promise<ReportContent> {
  const sections: Section[] = []; const notes: string[] = ['Figures are calculated by Incomio from imported records; currencies are never combined.'];
  const open = v.views.filter((i) => i.outstanding.gt(0));
  const summary = (): Section => ({ title: 'Totals by currency', columns: ['Currency', 'Invoiced', 'Collected', 'Outstanding', 'Overdue', 'Collection rate'], rows: v.totals.map((t) => [t.currency, f(t.invoiced), f(t.collected), f(t.outstanding), f(t.overdue), t.collectionRate ? t.collectionRate.times(100).toFixed(1) + '%' : 'n/a']) });
  const aging = (): Section => ({ title: 'Aging of outstanding receivables', columns: ['Currency', ...BUCKETS.map((b) => (b === 'not_due' ? 'Not due' : b + ' days'))], rows: v.totals.map((t) => [t.currency, ...BUCKETS.map((b) => f(t.aging[b]))]) });
  const topCust = (): Section => ({ title: 'Outstanding by customer', columns: ['Customer', 'Currency', 'Outstanding', 'Overdue', 'Oldest overdue (days)', 'Priority score'], rows: v.priorities.map((p) => [v.custName.get(p.customerId) ?? '', p.currency, f(p.outstanding), f(p.overdue), String(p.maxDaysOverdue), String(p.score)]) });

  if (kind === 'aging') { sections.push(summary(), aging(), { title: 'Open invoices', columns: ['Invoice', 'Customer', 'Due', 'Currency', 'Outstanding', 'Days overdue', 'Bucket'], rows: open.sort((a, b) => b.daysOverdue - a.daysOverdue).map((i) => [i.reference, v.custName.get(i.customer_id ?? '') ?? '', i.due_date ?? '', i.currency, f(i.outstanding), String(i.daysOverdue), i.bucket]) }); }
  else if (kind === 'collections') {
    sections.push(topCust(), { title: 'Collection activity log', columns: ['Date', 'Customer', 'Channel', 'Summary', 'Outcome'], rows: (v.f.activities as any[]).map((a) => [a.created_at.slice(0, 10), v.custName.get(a.customer_id) ?? '', a.channel, a.summary, a.outcome ?? '']) });
    if (!v.f.activities.length) notes.push('No collection activity has been logged, so recovery outcomes cannot be reported.');
  } else if (kind === 'reconciliation') {
    const { data } = await v.supabase.from('reconciliation_matches').select('kind,status,proposed_amount,confidence').eq('organization_id', v.org.id);
    const rows = ['suggested', 'partial', 'overpayment', 'underpayment', 'duplicate'].flatMap((k) => ['pending', 'approved', 'rejected', 'investigate'].map((s) => [k, s, String((data ?? []).filter((m) => m.kind === k && m.status === s).length)])).filter((r) => r[2] !== '0');
    sections.push({ title: 'Match suggestions by type and status', columns: ['Type', 'Status', 'Count'], rows }, { title: 'Confirmed allocations', columns: ['Count', 'Total allocated'], rows: [[String(v.f.allocations.length), f((v.f.allocations as any[]).reduce((s, a) => s.plus(a.amount), new Decimal(0)))]] });
    notes.push('Allocation total is mixed-currency count only; see Payments for per-currency detail.');
  } else if (kind === 'cashflow') {
    const { data } = await v.supabase.from('cash_flow_forecasts').select('currency,horizon_days,result,created_at').eq('organization_id', v.org.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (data) sections.push({ title: `Latest saved forecast (${data.currency}, ${data.horizon_days} days, ${data.created_at.slice(0, 10)})`, columns: ['Scenario', 'Total inflow', 'Total outflow', 'Net'], rows: (data.result.scenarios as any[]).map((s) => [s.name, s.totalInflow, s.totalOutflow, s.net]) });
    else notes.push('No forecast has been saved yet. Save one on the Cash Flow page.');
    sections.push(aging());
  } else if (kind === 'customer_income') {
    const m = new Map<string, Decimal>(); for (const i of v.views) { if (i.status === 'void') continue; const k = (v.custName.get(i.customer_id ?? '') ?? 'Unassigned') + '|' + i.currency; m.set(k, (m.get(k) ?? new Decimal(0)).plus(Decimal.min(i.paid, D(i.amount)))); }
    sections.push({ title: 'Collected income by customer', columns: ['Customer', 'Currency', 'Collected'], rows: [...m.entries()].map(([k, a]) => [...k.split('|'), f(a)]).sort((a, b) => Number(b[2]) - Number(a[2])) });
  } else if (kind === 'profitability') {
    const rows = v.views.filter((i) => i.status !== 'void' && i.direct_cost != null).map((i) => [i.reference, v.custName.get(i.customer_id ?? '') ?? '', i.currency, f(i.amount), f(i.direct_cost!), f(D(i.amount).minus(i.direct_cost!))]);
    sections.push({ title: 'Invoices with recorded direct cost', columns: ['Invoice', 'Customer', 'Currency', 'Invoiced', 'Direct cost', 'Margin'], rows });
    notes.push(`Margin is shown for ${rows.length} of ${v.views.length} invoices; invoices without direct cost are excluded rather than assumed.`);
  } else if (kind === 'multi_business') {
    const m = new Map<string, { inv: Decimal; out: Decimal; od: Decimal }>();
    for (const i of v.views) { if (i.status === 'void') continue; const k = (v.unitName.get(i.business_unit_id ?? '') ?? 'Unassigned') + '|' + i.currency; const g = m.get(k) ?? { inv: new Decimal(0), out: new Decimal(0), od: new Decimal(0) }; g.inv = g.inv.plus(i.amount); g.out = g.out.plus(i.outstanding); if (i.daysOverdue > 0) g.od = g.od.plus(i.outstanding); m.set(k, g); }
    sections.push({ title: 'By business unit', columns: ['Unit', 'Currency', 'Invoiced', 'Outstanding', 'Overdue'], rows: [...m.entries()].map(([k, g]) => [...k.split('|'), f(g.inv), f(g.out), f(g.od)]) }, summary());
  } else { sections.push(summary(), aging(), topCust()); }
  return { sections, notes };
}
