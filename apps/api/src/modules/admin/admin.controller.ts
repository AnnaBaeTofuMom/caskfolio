import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AdminService } from './admin.service.js';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('metrics')
  metrics() {
    return this.adminService.metrics();
  }

  @Get('users')
  users() {
    return this.adminService.users();
  }

  @Get('top-holders')
  topHolders(@Query('limit') limit?: string) {
    return this.adminService.topHolders(Number(limit ?? 10));
  }

  @Get('custom-products')
  customProducts(@Query('status') status?: 'PENDING' | 'APPROVED' | 'REJECTED') {
    return this.adminService.customProducts(status ?? 'PENDING');
  }

  @Post('catalog/brands')
  createBrand(@Body() body: { name: string }) {
    return this.adminService.createBrand(body.name);
  }

  @Post('catalog/products')
  createProduct(@Body() body: { brandId: string; name: string }) {
    return this.adminService.createProduct(body.brandId, body.name);
  }

  @Post('catalog/variants')
  createVariant(
    @Body() body: { productId: string; releaseYear?: number; bottleSize?: number; region?: string; specialTag?: string }
  ) {
    return this.adminService.createVariant(body);
  }

  @Patch('custom-products/:submissionId/approve')
  approveCustomProduct(
    @Param('submissionId') submissionId: string,
    @Body() body: { reviewer?: string; variantId?: string }
  ) {
    return this.adminService.approveCustomProduct(submissionId, body.reviewer, body.variantId);
  }

  @Get('export')
  exportData() {
    return this.adminService.exportData();
  }
}
