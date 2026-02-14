import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  brands(query?: string) {
    return this.prisma.brand.findMany({
      where: query
        ? {
            name: {
              contains: query,
              mode: 'insensitive'
            }
          }
        : undefined,
      orderBy: { name: 'asc' },
      take: 50
    });
  }

  products(brandId?: string, query?: string) {
    return this.prisma.product.findMany({
      where: {
        ...(brandId ? { brandId } : {}),
        ...(query
          ? {
              name: {
                contains: query,
                mode: 'insensitive'
              }
            }
          : {})
      },
      orderBy: { name: 'asc' },
      take: 80
    });
  }

  variants(productId?: string, query?: string) {
    return this.prisma.variant.findMany({
      where: {
        ...(productId ? { productId } : {}),
        ...(query
          ? {
              OR: [
                { region: { contains: query, mode: 'insensitive' } },
                { specialTag: { contains: query, mode: 'insensitive' } }
              ]
            }
          : {})
      },
      orderBy: [{ releaseYear: 'desc' }],
      take: 100
    });
  }
}
