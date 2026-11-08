import { parseFlagDefinitionsResponse, type FlagDefinition } from './flag-definitions';

const SERVER_API_URL = 'https://bilibili-blocker.guoyunhe.me/api';
export const SERVER_URL = 'https://bilibili-blocker.guoyunhe.me';
export const FLAG_DEFINITIONS_API_URL = `${SERVER_API_URL}/flags`;

export interface UserFlag {
  code: string;
  name: string;
  description: string;
  status: string | null;
  score: number;
}

export interface UserAccountData {
  rating: number | null;
  ratingCount: number;
  flags: UserFlag[];
}

function isUserFlag(value: unknown): value is UserFlag {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    typeof value.code === 'string' &&
    'name' in value &&
    typeof value.name === 'string' &&
    'description' in value &&
    typeof value.description === 'string' &&
    'status' in value &&
    (value.status === null || typeof value.status === 'string') &&
    'score' in value &&
    typeof value.score === 'number'
  );
}

export async function fetchFlagDefinitions(): Promise<FlagDefinition[]> {
  const response = await fetch(FLAG_DEFINITIONS_API_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch flag definitions: ${response.status}`);
  }

  const result: unknown = await response.json();
  return parseFlagDefinitionsResponse(result);
}

export async function fetchUserAccount(uid: string): Promise<UserAccountData> {
  if (!/^\d+$/.test(uid)) {
    throw new Error(`Invalid account UID: ${uid}`);
  }

  const response = await fetch(`${SERVER_API_URL}/accounts/${uid}`);
  if (response.status === 404) return { rating: null, ratingCount: 0, flags: [] };
  if (!response.ok) {
    throw new Error(`Failed to fetch account data for ${uid}: ${response.status}`);
  }

  const result: unknown = await response.json();
  if (
    typeof result !== 'object' ||
    result === null ||
    !('data' in result) ||
    typeof result.data !== 'object' ||
    result.data === null ||
    !('flags' in result.data) ||
    !Array.isArray(result.data.flags) ||
    !result.data.flags.every(isUserFlag) ||
    !('ratingCount' in result.data) ||
    typeof result.data.ratingCount !== 'number' ||
    ('rating' in result.data &&
      result.data.rating !== null &&
      typeof result.data.rating !== 'number')
  ) {
    throw new Error(`Invalid account data response for ${uid}`);
  }
  return {
    rating:
      'rating' in result.data && typeof result.data.rating === 'number' ? result.data.rating : null,
    ratingCount: result.data.ratingCount,
    flags: result.data.flags,
  };
}
