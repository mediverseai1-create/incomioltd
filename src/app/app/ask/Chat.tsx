'use client';
import { useRef, useState } from 'react';

type Msg = { role: 'user' | 'assistant'; content: string; citations: string[] | null };
const SUGGESTIONS = ['How much money are we currently owed?', 'Which customers have the highest overdue balances?', 'Which invoices should we follow up on today?', 'Which customers regularly pay late?', 'What payments are expected this month?', 'Prepare a financial summary for management.'];

export function Chat({ history }: { history: Msg[] }) {
  const [msgs, setMsgs] = useState<Msg[]>(history); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const input = useRef<HTMLInputElement>(null);
  async function send(q: string) {
    if (!q.trim() || busy) return;
    setErr(''); setBusy(true); setMsgs((m) => [...m, { role: 'user', content: q, citations: null }]);
    if (input.current) input.current.value = '';
    try {
      const r = await fetch('/api/ask', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: q }) });
      const j = await r.json(); if (!r.ok) throw new Error(j.error);
      setMsgs((m) => [...m, { role: 'assistant', content: j.answer + (j.missing_data ? `\n\nMissing data: ${j.missing_data}` : ''), citations: j.citations }]);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <div className="card flex flex-col">
      <div className="min-h-[300px] flex-1 space-y-4 p-4" aria-live="polite">
        {msgs.length === 0 && <div><p className="mb-2 text-sm text-ink-600">Try one of these:</p><div className="flex flex-wrap gap-2">{SUGGESTIONS.map((s) => <button key={s} className="btn btn-ghost text-left" onClick={() => send(s)}>{s}</button>)}</div></div>}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
            <div className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-left text-sm ${m.role === 'user' ? 'bg-wine text-cream-50' : 'bg-cream'}`}>{m.content}</div>
            {m.citations?.length ? <div className="mt-1 text-xs text-ink-600">Based on: {m.citations.join(', ')}</div> : null}
          </div>
        ))}
        {busy && <p className="text-sm text-ink-600" role="status">Analysing your records…</p>}
        {err && <p role="alert" className="text-sm text-red-700">{err}</p>}
      </div>
      <form className="flex gap-2 border-t border-cream-200 p-3" onSubmit={(e) => { e.preventDefault(); send(input.current?.value ?? ''); }}>
        <input ref={input} className="input" placeholder="Ask about your receivables, payments or cash flow…" aria-label="Question" maxLength={1000} />
        <button className="btn btn-primary" disabled={busy}>Ask</button>
      </form>
    </div>
  );
}
