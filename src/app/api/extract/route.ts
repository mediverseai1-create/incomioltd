import { z } from 'zod';
import { apiAuth, handle, HttpError } from '@/lib/api';
import { consume } from '@/lib/usage';
import { extractFromFile } from '@/lib/ai/gemini';

export const maxDuration = 60;
const Rec = z.object({
  reference: z.string().nullable().optional(), customer: z.string().nullable().optional(), issue_date: z.string().nullable().optional(), due_date: z.string().nullable().optional(),
  payment_date: z.string().nullable().optional(), amount: z.union([z.string(), z.number()]).nullable().optional(), currency: z.string().nullable().optional(), service: z.string().nullable().optional(),
});
const Out = z.object({ records: z.array(Rec).max(200) });

/** Extracts proposed records from a PDF/image. Output is only a *proposal*; the user reviews it before import. */
export async function POST(req: Request) {
  return handle(async () => {
    const { user, org } = await apiAuth('write_finance');
    const fd = await req.formData();
    const file = fd.get('file'); const kind = fd.get('kind') === 'payments' ? 'payments' : 'invoices';
    if (!(file instanceof File)) throw new HttpError(400, 'No file uploaded.');
    if (file.size > 10 * 1024 * 1024) throw new HttpError(400, 'File is larger than 10 MB.');
    if (!/^(application\/pdf|image\/(png|jpe?g|webp))$/.test(file.type)) throw new HttpError(400, 'Only PDF or image files can be extracted.');
    await consume(org.id, user.id, 'document_extraction', { name: file.name });
    const b64 = Buffer.from(await file.arrayBuffer()).toString('base64');
    const dateKey = kind === 'invoices' ? 'issue_date and due_date' : 'payment_date';
    const out = await extractFromFile(
      `Extract every ${kind === 'invoices' ? 'invoice' : 'payment receipt'} in this document as JSON {"records":[...]}. Fields: ${kind === 'invoices' ? 'reference (invoice number), customer (billed party), ' : 'reference, customer (payer), '}${dateKey} as YYYY-MM-DD, amount (total as plain number, no symbols), currency (3-letter ISO code), service (short description or null). Use null for anything not clearly present. Never guess values.`,
      file.type, b64, Out);
    const rows = out.records.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v == null ? '' : String(v)])));
    return { rows, message: `Extracted ${rows.length} record(s). Review every value before importing.` };
  });
}
