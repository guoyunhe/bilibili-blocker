export interface RuleSource {
  name: string;
  displayName: string;
  url: string;
  count: number;
}

export interface UserEntry {
  uid: string;
  username: string;
}

export interface UserLists {
  blacklist: UserEntry[];
  whitelist: UserEntry[];
}
