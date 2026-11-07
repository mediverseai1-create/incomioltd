import 'server-only';
import { supabaseAdmin } from './supabase/admin';
import { PLANS, USAGE_LABELS, type UsageKind } from './plans';

const AI_PER_MINUTE = 20;

export class UsageError extends Error { constructor(msg: string, public status = 429) { super(msg); } }

/** Enforces plan limits and a per-org rate limit, then records the usage. Throws UsageError when blocked. */
export async function consume(orgId: string, userId: string, kind: UsageKind, meta?: unknown) {
  const admin = supabaseAdmin();
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count: recent } = await admin.from('usage_records').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).gte('created_at', since);
  if ((recent ?? 0) >= AI_PER_MINUTE) throw new UsageError('Too many AI operations in the last minute. Please wait and retry.');

  const { data: sub } = await admin.from('subscriptions').select('plan,status').eq('organization_id', orgId).maybeSingle();
  const plan = sub && sub.status === 'active' && sub.plan !== 'none' ? PLANS[sub.plan as keyof typeof PLANS] : null;
  const limit = plan?.limits[kind] ?? null;
  if (limit !== null) {
    const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
    const { data } = await admin.from('usage_records').select('units').eq('organization_id', orgId).eq('kind', kind).gte('created_at', monthStart.toISOString());
    const used = (data ?? []).reduce((s, r) => s + r.units, 0);
    if (used >= limit) throw new UsageError(`Monthly limit reached for ${USAGE_LABELS[kind]} (${limit}). Upgrade your plan to continue.`, 402);
  }
  await admin.from('usage_records').insert({ organization_id: orgId, user_id: userId, kind, meta: meta ?? null });
}
