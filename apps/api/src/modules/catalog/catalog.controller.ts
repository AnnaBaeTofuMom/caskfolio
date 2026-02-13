import { Controller, Get, Query } from '@nestjs/common';

@Controller('catalog')
export class CatalogController {
  @Get('brands')
  brands(@Query('q') q?: string) {
    return [{ id: 'brand-1', name: 'Macallan' }, { id: 'brand-2', name: 'Yamazaki' }].filter((b) =>
      q ? b.name.toLowerCase().includes(q.toLowerCase()) : true
    );
  }

  @Get('products')
  products(@Query('brandId') brandId?: string) {
    return [{ id: 'product-1', brandId: brandId ?? 'brand-1', name: 'Sherry Oak' }];
  }

  @Get('variants')
  variants(@Query('productId') productId?: string) {
    return [
      {
        id: 'variant-1',
        productId: productId ?? 'product-1',
        releaseYear: 2022,
        bottleSize: 700,
        region: 'Speyside',
        specialTag: '18 Years'
      }
    ];
  }
}
