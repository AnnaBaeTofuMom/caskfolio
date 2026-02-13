import Link from 'next/link';

export default function HomePage() {
  return (
    <section className="hero">
      <p className="eyebrow">Whisky Asset Platform</p>
      <h1>Track bottles. Build conviction. Share your cask story.</h1>
      <p>
        Digital-first portfolio management for collectible whisky assets with trusted pricing and social discovery.
      </p>
      <div className="actions">
        <Link href="/feed" className="btn primary">
          Explore Feed
        </Link>
        <Link href="/portfolio" className="btn ghost">
          View Portfolio
        </Link>
      </div>
    </section>
  );
}
