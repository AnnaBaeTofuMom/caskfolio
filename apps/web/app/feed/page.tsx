import { FeedCardItem } from '../../components/feed-card';
import { FeedCard } from '@caskfolio/types';
import { safeFetch } from '../../lib/api';

export const dynamic = 'force-dynamic';

const fallbackItems: FeedCard[] = [
  {
    assetId: 'asset-1',
    owner: { id: 'u1', username: 'maltlover', name: 'Malt Lover' },
    title: 'Macallan 18 Sherry Oak',
    productLine: 'Sherry Oak',
    hasBox: true,
    purchasePrice: 330000,
    currentValue: 368000,
    imageUrl: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=800&q=80',
    caption: 'Vintage shelf update',
    trustedPrice: 368000,
    priceMethod: 'WEIGHTED_MEDIAN',
    confidence: 0.82,
    isFollowing: false,
    isOwnAsset: false,
    createdAt: '2026-02-12T02:00:00.000Z'
  }
];

export default async function FeedPage() {
  const data = await safeFetch<{ items: FeedCard[] }>('/social/feed', {
    headers: { 'x-user-email': 'demo@caskfolio.com' }
  });
  const items = data?.items?.length ? data.items : fallbackItems;

  return (
    <section className="feed-wrap">
      <h1>Community Feed</h1>
      <p className="sub">Explore collections from fellow whisky enthusiasts</p>
      <div className="feed-list">
        {items.map((item) => (
          <FeedCardItem key={item.assetId} card={item} />
        ))}
      </div>
    </section>
  );
}
