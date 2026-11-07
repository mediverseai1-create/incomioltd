import { Suspense } from 'react';
import { AuthForm } from '@/components/AuthForm';
import { Logo } from '@/components/ui';

export const metadata = { title: 'Reset password' };
export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <Logo />
      <Suspense><AuthForm mode="reset" /></Suspense>
    </main>
  );
}
