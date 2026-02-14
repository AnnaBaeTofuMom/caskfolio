import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async metrics() {
    const [totalUsers, activeUsers, totalRegisteredAssets, assets, variants] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { assets: { some: { createdAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) } } } } }),
      this.prisma.whiskyAsset.count(),
      this.prisma.whiskyAsset.findMany({ select: { variantId: true, purchasePrice: true } }),
      this.prisma.variant.findMany({
        include: {
          product: { include: { brand: true } }
        }
      })
    ]);

    const aumByVariant = new Map<string, number>();
    let totalAum = 0;

    for (const asset of assets) {
      const value = Number(asset.purchasePrice);
      totalAum += value;
      if (!asset.variantId) continue;
      aumByVariant.set(asset.variantId, (aumByVariant.get(asset.variantId) ?? 0) + value);
    }

    const variantMap = new Map(
      variants.map((variant) => [variant.id, `${variant.product.brand.name} ${variant.product.name}${variant.specialTag ? ` ${variant.specialTag}` : ''}`])
    );

    const topVariantsByAum = [...aumByVariant.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([variantId, aum]) => ({ variantId, variant: variantMap.get(variantId) ?? variantId, aum }));

    return {
      totalUsers,
      activeUsers,
      totalRegisteredAssets,
      totalAum,
      topVariantsByAum
    };
  }

  createBrand(name: string) {
    return this.prisma.brand.create({ data: { name } });
  }

  createProduct(brandId: string, name: string) {
    return this.prisma.product.create({ data: { brandId, name } });
  }

  createVariant(input: { productId: string; releaseYear?: number; bottleSize?: number; region?: string; specialTag?: string }) {
    return this.prisma.variant.create({ data: input });
  }

  updateBrand(id: string, name: string) {
    return this.prisma.brand.update({ where: { id }, data: { name } });
  }

  deleteBrand(id: string) {
    return this.prisma.brand.delete({ where: { id } });
  }

  updateProduct(id: string, input: { brandId?: string; name?: string }) {
    return this.prisma.product.update({ where: { id }, data: input });
  }

  deleteProduct(id: string) {
    return this.prisma.product.delete({ where: { id } });
  }

  updateVariant(id: string, input: { productId?: string; releaseYear?: number; bottleSize?: number; region?: string; specialTag?: string }) {
    return this.prisma.variant.update({ where: { id }, data: input });
  }

  deleteVariant(id: string) {
    return this.prisma.variant.delete({ where: { id } });
  }

  users() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        role: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 200
    });
  }

  updateUserRole(userId: string, role: 'USER' | 'ADMIN') {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        role: true
      }
    });
  }

  async topHolders(limit = 10) {
    const assets = await this.prisma.whiskyAsset.findMany({
      select: { userId: true, purchasePrice: true }
    });
    const users = await this.prisma.user.findMany({
      select: { id: true, username: true, name: true }
    });

    const userMap = new Map(users.map((user) => [user.id, user]));
    const totals = new Map<string, number>();

    for (const asset of assets) {
      totals.set(asset.userId, (totals.get(asset.userId) ?? 0) + Number(asset.purchasePrice));
    }

    return [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, Math.max(1, limit))
      .map(([userId, aum]) => ({
        userId,
        username: userMap.get(userId)?.username ?? 'unknown',
        name: userMap.get(userId)?.name ?? 'Unknown',
        aum
      }));
  }

  customProducts(status: 'PENDING' | 'APPROVED' | 'REJECTED' = 'PENDING') {
    return this.prisma.customProductSubmission.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
      take: 200
    });
  }

  async approveCustomProduct(submissionId: string, reviewer = 'admin@caskfolio.com', variantId?: string) {
    const submission = await this.prisma.customProductSubmission.update({
      where: { id: submissionId },
      data: {
        status: 'APPROVED',
        reviewedBy: reviewer,
        reviewedAt: new Date(),
        variantId: variantId ?? undefined
      }
    });

    if (variantId) {
      await this.prisma.whiskyAsset.updateMany({
        where: {
          userId: submission.userId,
          customProductName: submission.customProductName,
          variantId: null
        },
        data: {
          variantId
        }
      });
    }

    return { approved: true, submissionId, variantId: variantId ?? null };
  }

  async exportData() {
    const assets = await this.prisma.whiskyAsset.findMany({
      select: { id: true, userId: true, variantId: true, purchasePrice: true, purchaseDate: true, visibility: true }
    });

    const header = 'asset_id,user_id,variant_id,purchase_price,purchase_date,visibility';
    const lines = assets.map(
      (asset) =>
        `${asset.id},${asset.userId},${asset.variantId ?? ''},${Number(asset.purchasePrice)},${asset.purchaseDate.toISOString()},${asset.visibility}`
    );

    return {
      status: 'ready',
      format: 'csv',
      filename: `caskfolio-export-${new Date().toISOString().slice(0, 10)}.csv`,
      csv: [header, ...lines].join('\n')
    };
  }

  createManualMarketPriceSnapshot(input: {
    variantId: string;
    lowestPrice: number;
    highestPrice: number;
    source?: string;
    sourceUrl?: string;
  }) {
    return this.prisma.marketPriceSnapshot.create({
      data: {
        variantId: input.variantId,
        lowestPrice: input.lowestPrice,
        highestPrice: input.highestPrice,
        source: input.source ?? 'admin_manual',
        sourceUrl: input.sourceUrl
      }
    });
  }
}
