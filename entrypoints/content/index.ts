import { browser } from 'wxt/browser';

const HIDE_STYLE_ID = 'bilibili-blocker-hide-style';
const HIDDEN_CLASS = 'bilibili-blocker-hidden';
const VIDEO_CARD_SELECTOR =
  '.feed-card, .bili-feed-card, .video-page-card-small, .video-page-operator-card-small, .bili-video-card, .col_3.col_xs_1_5.col_md_2.col_xl_1_7.mb_x40';

function injectHideStyle() {
  if (document.getElementById(HIDE_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = HIDE_STYLE_ID;
  style.textContent = `.${HIDDEN_CLASS} { display: none !important; }`;
  (document.head ?? document.documentElement).appendChild(style);
}

function getUidFromLink(link: Element): string | null {
  const href = link.getAttribute('href');
  if (!href) return null;

  return href.match(/space\.bilibili\.com\/(\d+)/)?.[1] ?? null;
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

function processVideoCard(
  card: Element,
  blockedUidCache: Map<string, boolean>,
  requestBlockedStatus: (uid: string, refresh?: boolean) => void,
  refreshStatuses = false,
) {
  let shouldHide = false;
  for (const link of card.querySelectorAll('a[href*="space.bilibili.com"]')) {
    const uid = getUidFromLink(link);
    if (!uid) continue;

    if (refreshStatuses || !blockedUidCache.has(uid)) {
      requestBlockedStatus(uid, refreshStatuses);
    }
    if (blockedUidCache.get(uid) || link.textContent?.includes('账号已注销')) {
      shouldHide = true;
    }
  }
  card.classList.toggle(HIDDEN_CLASS, shouldHide);
}

function processUidCards(
  uid: string,
  blockedUidCache: Map<string, boolean>,
  requestBlockedStatus: (uid: string, refresh?: boolean) => void,
) {
  const cards = new Set<Element>();
  for (const link of document.querySelectorAll(`a[href*="space.bilibili.com/${uid}"]`)) {
    if (getUidFromLink(link) !== uid) continue;
    const card = getVideoCard(link);
    if (card) cards.add(card);
  }

  for (const card of cards) {
    processVideoCard(card, blockedUidCache, requestBlockedStatus);
  }
}

function processVideoCards(
  blockedUidCache: Map<string, boolean>,
  requestBlockedStatus: (uid: string, refresh?: boolean) => void,
  refreshStatuses = false,
) {
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
    processVideoCard(card, blockedUidCache, requestBlockedStatus, refreshStatuses);
    if (card.classList.contains(HIDDEN_CLASS)) hiddenCards.add(card);
  }

  for (const uid of blockedUidCache.keys()) {
    if (!visibleUids.has(uid)) blockedUidCache.delete(uid);
  }

  document.querySelectorAll(`.${HIDDEN_CLASS}`).forEach((card) => {
    if (!hiddenCards.has(card)) card.classList.remove(HIDDEN_CLASS);
  });
}

export default defineContentScript({
  matches: ['*://*.bilibili.com/*'],
  async main() {
    console.log('Bilibili Blocker content script loaded');
    const blockedUidCache = new Map<string, boolean>();
    const pendingChecks = new Map<string, Promise<void>>();
    let rulesVersion = 0;
    const uidVersions = new Map<string, number>();
    injectHideStyle();

    function requestBlockedStatus(uid: string, refresh = false) {
      if (pendingChecks.has(uid) || (blockedUidCache.has(uid) && !refresh)) return;

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
          processUidCards(uid, blockedUidCache, requestBlockedStatus);
        })
        .catch((err) => {
          console.error(`Failed to check blocked status for ${uid}:`, err);
        })
        .finally(() => {
          if (pendingChecks.get(uid) === request) pendingChecks.delete(uid);
        });
      pendingChecks.set(uid, request);
    }

    processVideoCards(blockedUidCache, requestBlockedStatus);

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
        processVideoCard(card, blockedUidCache, requestBlockedStatus);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

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
        processUidCards(uid, blockedUidCache, requestBlockedStatus);
        return;
      }

      if (message.type === 'RULES_UPDATED') {
        rulesVersion += 1;
        pendingChecks.clear();
        injectHideStyle();
        processVideoCards(blockedUidCache, requestBlockedStatus, true);
      }
    });
  },
});
