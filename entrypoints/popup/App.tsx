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
        <nav className='app-links' aria-label='External links'>
          <a
            href='https://github.com/guoyunhe/bilibili-blocker'
            target='_blank'
            rel='noreferrer'
            aria-label='GitHub'
          >
            <svg viewBox='0 0 24 24' aria-hidden='true'>
              <path d='M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.05c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.74.08-.74 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18a4.7 4.7 0 0 1 1.24 3.22c0 4.6-2.8 5.62-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.69.83.57A12 12 0 0 0 12 .5' />
            </svg>
            GitHub
          </a>
          <a
            href='https://t.me/bilibili_blocker'
            target='_blank'
            rel='noreferrer'
            aria-label='Telegram'
          >
            <svg viewBox='0 0 24 24' aria-hidden='true'>
              <path d='m21.5 3.5-3.1 16.1c-.23 1.14-.84 1.42-1.7.89l-4.7-3.47-2.27 2.18c-.25.25-.46.46-.94.46l.34-4.8 8.74-7.9c.38-.34-.08-.53-.59-.19L6.47 13.66l-4.63-1.45c-1.01-.32-1.03-1.01.21-1.5L20.15 3.1c.85-.31 1.6.2 1.35.4Z' />
            </svg>
            Telegram
          </a>
        </nav>
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
