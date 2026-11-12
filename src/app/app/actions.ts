'use server';
import Decimal from 'decimal.js';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getCtx, loadFinance } from '@/lib/ctx';
import { audit } from '@/lib/audit';
import { can, type Role } from '@/lib/rbac';
import { parseMoney, toDb, D } from '@/lib/money';
import { suggestMatches } from '@/lib/calc/reconcile';
import { PLANS } from '@/lib/plans';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { FormState } from '@/components/forms';

const fail = (error: string): FormState => ({ error });
const ok = (message?: string): FormState => ({ ok: true, message });
const CUR = z.string().length(3).transform((s) => s.toUpperCase());
const optDate = z.string().optional().transform((s) => (s ? s : null)).refine((s) => s === null || !isNaN(Date.parse(s)), 'Invalid date');
const optStr = z.string().optional().transform((s) => (s?.trim() ? s.trim() : null));
const str = (fd: FormData) => Object.fromEntries([...fd.entries()].map(([k, v]) => [k, typeof v === 'string' ? v : '']));

async function planOf(orgId: string) {
  const { data } = await supabaseAdmin().from('subscriptions').select('plan,status').eq('organization_id', orgId).maybeSingle();
  return data?.status === 'active' && data.plan !== 'none' ? PLANS[data.plan as keyof typeof PLANS] : null;
}

async function guard(perm: Parameters<typeof can>[1]) {
  const c = await getCtx();
  if (!can(c.role, perm)) throw new Error('Your role does not allow this action.');
  return c;
}
const wrap = (fn: (c: Awaited<ReturnType<typeof guard>>, fd: FormData) => Promise<FormState>, perm: Parameters<typeof can>[1] = 'write_finance') =>
  async (_p: FormState, fd: FormData): Promise<FormState> => {
    try { return await fn(await guard(perm), fd); } catch (e) { return fail(e instanceof z.ZodError ? e.issues[0].message : (e as Error).message); }
  };

export const createCustomer = wrap(async ({ supabase, org, user }, fd) => {
  const v = z.object({ name: z.string().min(1, 'Name is required'), email: optStr, phone: optStr, business_unit_id: optStr }).parse(str(fd));
  const { data, error } = await supabase.from('customers').insert({ ...v, organization_id: org.id }).select('id').single();
  if (error) return fail(error.code === '23505' ? 'A customer with that name already exists.' : error.message);
  await audit(supabase, org.id, user.id, 'customer.created', 'customer', data.id);
  revalidatePath('/app/customers'); return ok('Customer added');
});

export const createInvoice = wrap(async ({ supabase, org, user }, fd) => {
  const v = z.object({ reference: z.string().min(1, 'Reference is required'), customer_id: optStr, business_unit_id: optStr, issue_date: optDate, due_date: optDate, currency: CUR, amount: z.string(), direct_cost: optStr, discount: optStr, service: optStr }).parse(str(fd));
  const amt = parseMoney(v.amount); if (!amt || amt.lt(0)) return fail('Enter a valid amount.');
  const cost = v.direct_cost ? parseMoney(v.direct_cost) : null; if (v.direct_cost && !cost) return fail('Invalid direct cost.');
  const disc = v.discount ? parseMoney(v.discount) : null; if (v.discount && !disc) return fail('Invalid discount.');
  const { data, error } = await supabase.from('invoices').insert({ ...v, organization_id: org.id, amount: toDb(amt), direct_cost: cost ? toDb(cost) : null, discount: disc ? toDb(disc) : 0 }).select('id').single();
  if (error) return fail(error.code === '23505' ? 'That invoice reference already exists in this currency.' : error.message);
  await audit(supabase, org.id, user.id, 'invoice.created', 'invoice', data.id, { reference: v.reference, amount: toDb(amt), currency: v.currency });
  revalidatePath('/app', 'layout'); return ok('Invoice added');
});

export const createPayment = wrap(async ({ supabase, org, user }, fd) => {
  const v = z.object({ reference: optStr, customer_id: optStr, payment_date: z.string().refine((s) => !isNaN(Date.parse(s)), 'Payment date is required'), currency: CUR, amount: z.string(), method: optStr }).parse(str(fd));
  const amt = parseMoney(v.amount); if (!amt || amt.lte(0)) return fail('Enter a valid positive amount.');
  const { data, error } = await supabase.from('payments').insert({ ...v, organization_id: org.id, amount: toDb(amt) }).select('id').single();
  if (error) return fail(error.message);
  await audit(supabase, org.id, user.id, 'payment.created', 'payment', data.id, { amount: toDb(amt), currency: v.currency });
  revalidatePath('/app', 'layout'); return ok('Payment recorded. Run reconciliation to match it to invoices.');
});

export const createExpense = wrap(async ({ supabase, org, user }, fd) => {
  const v = z.object({ expense_date: z.string().refine((s) => !isNaN(Date.parse(s)), 'Date is required'), category: optStr, vendor: optStr, currency: CUR, amount: z.string() }).parse(str(fd));
  const amt = parseMoney(v.amount); if (!amt || amt.lte(0)) return fail('Enter a valid amount.');
  const { error } = await supabase.from('expenses').insert({ ...v, organization_id: org.id, amount: toDb(amt), recurring: fd.get('recurring') === 'on' });
  if (error) return fail(error.message);
  await audit(supabase, org.id, user.id, 'expense.created', 'expense');
  revalidatePath('/app', 'layout'); return ok('Expense added');
});

export const createObligation = wrap(async ({ supabase, org, user }, fd) => {
  const v = z.object({ supplier: z.string().min(1, 'Supplier is required'), due_date: z.string().refine((s) => !isNaN(Date.parse(s)), 'Due date is required'), currency: CUR, amount: z.string() }).parse(str(fd));
  const amt = parseMoney(v.amount); if (!amt || amt.lte(0)) return fail('Enter a valid amount.');
  const { error } = await supabase.from('supplier_obligations').insert({ ...v, organization_id: org.id, amount: toDb(amt) });
  if (error) return fail(error.message);
  await audit(supabase, org.id, user.id, 'obligation.created', 'supplier_obligation');
  revalidatePath('/app', 'layout'); return ok('Obligation added');
});

export const createUnit = wrap(async ({ supabase, org, user }, fd) => {
  const v = z.object({ name: z.string().min(1, 'Name is required'), kind: z.enum(['business', 'subsidiary', 'branch', 'department', 'location']) }).parse(str(fd));
  const plan = await planOf(org.id);
  if (plan?.businessUnits != null) {
    const { count } = await supabase.from('business_units').select('id', { count: 'exact', head: true }).eq('organization_id', org.id);
    if ((count ?? 0) >= plan.businessUnits) return fail(`Your ${plan.name} plan includes ${plan.businessUnits} business unit(s). Upgrade to add more.`);
  }
  const { data, error } = await supabase.from('business_units').insert({ ...v, organization_id: org.id }).select('id').single();
  if (error) return fail(error.message);
  await audit(supabase, org.id, user.id, 'business_unit.created', 'business_unit', data.id);
  revalidatePath('/app/business-units'); return ok('Business unit added');
}, 'admin');

export const logActivity = wrap(async ({ supabase, org, user }, fd) => {
  const v = z.object({ customer_id: z.string().uuid('Choose a customer'), invoice_id: optStr, channel: z.string(), summary: z.string().min(1, 'Add a summary'), outcome: optStr, follow_up_date: optDate }).parse(str(fd));
  const { data, error } = await supabase.from('collection_activities').insert({ ...v, organization_id: org.id, created_by: user.id }).select('id').single();
  if (error) return fail(error.message);
  await audit(supabase, org.id, user.id, 'collection.logged', 'collection_activity', data.id);
  revalidatePath('/app/collections'); return ok('Activity logged');
});

export async function voidInvoice(id: string): Promise<FormState> {
  try {
    const { supabase, org, user } = await guard('approve');
    const { error } = await supabase.from('invoices').update({ status: 'void' }).eq('id', id).eq('organization_id', org.id);
    if (error) return fail(error.message);
    await audit(supabase, org.id, user.id, 'invoice.voided', 'invoice', id);
    revalidatePath('/app', 'layout'); return ok('Invoice voided');
  } catch (e) { return fail((e as Error).message); }
}

/** Generates deterministic reconciliation suggestions. Nothing is allocated here. */
export async function runReconciliation(): Promise<FormState> {
  try {
    const { supabase, org, user } = await guard('write_finance');
    const f = await loadFinance(supabase, org.id);
    const { data: existing } = await supabase.from('reconciliation_matches').select('payment_id,invoice_id,kind').eq('organization_id', org.id);
    const keys = new Set<string>();
    for (const m of existing ?? []) keys.add(m.kind === 'duplicate' ? `dup:${m.payment_id}` : `${m.payment_id}:${m.invoice_id}`);
    const sugg = suggestMatches(f.invoices, f.payments, f.allocations, keys)
      .filter((s) => s.kind !== 'duplicate' || !keys.has(`dup:${s.payment_id}`));
    if (sugg.length) {
      const { error } = await supabase.from('reconciliation_matches').insert(sugg.map((s) => ({ ...s, organization_id: org.id })));
      if (error) return fail(error.message);
    }
    await audit(supabase, org.id, user.id, 'reconciliation.run', 'reconciliation', undefined, { suggestions: sugg.length });
    revalidatePath('/app/reconciliation'); return ok(`${sugg.length} new suggestion(s) for review`);
  } catch (e) { return fail((e as Error).message); }
}

/** Human decision on a proposed match. Only an approval by an authorised user creates an allocation. */
export async function decideMatch(matchId: string, decision: 'approved' | 'rejected' | 'investigate', note?: string): Promise<FormState> {
  try {
    const { supabase, org, user } = await guard('approve');
    const { data: m } = await supabase.from('reconciliation_matches').select('*').eq('id', matchId).eq('organization_id', org.id).single();
    if (!m) return fail('Match not found.');
    if (m.status !== 'pending' && m.status !== 'investigate') return fail('This suggestion has already been decided.');
    if (decision === 'approved' && m.kind !== 'duplicate') {
      if (!m.payment_id || !m.invoice_id) return fail('Match is incomplete.');
      const [{ data: pay }, { data: inv }, { data: pa }, { data: ia }] = await Promise.all([
        supabase.from('payments').select('amount').eq('id', m.payment_id).single(), supabase.from('invoices').select('amount,status').eq('id', m.invoice_id).single(),
        supabase.from('payment_allocations').select('amount').eq('payment_id', m.payment_id), supabase.from('payment_allocations').select('amount').eq('invoice_id', m.invoice_id),
      ]);
      if (!pay || !inv) return fail('Payment or invoice no longer exists.');
      if (inv.status === 'void') return fail('Invoice is void.');
      const amt = D(m.proposed_amount);
      const payLeft = D(pay.amount).minus((pa ?? []).reduce((s, r) => s.plus(r.amount), new Decimal(0)));
      const invLeft = D(inv.amount).minus((ia ?? []).reduce((s, r) => s.plus(r.amount), new Decimal(0)));
      if (amt.gt(payLeft)) return fail(`Would allocate more than the payment has left (${payLeft.toFixed(2)}). A payment cannot be counted twice.`);
      if (amt.gt(invLeft)) return fail(`Would allocate more than the invoice balance (${invLeft.toFixed(2)}).`);
      const { error } = await supabase.from('payment_allocations').insert({ organization_id: org.id, payment_id: m.payment_id, invoice_id: m.invoice_id, amount: toDb(amt), created_by: user.id });
      if (error) return fail(error.message);
    }
    await supabase.from('reconciliation_matches').update({ status: decision }).eq('id', matchId);
    await supabase.from('reconciliation_reviews').insert({ organization_id: org.id, match_id: matchId, reviewer_id: user.id, decision, note: note ?? null });
    await audit(supabase, org.id, user.id, `reconciliation.${decision}`, 'reconciliation_match', matchId, { kind: m.kind, amount: m.proposed_amount });
    revalidatePath('/app', 'layout'); return ok(decision === 'approved' ? 'Match approved and allocation recorded' : `Marked ${decision}`);
  } catch (e) { return fail((e as Error).message); }
}

export async function decideAction(id: string, decision: 'approved' | 'rejected', note?: string): Promise<FormState> {
  try {
    const { supabase, org, user } = await guard('approve');
    const { error } = await supabase.from('recommended_actions').update({ approval_status: decision }).eq('id', id).eq('organization_id', org.id);
    if (error) return fail(error.message);
    await supabase.from('action_approvals').insert({ organization_id: org.id, action_id: id, approver_id: user.id, decision, note: note ?? null });
    await audit(supabase, org.id, user.id, `action.${decision}`, 'recommended_action', id);
    revalidatePath('/app/agents'); return ok(decision);
  } catch (e) { return fail((e as Error).message); }
}

export async function setActionStatus(id: string, status: 'open' | 'in_progress' | 'done', assignToMe = false): Promise<FormState> {
  try {
    const { supabase, org, user } = await guard('write_finance');
    const { data: a } = await supabase.from('recommended_actions').select('approval_status').eq('id', id).eq('organization_id', org.id).single();
    if (a?.approval_status !== 'approved' && status !== 'open') return fail('Only approved actions can be worked on.');
    await supabase.from('recommended_actions').update({ completion_status: status, ...(assignToMe ? { assignee_id: user.id } : {}) }).eq('id', id).eq('organization_id', org.id);
    await audit(supabase, org.id, user.id, `action.status.${status}`, 'recommended_action', id);
    revalidatePath('/app/agents'); return ok();
  } catch (e) { return fail((e as Error).message); }
}

export async function decideDraft(id: string, decision: 'approved' | 'rejected' | 'sent_manually'): Promise<FormState> {
  try {
    const { supabase, org, user } = await guard(decision === 'sent_manually' ? 'write_finance' : 'approve');
    await supabase.from('collection_drafts').update({ status: decision, ...(decision === 'approved' ? { approved_by: user.id } : {}) }).eq('id', id).eq('organization_id', org.id);
    await audit(supabase, org.id, user.id, `draft.${decision}`, 'collection_draft', id);
    revalidatePath('/app/collections'); return ok();
  } catch (e) { return fail((e as Error).message); }
}

export async function reviewInsight(id: string, status: 'reviewed' | 'dismissed'): Promise<FormState> {
  try {
    const { supabase, org, user } = await guard('write_finance');
    await supabase.from('financial_insights').update({ review_status: status }).eq('id', id).eq('organization_id', org.id);
    await audit(supabase, org.id, user.id, `insight.${status}`, 'financial_insight', id);
    revalidatePath('/app/insights'); return ok();
  } catch (e) { return fail((e as Error).message); }
}

export const inviteMember = wrap(async ({ supabase, org, user }, fd) => {
  const v = z.object({ email: z.string().email('Enter a valid email'), role: z.enum(['administrator', 'cfo', 'finance_manager', 'accountant', 'ar_officer', 'department_manager', 'executive_viewer']) }).parse(str(fd));
  const plan = await planOf(org.id);
  if (plan?.seats != null) {
    const { count } = await supabase.from('organization_members').select('id', { count: 'exact', head: true }).eq('organization_id', org.id);
    if ((count ?? 0) >= plan.seats) return fail(`Your ${plan.name} plan includes up to ${plan.seats} team members. Upgrade to add more.`);
  }
  const { error } = await supabase.from('organization_members').insert({ organization_id: org.id, invited_email: v.email.toLowerCase(), role: v.role, status: 'invited' });
  if (error) return fail(error.message);
  await audit(supabase, org.id, user.id, 'member.invited', 'member', undefined, v);
  revalidatePath('/app/team'); return ok('Invitation recorded. Access starts when they sign up with this email.');
}, 'admin');

export async function changeRole(memberId: string, role: Role): Promise<FormState> {
  try {
    const { supabase, org, user } = await guard('admin');
    const { data: m } = await supabase.from('organization_members').select('role').eq('id', memberId).eq('organization_id', org.id).single();
    if (m?.role === 'owner') return fail('The owner role cannot be changed.');
    if (role === 'owner') return fail('Ownership transfer is not supported.');
    await supabase.from('organization_members').update({ role }).eq('id', memberId).eq('organization_id', org.id);
    await audit(supabase, org.id, user.id, 'member.role_changed', 'member', memberId, { role });
    revalidatePath('/app/team'); return ok();
  } catch (e) { return fail((e as Error).message); }
}

export async function removeMember(memberId: string): Promise<FormState> {
  try {
    const { supabase, org, user } = await guard('admin');
    const { data: m } = await supabase.from('organization_members').select('role').eq('id', memberId).eq('organization_id', org.id).single();
    if (m?.role === 'owner') return fail('The owner cannot be removed.');
    await supabase.from('organization_members').delete().eq('id', memberId).eq('organization_id', org.id);
    await audit(supabase, org.id, user.id, 'member.removed', 'member', memberId);
    revalidatePath('/app/team'); return ok();
  } catch (e) { return fail((e as Error).message); }
}

export const updateSettings = wrap(async ({ supabase, org, user }, fd) => {
  const v = z.object({ name: z.string().min(1), due_soon_days: z.coerce.number().int().min(1).max(60) }).parse(str(fd));
  await supabase.from('organizations').update({ name: v.name }).eq('id', org.id);
  await supabase.from('organization_settings').update({ due_soon_days: v.due_soon_days }).eq('organization_id', org.id);
  await audit(supabase, org.id, user.id, 'settings.updated', 'organization', org.id, v);
  revalidatePath('/app', 'layout'); return ok('Settings saved');
}, 'admin');
