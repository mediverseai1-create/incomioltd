import Link from 'next/link';
import { Logo } from '@/components/ui';
import { PLANS, PLAN_KEYS } from '@/lib/plans';

const CAPS = [
  ['Receivables intelligence', 'See what is owed, what is overdue and how balances age, per customer and per currency. Every figure is calculated from your records.'],
  ['Payment reconciliation', 'Incomio proposes invoice-to-payment matches with the evidence behind each one. Nothing is marked paid until your team approves it.'],
  ['Cash-flow forecasting', 'Best, expected and conservative scenarios built from open invoices, customer payment timing and known obligations, with assumptions shown.'],
  ['Collections intelligence', 'A transparent priority score, collection history and AI-drafted reminders that stay drafts until a person approves them.'],
  ['Profitability & multi-business', 'Revenue, collected income, discounts and margins by customer, service and business unit, only where cost data exists.'],
  ['Ask Incomio', 'Ask questions in plain language and get answers grounded in your own records, with the invoices and customers behind them.'],
];
const STEPS = [['Import', 'Upload CSV, XLSX or PDF. Map columns, validate and preview before saving.'], ['Understand', 'Deterministic calculations produce receivables, aging and payment behaviour.'], ['Analyse', 'AI agents explain findings and suggest actions using those calculated figures.'], ['Approve', 'Finance staff review matches, reminders and actions. Every decision is audit-logged.']];
const USE = [['Agencies & professional services', 'Track retainers and project invoices that clients pay late.'], ['Distributors & B2B', 'Reconcile high payment volumes against many open invoices.'], ['Accounting & bookkeeping firms', 'Give each client a clear view of receivables and collections.'], ['Multi-branch groups', 'Compare receivables and cash pressure across branches and subsidiaries.']];
const FAQ = [
  ['Does Incomio move money or contact my customers?', 'No. Incomio analyses, recommends and drafts. It cannot initiate payments, change bank records or send customer messages. Every consequential action needs human approval.'],
  ['Are the numbers calculated by AI?', 'No. Totals, aging, balances and forecasts come from deterministic code with decimal-safe arithmetic. AI explains and recommends based on those results.'],
  ['What data can I import?', 'CSV, XLSX and PDF/image documents for invoices and receipts, plus bank exports, expenses, supplier obligations and business units. Live accounting integrations are coming soon and are clearly marked as such.'],
  ['Does it support multiple currencies?', 'Yes. Currencies are stored explicitly and never combined into one total without a recorded conversion rate.'],
  ['Can I trust the forecast?', 'Forecasts are estimates built from stated assumptions and your payment history. They are not guaranteed balances, and confidence is shown with each one.'],
  ['Is Incomio an accounting system or bank?', 'No. It is analytical software and not a replacement for professional accounting advice.'],
];

export default function Home() {
  return (
    <div className="bg-cream-50">
      <header className="sticky top-0 z-30 border-b border-cream-200 bg-cream-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Logo />
          <nav className="hidden gap-6 text-sm md:flex" aria-label="Primary"><a href="#features">Features</a><a href="#how">How it works</a><a href="#pricing">Pricing</a><a href="#faq">FAQ</a></nav>
          <div className="flex gap-2"><Link href="/login" className="btn btn-ghost">Sign in</Link><Link href="/signup" className="btn btn-primary">Get Started</Link></div>
        </div>
      </header>

      <section className="bg-wine text-cream-50">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="mb-3 text-sm uppercase tracking-widest text-amber">AI income &amp; financial operations intelligence</p>
            <h1 className="text-4xl font-semibold leading-tight md:text-5xl">Know What You&apos;re Owed. Understand What&apos;s Coming.</h1>
            <p className="mt-5 max-w-xl text-cream-200">Incomio brings your invoices, payments and receivables together to help your finance team reconcile income, prioritize collections and understand future cash flow with AI-powered financial intelligence.</p>
            <div className="mt-8 flex flex-wrap gap-3"><Link href="/signup" className="btn bg-amber px-6 py-3 text-wine hover:bg-[#e6a94f]">Get Started</Link><a href="#features" className="btn border border-cream-50/40 px-6 py-3 hover:bg-cream-50/10">Explore Features</a></div>
          </div>
          <div className="rounded-lg bg-cream-50 p-5 text-ink" aria-label="Illustration of receivables aging">
            <div className="mb-3 flex items-center justify-between"><span className="font-display text-lg text-wine">Receivables aging</span><span className="text-xs text-ink-400">Illustration — not real data</span></div>
            {[['Not due', 70, 'bg-forest'], ['1–30 days', 45, 'bg-amber'], ['31–60 days', 28, 'bg-terra'], ['61–90 days', 16, 'bg-wine-700'], ['90+ days', 9, 'bg-wine-900']].map(([l, w, c]) => (
              <div key={String(l)} className="mb-2 flex items-center gap-3 text-xs"><span className="w-20 text-ink-600">{l}</span><div className="h-4 flex-1 rounded bg-cream"><div className={`h-4 rounded ${c}`} style={{ width: `${w}%` }} /></div></div>
            ))}
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">{['Matched', 'To review', 'Follow-ups'].map((t) => <div key={t} className="rounded border border-cream-200 p-2"><div className="text-ink-600">{t}</div><div className="font-display text-lg text-wine">—</div></div>)}</div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="max-w-3xl text-3xl text-wine">One connected platform for the whole income cycle</h2>
        <p className="mt-3 max-w-3xl text-ink-600">Financial data → understanding → AI analysis → risks and opportunities → recommended actions → human approval → outcome tracking. One shared data model, not five separate tools.</p>
      </section>

      <section id="features" className="border-y border-cream-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-3xl text-wine">Financial intelligence capabilities</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{CAPS.map(([t, b], i) => (
            <article key={t} className="rounded-lg border border-cream-200 p-5"><div className={`mb-3 h-1 w-10 rounded ${['bg-wine', 'bg-forest', 'bg-terra', 'bg-amber', 'bg-wine', 'bg-forest'][i]}`} /><h3 className="text-xl text-wine">{t}</h3><p className="mt-2 text-sm text-ink-600">{b}</p></article>))}</div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-3xl text-wine">How Incomio works</h2>
        <ol className="mt-8 grid gap-5 md:grid-cols-4">{STEPS.map(([t, b], i) => <li key={t}><div className="font-display text-3xl text-terra">{i + 1}</div><h3 className="text-lg text-wine">{t}</h3><p className="mt-1 text-sm text-ink-600">{b}</p></li>)}</ol>
      </section>

      <section className="bg-forest text-cream-50">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-3xl">Built for finance teams</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-4">{USE.map(([t, b]) => <div key={t}><h3 className="text-lg text-amber">{t}</h3><p className="mt-1 text-sm text-cream-200">{b}</p></div>)}</div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-3xl text-wine">Safeguards by design</h2>
        <ul className="mt-6 grid gap-3 text-sm md:grid-cols-2">
          {['Totals and forecasts come from deterministic, decimal-safe calculations — never from AI guesses.', 'Payments are only counted against an invoice after an authorised person approves the match.', 'Organization-level data isolation with row-level security and role-based permissions.', 'AI agents cannot transfer money, alter invoices or send customer messages. Approvals and audit logs are built in.', 'Core features keep working if the AI service is unavailable.', 'Integrations that are not built yet are labelled Coming Soon, never faked.'].map((x) => <li key={x} className="rounded border border-cream-200 bg-white p-3">{x}</li>)}
        </ul>
      </section>

      <section id="pricing" className="border-y border-cream-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-3xl text-wine">Pricing</h2>
          <p className="mt-2 text-sm text-ink-600">Simple monthly plans. Billing is handled through a secure external payment page.</p>
          <div className="mt-8 grid gap-5 md:grid-cols-3">{PLAN_KEYS.map((k, i) => (
            <div key={k} className={`rounded-lg border p-6 ${i === 1 ? 'border-wine ring-2 ring-wine' : 'border-cream-200'}`}>
              {i === 1 && <div className="mb-2 text-xs font-medium uppercase tracking-wide text-terra">Most chosen by finance teams</div>}
              <h3 className="text-2xl text-wine">{PLANS[k].name}</h3><div className="num mt-1 font-display text-4xl">${PLANS[k].price}<span className="text-base text-ink-600">/month</span></div>
              <p className="mt-2 text-sm text-ink-600">{PLANS[k].blurb}</p>
              <ul className="mt-4 space-y-1 text-sm"><li>✓ Receivables, reconciliation &amp; collections</li><li>✓ Cash-flow forecasting</li><li>✓ AI agents &amp; Ask Incomio</li><li>✓ Reports &amp; CSV/PDF export</li></ul>
              <Link href="/signup" className="btn btn-primary mt-5 w-full">Get Started</Link>
            </div>))}</div>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl px-4 py-16">
        <h2 className="text-3xl text-wine">Frequently asked questions</h2>
        <div className="mt-6 divide-y divide-cream-200 rounded-lg border border-cream-200 bg-white">{FAQ.map(([q, a]) => <details key={q} className="group p-4"><summary className="cursor-pointer font-medium text-ink">{q}</summary><p className="mt-2 text-sm text-ink-600">{a}</p></details>)}</div>
      </section>

      <section className="bg-wine text-center text-cream-50">
        <div className="mx-auto max-w-3xl px-4 py-16">
          <h2 className="text-3xl">Every payment understood. Every receivable accounted for.</h2>
          <p className="mt-2 text-cream-200">Every financial decision better informed.</p>
          <Link href="/signup" className="btn mt-6 bg-amber px-6 py-3 text-wine hover:bg-[#e6a94f]">Get Started</Link>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-8 text-sm text-ink-600">
        <Logo /><p>© {new Date().getFullYear()} Incomio. Analytical software — not a bank or accounting advice.</p>
        <div className="flex gap-4"><Link href="/login">Sign in</Link><Link href="/signup">Get Started</Link></div>
      </footer>
    </div>
  );
}
