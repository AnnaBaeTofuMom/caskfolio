import { Controller, Post } from '@nestjs/common';
import { CrawlerService } from './crawler.service.js';

@Controller('crawler')
export class CrawlerController {
  constructor(private readonly crawlerService: CrawlerService) {}

  @Post('run-now')
  runNow() {
    return this.crawlerService.crawlDailyTop100();
  }
}
