'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AUTH_STATE_CHANGED_EVENT, clearAuthState, readAuthContext } from '../../lib/auth-state';
import { MyAssetsPanel } from '../../components/assets/my-assets-panel';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api-proxy';

type Summary = {
  totalEstimatedValue: number;
  totalPurchaseValue: number;
  unrealizedPnL: number;
  assetCount: number;
};

type ChartPoint = { date: string; value: number };
type NotificationItem = {
  id: string;
  type: string;
  message: string;
  assetId?: string;
  createdAt: string;
  read: boolean;
  actor?: { id: string; username: string; name: string };
};

export default function PortfolioPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [currentEmail, setCurrentEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [chart, setChart] = useState<ChartPoint[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    const storage = window.localStorage;
    const rawToken = storage.getItem('caskfolio_access_token');
    const auth = readAuthContext(storage);
    const token = auth?.token;
    const userEmail = auth?.email;
    const expired = Boolean(rawToken) && !auth;

    if (expired) {
      clearAuthState(storage);
      window.dispatchEvent(new Event(AUTH_STATE_CHANGED_EVENT));
    }

    if (!token || !userEmail) {
      setIsAuthenticated(false);
      setSessionExpired(expired);
      setCurrentEmail('');
      setLoading(false);
      return;
    }

    setIsAuthenticated(true);
    setCurrentEmail(userEmail);
    Promise.all([
      fetch(`${API_BASE}/portfolio/me/summary`, {
        headers: { 'x-user-email': userEmail }
      }),
      fetch(`${API_BASE}/portfolio/me/chart`, {
        headers: { 'x-user-email': userEmail }
      }),
      fetch(`${API_BASE}/social/notifications`, {
        headers: { 'x-user-email': userEmail }
      })
    ])
      .then(async ([summaryRes, chartRes, notificationsRes]) => {
        if (!summaryRes.ok || !chartRes.ok || !notificationsRes.ok) {
          setLoadFailed(true);
          return;
        }
        const summaryData = (await summaryRes.json()) as Summary;
        const chartData = (await chartRes.json()) as ChartPoint[];
        const notificationsData = (await notificationsRes.json()) as NotificationItem[];
        setSummary(summaryData);
        setChart(chartData);
        setNotifications(notificationsData);
      })
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      const timer = window.setTimeout(() => {
        router.replace('/login?reason=session_expired');
      }, 1400);
      return () => window.clearTimeout(timer);
    }
    return;
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <section>
        <h1>My Portfolio</h1>
        <p className="sub">Loading...</p>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section className="portfolio-wrap">
        <article className="card" style={{ minHeight: 260, textAlign: 'center', display: 'grid', gap: 10, placeItems: 'center' }}>
          <h1 style={{ marginBottom: 8 }}>Portfolio Dashboard</h1>
          <p className="sub">
            {sessionExpired
              ? '세션이 종료되어 자동으로 로그아웃되었습니다. 로그인 화면으로 이동합니다.'
              : '로그인이 필요합니다. 로그인 화면으로 이동합니다.'}
          </p>
        </article>
      </section>
    );
  }

  if (loadFailed || !summary) {
    return (
      <section className="portfolio-wrap">
        <div className="portfolio-head">
          <div>
            <h1>Portfolio Dashboard</h1>
            <p className="sub">포트폴리오 데이터를 불러오지 못했습니다.</p>
          </div>
          <Link className="btn primary" href="/assets/register">
            Add Asset
          </Link>
        </div>
        <article className="card">
          <p className="sub">잠시 후 다시 시도해주세요. 문제가 계속되면 API 서버 상태를 확인해주세요.</p>
        </article>
      </section>
    );
  }

  const stats = [
    { label: 'Total Estimated Value', value: `${summary.totalEstimatedValue.toLocaleString()} KRW` },
    { label: 'Total Purchase Value', value: `${summary.totalPurchaseValue.toLocaleString()} KRW` },
    {
      label: 'Unrealized Gain/Loss',
      value: `${summary.unrealizedPnL > 0 ? '+' : ''}${summary.unrealizedPnL.toLocaleString()} KRW`
    },
    {
      label: 'Unrealized Gain/Loss %',
      value:
        summary.totalPurchaseValue > 0
          ? `${summary.unrealizedPnL >= 0 ? '+' : ''}${((summary.unrealizedPnL / summary.totalPurchaseValue) * 100).toFixed(1)}%`
          : '0.0%'
    },
    { label: 'Asset Count', value: summary.assetCount.toLocaleString() }
  ];

  return (
    <section className="portfolio-wrap">
      <div className="portfolio-head">
        <div>
          <h1>Portfolio Dashboard</h1>
          <p className="sub">Track your whisky collection's performance</p>
          {currentEmail ? <p className="sub">Signed in as: {currentEmail}</p> : null}
        </div>
        <Link className="btn primary" href="/assets/register">
          Add Asset
        </Link>
      </div>
      <div className="metrics portfolio-metrics">
        {stats.map((stat) => (
          <article key={stat.label} className="card metric portfolio-metric-card">
            <p>{stat.label}</p>
            <strong>{stat.value}</strong>
          </article>
        ))}
      </div>
      <article className="card chart portfolio-chart">
        <h2>Portfolio Growth</h2>
        <PortfolioLineChart points={chart} />
      </article>
      <section style={{ marginTop: 20 }}>
        <div className="assets-panel-head">
          <div>
            <h2>My Assets</h2>
            <p className="sub">View and manage your registered assets</p>
          </div>
          <Link className="btn primary" href="/assets/register">
            Register Asset
          </Link>
        </div>
        <MyAssetsPanel />
      </section>
      <section style={{ marginTop: 20 }}>
        <div className="assets-panel-head">
          <div>
            <h2>Notification Center</h2>
            <p className="sub">Mentions and activity updates</p>
          </div>
        </div>
        <article className="card">
          {notifications.length ? (
            <div className="feed-comment-list">
              {notifications.map((notification) => (
                <p key={notification.id} style={{ margin: 0 }}>
                  <strong>{notification.actor ? `@${notification.actor.username}` : 'System'}</strong> {notification.message}
                </p>
              ))}
            </div>
          ) : (
            <p className="sub" style={{ margin: 0 }}>
              No notifications yet.
            </p>
          )}
        </article>
      </section>
    </section>
  );
}

function PortfolioLineChart({ points }: { points: ChartPoint[] }) {
  if (!points.length) {
    return <p>No chart data yet.</p>;
  }

  const width = 880;
  const height = 280;
  const padding = 24;
  const min = Math.min(...points.map((p) => p.value));
  const max = Math.max(...points.map((p) => p.value));
  const range = Math.max(max - min, 1);
  const stepX = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;

  const coords = points.map((point, index) => {
    const x = padding + stepX * index;
    const y = padding + ((max - point.value) / range) * (height - padding * 2);
    return { x, y, ...point };
  });

  const linePath = coords
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ');

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Portfolio value trend line chart" style={{ width: '100%', height: 'auto' }}>
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#dfd8cd" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#dfd8cd" />
        <path d={linePath} fill="none" stroke="#c6803f" strokeWidth="3" strokeLinecap="round" />
        {coords.map((point) => (
          <circle key={point.date} cx={point.x} cy={point.y} r="3.5" fill="#2f2b27" />
        ))}
      </svg>
      <div className="portfolio-chart-labels">
        <span>{points[0]?.date}</span>
        <span>{points[points.length - 1]?.date}</span>
      </div>
    </div>
  );
}
