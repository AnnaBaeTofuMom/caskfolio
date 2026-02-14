import { Controller, Post, UseGuards } from '@nestjs/common';
import { CrawlerService } from './crawler.service.js';
import { JwtAccessGuard } from '../../security/jwt-access.guard.js';
import { Roles } from '../../security/roles.decorator.js';
import { RolesGuard } from '../../security/roles.guard.js';

@Controller('crawler')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles('ADMIN')
export class CrawlerController {
  constructor(private readonly crawlerService: CrawlerService) {}

  @Post('run-now')
  runNow() {
    return this.crawlerService.crawlDailyTop100();
  }
}
