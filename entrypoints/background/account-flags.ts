export interface AccountFlag {
  code: string;
  name: string;
  description: string;
  status: string | null;
  score: number;
}

export async function fetchAccountFlags(uid: string): Promise<AccountFlag[]> {
  if (!/^\d+$/.test(uid)) {
    throw new Error(`Invalid account UID: ${uid}`);
  }

  const response = await fetch(`https://bilibili-blocker.guoyunhe.me/api/accounts/${uid}`);
  if (response.status === 404) return [];
  if (!response.ok) {
    throw new Error(`Failed to fetch account flags for ${uid}: ${response.status}`);
  }

  const result = (await response.json()) as {
    data?: { flags?: AccountFlag[] };
  };
  if (!Array.isArray(result.data?.flags)) {
    throw new Error(`Invalid account flags response for ${uid}`);
  }
  return result.data.flags;
}
