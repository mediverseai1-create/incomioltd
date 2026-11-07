import { getView } from '@/lib/view';
import { can } from '@/lib/rbac';
import { fmtMoney } from '@/lib/money';
import { buildForecast, defaultAssumptions, forecastConfidence } from '@/lib/calc/forecast';
import { createExpense, createObligation } from '../actions';
import { ActionForm, Field, ApiButton } from '@/components/forms';
import { Lines, Bars } from '@/components/charts';
import { PageHeader, Card, Stat, Notice, Badge, Empty } from '@/components/ui';

export const metadata = { title: 'Cash Flow' };

export default async function CashFlow({ searchParams }: { searchParams: Promise<{ cur?: string; h?: string; open?: string; cons?: string }> }) {
  const v = await getView(); const sp = await searchParams;
  const cur = (sp.cur || v.totals[0]?.currency || v.org.primary_currency).toUpperCase();
  const h = [30, 60, 90, 180].includes(Number(sp.h)) ? Number(sp.h) : 90;
  const a = defaultAssumptions(cur, h);
  if (sp.open && !isNaN(Number(sp.open))) a.openingBalance = String(Number(sp.open));
  if (sp.cons && Number(sp.cons) > 0) a.scenarios[2].extraDelayDays = Math.min(120, Number(sp.cons));
  const r = buildForecast(a, v.views, v.delays, v.f.obligations, v.f.expenses);
  const conf = forecastConfidence(r);
  const { data: saved } = await v.supabase.from('cash_flow_forecasts').select('narrative,created_at,currency').eq('organization_id', v.org.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
  const exp = r.scenarios.find((s) => s.name === 'expected')!;
  const lines = exp.weeks.map((w, i) => ({ name: w.weekStart.slice(5), best: Number(r.scenarios[0].weeks[i].cumulative), expected: Number(w.cumulative), conservative: Number(r.scenarios[2].weeks[i].cumulative) }));
  const flows = exp.weeks.map((w) => ({ name: w.weekStart.slice(5), Inflow: Number(w.inflow), Outflow: Number(w.outflow) }));
  const months = new Map<string, number>(); for (const p of v.f.payments.filter((p: any) => p.currency === cur)) months.set(p.payment_date.slice(0, 7), (months.get(p.payment_date.slice(0, 7)) ?? 0) + Number(p.amount));
  const hist = [...months.entries()].sort().slice(-12).map(([name, Received]) => ({ name, Received }));
  return (
    <>
      <PageHeader title="Cash Flow" sub="Scenario forecast from open invoices, each customer's observed payment timing, supplier obligations and recurring expenses. Estimates, not guaranteed balances.">
        {can(v.role, 'run_ai') && <ApiButton url="/api/forecast" body={{ currency: cur, horizonDays: h, openingBalance: a.openingBalance, conservativeDelay: a.scenarios[2].extraDelayDays }} label="Save forecast & explain with AI" className="btn btn-primary" />}
      </PageHeader>
      <form className="card mb-4 grid gap-3 p-4 md:grid-cols-5">
        <div><label className="label" htmlFor="cur">Currency</label><input id="cur" name="cur" defaultValue={cur} className="input" maxLength={3} /></div>
        <div><label className="label" htmlFor="h">Horizon</label><select id="h" name="h" defaultValue={String(h)} className="input">{[30, 60, 90, 180].map((d) => <option key={d} value={d}>{d} days</option>)}</select></div>
        <div><label className="label" htmlFor="open">Opening cash (optional)</label><input id="open" name="open" defaultValue={sp.open ?? ''} className="input" placeholder="Enter to show shortfalls" /></div>
        <div><label className="label" htmlFor="cons">Conservative extra delay (days)</label><input id="cons" name="cons" defaultValue={a.scenarios[2].extraDelayDays} className="input" /></div>
        <div className="flex items-end"><button className="btn btn-ghost w-full">Recalculate</button></div>
      </form>
      {r.warnings.map((w) => <Notice key={w} tone="warn">{w}</Notice>)}
      {r.dataUsed.openInvoices === 0 && r.dataUsed.obligations === 0 ? <Empty title="Nothing to forecast" body={`No open ${cur} invoices or obligations. Import invoices to see expected receipts.`} cta={{ href: '/app/data', label: 'Import data' }} /> : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {r.scenarios.map((s) => <Stat key={s.name} label={`${s.name} · net`} value={fmtMoney(s.net, cur)} hint={`In ${fmtMoney(s.totalInflow, cur)} · out ${fmtMoney(s.totalOutflow, cur)}`} tone={Number(s.net) < 0 ? 'terra' : 'green'} />)}
            <Stat label="Confidence" value={conf} hint={`${r.dataUsed.customersWithHistory} customer(s) with payment history`} />
          </div>
          {a.openingBalance !== null && r.scenarios.some((s) => s.shortfallWeeks.length) && <Notice tone="warn">Potential shortfall: {r.scenarios.filter((s) => s.shortfallWeeks.length).map((s) => `${s.name} scenario goes negative from week of ${s.shortfallWeeks[0]}`).join('; ')}.</Notice>}
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card title={`Cumulative net movement${a.openingBalance !== null ? ' (incl. opening cash)' : ''}`}><Lines data={lines} keys={['best', 'expected', 'conservative']} /></Card>
            <Card title="Weekly inflow vs outflow (expected)"><Bars data={flows} keys={['Inflow', 'Outflow']} /></Card>
          </div>
        </>
      )}
      <Card title="Assumptions" className="mt-4">
        <ul className="list-disc pl-5 text-sm text-ink-600">
          <li>Each open invoice is expected on its due date plus the customer&apos;s average observed delay (0 if no history); overdue balances are expected in week 1.</li>
          {a.scenarios.map((s) => <li key={s.name}><b>{s.name}</b>: {s.extraDelayDays >= 0 ? '+' : ''}{s.extraDelayDays} days vs expected, {Math.round(s.collectRate * 100)}% of balances collected.</li>)}
          <li>Outflows: open supplier obligations on due dates plus average recurring expenses ({fmtMoney(r.dataUsed.recurringMonthlyExpense, cur)}/month). Non-recurring expenses are not projected.</li>
          <li>Data used: {r.dataUsed.openInvoices} open invoices, {r.dataUsed.obligations} obligations.</li>
        </ul>
      </Card>
      {saved?.narrative && <Card title={`AI explanation (${saved.currency}, ${saved.created_at.slice(0, 10)})`} className="mt-4"><p className="whitespace-pre-wrap text-sm">{saved.narrative}</p></Card>}
      <Card title="Historical receipts" className="mt-4">{hist.length ? <Bars data={hist} keys={['Received']} height={200} /> : <p className="text-sm text-ink-600">No payments recorded in {cur}.</p>}</Card>
      {can(v.role, 'write_finance') && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card title="Add supplier obligation"><ActionForm action={createObligation} submit="Add"><div className="grid gap-3 md:grid-cols-2"><Field label="Supplier" name="supplier" required /><Field label="Due date" name="due_date" type="date" required /><Field label="Amount" name="amount" required /><Field label="Currency" name="currency" defaultValue={cur} required /></div></ActionForm></Card>
          <Card title="Add expense"><ActionForm action={createExpense} submit="Add"><div className="grid gap-3 md:grid-cols-2"><Field label="Date" name="expense_date" type="date" required /><Field label="Vendor" name="vendor" /><Field label="Category" name="category" /><Field label="Amount" name="amount" required /><Field label="Currency" name="currency" defaultValue={cur} required /><label className="flex items-center gap-2 pt-6 text-sm"><input type="checkbox" name="recurring" /> Recurring monthly</label></div></ActionForm></Card>
        </div>
      )}
      <p className="mt-4 text-xs text-ink-400"><Badge>Note</Badge> Confidence reflects how much payment history backs the forecast; it is not a statistical guarantee.</p>
    </>
  );
}
