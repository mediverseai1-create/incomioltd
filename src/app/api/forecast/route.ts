import { z } from 'zod';
import { apiAuth, handle } from '@/lib/api';
import { consume } from '@/lib/usage';
import { audit } from '@/lib/audit';
import { generateText } from '@/lib/ai/gemini';
import { getView } from '@/lib/view';
import { buildForecast, defaultAssumptions, forecastConfidence } from '@/lib/calc/forecast';

export const maxDuration = 60;

export async function POST(req: Request) {
  return handle(async () => {
    const b = z.object({ currency: z.string().length(3), horizonDays: z.number().int().min(7).max(365), openingBalance: z.string().nullable().optional(), conservativeDelay: z.number().min(0).max(180).optional() }).parse(await req.json());
    const { supabase, user, org } = await apiAuth('run_ai');
    await consume(org.id, user.id, 'forecast');
    const v = await getView();
    const a = defaultAssumptions(b.currency.toUpperCase(), b.horizonDays);
    a.openingBalance = b.openingBalance ?? null; if (b.conservativeDelay) a.scenarios[2].extraDelayDays = b.conservativeDelay;
    const r = buildForecast(a, v.views, v.delays, v.f.obligations, v.f.expenses);
    const conf = forecastConfidence(r);
    let narrative: string | null = null;
    try {
      narrative = await generateText('Explain this cash-flow forecast to a finance manager in under 200 words: data used, assumptions, expected timing, uncertainty, and any potential shortfalls. State that figures are estimates. Do not recalculate numbers.', { assumptions: a, confidence: conf, result: { ...r, scenarios: r.scenarios.map((s) => ({ ...s, weeks: s.weeks.slice(0, 13) })) } });
    } catch { /* forecast is still saved; AI explanation is optional */ }
    const { data: f } = await supabase.from('cash_flow_forecasts').insert({ organization_id: org.id, currency: a.currency, horizon_days: a.horizonDays, assumptions: a, result: { ...r, confidence: conf }, narrative, created_by: user.id }).select('id').single();
    if (f) await supabase.from('forecast_scenarios').insert(r.scenarios.map((s, i) => ({ organization_id: org.id, forecast_id: f.id, name: s.name, assumptions: a.scenarios[i], result: s })));
    await audit(supabase, org.id, user.id, 'forecast.saved', 'cash_flow_forecast', f?.id);
    return { message: narrative ? 'Forecast saved with AI explanation.' : 'Forecast saved. AI explanation unavailable (check GEMINI_API_KEY).' };
  });
}
