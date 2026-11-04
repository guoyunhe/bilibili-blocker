import { describe, expect, it } from 'vitest';

import { getUidFromUrl } from './uid';

describe('getUidFromUrl', () => {
  it('parses a UID from a standard profile URL', () => {
    expect(getUidFromUrl('https://space.bilibili.com/506614734?from=feed')).toBe('506614734');
  });

  it('parses a UID from a localized profile URL', () => {
    expect(
      getUidFromUrl('https://space.bilibili.com/zh-Hans/3546698028681748?spm_id_from=333.337.0.0'),
    ).toBe('3546698028681748');
  });

  it('accepts a trailing slash', () => {
    expect(getUidFromUrl('https://space.bilibili.com/506614734/')).toBe('506614734');
  });

  it('resolves relative links against a base URL', () => {
    expect(getUidFromUrl('/zh-Hans/506614734', 'https://space.bilibili.com/')).toBe('506614734');
  });

  it('rejects URLs from another hostname', () => {
    expect(getUidFromUrl('https://example.com/506614734')).toBeNull();
    expect(getUidFromUrl('https://example.com/space.bilibili.com/506614734')).toBeNull();
  });

  it('rejects paths that are not profile URLs', () => {
    expect(getUidFromUrl('https://space.bilibili.com/video/506614734')).toBeNull();
    expect(getUidFromUrl('https://space.bilibili.com/zh-Hans/not-a-uid')).toBeNull();
    expect(getUidFromUrl('not a URL')).toBeNull();
  });
});
