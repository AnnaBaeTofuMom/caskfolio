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

    const rows = await this.fetchWhiskyHunterWhiskies();
    if (!rows.length) {
      this.logger.warn('WhiskyHunter catalog sync skipped: no whiskies_data rows returned');
      return;
    }

    const touchedBrands = new Set<string>();
    const touchedProducts = new Set<string>();
    let variantCreates = 0;

    for (const row of rows) {
      const parsed = this.parseWhiskyHunterRow(row);
      if (!parsed) continue;

      const brand = await this.prisma.brand.upsert({
        where: { name: parsed.brandName },
        create: { name: parsed.brandName },
        update: {}
      });
      touchedBrands.add(brand.id);

      const product = await this.prisma.product.upsert({
        where: { brandId_name: { brandId: brand.id, name: parsed.lineName } },
        create: { brandId: brand.id, name: parsed.lineName },
        update: {}
      });
      touchedProducts.add(product.id);

      const existingVariant = await this.prisma.variant.findFirst({
        where: {
          productId: product.id,
          bottleSize: parsed.bottleSize,
          releaseYear: parsed.releaseYear,
          region: parsed.region,
          specialTag: parsed.versionTag
        }
      });
      if (existingVariant) continue;

      await this.prisma.variant.create({
        data: {
          productId: product.id,
          bottleSize: parsed.bottleSize,
          releaseYear: parsed.releaseYear,
          region: parsed.region,
          specialTag: parsed.versionTag
        }
      });
      variantCreates += 1;
    }

    this.logger.log(
      `WhiskyHunter sync completed (additive-only): brands=${touchedBrands.size}, lines=${touchedProducts.size}, newVariants=${variantCreates}`
    );
  }

  private async fetchWhiskyHunterWhiskies(): Promise<Array<Record<string, unknown>>> {
    const candidates = [
      `${WHISKYHUNTER_API_BASE}/whiskies_data/?format=json`,
      `${WHISKYHUNTER_API_BASE}/whiskies_data/`,
      `${WHISKYHUNTER_API_BASE}/whiskies_data?format=json`,
      `${WHISKYHUNTER_API_BASE}/whiskies_data`
    ];
    for (const url of candidates) {
      const list = await this.fetchJsonCollection(url);
      if (list.length) return list;
    }
    return [];
  }

  private async fetchJsonCollection(url: string): Promise<Array<Record<string, unknown>>> {
    const collected: Array<Record<string, unknown>> = [];
    const seen = new Set<string>();
    let nextUrl: string | null = url;

    while (nextUrl && collected.length < 200000) {
      if (seen.has(nextUrl)) break;
      seen.add(nextUrl);
      const payload = await this.fetchJson(nextUrl);
      if (!payload) break;

      const rows = this.extractRows(payload);
      collected.push(...rows);

      if (Array.isArray(payload)) break;
      if (!this.isRecord(payload)) break;
      nextUrl = this.extractNextUrl(payload, nextUrl);
    }

    return collected;
  }

  private async fetchJson(url: string): Promise<unknown | null> {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) return null;
      return (await response.json()) as unknown;
    } catch {
      return null;
    }
  }

  private extractRows(payload: unknown): Array<Record<string, unknown>> {
    if (Array.isArray(payload)) {
      return payload.filter((row): row is Record<string, unknown> => this.isRecord(row));
    }
    if (!this.isRecord(payload)) return [];

    const nested = ['results', 'items', 'data', 'whiskies']
      .map((key) => payload[key])
      .find((value): value is unknown[] => Array.isArray(value));
    if (!nested) return [];
    return nested.filter((row): row is Record<string, unknown> => this.isRecord(row));
  }

  private extractNextUrl(payload: Record<string, unknown>, currentUrl: string): string | null {
    const next = payload.next;
    if (typeof next !== 'string' || !next.trim()) return null;
    if (/^https?:\/\//i.test(next)) return next;
    try {
      return new URL(next, currentUrl).toString();
    } catch {
      return null;
    }
  }

  private parseWhiskyHunterRow(row: Record<string, unknown>) {
    const brandName = this.extractBrandName(row);
    if (!brandName) return null;

    const fullName =
      this.pickString(row, ['full_name']) ??
      this.pickString(row, ['name', 'title', 'whisky_name', 'bottle_name', 'expression', 'product_name']);
    const explicitLine = this.pickString(row, ['line', 'product_line', 'series', 'range', 'collection']);
    const explicitVersion = this.pickString(row, ['version', 'age_statement', 'release', 'edition']);

    const parts = this.splitLineAndVersion(brandName, fullName ?? explicitLine ?? 'Core Range', explicitLine, explicitVersion);
    return {
      brandName,
      lineName: parts.lineName,
      versionTag: parts.versionTag,
      region: this.extractRegion(row),
      bottleSize: this.extractBottleSize(row),
      releaseYear: this.extractReleaseYear(row)
    };
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

  private splitLineAndVersion(brandName: string, raw: string, explicitLine?: string | null, explicitVersion?: string | null) {
    const compact = raw.replace(/\s+/g, ' ').trim();
    if (!compact) return { lineName: 'Core Range', versionTag: 'WhiskyHunter Sync' };

    const lowerBrand = brandName.toLowerCase();
    let rest = compact;
    if (compact.toLowerCase().startsWith(lowerBrand)) {
      rest = compact.slice(brandName.length).trim();
    }
    rest = rest.replace(/^[-:|/]+/, '').trim();

    let lineName = (explicitLine ?? '').replace(/\s+/g, ' ').trim();
    let versionTag = (explicitVersion ?? '').replace(/\s+/g, ' ').trim();

    if (!lineName) {
      const markerMatch = rest.match(
        /\b(\d{1,3}\s*(?:yo|yr|year|years)\b|\d{4}\b|\d{2,3}(?:\.\d+)?%\b|batch\b|edition\b|release\b|single cask\b|cask strength\b)/i
      );
      if (markerMatch && markerMatch.index && markerMatch.index > 0) {
        lineName = rest.slice(0, markerMatch.index).trim();
        if (!versionTag) versionTag = rest.slice(markerMatch.index).trim();
      } else {
        const segments = rest
          .split(/\s[-–|:/]\s|,\s/)
          .map((part) => part.trim())
          .filter(Boolean);
        if (segments.length > 1) {
          lineName = segments[0];
          if (!versionTag) versionTag = segments.slice(1).join(' ');
        } else {
          lineName = rest || 'Core Range';
        }
      }
    }

    if (!versionTag) {
      versionTag = /core range/i.test(lineName) ? 'Core Release' : lineName;
    }

    return {
      lineName: lineName.slice(0, 120),
      versionTag: versionTag.slice(0, 120)
    };
  }

  private extractReleaseYear(row: Record<string, unknown>) {
    const direct = this.pickString(row, ['release_year', 'year', 'vintage']);
    if (direct) {
      const match = direct.match(/\b(19|20)\d{2}\b/);
      if (match) return Number(match[0]);
    }
    const fullName = this.pickString(row, ['full_name', 'name']);
    if (!fullName) return null;
    const match = fullName.match(/\b(19|20)\d{2}\b/);
    return match ? Number(match[0]) : null;
  }

  private extractBottleSize(row: Record<string, unknown>) {
    const picked = this.pickString(row, ['bottle_size', 'bottle_size_ml', 'size', 'volume']);
    if (!picked) return 700;
    const normalized = picked.toLowerCase();
    const literMatch = normalized.match(/(\d+(?:\.\d+)?)\s*l\b/);
    if (literMatch) return Math.round(Number(literMatch[1]) * 1000);
    const mlMatch = normalized.match(/(\d{3,4})\s*ml\b|^(\d{3,4})$/);
    const parsed = mlMatch ? Number(mlMatch[1] ?? mlMatch[2]) : Number.NaN;
    if (!Number.isFinite(parsed) || parsed < 100 || parsed > 4000) return 700;
    return parsed;
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
