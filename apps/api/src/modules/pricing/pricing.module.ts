import { Module } from '@nestjs/common';
import { PricingController } from './pricing.controller.js';
import { PriceAggregateService } from './price-aggregate.service.js';

@Module({
  controllers: [PricingController],
  providers: [PriceAggregateService],
  exports: [PriceAggregateService]
})
export class PricingModule {}
