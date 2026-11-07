import { getCtx } from '@/lib/ctx';
import { Sidebar } from '@/components/Sidebar';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { org, user } = await getCtx();
  return (
    <div className="min-h-screen lg:flex">
      <Sidebar org={org.name} email={user.email ?? ''} />
      <main className="min-w-0 flex-1 px-4 py-6 lg:px-8"><div className="mx-auto max-w-6xl">{children}</div></main>
    </div>
  );
}
