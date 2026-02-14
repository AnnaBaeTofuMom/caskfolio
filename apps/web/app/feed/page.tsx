import { FeedCardItem } from '../../components/feed-card';
import { FeedCard } from '@caskfolio/types';
import { safeFetch } from '../../lib/api';

export const dynamic = 'force-dynamic';

const fallbackItems: FeedCard[] = [
  {
    assetId: 'asset-1',
    owner: { username: 'maltlover', name: 'Malt Lover' },
    title: 'Macallan 18 Sherry Oak',
    caption: 'Vintage shelf update',
    trustedPrice: 368000,
    priceMethod: 'WEIGHTED_MEDIAN',
    confidence: 0.82,
    createdAt: '2026-02-12T02:00:00.000Z'
  }
];

export default async function FeedPage() {
  const data = await safeFetch<{ items: FeedCard[] }>('/social/feed', {
    headers: { 'x-user-email': 'demo@caskfolio.com' }
  });
  const items = data?.items?.length ? data.items : fallbackItems;

  return (
    <section>
      <h1>Community Feed</h1>
      <p className="sub">70% following + 30% recommended public collections</p>
      <div className="grid">
        {items.map((item) => (
          <FeedCardItem key={item.assetId} card={item} />
        ))}
      </div>
    </section>
  );
}
