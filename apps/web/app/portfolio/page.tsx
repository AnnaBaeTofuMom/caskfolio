'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
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
      router.push('/login');
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

  if (!isAuthenticated) return null;

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
    <section className="portfolio-wrap">
      <div className="portfolio-head">
        <div>
          <h1>Portfolio Dashboard</h1>
          <p className="sub">Track your whisky collection's performance</p>
        </div>
        <Link className="btn primary" href="/assets/register">
          Add Asset
        </Link>
      </div>
      <div className="metrics">
        {stats.map((stat) => (
          <article key={stat.label} className="card metric">
            <p>{stat.label}</p>
            <strong>{stat.value}</strong>
          </article>
        ))}
      </div>
      <article className="card chart portfolio-chart">
        <h2>Portfolio Growth</h2>
        <p>{chart.length ? chart.map((row) => `${row.date}: ${row.value.toLocaleString()}`).join(' / ') : 'No chart data yet.'}</p>
      </article>
      <div className="grid">
        <Link href="/assets" className="card">
          <h3>Manage Assets</h3>
          <p className="sub">View and edit your collection</p>
        </Link>
        <Link href="/feed" className="card">
          <h3>Explore Feed</h3>
          <p className="sub">See what others are collecting</p>
        </Link>
      </div>
    </section>
  );
}
