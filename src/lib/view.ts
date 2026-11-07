import { getCtx, loadFinance } from './ctx';
import { enrichInvoices, totalsByCurrency, paymentDelays, collectionPriorities } from './calc/finance';

/** Loads the org's records and derives every authoritative figure with deterministic code. */
export async function getView() {
  const c = await getCtx();
  const f = await loadFinance(c.supabase, c.org.id);
  const views = enrichInvoices(f.invoices, f.allocations, new Date(), f.dueSoonDays);
  const totals = totalsByCurrency(views);
  const delays = paymentDelays(f.invoices, f.allocations, f.payments);
  const priorities = collectionPriorities(views, delays);
  const custName = new Map<string, string>(f.customers.map((x: any) => [x.id, x.name]));
  const unitName = new Map<string, string>(f.units.map((x: any) => [x.id, x.name]));
  return { ...c, f, views, totals, delays, priorities, custName, unitName };
}
export type View = Awaited<ReturnType<typeof getView>>;

/** Compact, citation-friendly snapshot given to Gemini. Contains calculated figures only, capped in size. */
export function aiSnapshot(v: View) {
  const money = (d: { toFixed: (n: number) => string }) => d.toFixed(2);
  return {
    organization: { name: v.org.name, primaryCurrency: v.org.primary_currency },
    asOf: new Date().toISOString().slice(0, 10),
    totalsByCurrency: v.totals.map((t) => ({ currency: t.currency, invoiced: money(t.invoiced), collected: money(t.collected), outstanding: money(t.outstanding), overdue: money(t.overdue), collectionRate: t.collectionRate ? t.collectionRate.toFixed(3) : null, aging: Object.fromEntries(Object.entries(t.aging).map(([k, x]) => [k, money(x)])) })),
    openInvoices: v.views.filter((i) => i.outstanding.gt(0)).sort((a, b) => b.outstanding.comparedTo(a.outstanding)).slice(0, 60).map((i) => ({ reference: i.reference, customer: v.custName.get(i.customer_id ?? '') ?? null, dueDate: i.due_date, currency: i.currency, amount: money(i.amount as any), paid: money(i.paid), outstanding: money(i.outstanding), daysOverdue: i.daysOverdue, status: i.paymentStatus })),
    collectionPriorities: v.priorities.slice(0, 25).map((p) => ({ customer: v.custName.get(p.customerId), currency: p.currency, outstanding: money(p.outstanding), overdue: money(p.overdue), maxDaysOverdue: p.maxDaysOverdue, score: p.score, reasons: p.reasons })),
    customerPaymentBehaviour: [...v.delays.entries()].slice(0, 40).map(([id, d]) => ({ customer: v.custName.get(id), avgDaysAfterDue: Number(d.avgDelay.toFixed(1)), invoicesPaid: d.samples, lateRate: Number(d.lateRate.toFixed(2)) })),
    counts: { invoices: v.f.invoices.length, payments: v.f.payments.length, customers: v.f.customers.length, confirmedAllocations: v.f.allocations.length },
  };
}
