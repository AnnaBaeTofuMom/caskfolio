'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { MyAssetsPanel } from '../../components/assets/my-assets-panel';

export default function AssetsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setIsAuthenticated(Boolean(window.localStorage.getItem('caskfolio_access_token')));
  }, []);

  if (!isAuthenticated) {
    return (
      <section className="center-card">
        <article className="card">
          <h1>Login Required</h1>
          <p className="sub">Please sign in to view and manage your assets.</p>
          <Link className="btn primary" href="/auth/login">
            Sign In
          </Link>
        </article>
      </section>
    );
  }

  return (
    <section>
      <div className="assets-panel-head">
        <div>
          <h1>My Assets</h1>
          <p className="sub">Manage your whisky collection</p>
        </div>
        <Link className="btn primary" href="/assets/register">
          Register Asset
        </Link>
      </div>
      <MyAssetsPanel />
    </section>
  );
}
