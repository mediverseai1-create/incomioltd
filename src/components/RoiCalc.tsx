'use client';
import { useState } from 'react';

const num = (v: string) => { const n = Number(v.replace(/,/g, '')); return Number.isFinite(n) && n >= 0 ? n : 0; };

/** Simple what-if. Inputs are the visitor's own; output is an illustration, not a promise. */
export function RoiCalc() {
  const [ar, setAr] = useState('250000'); const [overdue, setOverdue] = useState('20'); const [hours, setHours] = useState('30'); const [rate, setRate] = useState('25'); const [cut, setCut] = useState('10');
  const overdueAmt = num(ar) * Math.min(num(overdue), 100) / 100;
  const days = 30; // fixed illustrative window
  const freed = overdueAmt * Math.min(num(cut), 100) / 100;
  const hoursSaved = num(hours) * 0.4;
  const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const F = ({ id, label, v, set, suffix }: { id: string; label: string; v: string; set: (s: string) => void; suffix?: string }) => (
    <div><label htmlFor={id} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-white/60">{label}</label>
      <div className="flex items-center rounded-lg border border-white/15 bg-black px-3"><input id={id} inputMode="decimal" value={v} onChange={(e) => set(e.target.value)} className="w-full bg-transparent py-3 text-white outline-none" />{suffix && <span className="text-sm text-white/50">{suffix}</span>}</div></div>
  );
  return (
    <div className="grid gap-8 rounded-3xl border border-white/10 bg-[#0d0d0d] p-6 md:grid-cols-2 md:p-10">
      <div className="grid gap-4 sm:grid-cols-2">
        <F id="ar" label="Open receivables" v={ar} set={setAr} /><F id="od" label="Share overdue" v={overdue} set={setOverdue} suffix="%" />
        <F id="hr" label="Finance hours / month on chasing & matching" v={hours} set={setHours} /><F id="rt" label="Cost per hour" v={rate} set={setRate} />
        <F id="cut" label="Overdue balance you recover sooner" v={cut} set={setCut} suffix="%" />
      </div>
      <div className="flex flex-col justify-center rounded-2xl bg-[#FFB75A] p-6 text-black" aria-live="polite">
        <p className="text-sm font-semibold uppercase tracking-wide">Illustration of what is at stake</p>
        <p className="mt-2 text-4xl font-extrabold">{fmt(overdueAmt)}</p><p className="text-sm">currently overdue and tied up</p>
        <p className="mt-4 text-3xl font-extrabold">{fmt(freed)}</p><p className="text-sm">released sooner if {num(cut)}% of it is recovered within a {days}-day window</p>
        <p className="mt-4 text-3xl font-extrabold">{fmt(hoursSaved)} hrs <span className="text-lg">≈ {fmt(hoursSaved * num(rate))}/mo</span></p><p className="text-sm">of manual work, if 40% is removed by automated matching and prioritisation</p>
        <p className="mt-4 text-xs text-black/70">Based only on the numbers you typed and the assumptions shown. Not a forecast or a guarantee of results.</p>
      </div>
    </div>
  );
}
