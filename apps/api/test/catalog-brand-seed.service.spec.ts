import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogBrandSeedService } from '../src/bootstrap/catalog-brand-seed.service.js';

describe('CatalogBrandSeedService', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => []
    } as never);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

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

  it('syncs WhiskyHunter whiskies_data additively using full_name-first parsing', async () => {
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/whiskies_data')) {
        return {
          ok: true,
          json: async () => [
            {
              distillery: 'The Macallan',
              region: 'Speyside',
              full_name: 'The Macallan Double Cask 12 Years Old 40%'
            },
            {
              distillery: 'The Macallan',
              region: 'Speyside',
              full_name: 'The Macallan Rare Cask 2023 Release 43%'
            }
          ]
        } as never;
      }
      return { ok: true, json: async () => [] } as never;
    });

    const prisma: any = {
      brand: {
        count: vi.fn().mockResolvedValueOnce(150).mockResolvedValueOnce(150),
        upsert: vi.fn().mockResolvedValue({ id: 'b-mac' })
      },
      product: {
        count: vi.fn().mockResolvedValueOnce(200).mockResolvedValueOnce(202),
        upsert: vi.fn().mockResolvedValue({ id: 'p-mac' })
      },
      variant: {
        count: vi.fn().mockResolvedValueOnce(200).mockResolvedValueOnce(202),
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'v-mac' }),
        deleteMany: vi.fn()
      }
    };

    const service = new CatalogBrandSeedService(prisma);
    await service.onApplicationBootstrap();

    const lineNames = prisma.product.upsert.mock.calls
      .map((call: any[]) => call[0]?.where?.brandId_name?.name)
      .filter((name: string | undefined) => typeof name === 'string');

    expect(lineNames).toContain('Double Cask');
    expect(lineNames).toContain('Rare Cask');
    expect(prisma.variant.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          specialTag: expect.stringContaining('12 Years Old 40%')
        })
      })
    );
    expect(prisma.variant.deleteMany).not.toHaveBeenCalled();
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
