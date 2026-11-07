'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { supabaseBrowser } from '@/lib/supabase/client';
import { CATEGORIES, autoMap, validateRows, type Category } from '@/lib/import';

type Row = Record<string, unknown>;
type Summary = { total: number; imported: number; rejected: number; skipped: number; flagged: number; issues: { row: number; kind: string; message: string }[]; message: string };

export function ImportWizard({ orgId, currency, canExtract }: { orgId: string; currency: string; canExtract: boolean }) {
  const router = useRouter();
  const [cat, setCat] = useState<Category>('invoices');
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]); const [rows, setRows] = useState<Row[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [needsReview, setNeedsReview] = useState(false);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [summary, setSummary] = useState<Summary | null>(null);
  const spec = CATEGORIES[cat];

  async function onFile(f: File | null) {
    setErr(''); setSummary(null); setFile(f); setRows([]); setHeaders([]); setNeedsReview(false);
    if (!f) return;
    setBusy(true);
    try {
      const ext = f.name.split('.').pop()?.toLowerCase();
      let data: Row[] = [];
      if (ext === 'csv' || ext === 'txt') {
        const res = Papa.parse<Row>(await f.text(), { header: true, skipEmptyLines: true });
        data = res.data;
      } else if (ext === 'xlsx' || ext === 'xls') {
        const wb = XLSX.read(await f.arrayBuffer(), { cellDates: true });
        data = XLSX.utils.sheet_to_json<Row>(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: true });
      } else if (['pdf', 'png', 'jpg', 'jpeg', 'webp'].includes(ext ?? '')) {
        if (cat !== 'invoices' && cat !== 'payments') throw new Error('PDF extraction supports invoices and payment receipts only.');
        if (!canExtract) throw new Error('Your role cannot run document extraction.');
        const fd = new FormData(); fd.append('file', f); fd.append('kind', cat);
        const r = await fetch('/api/extract', { method: 'POST', body: fd }); const j = await r.json();
        if (!r.ok) throw new Error(j.error); data = j.rows; setNeedsReview(true);
        if (!data.length) throw new Error('No records could be extracted from this document.');
      } else throw new Error('Unsupported file type. Use CSV, XLSX, or PDF.');
      if (!data.length) throw new Error('The file has no data rows.');
      const hs = Object.keys(data[0]);
      setRows(data); setHeaders(hs); setMapping(autoMap(hs, spec.fields));
    } catch (e) { setErr((e as Error).message); setFile(null); } finally { setBusy(false); }
  }

  const results = useMemo(() => (rows.length ? validateRows(cat, rows, mapping, currency) : []), [rows, mapping, cat, currency]);
  const bad = results.filter((r) => r.errors.length), warn = results.filter((r) => !r.errors.length && r.warnings.length);
  const missingRequired = spec.fields.filter((f) => f.required && !mapping[f.key]);

  async function commit() {
    if (!file) return; setBusy(true); setErr('');
    try {
      const sb = supabaseBrowser();
      const path = `${orgId}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, '_')}`;
      const up = await sb.storage.from('financial-files').upload(path, file, { contentType: file.type || undefined });
      if (up.error) throw new Error(`Storing the original file failed: ${up.error.message}`);
      const r = await fetch('/api/import', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ category: cat, rows, mapping, needsReview, file: { path, name: file.name, mime: file.type, size: file.size } }) });
      const j = await r.json(); if (!r.ok) throw new Error(j.error);
      setSummary(j); setRows([]); setFile(null); router.refresh();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div><label className="label" htmlFor="cat">1. Data category</label>
          <select id="cat" className="input" value={cat} onChange={(e) => { setCat(e.target.value as Category); setRows([]); setFile(null); setSummary(null); }}>{(Object.keys(CATEGORIES) as Category[]).map((k) => <option key={k} value={k}>{CATEGORIES[k].label}</option>)}</select>
          <p className="mt-1 text-xs text-ink-600">{spec.help}</p></div>
        <div><label className="label" htmlFor="file">2. File (CSV, XLSX{cat === 'invoices' || cat === 'payments' ? ', PDF or image' : ''})</label>
          <input key={cat} id="file" type="file" accept=".csv,.xlsx,.xls,.txt,.pdf,.png,.jpg,.jpeg,.webp" className="input" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
          <p className="mt-1 text-xs text-ink-600">Dates like 03/04/2025 are read as MM/DD/YYYY unless the first number is above 12. Missing currency defaults to {currency}.</p></div>
      </div>
      {busy && <p className="text-sm text-ink-600" role="status">Working…</p>}
      {err && <p role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p>}

      {rows.length > 0 && (
        <>
          {needsReview && <p className="rounded border border-amber bg-amber/10 px-3 py-2 text-sm">Values below were extracted by AI from your document. Check each against the original before importing; imported records will be flagged for review.</p>}
          <div>
            <h3 className="mb-2 text-lg text-wine">3. Map columns</h3>
            <div className="grid gap-3 md:grid-cols-3">
              {spec.fields.map((f) => (
                <div key={f.key}><label className="label" htmlFor={`m-${f.key}`}>{f.label}{f.required && ' *'}</label>
                  <select id={`m-${f.key}`} className="input" value={mapping[f.key] ?? ''} onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value })}><option value="">— not in file —</option>{headers.map((h) => <option key={h}>{h}</option>)}</select></div>
              ))}
            </div>
            {missingRequired.length > 0 && <p className="mt-2 text-sm text-red-700">Map required fields: {missingRequired.map((f) => f.label).join(', ')}</p>}
          </div>
          <div>
            <h3 className="mb-2 text-lg text-wine">4. Validation &amp; preview</h3>
            <p className="text-sm"><b>{results.length - bad.length}</b> valid · <b className="text-red-700">{bad.length}</b> will be rejected · <b className="text-[#7a5112]">{warn.length}</b> with warnings. Duplicates already in your account are detected on import and reported as skipped.</p>
            <div className="mt-2 max-h-64 overflow-auto rounded border border-cream-200">
              <table className="w-full text-xs"><thead className="sticky top-0 bg-cream-50"><tr><th className="th">Row</th>{spec.fields.filter((f) => mapping[f.key]).map((f) => <th key={f.key} className="th">{f.label}</th>)}<th className="th">Issues</th></tr></thead>
                <tbody>{results.slice(0, 50).map((r) => (
                  <tr key={r.index} className={r.errors.length ? 'bg-red-50' : r.warnings.length ? 'bg-amber/10' : ''}><td className="td">{r.index + 2}</td>
                    {spec.fields.filter((f) => mapping[f.key]).map((f) => <td key={f.key} className="td">{String(rows[r.index][mapping[f.key]] ?? '')}</td>)}
                    <td className="td">{[...r.errors, ...r.warnings].join('; ')}</td></tr>))}</tbody></table>
            </div>
            {results.length > 50 && <p className="mt-1 text-xs text-ink-400">Showing first 50 of {results.length} rows. All rows are validated again on the server.</p>}
          </div>
          <button className="btn btn-primary" disabled={busy || missingRequired.length > 0 || results.length === bad.length} onClick={commit}>5. Confirm import ({results.length - bad.length} records)</button>
        </>
      )}

      {summary && (
        <div className="rounded border border-forest/30 bg-forest/5 p-4" role="status">
          <h3 className="text-lg text-forest">Import complete</h3>
          <p className="text-sm">Imported <b>{summary.imported}</b> · rejected <b>{summary.rejected}</b> · skipped <b>{summary.skipped}</b> · flagged <b>{summary.flagged}</b> (of {summary.total} rows).</p>
          {summary.issues.length > 0 && <ul className="mt-2 max-h-48 list-disc overflow-auto pl-5 text-xs text-ink-600">{summary.issues.map((i, k) => <li key={k}>{i.row ? `Row ${i.row}: ` : ''}{i.kind} — {i.message}</li>)}</ul>}
          <p className="mt-2 text-sm">Next: <a className="underline" href="/app/reconciliation">find reconciliation matches</a> · <a className="underline" href="/app">view dashboard</a></p>
        </div>
      )}
    </div>
  );
}
