'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { decideAction, setActionStatus } from '../actions';
import { Badge, statusTone } from '@/components/ui';

type A = { id: string; title: string; description: string | null; expected_outcome: string | null; priority: string; evidence: string[] | null; approval_status: string; completion_status: string; agent_key: string | null; created_at: string };

export function ActionRow({ a, customer, assignee, canApprove, canWork, history }: { a: A; customer: string | null; assignee: string | null; canApprove: boolean; canWork: boolean; history: string[] }) {
  const router = useRouter(); const [pending, start] = useTransition(); const [err, setErr] = useState('');
  const run = (fn: () => Promise<{ error?: string } | null>) => start(async () => { const r = await fn(); if (r?.error) setErr(r.error); else { setErr(''); router.refresh(); } });
  return (
    <div className="rounded border border-cream-200 p-3">
      <div className="flex flex-wrap items-center gap-2"><Badge tone={statusTone(a.priority)}>{a.priority}</Badge><Badge tone={statusTone(a.approval_status)}>{a.approval_status}</Badge><Badge tone={statusTone(a.completion_status)}>{a.completion_status.replace('_', ' ')}</Badge>{a.agent_key && <span className="text-xs text-ink-400">by {a.agent_key} agent</span>}</div>
      <h4 className="mt-1 font-medium">{a.title}</h4>
      {a.description && <p className="text-sm text-ink-600">{a.description}</p>}
      <p className="mt-1 text-xs text-ink-600">{customer && <>Customer: {customer} · </>}{a.expected_outcome && <>Expected outcome: {a.expected_outcome} · </>}Responsible: {assignee ?? 'unassigned'}</p>
      {a.evidence?.length ? <ul className="mt-1 list-disc pl-5 text-xs text-ink-600">{a.evidence.map((e, i) => <li key={i}>{e}</li>)}</ul> : null}
      {history.length > 0 && <p className="mt-1 text-xs text-ink-400">Audit: {history.join(' · ')}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {a.approval_status === 'pending' && canApprove && <>
          <button className="btn btn-green px-2 py-1" disabled={pending} onClick={() => { if (window.confirm('Approve this recommended action? It will be recorded in the audit log.')) run(() => decideAction(a.id, 'approved')); }}>Approve</button>
          <button className="btn btn-danger px-2 py-1" disabled={pending} onClick={() => run(() => decideAction(a.id, 'rejected'))}>Reject</button></>}
        {a.approval_status === 'approved' && canWork && a.completion_status !== 'done' && <>
          <button className="btn btn-ghost px-2 py-1" disabled={pending} onClick={() => run(() => setActionStatus(a.id, 'in_progress', true))}>Take it</button>
          <button className="btn btn-ghost px-2 py-1" disabled={pending} onClick={() => run(() => setActionStatus(a.id, 'done'))}>Mark done</button></>}
        {a.approval_status === 'pending' && !canApprove && <span className="text-xs text-ink-400">Awaiting approval by a finance manager or above</span>}
        {err && <span role="alert" className="text-xs text-red-700">{err}</span>}
      </div>
    </div>
  );
}
