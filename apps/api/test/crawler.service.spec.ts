import { describe, expect, it, vi } from 'vitest';
import { CrawlerService } from '../src/modules/crawler/crawler.service.js';

describe('CrawlerService', () => {
  it('returns 09:00 KST of the same day when current time is before 09:00 KST', () => {
    const service = new CrawlerService({} as never, {} as never);
    const reference = new Date('2026-02-13T23:30:00.000Z'); // 2026-02-14 08:30 KST
    expect(service.nextCrawlAt(reference)).toBe('2026-02-14T00:00:00.000Z');
  });

  it('returns 09:00 KST of the next day when current time is after 09:00 KST', () => {
    const service = new CrawlerService({} as never, {} as never);
    const reference = new Date('2026-02-14T01:00:00.000Z'); // 2026-02-14 10:00 KST
    expect(service.nextCrawlAt(reference)).toBe('2026-02-15T00:00:00.000Z');
  });

  it('stores market snapshots and updates aggregates for top variants', async () => {
    const prisma: any = {
      whiskyAsset: {
        groupBy: vi.fn().mockResolvedValue([{ variantId: 'v1' }]),
        findMany: vi.fn().mockResolvedValue([{ purchasePrice: 100000 }, { purchasePrice: 120000 }, { purchasePrice: 140000 }])
      },
      marketPriceSnapshot: {
        create: vi.fn().mockResolvedValue({ id: 'm1' })
      },
      priceAggregate: {
        upsert: vi.fn().mockResolvedValue({ id: 'p1' })
      }
    };

    const priceAggregateService: any = {
      calculateTrustedPrice: vi.fn().mockReturnValue({ method: 'WEIGHTED_MEDIAN', trustedPrice: 120000, confidence: 0.8 })
    };

    const service = new CrawlerService(prisma, priceAggregateService);
    const result = await service.crawlDailyTop100();

    expect(result.items).toBe(1);
    expect(prisma.marketPriceSnapshot.create).toHaveBeenCalledTimes(1);
    expect(prisma.priceAggregate.upsert).toHaveBeenCalledTimes(1);
  });
});
