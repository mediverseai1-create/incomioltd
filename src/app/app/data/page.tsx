import { getCtx } from '@/lib/ctx';
import { can } from '@/lib/rbac';
import { PageHeader, Card, Table, Badge, Notice } from '@/components/ui';
import { ImportWizard } from './ImportWizard';

export const metadata = { title: 'Data & Integrations' };
const INTEGRATIONS: [string, string][] = [['quickbooks', 'QuickBooks'], ['xero', 'Xero'], ['stripe', 'Stripe'], ['paystack', 'Paystack'], ['flutterwave', 'Flutterwave'], ['bank_feeds', 'Bank transaction feeds']];

export default async function Data() {
  const { supabase, org, role } = await getCtx();
  const { data: imports } = await supabase.from('data_imports').select('*, imported_files(filename)').eq('organization_id', org.id).order('created_at', { ascending: false }).limit(15);
  return (
    <>
      <PageHeader title="Data & Integrations" sub="Import financial data, review every issue, and keep the original file linked to its records." />
      {can(role, 'write_finance') ? <Card title="Import data"><ImportWizard orgId={org.id} currency={org.primary_currency} canExtract={can(role, 'run_ai')} /></Card> : <Notice>Your role is read-only for imports.</Notice>}
      <Card title="Import history" className="mt-4">
        {imports?.length ? <Table head={['When', 'Category', 'File', 'Imported', 'Rejected', 'Skipped', 'Flagged']}>{imports.map((i: any) => <tr key={i.id}><td className="td">{i.created_at.slice(0, 16).replace('T', ' ')}</td><td className="td">{i.category}</td><td className="td">{i.imported_files?.filename ?? '—'}</td><td className="td">{i.imported_rows}</td><td className="td">{i.rejected_rows}</td><td className="td">{i.skipped_rows}</td><td className="td">{i.flagged_rows}</td></tr>)}</Table> : <p className="text-sm text-ink-600">No imports yet.</p>}
      </Card>
      <Card title="Integrations" className="mt-4">
        <p className="mb-3 text-sm text-ink-600">File upload is the supported data source today. Live connectors are not available yet — none of these are connected and no sync activity exists.</p>
        <ul className="grid gap-2 sm:grid-cols-2">{INTEGRATIONS.map(([k, n]) => <li key={k} className="flex items-center justify-between rounded border border-cream-200 px-3 py-2 text-sm">{n}<Badge>Coming soon</Badge></li>)}</ul>
      </Card>
    </>
  );
}
