import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Caskfolio',
  description: 'Whisky asset platform'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <div className="shell nav-wrap">
            <Link href="/" className="logo">
              Caskfolio
            </Link>
            <nav>
              <Link href="/feed">Feed</Link>
              <Link href="/portfolio">Portfolio</Link>
              <Link href="/assets">Assets</Link>
              <Link href="/admin">Admin</Link>
            </nav>
          </div>
        </header>
        <main className="shell">{children}</main>
      </body>
    </html>
  );
}
