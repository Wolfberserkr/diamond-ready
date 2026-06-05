import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Competitor Intelligence Reports',
  description:
    'Monthly intelligence reports on your competitors: pricing, promotions, new services, and customer complaints.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
