export interface FlagDefinition {
  code: string;
  name: string;
  description: string;
  recommended: boolean;
}

export const FLAG_DEFINITIONS_API_URL = 'https://bilibili-blocker.guoyunhe.me/api/flags';

function isFlagDefinition(value: unknown): value is FlagDefinition {
  if (value === null || typeof value !== 'object') return false;

  const flag = value as Record<string, unknown>;
  return (
    typeof flag.code === 'string' &&
    /^[a-z0-9_-]+$/i.test(flag.code) &&
    typeof flag.name === 'string' &&
    typeof flag.description === 'string' &&
    typeof flag.recommended === 'boolean'
  );
}

function isFlagDefinitionList(value: unknown): value is FlagDefinition[] {
  return Array.isArray(value) && value.every(isFlagDefinition);
}

export function parseFlagDefinitionsResponse(response: unknown): FlagDefinition[] {
  if (response === null || typeof response !== 'object' || !('data' in response)) {
    throw new Error('Invalid flag definitions response');
  }

  const definitions: unknown = response.data;
  if (!isFlagDefinitionList(definitions)) {
    throw new Error('Invalid flag definitions response');
  }
  return definitions;
}
