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
});
