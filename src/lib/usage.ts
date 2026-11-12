import 'server-only';
import { supabaseAdmin } from './supabase/admin';
import { PLANS, CREDIT_COST, type UsageKind } from './plans';

const AI_PER_MINUTE = 20;

export class UsageError extends Error { constructor(msg: string, public status = 429) { super(msg); } }

export async function activePlan(orgId: string) {
  const { data: sub } = await supabaseAdmin().from('subscriptions').select('plan,status').eq('organization_id', orgId).maybeSingle();
  return sub && sub.status === 'active' && sub.plan !== 'none' ? PLANS[sub.plan as keyof typeof PLANS] : null;
}

export async function creditsUsedThisMonth(orgId: string) {
  const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
  const { data } = await supabaseAdmin().from('usage_records').select('units').eq('organization_id', orgId).gte('created_at', monthStart.toISOString());
  return (data ?? []).reduce((s, r) => s + r.units, 0);
}

/** Enforces the plan's monthly credits and a per-org rate limit, then records the spend. Throws UsageError when blocked. */
export async function consume(orgId: string, userId: string, kind: UsageKind, meta?: unknown) {
  const admin = supabaseAdmin();
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count: recent } = await admin.from('usage_records').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).gte('created_at', since);
  if ((recent ?? 0) >= AI_PER_MINUTE) throw new UsageError('Too many AI operations in the last minute. Please wait and retry.');

  const cost = CREDIT_COST[kind];
  const plan = await activePlan(orgId);
  if (plan) {
    const used = await creditsUsedThisMonth(orgId);
    if (used + cost > plan.monthlyCredits) throw new UsageError(`Monthly credits exhausted (${used.toLocaleString()} of ${plan.monthlyCredits.toLocaleString()} used). Upgrade your plan or wait for the next cycle.`, 402);
  }
  await admin.from('usage_records').insert({ organization_id: orgId, user_id: userId, kind, units: cost, meta: meta ?? null });
}
