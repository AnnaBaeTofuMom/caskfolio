const stats = [
  { label: 'Total Estimated Value', value: '8,720,000 KRW' },
  { label: 'Total Purchase Value', value: '7,500,000 KRW' },
  { label: 'Unrealized Gain/Loss', value: '+1,220,000 KRW' },
  { label: 'Asset Count', value: '18' }
];

export default function PortfolioPage() {
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
        <p>Chart placeholder for historical portfolio line graph.</p>
      </article>
    </section>
  );
}
