import { getCtx } from '@/lib/ctx';
import { can, ROLE_LABELS, type Role } from '@/lib/rbac';
import { inviteMember } from '../actions';
import { ActionForm, Field } from '@/components/forms';
import { PageHeader, Card, Table, Badge } from '@/components/ui';
import { MemberControls } from './MemberControls';

export const metadata = { title: 'Team & Permissions' };

const PERMS: [string, string][] = [['View all org data', 'All roles'], ['Import / create financial records, run AI', 'Owner, Administrator, CFO, Finance Manager, Accountant, AR Officer'], ['Approve reconciliation, actions, reminders; void invoices', 'Owner, Administrator, CFO, Finance Manager'], ['Manage team, units, settings, billing', 'Owner, Administrator']];

export default async function Team() {
  const { supabase, org, role, user } = await getCtx();
  const [{ data: members }, { data: people }, { data: audit }] = await Promise.all([
    supabase.from('organization_members').select('*').eq('organization_id', org.id).order('created_at'),
    supabase.from('profiles').select('id,full_name,email'),
    can(role, 'approve') ? supabase.from('audit_logs').select('action,entity,created_at,user_id').eq('organization_id', org.id).order('created_at', { ascending: false }).limit(40) : Promise.resolve({ data: null }),
  ]);
  const p = new Map((people ?? []).map((x) => [x.id, x]));
  const admin = can(role, 'admin');
  return (
    <>
      <PageHeader title="Team & Permissions" sub="Roles are enforced in the database (row-level security) and again in the application." />
      <Card>
        <Table head={['Member', 'Role', 'Status', '']}>
          {(members ?? []).map((m) => (
            <tr key={m.id}><td className="td">{m.user_id ? (p.get(m.user_id)?.full_name || p.get(m.user_id)?.email) : m.invited_email}{m.user_id === user.id && ' (you)'}</td>
              <td className="td">{ROLE_LABELS[m.role as Role]}</td><td className="td"><Badge tone={m.status === 'active' ? 'good' : 'warn'}>{m.status}</Badge></td>
              <td className="td">{admin && m.role !== 'owner' && <MemberControls id={m.id} role={m.role} />}</td></tr>
          ))}
        </Table>
      </Card>
      {admin && <Card title="Invite a member" className="mt-4"><ActionForm action={inviteMember} submit="Invite">
        <div className="grid gap-3 md:grid-cols-2"><Field label="Email" name="email" type="email" required />
          <div><label className="label" htmlFor="role">Role</label><select id="role" name="role" className="input">{(Object.keys(ROLE_LABELS) as Role[]).filter((r) => r !== 'owner').map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select></div></div></ActionForm>
        <p className="mt-2 text-xs text-ink-600">No email is sent. The invitee gets access when they sign up (or sign in) with this exact email address.</p></Card>}
      <Card title="What each role can do" className="mt-4"><Table head={['Capability', 'Roles']}>{PERMS.map(([a, b]) => <tr key={a}><td className="td">{a}</td><td className="td">{b}</td></tr>)}</Table></Card>
      {audit && <Card title="Audit trail (latest)" className="mt-4"><Table head={['When', 'Who', 'Action']}>{audit.map((a, i) => <tr key={i}><td className="td">{a.created_at.slice(0, 16).replace('T', ' ')}</td><td className="td">{p.get(a.user_id)?.full_name || p.get(a.user_id)?.email || '—'}</td><td className="td">{a.action}</td></tr>)}</Table></Card>}
    </>
  );
}
