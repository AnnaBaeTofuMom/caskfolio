'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export function SiteShell({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setIsAuthenticated(Boolean(window.localStorage.getItem('caskfolio_access_token')));
  }, []);

  return (
    <>
      <header className="topbar">
        <div className="shell nav-wrap">
          <Link href="/" className="logo">
            Caskfolio
          </Link>
          <nav>
            <Link href="/">Home</Link>
            <Link href="/feed">Feed</Link>
            {isAuthenticated ? <Link href="/portfolio">Portfolio</Link> : null}
            {isAuthenticated ? <Link href="/assets">Assets</Link> : null}
            {isAuthenticated ? <Link href="/admin">Admin</Link> : null}
            {isAuthenticated ? (
              <button
                className="btn ghost"
                type="button"
                onClick={() => {
                  window.localStorage.removeItem('caskfolio_access_token');
                  window.localStorage.removeItem('caskfolio_refresh_token');
                  window.localStorage.removeItem('caskfolio_user_email');
                  window.location.href = '/';
                }}
              >
                Logout
              </button>
            ) : (
              <Link href="/auth/login">Login</Link>
            )}
          </nav>
        </div>
      </header>
      <main className="shell">{children}</main>
      <footer className="footer">
        <div className="shell">
          <p>&copy; 2026 Caskfolio. Premium whisky asset management.</p>
        </div>
      </footer>
    </>
  );
}
