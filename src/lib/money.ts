import Decimal from 'decimal.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export const D = (v: Decimal.Value | null | undefined) => new Decimal(v ?? 0);

/** Parse user-entered money text ("$1,234.50", "(500)", "1.234,50" is NOT guessed). Returns null when invalid. */
export function parseMoney(raw: unknown): Decimal | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? new Decimal(raw) : null;
  let s = String(raw).trim();
  if (!s) return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  s = s.replace(/[A-Za-z$€£¥₦\s]/g, '').replace(/,/g, '');
  if (s.startsWith('-')) { neg = !neg; s = s.slice(1); }
  if (!/^\d*\.?\d+$/.test(s)) return null;
  const d = new Decimal(s);
  return neg ? d.neg() : d;
}

export const toDb = (d: Decimal) => d.toDecimalPlaces(2).toFixed(2);

export function fmtMoney(v: Decimal.Value | null | undefined, currency: string) {
  const d = D(v).toDecimalPlaces(2);
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(d.toNumber());
  } catch {
    return `${currency} ${d.toFixed(2)}`;
  }
}

export const sum = (xs: Decimal.Value[]) => xs.reduce<Decimal>((a, b) => a.plus(b), new Decimal(0));
