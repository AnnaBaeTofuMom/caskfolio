import { describe, expect, it } from 'vitest';
import { isAssetWidgetSelectable } from '../components/feed-post-form';

describe('feed-post-form widget availability', () => {
  it('disables asset widget when user has no assets', () => {
    expect(isAssetWidgetSelectable(0)).toBe(false);
  });

  it('enables asset widget when user has at least one asset', () => {
    expect(isAssetWidgetSelectable(1)).toBe(true);
  });
});
