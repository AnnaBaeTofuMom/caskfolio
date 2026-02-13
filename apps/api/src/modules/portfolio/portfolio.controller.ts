import { Body, Controller, Get, Post } from '@nestjs/common';

@Controller('portfolio/me')
export class PortfolioController {
  @Get('summary')
  summary() {
    return {
      totalEstimatedValue: 8720000,
      totalPurchaseValue: 7500000,
      unrealizedPnL: 1220000,
      assetCount: 18
    };
  }

  @Get('chart')
  chart() {
    return [
      { date: '2025-10-01', value: 7100000 },
      { date: '2025-11-01', value: 7600000 },
      { date: '2025-12-01', value: 8200000 },
      { date: '2026-01-01', value: 8720000 }
    ];
  }

  @Post('share-link')
  createShareLink(@Body() body: { selectedAssetIds?: string[] }) {
    return {
      url: `https://example.com/u/demo`,
      selectedAssetIds: body.selectedAssetIds ?? [],
      visibility: 'PUBLIC'
    };
  }
}
