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

export async function fetchFlagDefinitions(): Promise<FlagDefinition[]> {
  const response = await fetch(FLAG_DEFINITIONS_API_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch flag definitions: ${response.status}`);
  }

  const result: unknown = await response.json();
  return parseFlagDefinitionsResponse(result);
}

export async function fetchUserFlags(uid: string): Promise<UserFlag[]> {
  if (!/^\d+$/.test(uid)) {
    throw new Error(`Invalid account UID: ${uid}`);
  }

  const response = await fetch(`${SERVER_API_URL}/accounts/${uid}`);
  if (response.status === 404) return [];
  if (!response.ok) {
    throw new Error(`Failed to fetch user flags for ${uid}: ${response.status}`);
  }

  const result = (await response.json()) as {
    data?: { flags?: UserFlag[] };
  };
  if (!Array.isArray(result.data?.flags)) {
    throw new Error(`Invalid user flags response for ${uid}`);
  }
  return result.data.flags;
}
