import type { RuleSource } from '../types';

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

  return allIds;
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
