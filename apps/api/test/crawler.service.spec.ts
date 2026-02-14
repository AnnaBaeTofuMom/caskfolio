import { describe, expect, it } from 'vitest';
import { CrawlerService } from '../src/modules/crawler/crawler.service.js';

describe('CrawlerService', () => {
  const service = new CrawlerService();

  it('returns 09:00 KST of the same day when current time is before 09:00 KST', () => {
    const reference = new Date('2026-02-13T23:30:00.000Z'); // 2026-02-14 08:30 KST
    expect(service.nextCrawlAt(reference)).toBe('2026-02-14T00:00:00.000Z');
  });

  it('returns 09:00 KST of the next day when current time is after 09:00 KST', () => {
    const reference = new Date('2026-02-14T01:00:00.000Z'); // 2026-02-14 10:00 KST
    expect(service.nextCrawlAt(reference)).toBe('2026-02-15T00:00:00.000Z');
  });
});
