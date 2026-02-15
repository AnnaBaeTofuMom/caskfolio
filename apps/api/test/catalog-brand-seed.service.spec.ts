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

  it('includes expanded Macallan sub-lines in product upserts', async () => {
    const prisma: any = {
      brand: {
        count: vi.fn().mockResolvedValueOnce(120).mockResolvedValueOnce(120),
        upsert: vi.fn().mockResolvedValue({ id: 'macallan-brand' })
      },
      product: {
        count: vi.fn().mockResolvedValueOnce(200).mockResolvedValueOnce(200),
        upsert: vi.fn().mockResolvedValue({ id: 'line-1' })
      },
      variant: {
        count: vi.fn().mockResolvedValueOnce(300).mockResolvedValueOnce(300),
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'v1' })
      }
    };

    const service = new CatalogBrandSeedService(prisma);
    await service.onApplicationBootstrap();

    const productCalls = prisma.product.upsert.mock.calls.map((call: any[]) => call[0]);
    const macallanLines = productCalls
      .map((payload: any) => payload?.where?.brandId_name?.name)
      .filter((name: string | undefined) => typeof name === 'string');

    expect(macallanLines).toContain('Sherry Oak');
    expect(macallanLines).toContain('Double Cask');
    expect(macallanLines).toContain('Rare Cask');
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
