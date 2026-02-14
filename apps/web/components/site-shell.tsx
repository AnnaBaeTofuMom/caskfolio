'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Route } from 'next';
import { AUTH_STATE_CHANGED_EVENT, clearAuthState, readAuthContext } from '../lib/auth-state';
import { ApiProgressIndicator } from './api-progress-indicator';

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    function refreshAuthState() {
      const storage = window.localStorage;
      const rawToken = storage.getItem('caskfolio_access_token');
      const auth = readAuthContext(storage);
      if (rawToken && !auth) {
        clearAuthState(storage);
      }
      setIsAuthenticated(Boolean(auth?.token));
      setIsAdmin(auth?.role === 'ADMIN');
    }

    refreshAuthState();
    window.addEventListener(AUTH_STATE_CHANGED_EVENT, refreshAuthState);
    window.addEventListener('storage', refreshAuthState);
    return () => {
      window.removeEventListener(AUTH_STATE_CHANGED_EVENT, refreshAuthState);
      window.removeEventListener('storage', refreshAuthState);
    };
  }, []);

  const isPortfolioLockScreen = pathname === '/portfolio' && !isAuthenticated;

  return (
    <>
      <ApiProgressIndicator />
      <header className="topbar">
        <div className="shell nav-wrap">
          <Link href="/" className="logo">
            Caskfolio
          </Link>
          <nav>
            {isPortfolioLockScreen ? (
              <span className="sub">Session expired</span>
            ) : (
              <>
                <Link href="/">Home</Link>
                <Link href="/feed">Feed</Link>
                {isAuthenticated ? <Link href="/portfolio">My Assets</Link> : null}
                {isAuthenticated && isAdmin ? <Link href={'/backoffice' as Route}>Admin</Link> : null}
                {isAuthenticated ? (
                  <button
                    className="btn ghost"
                    type="button"
                    onClick={() => {
                      clearAuthState(window.localStorage);
                      window.dispatchEvent(new Event(AUTH_STATE_CHANGED_EVENT));
                      window.location.href = '/';
                    }}
                  >
                    Logout
                  </button>
                ) : (
                  <Link href="/login">Login</Link>
                )}
              </>
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
