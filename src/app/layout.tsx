import type { Metadata } from 'next';
import './globals.css';

const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://incomiolimited.online';

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: 'Incomio — AI Income & Financial Operations Intelligence', template: '%s · Incomio' },
  description: 'Incomio brings invoices, payments and receivables together to help finance teams reconcile income, prioritise collections and understand future cash flow.',
  openGraph: { title: 'Incomio', description: 'Know what you are owed. Understand what is coming.', url: site, siteName: 'Incomio', type: 'website' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
