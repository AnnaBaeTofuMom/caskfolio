import { Controller, Get, Param } from '@nestjs/common';
import { PriceAggregateService } from './price-aggregate.service.js';

@Controller('variants')
export class PricingController {
  constructor(private readonly pricing: PriceAggregateService) {}

  @Get(':variantId/price')
  getVariantPrice(@Param('variantId') variantId: string) {
    return this.pricing.getVariantPricingStats(variantId);
  }

  @Get(':variantId/price-history')
  getVariantPriceHistory(@Param('variantId') variantId: string) {
    return this.pricing.getVariantPriceHistory(variantId);
  }
}
