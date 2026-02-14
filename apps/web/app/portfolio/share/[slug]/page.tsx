import { safeFetch } from '../../../../lib/api';

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamic = 'force-dynamic';

export default async function SharedPortfolioPage({ params }: Props) {
  const { slug } = await params;

  const data = await safeFetch<{
    found: boolean;
    owner?: { username: string; name: string };
    assets?: Array<{ id: string; name: string; trustedPrice: number | null }>;
  }>(`/portfolio/me/share/${slug}`);

  if (!data?.found) {
    return (
      <section>
        <h1>Shared Portfolio</h1>
        <p className="sub">Link not found or no longer available.</p>
      </section>
    );
  }

  return (
    <section>
      <h1>Shared Portfolio</h1>
      <p className="sub">
        @{data.owner?.username} · {data.owner?.name}
      </p>
      <div className="grid">
        {(data.assets ?? []).map((asset) => (
          <article key={asset.id} className="card">
            <h3>{asset.name}</h3>
            <p>{asset.trustedPrice ? `${asset.trustedPrice.toLocaleString()} KRW` : 'Price hidden'}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
