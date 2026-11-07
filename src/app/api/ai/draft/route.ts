import { z } from 'zod';
import { apiAuth, handle, HttpError } from '@/lib/api';
import { consume } from '@/lib/usage';
import { audit } from '@/lib/audit';
import { generateJson } from '@/lib/ai/gemini';
import { getView } from '@/lib/view';

export const maxDuration = 60;
const Out = z.object({ subject: z.string(), body: z.string() });

export async function POST(req: Request) {
  return handle(async () => {
    const { customerId, currency } = z.object({ customerId: z.string().uuid(), currency: z.string().length(3) }).parse(await req.json());
    const { supabase, user, org } = await apiAuth('write_finance');
    await consume(org.id, user.id, 'ai_analysis', { kind: 'reminder_draft' });
    const v = await getView();
    const cust = v.f.customers.find((c: any) => c.id === customerId);
    if (!cust) throw new HttpError(404, 'Customer not found.');
    const p = v.priorities.find((x) => x.customerId === customerId && x.currency === currency);
    const overdue = v.views.filter((i) => i.customer_id === customerId && i.currency === currency && i.daysOverdue > 0).map((i) => ({ invoice: i.reference, dueDate: i.due_date, daysOverdue: i.daysOverdue, outstanding: i.outstanding.toFixed(2) }));
    if (!overdue.length) throw new HttpError(400, 'This customer has no overdue invoices in that currency.');
    const prior = v.f.activities.filter((a: any) => a.customer_id === customerId).slice(-5).map((a: any) => ({ date: a.created_at.slice(0, 10), channel: a.channel, summary: a.summary, outcome: a.outcome }));
    const out = await generateJson(`Draft a polite, professional payment reminder email from ${org.name} to ${cust.name}. Tone: ${p && p.maxDaysOverdue > 60 ? 'firm but courteous' : 'friendly'}. List the overdue invoices exactly as given with references, due dates and outstanding amounts in ${currency}. Do not threaten, invent fees, promise discounts, or mention anything not in the data. End with a placeholder [Your name]. Return JSON {"subject","body"}.`, { customer: cust.name, currency, overdue, previousContact: prior }, Out);
    const { error } = await supabase.from('collection_drafts').insert({ organization_id: org.id, customer_id: customerId, subject: out.subject, body: out.body });
    if (error) throw new HttpError(500, error.message);
    await audit(supabase, org.id, user.id, 'draft.generated', 'customer', customerId);
    return { message: 'Draft created below. It needs approval and is never sent automatically.' };
  });
}
