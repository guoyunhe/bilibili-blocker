import type { RuleSource, UserEntry, UserLists } from '../types';

interface CachedRules {
  ids: string[];
  timestamp: number;
}

const RULE_SOURCES: RuleSource[] = (
  [
    'aislop',
    'aivoice',
    'clickbait',
    'copycat',
    'catfish',
    'fakenews',
    'finance',
    'spam',
    'superstition',
    'troll',
  ] as const
).map((item) => ({
  name: item,
  displayName: browser.i18n.getMessage(item),
  url: `https://bilibili-blocker.netlify.app/rules/${item}.txt`,
  count: 0,
}));

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const USER_LISTS_KEY = 'local:user-lists';

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

async function notifyRulesUpdated(): Promise<string[]> {
  const ids = await getActiveRules();
  const tabs = await browser.tabs.query({ url: '*://*.bilibili.com/*' });
  for (const tab of tabs) {
    if (tab.id) void browser.tabs.sendMessage(tab.id, { type: 'RULES_UPDATED', ids });
  }
  return ids;
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

async function getCachedRules(source: RuleSource): Promise<CachedRules | null> {
  const key = `rules:${source.name}`;
  const result = await storage.getItem<CachedRules>(`local:${key}`);
  return result ?? null;
}

async function setCachedRules(source: RuleSource, ids: string[]): Promise<void> {
  const key = `rules:${source.name}`;
  const cached: CachedRules = { ids, timestamp: Date.now() };
  await storage.setItem(`local:${key}`, cached);
}

async function getActiveRules(): Promise<string[]> {
  const config = await storage.getItem<Record<string, boolean>>('local:config');
  const allIds: string[] = [];

  for (const source of RULE_SOURCES) {
    // Check if source is enabled (default: true)
    const enabled = config?.[source.name] ?? true;

    let cached = await getCachedRules(source);
    const isExpired = !cached || Date.now() - cached.timestamp > CACHE_DURATION;

    if (isExpired) {
      try {
        const ids = await fetchRules(source.url);
        await setCachedRules(source, ids);
        cached = { ids, timestamp: Date.now() };
      } catch (err) {
        console.error(`Failed to fetch rules for ${source.name}:`, err);
      }
    }

    source.count = cached?.ids.length ?? 0;

    if (cached && enabled) {
      allIds.push(...cached!.ids);
    }
  }

  const lists = await getUserLists();
  const whitelist = new Set(lists.whitelist.map((entry) => entry.uid));
  const blockedIds = new Set(allIds);
  for (const entry of lists.blacklist) blockedIds.add(entry.uid);
  for (const uid of whitelist) blockedIds.delete(uid);
  return [...blockedIds];
}

export default defineBackground(() => {
  console.log('Bilibili Blocker background started', { id: browser.runtime.id });

  getActiveRules();

  // Handle messages from content script and popup
  browser.runtime.onMessage.addListener((message, _sender) => {
    switch (message.type) {
      case 'GET_RULES':
        return getActiveRules();
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
        return Promise.resolve(RULE_SOURCES);
      case 'REFRESH_RULES':
        return (async () => {
          for (const source of RULE_SOURCES) {
            try {
              const ids = await fetchRules(source.url);
              await setCachedRules(source, ids);
              source.count = ids.length;
            } catch (err) {
              console.error(`Failed to refresh rules for ${source.name}:`, err);
            }
          }
          return RULE_SOURCES;
        })();
      default:
        return Promise.resolve(null);
    }
  });
});
