import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PriceAggregateService } from '../pricing/price-aggregate.service.js';

@Injectable()
export class CrawlerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CrawlerService.name);
  private static readonly KST_OFFSET_HOURS = 9;
  private static readonly KST_DAY_MS = 24 * 60 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly priceAggregateService: PriceAggregateService
  ) {}

  async onApplicationBootstrap() {
    const runOnBoot = (process.env.CRAWLER_RUN_ON_BOOT ?? 'true').toLowerCase() !== 'false';
    if (!runOnBoot) return;

    setTimeout(() => {
      void this.crawlDailyTop100().catch((error: unknown) => {
        this.logger.error(`Boot crawl failed: ${String(error)}`);
      });
    }, 5000);
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM, { timeZone: 'Asia/Seoul' })
  async crawlDailyTop100(manualVariantIds?: string[]) {
    this.logger.log('Running daily crawl for top 100 variants at 09:00 KST');

    const targetVariantIds = await this.resolveTargetVariantIds(manualVariantIds);

    let processed = 0;

    for (const variantId of targetVariantIds) {
      if (!variantId) continue;

      const assets = await this.prisma.whiskyAsset.findMany({
        where: { variantId, deletedAt: null },
        select: { purchasePrice: true, purchaseDate: true }
      });

      const sorted = assets
        .map((a: (typeof assets)[number]) => Number(a.purchasePrice))
        .filter((v: number) => Number.isFinite(v) && v > 0)
        .sort((a: number, b: number) => a - b);

      const variant = await this.prisma.variant.findUnique({
        where: { id: variantId },
        include: { product: { include: { brand: true } } }
      });

      const query =
        variant && variant.product
          ? [variant.product.brand.name, variant.product.name, variant.specialTag, variant.releaseYear ? String(variant.releaseYear) : null]
              .filter(Boolean)
              .join(' ')
          : variantId;

      const externalRange = await this.fetchExternalRange(variantId, query);
      if (!externalRange && !sorted.length) continue;

      const mid = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
      const simulatedLow = mid > 0 ? Math.round(mid * 0.95) : 0;
      const simulatedHigh = mid > 0 ? Math.round(mid * 1.12) : 0;
      const lowestPrice = externalRange?.lowestPrice ?? simulatedLow;
      const highestPrice = externalRange?.highestPrice ?? simulatedHigh;
      const source = externalRange?.source ?? 'simulated-fallback';
      const sourceUrl = externalRange?.sourceUrl ?? null;

      await this.prisma.marketPriceSnapshot.create({
        data: {
          variantId,
          lowestPrice,
          highestPrice,
          source,
          sourceUrl,
          crawledAt: new Date()
        }
      });

      const trusted = this.priceAggregateService.calculateTrustedPrice(
        sorted.map((price: number) => ({ price, weight: 1 })),
        [
          { price: lowestPrice, weight: 2 },
          { price: highestPrice, weight: 2 }
        ]
      );

      await this.prisma.priceAggregate.upsert({
        where: { variantId },
        create: {
          variantId,
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
      await this.sleep(350);
    }

    return {
      crawledAt: new Date().toISOString(),
      nextCrawlAt: this.nextCrawlAt(),
      source: 'google-shopping-live+fallback',
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

  private async fetchExternalRange(
    variantId: string,
    query: string
  ): Promise<{ lowestPrice: number; highestPrice: number; source: string; sourceUrl?: string } | null> {
    const live = await this.fetchGoogleShoppingRange(query);
    if (live) return live;

    const template = process.env.MARKET_PRICE_SOURCE_URL_TEMPLATE;
    if (!template || !template.includes('{variantId}')) return null;

    const sourceUrl = template.replace('{variantId}', encodeURIComponent(variantId));
    try {
      const response = await fetch(sourceUrl);
      if (!response.ok) return null;

      const data = (await response.json()) as { lowestPrice?: unknown; highestPrice?: unknown };
      const lowestPrice = Number(data.lowestPrice);
      const highestPrice = Number(data.highestPrice);
      if (!Number.isFinite(lowestPrice) || !Number.isFinite(highestPrice) || lowestPrice <= 0 || highestPrice <= 0) {
        return null;
      }

      const sourceHost = this.readHost(sourceUrl);
      return {
        lowestPrice,
        highestPrice,
        source: sourceHost ? `external-${sourceHost}` : 'external-source',
        sourceUrl
      };
    } catch {
      return null;
    }
  }

  private async fetchGoogleShoppingRange(
    query: string
  ): Promise<{ lowestPrice: number; highestPrice: number; source: string; sourceUrl?: string } | null> {
    const playwright = await this.loadPlaywright();
    if (!playwright?.chromium) return null;

    const sourceUrl = `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query)}`;
    let browser: any | null = null;
    try {
      browser = await playwright.chromium.launch({ headless: true });
      const context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        locale: 'en-US'
      });
      const page = await context.newPage();
      await page.goto(sourceUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1200);
      const text = await page.locator('body').innerText();
      const prices = this.extractPrices(text);
      if (!prices.length) return null;

      return {
        lowestPrice: Math.min(...prices),
        highestPrice: Math.max(...prices),
        source: 'google-shopping-live',
        sourceUrl
      };
    } catch {
      return null;
    } finally {
      await browser?.close();
    }
  }

  private extractPrices(text: string): number[] {
    const symbols = text.match(/(?:₩|KRW|\$)\s?[0-9][0-9,]*/g) ?? [];
    const parsed = symbols
      .map((value) => Number(value.replace(/[^0-9]/g, '')))
      .filter((value) => Number.isFinite(value) && value >= 1000 && value <= 100000000)
      .sort((a, b) => a - b);

    if (!parsed.length) return [];
    const min = parsed[0];
    const maxAllowed = min * 8;
    return parsed.filter((value) => value <= maxAllowed);
  }

  private async loadPlaywright(): Promise<{ chromium?: any } | null> {
    try {
      const importer = new Function('name', 'return import(name)') as (name: string) => Promise<any>;
      return await importer('playwright');
    } catch {
      this.logger.warn('Playwright is not installed. Falling back to simulated/external price range.');
      return null;
    }
  }

  private async resolveTargetVariantIds(manualVariantIds?: string[]) {
    if (manualVariantIds?.length) return [...new Set(manualVariantIds.filter(Boolean))].slice(0, 100);

    const fromEnv = (process.env.CRAWLER_TARGET_VARIANT_IDS ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    if (fromEnv.length) return [...new Set(fromEnv)].slice(0, 100);

    const topVariants = await this.prisma.whiskyAsset.groupBy({
      by: ['variantId'],
      where: { variantId: { not: null }, deletedAt: null },
      _count: { variantId: true },
      orderBy: { _count: { variantId: 'desc' } },
      take: 100
    });
    const grouped = topVariants
      .map((row: (typeof topVariants)[number]) => row.variantId)
      .filter((value: string | null): value is string => Boolean(value));

    if (grouped.length) return grouped;

    const catalogVariants = await this.prisma.variant.findMany({
      select: { id: true },
      take: 100
    });
    return catalogVariants.map((variant: (typeof catalogVariants)[number]) => variant.id);
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private readHost(url: string): string | null {
    try {
      return new URL(url).host;
    } catch {
      return null;
    }
  }
}
