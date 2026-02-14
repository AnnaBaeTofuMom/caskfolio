import { describe, expect, it } from 'vitest';
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
});
