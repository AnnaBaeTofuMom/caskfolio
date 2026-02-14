import { safeFetch } from '../../lib/api';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const metrics =
    (await safeFetch<{
      totalUsers: number;
      activeUsers: number;
      totalRegisteredAssets: number;
      totalAum: number;
    }>('/admin/metrics')) ?? {
      totalUsers: 0,
      activeUsers: 0,
      totalRegisteredAssets: 0,
      totalAum: 0
    };

  const topHolders =
    (await safeFetch<Array<{ userId: string; username: string; name: string; aum: number }>>('/admin/top-holders')) ?? [];

  const cards = [
    ['Total Users', metrics.totalUsers.toLocaleString()],
    ['Active Users', metrics.activeUsers.toLocaleString()],
    ['Total Registered Assets', metrics.totalRegisteredAssets.toLocaleString()],
    ['Total AUM', `${metrics.totalAum.toLocaleString()} KRW`]
  ];

  return (
    <section>
      <h1>Admin Dashboard</h1>
      <div className="metrics">
        {cards.map(([label, value]) => (
          <article key={label} className="card metric">
            <p>{label}</p>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <article className="card">
        <h2>Top Holders</h2>
        {topHolders.length ? (
          <ul>
            {topHolders.map((holder) => (
              <li key={holder.userId}>
                @{holder.username} ({holder.name}) - {holder.aum.toLocaleString()} KRW
              </li>
            ))}
          </ul>
        ) : (
          <p>No holder data yet.</p>
        )}
      </article>
    </section>
  );
}
