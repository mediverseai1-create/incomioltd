import Decimal from 'decimal.js';
import { D, sum } from '../money';

export type Inv = { id: string; customer_id: string | null; business_unit_id?: string | null; reference: string; issue_date: string | null; due_date: string | null; currency: string; amount: string | number; direct_cost?: string | number | null; discount?: string | number | null; service?: string | null; status: string };
export type Alloc = { payment_id: string; invoice_id: string; amount: string | number };
export type Pay = { id: string; customer_id: string | null; payment_date: string; amount: string | number; currency: string; reference?: string | null };

export type Bucket = 'not_due' | '1-30' | '31-60' | '61-90' | '90+';
export const BUCKETS: Bucket[] = ['not_due', '1-30', '31-60', '61-90', '90+'];

export const dayDiff = (a: string | Date, b: string | Date) =>
  Math.round((new Date(a).getTime() - new Date(b).getTime()) / 86400000);

export function paidMap(allocs: Alloc[]) {
  const m = new Map<string, Decimal>();
  for (const a of allocs) m.set(a.invoice_id, (m.get(a.invoice_id) ?? new Decimal(0)).plus(a.amount));
  return m;
}

export function bucketFor(daysOverdue: number): Bucket {
  if (daysOverdue <= 0) return 'not_due';
  if (daysOverdue <= 30) return '1-30';
  if (daysOverdue <= 60) return '31-60';
  if (daysOverdue <= 90) return '61-90';
  return '90+';
}

export type InvView = Inv & {
  paid: Decimal; outstanding: Decimal; daysOverdue: number; bucket: Bucket;
  paymentStatus: 'paid' | 'partial' | 'unpaid' | 'overpaid' | 'void'; dueSoon: boolean;
};

export function enrichInvoices(invoices: Inv[], allocs: Alloc[], today = new Date(), dueSoonDays = 7): InvView[] {
  const paid = paidMap(allocs);
  return invoices.map((inv) => {
    const p = paid.get(inv.id) ?? new Decimal(0);
    const amt = D(inv.amount);
    const outstanding = inv.status === 'void' ? new Decimal(0) : Decimal.max(amt.minus(p), 0);
    const daysOverdue = inv.due_date && outstanding.gt(0) ? dayDiff(today, inv.due_date) : 0;
    const paymentStatus: InvView['paymentStatus'] = inv.status === 'void' ? 'void' : p.gt(amt) ? 'overpaid' : p.gte(amt) && amt.gt(0) ? 'paid' : p.gt(0) ? 'partial' : 'unpaid';
    return { ...inv, paid: p, outstanding, daysOverdue, bucket: bucketFor(daysOverdue), paymentStatus,
      dueSoon: !!inv.due_date && outstanding.gt(0) && daysOverdue <= 0 && daysOverdue >= -dueSoonDays };
  });
}

/** Totals are always per currency. Mixing currencies without a recorded rate is never done. */
export type CurrencyTotals = { currency: string; invoiced: Decimal; collected: Decimal; outstanding: Decimal; overdue: Decimal; aging: Record<Bucket, Decimal>; collectionRate: Decimal | null };

export function totalsByCurrency(views: InvView[]): CurrencyTotals[] {
  const out = new Map<string, CurrencyTotals>();
  for (const v of views) {
    if (v.status === 'void') continue;
    let t = out.get(v.currency);
    if (!t) {
      t = { currency: v.currency, invoiced: new Decimal(0), collected: new Decimal(0), outstanding: new Decimal(0), overdue: new Decimal(0),
        aging: { not_due: new Decimal(0), '1-30': new Decimal(0), '31-60': new Decimal(0), '61-90': new Decimal(0), '90+': new Decimal(0) }, collectionRate: null };
      out.set(v.currency, t);
    }
    t.invoiced = t.invoiced.plus(v.amount);
    t.collected = t.collected.plus(Decimal.min(v.paid, D(v.amount)));
    t.outstanding = t.outstanding.plus(v.outstanding);
    if (v.daysOverdue > 0) t.overdue = t.overdue.plus(v.outstanding);
    t.aging[v.bucket] = t.aging[v.bucket].plus(v.outstanding);
  }
  for (const t of out.values()) t.collectionRate = t.invoiced.gt(0) ? t.collected.div(t.invoiced) : null;
  return [...out.values()].sort((a, b) => b.invoiced.comparedTo(a.invoiced));
}

/** Average days paid after due date per customer (negative = early), from confirmed allocations. */
export function paymentDelays(invoices: Inv[], allocs: Alloc[], payments: Pay[]) {
  const inv = new Map(invoices.map((i) => [i.id, i]));
  const pay = new Map(payments.map((p) => [p.id, p]));
  const acc = new Map<string, { sum: number; n: number; late: number }>();
  for (const a of allocs) {
    const i = inv.get(a.invoice_id), p = pay.get(a.payment_id);
    if (!i?.customer_id || !i.due_date || !p) continue;
    const d = dayDiff(p.payment_date, i.due_date);
    const cur = acc.get(i.customer_id) ?? { sum: 0, n: 0, late: 0 };
    cur.sum += d; cur.n += 1; if (d > 0) cur.late += 1;
    acc.set(i.customer_id, cur);
  }
  const res = new Map<string, { avgDelay: number; samples: number; lateRate: number }>();
  for (const [k, v] of acc) res.set(k, { avgDelay: v.sum / v.n, samples: v.n, lateRate: v.late / v.n });
  return res;
}

export type Priority = { customerId: string; currency: string; outstanding: Decimal; overdue: Decimal; maxDaysOverdue: number; score: number; level: 'high' | 'medium' | 'low'; reasons: string[] };

/** Transparent additive score 0-100. Each component is listed in `reasons`. */
export function collectionPriorities(views: InvView[], delays: ReturnType<typeof paymentDelays>): Priority[] {
  const groups = new Map<string, InvView[]>();
  for (const v of views) {
    if (!v.customer_id || v.outstanding.lte(0)) continue;
    const k = v.customer_id + '|' + v.currency;
    groups.set(k, [...(groups.get(k) ?? []), v]);
  }
  const maxOut = [...groups.values()].map((g) => sum(g.map((x) => x.outstanding))).reduce((a, b) => Decimal.max(a, b), new Decimal(1));
  const res: Priority[] = [];
  for (const [k, g] of groups) {
    const [customerId, currency] = k.split('|');
    const outstanding = sum(g.map((x) => x.outstanding));
    const overdue = sum(g.filter((x) => x.daysOverdue > 0).map((x) => x.outstanding));
    const maxDays = Math.max(0, ...g.map((x) => x.daysOverdue));
    const reasons: string[] = [];
    let score = 0;
    const age = Math.min(40, Math.round((maxDays / 90) * 40));
    if (age > 0) { score += age; reasons.push(`Oldest invoice is ${maxDays} days overdue (+${age})`); }
    const size = overdue.gt(0) ? Math.round(overdue.div(maxOut).times(30).toNumber()) : 0;
    if (size > 0) { score += size; reasons.push(`Overdue balance is ${overdue.div(maxOut).times(100).toFixed(0)}% of the largest account (+${size})`); }
    const d = delays.get(customerId);
    if (d && d.samples >= 2 && d.lateRate >= 0.5) { const p = Math.round(d.lateRate * 20); score += p; reasons.push(`Paid late on ${(d.lateRate * 100).toFixed(0)}% of ${d.samples} past invoices (+${p})`); }
    const partial = g.some((x) => x.paymentStatus === 'partial');
    if (partial) { score += 5; reasons.push('Has partially paid invoices (+5)'); }
    if (reasons.length === 0) reasons.push('Nothing overdue yet');
    score = Math.min(100, score);
    res.push({ customerId, currency, outstanding, overdue, maxDaysOverdue: maxDays, score, level: score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low', reasons });
  }
  return res.sort((a, b) => b.score - a.score);
}

export function revenueByKey<T extends { currency: string; amount: string | number }>(rows: T[], key: (r: T) => string | null) {
  const m = new Map<string, Decimal>();
  for (const r of rows) { const k = (key(r) ?? 'Unassigned') + '|' + r.currency; m.set(k, (m.get(k) ?? new Decimal(0)).plus(r.amount)); }
  return [...m.entries()].map(([k, v]) => { const [name, currency] = k.split('|'); return { name, currency, amount: v }; }).sort((a, b) => b.amount.comparedTo(a.amount));
}
