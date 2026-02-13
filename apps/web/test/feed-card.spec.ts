import { describe, expect, it } from 'vitest';
import { FeedCard } from '@caskfolio/types';

function renderPrice(card: FeedCard): string {
  return card.trustedPrice ? `${card.trustedPrice.toLocaleString()} KRW` : 'Hidden';
}

describe('Feed card price format', () => {
  it('renders trusted price when available', () => {
    const card: FeedCard = {
      assetId: 'a1',
      owner: { username: 'demo', name: 'Demo' },
      title: 'Macallan',
      trustedPrice: 123000,
      priceMethod: 'WEIGHTED_MEDIAN',
      confidence: 0.8,
      createdAt: '2026-02-13T00:00:00.000Z'
    };

    expect(renderPrice(card)).toBe('123,000 KRW');
  });

  it('hides price when trusted price is missing', () => {
    const card: FeedCard = {
      assetId: 'a2',
      owner: { username: 'demo', name: 'Demo' },
      title: 'Yamazaki',
      priceMethod: 'HIDDEN',
      confidence: 0,
      createdAt: '2026-02-13T00:00:00.000Z'
    };

    expect(renderPrice(card)).toBe('Hidden');
  });
});
