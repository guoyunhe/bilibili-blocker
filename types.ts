export interface RuleSource {
  name: string;
  displayName: string;
  url: string;
  count: number;
  recommended: boolean;
}

export interface UserEntry {
  uid: string;
  username: string;
}

export interface UserLists {
  blacklist: UserEntry[];
  whitelist: UserEntry[];
}

export interface SetUserEntryResult {
  lists: UserLists;
  isBlocked: boolean;
}
