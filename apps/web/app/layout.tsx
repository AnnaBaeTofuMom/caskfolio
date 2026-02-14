import './globals.css';
import type { Metadata } from 'next';
import { SiteShell } from '../components/site-shell';

export const metadata: Metadata = {
  title: 'Caskfolio',
  description: 'Whisky asset platform'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
