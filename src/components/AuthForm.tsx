'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

export type Mode = 'login' | 'signup' | 'forgot' | 'reset';
const TITLES: Record<Mode, string> = { login: 'Sign in to Incomio', signup: 'Create your Incomio account', forgot: 'Reset your password', reset: 'Choose a new password' };

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const next = useSearchParams().get('next') || '/app';
  const [err, setErr] = useState(''); const [info, setInfo] = useState(''); const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(''); setInfo(''); setBusy(true);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get('email') ?? ''), password = String(fd.get('password') ?? '');
    const sb = supabaseBrowser();
    try {
      if (mode !== 'forgot' && password.length < 8) throw new Error('Password must be at least 8 characters.');
      if (mode === 'login') {
        const { error } = await sb.auth.signInWithPassword({ email, password }); if (error) throw error;
        router.replace(next); router.refresh();
      } else if (mode === 'signup') {
        const { data, error } = await sb.auth.signUp({ email, password, options: { data: { full_name: String(fd.get('name') ?? '') }, emailRedirectTo: `${location.origin}/auth/callback` } });
        if (error) throw error;
        if (data.session) { router.replace('/onboarding'); router.refresh(); } else setInfo('Check your email to verify your address, then sign in.');
      } else if (mode === 'forgot') {
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/auth/callback?next=/reset-password` }); if (error) throw error;
        setInfo('If that email has an account, a reset link is on its way.');
      } else {
        const { error } = await sb.auth.updateUser({ password }); if (error) throw error;
        router.replace('/app');
      }
    } catch (x) { setErr((x as Error).message); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="card w-full max-w-sm p-6">
      <h1 className="mb-4 text-2xl text-wine">{TITLES[mode]}</h1>
      {mode === 'signup' && <div className="mb-3"><label className="label" htmlFor="name">Full name</label><input id="name" name="name" required className="input" /></div>}
      {mode !== 'reset' && <div className="mb-3"><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" className="input" /></div>}
      {mode !== 'forgot' && <div className="mb-3"><label className="label" htmlFor="password">{mode === 'reset' ? 'New password' : 'Password'}</label><input id="password" name="password" type="password" required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className="input" /></div>}
      {err && <p role="alert" className="mb-3 text-sm text-red-700">{err}</p>}
      {info && <p role="status" className="mb-3 text-sm text-forest">{info}</p>}
      <button className="btn btn-primary w-full" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Update password'}</button>
      <div className="mt-4 space-y-1 text-center text-sm text-ink-600">
        {mode === 'login' && <><div><Link className="underline" href="/forgot-password">Forgot password?</Link></div><div>New here? <Link className="underline" href="/signup">Create an account</Link></div></>}
        {mode === 'signup' && <div>Already have an account? <Link className="underline" href="/login">Sign in</Link></div>}
        {mode === 'forgot' && <div><Link className="underline" href="/login">Back to sign in</Link></div>}
      </div>
    </form>
  );
}
