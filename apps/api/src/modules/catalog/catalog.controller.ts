import { Controller, Get, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service.js';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('brands')
  brands(@Query('q') q?: string) {
    return this.catalogService.brands(q);
  }

  @Get('products')
  products(@Query('brandId') brandId?: string, @Query('q') q?: string) {
    return this.catalogService.products(brandId, q);
  }

  @Get('variants')
  variants(@Query('productId') productId?: string, @Query('q') q?: string) {
    return this.catalogService.variants(productId, q);
  }
}
