import Decimal from 'decimal.js';
import { D } from '../money';
import { dayDiff, type InvView } from './finance';

export type Assumptions = {
  currency: string; horizonDays: number; openingBalance: string | null;
  scenarios: { name: 'best' | 'expected' | 'conservative'; extraDelayDays: number; collectRate: number }[];
};
export const defaultAssumptions = (currency: string, horizonDays = 90): Assumptions => ({
  currency, horizonDays, openingBalance: null,
  scenarios: [
    { name: 'best', extraDelayDays: -3, collectRate: 1 },
    { name: 'expected', extraDelayDays: 0, collectRate: 0.97 },
    { name: 'conservative', extraDelayDays: 21, collectRate: 0.85 },
  ],
});

export type Obligation = { due_date: string; amount: string | number; currency: string; status: string };
export type Expense = { expense_date: string; amount: string | number; currency: string; recurring: boolean | null };

export type Week = { weekStart: string; inflow: string; outflow: string; net: string; cumulative: string };
export type ScenarioResult = { name: string; weeks: Week[]; totalInflow: string; totalOutflow: string; net: string; shortfallWeeks: string[]; lowestCumulative: string };
export type ForecastResult = { scenarios: ScenarioResult[]; dataUsed: { openInvoices: number; obligations: number; recurringMonthlyExpense: string; customersWithHistory: number }; warnings: string[] };

export function buildForecast(a: Assumptions, views: InvView[], delays: Map<string, { avgDelay: number; samples: number }>, obligations: Obligation[], expenses: Expense[], today = new Date()): ForecastResult {
  const open = views.filter((v) => v.currency === a.currency && v.outstanding.gt(0));
  const obs = obligations.filter((o) => o.currency === a.currency && o.status === 'open');
  // recurring monthly expense = average of recurring expenses over their observed months
  const rec = expenses.filter((e) => e.currency === a.currency && e.recurring);
  const months = new Set(rec.map((e) => e.expense_date.slice(0, 7)));
  const recMonthly = months.size ? rec.reduce((s, e) => s.plus(e.amount), new Decimal(0)).div(months.size) : new Decimal(0);
  const warnings: string[] = [];
  if (!open.length) warnings.push('No open invoices in this currency; no expected receipts to forecast.');
  if (!obs.length && recMonthly.isZero()) warnings.push('No expense or supplier data supplied; outflows are zero, so net figures show receipts only.');
  if (a.openingBalance === null) warnings.push('No opening cash balance supplied; cumulative figures show net movement, not a bank balance.');
  const nWeeks = Math.ceil(a.horizonDays / 7);
  const start = new Date(today); start.setUTCHours(0, 0, 0, 0);
  const weekOf = (d: Date) => Math.floor(dayDiff(d, start) / 7);

  const scenarios: ScenarioResult[] = a.scenarios.map((sc) => {
    const inflow = Array.from({ length: nWeeks }, () => new Decimal(0));
    const outflow = Array.from({ length: nWeeks }, () => new Decimal(0));
    for (const v of open) {
      const hist = v.customer_id ? delays.get(v.customer_id) : undefined;
      const base = hist ? Math.round(hist.avgDelay) : 0;
      const due = new Date(v.due_date ?? today);
      const exp = new Date(due.getTime() + (Math.max(base, 0) + sc.extraDelayDays) * 86400000);
      let w = weekOf(exp); if (w < 0) w = 0; // already late → expect soon
      if (w < nWeeks) inflow[w] = inflow[w].plus(v.outstanding.times(sc.collectRate));
    }
    for (const o of obs) { let w = weekOf(new Date(o.due_date)); if (w < 0) w = 0; if (w < nWeeks) outflow[w] = outflow[w].plus(o.amount); }
    const weekly = recMonthly.times(12).div(52);
    for (let w = 0; w < nWeeks; w++) outflow[w] = outflow[w].plus(weekly);
    let cum = D(a.openingBalance); let low = cum; const short: string[] = [];
    const weeks: Week[] = inflow.map((inf, w) => {
      const net = inf.minus(outflow[w]); cum = cum.plus(net); if (cum.lt(low)) low = cum;
      const ws = new Date(start.getTime() + w * 7 * 86400000).toISOString().slice(0, 10);
      if (a.openingBalance !== null && cum.lt(0)) short.push(ws);
      return { weekStart: ws, inflow: inf.toFixed(2), outflow: outflow[w].toFixed(2), net: net.toFixed(2), cumulative: cum.toFixed(2) };
    });
    const ti = inflow.reduce((s, x) => s.plus(x), new Decimal(0)), to = outflow.reduce((s, x) => s.plus(x), new Decimal(0));
    return { name: sc.name, weeks, totalInflow: ti.toFixed(2), totalOutflow: to.toFixed(2), net: ti.minus(to).toFixed(2), shortfallWeeks: short, lowestCumulative: low.toFixed(2) };
  });
  return { scenarios, warnings, dataUsed: { openInvoices: open.length, obligations: obs.length, recurringMonthlyExpense: recMonthly.toFixed(2), customersWithHistory: delays.size } };
}

export function forecastConfidence(r: ForecastResult): 'low' | 'medium' | 'high' {
  const { openInvoices, customersWithHistory } = r.dataUsed;
  if (openInvoices === 0 || customersWithHistory === 0) return 'low';
  return customersWithHistory >= 5 && r.warnings.length === 0 ? 'high' : 'medium';
}
