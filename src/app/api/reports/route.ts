import { z } from 'zod';
import { apiAuth, handle, HttpError } from '@/lib/api';
import { consume } from '@/lib/usage';
import { audit } from '@/lib/audit';
import { generateText } from '@/lib/ai/gemini';
import { getView, aiSnapshot } from '@/lib/view';
import { buildReport, REPORT_KINDS } from '@/lib/reports';

export const maxDuration = 60;

export async function POST(req: Request) {
  return handle(async () => {
    const { kind } = z.object({ kind: z.string() }).parse(await req.json());
    if (!REPORT_KINDS[kind]) throw new HttpError(400, 'Unknown report type.');
    const { supabase, user, org } = await apiAuth('write_finance');
    await consume(org.id, user.id, 'report', { kind });
    const v = await getView();
    const content = await buildReport(kind, v);
    let narrative: string | null = null;
    if (kind === 'executive' && v.f.invoices.length) {
      try { narrative = await generateText('Write a concise executive summary (max 250 words) for management: financial performance, outstanding receivables, collections, payment discrepancies, major risks and recommended actions. Use only the supplied figures; note missing data. Plain text, short paragraphs.', aiSnapshot(v)); } catch { /* narrative optional */ }
    }
    const { data, error } = await supabase.from('reports').insert({ organization_id: org.id, kind, title: `${REPORT_KINDS[kind]} — ${new Date().toISOString().slice(0, 10)}`, content, narrative, created_by: user.id }).select('id').single();
    if (error) throw new HttpError(500, error.message);
    await audit(supabase, org.id, user.id, 'report.generated', 'report', data.id, { kind });
    return { id: data.id, message: narrative || kind !== 'executive' ? 'Report generated.' : 'Report generated without AI narrative (AI unavailable).' };
  });
}
