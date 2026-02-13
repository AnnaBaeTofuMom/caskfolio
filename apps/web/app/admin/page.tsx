const metrics = [
  ['Total Users', '1,520'],
  ['Active Users', '684'],
  ['Total Registered Assets', '5,830'],
  ['Total AUM', '4,120,000,000 KRW']
];

export default function AdminPage() {
  return (
    <section>
      <h1>Admin Dashboard</h1>
      <div className="metrics">
        {metrics.map(([label, value]) => (
          <article key={label} className="card metric">
            <p>{label}</p>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
