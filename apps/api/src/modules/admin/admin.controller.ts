import { Body, Controller, Get, Post } from '@nestjs/common';
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

  @Get('export')
  exportData() {
    return this.adminService.exportData();
  }
}
