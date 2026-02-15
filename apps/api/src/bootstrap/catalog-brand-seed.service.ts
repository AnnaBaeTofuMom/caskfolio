import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

const MIN_BRAND_COUNT = 100;

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

@Injectable()
export class CatalogBrandSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CatalogBrandSeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap() {
    const enabled = (process.env.AUTO_SEED_BRANDS_ON_BOOT ?? 'true').toLowerCase() !== 'false';
    if (!enabled) return;

    const currentCount = await this.prisma.brand.count();
    if (currentCount >= MIN_BRAND_COUNT) return;

    for (const name of CATALOG_BRANDS) {
      await this.prisma.brand.upsert({
        where: { name },
        create: { name },
        update: {}
      });
    }

    const afterCount = await this.prisma.brand.count();
    this.logger.log(`Catalog brand auto-seed completed: ${currentCount} -> ${afterCount}`);
  }
}

