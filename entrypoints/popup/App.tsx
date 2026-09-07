import { useCallback, useEffect, useState } from 'react';

import type { RuleSource, UserEntry, UserLists } from '../../types';

import './App.css';
import BlacklistTab from './BlacklistTab';
import RulesTab from './RulesTab';
import WhitelistTab from './WhitelistTab';

interface Config {
  [sourceName: string]: boolean;
}

type Tab = 'rules' | 'blacklist' | 'whitelist';

function App() {
  const [sources, setSources] = useState<RuleSource[]>([]);
  const [config, setConfig] = useState<Config>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('rules');
  const [lists, setLists] = useState<UserLists>({ blacklist: [], whitelist: [] });

  useEffect(() => {
    (async () => {
      try {
        const [s, c, l] = await Promise.all([
          browser.runtime.sendMessage({ type: 'GET_RULE_SOURCES' }),
          browser.runtime.sendMessage({ type: 'GET_CONFIG' }),
          browser.runtime.sendMessage({ type: 'GET_USER_LISTS' }),
        ]);
        console.log('loaded sources', s);
        setSources((s as RuleSource[]) ?? []);
        setConfig((c as Config) ?? {});
        setLists((l as UserLists) ?? { blacklist: [], whitelist: [] });
      } catch (err) {
        console.error('Failed to load config:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleUserEntry = useCallback(
    async (list: 'blacklist' | 'whitelist', entry: UserEntry, enabled: boolean) => {
      const nextLists = await browser.runtime.sendMessage({
        type: 'SET_USER_ENTRY',
        list,
        entry,
        enabled,
      });
      setLists(nextLists as UserLists);
    },
    [],
  );

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
      const refreshedSources = await browser.runtime.sendMessage({ type: 'REFRESH_RULES' });
      setSources(refreshedSources);
      // Notify all tabs to refresh rules
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

  return (
    <div className='app-container'>
      <header className='app-header'>
        <h1>{browser.i18n.getMessage('extensionName')}</h1>
        <p>{browser.i18n.getMessage('extensionDescription')}</p>
      </header>

      <nav className='tabs' aria-label='Popup sections'>
        <button
          className={activeTab === 'rules' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('rules')}
        >
          {browser.i18n.getMessage('rulesTab')}
        </button>
        <button
          className={activeTab === 'blacklist' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('blacklist')}
        >
          {browser.i18n.getMessage('blacklistTab')} ({lists.blacklist.length})
        </button>
        <button
          className={activeTab === 'whitelist' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('whitelist')}
        >
          {browser.i18n.getMessage('whitelistTab')} ({lists.whitelist.length})
        </button>
      </nav>

      {activeTab === 'rules' ? (
        <RulesTab
          sources={sources}
          config={config}
          refreshing={refreshing}
          onToggle={handleToggle}
          onRefresh={handleRefresh}
        />
      ) : activeTab === 'blacklist' ? (
        <BlacklistTab
          entries={lists.blacklist}
          onRemove={(entry) => handleUserEntry('blacklist', entry, false)}
        />
      ) : (
        <WhitelistTab
          entries={lists.whitelist}
          onRemove={(entry) => handleUserEntry('whitelist', entry, false)}
        />
      )}
    </div>
  );
}

export default App;
