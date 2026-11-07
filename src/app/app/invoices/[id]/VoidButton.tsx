'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { voidInvoice } from '../../actions';

export function VoidButton({ id }: { id: string }) {
  const router = useRouter(); const [pending, start] = useTransition(); const [err, setErr] = useState('');
  return (
    <>
      <button className="btn btn-danger" disabled={pending} onClick={() => {
        if (!window.confirm('Void this invoice? It will be excluded from receivables. This is recorded in the audit log.')) return;
        start(async () => { const r = await voidInvoice(id); if (r?.error) setErr(r.error); else router.refresh(); });
      }}>Void invoice</button>
      {err && <span role="alert" className="text-sm text-red-700">{err}</span>}
    </>
  );
}
