import { describe, expect, it } from 'vitest';

import { FLAG_DEFINITIONS_API_URL, parseFlagDefinitionsResponse } from './flag-definitions';

const definitions = [
  {
    code: 'spam',
    name: 'Spam',
    description: 'Spam accounts',
    recommended: true,
  },
];

describe('parseFlagDefinitionsResponse', () => {
  it('parses flag definitions nested under data', () => {
    expect(parseFlagDefinitionsResponse({ data: definitions })).toEqual(definitions);
  });

  it('rejects a root-level array instead of the API response envelope', () => {
    expect(() => parseFlagDefinitionsResponse(definitions)).toThrow(
      'Invalid flag definitions response',
    );
  });

  it('rejects invalid flag definitions', () => {
    expect(() =>
      parseFlagDefinitionsResponse({
        data: [{ ...definitions[0], recommended: 'yes' }],
      }),
    ).toThrow('Invalid flag definitions response');
  });

  it('matches the live flags API response contract', async () => {
    const response = await fetch(FLAG_DEFINITIONS_API_URL, {
      signal: AbortSignal.timeout(15_000),
    });
    expect(response.ok).toBe(true);

    const result: unknown = await response.json();
    expect(parseFlagDefinitionsResponse(result).length).toBeGreaterThan(0);
  }, 20_000);
});
