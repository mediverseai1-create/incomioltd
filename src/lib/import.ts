import { parseMoney, toDb } from './money';

export type Category = 'customers' | 'invoices' | 'payments' | 'bank_transactions' | 'expenses' | 'supplier_obligations' | 'business_units';
type FType = 'text' | 'money' | 'date' | 'currency' | 'bool' | 'email';
export type Field = { key: string; label: string; type: FType; required?: boolean; alias?: string[] };

export const CATEGORIES: Record<Category, { label: string; help: string; fields: Field[] }> = {
  customers: { label: 'Customers', help: 'Customer records.', fields: [
    { key: 'name', label: 'Customer name', type: 'text', required: true, alias: ['customer', 'client', 'company'] },
    { key: 'email', label: 'Email', type: 'email' }, { key: 'phone', label: 'Phone', type: 'text' }] },
  invoices: { label: 'Invoices / AR report / contract revenue', help: 'One row per invoice. Accounts-receivable reports and contract revenue lines can be imported here (use the service column for contracts).', fields: [
    { key: 'reference', label: 'Invoice number', type: 'text', required: true, alias: ['invoice', 'invoiceno', 'number', 'ref', 'invoiceid'] },
    { key: 'customer', label: 'Customer name', type: 'text', alias: ['client', 'company', 'billto'] },
    { key: 'issue_date', label: 'Invoice date', type: 'date', alias: ['date', 'issued', 'invoicedate'] }, { key: 'due_date', label: 'Due date', type: 'date', alias: ['due', 'duedate'] },
    { key: 'amount', label: 'Amount', type: 'money', required: true, alias: ['total', 'invoiceamount', 'amountdue', 'value'] },
    { key: 'currency', label: 'Currency', type: 'currency' }, { key: 'direct_cost', label: 'Direct cost', type: 'money', alias: ['cost', 'cogs'] },
    { key: 'discount', label: 'Discount', type: 'money' }, { key: 'service', label: 'Service / contract', type: 'text', alias: ['contract', 'product', 'description'] },
    { key: 'business_unit', label: 'Business unit / branch', type: 'text', alias: ['branch', 'location', 'department'] }] },
  payments: { label: 'Payment receipts', help: 'Incoming payments received from customers.', fields: [
    { key: 'payment_date', label: 'Payment date', type: 'date', required: true, alias: ['date', 'paid', 'received'] },
    { key: 'amount', label: 'Amount', type: 'money', required: true, alias: ['paid', 'received', 'total'] },
    { key: 'currency', label: 'Currency', type: 'currency' }, { key: 'reference', label: 'Reference', type: 'text', alias: ['ref', 'memo', 'description', 'invoice'] },
    { key: 'customer', label: 'Customer name', type: 'text', alias: ['client', 'payer'] }, { key: 'method', label: 'Method', type: 'text' }] },
  bank_transactions: { label: 'Bank transactions', help: 'Bank export. Credits (positive amounts) are also added as incoming payments so they can be reconciled.', fields: [
    { key: 'txn_date', label: 'Date', type: 'date', required: true, alias: ['date', 'postingdate'] },
    { key: 'amount', label: 'Amount (credit +, debit −)', type: 'money', required: true, alias: ['credit', 'value'] },
    { key: 'description', label: 'Description', type: 'text', alias: ['narration', 'details', 'memo'] }, { key: 'reference', label: 'Reference', type: 'text', alias: ['ref'] },
    { key: 'currency', label: 'Currency', type: 'currency' }, { key: 'counterparty', label: 'Counterparty', type: 'text', alias: ['payer', 'name'] }] },
  expenses: { label: 'Expenses', help: 'Costs paid. Mark recurring ones to include them in forecasts.', fields: [
    { key: 'expense_date', label: 'Date', type: 'date', required: true, alias: ['date'] }, { key: 'amount', label: 'Amount', type: 'money', required: true },
    { key: 'currency', label: 'Currency', type: 'currency' }, { key: 'category', label: 'Category', type: 'text' }, { key: 'vendor', label: 'Vendor', type: 'text', alias: ['supplier', 'payee'] },
    { key: 'recurring', label: 'Recurring (yes/no)', type: 'bool' }] },
  supplier_obligations: { label: 'Supplier obligations', help: 'Bills you still have to pay.', fields: [
    { key: 'supplier', label: 'Supplier', type: 'text', required: true, alias: ['vendor', 'payee'] }, { key: 'due_date', label: 'Due date', type: 'date', required: true, alias: ['due'] },
    { key: 'amount', label: 'Amount', type: 'money', required: true }, { key: 'currency', label: 'Currency', type: 'currency' }] },
  business_units: { label: 'Business units / branches', help: 'Businesses, subsidiaries, branches or departments.', fields: [
    { key: 'name', label: 'Name', type: 'text', required: true }, { key: 'kind', label: 'Type (business, subsidiary, branch, department, location)', type: 'text' }] },
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Suggest a mapping of Incomio field key → source column header. */
export function autoMap(headers: string[], fields: Field[]): Record<string, string> {
  const m: Record<string, string> = {}; const taken = new Set<string>();
  for (const f of fields) {
    const names = [f.key, f.label, ...(f.alias ?? [])].map(norm);
    const h = headers.find((h) => !taken.has(h) && names.includes(norm(h))) ?? headers.find((h) => !taken.has(h) && names.some((n) => n.length > 3 && norm(h).includes(n)));
    if (h) { m[f.key] = h; taken.add(h); }
  }
  return m;
}

export function parseDate(raw: unknown): string | null {
  if (raw instanceof Date && !isNaN(raw.getTime())) return raw.toISOString().slice(0, 10);
  if (typeof raw === 'number' && raw > 20000 && raw < 80000) return new Date(Math.round((raw - 25569) * 86400000)).toISOString().slice(0, 10);
  const s = String(raw ?? '').trim(); if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) { const x = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/); if (x) { let a = +x[1], b = +x[2]; const y = +x[3] < 100 ? 2000 + +x[3] : +x[3]; if (a > 12) [a, b] = [b, a]; m = [s, String(y), String(a), String(b)] as unknown as RegExpMatchArray; } }
  if (!m) { const t = Date.parse(s); return isNaN(t) ? null : new Date(t).toISOString().slice(0, 10); }
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? d.toISOString().slice(0, 10) : null;
}

export type Rec = Record<string, string | boolean | null>;
export type RowResult = { index: number; record?: Rec; errors: string[]; warnings: string[] };

export function validateRows(cat: Category, rows: Record<string, unknown>[], mapping: Record<string, string>, defaultCurrency: string): RowResult[] {
  const fields = CATEGORIES[cat].fields;
  return rows.map((row, index) => {
    const rec: Rec = {}; const errors: string[] = []; const warnings: string[] = [];
    for (const f of fields) {
      const src = mapping[f.key]; const raw = src ? row[src] : undefined;
      const empty = raw === undefined || raw === null || String(raw).trim() === '';
      if (empty) {
        if (f.type === 'currency') { rec[f.key] = defaultCurrency; warnings.push(`No currency; using ${defaultCurrency}`); continue; }
        if (f.required) errors.push(`${f.label} is missing`);
        rec[f.key] = f.type === 'bool' ? false : null; continue;
      }
      switch (f.type) {
        case 'money': { const d = parseMoney(raw); if (!d) errors.push(`${f.label} "${raw}" is not a valid amount`); else rec[f.key] = toDb(d); break; }
        case 'date': { const d = parseDate(raw); if (!d) errors.push(`${f.label} "${raw}" is not a valid date`); else rec[f.key] = d; break; }
        case 'currency': { const c = String(raw).trim().toUpperCase(); if (!/^[A-Z]{3}$/.test(c)) errors.push(`Currency "${raw}" must be a 3-letter code`); else rec[f.key] = c; break; }
        case 'email': { const e = String(raw).trim(); if (!/^\S+@\S+\.\S+$/.test(e)) warnings.push(`Email "${e}" looks invalid; ignored`), (rec[f.key] = null); else rec[f.key] = e; break; }
        case 'bool': rec[f.key] = /^(y|yes|true|1|recurring)$/i.test(String(raw).trim()); break;
        default: rec[f.key] = String(raw).trim();
      }
    }
    if (cat === 'invoices') {
      if (!rec.customer) warnings.push('No customer; invoice will be unassigned');
      if (!rec.due_date) warnings.push('No due date; aging cannot be calculated for this invoice');
      if (rec.amount && Number(rec.amount) < 0) errors.push('Negative invoice amount (credit notes are not supported)');
    }
    if (cat === 'payments' && rec.amount && Number(rec.amount) <= 0) errors.push('Payment amount must be positive');
    return { index, record: errors.length ? undefined : rec, errors, warnings };
  });
}
