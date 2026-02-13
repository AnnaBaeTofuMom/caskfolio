import { FeedCardItem } from '../../components/feed-card';
import { FeedCard } from '@caskfolio/types';

const items: FeedCard[] = [
  {
    assetId: 'asset-1',
    owner: { username: 'maltlover', name: 'Malt Lover' },
    title: 'Macallan 18 Sherry Oak',
    caption: 'Vintage shelf update',
    trustedPrice: 368000,
    priceMethod: 'WEIGHTED_MEDIAN',
    confidence: 0.82,
    createdAt: '2026-02-12T02:00:00.000Z'
  },
  {
    assetId: 'asset-2',
    owner: { username: 'peatmode', name: 'Peat Mode' },
    title: 'Ardbeg 25',
    trustedPrice: 1120000,
    priceMethod: 'EXTERNAL_MEDIAN',
    confidence: 0.75,
    createdAt: '2026-02-11T09:30:00.000Z'
  }
];

export default function FeedPage() {
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
