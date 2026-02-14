import { describe, expect, it } from 'vitest';
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
});
