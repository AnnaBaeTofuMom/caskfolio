import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './modules/auth/auth.module.js';
import { AssetsModule } from './modules/assets/assets.module.js';
import { PortfolioModule } from './modules/portfolio/portfolio.module.js';
import { SocialModule } from './modules/social/social.module.js';
import { PricingModule } from './modules/pricing/pricing.module.js';
import { CrawlerModule } from './modules/crawler/crawler.module.js';
import { AdminModule } from './modules/admin/admin.module.js';
import { CatalogModule } from './modules/catalog/catalog.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { CatalogBrandSeedService } from './bootstrap/catalog-brand-seed.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    CatalogModule,
    AssetsModule,
    PortfolioModule,
    SocialModule,
    PricingModule,
    CrawlerModule,
    AdminModule
  ],
  providers: [CatalogBrandSeedService]
})
export class AppModule {}
