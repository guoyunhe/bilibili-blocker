import type { UserEntry, UserLists } from '../../types';
import { fetchUserFlags } from '../../utils/server-api';
import {
  addImportedRuleUids,
  getBlockedStatuses,
  getActiveRulesAfterImport,
  getRuleSources,
  isUidBlocked,
  notifyRulesUpdated,
  notifyUserEntryUpdated,
  refreshRules,
} from './rules';
import { getUserLists, normalizeEntry, setUserLists } from './user-lists';

const ADD_RULE_UIDS_MESSAGE_TYPE = 'ADD_RULE_UIDS';

export function registerMessageHandlers(): void {
  browser.runtime.onMessage.addListener((message, _sender) => {
    console.log('Received message:', message);
    switch (message.type) {
      case 'IS_BLOCKED':
        return isUidBlocked(message.uid ?? '');
      case 'GET_BLOCKED_STATUSES': {
        const uids: unknown = message.uids;
        if (
          !Array.isArray(uids) ||
          !uids.every((uid) => typeof uid === 'string' && /^\d+$/.test(uid))
        ) {
          throw new Error('Invalid UID list for blocked status lookup');
        }
        return getBlockedStatuses(uids);
      }
      case 'GET_USER_FLAGS':
        return fetchUserFlags(message.uid ?? '');
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
          if (!entry || !['blacklist', 'whitelist'].includes(list)) {
            throw new Error('Invalid user entry update');
          }
          const entries = lists[list].filter((item) => item.uid !== entry.uid);
          if (message.enabled) entries.push(entry);
          const otherList = list === 'blacklist' ? 'whitelist' : 'blacklist';
          const nextLists = {
            ...lists,
            [list]: entries,
            [otherList]: lists[otherList].filter((item) => item.uid !== entry.uid),
          };
          await setUserLists(nextLists);
          const isBlocked = await isUidBlocked(entry.uid);
          const blacklisted = nextLists.blacklist.some((item) => item.uid === entry.uid);
          const whitelisted = nextLists.whitelist.some((item) => item.uid === entry.uid);
          await notifyUserEntryUpdated(entry.uid, isBlocked, blacklisted, whitelisted);
          return { lists: nextLists, isBlocked };
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
