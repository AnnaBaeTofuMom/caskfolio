import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

const MIN_BRAND_COUNT = 100;
const MIN_PRODUCT_COUNT = 120;
const MIN_VARIANT_COUNT = 120;
const WHISKYHUNTER_API_BASE = 'https://whiskyhunter.net/api';

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

    await this.syncWhiskyHunterCatalog();

    const [nextBrandCount, nextProductCount, nextVariantCount] = await Promise.all([
      this.prisma.brand.count(),
      this.prisma.product.count(),
      this.prisma.variant.count()
    ]);

    this.logger.log(
      `Catalog auto-seed completed brands:${brandCount}->${nextBrandCount}, products:${productCount}->${nextProductCount}, variants:${variantCount}->${nextVariantCount}, mode=${shouldSeedBrands || shouldSeedCatalog ? 'backfill' : 'sync'}`
    );
  }

  private async syncWhiskyHunterCatalog() {
    const enabled = (process.env.WHISKYHUNTER_SYNC_ON_BOOT ?? 'true').toLowerCase() !== 'false';
    if (!enabled) return;

    const rows = await this.fetchWhiskyHunterDistilleries();
    if (!rows.length) {
      this.logger.warn('WhiskyHunter catalog sync skipped: no distillery rows returned');
      return;
    }

    let brandUpserts = 0;
    let lineUpserts = 0;
    let variantCreates = 0;

    for (const row of rows) {
      const brandName = this.extractBrandName(row);
      if (!brandName) continue;

      const brand = await this.prisma.brand.upsert({
        where: { name: brandName },
        create: { name: brandName },
        update: {}
      });
      brandUpserts += 1;

      const region = this.extractRegion(row);
      const lines = await this.resolveWhiskyHunterLines(brandName);
      for (const line of lines) {
        const product = await this.prisma.product.upsert({
          where: { brandId_name: { brandId: brand.id, name: line } },
          create: { brandId: brand.id, name: line },
          update: {}
        });
        lineUpserts += 1;

        const existingVariant = await this.prisma.variant.findFirst({
          where: {
            productId: product.id,
            bottleSize: 700,
            releaseYear: null,
            region: region ?? null,
            specialTag: 'WhiskyHunter Sync'
          }
        });
        if (existingVariant) continue;

        await this.prisma.variant.create({
          data: {
            productId: product.id,
            bottleSize: 700,
            releaseYear: null,
            region: region ?? null,
            specialTag: 'WhiskyHunter Sync'
          }
        });
        variantCreates += 1;
      }
    }

    this.logger.log(
      `WhiskyHunter sync completed (additive-only): brands=${brandUpserts}, lines=${lineUpserts}, newVariants=${variantCreates}`
    );
  }

  private async fetchWhiskyHunterDistilleries(): Promise<Array<Record<string, unknown>>> {
    const candidates = ['/distilleries_info/', '/distilleries_info'];
    for (const path of candidates) {
      const list = await this.fetchJsonArray(`${WHISKYHUNTER_API_BASE}${path}`);
      if (list.length) return list;
    }
    return [];
  }

  private async resolveWhiskyHunterLines(brandName: string): Promise<string[]> {
    const fallback = [BRAND_DEFAULT_LINE_OVERRIDES[brandName] ?? 'Core Range'];
    const query = encodeURIComponent(brandName);
    const candidates = [
      `${WHISKYHUNTER_API_BASE}/search?q=${query}`,
      `${WHISKYHUNTER_API_BASE}/search/?q=${query}`,
      `${WHISKYHUNTER_API_BASE}/whiskies_data/?q=${query}`,
      `${WHISKYHUNTER_API_BASE}/whiskies_data?q=${query}`
    ];

    const extracted = new Set<string>(fallback);

    for (const url of candidates) {
      const list = await this.fetchJsonArray(url);
      if (!list.length) continue;

      for (const row of list) {
        const raw = this.pickString(row, ['name', 'title', 'whisky_name', 'bottle_name', 'expression', 'product_name']);
        if (!raw) continue;
        const normalized = this.normalizeLineName(brandName, raw);
        if (normalized) extracted.add(normalized);
      }
      if (extracted.size > fallback.length) break;
    }

    return [...extracted].slice(0, 300);
  }

  private async fetchJsonArray(url: string): Promise<Array<Record<string, unknown>>> {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) return [];
      const payload = (await response.json()) as unknown;
      if (Array.isArray(payload)) return payload.filter((row): row is Record<string, unknown> => this.isRecord(row));
      if (this.isRecord(payload)) {
        const nested = ['results', 'items', 'data']
          .map((key) => payload[key])
          .find((value): value is unknown[] => Array.isArray(value));
        if (nested) return nested.filter((row): row is Record<string, unknown> => this.isRecord(row));
      }
      return [];
    } catch {
      return [];
    }
  }

  private extractBrandName(row: Record<string, unknown>) {
    const picked = this.pickString(row, ['distillery', 'distillery_name', 'brand', 'name', 'producer']);
    if (!picked) return null;
    const normalized = picked.replace(/\s+/g, ' ').trim();
    if (!normalized || normalized.length < 2) return null;
    return normalized.slice(0, 120);
  }

  private extractRegion(row: Record<string, unknown>) {
    const picked = this.pickString(row, ['region', 'country', 'location']);
    if (!picked) return null;
    return picked.replace(/\s+/g, ' ').trim().slice(0, 80) || null;
  }

  private normalizeLineName(brandName: string, raw: string) {
    const compact = raw.replace(/\s+/g, ' ').trim();
    if (!compact) return null;

    const lowerBrand = brandName.toLowerCase();
    let line = compact;
    if (compact.toLowerCase().startsWith(lowerBrand)) {
      line = compact.slice(brandName.length).trim();
    }
    line = line.replace(/^[-:|/]+/, '').trim();
    if (!line) return null;
    if (line.length > 120) line = line.slice(0, 120);
    return line;
  }

  private pickString(row: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
      const value = row[key];
      if (typeof value === 'string' && value.trim()) return value;
    }
    return null;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
