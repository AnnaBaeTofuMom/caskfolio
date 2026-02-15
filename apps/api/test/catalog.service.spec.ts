import { describe, expect, it, vi } from 'vitest';
import { CatalogService } from '../src/modules/catalog/catalog.service.js';

describe('CatalogService', () => {
  it('filters brands by normalized contains (user-facing search)', async () => {
    const prisma: any = {
      brand: {
        findMany: vi.fn().mockResolvedValue([{ id: 'b1', name: 'The Macallan' }, { id: 'b2', name: 'Ardbeg' }])
      }
    };

    const service = new CatalogService(prisma);
    const rows = await service.brands('macallan');

    expect(rows.map((row: any) => row.name)).toEqual(['The Macallan']);
  });

  it('filters products by contains', async () => {
    const prisma: any = {
      product: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'p1', name: 'Sherry Oak', brandId: 'b1' },
          { id: 'p2', name: 'Double Cask', brandId: 'b1' }
        ])
      }
    };

    const service = new CatalogService(prisma);
    const rows = await service.products('b1', 'double');

    expect(rows.map((row: any) => row.name)).toEqual(['Double Cask']);
  });

  it('filters variants by normalized contains', async () => {
    const prisma: any = {
      variant: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'v1', releaseYear: 2024, bottleSize: 700, region: 'Speyside', specialTag: 'Double Cask' },
          { id: 'v2', releaseYear: null, bottleSize: 700, region: 'Islay', specialTag: 'Core Range' }
        ])
      }
    };

    const service = new CatalogService(prisma);
    const rows = await service.variants('p1', 'double');

    expect(rows.map((row: any) => row.id)).toEqual(['v1']);
  });
});
