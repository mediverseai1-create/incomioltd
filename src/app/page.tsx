import Link from 'next/link';
import { PLANS, PLAN_KEYS } from '@/lib/plans';
import { RoiCalc } from '@/components/RoiCalc';

const A = 'text-[#FFB75A]';
const PAIN = [
  ['Cash is trapped in late invoices', 'Revenue is booked, but the money sits in overdue balances nobody has time to rank. Teams chase whoever shouted last, not whoever matters most.'],
  ['Payments never line up cleanly', 'Partial payments, bundled transfers, missing references and duplicates turn month-end into days of spreadsheet matching, and errors slip through.'],
  ['Forecasts are guesses in a spreadsheet', 'Most cash forecasts assume every customer pays on the due date. Real payment behaviour is ignored, so shortfalls arrive as surprises.'],
  ['Numbers nobody can trace', 'A total in a report is only useful if you can see which invoices and payments produced it. When it can\'t be traced, it can\'t be trusted or defended.'],
  ['AI tools that invent answers', 'General chatbots make up figures. In finance, one fabricated number costs more than the time it saved.'],
  ['Scattered data, scattered teams', 'Invoices in one tool, bank exports in another, branches reporting differently. Nobody sees receivables across the whole business.'],
];
const PILLARS: [string, string, string[]][] = [
  ['Receivables intelligence', 'Outstanding, overdue and aging per customer, branch and currency. A transparent priority score tells your team exactly who to contact first, and why.', ['Aging buckets from not due to 90+ days', 'Customer payment behaviour from confirmed payments', 'Priority score with every component explained']],
  ['Payment reconciliation', 'Incomio proposes invoice-to-payment matches and shows the evidence: reference, amount, customer, dates. Your team approves; only then is an invoice marked paid.', ['Partial, over- and under-payment detection', 'Duplicate payment candidates', 'Who approved what, and when']],
  ['Cash-flow forecasting', 'Best, expected and conservative scenarios built from open invoices, how each customer actually pays, supplier obligations and recurring costs.', ['Assumptions shown and adjustable', 'Potential shortfall weeks flagged', 'Confidence level based on available history']],
  ['Collections intelligence', 'Draft reminders grounded in the real invoices, log every touchpoint, and track outcomes, with every message approved by a person before it goes out.', ['Follow-up dates and history per customer', 'AI-drafted, human-approved reminders', 'Recovery outcomes tracked']],
  ['Profitability & multi-business', 'Revenue, collected income, discounts and margins by customer, service and business unit, only where cost data exists. No made-up margins.', ['Consolidate branches and subsidiaries', 'Compare receivables across units', 'Clear flags where data is missing']],
];
const TRACE = [['Dashboard total', 'Outstanding: 148,200.00 USD'], ['Customer', '6 customers contribute'], ['Invoice', 'INV-2043 · 12,400.00 · 41 days overdue'], ['Payment history', 'Partial payment approved by a named reviewer'], ['Source file', 'Original upload linked to the record']];
const COMPARE: [string, string, string][] = [['Match payments to invoices', 'Manual, by eye', 'Suggested with evidence, approved by you'], ['Decide who to chase', 'Gut feel or loudest account', 'Transparent priority score'], ['Forecast cash', 'Everyone pays on due date', 'Uses each customer\'s observed timing'], ['Trace a number', 'Dig through tabs', 'Click through to invoice, payment and file'], ['Use AI safely', 'Chatbot guesses', 'AI explains figures the code calculated'], ['Audit trail', 'Email threads', 'Every approval logged with user and time']];
const AGENTS = ['Financial Intelligence', 'Receivables Intelligence', 'Payment Reconciliation', 'Cash Flow Forecasting', 'Collections Strategy', 'Profitability Intelligence', 'Executive Reporting'];
const CONTROLS = [
  ['Calculated, not guessed', 'Totals, aging, balances and forecasts come from deterministic, decimal-safe code. AI interprets and recommends; it never produces authoritative figures.'],
  ['Human approval on anything that matters', 'Matches, reminders and recommended actions wait for an authorised person. AI cannot move money, change invoices, forgive debt or contact customers.'],
  ['Role-based access', 'Eight roles from Owner to Executive Viewer, enforced in the database with row-level security as well as in the application.'],
  ['Organization isolation', 'Every record belongs to one organization. Users only ever see organizations they are members of.'],
  ['Audit logging', 'Imports, approvals, rejections, role changes and AI runs are recorded with who and when.'],
  ['Works without AI', 'If the AI service is unavailable, imports, receivables, reconciliation, reports and manual workflows keep working.'],
];
const PERSONAS = [['CFO / Finance Director', 'One trustworthy view of cash exposure across the business, with a defensible trail behind every figure.'], ['Finance Controller', 'Faster close: reconciliation proposals ready for review, discrepancies already explained.'], ['AR / Credit Control', 'A ranked worklist, ready-to-approve reminders and a clear history for every account.'], ['Accountants & firms', 'Give each client a clear receivables and cash picture without rebuilding spreadsheets.'], ['Multi-branch groups', 'Consolidated and per-unit reporting with permissions that keep teams in their lane.']];
const STEPS = [['1', 'Import', 'Upload CSV, XLSX or PDF. Map columns, validate every row, preview, then confirm. Rejected and flagged rows are always shown, never silently dropped.'], ['2', 'Understand', 'Receivables, aging, payment behaviour and priorities are calculated instantly from your records.'], ['3', 'Reconcile & act', 'Review suggested matches, approve reminders and recommended actions with the evidence beside each.'], ['4', 'Forecast & report', 'Run scenarios, ask questions in plain language, and generate management reports in a click.']];
const SOON = ['QuickBooks', 'Xero', 'Stripe', 'Paystack', 'Flutterwave', 'Bank feeds'];
const MATRIX: [string, boolean, boolean, boolean][] = [['Receivables, invoices & payments', true, true, true], ['Reconciliation review queue', true, true, true], ['Cash-flow scenarios', true, true, true], ['Collections & AI reminder drafts', true, true, true], ['Ask Incomio & AI agents', true, true, true], ['Profitability & business units', true, true, true], ['Reports with CSV / print-to-PDF', true, true, true], ['Role-based team access', true, true, true]];
const FAQ = [
  ['Does Incomio move money or contact my customers?', 'No. It analyses, recommends and drafts. It cannot initiate payments, change bank records or send customer messages, and every consequential action needs human approval.'],
  ['How is this different from asking a general AI chatbot?', 'A chatbot guesses. Incomio calculates every figure in code from your records, then uses AI only to explain and recommend. Answers cite the invoices and customers behind them, and it says so when data is missing.'],
  ['What does "every figure is traceable" mean?', 'You can click from a dashboard total to the customer, the invoice, the confirmed payments and the original uploaded file that produced it.'],
  ['What data can I import?', 'CSV and XLSX for customers, invoices, payments, bank exports, expenses, supplier obligations and business units, plus PDF or image invoices and receipts, which are extracted for your review before saving.'],
  ['Does it handle multiple currencies?', 'Yes. Currencies are stored explicitly and never combined into a single total without a recorded conversion rate.'],
  ['Can I trust the forecast?', 'Forecasts are estimates from stated assumptions and your payment history, never guaranteed balances. Confidence and assumptions are shown beside each one.'],
  ['Which integrations are available?', 'File upload is live today. QuickBooks, Xero, Stripe, Paystack, Flutterwave and bank feeds are on the roadmap and are labelled Coming Soon rather than faked.'],
  ['Is Incomio a bank or an accounting system?', 'No. It is analytical software that sits beside your accounting tools and is not a replacement for professional accounting advice.'],
  ['How is billing handled?', 'Plans are paid through a secure external payment page. Your subscription is activated once payment is confirmed.'],
];

function Wordmark() {
  return (
    <Link href="/" className="inline-flex items-center gap-2" aria-label="Incomio home">
      <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#FFB75A] text-lg font-extrabold text-[#FFB75A]">i</span>
      <span className="text-2xl font-bold tracking-wide">INCOMIO</span>
    </Link>
  );
}
const H2 = ({ k, children, sub }: { k?: string; children: React.ReactNode; sub?: string }) => (
  <div className="mb-10 max-w-3xl">{k && <p className={`mb-3 text-sm font-semibold uppercase tracking-widest ${A}`}>{k}</p>}<h2 className="text-3xl md:text-5xl">{children}</h2>{sub && <p className="mt-4 text-lg text-white/70">{sub}</p>}</div>
);
const Sec = ({ id, children, tone }: { id?: string; children: React.ReactNode; tone?: 'alt' }) => (
  <section id={id} className={tone === 'alt' ? 'border-y border-white/10 bg-[#0a0a0a]' : ''}><div className="mx-auto max-w-[1200px] px-4 py-20 md:py-28">{children}</div></section>
);

export default function Home() {
  return (
    <div className="dark-site min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-4 py-4">
          <Wordmark />
          <nav className="hidden gap-7 text-sm lg:flex" aria-label="Primary"><a href="#problem">Why Incomio</a><a href="#platform">Platform</a><a href="#traceability">Traceability</a><a href="#controls">Security</a><a href="#roi">ROI</a><a href="#pricing">Pricing</a><a href="#faq">FAQ</a></nav>
          <div className="flex gap-3"><Link href="/login" className="btn btn-outline px-5 py-2.5">Login</Link><Link href="/signup" className="btn btn-amber px-5 py-2.5">Create an account</Link></div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="coin floaty absolute left-4 top-10 hidden md:flex">$</div>
        <div className="coin floaty absolute right-8 top-28 hidden h-16 w-16 text-2xl md:flex" style={{ animationDelay: '1s' }}>$</div>
        <div className="mx-auto max-w-[1000px] px-4 pb-20 pt-20 text-center md:pt-28">
          <p className={`mb-5 text-sm font-semibold uppercase tracking-widest ${A}`}>Cash-flow &amp; receivables intelligence for finance teams</p>
          <h1 className="text-4xl leading-[1.1] md:text-6xl">AI platform for cash-flow intelligence, where every figure is traceable. <span className={A}>Fewer losses.</span></h1>
          <p className="mx-auto mt-7 max-w-2xl text-lg text-white/80">Incomio brings invoices, payments and receivables into one place. It reconciles income, ranks who to collect from, and forecasts cash, with AI that explains numbers your code calculated instead of inventing them.</p>
          <div className="mt-9 flex flex-wrap justify-center gap-4"><Link href="/signup" className="btn btn-amber px-8 py-4 text-base">Get Started</Link><a href="#platform" className="btn btn-outline px-8 py-4 text-base">Explore the platform</a></div>
          <ul className="mx-auto mt-12 flex max-w-3xl flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-white/60"><li>✓ Approval before any match is final</li><li>✓ Multi-currency, never mixed</li><li>✓ Role-based access &amp; audit trail</li><li>✓ Works without AI</li></ul>
        </div>
      </section>

      <Sec id="problem" tone="alt">
        <H2 k="The problem" sub="For most finance teams, income is not lost in one dramatic moment. It leaks away through small, repeated failures.">Late money, unclear numbers, and decisions made on <span className={A}>guesswork</span></H2>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{PAIN.map(([t, b]) => <article key={t} className="rounded-2xl border border-white/10 bg-black p-7"><div className="mb-4 h-1 w-10 rounded bg-[#FFB75A]" /><h3 className="text-xl">{t}</h3><p className="mt-3 text-sm leading-relaxed text-white/70">{b}</p></article>)}</div>
        <p className="mt-10 max-w-3xl text-lg text-white/80">The result: <span className={A}>slower collections, preventable cash crunches, month-end firefighting and reports leadership can&apos;t fully rely on.</span> Incomio is built to close each of these gaps.</p>
      </Sec>

      <Sec id="platform">
        <H2 k="The platform" sub="One shared financial data model. Five connected areas of intelligence, not five separate tools.">Everything between an invoice and <span className={A}>cash in the bank</span></H2>
        <div className="space-y-6">{PILLARS.map(([t, b, pts], i) => (
          <article key={t} className={`grid gap-8 rounded-3xl border border-white/10 p-8 md:grid-cols-2 md:p-10 ${i % 2 ? 'bg-[#0d0d0d]' : 'bg-[#120c04]'}`}>
            <div><div className={`mb-2 text-sm font-semibold ${A}`}>0{i + 1}</div><h3 className="text-2xl md:text-3xl">{t}</h3><p className="mt-4 text-white/75">{b}</p></div>
            <ul className="space-y-3 self-center">{pts.map((p) => <li key={p} className="flex gap-3 rounded-xl border border-white/10 bg-black/60 p-4 text-sm"><span className={A}>✓</span>{p}</li>)}</ul>
          </article>))}</div>
      </Sec>

      <Sec id="traceability" tone="alt">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div><H2 k="Traceability" sub="Click from any headline number down to the records, the reviewer and the original file that produced it. That is what makes a figure defensible in front of an auditor, a board or a bank.">Every figure has a <span className={A}>paper trail</span></H2>
            <Link href="/signup" className="btn btn-amber px-7 py-3">See it with your data</Link></div>
          <ol className="relative space-y-3" aria-label="Example drill-down (illustrative)">{TRACE.map(([a, b], i) => (
            <li key={a} className="flex items-center gap-4 rounded-xl border border-white/10 bg-black p-4" style={{ marginLeft: i * 14 }}><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFB75A] text-sm font-bold text-black">{i + 1}</span><div><div className="text-xs uppercase tracking-wide text-white/50">{a}</div><div className="text-sm">{b}</div></div></li>))}
            <li className="pl-2 text-xs text-white/40">Illustrative example, not real data.</li></ol>
        </div>
      </Sec>

      <Sec>
        <H2 k="The difference" sub="Same finance team. Less manual effort, more certainty.">Spreadsheets and chatbots vs. <span className={A}>Incomio</span></H2>
        <div className="overflow-x-auto rounded-2xl border border-white/10"><table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-[#111]"><tr><th className="p-4">Task</th><th className="p-4 text-white/60">The usual way</th><th className={`p-4 ${A}`}>With Incomio</th></tr></thead>
          <tbody className="divide-y divide-white/10">{COMPARE.map(([a, b, c]) => <tr key={a}><td className="p-4 font-semibold">{a}</td><td className="p-4 text-white/60">{b}</td><td className="p-4">{c}</td></tr>)}</tbody></table></div>
      </Sec>

      <Sec tone="alt">
        <H2 k="How it works" sub="From first upload to a finance-ready view of your income.">Live in <span className={A}>four steps</span></H2>
        <ol className="grid gap-5 md:grid-cols-4">{STEPS.map(([n, t, b]) => <li key={t} className="rounded-2xl border border-white/10 bg-black p-7"><div className={`text-5xl font-extrabold ${A}`}>{n}</div><h3 className="mt-3 text-xl">{t}</h3><p className="mt-2 text-sm text-white/70">{b}</p></li>)}</ol>
      </Sec>

      <Sec id="agents">
        <div className="grid gap-12 md:grid-cols-2">
          <div><H2 k="AI agents & Ask Incomio" sub="Seven specialised agents analyse your calculated figures and surface what needs attention. Ask Incomio answers questions in plain language, cites its sources, and says so when your data can&apos;t answer.">An analyst that <span className={A}>never guesses</span></H2>
            <ul className="space-y-2 text-sm text-white/80"><li>• &quot;Which invoices should we follow up on today?&quot;</li><li>• &quot;Why is our receivable balance increasing?&quot;</li><li>• &quot;What is our expected cash position over the next 30 days?&quot;</li><li>• &quot;Prepare a financial summary for management.&quot;</li></ul></div>
          <div className="grid grid-cols-2 gap-3 self-center">{AGENTS.map((a) => <div key={a} className="rounded-xl border border-white/10 bg-[#0d0d0d] p-4 text-sm"><span className={`mr-2 ${A}`}>●</span>{a}</div>)}
            <div className="col-span-2 rounded-xl border border-[#FFB75A]/40 bg-[#120c04] p-4 text-sm text-white/80">Agents can analyse, recommend and draft. They cannot transfer money, alter invoices, forgive debt or contact customers.</div></div>
        </div>
      </Sec>

      <Sec id="controls" tone="alt">
        <H2 k="Security & controls" sub="Built for teams where accuracy and accountability are not optional.">Control and <span className={A}>accountability</span> by design</H2>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{CONTROLS.map(([t, b]) => <article key={t} className="rounded-2xl border border-white/10 bg-black p-7"><h3 className="text-lg">{t}</h3><p className="mt-2 text-sm text-white/70">{b}</p></article>)}</div>
      </Sec>

      <Sec>
        <H2 k="Who it's for" sub="Designed around the people who own cash, collections and reporting.">Every seat in the <span className={A}>finance function</span></H2>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-5">{PERSONAS.map(([t, b]) => <div key={t} className="rounded-2xl bg-[#FFB75A] p-6 text-black"><h3 className="text-lg">{t}</h3><p className="mt-2 text-sm text-black/80">{b}</p></div>)}</div>
      </Sec>

      <Sec id="roi" tone="alt">
        <H2 k="What's at stake" sub="Enter your own numbers to see how much cash and time is tied up in overdue receivables and manual matching.">Put a number on the <span className={A}>cost of waiting</span></H2>
        <RoiCalc />
      </Sec>

      <Sec>
        <H2 k="Integrations" sub="Upload files today; connect your systems as integrations ship. We label what isn't built yet, so you never rely on a connection that isn't real.">Works with the data you <span className={A}>already have</span></H2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-xl border border-[#FFB75A] p-4 text-sm"><b>CSV / XLSX / PDF upload</b><div className={`mt-1 text-xs ${A}`}>Available now</div></div>{SOON.map((s) => <div key={s} className="rounded-xl border border-white/10 p-4 text-sm"><b>{s}</b><div className="mt-1 text-xs text-white/50">Coming soon</div></div>)}</div>
      </Sec>

      <Sec id="pricing" tone="alt">
        <div className="text-center"><H2 k="Pricing" sub="Simple monthly plans. Start with what you need and move up as your team grows.">Straightforward <span className={A}>monthly pricing</span></H2></div>
        <div className="grid gap-6 md:grid-cols-3">{PLAN_KEYS.map((k, i) => (
          <div key={k} className={`rounded-2xl border p-8 ${i === 1 ? 'border-[#FFB75A] bg-[#140d03]' : 'border-white/10 bg-black'}`}>
            {i === 1 && <div className={`mb-2 text-xs font-bold uppercase tracking-widest ${A}`}>Most popular</div>}
            <h3 className="text-2xl">{PLANS[k].name}</h3>
            <div className={`num mt-2 text-5xl font-extrabold ${A}`}>${PLANS[k].price}<span className="text-base font-medium text-white/60">/month</span></div>
            <p className="mt-3 text-sm text-white/70">{PLANS[k].blurb}</p>
            <Link href="/signup" className={`btn mt-6 w-full py-3 ${i === 1 ? 'btn-amber' : 'btn-outline'}`}>Get Started</Link>
          </div>))}</div>
        <div className="mt-10 overflow-x-auto rounded-2xl border border-white/10"><table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-[#111]"><tr><th className="p-4">Included</th>{PLAN_KEYS.map((k) => <th key={k} className="p-4 text-center">{PLANS[k].name}</th>)}</tr></thead>
          <tbody className="divide-y divide-white/10">{MATRIX.map(([f, a, b, c]) => <tr key={f}><td className="p-4">{f}</td>{[a, b, c].map((x, i) => <td key={i} className={`p-4 text-center ${A}`}>{x ? '✓' : '—'}</td>)}</tr>)}</tbody></table></div>
        <p className="mt-4 text-xs text-white/50">Usage limits for AI operations per plan are being finalised; features listed are available on every plan.</p>
      </Sec>

      <Sec id="faq">
        <div className="mx-auto max-w-3xl"><H2 k="FAQ">Questions finance leaders <span className={A}>ask first</span></H2>
          <div className="divide-y divide-white/10 rounded-2xl border border-white/10">{FAQ.map(([q, a]) => <details key={q} className="p-5"><summary className="cursor-pointer font-semibold">{q}</summary><p className="mt-3 text-sm leading-relaxed text-white/70">{a}</p></details>)}</div></div>
      </Sec>

      <section className="mx-auto max-w-[1200px] px-4 pb-24"><div className="rounded-3xl bg-[#FFB75A] px-6 py-16 text-center text-black">
        <h2 className="mx-auto max-w-3xl text-3xl md:text-5xl">Every payment understood. Every receivable accounted for.</h2>
        <p className="mx-auto mt-3 max-w-xl text-black/75">Every financial decision better informed. Import your first file and see where your cash really stands.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-4"><Link href="/signup" className="btn bg-black px-8 py-4 text-white hover:bg-[#222]">Get Started</Link><a href="#pricing" className="btn border-2 border-black px-8 py-4">View pricing</a></div></div></section>

      <footer className="border-t border-white/10"><div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-14 md:grid-cols-4">
        <div className="md:col-span-2"><Wordmark /><p className="mt-4 max-w-sm text-sm text-white/60">AI-native cash-flow and receivables intelligence. Analytical software: not a bank, a regulated financial institution, or accounting advice.</p></div>
        <div><h3 className="mb-3 text-sm uppercase tracking-wide text-white/50">Product</h3><ul className="space-y-2 text-sm"><li><a href="#platform">Platform</a></li><li><a href="#traceability">Traceability</a></li><li><a href="#agents">AI agents</a></li><li><a href="#pricing">Pricing</a></li></ul></div>
        <div><h3 className="mb-3 text-sm uppercase tracking-wide text-white/50">Account</h3><ul className="space-y-2 text-sm"><li><Link href="/login">Login</Link></li><li><Link href="/signup">Create an account</Link></li><li><a href="#faq">FAQ</a></li></ul></div>
        <p className="border-t border-white/10 pt-6 text-xs text-white/40 md:col-span-4">© {new Date().getFullYear()} Incomio. All rights reserved.</p></div></footer>
    </div>
  );
}
