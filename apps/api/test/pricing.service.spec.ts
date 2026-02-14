import { describe, expect, it, vi } from 'vitest';
import { PriceAggregateService } from '../src/modules/pricing/price-aggregate.service.js';

describe('PriceAggregateService DB stats', () => {
  it('builds variant pricing stats from internal and external snapshots', async () => {
    const prisma = {
      whiskyAsset: {
        findMany: vi.fn().mockResolvedValue([{ purchasePrice: 100000 }, { purchasePrice: 120000 }, { purchasePrice: 150000 }]),
        count: vi.fn().mockResolvedValue(2)
      },
      marketPriceSnapshot: {
        findMany: vi.fn().mockResolvedValue([
          { lowestPrice: 130000, highestPrice: 170000, crawledAt: new Date() },
          { lowestPrice: 125000, highestPrice: 180000, crawledAt: new Date() }
        ])
      }
    } as never;

    const service = new PriceAggregateService(prisma);
    const result = await service.getVariantPricingStats('variant-1');

    expect(result.variantId).toBe('variant-1');
    expect(result.owners).toBe(2);
    expect(result.platformAverage).toBe(123333.33);
    expect(result.min).toBe(100000);
    expect(result.max).toBe(150000);
  });
});
