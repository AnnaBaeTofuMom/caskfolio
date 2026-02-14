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
    </section>
  );
}
