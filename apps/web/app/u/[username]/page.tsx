import Link from 'next/link';
import { safeFetch } from '../../../lib/api';

interface Props {
  params: Promise<{ username: string }>;
}

type PublicProfile = {
  username: string;
  summary: { assetCount: number; publicAssets: number };
  assets: Array<{
    assetId: string;
    title: string;
    imageUrl?: string;
    caption?: string;
    trustedPrice: number | null;
  }>;
};

export default async function UserProfilePage({ params }: Props) {
  const { username } = await params;
  const profile =
    (await safeFetch<PublicProfile>(`/u/${encodeURIComponent(username)}`)) ??
    ({
      username,
      summary: { assetCount: 0, publicAssets: 0 },
      assets: []
    } as PublicProfile);

  const totalValue = profile.assets.reduce((sum, asset) => sum + (asset.trustedPrice ?? 0), 0);

  return (
    <section className="feed-wrap">
      <Link className="sub" href="/feed">
        ← Back to Feed
      </Link>

      <article className="card" style={{ marginTop: 12, marginBottom: 16 }}>
        <h1>@{profile.username}</h1>
        <p className="sub">Public whisky collection</p>
        <div className="actions" style={{ marginTop: 8 }}>
          <span className="sub">{profile.summary.publicAssets} public assets</span>
          <span className="sub">{totalValue.toLocaleString()} KRW total value</span>
        </div>
      </article>

      <h2>Public Collection</h2>
      <div className="grid">
        {profile.assets.length ? (
          profile.assets.map((asset) => (
            <article key={asset.assetId} className="card">
              {asset.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="feed-image" src={asset.imageUrl} alt={asset.title} />
              ) : (
                <div className="feed-image feed-image-placeholder">
                  <span>{asset.title}</span>
                </div>
              )}
              <h3>{asset.title}</h3>
              {asset.caption ? <p>{asset.caption}</p> : null}
              <p>Trusted Price: {asset.trustedPrice ? `${asset.trustedPrice.toLocaleString()} KRW` : 'Hidden'}</p>
            </article>
          ))
        ) : (
          <article className="card">
            <p>No public assets yet.</p>
          </article>
        )}
      </div>
    </section>
  );
}
