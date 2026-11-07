import type { SupabaseClient } from '@supabase/supabase-js';

export async function audit(supabase: SupabaseClient, orgId: string, userId: string, action: string, entity?: string, entityId?: string, detail?: unknown) {
  await supabase.from('audit_logs').insert({ organization_id: orgId, user_id: userId, action, entity, entity_id: entityId, detail: detail ?? null });
}
