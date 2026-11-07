'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { changeRole, removeMember } from '../actions';
import { ROLE_LABELS, type Role } from '@/lib/rbac';

export function MemberControls({ id, role }: { id: string; role: string }) {
  const router = useRouter(); const [pending, start] = useTransition(); const [err, setErr] = useState('');
  return (
    <div className="flex items-center gap-2">
      <select aria-label="Role" className="input w-auto" defaultValue={role} disabled={pending} onChange={(e) => start(async () => { const r = await changeRole(id, e.target.value as Role); if (r?.error) setErr(r.error); else router.refresh(); })}>
        {(Object.keys(ROLE_LABELS) as Role[]).filter((r) => r !== 'owner').map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select>
      <button className="btn btn-danger px-2 py-1" disabled={pending} onClick={() => { if (window.confirm('Remove this member? They lose access immediately.')) start(async () => { const r = await removeMember(id); if (r?.error) setErr(r.error); else router.refresh(); }); }}>Remove</button>
      {err && <span role="alert" className="text-xs text-red-700">{err}</span>}
    </div>
  );
}
