import Link from 'next/link';
import { PLANS, PLAN_KEYS } from '@/lib/plans';

const CAPS = [
  ['Receivables intelligence', 'See what is owed, what is overdue and how balances age, per customer and per currency. Every figure is calculated from your records.'],
  ['Payment reconciliation', 'Incomio proposes invoice-to-payment matches with the evidence behind each one. Nothing is marked paid until your team approves it.'],
  ['Cash-flow forecasting', 'Best, expected and conservative scenarios built from open invoices, payment timing and known obligations, with assumptions shown.'],
  ['Collections intelligence', 'A transparent priority score, collection history and AI-drafted reminders that stay drafts until a person approves them.'],
  ['Profitability & multi-business', 'Revenue, collected income, discounts and margins by customer, service and business unit, only where cost data exists.'],
  ['Ask Incomio', 'Ask questions in plain language and get answers grounded in your own records, with the invoices and customers behind them.'],
];
const STEPS = [['Import', 'Upload CSV, XLSX or PDF. Map columns, validate and preview before saving.'], ['Understand', 'Deterministic calculations produce receivables, aging and payment behaviour.'], ['Analyse', 'AI agents explain findings and suggest actions from those calculated figures.'], ['Approve', 'Finance staff review matches, reminders and actions. Every decision is audit-logged.']];
const USE = [['Agencies & professional services', 'Track retainers and project invoices that clients pay late.'], ['Distributors & B2B', 'Reconcile high payment volumes against many open invoices.'], ['Accounting & bookkeeping firms', 'Give each client a clear view of receivables and collections.'], ['Multi-branch groups', 'Compare receivables and cash pressure across branches and subsidiaries.']];
const FAQ = [
  ['Does Incomio move money or contact my customers?', 'No. Incomio analyses, recommends and drafts. It cannot initiate payments, change bank records or send customer messages. Every consequential action needs human approval.'],
  ['Are the numbers calculated by AI?', 'No. Totals, aging, balances and forecasts come from deterministic code with decimal-safe arithmetic. AI explains and recommends based on those results.'],
  ['What data can I import?', 'CSV, XLSX and PDF/image documents for invoices and receipts, plus bank exports, expenses, supplier obligations and business units. Live integrations are coming soon and are marked as such.'],
  ['Does it support multiple currencies?', 'Yes. Currencies are stored explicitly and never combined into one total without a recorded conversion rate.'],
  ['Can I trust the forecast?', 'Forecasts are estimates built from stated assumptions and your payment history, not guaranteed balances. Confidence is shown with each one.'],
  ['Is Incomio an accounting system or bank?', 'No. It is analytical software and not a replacement for professional accounting advice.'],
];
const CARD_BG = ['from-[#3a1d00] to-[#140a00]', 'from-[#1c1c1c] to-[#080808]', 'from-[#2b2010] to-[#0c0905]'];

function Wordmark() {
  return (
    <Link href="/" className="inline-flex items-center gap-2" aria-label="Incomio home">
      <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#FFB75A] text-lg font-extrabold text-[#FFB75A]">i</span>
      <span className="text-2xl font-bold tracking-wide">INCOMIO</span>
    </Link>
  );
}

export default function Home() {
  return (
    <div className="dark-site min-h-screen">
      <header className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-4 py-5">
        <Wordmark />
        <div className="hidden items-center rounded-full border border-[#FFB75A]/40 bg-[#111] p-1.5 md:flex" role="tablist" aria-label="Audience">
          <a href="#features" className="rounded-full bg-[#FFB75A] px-6 py-2 text-sm font-semibold text-black">Finance teams</a>
          <a href="#use-cases" className="px-6 py-2 text-sm text-white/90">Businesses</a>
        </div>
        <nav className="hidden gap-7 text-sm lg:flex" aria-label="Primary"><a href="#features">Products</a><a href="#how">How it works</a><a href="#faq">Support</a><a href="#pricing">Pricing</a></nav>
        <div className="flex gap-3"><Link href="/login" className="btn btn-outline px-6 py-3">Login</Link><Link href="/signup" className="btn btn-amber px-6 py-3">Create an account</Link></div>
      </header>

      <section className="relative mx-auto max-w-[1200px] px-4 pb-16 pt-14 text-center">
        <div className="coin floaty absolute left-2 top-6 hidden md:flex">$</div>
        <div className="coin floaty absolute right-6 top-24 hidden h-16 w-16 text-2xl md:flex" style={{ animationDelay: '1s' }}>$</div>
        <h1 className="mx-auto max-w-3xl text-5xl leading-[1.1] md:text-7xl"><span className="text-[#FFB75A]">Know what you&apos;re owed</span><br />understand what&apos;s coming</h1>
        <p className="mx-auto mt-7 max-w-2xl text-lg text-white/90">Incomio brings your invoices, payments and receivables together to help your finance team reconcile income, prioritize collections and understand future cash flow with AI-powered financial intelligence.</p>
        <div className="mt-9 flex flex-wrap justify-center gap-4"><Link href="/signup" className="btn btn-amber px-8 py-4 text-base">Get Started</Link><a href="#features" className="btn btn-outline px-8 py-4 text-base">Explore Features</a></div>
      </section>

      <section className="mx-auto grid max-w-[1200px] gap-5 px-4 md:grid-cols-3" aria-label="Highlights">
        {[['Know what is owed', 'Receivables and aging per customer and currency.'], ['Match every payment', 'Suggested matches with evidence, approved by your team.'], ['See cash coming', 'Scenario forecasts with assumptions you can adjust.']].map(([t, b], i) => (
          <div key={t} className={`flex h-72 flex-col justify-end rounded-2xl bg-gradient-to-br ${CARD_BG[i]} p-6 ring-1 ring-white/10`}>
            <div className="mb-auto h-1 w-12 rounded bg-[#FFB75A]" /><h3 className="text-2xl text-[#FFB75A]">{t}</h3><p className="mt-2 text-sm text-white/80">{b}</p>
          </div>))}
      </section>

      <section id="features" className="mx-auto max-w-[1200px] px-4 py-24">
        <h2 className="text-4xl">Financial intelligence <span className="text-[#FFB75A]">capabilities</span></h2>
        <p className="mt-3 max-w-2xl text-white/70">One connected platform for the whole income cycle, built on a single shared data model.</p>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{CAPS.map(([t, b]) => (
          <article key={t} className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-6"><div className="mb-4 h-1 w-10 rounded bg-[#FFB75A]" /><h3 className="text-xl">{t}</h3><p className="mt-2 text-sm text-white/70">{b}</p></article>))}</div>
      </section>

      <section id="how" className="mx-auto max-w-[1200px] px-4 py-16">
        <h2 className="text-4xl">How Incomio <span className="text-[#FFB75A]">works</span></h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-4">{STEPS.map(([t, b], i) => <li key={t} className="rounded-2xl border border-white/10 p-6"><div className="text-4xl font-extrabold text-[#FFB75A]">{i + 1}</div><h3 className="mt-2 text-lg">{t}</h3><p className="mt-1 text-sm text-white/70">{b}</p></li>)}</ol>
      </section>

      <section id="use-cases" className="mx-auto max-w-[1200px] px-4 py-16">
        <h2 className="text-4xl">Built for <span className="text-[#FFB75A]">finance teams</span></h2>
        <div className="mt-10 grid gap-5 md:grid-cols-4">{USE.map(([t, b]) => <div key={t} className="rounded-2xl bg-[#FFB75A] p-6 text-black"><h3 className="text-lg">{t}</h3><p className="mt-2 text-sm text-black/80">{b}</p></div>)}</div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 py-16">
        <h2 className="text-4xl">Safeguards <span className="text-[#FFB75A]">by design</span></h2>
        <ul className="mt-8 grid gap-3 text-sm md:grid-cols-2">{['Totals and forecasts come from deterministic, decimal-safe calculations, never from AI guesses.', 'Payments count against an invoice only after an authorised person approves the match.', 'Organization-level data isolation with row-level security and role-based permissions.', 'AI agents cannot transfer money, alter invoices or send customer messages.', 'Core features keep working if the AI service is unavailable.', 'Integrations that are not built yet are labelled Coming Soon, never faked.'].map((x) => <li key={x} className="rounded-xl border border-white/10 bg-[#0d0d0d] p-4 text-white/80">{x}</li>)}</ul>
      </section>

      <section id="pricing" className="mx-auto max-w-[1200px] px-4 py-24">
        <h2 className="text-center text-4xl">Simple monthly <span className="text-[#FFB75A]">pricing</span></h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">{PLAN_KEYS.map((k, i) => (
          <div key={k} className={`rounded-2xl border p-8 ${i === 1 ? 'border-[#FFB75A] bg-[#140d03]' : 'border-white/10 bg-[#0d0d0d]'}`}>
            <h3 className="text-2xl">{PLANS[k].name}</h3>
            <div className="num mt-2 text-5xl font-extrabold text-[#FFB75A]">${PLANS[k].price}<span className="text-base font-medium text-white/60">/month</span></div>
            <p className="mt-3 text-sm text-white/70">{PLANS[k].blurb}</p>
            <ul className="mt-5 space-y-2 text-sm text-white/85"><li>✓ Receivables, reconciliation &amp; collections</li><li>✓ Cash-flow forecasting</li><li>✓ AI agents &amp; Ask Incomio</li><li>✓ Reports &amp; CSV/PDF export</li></ul>
            <Link href="/signup" className={`btn mt-7 w-full py-3 ${i === 1 ? 'btn-amber' : 'btn-outline'}`}>Get Started</Link>
          </div>))}</div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl px-4 py-16">
        <h2 className="text-4xl">Frequently asked <span className="text-[#FFB75A]">questions</span></h2>
        <div className="mt-8 divide-y divide-white/10 rounded-2xl border border-white/10">{FAQ.map(([q, a]) => <details key={q} className="p-5"><summary className="cursor-pointer font-semibold">{q}</summary><p className="mt-2 text-sm text-white/70">{a}</p></details>)}</div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 py-16">
        <div className="rounded-3xl bg-[#FFB75A] px-6 py-14 text-center text-black">
          <h2 className="mx-auto max-w-2xl text-3xl md:text-4xl">Every payment understood. Every receivable accounted for.</h2>
          <p className="mt-2 text-black/75">Every financial decision better informed.</p>
          <Link href="/signup" className="btn mt-7 bg-black px-8 py-4 text-white hover:bg-[#222]">Get Started</Link>
        </div>
      </section>

      <footer className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 border-t border-white/10 px-4 py-8 text-sm text-white/60">
        <Wordmark /><p>© {new Date().getFullYear()} Incomio. Analytical software, not a bank or accounting advice.</p>
        <div className="flex gap-5"><Link href="/login">Login</Link><Link href="/signup">Create an account</Link></div>
      </footer>
    </div>
  );
}
