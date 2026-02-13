import { PrismaClient, Visibility, BottleCondition, StorageLocation } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const brand = await prisma.brand.upsert({
    where: { name: 'Macallan' },
    create: { name: 'Macallan' },
    update: {}
  });

  const product = await prisma.product.upsert({
    where: { brandId_name: { brandId: brand.id, name: 'Sherry Oak' } },
    create: { brandId: brand.id, name: 'Sherry Oak' },
    update: {}
  });

  const variant = await prisma.variant.create({
    data: {
      productId: product.id,
      releaseYear: 2022,
      bottleSize: 700,
      region: 'Speyside',
      specialTag: '18 Years'
    }
  });

  const user = await prisma.user.upsert({
    where: { email: 'demo@caskfolio.com' },
    create: {
      email: 'demo@caskfolio.com',
      username: 'demo',
      name: 'Demo User',
      role: 'USER'
    },
    update: {}
  });

  await prisma.whiskyAsset.create({
    data: {
      userId: user.id,
      variantId: variant.id,
      purchasePrice: 350000,
      purchaseDate: new Date('2025-06-20'),
      bottleCondition: BottleCondition.SEALED,
      boxAvailable: true,
      storageLocation: StorageLocation.HOME,
      visibility: Visibility.PUBLIC,
      caption: 'Weekend dram investment'
    }
  });
}

main().finally(async () => {
  await prisma.$disconnect();
});
