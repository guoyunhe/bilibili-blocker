import type { UserEntry, UserLists } from '../../types';

const USER_LISTS_KEY = 'local:user-lists';

export async function getUserLists(): Promise<UserLists> {
  const lists = await storage.getItem<UserLists>(USER_LISTS_KEY);
  return {
    blacklist: lists?.blacklist ?? [],
    whitelist: lists?.whitelist ?? [],
  };
}

export async function setUserLists(lists: UserLists): Promise<void> {
  await storage.setItem(USER_LISTS_KEY, lists);
}

export function normalizeEntry(entry: UserEntry): UserEntry | null {
  const uid = String(entry.uid).trim();
  if (!/^\d+$/.test(uid)) return null;
  return { uid, username: String(entry.username).trim() || uid };
}
