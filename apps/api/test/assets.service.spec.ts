import { describe, expect, it, vi } from 'vitest';
import { AssetsService } from '../src/modules/assets/assets.service.js';

describe('AssetsService', () => {
  const service = new AssetsService({} as never);

  it('throws when both variantId and customProductName are missing', () => {
    expect(() =>
      service.normalizeCreateInput({
        purchasePrice: 100000,
        purchaseDate: '2026-01-01',
        bottleCondition: 'SEALED',
        boxAvailable: true,
        storageLocation: 'HOME'
      })
    ).toThrow('variantId or customProductName is required');
  });

  it('sets default visibility to PRIVATE', () => {
    const input = service.normalizeCreateInput({
      variantId: 'variant-1',
      purchasePrice: 100000,
      purchaseDate: '2026-01-01',
      bottleCondition: 'SEALED',
      boxAvailable: true,
      storageLocation: 'HOME'
    });

    expect(input.visibility).toBe('PRIVATE');
  });

  it('creates custom product submission when custom product is registered', async () => {
    const prisma: any = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ id: 'u1', email: 'demo@caskfolio.com', username: 'demo', name: 'Demo' })
      },
      whiskyAsset: {
        create: vi.fn().mockResolvedValue({ id: 'a1' })
      },
      customProductSubmission: {
        create: vi.fn().mockResolvedValue({ id: 's1' })
      }
    };
    const service = new AssetsService(prisma);

    await service.createAsset('demo@caskfolio.com', {
      customProductName: 'Mystery Cask',
      purchasePrice: 100000,
      purchaseDate: '2026-01-01',
      bottleCondition: 'SEALED',
      boxAvailable: true,
      storageLocation: 'HOME'
    });

    expect(prisma.customProductSubmission.create).toHaveBeenCalledTimes(1);
  });
});
