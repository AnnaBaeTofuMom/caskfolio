import { Module } from '@nestjs/common';
import { CrawlerService } from './crawler.service.js';
import { CrawlerController } from './crawler.controller.js';
import { PricingModule } from '../pricing/pricing.module.js';
import { RolesGuard } from '../../security/roles.guard.js';

@Module({ imports: [PricingModule], providers: [CrawlerService, RolesGuard], controllers: [CrawlerController] })
export class CrawlerModule {}
