'use client';
export function PrintButton() {
  return <button className="btn btn-primary print:hidden" onClick={() => window.print()}>Save as PDF / Print</button>;
}
