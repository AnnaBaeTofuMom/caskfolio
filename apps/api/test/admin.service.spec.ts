import { describe, expect, it, vi } from 'vitest';
import { AdminService } from '../src/modules/admin/admin.service.js';

describe('AdminService', () => {
  it('computes dashboard metrics from db', async () => {
    const prisma = {
      user: {
        count: vi.fn().mockResolvedValueOnce(10).mockResolvedValueOnce(4)
      },
      whiskyAsset: {
        count: vi.fn().mockResolvedValue(21),
        findMany: vi.fn().mockResolvedValue([
          { variantId: 'v1', purchasePrice: 100 },
          { variantId: 'v1', purchasePrice: 200 },
          { variantId: 'v2', purchasePrice: 300 }
        ])
      },
      variant: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'v1', product: { brand: { name: 'Macallan' }, name: '18' }, specialTag: 'Sherry' },
          { id: 'v2', product: { brand: { name: 'Yamazaki' }, name: '12' }, specialTag: null }
        ])
      }
    } as never;

    const service = new AdminService(prisma);
    const result = await service.metrics();

    expect(result.totalUsers).toBe(10);
    expect(result.activeUsers).toBe(4);
    expect(result.totalRegisteredAssets).toBe(21);
    expect(result.totalAum).toBe(600);
    expect(result.topVariantsByAum[0].aum).toBe(300);
  });

  it('approves custom submission and links assets when variant is provided', async () => {
    const prisma: any = {
      customProductSubmission: {
        update: vi.fn().mockResolvedValue({
          id: 's1',
          userId: 'u1',
          customProductName: 'Unknown Bottle'
        })
      },
      whiskyAsset: {
        updateMany: vi.fn().mockResolvedValue({ count: 2 })
      }
    };

    const service = new AdminService(prisma);
    const result = await service.approveCustomProduct('s1', 'admin@caskfolio.com', 'v1');

    expect(result.approved).toBe(true);
    expect(prisma.whiskyAsset.updateMany).toHaveBeenCalledTimes(1);
  });

  it('returns top holders sorted by AUM', async () => {
    const prisma: any = {
      whiskyAsset: {
        findMany: vi.fn().mockResolvedValue([
          { userId: 'u1', purchasePrice: 100 },
          { userId: 'u2', purchasePrice: 500 },
          { userId: 'u1', purchasePrice: 200 }
        ])
      },
      user: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'u1', username: 'a', name: 'A' },
          { id: 'u2', username: 'b', name: 'B' }
        ])
      }
    };

    const service = new AdminService(prisma);
    const holders = await service.topHolders(2);
    expect(holders[0].userId).toBe('u2');
    expect(holders[0].aum).toBe(500);
  });
});
