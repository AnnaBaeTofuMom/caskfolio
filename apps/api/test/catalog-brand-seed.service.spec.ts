import { describe, expect, it, vi } from 'vitest';
import { CatalogBrandSeedService } from '../src/bootstrap/catalog-brand-seed.service.js';

describe('CatalogBrandSeedService', () => {
  it('seeds products and variants when catalog depth is insufficient', async () => {
    const prisma: any = {
      brand: {
        count: vi.fn().mockResolvedValueOnce(10).mockResolvedValueOnce(100),
        upsert: vi.fn().mockResolvedValue({ id: 'b1' })
      },
      product: {
        count: vi.fn().mockResolvedValueOnce(5).mockResolvedValueOnce(150),
        upsert: vi.fn().mockResolvedValue({ id: 'p1' })
      },
      variant: {
        count: vi.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(160),
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'v1' })
      }
    };

    const service = new CatalogBrandSeedService(prisma);
    await service.onApplicationBootstrap();

    expect(prisma.brand.upsert).toHaveBeenCalled();
    expect(prisma.product.upsert).toHaveBeenCalled();
    expect(prisma.variant.create).toHaveBeenCalled();
  });

  it('skips seeding when feature flag is disabled', async () => {
    const prisma: any = {
      brand: { count: vi.fn(), upsert: vi.fn() },
      product: { count: vi.fn(), upsert: vi.fn() },
      variant: { count: vi.fn(), findFirst: vi.fn(), create: vi.fn() }
    };

    const previous = process.env.AUTO_SEED_BRANDS_ON_BOOT;
    process.env.AUTO_SEED_BRANDS_ON_BOOT = 'false';
    const service = new CatalogBrandSeedService(prisma);
    await service.onApplicationBootstrap();
    if (typeof previous === 'string') process.env.AUTO_SEED_BRANDS_ON_BOOT = previous;
    else delete process.env.AUTO_SEED_BRANDS_ON_BOOT;

    expect(prisma.brand.count).not.toHaveBeenCalled();
    expect(prisma.product.count).not.toHaveBeenCalled();
    expect(prisma.variant.count).not.toHaveBeenCalled();
  });
});
