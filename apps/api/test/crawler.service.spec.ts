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
      variant: {
        findUnique: vi.fn().mockResolvedValue(null)
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

  it('uses external source template when available and falls back otherwise', async () => {
    process.env.MARKET_PRICE_SOURCE_URL_TEMPLATE = 'https://prices.example.com/{variantId}';

    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ lowestPrice: 210000, highestPrice: 260000 })
    } as never);

    const prisma: any = {
      whiskyAsset: {
        groupBy: vi.fn().mockResolvedValue([{ variantId: 'v-ext' }]),
        findMany: vi.fn().mockResolvedValue([{ purchasePrice: 200000 }, { purchasePrice: 240000 }, { purchasePrice: 250000 }])
      },
      variant: {
        findUnique: vi.fn().mockResolvedValue(null)
      },
      marketPriceSnapshot: {
        create: vi.fn().mockResolvedValue({ id: 'm1' })
      },
      priceAggregate: {
        upsert: vi.fn().mockResolvedValue({ id: 'p1' })
      }
    };

    const priceAggregateService: any = {
      calculateTrustedPrice: vi.fn().mockReturnValue({ method: 'WEIGHTED_MEDIAN', trustedPrice: 240000, confidence: 0.8 })
    };

    const service = new CrawlerService(prisma, priceAggregateService);
    await service.crawlDailyTop100();

    expect(prisma.marketPriceSnapshot.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lowestPrice: 210000,
          highestPrice: 260000,
          source: 'external-prices.example.com'
        })
      })
    );

    global.fetch = originalFetch;
    delete process.env.MARKET_PRICE_SOURCE_URL_TEMPLATE;
  });

  it('crawls catalog variants even when no asset history exists', async () => {
    process.env.MARKET_PRICE_SOURCE_URL_TEMPLATE = 'https://prices.example.com/{variantId}';

    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ lowestPrice: 190000, highestPrice: 230000 })
    } as never);

    const prisma: any = {
      whiskyAsset: {
        groupBy: vi.fn().mockResolvedValue([]),
        findMany: vi.fn().mockResolvedValue([])
      },
      variant: {
        findMany: vi.fn().mockResolvedValue([{ id: 'v-cat-1' }]),
        findUnique: vi.fn().mockResolvedValue(null)
      },
      marketPriceSnapshot: {
        create: vi.fn().mockResolvedValue({ id: 'm1' })
      },
      priceAggregate: {
        upsert: vi.fn().mockResolvedValue({ id: 'p1' })
      }
    };

    const priceAggregateService: any = {
      calculateTrustedPrice: vi.fn().mockReturnValue({ method: 'WEIGHTED_MEDIAN', trustedPrice: 210000, confidence: 0.7 })
    };

    const service = new CrawlerService(prisma, priceAggregateService);
    const result = await service.crawlDailyTop100();

    expect(result.items).toBe(1);
    expect(prisma.variant.findMany).toHaveBeenCalledWith({ select: { id: true }, take: 100 });
    expect(prisma.marketPriceSnapshot.create).toHaveBeenCalledTimes(1);
    expect(prisma.priceAggregate.upsert).toHaveBeenCalledTimes(1);

    global.fetch = originalFetch;
    delete process.env.MARKET_PRICE_SOURCE_URL_TEMPLATE;
  });

  it('runs one crawl shortly after boot when enabled', async () => {
    vi.useFakeTimers();

    const service = new CrawlerService({} as never, {} as never);
    const spy = vi.spyOn(service, 'crawlDailyTop100').mockResolvedValue({
      crawledAt: new Date().toISOString(),
      nextCrawlAt: new Date().toISOString(),
      source: 'test',
      items: 0
    });

    await service.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(5000);

    expect(spy).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
