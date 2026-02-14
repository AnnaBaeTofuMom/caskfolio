'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api';

type Summary = {
  totalEstimatedValue: number;
  totalPurchaseValue: number;
  unrealizedPnL: number;
  assetCount: number;
};

type ChartPoint = { date: string; value: number };

export default function PortfolioPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [chart, setChart] = useState<ChartPoint[]>([]);

  useEffect(() => {
    const token = window.localStorage.getItem('caskfolio_access_token');
    const userEmail = window.localStorage.getItem('caskfolio_user_email') ?? 'demo@caskfolio.com';

    if (!token) {
      setIsAuthenticated(false);
      setLoading(false);
      return;
    }

    setIsAuthenticated(true);
    Promise.all([
      fetch(`${API_BASE}/portfolio/me/summary`, {
        headers: { 'x-user-email': userEmail }
      }),
      fetch(`${API_BASE}/portfolio/me/chart`, {
        headers: { 'x-user-email': userEmail }
      })
    ])
      .then(async ([summaryRes, chartRes]) => {
        if (!summaryRes.ok || !chartRes.ok) return;
        const summaryData = (await summaryRes.json()) as Summary;
        const chartData = (await chartRes.json()) as ChartPoint[];
        setSummary(summaryData);
        setChart(chartData);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section>
        <h1>My Portfolio</h1>
        <p className="sub">Loading...</p>
      </section>
    );
  }

  if (!isAuthenticated) {
    const demo = {
      totalEstimatedValue: 8720000,
      totalPurchaseValue: 7500000,
      unrealizedPnL: 1220000,
      assetCount: 18
    };
    const demoStats = [
      { label: 'Total Estimated Value', value: `${demo.totalEstimatedValue.toLocaleString()} KRW` },
      { label: 'Total Purchase Value', value: `${demo.totalPurchaseValue.toLocaleString()} KRW` },
      { label: 'Unrealized Gain/Loss', value: `+${demo.unrealizedPnL.toLocaleString()} KRW` },
      { label: 'Asset Count', value: demo.assetCount.toLocaleString() }
    ];

    return (
      <section>
        <h1>Portfolio Preview</h1>
        <p className="sub">Sign in to track your real portfolio. Below is a sample preview.</p>
        <div className="metrics">
          {demoStats.map((stat) => (
            <article key={stat.label} className="card metric">
              <p>{stat.label}</p>
              <strong>{stat.value}</strong>
            </article>
          ))}
        </div>
        <article className="card chart">
          <h2>Portfolio Growth (Sample)</h2>
          <p>2025-09: 6,900,000 / 2025-10: 7,100,000 / 2025-11: 7,350,000 / 2025-12: 7,620,000 / 2026-01: 8,050,000 / 2026-02: 8,720,000</p>
        </article>
        <article className="card" style={{ marginTop: 16 }}>
          <h2>Create Your Own Portfolio</h2>
          <p className="sub">Join Caskfolio and start registering your whisky assets.</p>
          <div className="actions">
            <Link className="btn primary" href="/auth/login">
              Sign Up / Login
            </Link>
            <Link className="btn ghost" href="/assets">
              View Asset Flow
            </Link>
          </div>
        </article>
      </section>
    );
  }

  const safeSummary = summary ?? {
    totalEstimatedValue: 0,
    totalPurchaseValue: 0,
    unrealizedPnL: 0,
    assetCount: 0
  };

  const stats = [
    { label: 'Total Estimated Value', value: `${safeSummary.totalEstimatedValue.toLocaleString()} KRW` },
    { label: 'Total Purchase Value', value: `${safeSummary.totalPurchaseValue.toLocaleString()} KRW` },
    {
      label: 'Unrealized Gain/Loss',
      value: `${safeSummary.unrealizedPnL > 0 ? '+' : ''}${safeSummary.unrealizedPnL.toLocaleString()} KRW`
    },
    { label: 'Asset Count', value: safeSummary.assetCount.toLocaleString() }
  ];

  return (
    <section>
      <h1>My Portfolio</h1>
      <div className="metrics">
        {stats.map((stat) => (
          <article key={stat.label} className="card metric">
            <p>{stat.label}</p>
            <strong>{stat.value}</strong>
          </article>
        ))}
      </div>
      <article className="card chart">
        <h2>Portfolio Growth</h2>
        <p>{chart.length ? chart.map((row) => `${row.date}: ${row.value.toLocaleString()}`).join(' / ') : 'No chart data yet.'}</p>
      </article>
    </section>
  );
}
