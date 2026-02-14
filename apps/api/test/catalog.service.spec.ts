import { describe, expect, it, vi } from 'vitest';
import { CatalogService } from '../src/modules/catalog/catalog.service.js';

describe('CatalogService', () => {
  it('passes search query to brand lookup', async () => {
    const prisma: any = {
      brand: {
        findMany: vi.fn().mockResolvedValue([])
      }
    };

    const service = new CatalogService(prisma);
    await service.brands('maca');

    expect(prisma.brand.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          name: {
            contains: 'maca',
            mode: 'insensitive'
          }
        }
      })
    );
  });
});
