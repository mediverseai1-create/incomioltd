import { Suspense } from 'react';
import { AuthForm } from '@/components/AuthForm';

export const metadata = { title: 'Sign up' };
export default function Page() {
  return (
    <main className="dark-site flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <span className="text-2xl font-bold tracking-wide text-[#FFB75A]">INCOMIO</span>
      <Suspense><AuthForm mode="signup" /></Suspense>
    </main>
  );
}
