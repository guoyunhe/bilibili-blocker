import type { RuleSource, UserEntry, UserLists } from '../types';
import {
  FLAG_DEFINITIONS_API_URL,
  parseFlagDefinitionsResponse,
  type FlagDefinition,
} from '../utils/flag-definitions';

interface CachedRules {
  ids: string[];
  timestamp: number;
}

interface CachedFlagDefinitions {
  flags: FlagDefinition[];
  timestamp: number;
}

interface AccountFlag {
  code: string;
  name: string;
  description: string;
  status: string | null;
  score: number;
}

const SERVICE_URL = 'https://bilibili-blocker.guoyunhe.me';
const FLAG_DEFINITIONS_KEY = 'local:flag-definitions';
const FLAG_DEFINITIONS_CACHE_DURATION = 24 * 60 * 60 * 1000;

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const ACTIVE_RULES_KEY = 'local:active-rules';
const USER_LISTS_KEY = 'local:user-lists';
const IMPORTED_RULES_KEY_PREFIX = 'local:imported-rules:';
const ADD_RULE_UIDS_MESSAGE_TYPE = 'ADD_RULE_UIDS';

async function getUserLists(): Promise<UserLists> {
  const lists = await storage.getItem<UserLists>(USER_LISTS_KEY);
  return {
    blacklist: lists?.blacklist ?? [],
    whitelist: lists?.whitelist ?? [],
  };
}

async function setUserLists(lists: UserLists): Promise<void> {
  await storage.setItem(USER_LISTS_KEY, lists);
}

function normalizeEntry(entry: UserEntry): UserEntry | null {
  const uid = String(entry.uid).trim();
  if (!/^\d+$/.test(uid)) return null;
  return { uid, username: String(entry.username).trim() || uid };
}

async function notifyRulesUpdated(ids?: string[]): Promise<string[]> {
  const activeIds = ids ?? (await getActiveRules());
  await storage.setItem(ACTIVE_RULES_KEY, activeIds);
  const tabs = await browser.tabs.query({ url: '*://*.bilibili.com/*' });
  for (const tab of tabs) {
    if (tab.id) void browser.tabs.sendMessage(tab.id, { type: 'RULES_UPDATED', ids: activeIds });
  }
  return activeIds;
}

async function fetchRules(url: string): Promise<string[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  const text = await response.text();
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

async function fetchFlagDefinitions(): Promise<FlagDefinition[]> {
  const response = await fetch(FLAG_DEFINITIONS_API_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch flag definitions: ${response.status}`);
  }

  const result: unknown = await response.json();
  return parseFlagDefinitionsResponse(result);
}

function toRuleSources(flags: FlagDefinition[]): RuleSource[] {
  return flags.map((flag) => ({
    name: flag.code,
    displayName: flag.name,
    url: `${SERVICE_URL}/uploads/rules/${flag.code}.txt`,
    count: 0,
    recommended: flag.recommended ?? false,
  }));
}

async function addCachedRuleCounts(sources: RuleSource[]): Promise<RuleSource[]> {
  return Promise.all(
    sources.map(async (source) => ({
      ...source,
      count: (await getCachedRules(source))?.ids.length ?? 0,
    })),
  );
}

async function getRuleSources(forceRefresh = false): Promise<RuleSource[]> {
  const cached = await storage.getItem<CachedFlagDefinitions>(FLAG_DEFINITIONS_KEY);
  const isExpired = !cached || Date.now() - cached.timestamp > FLAG_DEFINITIONS_CACHE_DURATION;

  if (!forceRefresh && !isExpired && cached) {
    return addCachedRuleCounts(toRuleSources(cached.flags));
  }

  let flags: FlagDefinition[];
  try {
    flags = await fetchFlagDefinitions();
  } catch (err) {
    console.error('Failed to fetch flag definitions:', err);
    if (cached) return addCachedRuleCounts(toRuleSources(cached.flags));
    throw err;
  }

  await storage.setItem<CachedFlagDefinitions>(FLAG_DEFINITIONS_KEY, {
    flags,
    timestamp: Date.now(),
  });
  return addCachedRuleCounts(toRuleSources(flags));
}

async function fetchAccountFlags(uid: string): Promise<AccountFlag[]> {
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

async function getCachedRules(source: RuleSource): Promise<CachedRules | null> {
  const key = `rules:${source.name}`;
  const result = await storage.getItem<CachedRules>(`local:${key}`);
  return result ?? null;
}

async function getImportedRuleUids(code: string): Promise<string[]> {
  const ids = await storage.getItem<string[]>(`${IMPORTED_RULES_KEY_PREFIX}${code}`);
  return Array.isArray(ids) ? ids.filter((uid) => /^\d+$/.test(uid)) : [];
}

async function setCachedRules(source: RuleSource, ids: string[]): Promise<void> {
  const key = `rules:${source.name}`;
  const importedIds = await getImportedRuleUids(source.name);
  const cached: CachedRules = {
    ids: [...new Set([...ids, ...importedIds])],
    timestamp: Date.now(),
  };
  await storage.setItem(`local:${key}`, cached);
}

async function getFreshCachedRules(source: RuleSource): Promise<CachedRules | null> {
  let cached = await getCachedRules(source);
  if (!cached || Date.now() - cached.timestamp > CACHE_DURATION) {
    try {
      const ids = await fetchRules(source.url);
      await setCachedRules(source, ids);
      cached = { ids, timestamp: Date.now() };
    } catch (err) {
      console.error(`Failed to fetch rules for ${source.name}:`, err);
    }
  }
  return cached;
}

async function filterUserLists(ids: string[]): Promise<string[]> {
  const lists = await getUserLists();
  const whitelist = new Set(lists.whitelist.map((entry) => entry.uid));
  const blockedIds = new Set(ids);
  for (const entry of lists.blacklist) blockedIds.add(entry.uid);
  for (const uid of whitelist) blockedIds.delete(uid);
  return [...blockedIds];
}

async function getCachedActiveRules(importedCode: string): Promise<string[]> {
  const cachedDefinitions = await storage.getItem<CachedFlagDefinitions>(FLAG_DEFINITIONS_KEY);
  if (!cachedDefinitions) {
    const config = await storage.getItem<Record<string, boolean>>('local:config');
    const activeIds = await storage.getItem<string[]>(ACTIVE_RULES_KEY);
    const importedIds =
      config?.[importedCode] === false ? [] : await getImportedRuleUids(importedCode);
    return filterUserLists([...(activeIds ?? []), ...importedIds]);
  }

  const sources = toRuleSources(cachedDefinitions.flags);
  if (!sources.some((source) => source.name === importedCode)) {
    sources.push({
      name: importedCode,
      displayName: importedCode,
      url: '',
      count: 0,
      recommended: true,
    });
  }

  const config = await storage.getItem<Record<string, boolean>>('local:config');
  const allIds: string[] = [];
  for (const source of sources) {
    const enabled = config?.[source.name] ?? source.recommended;
    if (!enabled) continue;

    const cached = await getCachedRules(source);
    if (cached) allIds.push(...cached.ids);
    allIds.push(...(await getImportedRuleUids(source.name)));
  }

  return filterUserLists(allIds);
}

async function getActiveRules(): Promise<string[]> {
  const config = await storage.getItem<Record<string, boolean>>('local:config');
  const allIds: string[] = [];
  const ruleSources = await getRuleSources();

  for (const source of ruleSources) {
    const enabled = config?.[source.name] ?? source.recommended;
    const cached = await getFreshCachedRules(source);

    source.count = cached?.ids.length ?? 0;

    if (cached && enabled) {
      allIds.push(...cached.ids);
    }
    if (enabled) {
      allIds.push(...(await getImportedRuleUids(source.name)));
    }
  }

  const activeIds = await filterUserLists(allIds);
  await storage.setItem(ACTIVE_RULES_KEY, activeIds);
  return activeIds;
}

async function isUidBlocked(uid: string): Promise<boolean> {
  if (!/^\d+$/.test(uid)) {
    throw new Error(`Invalid account UID: ${uid}`);
  }

  const lists = await getUserLists();
  if (lists.whitelist.some((entry) => entry.uid === uid)) return false;
  if (lists.blacklist.some((entry) => entry.uid === uid)) return true;

  const config = await storage.getItem<Record<string, boolean>>('local:config');
  const ruleSources = await getRuleSources();
  for (const source of ruleSources) {
    if (!(config?.[source.name] ?? source.recommended)) continue;
    const cached = await getFreshCachedRules(source);
    if (cached?.ids.includes(uid)) return true;
    if ((await getImportedRuleUids(source.name)).includes(uid)) return true;
  }
  return false;
}

export default defineBackground(() => {
  console.log('Bilibili Blocker background started', { id: browser.runtime.id });

  void getActiveRules().catch((err) => {
    console.error('Failed to load active rules:', err);
  });

  // Handle messages from content script and popup
  browser.runtime.onMessage.addListener((message, _sender) => {
    switch (message.type) {
      case 'GET_RULES':
        return getActiveRules();
      case 'IS_BLOCKED':
        return isUidBlocked(String(message.uid ?? ''));
      case 'GET_ACCOUNT_FLAGS':
        return fetchAccountFlags(String(message.uid ?? ''));
      case 'GET_CONFIG':
        return storage.getItem<Record<string, boolean>>('local:config');
      case 'SET_CONFIG':
        return storage.setItem('local:config', message.config);
      case 'GET_USER_LISTS':
        return getUserLists();
      case 'SET_USER_ENTRY':
        return (async () => {
          const lists = await getUserLists();
          const list = message.list as keyof UserLists;
          const entry = normalizeEntry(message.entry as UserEntry);
          if (!entry || !['blacklist', 'whitelist'].includes(list)) return lists;
          const entries = lists[list].filter((item) => item.uid !== entry.uid);
          if (message.enabled) entries.push(entry);
          const otherList = list === 'blacklist' ? 'whitelist' : 'blacklist';
          const nextLists = {
            ...lists,
            [list]: entries,
            [otherList]: lists[otherList].filter((item) => item.uid !== entry.uid),
          };
          await setUserLists(nextLists);
          await notifyRulesUpdated();
          return nextLists;
        })();
      case 'SET_USER_LISTS':
        return (async () => {
          const nextLists: UserLists = {
            blacklist: (message.lists?.blacklist ?? [])
              .map(normalizeEntry)
              .filter((entry: UserEntry | null): entry is UserEntry => entry !== null),
            whitelist: (message.lists?.whitelist ?? [])
              .map(normalizeEntry)
              .filter((entry: UserEntry | null): entry is UserEntry => entry !== null),
          };
          await setUserLists(nextLists);
          await notifyRulesUpdated();
          return nextLists;
        })();
      case 'GET_RULE_SOURCES':
        return getRuleSources();
      case ADD_RULE_UIDS_MESSAGE_TYPE:
        return (async () => {
          const code = String(message.code ?? '');
          if (!/^[a-z0-9_-]{1,32}$/.test(code)) {
            throw new Error('Invalid rule source code');
          }

          const incomingUids: unknown = message.uids;
          const isUid = (uid: unknown): uid is string =>
            typeof uid === 'string' && /^\d+$/.test(uid);
          if (!Array.isArray(incomingUids) || !incomingUids.every(isUid)) {
            throw new Error('Invalid imported UID list');
          }

          const uids = [...new Set(incomingUids)];
          if (uids.length === 0) {
            throw new Error('Imported UID list is empty');
          }

          const importedKey: `local:${string}` = `${IMPORTED_RULES_KEY_PREFIX}${code}`;
          const importedIds = await getImportedRuleUids(code);
          await storage.setItem(importedKey, [...new Set([...importedIds, ...uids])]);

          const cachedKey: `local:${string}` = `local:rules:${code}`;
          const cached = await storage.getItem<CachedRules>(cachedKey);
          const cachedIds = Array.isArray(cached?.ids) ? cached.ids : [];
          await storage.setItem<CachedRules>(cachedKey, {
            ids: [...new Set([...cachedIds, ...uids])],
            timestamp: Date.now(),
          });

          await notifyRulesUpdated(await getCachedActiveRules(code));
          return { count: uids.length };
        })();
      case 'REFRESH_RULES':
        return (async () => {
          const ruleSources = await getRuleSources(true);
          for (const source of ruleSources) {
            try {
              const ids = await fetchRules(source.url);
              await setCachedRules(source, ids);
              source.count = ids.length;
            } catch (err) {
              console.error(`Failed to refresh rules for ${source.name}:`, err);
            }
          }
          return ruleSources;
        })();
      default:
        return Promise.resolve(null);
    }
  });
});
