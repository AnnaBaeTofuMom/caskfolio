import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async brands(query?: string) {
    const rows = await this.prisma.brand.findMany({
      orderBy: { name: 'asc' },
      take: 500
    });

    return this.filterByContains(rows, (row) => row.name, query);
  }

  async products(brandId?: string, query?: string) {
    const rows = await this.prisma.product.findMany({
      where: {
        ...(brandId ? { brandId } : {})
      },
      orderBy: { name: 'asc' },
      take: 500
    });

    return this.filterByContains(rows, (row) => row.name, query);
  }

  async variants(productId?: string, query?: string) {
    const rows = await this.prisma.variant.findMany({
      where: {
        ...(productId ? { productId } : {})
      },
      orderBy: [{ releaseYear: 'desc' }],
      take: 500
    });

    return this.filterByContains(
      rows,
      (row) => [row.region ?? '', row.specialTag ?? '', row.releaseYear ? String(row.releaseYear) : '', row.bottleSize ? `${row.bottleSize}ml` : ''].join(' '),
      query
    );
  }

  private filterByContains<T>(rows: T[], getText: (row: T) => string, query?: string) {
    const q = this.normalizeQuery(query);
    if (!q) return rows;

    return rows.filter((row) => this.normalizeText(getText(row)).includes(q));
  }

  private normalizeQuery(value?: string) {
    return this.normalizeText(value ?? '');
  }

  private normalizeText(value: string) {
    return value
      .toLowerCase()
      .replace(/\bthe\b/g, '')
      .replace(/[^a-z0-9가-힣]+/g, '')
      .trim();
  }
}
