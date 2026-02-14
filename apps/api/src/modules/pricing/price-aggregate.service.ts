import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

type Method = 'WEIGHTED_MEDIAN' | 'EXTERNAL_MEDIAN' | 'INTERNAL_MEDIAN' | 'HIDDEN';

interface Snapshot {
  price: number;
  weight: number;
}

@Injectable()
export class PriceAggregateService {
  constructor(private readonly prisma: PrismaService) {}

  calculateTrustedPrice(internal: Snapshot[], external: Snapshot[]) {
    const merged = [...internal, ...external].filter((v) => v.price > 0 && v.weight > 0);

    if (merged.length >= 4) {
      return {
        method: 'WEIGHTED_MEDIAN' as Method,
        trustedPrice: this.weightedMedian(merged),
        confidence: this.confidence(merged.length)
      };
    }

    if (external.length >= 3) {
      return {
        method: 'EXTERNAL_MEDIAN' as Method,
        trustedPrice: this.median(external.map((v) => v.price)),
        confidence: this.confidence(external.length)
      };
    }

    if (internal.length >= 3) {
      return {
        method: 'INTERNAL_MEDIAN' as Method,
        trustedPrice: this.median(internal.map((v) => v.price)),
        confidence: this.confidence(internal.length)
      };
    }

    return {
      method: 'HIDDEN' as Method,
      trustedPrice: null,
      confidence: 0
    };
  }

  async getVariantPricingStats(variantId: string) {
    const [internalRows, marketRows, owners] = await Promise.all([
      this.prisma.whiskyAsset.findMany({
        where: { variantId },
        select: { purchasePrice: true }
      }),
      this.prisma.marketPriceSnapshot.findMany({
        where: { variantId },
        orderBy: { crawledAt: 'desc' },
        take: 30
      }),
      this.prisma.whiskyAsset.count({ where: { variantId } })
    ]);

    const internal = internalRows.map((row) => Number(row.purchasePrice));
    const external = marketRows.flatMap((row) => [
      Number(row.lowestPrice),
      Number(row.highestPrice)
    ]);

    const trusted = this.calculateTrustedPrice(
      internal.map((price) => ({ price, weight: 1 })),
      external.map((price) => ({ price, weight: 2 }))
    );

    const platformAverage = internal.length
      ? Math.round((internal.reduce((sum, p) => sum + p, 0) / internal.length) * 100) / 100
      : null;

    return {
      variantId,
      ...trusted,
      platformAverage,
      min: internal.length ? Math.min(...internal) : null,
      max: internal.length ? Math.max(...internal) : null,
      owners
    };
  }

  async getVariantPriceHistory(variantId: string, days = 30) {
    const snapshots = await this.prisma.marketPriceSnapshot.findMany({
      where: {
        variantId,
        crawledAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * days) }
      },
      orderBy: { crawledAt: 'asc' }
    });

    return snapshots.map((snapshot) => ({
      date: snapshot.crawledAt.toISOString().slice(0, 10),
      low: Number(snapshot.lowestPrice),
      high: Number(snapshot.highestPrice)
    }));
  }

  private weightedMedian(items: Snapshot[]): number {
    const sorted = [...items].sort((a, b) => a.price - b.price);
    const totalWeight = sorted.reduce((acc, it) => acc + it.weight, 0);
    let cumulative = 0;

    for (const it of sorted) {
      cumulative += it.weight;
      if (cumulative >= totalWeight / 2) {
        return it.price;
      }
    }

    return sorted[sorted.length - 1]?.price ?? 0;
  }

  private median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  private confidence(samples: number): number {
    if (samples >= 20) return 0.95;
    if (samples >= 10) return 0.8;
    if (samples >= 5) return 0.65;
    return 0.5;
  }
}
