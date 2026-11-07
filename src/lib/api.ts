import 'server-only';
import { NextResponse } from 'next/server';
import { supabaseServer } from './supabase/server';
import { can, type Perm, type Role } from './rbac';
import { UsageError } from './usage';
import { AiUnavailable } from './ai/gemini';

export class HttpError extends Error { constructor(public status: number, msg: string) { super(msg); } }

/** Authenticates the caller and verifies organization membership and permission server-side. */
export async function apiAuth(perm?: Perm) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new HttpError(401, 'Not signed in.');
  const { data: mem } = await supabase.from('organization_members')
    .select('role, organizations(id,name,primary_currency)').eq('user_id', user.id).eq('status', 'active').order('created_at').limit(1).maybeSingle();
  const org = mem?.organizations as unknown as { id: string; name: string; primary_currency: string } | null;
  if (!org) throw new HttpError(403, 'No organization.');
  const role = mem!.role as Role;
  if (perm && !can(role, perm)) throw new HttpError(403, 'Your role does not allow this action.');
  return { supabase, user, org, role };
}

export function handle(fn: () => Promise<unknown>) {
  return fn().then((r) => NextResponse.json(r ?? { ok: true })).catch((e) => {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof UsageError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof AiUnavailable) return NextResponse.json({ error: `${e.message} Core features still work without AI.` }, { status: 503 });
    console.error(e);
    return NextResponse.json({ error: 'Unexpected error. Please try again.' }, { status: 500 });
  });
}
