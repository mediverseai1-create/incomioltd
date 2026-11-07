'use client';
import { useActionState, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export type FormState = { ok?: boolean; error?: string; message?: string } | null;

/** Wraps a server action with pending, error and success feedback. */
export function ActionForm({ action, children, submit = 'Save', className = '', resetOnSuccess = true }: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>; children: React.ReactNode; submit?: string; className?: string; resetOnSuccess?: boolean;
}) {
  const [state, run, pending] = useActionState(async (p: FormState, fd: FormData) => {
    const r = await action(p, fd);
    return r;
  }, null);
  return (
    <form action={run} className={className} key={resetOnSuccess && state?.ok ? 'ok' + Date.now() : 'f'}>
      {children}
      <div className="mt-3 flex items-center gap-3">
        <button className="btn btn-primary" disabled={pending}>{pending ? 'Working…' : submit}</button>
        {state?.error && <span role="alert" className="text-sm text-red-700">{state.error}</span>}
        {state?.ok && <span role="status" className="text-sm text-forest">{state.message ?? 'Saved'}</span>}
      </div>
    </form>
  );
}

export const Field = ({ label, name, type = 'text', required, placeholder, defaultValue, step }: { label: string; name: string; type?: string; required?: boolean; placeholder?: string; defaultValue?: string; step?: string }) => (
  <div><label className="label" htmlFor={name}>{label}</label><input id={name} name={name} type={type} required={required} placeholder={placeholder} defaultValue={defaultValue} step={step} className="input" /></div>
);

/** Button that calls a JSON API route and refreshes the page; optional confirm dialog for consequential actions. */
export function ApiButton({ url, body, label, confirm, className = 'btn btn-ghost', onDone }: { url: string; body?: unknown; label: string; confirm?: string; className?: string; onDone?: (r: any) => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      <button className={className} disabled={pending} onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        start(async () => {
          setMsg(null);
          const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body ?? {}) });
          const j = await res.json().catch(() => ({}));
          setMsg({ ok: res.ok, text: res.ok ? (j.message ?? 'Done') : (j.error ?? 'Something went wrong') });
          if (res.ok) { onDone?.(j); router.refresh(); }
        });
      }}>{pending ? 'Working…' : label}</button>
      {msg && <span role="status" className={`text-xs ${msg.ok ? 'text-forest' : 'text-red-700'}`}>{msg.text}</span>}
    </span>
  );
}
