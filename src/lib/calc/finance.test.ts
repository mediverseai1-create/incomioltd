import { describe, expect, it } from 'vitest';
import { enrichInvoices, totalsByCurrency, bucketFor, paymentDelays } from './finance';
import { suggestMatches } from './reconcile';
import { buildForecast, defaultAssumptions } from './forecast';
import { parseMoney } from '../money';
import { validateRows, parseDate } from '../import';

const today = new Date('2025-06-30T00:00:00Z');
const inv = (id: string, amount: string, due: string, cur = 'USD', cust = 'c1') => ({ id, customer_id: cust, reference: 'INV-' + id, issue_date: null, due_date: due, currency: cur, amount, status: 'open' });

describe('money', () => {
  it('parses formats and rejects junk', () => {
    expect(parseMoney('$1,234.50')?.toFixed(2)).toBe('1234.50');
    expect(parseMoney('(500)')?.toFixed(2)).toBe('-500.00');
    expect(parseMoney('abc')).toBeNull();
  });
  it('avoids float error', () => {
    const v = enrichInvoices([inv('1', '0.30', '2025-06-01')], [{ payment_id: 'p', invoice_id: '1', amount: '0.10' }, { payment_id: 'q', invoice_id: '1', amount: '0.20' }], today);
    expect(v[0].outstanding.toFixed(2)).toBe('0.00'); expect(v[0].paymentStatus).toBe('paid');
  });
});

describe('receivables', () => {
  it('buckets aging', () => { expect([0, 1, 30, 31, 61, 91].map(bucketFor)).toEqual(['not_due', '1-30', '1-30', '31-60', '61-90', '90+']); });
  it('never mixes currencies and handles partials', () => {
    const v = enrichInvoices([inv('1', '100', '2025-05-01'), inv('2', '50', '2025-08-01', 'EUR')], [{ payment_id: 'p', invoice_id: '1', amount: '40' }], today);
    const t = totalsByCurrency(v);
    expect(t.map((x) => x.currency).sort()).toEqual(['EUR', 'USD']);
    expect(t.find((x) => x.currency === 'USD')!.outstanding.toFixed(2)).toBe('60.00');
    expect(t.find((x) => x.currency === 'USD')!.overdue.toFixed(2)).toBe('60.00');
    expect(v[0].paymentStatus).toBe('partial');
  });
  it('computes payment delay from confirmed allocations only', () => {
    const d = paymentDelays([inv('1', '100', '2025-05-01')], [{ payment_id: 'p', invoice_id: '1', amount: '100' }], [{ id: 'p', customer_id: 'c1', payment_date: '2025-05-11', amount: '100', currency: 'USD' }]);
    expect(d.get('c1')!.avgDelay).toBe(10);
  });
});

describe('reconciliation', () => {
  it('suggests but never allocates, and does not double count', () => {
    const s = suggestMatches([inv('1', '100', '2025-05-01')], [{ id: 'p', customer_id: 'c1', payment_date: '2025-05-02', amount: '100', currency: 'USD', reference: 'Payment for INV-1' }], []);
    expect(s).toHaveLength(1); expect(s[0].kind).toBe('suggested'); expect(s[0].confidence).toBeGreaterThan(0.9);
    const done = suggestMatches([inv('1', '100', '2025-05-01')], [{ id: 'p', customer_id: 'c1', payment_date: '2025-05-02', amount: '100', currency: 'USD', reference: 'INV-1' }], [{ payment_id: 'p', invoice_id: '1', amount: '100' }]);
    expect(done).toHaveLength(0);
  });
  it('flags duplicates and under/over payments', () => {
    const p = { customer_id: 'c1', payment_date: '2025-05-02', amount: '80', currency: 'USD', reference: 'INV-1' };
    const s = suggestMatches([inv('1', '100', '2025-05-01')], [{ id: 'a', ...p }, { id: 'b', ...p }], []);
    expect(s.some((x) => x.kind === 'duplicate')).toBe(true); expect(s.some((x) => x.kind === 'underpayment')).toBe(true);
  });
  it('does not match across currencies', () => {
    expect(suggestMatches([inv('1', '100', '2025-05-01', 'EUR')], [{ id: 'p', customer_id: 'c1', payment_date: '2025-05-02', amount: '100', currency: 'USD', reference: 'INV-1' }], [])).toHaveLength(0);
  });
});

describe('forecast', () => {
  it('places receipts by due date + customer delay and warns without opening balance', () => {
    const v = enrichInvoices([inv('1', '100', '2025-07-07')], [], today);
    const r = buildForecast(defaultAssumptions('USD', 30), v, new Map(), [], [], today);
    const exp = r.scenarios.find((s) => s.name === 'expected')!;
    expect(Number(exp.totalInflow)).toBeCloseTo(97, 2);
    expect(r.warnings.join()).toMatch(/opening cash/);
  });
});

describe('import validation', () => {
  it('rejects bad rows without silently dropping', () => {
    const r = validateRows('invoices', [{ n: 'A1', a: '10', d: '2025-01-31' }, { n: 'A2', a: 'x', d: 'nope' }], { reference: 'n', amount: 'a', due_date: 'd' }, 'USD');
    expect(r[0].errors).toHaveLength(0); expect(r[0].record!.currency).toBe('USD'); expect(r[1].errors.length).toBeGreaterThan(0);
  });
  it('parses dates', () => { expect(parseDate('2025-02-30')).toBeNull(); expect(parseDate('25/12/2025')).toBe('2025-12-25'); });
});
