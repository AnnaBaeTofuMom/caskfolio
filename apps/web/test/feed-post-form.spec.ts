import { describe, expect, it } from 'vitest';
import { isAssetWidgetSelectable, resolvePostAssetName } from '../components/feed-post-form';

describe('feed-post-form widget availability', () => {
  it('disables asset widget when user has no assets', () => {
    expect(isAssetWidgetSelectable(0)).toBe(false);
  });

  it('enables asset widget when user has at least one asset', () => {
    expect(isAssetWidgetSelectable(1)).toBe(true);
  });

  it('uses selected asset name for ASSET widget posts', () => {
    expect(
      resolvePostAssetName('ASSET', '내 감상', {
        customProductName: null,
        displayName: 'Macallan 18 Sherry Oak'
      })
    ).toBe('Macallan 18 Sherry Oak');
  });

  it('uses post title for NONE widget posts', () => {
    expect(resolvePostAssetName('NONE', '오늘의 테이스팅', null)).toBe('오늘의 테이스팅');
  });
});
