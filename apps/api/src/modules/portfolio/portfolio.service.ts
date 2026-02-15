import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
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
      where: { userId: user.id, isFeedPost: false },
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
      where: { userId: user.id, isFeedPost: false },
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
    const slug = this.generateShareSlug();
    const selected = selectedAssetIds.length
      ? selectedAssetIds
      : (
          await this.prisma.whiskyAsset.findMany({
            where: { userId: user.id, visibility: 'PUBLIC', isFeedPost: false },
            select: { id: true },
            take: 30
          })
        ).map((asset: { id: string }) => asset.id);

    await this.prisma.portfolioShare.create({
      data: {
        userId: user.id,
        slug,
        selectedAssetIds: selected
      }
    });

    return {
      url: `https://example.com/portfolio/share/${slug}`,
      selectedAssetIds: selected,
      visibility: 'PUBLIC'
    };
  }

  async sharedPortfolio(slug: string) {
    const share = await this.prisma.portfolioShare.findUnique({
      where: { slug },
      include: { user: true }
    });

    if (!share) {
      return { found: false };
    }

    const assets = await this.prisma.whiskyAsset.findMany({
      where: {
        id: { in: share.selectedAssetIds },
        visibility: 'PUBLIC'
      },
      include: {
        variant: { include: { product: { include: { brand: true } }, priceAggregate: true } }
      }
    });

    return {
      found: true,
      slug: share.slug,
      owner: { username: share.user.username, name: share.user.name },
      assets: assets.map((asset: (typeof assets)[number]) => ({
        id: asset.id,
        name:
          asset.customProductName ??
          [asset.variant?.product.brand.name, asset.variant?.product.name, asset.variant?.specialTag].filter(Boolean).join(' '),
        trustedPrice: asset.variant?.priceAggregate?.trustedPrice ? Number(asset.variant.priceAggregate.trustedPrice) : null
      }))
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

  private generateShareSlug() {
    return randomBytes(8).toString('hex');
  }
}
