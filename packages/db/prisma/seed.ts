import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const catalogEntries: Array<{ brand: string; line: string; region: string; specialTag: string }> = [
  { brand: 'The Macallan', line: 'Sherry Oak', region: 'Speyside', specialTag: 'Core Release' },
  { brand: 'Glenfiddich', line: 'Core Range', region: 'Speyside', specialTag: 'Core Release' },
  { brand: 'The Glenlivet', line: 'Core Range', region: 'Speyside', specialTag: 'Core Release' },
  { brand: 'Glenmorangie', line: 'Original', region: 'Highland', specialTag: 'Core Release' },
  { brand: 'The Balvenie', line: 'Core Range', region: 'Speyside', specialTag: 'Core Release' },
  { brand: 'Ardbeg', line: 'Core Range', region: 'Islay', specialTag: 'Core Release' },
  { brand: 'Lagavulin', line: 'Core Range', region: 'Islay', specialTag: 'Core Release' },
  { brand: 'Laphroaig', line: 'Core Range', region: 'Islay', specialTag: 'Core Release' },
  { brand: 'Bowmore', line: 'Core Range', region: 'Islay', specialTag: 'Core Release' },
  { brand: 'Bruichladdich', line: 'Classic Laddie', region: 'Islay', specialTag: 'Core Release' },
  { brand: 'Caol Ila', line: 'Core Range', region: 'Islay', specialTag: 'Core Release' },
  { brand: 'Kilchoman', line: 'Machir Bay', region: 'Islay', specialTag: 'Core Release' },
  { brand: 'Bunnahabhain', line: 'Core Range', region: 'Islay', specialTag: 'Core Release' },
  { brand: 'Springbank', line: 'Core Range', region: 'Campbeltown', specialTag: 'Core Release' },
  { brand: 'Longrow', line: 'Core Range', region: 'Campbeltown', specialTag: 'Core Release' },
  { brand: 'Hazelburn', line: 'Core Range', region: 'Campbeltown', specialTag: 'Core Release' },
  { brand: 'Highland Park', line: 'Core Range', region: 'Island', specialTag: 'Core Release' },
  { brand: 'Talisker', line: 'Core Range', region: 'Island', specialTag: 'Core Release' },
  { brand: 'Oban', line: 'Core Range', region: 'Highland', specialTag: 'Core Release' },
  { brand: 'Clynelish', line: 'Core Range', region: 'Highland', specialTag: 'Core Release' },
  { brand: 'The Dalmore', line: 'Core Range', region: 'Highland', specialTag: 'Core Release' },
  { brand: 'GlenDronach', line: 'Core Range', region: 'Highland', specialTag: 'Core Release' },
  { brand: 'BenRiach', line: 'Core Range', region: 'Speyside', specialTag: 'Core Release' },
  { brand: 'Benromach', line: 'Core Range', region: 'Speyside', specialTag: 'Core Release' },
  { brand: 'The GlenAllachie', line: 'Core Range', region: 'Speyside', specialTag: 'Core Release' },
  { brand: 'Aberlour', line: 'Core Range', region: 'Speyside', specialTag: 'Core Release' },
  { brand: 'Glenfarclas', line: 'Core Range', region: 'Speyside', specialTag: 'Core Release' },
  { brand: 'Mortlach', line: 'Core Range', region: 'Speyside', specialTag: 'Core Release' },
  { brand: 'Craigellachie', line: 'Core Range', region: 'Speyside', specialTag: 'Core Release' },
  { brand: 'Balblair', line: 'Core Range', region: 'Highland', specialTag: 'Core Release' },
  { brand: 'Arran', line: 'Core Range', region: 'Island', specialTag: 'Core Release' },
  { brand: 'Ledaig', line: 'Core Range', region: 'Island', specialTag: 'Core Release' },
  { brand: 'Tobermory', line: 'Core Range', region: 'Island', specialTag: 'Core Release' },
  { brand: 'Deanston', line: 'Core Range', region: 'Highland', specialTag: 'Core Release' },
  { brand: 'anCnoc', line: 'Core Range', region: 'Highland', specialTag: 'Core Release' },
  { brand: 'Tomatin', line: 'Core Range', region: 'Highland', specialTag: 'Core Release' },
  { brand: 'Glengoyne', line: 'Core Range', region: 'Highland', specialTag: 'Core Release' },
  { brand: 'Loch Lomond', line: 'Core Range', region: 'Highland', specialTag: 'Core Release' },
  { brand: 'Jura', line: 'Core Range', region: 'Island', specialTag: 'Core Release' },
  { brand: 'Auchentoshan', line: 'Core Range', region: 'Lowland', specialTag: 'Core Release' },
  { brand: 'Bladnoch', line: 'Core Range', region: 'Lowland', specialTag: 'Core Release' },
  { brand: 'Glenkinchie', line: 'Core Range', region: 'Lowland', specialTag: 'Core Release' },
  { brand: 'Edradour', line: 'Core Range', region: 'Highland', specialTag: 'Core Release' },
  { brand: 'Glen Scotia', line: 'Core Range', region: 'Campbeltown', specialTag: 'Core Release' },
  { brand: 'Scapa', line: 'Core Range', region: 'Island', specialTag: 'Core Release' },
  { brand: 'Royal Brackla', line: 'Core Range', region: 'Highland', specialTag: 'Core Release' },
  { brand: 'Glen Grant', line: 'Core Range', region: 'Speyside', specialTag: 'Core Release' },
  { brand: 'Ben Nevis', line: 'Core Range', region: 'Highland', specialTag: 'Core Release' },
  { brand: 'Ardnamurchan', line: 'Core Range', region: 'Highland', specialTag: 'Core Release' },
  { brand: "Nc'nean", line: 'Core Range', region: 'Highland', specialTag: 'Core Release' },
  { brand: 'Wolfburn', line: 'Core Range', region: 'Highland', specialTag: 'Core Release' },
  { brand: 'Kingsbarns', line: 'Core Range', region: 'Lowland', specialTag: 'Core Release' },
  { brand: 'Ardmore', line: 'Core Range', region: 'Highland', specialTag: 'Core Release' },
  { brand: 'Old Pulteney', line: 'Core Range', region: 'Highland', specialTag: 'Core Release' },
  { brand: 'Speyburn', line: 'Core Range', region: 'Speyside', specialTag: 'Core Release' },
  { brand: 'The Glenrothes', line: 'Core Range', region: 'Speyside', specialTag: 'Core Release' },
  { brand: 'Tamdhu', line: 'Core Range', region: 'Speyside', specialTag: 'Core Release' },
  { brand: 'Glenturret', line: 'Core Range', region: 'Highland', specialTag: 'Core Release' },
  { brand: 'Daftmill', line: 'Core Range', region: 'Lowland', specialTag: 'Core Release' },
  { brand: 'Yamazaki', line: 'Core Range', region: 'Japan', specialTag: 'Core Release' },
  { brand: 'Hakushu', line: 'Core Range', region: 'Japan', specialTag: 'Core Release' },
  { brand: 'Hibiki', line: 'Core Range', region: 'Japan', specialTag: 'Core Release' },
  { brand: 'The Chita', line: 'Core Range', region: 'Japan', specialTag: 'Core Release' },
  { brand: 'Toki', line: 'Core Range', region: 'Japan', specialTag: 'Core Release' },
  { brand: 'Nikka Yoichi', line: 'Core Range', region: 'Japan', specialTag: 'Core Release' },
  { brand: 'Nikka Miyagikyo', line: 'Core Range', region: 'Japan', specialTag: 'Core Release' },
  { brand: 'Nikka From The Barrel', line: 'Core Range', region: 'Japan', specialTag: 'Core Release' },
  { brand: 'Mars Komagatake', line: 'Core Range', region: 'Japan', specialTag: 'Core Release' },
  { brand: 'Chichibu', line: 'Core Range', region: 'Japan', specialTag: 'Core Release' },
  { brand: 'Akashi White Oak', line: 'Core Range', region: 'Japan', specialTag: 'Core Release' },
  { brand: 'Fuji', line: 'Core Range', region: 'Japan', specialTag: 'Core Release' },
  { brand: 'Kanosuke', line: 'Core Range', region: 'Japan', specialTag: 'Core Release' },
  { brand: 'Shizuoka', line: 'Core Range', region: 'Japan', specialTag: 'Core Release' },
  { brand: 'The Kurayoshi', line: 'Core Range', region: 'Japan', specialTag: 'Core Release' },
  { brand: 'Bushmills', line: 'Core Range', region: 'Ireland', specialTag: 'Core Release' },
  { brand: 'Jameson', line: 'Core Range', region: 'Ireland', specialTag: 'Core Release' },
  { brand: 'Redbreast', line: 'Core Range', region: 'Ireland', specialTag: 'Core Release' },
  { brand: 'Green Spot', line: 'Core Range', region: 'Ireland', specialTag: 'Core Release' },
  { brand: 'Yellow Spot', line: 'Core Range', region: 'Ireland', specialTag: 'Core Release' },
  { brand: 'Midleton', line: 'Core Range', region: 'Ireland', specialTag: 'Core Release' },
  { brand: 'Powers', line: 'Core Range', region: 'Ireland', specialTag: 'Core Release' },
  { brand: 'Teeling', line: 'Core Range', region: 'Ireland', specialTag: 'Core Release' },
  { brand: 'Tullamore D.E.W.', line: 'Core Range', region: 'Ireland', specialTag: 'Core Release' },
  { brand: "Writer's Tears", line: 'Core Range', region: 'Ireland', specialTag: 'Core Release' },
  { brand: 'Dingle', line: 'Core Range', region: 'Ireland', specialTag: 'Core Release' },
  { brand: 'West Cork', line: 'Core Range', region: 'Ireland', specialTag: 'Core Release' },
  { brand: 'Waterford', line: 'Core Range', region: 'Ireland', specialTag: 'Core Release' },
  { brand: 'Roe & Co', line: 'Core Range', region: 'Ireland', specialTag: 'Core Release' },
  { brand: "Maker's Mark", line: 'Core Range', region: 'USA', specialTag: 'Core Release' },
  { brand: 'Woodford Reserve', line: 'Core Range', region: 'USA', specialTag: 'Core Release' },
  { brand: 'Wild Turkey', line: 'Core Range', region: 'USA', specialTag: 'Core Release' },
  { brand: 'Four Roses', line: 'Core Range', region: 'USA', specialTag: 'Core Release' },
  { brand: 'Buffalo Trace', line: 'Core Range', region: 'USA', specialTag: 'Core Release' },
  { brand: "Blanton's", line: 'Core Range', region: 'USA', specialTag: 'Core Release' },
  { brand: 'Elijah Craig', line: 'Core Range', region: 'USA', specialTag: 'Core Release' },
  { brand: 'Knob Creek', line: 'Core Range', region: 'USA', specialTag: 'Core Release' },
  { brand: 'Bulleit', line: 'Core Range', region: 'USA', specialTag: 'Core Release' },
  { brand: "Michter's", line: 'Core Range', region: 'USA', specialTag: 'Core Release' },
  { brand: "Jack Daniel's", line: 'Core Range', region: 'USA', specialTag: 'Core Release' },
  { brand: 'Crown Royal', line: 'Core Range', region: 'Canada', specialTag: 'Core Release' }
];

async function main() {
  for (const entry of catalogEntries) {
    const brand = await prisma.brand.upsert({
      where: { name: entry.brand },
      create: { name: entry.brand },
      update: {}
    });

    const product = await prisma.product.upsert({
      where: { brandId_name: { brandId: brand.id, name: entry.line } },
      create: { brandId: brand.id, name: entry.line },
      update: {}
    });

    const existingVariant = await prisma.variant.findFirst({
      where: {
        productId: product.id,
        releaseYear: null,
        bottleSize: 700,
        region: entry.region,
        specialTag: entry.specialTag
      }
    });

    if (!existingVariant) {
      await prisma.variant.create({
        data: {
          productId: product.id,
          releaseYear: null,
          bottleSize: 700,
          region: entry.region,
          specialTag: entry.specialTag
        }
      });
    }
  }

  await prisma.user.upsert({
    where: { email: 'demo@caskfolio.com' },
    create: {
      email: 'demo@caskfolio.com',
      username: 'demo',
      name: 'Demo User',
      role: 'USER'
    },
    update: {}
  });
}

main().finally(async () => {
  await prisma.$disconnect();
});
