import { describe, expect, it, vi } from 'vitest';
import { PortfolioService } from '../src/modules/portfolio/portfolio.service.js';

describe('PortfolioService', () => {
  const service = new PortfolioService({} as never);

  it('computes summary from assets and trusted prices', () => {
    const summary = service.computeSummaryFromAssets([
      { purchasePrice: 100000, trustedPrice: 120000 },
      { purchasePrice: 300000, trustedPrice: null },
      { purchasePrice: 200000, trustedPrice: 240000 }
    ]);

    expect(summary.totalPurchaseValue).toBe(600000);
    expect(summary.totalEstimatedValue).toBe(660000);
    expect(summary.unrealizedPnL).toBe(60000);
    expect(summary.assetCount).toBe(3);
  });

  it('creates persistent share link', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ id: 'u1', email: 'demo@caskfolio.com', username: 'demo', name: 'Demo' })
      },
      portfolioShare: {
        create: vi.fn().mockResolvedValue({ id: 's1' })
      }
    } as never;

    const withDb = new PortfolioService(prisma);
    const result = await withDb.createShareLink('demo@caskfolio.com', ['a1', 'a2']);

    expect(result.url).toMatch(/^https:\/\/example\.com\/portfolio\/share\/[a-f0-9]{16}$/);
    expect(result.selectedAssetIds).toEqual(['a1', 'a2']);
  });

  it('summary aggregates only owned assets', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ id: 'u1', email: 'demo@caskfolio.com', username: 'demo', name: 'Demo' })
      },
      whiskyAsset: {
        findMany: vi.fn().mockResolvedValue([])
      }
    } as never;

    const withDb = new PortfolioService(prisma);
    await withDb.summary('demo@caskfolio.com');

    expect((prisma as any).whiskyAsset.findMany).toHaveBeenCalledWith({
      where: { userId: 'u1', deletedAt: null },
      include: { variant: { include: { priceAggregate: true } } }
    });
  });

  it('chart aggregates only owned assets', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ id: 'u1', email: 'demo@caskfolio.com', username: 'demo', name: 'Demo' })
      },
      whiskyAsset: {
        findMany: vi.fn().mockResolvedValue([])
      }
    } as never;

    const withDb = new PortfolioService(prisma);
    await withDb.chart('demo@caskfolio.com');

    expect((prisma as any).whiskyAsset.findMany).toHaveBeenCalledWith({
      where: { userId: 'u1', deletedAt: null },
      include: { variant: { include: { priceAggregate: true } } },
      orderBy: { purchaseDate: 'asc' }
    });
  });

  it('share link fallback selects public owned assets', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ id: 'u1', email: 'demo@caskfolio.com', username: 'demo', name: 'Demo' })
      },
      whiskyAsset: {
        findMany: vi.fn().mockResolvedValue([{ id: 'a1' }])
      },
      portfolioShare: {
        create: vi.fn().mockResolvedValue({ id: 's1' })
      }
    } as never;

    const withDb = new PortfolioService(prisma);
    await withDb.createShareLink('demo@caskfolio.com', []);

    expect((prisma as any).whiskyAsset.findMany).toHaveBeenCalledWith({
      where: { userId: 'u1', visibility: 'PUBLIC', deletedAt: null },
      select: { id: true },
      take: 30
    });
  });
});
