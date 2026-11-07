import { z } from 'zod';
import { apiAuth, handle } from '@/lib/api';
import { consume } from '@/lib/usage';
import { generateJson } from '@/lib/ai/gemini';
import { getView, aiSnapshot } from '@/lib/view';

export const maxDuration = 60;
const Out = z.object({ answer: z.string(), citations: z.array(z.string()).default([]), missing_data: z.string().nullable().optional() });

export async function POST(req: Request) {
  return handle(async () => {
    const { question } = z.object({ question: z.string().min(2).max(1000) }).parse(await req.json());
    const { supabase, user, org } = await apiAuth('run_ai');
    await consume(org.id, user.id, 'ask_incomio');
    const v = await getView();
    const snap: Record<string, unknown> = aiSnapshot(v);
    const today = new Date().toISOString().slice(0, 10);
    snap.recentPayments = [...v.f.payments].sort((a: any, b: any) => b.payment_date.localeCompare(a.payment_date)).slice(0, 40).map((p: any) => ({ date: p.payment_date, customer: v.custName.get(p.customer_id) ?? null, reference: p.reference, amount: p.amount, currency: p.currency }));
    const [{ count: pending }, { count: unmatched }] = await Promise.all([
      supabase.from('reconciliation_matches').select('id', { count: 'exact', head: true }).eq('organization_id', org.id).eq('status', 'pending'),
      supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('organization_id', org.id),
    ]);
    snap.reconciliation = { pendingSuggestions: pending ?? 0, invoicesTotal: unmatched ?? 0 };
    snap.today = today;
    const out = await generateJson(
      `Answer the user's question about their finances: "${question}". Return JSON {"answer": string (concise, plain language, quote figures with currency exactly as given), "citations": [invoice references / customer names that support the answer], "missing_data": string|null (what data is missing for a complete answer)}. If the data cannot answer it, say so — never invent figures.`, snap, Out);
    await supabase.from('chat_messages').insert([{ organization_id: org.id, user_id: user.id, role: 'user', content: question }, { organization_id: org.id, user_id: user.id, role: 'assistant', content: out.answer + (out.missing_data ? `\n\nMissing data: ${out.missing_data}` : ''), citations: out.citations }]);
    return { message: 'ok', ...out };
  });
}
