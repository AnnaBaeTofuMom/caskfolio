import { safeFetch } from '../../lib/api';

export const dynamic = 'force-dynamic';

export default async function PortfolioPage() {
  const summary =
    (await safeFetch<{
      totalEstimatedValue: number;
      totalPurchaseValue: number;
      unrealizedPnL: number;
      assetCount: number;
    }>('/portfolio/me/summary', { headers: { 'x-user-email': 'demo@caskfolio.com' } })) ??
    {
      totalEstimatedValue: 8720000,
      totalPurchaseValue: 7500000,
      unrealizedPnL: 1220000,
      assetCount: 18
    };

  const chart =
    (await safeFetch<Array<{ date: string; value: number }>>('/portfolio/me/chart', {
      headers: { 'x-user-email': 'demo@caskfolio.com' }
    })) ?? [];

  const stats = [
    { label: 'Total Estimated Value', value: `${summary.totalEstimatedValue.toLocaleString()} KRW` },
    { label: 'Total Purchase Value', value: `${summary.totalPurchaseValue.toLocaleString()} KRW` },
    {
      label: 'Unrealized Gain/Loss',
      value: `${summary.unrealizedPnL > 0 ? '+' : ''}${summary.unrealizedPnL.toLocaleString()} KRW`
    },
    { label: 'Asset Count', value: summary.assetCount.toLocaleString() }
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
