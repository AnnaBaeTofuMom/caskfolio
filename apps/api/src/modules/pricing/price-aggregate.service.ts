import { Injectable } from '@nestjs/common';

type Method = 'WEIGHTED_MEDIAN' | 'EXTERNAL_MEDIAN' | 'INTERNAL_MEDIAN' | 'HIDDEN';

interface Snapshot {
  price: number;
  weight: number;
}

@Injectable()
export class PriceAggregateService {
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
