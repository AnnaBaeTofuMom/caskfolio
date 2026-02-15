import Link from 'next/link';
import { safeFetch } from '../../../lib/api';
import { ProfileFollowList } from '../../../components/profile-follow-list';

interface Props {
  params: Promise<{ username: string }>;
}

type PublicProfile = {
  username: string;
  name?: string;
  profileImage?: string | null;
  joinedAt?: string;
  summary: { assetCount: number; publicAssets: number; followerCount: number; followingCount: number };
  assets: Array<{
    assetId: string;
    title: string;
    imageUrl?: string;
    caption?: string;
    trustedPrice: number | null;
    purchasePrice?: number;
    currentValue?: number;
    productLine?: string;
    hasBox?: boolean;
  }>;
};

export default async function UserProfilePage({ params }: Props) {
  const { username } = await params;
  const profile =
    (await safeFetch<PublicProfile>(`/u/${encodeURIComponent(username)}`)) ??
    ({
      username,
      name: username,
      summary: { assetCount: 0, publicAssets: 0, followerCount: 0, followingCount: 0 },
      assets: []
    } as PublicProfile);

  const totalValue = profile.assets.reduce((sum, asset) => sum + (asset.currentValue ?? asset.trustedPrice ?? 0), 0);
  const totalPurchase = profile.assets.reduce((sum, asset) => sum + (asset.purchasePrice ?? 0), 0);
  const totalGainRate = totalPurchase > 0 ? ((totalValue - totalPurchase) / totalPurchase) * 100 : null;

  return (
    <section className="feed-wrap">
      <Link className="sub" href="/feed">
        ← Back to Feed
      </Link>

      <article className="card" style={{ marginTop: 12, marginBottom: 16 }}>
        <div className="asset-row-head">
          <div>
            <h1>{profile.name ?? profile.username}</h1>
            <p className="sub">@{profile.username}</p>
          </div>
          {profile.profileImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.profileImage}
              alt={profile.username}
              style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--line)' }}
            />
          ) : (
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'var(--secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700
              }}
            >
              {(profile.name ?? profile.username).slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <div className="actions" style={{ marginTop: 8 }}>
          <span className="sub">Joined {formatMonth(profile.joinedAt)}</span>
          <span className="sub">{profile.summary.publicAssets} public assets</span>
          <span className="sub">Followers {profile.summary.followerCount}</span>
          <span className="sub">Following {profile.summary.followingCount}</span>
          <span className="sub">{totalValue.toLocaleString()} KRW total value</span>
        </div>
        <div className="metrics" style={{ marginTop: 12, marginBottom: 0 }}>
          <article className="card metric">
            <p>총 매입가</p>
            <strong>{totalPurchase.toLocaleString()} KRW</strong>
          </article>
          <article className="card metric">
            <p>총 가치</p>
            <strong>{totalValue.toLocaleString()} KRW</strong>
          </article>
          <article className="card metric">
            <p>상승률</p>
            <strong>{totalGainRate === null ? 'N/A' : `${totalGainRate > 0 ? '+' : ''}${totalGainRate.toFixed(1)}%`}</strong>
          </article>
        </div>
      </article>

      <ProfileFollowList
        username={profile.username}
        followerCount={profile.summary.followerCount}
        followingCount={profile.summary.followingCount}
      />

      <h2>Public Collection</h2>
      <div className="grid">
        {profile.assets.length ? (
          profile.assets.map((asset) => {
            const pct =
              asset.purchasePrice && asset.currentValue && asset.purchasePrice > 0
                ? ((asset.currentValue - asset.purchasePrice) / asset.purchasePrice) * 100
                : null;

            return (
              <article key={asset.assetId} className="card">
                {asset.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="feed-image" src={asset.imageUrl} alt={asset.title} />
                ) : (
                  <div className="feed-image feed-image-placeholder">
                    <span>{asset.title}</span>
                  </div>
                )}
                <div className="feed-badges">
                  {asset.hasBox ? <span className="badge">Boxed</span> : null}
                  {asset.productLine ? <span className="badge">{asset.productLine}</span> : null}
                </div>
                <h3>{asset.title}</h3>
                {asset.caption ? <p>{asset.caption}</p> : null}
                <p>Current Value: {(asset.currentValue ?? asset.trustedPrice ?? 0).toLocaleString()} KRW</p>
                <p>Performance: {pct === null ? 'N/A' : `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`}</p>
              </article>
            );
          })
        ) : (
          <article className="card">
            <p>No public assets yet.</p>
          </article>
        )}
      </div>
    </section>
  );
}

function formatMonth(iso?: string) {
  if (!iso) return 'N/A';
  const date = new Date(iso);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}
