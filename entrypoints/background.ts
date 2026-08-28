interface RuleSource {
  name: string;
  url: string;
}

interface CachedRules {
  ids: string[];
  timestamp: number;
}

const RULE_SOURCES: RuleSource[] = [
  { name: 'clickbait', url: 'https://bilibili-blocker.netlify.app/rules/clickbait.txt' },
  { name: 'aislop', url: 'https://bilibili-blocker.netlify.app/rules/aislop.txt' },
  { name: 'catfish', url: 'https://bilibili-blocker.netlify.app/rules/catfish.txt' },
];

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
    if (!enabled) continue;

    let cached = await getCachedRules(source);
    const isExpired = !cached || Date.now() - cached.timestamp > CACHE_DURATION;

    if (isExpired) {
      try {
        const ids = await fetchRules(source.url);
        await setCachedRules(source, ids);
        cached = { ids, timestamp: Date.now() };
      } catch (err) {
        console.error(`Failed to fetch rules for ${source.name}:`, err);
        // Use expired cache if available
        if (cached) {
          allIds.push(...cached.ids);
        }
        continue;
      }
    }

    allIds.push(...cached!.ids);
  }

  return allIds;
}

export default defineBackground(() => {
  console.log('Bilibili Blocker background started', { id: browser.runtime.id });

  // Handle messages from content script and popup
  browser.runtime.onMessage.addListener((message, _sender) => {
    if (message.type === 'GET_RULES') {
      return getActiveRules();
    }
    if (message.type === 'GET_CONFIG') {
      return storage.getItem<Record<string, boolean>>('local:config');
    }
    if (message.type === 'SET_CONFIG') {
      return storage.setItem('local:config', message.config);
    }
    if (message.type === 'GET_RULE_SOURCES') {
      return RULE_SOURCES.map((s) => ({ name: s.name, url: s.url }));
    }
    if (message.type === 'REFRESH_RULES') {
      // Force refresh all enabled rules
      return (async () => {
        const config = await storage.getItem<Record<string, boolean>>('local:config');
        for (const source of RULE_SOURCES) {
          const enabled = config?.[source.name] ?? true;
          if (!enabled) continue;
          try {
            const ids = await fetchRules(source.url);
            await setCachedRules(source, ids);
          } catch (err) {
            console.error(`Failed to refresh rules for ${source.name}:`, err);
          }
        }
      })();
    }
  });
});
