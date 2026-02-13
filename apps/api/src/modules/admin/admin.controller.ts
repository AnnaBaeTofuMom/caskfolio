import { Body, Controller, Get, Patch, Post } from '@nestjs/common';

@Controller('admin')
export class AdminController {
  @Get('metrics')
  metrics() {
    return {
      totalUsers: 1520,
      activeUsers: 684,
      totalRegisteredAssets: 5830,
      totalAum: 4120000000,
      topVariantsByAum: [
        { variant: 'Macallan 18 Sherry Oak', aum: 530000000 },
        { variant: 'Yamazaki 18', aum: 470000000 }
      ]
    };
  }

  @Post('catalog/variants')
  createVariant(@Body() body: { productId: string; releaseYear?: number; bottleSize?: number }) {
    return { id: 'variant-new', ...body };
  }

  @Patch('custom-products/:submissionId/approve')
  approveCustomProduct() {
    return { approved: true };
  }

  @Get('export')
  exportData() {
    return { status: 'queued', format: 'csv' };
  }
}
