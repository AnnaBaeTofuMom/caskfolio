import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

const MIN_BRAND_COUNT = 100;
const MIN_PRODUCT_COUNT = 120;
const MIN_VARIANT_COUNT = 120;

const CATALOG_BRANDS: string[] = [
  'The Macallan',
  'Glenfiddich',
  'The Glenlivet',
  'Glenmorangie',
  'The Balvenie',
  'Ardbeg',
  'Lagavulin',
  'Laphroaig',
  'Bowmore',
  'Bruichladdich',
  'Caol Ila',
  'Kilchoman',
  'Bunnahabhain',
  'Springbank',
  'Longrow',
  'Hazelburn',
  'Highland Park',
  'Talisker',
  'Oban',
  'Clynelish',
  'The Dalmore',
  'GlenDronach',
  'BenRiach',
  'Benromach',
  'The GlenAllachie',
  'Aberlour',
  'Glenfarclas',
  'Mortlach',
  'Craigellachie',
  'Balblair',
  'Arran',
  'Ledaig',
  'Tobermory',
  'Deanston',
  'anCnoc',
  'Tomatin',
  'Glengoyne',
  'Loch Lomond',
  'Jura',
  'Auchentoshan',
  'Bladnoch',
  'Glenkinchie',
  'Edradour',
  'Glen Scotia',
  'Scapa',
  'Royal Brackla',
  'Glen Grant',
  'Ben Nevis',
  'Ardnamurchan',
  'Wolfburn',
  'Kingsbarns',
  'Ardmore',
  'Old Pulteney',
  'Speyburn',
  'The Glenrothes',
  'Tamdhu',
  'Glenturret',
  'Daftmill',
  'Yamazaki',
  'Hakushu',
  'Hibiki',
  'The Chita',
  'Toki',
  'Nikka Yoichi',
  'Nikka Miyagikyo',
  'Nikka From The Barrel',
  'Mars Komagatake',
  'Chichibu',
  'Akashi White Oak',
  'Fuji',
  'Kanosuke',
  'Shizuoka',
  'The Kurayoshi',
  'Bushmills',
  'Jameson',
  'Redbreast',
  'Green Spot',
  'Yellow Spot',
  'Midleton',
  'Powers',
  'Teeling',
  'Tullamore D.E.W.',
  'Dingle',
  'West Cork',
  'Waterford',
  'Roe & Co',
  'Woodford Reserve',
  'Wild Turkey',
  'Four Roses',
  'Buffalo Trace',
  'Elijah Craig',
  'Knob Creek',
  'Bulleit',
  'Crown Royal',
  "Nc'nean",
  "Writer's Tears",
  "Maker's Mark",
  "Blanton's",
  "Michter's",
  "Jack Daniel's"
];

const BRAND_DEFAULT_LINE_OVERRIDES: Record<string, string> = {
  'The Macallan': 'Sherry Oak',
  Glenmorangie: 'Original',
  Bruichladdich: 'Classic Laddie',
  Kilchoman: 'Machir Bay'
};

const BRAND_EXTRA_LINES: Record<string, string[]> = {
  'The Macallan': [
    'Double Cask',
    'Triple Cask Matured',
    'Fine Oak',
    'Rare Cask',
    'Edition Series',
    'Quest Collection',
    'Harmony Collection',
    'A Night On Earth'
  ],
  Glenfiddich: ['12 Years', '15 Solera', '18 Years', '21 Gran Reserva'],
  'The Glenlivet': ['12 Years', '15 French Oak', '18 Years', 'Nadurra'],
  Yamazaki: ['12 Years', '18 Years', 'Limited Edition'],
  Hakushu: ['12 Years', '18 Years', 'Distiller Reserve'],
  Hibiki: ['Japanese Harmony', 'Blender’s Choice', '21 Years']
};

const BRAND_REGION_OVERRIDES: Record<string, string> = {
  Yamazaki: 'Japan',
  Hakushu: 'Japan',
  Hibiki: 'Japan',
  'The Chita': 'Japan',
  Toki: 'Japan',
  'Nikka Yoichi': 'Japan',
  'Nikka Miyagikyo': 'Japan',
  'Nikka From The Barrel': 'Japan',
  'Mars Komagatake': 'Japan',
  Chichibu: 'Japan',
  'Akashi White Oak': 'Japan',
  Fuji: 'Japan',
  Kanosuke: 'Japan',
  Shizuoka: 'Japan',
  'The Kurayoshi': 'Japan',
  Bushmills: 'Ireland',
  Jameson: 'Ireland',
  Redbreast: 'Ireland',
  'Green Spot': 'Ireland',
  'Yellow Spot': 'Ireland',
  Midleton: 'Ireland',
  Powers: 'Ireland',
  Teeling: 'Ireland',
  'Tullamore D.E.W.': 'Ireland',
  Dingle: 'Ireland',
  'West Cork': 'Ireland',
  Waterford: 'Ireland',
  'Roe & Co': 'Ireland',
  "Maker's Mark": 'USA',
  'Woodford Reserve': 'USA',
  'Wild Turkey': 'USA',
  'Four Roses': 'USA',
  'Buffalo Trace': 'USA',
  "Blanton's": 'USA',
  'Elijah Craig': 'USA',
  'Knob Creek': 'USA',
  Bulleit: 'USA',
  "Michter's": 'USA',
  "Jack Daniel's": 'USA',
  'Crown Royal': 'Canada'
};

function buildCatalogEntries() {
  return CATALOG_BRANDS.flatMap((brand) => {
    const defaultLine = BRAND_DEFAULT_LINE_OVERRIDES[brand] ?? 'Core Range';
    const lines = [defaultLine, ...(BRAND_EXTRA_LINES[brand] ?? [])];
    const region = BRAND_REGION_OVERRIDES[brand] ?? 'Scotland';

    return [...new Set(lines)].map((line) => ({
      brand,
      line,
      region,
      specialTag: line === 'Core Range' ? 'Core Release' : line
    }));
  });
}

const CATALOG_ENTRIES = buildCatalogEntries();

@Injectable()
export class CatalogBrandSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CatalogBrandSeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap() {
    const enabled = (process.env.AUTO_SEED_BRANDS_ON_BOOT ?? 'true').toLowerCase() !== 'false';
    if (!enabled) return;

    const [brandCount, productCount, variantCount] = await Promise.all([
      this.prisma.brand.count(),
      this.prisma.product.count(),
      this.prisma.variant.count()
    ]);

    const shouldSeedBrands = brandCount < MIN_BRAND_COUNT;
    const shouldSeedCatalog = productCount < MIN_PRODUCT_COUNT || variantCount < MIN_VARIANT_COUNT;

    for (const name of CATALOG_BRANDS) {
      await this.prisma.brand.upsert({
        where: { name },
        create: { name },
        update: {}
      });
    }

    for (const entry of CATALOG_ENTRIES) {
      const brand = await this.prisma.brand.upsert({
        where: { name: entry.brand },
        create: { name: entry.brand },
        update: {}
      });

      const product = await this.prisma.product.upsert({
        where: { brandId_name: { brandId: brand.id, name: entry.line } },
        create: { brandId: brand.id, name: entry.line },
        update: {}
      });

      const existingVariant = await this.prisma.variant.findFirst({
        where: {
          productId: product.id,
          releaseYear: null,
          bottleSize: 700,
          region: entry.region,
          specialTag: entry.specialTag
        }
      });

      if (!existingVariant) {
        await this.prisma.variant.create({
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

    const [nextBrandCount, nextProductCount, nextVariantCount] = await Promise.all([
      this.prisma.brand.count(),
      this.prisma.product.count(),
      this.prisma.variant.count()
    ]);

    this.logger.log(
      `Catalog auto-seed completed brands:${brandCount}->${nextBrandCount}, products:${productCount}->${nextProductCount}, variants:${variantCount}->${nextVariantCount}, mode=${shouldSeedBrands || shouldSeedCatalog ? 'backfill' : 'sync'}`
    );
  }
}
