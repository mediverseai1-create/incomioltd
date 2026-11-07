'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { reviewInsight } from '../actions';

export function InsightActions({ id }: { id: string }) {
  const router = useRouter(); const [pending, start] = useTransition();
  const go = (s: 'reviewed' | 'dismissed') => start(async () => { await reviewInsight(id, s); router.refresh(); });
  return <div className="mt-3 flex gap-2"><button className="btn btn-ghost px-2 py-1" disabled={pending} onClick={() => go('reviewed')}>Mark reviewed</button><button className="btn btn-ghost px-2 py-1" disabled={pending} onClick={() => go('dismissed')}>Dismiss</button></div>;
}
