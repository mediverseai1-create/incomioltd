import { getCtx } from '@/lib/ctx';
import { can } from '@/lib/rbac';
import { updateSettings } from '../actions';
import { ActionForm, Field } from '@/components/forms';
import { PageHeader, Card, Notice } from '@/components/ui';

export const metadata = { title: 'Settings' };

export default async function Settings() {
  const { supabase, org, role, user } = await getCtx();
  const { data: s } = await supabase.from('organization_settings').select('due_soon_days').eq('organization_id', org.id).maybeSingle();
  const admin = can(role, 'admin');
  return (
    <>
      <PageHeader title="Settings" />
      <Card title="Organization">
        {admin ? <ActionForm action={updateSettings} resetOnSuccess={false}><div className="grid gap-3 md:grid-cols-2"><Field label="Organization name" name="name" defaultValue={org.name} required /><Field label="“Due soon” window (days)" name="due_soon_days" type="number" defaultValue={String(s?.due_soon_days ?? 7)} required /></div></ActionForm>
          : <Notice>Only owners and administrators can edit organization settings.</Notice>}
        <dl className="mt-4 grid gap-2 text-sm md:grid-cols-3"><div><dt className="label">Primary currency</dt><dd>{org.primary_currency}</dd></div><div><dt className="label">Structure</dt><dd>{org.structure === 'multi' ? 'Multiple businesses' : 'Single business'}</dd></div><div><dt className="label">Business type</dt><dd>{org.business_type ?? '—'}</dd></div></dl>
      </Card>
      <Card title="Your profile" className="mt-4"><p className="text-sm">{user.email} · role: {role}</p></Card>
      <p className="mt-6 max-w-2xl text-xs text-ink-400">Incomio is analytical software, not a bank, a regulated financial institution, or a replacement for professional accounting advice. It never moves money or contacts customers on its own.</p>
    </>
  );
}
