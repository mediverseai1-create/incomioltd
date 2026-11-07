import { getCtx } from '@/lib/ctx';
import { PageHeader, Notice } from '@/components/ui';
import { aiConfigured } from '@/lib/ai/gemini';
import { Chat } from './Chat';

export const metadata = { title: 'Ask Incomio' };

export default async function Ask() {
  const { supabase, org } = await getCtx();
  const { data } = await supabase.from('chat_messages').select('role,content,citations').eq('organization_id', org.id).order('created_at', { ascending: false }).limit(20);
  return (
    <>
      <PageHeader title="Ask Incomio" sub="Ask questions about your own receivables, payments and cash flow. Answers use your calculated figures and cite supporting records." />
      {!aiConfigured() && <Notice tone="warn">AI is not configured yet (GEMINI_API_KEY missing). All other features keep working.</Notice>}
      <Chat history={(data ?? []).reverse() as { role: 'user' | 'assistant'; content: string; citations: string[] | null }[]} />
    </>
  );
}
