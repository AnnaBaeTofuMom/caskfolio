import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class CrawlerService {
  private readonly logger = new Logger(CrawlerService.name);

  @Cron(CronExpression.EVERY_DAY_AT_9AM, { timeZone: 'Asia/Seoul' })
  async crawlDailyTop100() {
    // Replace with Playwright/Puppeteer crawling in production.
    this.logger.log('Running daily crawl for top 100 variants at 09:00 KST');
    return {
      crawledAt: new Date().toISOString(),
      source: 'google-shopping',
      items: 100
    };
  }
}
