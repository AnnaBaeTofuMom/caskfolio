import { PriceAggregateService } from '../src/modules/pricing/price-aggregate.service.js';

describe('PriceAggregateService', () => {
  const service = new PriceAggregateService();

  it('uses weighted median when combined data is sufficient', () => {
    const result = service.calculateTrustedPrice(
      [
        { price: 100, weight: 1 },
        { price: 200, weight: 3 }
      ],
      [
        { price: 150, weight: 2 },
        { price: 300, weight: 1 }
      ]
    );

    expect(result.method).toBe('WEIGHTED_MEDIAN');
    expect(result.trustedPrice).toBe(200);
  });

  it('falls back to hidden when sample is too small', () => {
    const result = service.calculateTrustedPrice([{ price: 100, weight: 1 }], []);
    expect(result.method).toBe('HIDDEN');
    expect(result.trustedPrice).toBeNull();
  });
});
