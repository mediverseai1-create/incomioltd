import Decimal from 'decimal.js';
import { D } from '../money';
import { dayDiff, type Inv, type Pay, type Alloc } from './finance';

export type Evidence = { signal: string; detail: string; weight: number };
export type Suggestion = {
  payment_id: string; invoice_id: string | null; kind: 'suggested' | 'partial' | 'overpayment' | 'underpayment' | 'duplicate';
  proposed_amount: string; confidence: number; evidence: Evidence[];
};

const norm = (s: string | null | undefined) => (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Deterministic matching. Produces *suggestions only*; nothing is allocated until a human approves. */
export function suggestMatches(invoices: Inv[], payments: Pay[], allocs: Alloc[], existingKeys: Set<string> = new Set()): Suggestion[] {
  const paidInv = new Map<string, Decimal>(), usedPay = new Map<string, Decimal>();
  for (const a of allocs) {
    paidInv.set(a.invoice_id, (paidInv.get(a.invoice_id) ?? new Decimal(0)).plus(a.amount));
    usedPay.set(a.payment_id, (usedPay.get(a.payment_id) ?? new Decimal(0)).plus(a.amount));
  }
  const open = invoices.filter((i) => i.status !== 'void').map((i) => ({ i, bal: D(i.amount).minus(paidInv.get(i.id) ?? 0) })).filter((x) => x.bal.gt(0));
  const out: Suggestion[] = [];

  // duplicate payments: same customer, currency, amount, date
  const seen = new Map<string, Pay>();
  for (const p of payments) {
    const k = [p.customer_id, p.currency, D(p.amount).toFixed(2), p.payment_date].join('|');
    const first = seen.get(k);
    if (first && p.customer_id) {
      const dk = `dup:${first.id}:${p.id}`;
      if (!existingKeys.has(dk)) out.push({ payment_id: p.id, invoice_id: null, kind: 'duplicate', proposed_amount: D(p.amount).toFixed(2), confidence: 0.7,
        evidence: [{ signal: 'same_amount_date_customer', detail: `Same customer, amount and date as payment ${first.reference ?? first.id.slice(0, 8)}`, weight: 0.7 }] });
    } else seen.set(k, p);
  }

  for (const p of payments) {
    const remaining = D(p.amount).minus(usedPay.get(p.id) ?? 0);
    if (remaining.lte(0)) continue;
    const cands = open.filter((x) => x.i.currency === p.currency);
    let best: Suggestion | null = null;
    for (const { i, bal } of cands) {
      const ev: Evidence[] = []; let score = 0;
      const ref = norm(i.reference);
      if (ref.length >= 3 && norm(p.reference).includes(ref)) { score += 0.5; ev.push({ signal: 'reference', detail: `Payment reference contains invoice ${i.reference}`, weight: 0.5 }); }
      if (p.customer_id && p.customer_id === i.customer_id) { score += 0.2; ev.push({ signal: 'customer', detail: 'Same customer', weight: 0.2 }); }
      if (remaining.eq(bal)) { score += 0.3; ev.push({ signal: 'amount', detail: `Amount equals outstanding balance (${bal.toFixed(2)})`, weight: 0.3 }); }
      else if (score > 0) ev.push({ signal: 'amount_diff', detail: `Payment ${remaining.toFixed(2)} vs balance ${bal.toFixed(2)} (difference ${remaining.minus(bal).toFixed(2)})`, weight: 0 });
      if (i.due_date && Math.abs(dayDiff(p.payment_date, i.due_date)) <= 14) { score += 0.1; ev.push({ signal: 'date', detail: 'Paid within 14 days of due date', weight: 0.1 }); }
      if (score < 0.4) continue;
      const key = `${p.id}:${i.id}`;
      if (existingKeys.has(key)) continue;
      const kind: Suggestion['kind'] = remaining.eq(bal) ? 'suggested' : remaining.gt(bal) ? 'overpayment' : 'underpayment';
      const alloc = Decimal.min(remaining, bal);
      const s: Suggestion = { payment_id: p.id, invoice_id: i.id, kind, proposed_amount: alloc.toFixed(2), confidence: Math.min(0.99, Number(score.toFixed(2))), evidence: ev };
      if (!best || s.confidence > best.confidence) best = s;
    }
    if (best) out.push(best);
  }
  return out;
}
