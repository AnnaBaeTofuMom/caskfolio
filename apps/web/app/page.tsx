import Link from 'next/link';

export default function HomePage() {
  const features = [
    {
      title: 'Trusted Valuation',
      description: 'Get accurate, real-time valuations for your whisky collection based on market data.'
    },
    {
      title: 'Portfolio Tracking',
      description: "Monitor your collection's performance with detailed analytics and growth charts."
    },
    {
      title: 'Community',
      description: 'Connect with fellow collectors and share your passion for premium whisky.'
    },
    {
      title: 'Investment Insights',
      description: 'Track unrealized gains and make informed decisions about your collection.'
    }
  ];

  return (
    <div>
      <section className="hero hero-large">
        <p className="eyebrow">Whisky Asset Platform</p>
        <h1>Manage Your Whisky Collection with Confidence</h1>
        <p className="sub">
          The premium platform for tracking, valuing, and sharing your whisky assets. Built for collectors who value clarity and trust.
        </p>
        <div className="actions">
          <Link href="/assets/register" className="btn primary">
            Register Your First Asset
          </Link>
          <Link href="/feed" className="btn ghost">
            Explore Collections
          </Link>
        </div>
      </section>

      <section className="section-block">
        <div className="section-head">
          <h2>Everything You Need</h2>
          <p className="sub">Powerful features designed for serious collectors</p>
        </div>
        <div className="grid">
          {features.map((feature) => (
            <article key={feature.title} className="card feature-card">
              <h3>{feature.title}</h3>
              <p className="sub">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="cta-band">
        <h2>Start Building Your Portfolio Today</h2>
        <p>Join collectors who trust Caskfolio to manage their whisky investments</p>
        <Link href="/login" className="btn ghost cta-band-btn">
          Get Started
        </Link>
      </section>
    </div>
  );
}
