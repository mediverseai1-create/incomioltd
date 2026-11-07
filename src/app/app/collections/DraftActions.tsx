'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { decideDraft } from '../actions';

export function DraftActions({ id, status, canApprove, canLog }: { id: string; status: string; canApprove: boolean; canLog: boolean }) {
  const router = useRouter(); const [pending, start] = useTransition(); const [err, setErr] = useState('');
  const go = (d: 'approved' | 'rejected' | 'sent_manually') => start(async () => { const r = await decideDraft(id, d); if (r?.error) setErr(r.error); else router.refresh(); });
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {status === 'draft' && canApprove && <><button className="btn btn-green px-2 py-1" disabled={pending} onClick={() => go('approved')}>Approve</button><button className="btn btn-danger px-2 py-1" disabled={pending} onClick={() => go('rejected')}>Reject</button></>}
      {status === 'approved' && canLog && <button className="btn btn-ghost px-2 py-1" disabled={pending} onClick={() => go('sent_manually')}>Mark as sent (I sent it myself)</button>}
      {status === 'draft' && !canApprove && <span className="text-xs text-ink-400">Needs approval by a finance manager or above</span>}
      {err && <span role="alert" className="text-xs text-red-700">{err}</span>}
    </div>
  );
}
