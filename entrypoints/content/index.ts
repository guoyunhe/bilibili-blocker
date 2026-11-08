import { browser } from 'wxt/browser';

import { formatRating } from '../../utils/rating';
import type { UserAccountData } from '../../utils/server-api';
import { getUidFromUrl } from '../../utils/uid';

const HIDE_STYLE_ID = 'bilibili-blocker-hide-style';
const HIDDEN_CLASS = 'bilibili-blocker-hidden';
const USER_FLAGS_CLASS = 'bilibili-blocker-video-user-flags';
const USER_ROW_CLASS = 'bilibili-blocker-video-user-row';
const USER_FLAGS_ROW_CLASS = 'bilibili-blocker-video-user-flags-row';
const USER_FLAG_CLASS = 'bilibili-blocker-video-user-flag';
const USER_RATING_CLASS = 'bilibili-blocker-video-user-rating';
const VIDEO_CARD_SELECTOR =
  '.feed-card, .bili-feed-card, .video-page-card-small, .video-page-operator-card-small, .bili-video-card, .video-list-item, .col_3.col_xs_1_5.col_md_2.col_xl_1_7.mb_x40';

function injectHideStyle() {
  if (!document.getElementById(HIDE_STYLE_ID)) {
    const style = document.createElement('style');
    style.id = HIDE_STYLE_ID;
    style.textContent = `
      .${HIDDEN_CLASS} { display: none !important; }
      .${USER_ROW_CLASS} {
        position: relative;
      }
      .${USER_FLAGS_CLASS} {
        display: contents;
      }
      .${USER_FLAGS_ROW_CLASS} {
        position: absolute;
        bottom: -18px;
        left: 0;
        width: 100%;
        display: flex;
        flex-wrap: nowrap;
        gap: 4px;
        overflow: hidden;
      }
      .${USER_FLAGS_ROW_CLASS} > .${USER_FLAG_CLASS} {
        border-radius: 3px;
        padding: 1px 4px;
        background: #f1f2f3;
        color: #61666d;
        font-size: 11px;
        line-height: 16px;
        white-space: nowrap;
      }
      .${USER_FLAGS_CLASS} > .${USER_RATING_CLASS} {
        margin-left: 6px;
        font-size: 12px;
      }
    `;
    (document.head ?? document.documentElement).appendChild(style);
  }
}

function getUidFromLink(link: Element): string | null {
  const href = link.getAttribute('href');
  if (!href) return null;

  return getUidFromUrl(href, document.baseURI);
}

function getVideoCard(link: Element): Element | null {
  let card: Element | null = null;
  let current: Element | null = link;
  while (current) {
    if (current.matches(VIDEO_CARD_SELECTOR)) card = current;
    current = current.parentElement;
  }
  return card;
}

function isBlockedStatusMap(value: unknown): value is Record<string, boolean> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((status) => typeof status === 'boolean')
  );
}

function removeUserFlags(link: Element) {
  const next = link.nextElementSibling;
  if (next?.classList.contains(USER_FLAGS_CLASS)) next.remove();
  const parent = link.parentElement;
  if (parent?.classList.contains(USER_ROW_CLASS) && !parent.querySelector(`.${USER_FLAGS_CLASS}`)) {
    parent.classList.remove(USER_ROW_CLASS);
  }
}

function renderUserFlags(link: Element, uid: string, account: UserAccountData) {
  const existing = link.nextElementSibling;
  if (
    existing?.classList.contains(USER_FLAGS_CLASS) &&
    existing instanceof HTMLElement &&
    existing.dataset.uid === uid
  ) {
    return;
  }
  removeUserFlags(link);
  const visibleFlags = account.flags.filter((flag) => flag.status === 'approved' || flag.score > 0);
  if (account.rating === null && visibleFlags.length === 0) return;

  const container = document.createElement('span');
  container.className = USER_FLAGS_CLASS;
  container.dataset.uid = uid;
  link.parentElement?.classList.add(USER_ROW_CLASS);
  if (account.rating !== null) {
    const rating = document.createElement('span');
    rating.className = USER_RATING_CLASS;
    const formattedRating = formatRating(account.rating);
    const star = document.createElement('span');
    star.textContent = '★';
    star.style.color = formattedRating.color;
    star.setAttribute('aria-hidden', 'true');
    const value = document.createElement('span');
    value.textContent = formattedRating.value;
    value.style.color = formattedRating.color;
    rating.setAttribute(
      'aria-label',
      `评分 ${formattedRating.value}，${account.ratingCount} 个评分`,
    );
    rating.append(star, ' ', value, ` (${account.ratingCount})`);
    container.append(rating);
  }
  if (visibleFlags.length > 0) {
    const flagsRow = document.createElement('span');
    flagsRow.className = USER_FLAGS_ROW_CLASS;
    for (const flag of visibleFlags) {
      const flagElement = document.createElement('span');
      flagElement.className = USER_FLAG_CLASS;
      flagElement.title = flag.description;
      flagElement.textContent = `${flag.name} (${flag.score})`;
      flagsRow.append(flagElement);
    }
    container.append(flagsRow);
  }
  link.insertAdjacentElement('afterend', container);
}

function processVideoCard(
  card: Element,
  blockedUidCache: Map<string, boolean>,
  requestBlockedStatus: (uid: string) => void,
  userAccountDataCache: Map<string, UserAccountData>,
  requestUserAccountData: (uid: string) => void,
) {
  const links = [...card.querySelectorAll('a[href*="space.bilibili.com"]')];
  const uidLinks: Array<{ link: Element; uid: string }> = [];
  let shouldHide = false;
  for (const link of links) {
    const uid = getUidFromLink(link);
    if (!uid) continue;

    uidLinks.push({ link, uid });
    if (!blockedUidCache.has(uid)) requestBlockedStatus(uid);
    if (blockedUidCache.get(uid) || link.textContent?.includes('账号已注销')) {
      shouldHide = true;
    }
  }
  card.classList.toggle(HIDDEN_CLASS, shouldHide);
  for (const { link, uid } of uidLinks) {
    if (shouldHide) {
      removeUserFlags(link);
    } else if (blockedUidCache.get(uid) === false) {
      const accountData = userAccountDataCache.get(uid);
      if (accountData) renderUserFlags(link, uid, accountData);
      else requestUserAccountData(uid);
    }
  }
}

function processUidCards(
  uid: string,
  blockedUidCache: Map<string, boolean>,
  requestBlockedStatus: (uid: string) => void,
  userAccountDataCache: Map<string, UserAccountData>,
  requestUserAccountData: (uid: string) => void,
) {
  const start = Date.now();
  const cards = new Set<Element>();
  for (const link of document.querySelectorAll('a[href*="space.bilibili.com"]')) {
    if (getUidFromLink(link) !== uid) continue;
    const card = getVideoCard(link);
    if (card) cards.add(card);
  }

  for (const card of cards) {
    processVideoCard(
      card,
      blockedUidCache,
      requestBlockedStatus,
      userAccountDataCache,
      requestUserAccountData,
    );
  }
  console.log(`Processed UID cards for ${uid} in ${Date.now() - start}ms`);
}

function processVideoCards(
  blockedUidCache: Map<string, boolean>,
  requestBlockedStatus: (uid: string) => void,
  userAccountDataCache: Map<string, UserAccountData>,
  requestUserAccountData: (uid: string) => void,
) {
  const start = Date.now();
  const links = document.querySelectorAll('a[href*="space.bilibili.com"]');
  const hiddenCards = new Set<Element>();
  const visibleUids = new Set<string>();
  const cards = new Set<Element>();

  for (const link of links) {
    const uid = getUidFromLink(link);
    if (!uid) continue;
    const card = getVideoCard(link);
    if (!card) continue;

    visibleUids.add(uid);
    cards.add(card);
  }

  for (const card of cards) {
    processVideoCard(
      card,
      blockedUidCache,
      requestBlockedStatus,
      userAccountDataCache,
      requestUserAccountData,
    );
    if (card.classList.contains(HIDDEN_CLASS)) hiddenCards.add(card);
  }

  for (const uid of blockedUidCache.keys()) {
    if (!visibleUids.has(uid)) {
      blockedUidCache.delete(uid);
      userAccountDataCache.delete(uid);
    }
  }

  document.querySelectorAll(`.${HIDDEN_CLASS}`).forEach((card) => {
    if (!hiddenCards.has(card)) card.classList.remove(HIDDEN_CLASS);
  });
  console.log(`Processed video cards in ${Date.now() - start}ms`);
}

export default defineContentScript({
  matches: ['*://*.bilibili.com/*'],
  async main() {
    console.log('Bilibili Blocker content script loaded');
    const blockedUidCache = new Map<string, boolean>();
    const pendingChecks = new Map<string, Promise<void>>();
    const userAccountDataCache = new Map<string, UserAccountData>();
    const pendingAccountData = new Map<string, Promise<void>>();
    let rulesVersion = 0;
    const uidVersions = new Map<string, number>();
    injectHideStyle();

    function requestBlockedStatus(uid: string) {
      if (pendingChecks.has(uid) || blockedUidCache.has(uid)) return;

      const version = rulesVersion;
      const uidVersion = uidVersions.get(uid) ?? 0;
      const request = browser.runtime
        .sendMessage({ type: 'IS_BLOCKED', uid })
        .then((isBlocked: unknown) => {
          if (typeof isBlocked !== 'boolean') {
            throw new Error(`Invalid blocked status response for ${uid}`);
          }
          if (version !== rulesVersion || uidVersion !== (uidVersions.get(uid) ?? 0)) return;

          blockedUidCache.set(uid, isBlocked);
          processUidCards(
            uid,
            blockedUidCache,
            requestBlockedStatus,
            userAccountDataCache,
            requestUserAccountData,
          );
        })
        .catch((err) => {
          console.error(`Failed to check blocked status for ${uid}:`, err);
        })
        .finally(() => {
          if (pendingChecks.get(uid) === request) pendingChecks.delete(uid);
        });
      pendingChecks.set(uid, request);
    }

    function requestUserAccountData(uid: string) {
      if (pendingAccountData.has(uid) || userAccountDataCache.has(uid)) return;

      const request = browser.runtime
        .sendMessage({ type: 'GET_ACCOUNT_DATA', uid })
        .then((response: unknown) => {
          userAccountDataCache.set(uid, response as UserAccountData);
          processUidCards(
            uid,
            blockedUidCache,
            requestBlockedStatus,
            userAccountDataCache,
            requestUserAccountData,
          );
        })
        .catch((err) => {
          console.error(`Failed to load account data for ${uid}:`, err);
        })
        .finally(() => {
          if (pendingAccountData.get(uid) === request) pendingAccountData.delete(uid);
        });
      pendingAccountData.set(uid, request);
    }

    async function refreshVisibleBlockedStatuses() {
      const version = rulesVersion;
      const visibleUids = new Set<string>();
      for (const link of document.querySelectorAll('a[href*="space.bilibili.com"]')) {
        const uid = getUidFromLink(link);
        if (uid && getVideoCard(link)) visibleUids.add(uid);
      }
      const uidVersionsAtRequest = new Map(
        [...visibleUids].map((uid) => [uid, uidVersions.get(uid) ?? 0]),
      );
      if (visibleUids.size === 0) {
        processVideoCards(
          blockedUidCache,
          requestBlockedStatus,
          userAccountDataCache,
          requestUserAccountData,
        );
        return;
      }

      try {
        const statuses: unknown = await browser.runtime.sendMessage({
          type: 'GET_BLOCKED_STATUSES',
          uids: [...visibleUids],
        });
        if (!isBlockedStatusMap(statuses)) {
          throw new Error('Invalid blocked status response');
        }
        if (version !== rulesVersion) return;

        const validatedStatuses = new Map<string, boolean>();
        for (const uid of visibleUids) {
          const status = statuses[uid];
          if (typeof status !== 'boolean') {
            throw new Error(`Invalid blocked status response for ${uid}`);
          }
          validatedStatuses.set(uid, status);
        }
        for (const uid of visibleUids) {
          const status = validatedStatuses.get(uid);
          if (
            status !== undefined &&
            (uidVersions.get(uid) ?? 0) === uidVersionsAtRequest.get(uid)
          ) {
            blockedUidCache.set(uid, status);
          }
        }
        processVideoCards(
          blockedUidCache,
          requestBlockedStatus,
          userAccountDataCache,
          requestUserAccountData,
        );
      } catch (err) {
        console.error('Failed to refresh visible blocked statuses:', err);
      }
    }

    // Watch for dynamically added content
    const observer = new MutationObserver((records) => {
      const cards = new Set<Element>();
      for (const record of records) {
        const target =
          record.target instanceof Element ? record.target : record.target.parentElement;
        const targetCard = target ? getVideoCard(target) : null;
        if (targetCard) cards.add(targetCard);

        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches('a[href*="space.bilibili.com"]')) {
            const card = getVideoCard(node);
            if (card) cards.add(card);
          }
          for (const link of node.querySelectorAll('a[href*="space.bilibili.com"]')) {
            const card = getVideoCard(link);
            if (card) cards.add(card);
          }
        }
      }
      for (const card of cards) {
        processVideoCard(
          card,
          blockedUidCache,
          requestBlockedStatus,
          userAccountDataCache,
          requestUserAccountData,
        );
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
    void refreshVisibleBlockedStatuses();

    // Listen for rule updates from background
    browser.runtime.onMessage.addListener((message) => {
      if (
        message.type === 'USER_ENTRY_UPDATED' &&
        typeof message.uid === 'string' &&
        /^\d+$/.test(message.uid) &&
        typeof message.isBlocked === 'boolean'
      ) {
        const uid = message.uid;
        uidVersions.set(uid, (uidVersions.get(uid) ?? 0) + 1);
        pendingChecks.delete(uid);
        blockedUidCache.set(uid, message.isBlocked);
        processUidCards(
          uid,
          blockedUidCache,
          requestBlockedStatus,
          userAccountDataCache,
          requestUserAccountData,
        );
        return;
      }

      if (message.type === 'RULES_UPDATED') {
        rulesVersion += 1;
        pendingChecks.clear();
        injectHideStyle();
        void refreshVisibleBlockedStatuses();
      }
    });
  },
});
