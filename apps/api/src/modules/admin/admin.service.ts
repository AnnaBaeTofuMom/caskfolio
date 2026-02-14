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

  exportData() {
    return { status: 'queued', format: 'csv' };
  }
}
