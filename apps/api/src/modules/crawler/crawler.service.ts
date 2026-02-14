import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class CrawlerService {
  private readonly logger = new Logger(CrawlerService.name);
  private static readonly KST_OFFSET_HOURS = 9;
  private static readonly KST_DAY_MS = 24 * 60 * 60 * 1000;

  @Cron(CronExpression.EVERY_DAY_AT_9AM, { timeZone: 'Asia/Seoul' })
  async crawlDailyTop100() {
    // Replace with Playwright/Puppeteer crawling in production.
    this.logger.log('Running daily crawl for top 100 variants at 09:00 KST');
    return {
      crawledAt: new Date().toISOString(),
      nextCrawlAt: this.nextCrawlAt(),
      source: 'google-shopping',
      items: 100
    };
  }

  nextCrawlAt(reference = new Date()): string {
    const offsetMs = CrawlerService.KST_OFFSET_HOURS * 60 * 60 * 1000;
    const referenceMs = reference.getTime();
    const kstReferenceMs = referenceMs + offsetMs;
    const kstReference = new Date(kstReferenceMs);

    const todayNineAmKstMs =
      Date.UTC(kstReference.getUTCFullYear(), kstReference.getUTCMonth(), kstReference.getUTCDate(), 9, 0, 0, 0) -
      offsetMs;

    const nextCrawlMs =
      referenceMs < todayNineAmKstMs ? todayNineAmKstMs : todayNineAmKstMs + CrawlerService.KST_DAY_MS;

    return new Date(nextCrawlMs).toISOString();
  }
}
