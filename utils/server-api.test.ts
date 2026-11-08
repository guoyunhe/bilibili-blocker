import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchUserAccount } from './server-api';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchUserAccount', () => {
  it('returns account rating and flags', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              uid: '3546671434697322',
              rating: 10,
              ratingCount: 1,
              flags: [
                {
                  code: 'spam',
                  name: 'Spam',
                  description: 'Spam account',
                  recommended: true,
                  status: null,
                  upVotes: 1,
                  downVotes: 0,
                  score: 1,
                },
              ],
            },
          }),
          { status: 200 },
        ),
      ),
    );

    await expect(fetchUserAccount('3546671434697322')).resolves.toEqual({
      rating: 10,
      ratingCount: 1,
      flags: [
        {
          code: 'spam',
          name: 'Spam',
          description: 'Spam account',
          recommended: true,
          status: null,
          upVotes: 1,
          downVotes: 0,
          score: 1,
        },
      ],
    });
  });

  it('returns an empty result for an account without community data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })));

    await expect(fetchUserAccount('123')).resolves.toEqual({
      rating: null,
      ratingCount: 0,
      flags: [],
    });
  });
});
