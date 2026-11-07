import { z } from 'zod';
import { apiAuth, handle, HttpError } from '@/lib/api';
import { consume } from '@/lib/usage';
import { audit } from '@/lib/audit';
import { generateJson } from '@/lib/ai/gemini';
import { getView, aiSnapshot } from '@/lib/view';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const maxDuration = 60;
const Out = z.object({
  summary: z.string(),
  insights: z.array(z.object({
    title: z.string(), category: z.string(), severity: z.enum(['low', 'medium', 'high']), explanation: z.string(),
    supporting_records: z.array(z.string()).default([]), financial_impact: z.union([z.string(), z.number()]).nullable().optional(), currency: z.string().nullable().optional(),
    confidence: z.number().min(0).max(1).default(0.5), recommended_action: z.string().nullable().optional(),
  })).max(8),
  actions: z.array(z.object({
    title: z.string(), description: z.string(), priority: z.enum(['low', 'medium', 'high']), customer: z.string().nullable().optional(), invoice_reference: z.string().nullable().optional(),
    expected_outcome: z.string().nullable().optional(), evidence: z.array(z.string()).default([]),
  })).max(6),
});

const FOCUS: Record<string, string> = {
  financial: 'Assess the overall financial position: what is happening, why, which records support it, and what needs attention.',
  receivables: 'Focus on overdue receivables, aging trends, high-value balances, concentration risk and customers with repeated late payment.',
  reconciliation: 'Focus on payment discrepancies, unmatched items, duplicates, over/underpayments given the reconciliation summary.',
  cashflow: 'Focus on expected cash timing, upcoming payment pressure and what could cause shortfalls, using only the supplied figures.',
  collections: 'Focus on which customers to contact first and why, using the priority scores and payment behaviour.',
  profitability: 'Focus on revenue concentration, discounts and margins ONLY where cost data is present; state clearly where cost data is missing.',
  executive: 'Write a management-level view: performance, receivables, collections, risks and recommended decisions.',
};

export async function POST(req: Request) {
  return handle(async () => {
    const { agent } = z.object({ agent: z.string() }).parse(await req.json());
    const { supabase, user, org } = await apiAuth('run_ai');
    if (!FOCUS[agent]) throw new HttpError(400, 'Unknown agent.');
    const { data: cfg } = await supabase.from('ai_agents').select('enabled').eq('organization_id', org.id).eq('key', agent).maybeSingle();
    if (cfg && !cfg.enabled) throw new HttpError(400, 'This agent is disabled.');
    await consume(org.id, user.id, 'agent_run', { agent });
    const admin = supabaseAdmin();
    const { data: run } = await admin.from('ai_agent_runs').insert({ organization_id: org.id, agent_key: agent, started_by: user.id }).select('id').single();
    try {
      const v = await getView();
      if (v.f.invoices.length === 0) throw new HttpError(400, 'Import invoices first: there is nothing to analyse yet.');
      const snap: Record<string, unknown> = aiSnapshot(v);
      if (agent === 'reconciliation') {
        const { data: m } = await supabase.from('reconciliation_matches').select('kind,status,confidence').eq('organization_id', org.id);
        snap.reconciliation = { pending: m?.filter((x) => x.status === 'pending').length ?? 0, byKind: Object.fromEntries(['suggested', 'partial', 'overpayment', 'underpayment', 'duplicate'].map((k) => [k, m?.filter((x) => x.kind === k).length ?? 0])) };
      }
      if (agent === 'profitability') snap.costCoverage = { invoicesWithDirectCost: v.f.invoices.filter((i: any) => i.direct_cost != null).length, totalInvoices: v.f.invoices.length };
      const out = await generateJson(
        `${FOCUS[agent]}\nReturn JSON: {"summary": string, "insights": [{"title","category","severity":"low|medium|high","explanation","supporting_records":[invoice references or customer names],"financial_impact": number as string or null,"currency": 3-letter or null,"confidence": 0-1,"recommended_action"}], "actions": [{"title","description","priority","customer": exact customer name or null,"invoice_reference": or null,"expected_outcome","evidence":[strings]}]}.\nOnly include findings supported by the data. Return fewer items rather than inventing. If data is insufficient return empty arrays and say so in summary.`,
        snap, Out);
      const custId = new Map(v.f.customers.map((c: any) => [String(c.name).toLowerCase(), c.id]));
      const invId = new Map(v.f.invoices.map((i: any) => [String(i.reference).toLowerCase(), i.id]));
      if (out.insights.length) await admin.from('financial_insights').insert(out.insights.map((i) => ({ organization_id: org.id, title: i.title, category: i.category, severity: i.severity, explanation: i.explanation, supporting_records: i.supporting_records, financial_impact: i.financial_impact != null && !isNaN(Number(i.financial_impact)) ? Number(i.financial_impact).toFixed(2) : null, currency: i.currency?.length === 3 ? i.currency.toUpperCase() : null, confidence: i.confidence, recommended_action: i.recommended_action, agent_key: agent })));
      if (out.actions.length) await admin.from('recommended_actions').insert(out.actions.map((a) => ({ organization_id: org.id, title: a.title, description: a.description, priority: a.priority, customer_id: a.customer ? custId.get(a.customer.toLowerCase()) ?? null : null, invoice_id: a.invoice_reference ? invId.get(a.invoice_reference.toLowerCase()) ?? null : null, expected_outcome: a.expected_outcome, evidence: a.evidence, agent_key: agent })));
      await admin.from('ai_agent_runs').update({ status: 'completed', summary: out.summary, findings: { insights: out.insights.length, actions: out.actions.length }, finished_at: new Date().toISOString() }).eq('id', run!.id);
      await audit(supabase, org.id, user.id, 'agent.run', 'ai_agent', agent, { insights: out.insights.length, actions: out.actions.length });
      return { message: `${out.insights.length} insight(s) and ${out.actions.length} suggested action(s) added for review. ${out.summary}` };
    } catch (e) {
      await admin.from('ai_agent_runs').update({ status: 'failed', error: (e as Error).message, finished_at: new Date().toISOString() }).eq('id', run!.id);
      throw e;
    }
  });
}
