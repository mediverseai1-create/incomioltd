import { z } from 'zod';
import { apiAuth, handle, HttpError } from '@/lib/api';
import { audit } from '@/lib/audit';
import { CATEGORIES, validateRows, type Category, type Rec } from '@/lib/import';

export const maxDuration = 60;
const Body = z.object({
  category: z.enum(Object.keys(CATEGORIES) as [Category, ...Category[]]),
  rows: z.array(z.record(z.unknown())).min(1).max(20000),
  mapping: z.record(z.string()),
  file: z.object({ path: z.string(), name: z.string(), mime: z.string().optional(), size: z.number().optional() }).optional(),
  needsReview: z.boolean().optional(),
});
const chunk = <T,>(a: T[], n = 500) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

export async function POST(req: Request) {
  return handle(async () => {
    const { supabase, user, org } = await apiAuth('write_finance');
    const body = Body.safeParse(await req.json());
    if (!body.success) throw new HttpError(400, body.error.issues[0].message);
    const { category: cat, rows, mapping, file, needsReview } = body.data;
    if (file && !file.path.startsWith(org.id + '/')) throw new HttpError(403, 'Invalid file path.');

    // 1. Re-validate everything server-side (never trust the browser's preview).
    const results = validateRows(cat, rows, mapping, org.primary_currency);
    const issues: { row: number; kind: 'rejected' | 'skipped' | 'flagged'; message: string }[] = [];
    results.forEach((r) => { if (r.errors.length) issues.push({ row: r.index + 2, kind: 'rejected', message: r.errors.join('; ') }); });
    let good = results.filter((r) => r.record).map((r) => ({ i: r.index, rec: r.record as Rec, warn: r.warnings }));

    let fileId: string | null = null;
    if (file) {
      const { data } = await supabase.from('imported_files').insert({ organization_id: org.id, storage_path: file.path, filename: file.name, mime_type: file.mime, size_bytes: file.size, uploaded_by: user.id }).select('id').single();
      fileId = data?.id ?? null;
    }
    const { data: imp, error: impErr } = await supabase.from('data_imports').insert({ organization_id: org.id, category: cat, file_id: fileId, mapping, total_rows: rows.length, status: 'running', created_by: user.id }).select('id').single();
    if (impErr || !imp) throw new HttpError(500, impErr?.message ?? 'Could not start import.');

    // 2. Resolve customers / units (find-or-create by name).
    const { data: custs } = await supabase.from('customers').select('id,name').eq('organization_id', org.id).limit(20000);
    const cmap = new Map((custs ?? []).map((c) => [c.name.toLowerCase(), c.id]));
    const { data: units } = await supabase.from('business_units').select('id,name').eq('organization_id', org.id);
    const umap = new Map((units ?? []).map((u) => [u.name.toLowerCase(), u.id]));
    const ensureCustomers = async (names: string[]) => {
      const missing = [...new Set(names.filter((n) => n && !cmap.has(n.toLowerCase())))];
      for (const c of chunk(missing)) {
        const { data } = await supabase.from('customers').insert(c.map((name) => ({ organization_id: org.id, name }))).select('id,name');
        (data ?? []).forEach((x) => cmap.set(x.name.toLowerCase(), x.id));
      }
    };
    const ensureUnits = async (names: string[]) => {
      const missing = [...new Set(names.filter((n) => n && !umap.has(n.toLowerCase())))];
      if (!missing.length) return;
      const { data } = await supabase.from('business_units').insert(missing.map((name) => ({ organization_id: org.id, name, kind: 'business' }))).select('id,name');
      (data ?? []).forEach((x) => umap.set(x.name.toLowerCase(), x.id));
    };
    const cid = (n: unknown) => (n ? cmap.get(String(n).toLowerCase()) ?? null : null);

    let imported = 0, skipped = 0, flagged = 0;
    const skip = (i: number, msg: string, kind: 'skipped' | 'flagged' = 'skipped') => { issues.push({ row: i + 2, kind, message: msg }); kind === 'skipped' ? skipped++ : flagged++; };
    const insert = async (table: string, recs: object[]) => {
      for (const c of chunk(recs)) { const { error } = await supabase.from(table).insert(c); if (error) throw new HttpError(500, `Saving to ${table} failed: ${error.message}`); }
      imported += recs.length;
    };
    const base = { organization_id: org.id, import_id: imp.id };

    if (cat === 'customers') {
      const seen = new Set<string>(); const recs: object[] = [];
      for (const g of good) { const k = String(g.rec.name).toLowerCase(); if (cmap.has(k) || seen.has(k)) { skip(g.i, `Customer "${g.rec.name}" already exists`); continue; } seen.add(k); recs.push({ organization_id: org.id, name: g.rec.name, email: g.rec.email, phone: g.rec.phone }); }
      await insert('customers', recs);
    } else if (cat === 'business_units') {
      const kinds = ['business', 'subsidiary', 'branch', 'department', 'location'];
      const seen = new Set<string>(); const recs: object[] = [];
      for (const g of good) { const k = String(g.rec.name).toLowerCase(); if (umap.has(k) || seen.has(k)) { skip(g.i, `Unit "${g.rec.name}" already exists`); continue; } seen.add(k); recs.push({ organization_id: org.id, name: g.rec.name, kind: kinds.includes(String(g.rec.kind).toLowerCase()) ? String(g.rec.kind).toLowerCase() : 'business' }); }
      await insert('business_units', recs);
    } else if (cat === 'invoices') {
      await ensureCustomers(good.map((g) => g.rec.customer as string)); await ensureUnits(good.map((g) => g.rec.business_unit as string));
      const { data: ex } = await supabase.from('invoices').select('reference,currency').eq('organization_id', org.id).limit(50000);
      const seen = new Set((ex ?? []).map((e) => `${e.reference}|${e.currency}`)); const recs: object[] = [];
      for (const g of good) {
        const k = `${g.rec.reference}|${g.rec.currency}`;
        if (seen.has(k)) { skip(g.i, `Duplicate invoice ${g.rec.reference} (${g.rec.currency}) not imported`); continue; }
        seen.add(k);
        if (needsReview) issues.push({ row: g.i + 2, kind: 'flagged', message: 'Extracted from a document — confirm values on the invoice page' }), flagged++;
        recs.push({ ...base, customer_id: cid(g.rec.customer), business_unit_id: g.rec.business_unit ? umap.get(String(g.rec.business_unit).toLowerCase()) ?? null : null, reference: g.rec.reference, issue_date: g.rec.issue_date, due_date: g.rec.due_date, currency: g.rec.currency, amount: g.rec.amount, direct_cost: g.rec.direct_cost, discount: g.rec.discount ?? '0', service: g.rec.service, source_file_id: fileId, needs_review: !!needsReview });
      }
      await insert('invoices', recs);
    } else if (cat === 'payments' || cat === 'bank_transactions') {
      let recs: object[] = [];
      if (cat === 'payments') {
        await ensureCustomers(good.map((g) => g.rec.customer as string));
        const { data: ex } = await supabase.from('payments').select('reference,payment_date,amount,currency').eq('organization_id', org.id).limit(50000);
        const seen = new Set((ex ?? []).filter((e) => e.reference).map((e) => `${e.reference}|${e.payment_date}|${Number(e.amount).toFixed(2)}|${e.currency}`));
        for (const g of good) {
          const k = `${g.rec.reference}|${g.rec.payment_date}|${g.rec.amount}|${g.rec.currency}`;
          if (g.rec.reference && seen.has(k)) { skip(g.i, 'Duplicate payment (same reference, date and amount) not imported'); continue; }
          seen.add(k);
          if (needsReview) { issues.push({ row: g.i + 2, kind: 'flagged', message: 'Extracted from a document — verify amount' }); flagged++; }
          recs.push({ ...base, customer_id: cid(g.rec.customer), reference: g.rec.reference, payment_date: g.rec.payment_date, amount: g.rec.amount, currency: g.rec.currency, method: g.rec.method, source_file_id: fileId });
        }
        await insert('payments', recs);
      } else {
        const tx = good.map((g) => ({ ...base, txn_date: g.rec.txn_date, description: g.rec.description, reference: g.rec.reference, amount: g.rec.amount, currency: g.rec.currency, counterparty: g.rec.counterparty }));
        await insert('bank_transactions', tx);
        const credits = good.filter((g) => Number(g.rec.amount) > 0);
        if (credits.length) {
          const { error } = await supabase.from('payments').insert(credits.map((g) => ({ ...base, payment_date: g.rec.txn_date, amount: g.rec.amount, currency: g.rec.currency, reference: [g.rec.reference, g.rec.description, g.rec.counterparty].filter(Boolean).join(' · ') || null, method: 'bank', source_file_id: fileId })));
          if (error) throw new HttpError(500, error.message);
          issues.push({ row: 0, kind: 'flagged', message: `${credits.length} bank credit(s) were also added as incoming payments for reconciliation` });
        }
      }
    } else if (cat === 'expenses') {
      await insert('expenses', good.map((g) => ({ ...base, expense_date: g.rec.expense_date, amount: g.rec.amount, currency: g.rec.currency, category: g.rec.category, vendor: g.rec.vendor, recurring: g.rec.recurring })));
    } else if (cat === 'supplier_obligations') {
      await insert('supplier_obligations', good.map((g) => ({ ...base, supplier: g.rec.supplier, due_date: g.rec.due_date, amount: g.rec.amount, currency: g.rec.currency })));
    }
    // warnings (not blocking)
    const warnCount = good.reduce((n, g) => n + (g.warn.length ? 1 : 0), 0);
    if (warnCount) issues.push({ row: 0, kind: 'flagged', message: `${warnCount} row(s) imported with warnings (e.g. default currency applied, missing due date)` });

    const rejected = results.filter((r) => r.errors.length).length;
    await supabase.from('data_imports').update({ imported_rows: imported, rejected_rows: rejected, skipped_rows: skipped, flagged_rows: flagged, issues: issues.slice(0, 500), status: 'completed' }).eq('id', imp.id);
    await audit(supabase, org.id, user.id, 'import.completed', 'data_import', imp.id, { category: cat, imported, rejected, skipped });
    return { importId: imp.id, total: rows.length, imported, rejected, skipped, flagged, issues: issues.slice(0, 200), message: `Imported ${imported} of ${rows.length} rows` };
  });
}
