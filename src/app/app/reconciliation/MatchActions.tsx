'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { decideMatch, runReconciliation } from '../actions';

export function MatchActions({ id, duplicate }: { id: string; duplicate: boolean }) {
  const router = useRouter(); const [pending, start] = useTransition(); const [err, setErr] = useState('');
  const go = (d: 'approved' | 'rejected' | 'investigate') => {
    if (d === 'approved' && !window.confirm(duplicate ? 'Confirm this as a duplicate record? No allocation is created.' : 'Approve this match? The payment amount will be allocated to the invoice and recorded in the audit log.')) return;
    start(async () => { const r = await decideMatch(id, d); if (r?.error) setErr(r.error); else router.refresh(); });
  };
  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1">
        <button className="btn btn-green px-2 py-1" disabled={pending} onClick={() => go('approved')}>Approve</button>
        <button className="btn btn-danger px-2 py-1" disabled={pending} onClick={() => go('rejected')}>Reject</button>
        <button className="btn btn-ghost px-2 py-1" disabled={pending} onClick={() => go('investigate')}>Investigate</button>
      </div>
      {err && <span role="alert" className="max-w-[220px] text-xs text-red-700">{err}</span>}
    </div>
  );
}

export function RunButton() {
  const router = useRouter(); const [pending, start] = useTransition(); const [msg, setMsg] = useState('');
  return (
    <>
      <button className="btn btn-primary" disabled={pending} onClick={() => start(async () => { const r = await runReconciliation(); setMsg(r?.error ?? r?.message ?? ''); router.refresh(); })}>{pending ? 'Matching…' : 'Find matches'}</button>
      {msg && <span role="status" className="self-center text-sm text-ink-600">{msg}</span>}
    </>
  );
}
