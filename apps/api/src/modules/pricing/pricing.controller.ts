import { Controller, Get, Param } from '@nestjs/common';
import { PriceAggregateService } from './price-aggregate.service.js';

@Controller('variants')
export class PricingController {
  constructor(private readonly pricing: PriceAggregateService) {}

  @Get(':variantId/price')
  getVariantPrice(@Param('variantId') variantId: string) {
    const price = this.pricing.calculateTrustedPrice(
      [
        { price: 320000, weight: 2 },
        { price: 350000, weight: 3 },
        { price: 410000, weight: 1 }
      ],
      [
        { price: 330000, weight: 3 },
        { price: 370000, weight: 2 }
      ]
    );

    return { variantId, ...price, platformAverage: 356000, min: 320000, max: 410000, owners: 12 };
  }
}
