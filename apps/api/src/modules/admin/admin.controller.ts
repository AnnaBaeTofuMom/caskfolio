import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service.js';
import { JwtAccessGuard } from '../../security/jwt-access.guard.js';
import { Roles } from '../../security/roles.decorator.js';
import { RolesGuard } from '../../security/roles.guard.js';

@Controller('admin')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles('ADMIN')
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

  @Patch('catalog/brands/:brandId')
  updateBrand(@Param('brandId') brandId: string, @Body() body: { name: string }) {
    return this.adminService.updateBrand(brandId, body.name);
  }

  @Post('catalog/brands/:brandId/delete')
  deleteBrand(@Param('brandId') brandId: string) {
    return this.adminService.deleteBrand(brandId);
  }

  @Post('catalog/products')
  createProduct(@Body() body: { brandId: string; name: string }) {
    return this.adminService.createProduct(body.brandId, body.name);
  }

  @Patch('catalog/products/:productId')
  updateProduct(@Param('productId') productId: string, @Body() body: { brandId?: string; name?: string }) {
    return this.adminService.updateProduct(productId, body);
  }

  @Post('catalog/products/:productId/delete')
  deleteProduct(@Param('productId') productId: string) {
    return this.adminService.deleteProduct(productId);
  }

  @Post('catalog/variants')
  createVariant(
    @Body() body: { productId: string; releaseYear?: number; bottleSize?: number; region?: string; specialTag?: string }
  ) {
    return this.adminService.createVariant(body);
  }

  @Patch('catalog/variants/:variantId')
  updateVariant(
    @Param('variantId') variantId: string,
    @Body() body: { productId?: string; releaseYear?: number; bottleSize?: number; region?: string; specialTag?: string }
  ) {
    return this.adminService.updateVariant(variantId, body);
  }

  @Post('catalog/variants/:variantId/delete')
  deleteVariant(@Param('variantId') variantId: string) {
    return this.adminService.deleteVariant(variantId);
  }

  @Patch('users/:userId/role')
  updateUserRole(@Param('userId') userId: string, @Body() body: { role: 'USER' | 'ADMIN' }) {
    return this.adminService.updateUserRole(userId, body.role);
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

  @Post('market-price')
  createManualMarketPrice(
    @Body() body: { variantId: string; lowestPrice: number; highestPrice: number; source?: string; sourceUrl?: string }
  ) {
    return this.adminService.createManualMarketPriceSnapshot(body);
  }
}
