import { useCallback, useEffect, useState } from 'react';

import type { RuleSource } from '../../types';

import './App.css';

interface Config {
  [sourceName: string]: boolean;
}

function App() {
  const [sources, setSources] = useState<RuleSource[]>([]);
  const [config, setConfig] = useState<Config>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [s, c] = await Promise.all([
          browser.runtime.sendMessage({ type: 'GET_RULE_SOURCES' }),
          browser.runtime.sendMessage({ type: 'GET_CONFIG' }),
        ]);
        console.log('loaded sources', s);
        setSources((s as RuleSource[]) ?? []);
        setConfig((c as Config) ?? {});
      } catch (err) {
        console.error('Failed to load config:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleToggle = useCallback(
    async (name: string, enabled: boolean) => {
      const newConfig = { ...config, [name]: enabled };
      setConfig(newConfig);
      await browser.runtime.sendMessage({ type: 'SET_CONFIG', config: newConfig });
      // Notify all tabs to refresh rules
      const tabs = await browser.tabs.query({ url: '*://*.bilibili.com/*' });
      const rules = await browser.runtime.sendMessage({ type: 'GET_RULES' });
      for (const tab of tabs) {
        if (tab.id) {
          browser.tabs.sendMessage(tab.id, { type: 'RULES_UPDATED', ids: rules });
        }
      }
    },
    [config],
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await browser.runtime.sendMessage({ type: 'REFRESH_RULES' });
      const tabs = await browser.tabs.query({ url: '*://*.bilibili.com/*' });
      const rules = await browser.runtime.sendMessage({ type: 'GET_RULES' });
      for (const tab of tabs) {
        if (tab.id) {
          browser.tabs.sendMessage(tab.id, { type: 'RULES_UPDATED', ids: rules });
        }
      }
    } catch (err) {
      console.error('Failed to refresh rules:', err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  if (loading) {
    return (
      <div className='app-container'>
        <p className='loading'>{browser.i18n.getMessage('loading')}</p>
      </div>
    );
  }

  const enabledCount = Object.values(config).filter((v) => v !== false).length;

  return (
    <div className='app-container'>
      <header className='app-header'>
        <h1>Bilibili Blocker</h1>
        <p className='subtitle'>
          {browser.i18n.getMessage('enabledCount', [String(enabledCount), String(sources.length)])}
        </p>
      </header>

      <ul className='rule-list'>
        {sources.map((source) => {
          const enabled = config[source.name] ?? true;
          return (
            <li key={source.name} className='rule-item'>
              <label className='rule-label'>
                <input
                  type='checkbox'
                  className='toggle'
                  checked={enabled}
                  onChange={(e) => handleToggle(source.name, e.target.checked)}
                />
                <span className='rule-name'>{browser.i18n.getMessage(source.name as any)}</span>
                <span className='rule-count'>{source.count}</span>
              </label>
            </li>
          );
        })}
      </ul>

      <footer className='app-footer'>
        <button className='refresh-btn' onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? browser.i18n.getMessage('refreshing') : browser.i18n.getMessage('refresh')}
        </button>
      </footer>
    </div>
  );
}

export default App;
