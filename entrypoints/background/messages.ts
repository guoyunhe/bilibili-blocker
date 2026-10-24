import type { UserEntry, UserLists } from '../../types';
import { fetchAccountFlags } from '../../utils/server-api';
import {
  addImportedRuleUids,
  getActiveRulesAfterImport,
  getRuleSources,
  isUidBlocked,
  notifyRulesUpdated,
  refreshRules,
} from './rules';
import { getUserLists, normalizeEntry, setUserLists } from './user-lists';

const ADD_RULE_UIDS_MESSAGE_TYPE = 'ADD_RULE_UIDS';

export function registerMessageHandlers(): void {
  browser.runtime.onMessage.addListener((message, _sender) => {
    switch (message.type) {
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

          await addImportedRuleUids(code, uids);
          await notifyRulesUpdated(await getActiveRulesAfterImport(code));
          return { count: uids.length };
        })();
      case 'REFRESH_RULES':
        return refreshRules();
      default:
        return Promise.resolve(null);
    }
  });
}
