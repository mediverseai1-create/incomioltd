import { redirect } from 'next/navigation';
import { supabaseServer } from './supabase/server';
import type { Role } from './rbac';

export type Ctx = Awaited<ReturnType<typeof getCtx>>;
type OrgRow = { id: string; name: string; primary_currency: string; structure: string; business_type: string | null; onboarding_complete: boolean };

/** Resolves the signed-in user and their organization (server-side membership check). */
export async function getCtx(opts: { allowNoOrg?: boolean } = {}) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: mem } = await supabase.from('organization_members')
    .select('role, organization_id, organizations(id,name,primary_currency,structure,business_type,onboarding_complete)')
    .eq('user_id', user.id).eq('status', 'active').order('created_at').limit(1).maybeSingle();
  const org = (mem?.organizations as unknown as OrgRow | null) ?? null;
  if (!org && !opts.allowNoOrg) redirect('/onboarding');
  return { supabase, user, org: org as OrgRow, role: (mem?.role ?? null) as Role | null };
}

export async function loadFinance(supabase: Awaited<ReturnType<typeof supabaseServer>>, orgId: string) {
  const q = (t: string) => supabase.from(t).select('*').eq('organization_id', orgId).limit(10000);
  const [inv, pay, alloc, cust, bu, exp, sup, act, settings] = await Promise.all([
    q('invoices'), q('payments'), q('payment_allocations'), q('customers'), q('business_units'), q('expenses'), q('supplier_obligations'), q('collection_activities'),
    supabase.from('organization_settings').select('*').eq('organization_id', orgId).maybeSingle(),
  ]);
  return {
    invoices: (inv.data ?? []) as any[], payments: (pay.data ?? []) as any[], allocations: (alloc.data ?? []) as any[], customers: (cust.data ?? []) as any[],
    units: (bu.data ?? []) as any[], expenses: (exp.data ?? []) as any[], obligations: (sup.data ?? []) as any[], activities: (act.data ?? []) as any[],
    dueSoonDays: (settings.data?.due_soon_days as number | undefined) ?? 7,
  };
}
