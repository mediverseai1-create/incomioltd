import { redirect } from 'next/navigation';
import { getCtx } from '@/lib/ctx';
import { Logo } from '@/components/ui';
import { Wizard } from './Wizard';

export const metadata = { title: 'Set up your organization' };

export default async function Onboarding() {
  const { org, supabase } = await getCtx({ allowNoOrg: true });
  if (org?.onboarding_complete) redirect('/app');
  let hasData = false;
  if (org) {
    const { count } = await supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('organization_id', org.id);
    hasData = (count ?? 0) > 0;
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-4 py-10">
      <Logo />
      <Wizard hasOrg={!!org} orgName={org?.name} hasData={hasData} />
    </main>
  );
}
