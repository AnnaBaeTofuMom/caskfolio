import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PriceAggregateService } from '../pricing/price-aggregate.service.js';

@Injectable()
export class CrawlerService {
  private readonly logger = new Logger(CrawlerService.name);
  private static readonly KST_OFFSET_HOURS = 9;
  private static readonly KST_DAY_MS = 24 * 60 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly priceAggregateService: PriceAggregateService
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM, { timeZone: 'Asia/Seoul' })
  async crawlDailyTop100() {
    this.logger.log('Running daily crawl for top 100 variants at 09:00 KST');

    const topVariants = await this.prisma.whiskyAsset.groupBy({
      by: ['variantId'],
      where: { variantId: { not: null } },
      _count: { variantId: true },
      orderBy: { _count: { variantId: 'desc' } },
      take: 100
    });

    let processed = 0;

    for (const row of topVariants) {
      if (!row.variantId) continue;

      const assets = await this.prisma.whiskyAsset.findMany({
        where: { variantId: row.variantId },
        select: { purchasePrice: true, purchaseDate: true }
      });

      if (!assets.length) continue;

      const sorted = assets
        .map((a) => Number(a.purchasePrice))
        .filter((v) => Number.isFinite(v) && v > 0)
        .sort((a, b) => a - b);

      if (!sorted.length) continue;

      const mid = sorted[Math.floor(sorted.length / 2)];
      const simulatedLow = Math.round(mid * 0.95);
      const simulatedHigh = Math.round(mid * 1.12);

      await this.prisma.marketPriceSnapshot.create({
        data: {
          variantId: row.variantId,
          lowestPrice: simulatedLow,
          highestPrice: simulatedHigh,
          source: 'simulated-google-shopping',
          sourceUrl: null,
          crawledAt: new Date()
        }
      });

      const trusted = this.priceAggregateService.calculateTrustedPrice(
        sorted.map((price) => ({ price, weight: 1 })),
        [
          { price: simulatedLow, weight: 2 },
          { price: simulatedHigh, weight: 2 }
        ]
      );

      await this.prisma.priceAggregate.upsert({
        where: { variantId: row.variantId },
        create: {
          variantId: row.variantId,
          trustedPrice: trusted.trustedPrice,
          method: trusted.method,
          sampleSizeInternal: sorted.length,
          sampleSizeExternal: 2,
          confidence: trusted.confidence
        },
        update: {
          trustedPrice: trusted.trustedPrice,
          method: trusted.method,
          sampleSizeInternal: sorted.length,
          sampleSizeExternal: 2,
          confidence: trusted.confidence
        }
      });

      processed += 1;
    }

    return {
      crawledAt: new Date().toISOString(),
      nextCrawlAt: this.nextCrawlAt(),
      source: 'simulated-google-shopping',
      items: processed
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
