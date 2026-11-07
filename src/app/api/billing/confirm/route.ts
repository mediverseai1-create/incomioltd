import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';

const Body = z.object({
  organization_id: z.string().uuid(), plan: z.enum(['starter', 'professional', 'enterprise']), status: z.enum(['active', 'past_due', 'canceled']).default('active'),
  period_end: z.string().optional(), external_ref: z.string().optional(), amount: z.number().optional(), currency: z.string().length(3).optional(),
});

/**
 * Trusted payment confirmation. Call from your payment provider's webhook (or a manual admin script) with
 * header `x-webhook-secret: $BILLING_WEBHOOK_SECRET`. Fails closed when the secret is not configured.
 * NOTE: map your provider's own signature verification here before pointing a live webhook at this route.
 */
export async function POST(req: Request) {
  const secret = process.env.BILLING_WEBHOOK_SECRET;
  const given = req.headers.get('x-webhook-secret') ?? '';
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: b.error.issues[0].message }, { status: 400 });
  const d = b.data; const admin = supabaseAdmin();
  const { error } = await admin.from('subscriptions').upsert({ organization_id: d.organization_id, plan: d.plan, status: d.status, current_period_end: d.period_end ?? null, external_ref: d.external_ref ?? null, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await admin.from('billing_events').insert({ organization_id: d.organization_id, event: `subscription.${d.status}`, plan: d.plan, amount: d.amount, currency: d.currency?.toUpperCase(), external_ref: d.external_ref });
  await admin.from('audit_logs').insert({ organization_id: d.organization_id, action: `billing.${d.status}`, entity: 'subscription', detail: { plan: d.plan } });
  return NextResponse.json({ ok: true });
}
