import { describe, expect, it } from 'vitest';
import { SocialFeedService } from '../src/modules/social/social-feed.service.js';

const following = Array.from({ length: 10 }).map((_, idx) => ({ id: `f-${idx + 1}` }));
const recommended = Array.from({ length: 10 }).map((_, idx) => ({ id: `r-${idx + 1}` }));

describe('SocialFeedService', () => {
  const service = new SocialFeedService();

  it('mixes feed with 70% following and 30% recommended by default', () => {
    const feed = service.mix(following, recommended, 10);

    expect(feed.items).toHaveLength(10);
    expect(feed.items.filter((item: { source: string }) => item.source === 'FOLLOWING')).toHaveLength(7);
    expect(feed.items.filter((item: { source: string }) => item.source === 'RECOMMENDED')).toHaveLength(3);
  });

  it('fills from recommended when following is insufficient', () => {
    const feed = service.mix([{ id: 'f-1' }], recommended, 5);

    expect(feed.items).toHaveLength(5);
    expect(feed.items.filter((item: { source: string }) => item.source === 'FOLLOWING')).toHaveLength(1);
    expect(feed.items.filter((item: { source: string }) => item.source === 'RECOMMENDED')).toHaveLength(4);
  });
});
