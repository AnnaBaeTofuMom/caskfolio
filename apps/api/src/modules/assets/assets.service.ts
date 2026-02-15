import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

interface CreateAssetInput {
  variantId?: string;
  customProductName?: string;
  purchasePrice: number;
  purchaseDate: string;
  bottleCondition: 'SEALED' | 'OPEN';
  boxAvailable?: boolean;
  labelCondition?: string;
  storageLocation?: 'HOME' | 'BAR' | 'VAULT';
  photoUrl?: string | null;
  photoUrls?: string[];
  caption?: string;
  visibility?: 'PRIVATE' | 'PUBLIC';
  isFeedPost?: boolean;
}

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  normalizeCreateInput(input: CreateAssetInput) {
    if (!input.variantId && !input.customProductName) {
      throw new BadRequestException('variantId or customProductName is required');
    }

    return {
      variantId: input.variantId,
      customProductName: input.customProductName,
      purchasePrice: input.purchasePrice,
      purchaseDate: input.purchaseDate,
      bottleCondition: input.bottleCondition,
      boxAvailable: input.boxAvailable ?? false,
      labelCondition: input.labelCondition,
      storageLocation: input.storageLocation ?? 'HOME',
      photoUrl: input.photoUrl,
      photoUrls: input.photoUrls ?? (input.photoUrl ? [input.photoUrl] : []),
      caption: input.caption,
      visibility: input.visibility ?? 'PRIVATE',
      isFeedPost: input.isFeedPost ?? false
    };
  }

  async createAsset(userEmail: string, input: CreateAssetInput) {
    const user = await this.ensureUser(userEmail);
    const normalized = this.normalizeCreateInput(input);

    const created = await this.prisma.whiskyAsset.create({
      data: {
        userId: user.id,
        variantId: normalized.variantId,
        customProductName: normalized.customProductName,
        purchasePrice: normalized.purchasePrice,
        purchaseDate: new Date(normalized.purchaseDate),
        bottleCondition: normalized.bottleCondition,
        boxAvailable: normalized.boxAvailable,
        labelCondition: normalized.labelCondition,
        storageLocation: normalized.storageLocation,
        photoUrl: normalized.photoUrl,
        photoUrls: normalized.photoUrls,
        caption: normalized.caption,
        visibility: normalized.visibility,
        isFeedPost: normalized.isFeedPost
      }
    });

    if (!normalized.variantId && normalized.customProductName) {
      await this.prisma.customProductSubmission.create({
        data: {
          userId: user.id,
          customProductName: normalized.customProductName
        }
      });
    }

    return created;
  }

  async updateAsset(userEmail: string, assetId: string, input: Partial<CreateAssetInput>) {
    const user = await this.ensureUser(userEmail);
    const existing = await this.prisma.whiskyAsset.findFirst({ where: { id: assetId, userId: user.id, deletedAt: null } });

    if (!existing) {
      throw new NotFoundException('asset not found');
    }

    return this.prisma.whiskyAsset.update({
      where: { id: assetId },
      data: {
        variantId: input.variantId,
        customProductName: input.customProductName,
        purchasePrice: input.purchasePrice,
        purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : undefined,
        bottleCondition: input.bottleCondition,
        boxAvailable: input.boxAvailable,
        labelCondition: input.labelCondition,
        storageLocation: input.storageLocation,
        photoUrl: input.photoUrl,
        photoUrls: input.photoUrls,
        caption: input.caption,
        visibility: input.visibility,
        isFeedPost: input.isFeedPost
      }
    });
  }

  async myAssets(userEmail: string) {
    const user = await this.ensureUser(userEmail);
    const assets = await this.prisma.whiskyAsset.findMany({
      where: { userId: user.id, deletedAt: null },
      include: {
        variant: {
          include: {
            product: { include: { brand: true } },
            priceAggregate: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return assets.map((asset: (typeof assets)[number]) => ({
      id: asset.id,
      purchasePrice: Number(asset.purchasePrice),
      purchaseDate: asset.purchaseDate,
      bottleCondition: asset.bottleCondition,
      boxAvailable: asset.boxAvailable,
      photoUrl: asset.photoUrl ?? null,
      photoUrls: asset.photoUrls ?? [],
      caption: asset.caption ?? null,
      visibility: asset.visibility,
      isFeedPost: asset.isFeedPost,
      customProductName: asset.customProductName,
      displayName:
        asset.customProductName ??
        [asset.variant?.product.brand.name, asset.variant?.product.name, asset.variant?.specialTag].filter(Boolean).join(' '),
      trustedPrice: asset.variant?.priceAggregate?.trustedPrice ? Number(asset.variant.priceAggregate.trustedPrice) : null
    }));
  }

  async deleteAsset(userEmail: string, assetId: string) {
    const user = await this.ensureUser(userEmail);
    const existing = await this.prisma.whiskyAsset.findFirst({
      where: { id: assetId, userId: user.id, deletedAt: null }
    });

    if (!existing) {
      throw new NotFoundException('asset not found');
    }

    await this.prisma.whiskyAsset.update({
      where: { id: assetId },
      data: {
        deletedAt: new Date(),
        visibility: 'PRIVATE'
      }
    });

    return { deleted: true, assetId };
  }

  async resetMyAssets(userEmail: string) {
    const user = await this.ensureUser(userEmail);
    const before = await this.prisma.whiskyAsset.count({ where: { userId: user.id } });

    await this.prisma.portfolioShare.deleteMany({ where: { userId: user.id } });
    await this.prisma.whiskyAsset.deleteMany({ where: { userId: user.id } });

    return {
      email: user.email,
      deleted: before
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
