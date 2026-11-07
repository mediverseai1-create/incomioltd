'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { ROLE_LABELS, type Role } from '@/lib/rbac';

const STEPS = ['Organization', 'Team', 'First data', 'Initial report'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'NGN', 'GHS', 'KES', 'ZAR', 'CAD', 'AUD', 'INR', 'AED'];

export function Wizard({ hasOrg, orgName, hasData }: { hasOrg: boolean; orgName?: string; hasData: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState(hasOrg ? 1 : 0);
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [note, setNote] = useState('');
  const sb = supabaseBrowser();

  async function createOrg(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(''); setBusy(true);
    const fd = new FormData(e.currentTarget);
    const { error } = await sb.rpc('create_organization', { p_name: String(fd.get('name')).trim(), p_type: String(fd.get('type')), p_currency: String(fd.get('currency')), p_structure: String(fd.get('structure')) });
    setBusy(false);
    if (error) return setErr(error.message);
    router.refresh(); setStep(1);
  }

  async function invite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(''); setNote(''); setBusy(true);
    const fd = new FormData(e.currentTarget);
    const { data: m } = await sb.from('organization_members').select('organization_id').limit(1).maybeSingle();
    const { error } = await sb.from('organization_members').insert({ organization_id: m?.organization_id, invited_email: String(fd.get('email')).toLowerCase(), role: String(fd.get('role')), status: 'invited' });
    setBusy(false);
    if (error) return setErr(error.message);
    setNote(`Invitation recorded for ${fd.get('email')}. They get access when they sign up with that email.`);
    (e.target as HTMLFormElement).reset();
  }

  async function finish() {
    setBusy(true);
    const { data: m } = await sb.from('organization_members').select('organization_id').limit(1).maybeSingle();
    if (m) await sb.from('organizations').update({ onboarding_complete: true }).eq('id', m.organization_id);
    router.replace('/app'); router.refresh();
  }

  return (
    <div>
      <ol className="mb-6 flex gap-2 text-xs">
        {STEPS.map((s, i) => <li key={s} className={`flex-1 rounded px-2 py-1 text-center ${i === step ? 'bg-wine text-cream-50' : i < step ? 'bg-forest/15 text-forest' : 'bg-cream text-ink-600'}`}>{i + 1}. {s}</li>)}
      </ol>
      <div className="card p-6">
        {step === 0 && (
          <form onSubmit={createOrg} className="space-y-3">
            <h1 className="text-2xl text-wine">Create your organization</h1>
            <div><label className="label" htmlFor="name">Business name</label><input id="name" name="name" required className="input" /></div>
            <div><label className="label" htmlFor="type">Business type</label>
              <select id="type" name="type" className="input">{['Professional services', 'Agency', 'Distribution / B2B', 'SME', 'Accounting / bookkeeping firm', 'Holding company', 'Other'].map((t) => <option key={t}>{t}</option>)}</select></div>
            <div><label className="label" htmlFor="currency">Primary currency</label><select id="currency" name="currency" className="input">{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></div>
            <div><label className="label" htmlFor="structure">Business structure</label>
              <select id="structure" name="structure" className="input"><option value="single">Single business</option><option value="multi">Multiple businesses / branches</option></select></div>
            {err && <p role="alert" className="text-sm text-red-700">{err}</p>}
            <button className="btn btn-primary" disabled={busy}>{busy ? 'Creating…' : 'Create organization'}</button>
          </form>
        )}
        {step === 1 && (
          <div className="space-y-3">
            <h1 className="text-2xl text-wine">Invite your team</h1>
            <p className="text-sm text-ink-600">Optional. {orgName} members see only this organization&apos;s data, based on role.</p>
            <form onSubmit={invite} className="flex flex-wrap items-end gap-2">
              <div className="min-w-[180px] flex-1"><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required className="input" /></div>
              <div><label className="label" htmlFor="role">Role</label><select id="role" name="role" className="input">{(Object.keys(ROLE_LABELS) as Role[]).filter((r) => r !== 'owner').map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select></div>
              <button className="btn btn-ghost" disabled={busy}>Invite</button>
            </form>
            {err && <p role="alert" className="text-sm text-red-700">{err}</p>}{note && <p role="status" className="text-sm text-forest">{note}</p>}
            <button className="btn btn-primary" onClick={() => { setErr(''); setStep(2); }}>Continue</button>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-3">
            <h1 className="text-2xl text-wine">Upload your first dataset</h1>
            <p className="text-sm text-ink-600">Start with customers or invoices (CSV, XLSX or PDF). You will map columns, validate, and preview before anything is saved.</p>
            {hasData && <p className="text-sm text-forest">Records detected in your account.</p>}
            <div className="flex gap-2"><Link href="/app/data?from=onboarding" className="btn btn-green">Open import workflow</Link><button className="btn btn-ghost" onClick={() => setStep(3)}>{hasData ? 'Continue' : 'Skip for now'}</button></div>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-3">
            <h1 className="text-2xl text-wine">Generate your first report</h1>
            <p className="text-sm text-ink-600">Once data is imported, create an executive summary from the Reports page. You can do it any time.</p>
            <div className="flex gap-2"><button className="btn btn-primary" onClick={finish} disabled={busy}>Enter dashboard</button></div>
          </div>
        )}
      </div>
    </div>
  );
}
