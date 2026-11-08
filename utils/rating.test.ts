import { describe, expect, it } from 'vitest';

import { formatRating } from './rating';

describe('formatRating', () => {
  it('converts 0-100 scores to a one-decimal five-star rating', () => {
    expect(formatRating(64)).toEqual({ value: '3.2', color: '#d4a000' });
  });

  it('uses the requested colors at each star rating', () => {
    expect(formatRating(20).color).toBe('#d9363e');
    expect(formatRating(40).color).toBe('#f08c00');
    expect(formatRating(60).color).toBe('#d4a000');
    expect(formatRating(80).color).toBe('#389e0d');
  });

  it('clamps scores to the valid range', () => {
    expect(formatRating(-10)).toEqual({ value: '0.0', color: '#d9363e' });
    expect(formatRating(110)).toEqual({ value: '5.0', color: '#389e0d' });
  });
});
