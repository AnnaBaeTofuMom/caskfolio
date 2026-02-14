import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

interface SummaryRow {
  purchasePrice: number;
  trustedPrice: number | null;
}

@Injectable()
export class PortfolioService {
  constructor(private readonly prisma: PrismaService) {}

  computeSummaryFromAssets(rows: SummaryRow[]) {
    const totalPurchaseValue = rows.reduce((sum, row) => sum + row.purchasePrice, 0);
    const totalEstimatedValue = rows.reduce((sum, row) => sum + (row.trustedPrice ?? row.purchasePrice), 0);

    return {
      totalEstimatedValue,
      totalPurchaseValue,
      unrealizedPnL: totalEstimatedValue - totalPurchaseValue,
      assetCount: rows.length
    };
  }

  async summary(userEmail: string) {
    const user = await this.ensureUser(userEmail);
    const assets = await this.prisma.whiskyAsset.findMany({
      where: { userId: user.id },
      include: { variant: { include: { priceAggregate: true } } }
    });

    return this.computeSummaryFromAssets(
      assets.map((asset: (typeof assets)[number]) => ({
        purchasePrice: Number(asset.purchasePrice),
        trustedPrice: asset.variant?.priceAggregate?.trustedPrice ? Number(asset.variant.priceAggregate.trustedPrice) : null
      }))
    );
  }

  async chart(userEmail: string) {
    const user = await this.ensureUser(userEmail);
    const assets = await this.prisma.whiskyAsset.findMany({
      where: { userId: user.id },
      include: { variant: { include: { priceAggregate: true } } },
      orderBy: { purchaseDate: 'asc' }
    });

    const monthly = new Map<string, number>();
    let cumulative = 0;

    for (const asset of assets) {
      cumulative += asset.variant?.priceAggregate?.trustedPrice
        ? Number(asset.variant.priceAggregate.trustedPrice)
        : Number(asset.purchasePrice);
      const key = `${asset.purchaseDate.getUTCFullYear()}-${String(asset.purchaseDate.getUTCMonth() + 1).padStart(2, '0')}-01`;
      monthly.set(key, cumulative);
    }

    return Array.from(monthly.entries()).map(([date, value]) => ({ date, value }));
  }

  async createShareLink(userEmail: string, selectedAssetIds: string[]) {
    const user = await this.ensureUser(userEmail);

    return {
      url: `https://example.com/u/${user.username}`,
      selectedAssetIds,
      visibility: 'PUBLIC'
    };
  }

  private async ensureUser(email: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) return existing;

    const usernameBase = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() || 'user';
    const username = `${usernameBase}${Date.now().toString().slice(-6)}`;

    return this.prisma.user.create({
      data: {
        email,
        username,
        name: usernameBase || 'User'
      }
    });
  }
}
