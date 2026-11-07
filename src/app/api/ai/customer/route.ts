import { z } from 'zod';
import { apiAuth, handle, HttpError } from '@/lib/api';
import { consume } from '@/lib/usage';
import { generateJson } from '@/lib/ai/gemini';
import { getView } from '@/lib/view';

export const maxDuration = 60;
const Out = z.object({ observations: z.array(z.object({ title: z.string(), explanation: z.string(), confidence: z.number().min(0).max(1).default(0.5) })).max(4) });

export async function POST(req: Request) {
  return handle(async () => {
    const { customerId } = z.object({ customerId: z.string().uuid() }).parse(await req.json());
    const { supabase, user, org } = await apiAuth('run_ai');
    await consume(org.id, user.id, 'ai_analysis', { kind: 'customer' });
    const v = await getView();
    const cust = v.f.customers.find((c: any) => c.id === customerId);
    if (!cust) throw new HttpError(404, 'Customer not found.');
    const d = v.delays.get(customerId);
    const data = {
      customer: cust.name, paymentBehaviour: d ? { avgDaysAfterDue: d.avgDelay.toFixed(1), invoicesPaid: d.samples, lateRate: d.lateRate.toFixed(2) } : null,
      invoices: v.views.filter((i) => i.customer_id === customerId).slice(0, 40).map((i) => ({ reference: i.reference, currency: i.currency, amount: String(i.amount), outstanding: i.outstanding.toFixed(2), daysOverdue: i.daysOverdue, status: i.paymentStatus })),
      priority: v.priorities.filter((p) => p.customerId === customerId).map((p) => ({ currency: p.currency, score: p.score, reasons: p.reasons })),
    };
    const out = await generateJson('Give up to 4 factual observations about this customer\'s financial relationship (payment timing, balance trend, risk). Return JSON {"observations":[{"title","explanation","confidence"}]}. Do not speculate beyond the data.', data, Out);
    if (out.observations.length) await supabase.from('financial_insights').insert(out.observations.map((o) => ({ organization_id: org.id, title: o.title, category: 'customer', severity: 'low', explanation: o.explanation, confidence: o.confidence, agent_key: `customer:${customerId}`, review_status: 'reviewed' })));
    return { message: `${out.observations.length} observation(s) added.` };
  });
}
