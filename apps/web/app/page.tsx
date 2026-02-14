import Link from 'next/link';
import { safeFetch } from '../lib/api';

type CollectorRank = {
  rank: number;
  userId: string;
  username: string;
  name: string;
  totalPurchase: number;
  totalValue: number;
  gainRate: number;
  assetCount: number;
};

export default async function HomePage() {
  const features = [
    {
      icon: 'verified_user',
      title: 'Trusted Valuation',
      description: 'Get accurate, real-time valuations for your whisky collection based on market data.'
    },
    {
      icon: 'bar_chart',
      title: 'Portfolio Tracking',
      description: "Monitor your collection's performance with detailed analytics and growth charts."
    },
    {
      icon: 'groups',
      title: 'Community',
      description: 'Connect with fellow collectors and share your passion for premium whisky.'
    },
    {
      icon: 'trending_up',
      title: 'Investment Insights',
      description: 'Track unrealized gains and make informed decisions about your collection.'
    }
  ];

  const ranking = (await safeFetch<CollectorRank[]>('/social/top-collectors?limit=5')) ?? [];

  return (
    <div className="home-page">
      <section className="home-band home-hero-band">
        <div className="home-container hero hero-large">
          <p className="eyebrow">Whisky Asset Platform</p>
          <h1>Manage Your Whisky Collection with Confidence</h1>
          <p className="sub">
            The premium platform for tracking, valuing, and sharing your whisky assets. Built for collectors who value clarity and trust.
          </p>
          <div className="actions home-actions">
            <Link href="/assets/register" className="btn primary">
              Register Your First Asset
            </Link>
            <Link href="/feed" className="btn ghost">
              Explore Collections
            </Link>
          </div>
        </div>
      </section>

      <section className="section-block home-container">
        <div className="section-head">
          <h2>Everything You Need</h2>
          <p className="sub">Powerful features designed for serious collectors</p>
        </div>
        <div className="grid home-features-grid">
          {features.map((feature) => (
            <article key={feature.title} className="card feature-card home-feature-card">
              <div className="home-feature-icon">
                <span className="material-symbols-outlined">{feature.icon}</span>
              </div>
              <h3>{feature.title}</h3>
              <p className="sub">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block home-container">
        <div className="section-head">
          <h2>Collector Ranking</h2>
          <p className="sub">Sorted by current collection value</p>
        </div>
        <div className="ranking-list">
          {!ranking.length ? <article className="card">No ranking data yet.</article> : null}
          {ranking.map((row) => (
            <Link key={row.userId} href={`/u/${row.username}`} className="card ranking-row">
              <div>
                <strong>#{row.rank}</strong> @{row.username}
                <p className="sub">{row.name}</p>
              </div>
              <div className="ranking-values">
                <p className="sub">총 구매가격</p>
                <strong>{row.totalPurchase.toLocaleString()} KRW</strong>
              </div>
              <div className="ranking-values">
                <p className="sub">현재 가치</p>
                <strong>{row.totalValue.toLocaleString()} KRW</strong>
              </div>
              <div className="ranking-values">
                <p className="sub">상승률</p>
                <strong>{row.gainRate > 0 ? '+' : ''}{row.gainRate.toFixed(1)}%</strong>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-band home-cta-band">
        <div className="home-container cta-band">
          <h2>Start Building Your Portfolio Today</h2>
          <p>Join collectors who trust Caskfolio to manage their whisky investments</p>
          <Link href="/login" className="btn ghost cta-band-btn">
            Get Started
          </Link>
        </div>
      </section>
    </div>
  );
}
