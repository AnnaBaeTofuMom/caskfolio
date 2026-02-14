'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AdminOpsPanel } from '../../components/admin/admin-ops-panel';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api-proxy';

type Metrics = {
  totalUsers: number;
  activeUsers: number;
  totalRegisteredAssets: number;
  totalAum: number;
};

type Holder = { userId: string; username: string; name: string; aum: number };
type AdminUser = { id: string; email: string; name: string; username: string; role: 'USER' | 'ADMIN' };

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [metrics, setMetrics] = useState<Metrics>({
    totalUsers: 0,
    activeUsers: 0,
    totalRegisteredAssets: 0,
    totalAum: 0
  });
  const [holders, setHolders] = useState<Holder[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);

  useEffect(() => {
    const token = window.localStorage.getItem('caskfolio_access_token');
    if (!token) {
      setLoading(false);
      return;
    }

    Promise.all([
      fetch(`${API_BASE}/admin/metrics`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_BASE}/admin/top-holders`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_BASE}/admin/users`, { headers: { Authorization: `Bearer ${token}` } })
    ])
      .then(async ([metricsRes, holdersRes, usersRes]) => {
        if (!metricsRes.ok || !holdersRes.ok || !usersRes.ok) {
          setAuthorized(false);
          return;
        }

        setAuthorized(true);
        setMetrics((await metricsRes.json()) as Metrics);
        setHolders((await holdersRes.json()) as Holder[]);
        setUsers((await usersRes.json()) as AdminUser[]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="sub">Loading admin dashboard...</p>;
  }

  if (!authorized) {
    return (
      <section className="center-card">
        <article className="card">
          <h1>Admin Access Required</h1>
          <p className="sub">Sign in with an admin account to access this page.</p>
          <Link className="btn primary" href="/login">
            Go to Login
          </Link>
        </article>
      </section>
    );
  }

  const cards = [
    ['Total Users', metrics.totalUsers.toLocaleString()],
    ['Active Users', metrics.activeUsers.toLocaleString()],
    ['Total Assets', metrics.totalRegisteredAssets.toLocaleString()],
    ['Platform Value', `${metrics.totalAum.toLocaleString()} KRW`]
  ];

  return (
    <section>
      <h1>Admin Dashboard</h1>
      <p className="sub">Platform management and analytics</p>
      <div className="metrics">
        {cards.map(([label, value]) => (
          <article key={label} className="card metric">
            <p>{label}</p>
            <strong>{value}</strong>
          </article>
        ))}
      </div>

      <article className="card">
        <h2>Top Holders by Value</h2>
        {holders.length ? (
          <ul>
            {holders.map((holder, index) => (
              <li key={holder.userId}>
                #{index + 1} @{holder.username} ({holder.name}) - {holder.aum.toLocaleString()} KRW
              </li>
            ))}
          </ul>
        ) : (
          <p>No holder data yet.</p>
        )}
      </article>

      <div style={{ height: 12 }} />
      <AdminOpsPanel users={users} />
    </section>
  );
}
