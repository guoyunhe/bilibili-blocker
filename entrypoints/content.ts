import { browser } from 'wxt/browser';

const HIDE_STYLE_ID = 'bilibili-blocker-hide-style';
const HIDDEN_CLASS = 'bilibili-blocker-hidden';

function injectHideStyle() {
  if (document.getElementById(HIDE_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = HIDE_STYLE_ID;
  style.textContent = `.${HIDDEN_CLASS} { display: none !important; }`;
  (document.head ?? document.documentElement).appendChild(style);
}

function hideElement(el: Element) {
  el.classList.add(HIDDEN_CLASS);
}

function processVideoCards(
  blockedUidCache: Map<string, boolean>,
  requestBlockedStatus: (uid: string) => void,
) {
  const links = document.querySelectorAll('a[href*="space.bilibili.com"]');
  const hiddenCards = new Set<Element>();
  const visibleUids = new Set<string>();

  for (const link of links) {
    const href = link.getAttribute('href');
    if (!href) continue;

    const match = href.match(/space\.bilibili\.com\/(\d+)/);
    if (!match || !match[1]) continue;
    const uid = match[1];

    let card: Element | null = null;
    let current: Element | null = link;
    while (current) {
      if (
        current.matches(
          '.feed-card, .bili-feed-card, .video-page-card-small, .video-page-operator-card-small, .bili-video-card, .col_3.col_xs_1_5.col_md_2.col_xl_1_7.mb_x40',
        )
      ) {
        card = current;
      }
      current = current.parentElement;
    }
    if (!card) continue;

    visibleUids.add(uid);
    if (!blockedUidCache.has(uid)) requestBlockedStatus(uid);

    if (blockedUidCache.get(uid) || link.textContent?.includes('账号已注销')) {
      hideElement(card);
      hiddenCards.add(card);
    }
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
    injectHideStyle();

    function requestBlockedStatus(uid: string) {
      if (blockedUidCache.has(uid) || pendingChecks.has(uid)) return;

      const version = rulesVersion;
      const request = browser.runtime
        .sendMessage({ type: 'IS_BLOCKED', uid })
        .then((isBlocked: unknown) => {
          if (typeof isBlocked !== 'boolean') {
            throw new Error(`Invalid blocked status response for ${uid}`);
          }
          if (version !== rulesVersion) return;

          blockedUidCache.set(uid, isBlocked);
          processVideoCards(blockedUidCache, requestBlockedStatus);
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
    const observer = new MutationObserver(() => {
      processVideoCards(blockedUidCache, requestBlockedStatus);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Listen for rule updates from background
    browser.runtime.onMessage.addListener((message) => {
      if (message.type === 'RULES_UPDATED') {
        rulesVersion += 1;
        blockedUidCache.clear();
        pendingChecks.clear();
        injectHideStyle();
        processVideoCards(blockedUidCache, requestBlockedStatus);
      }
    });
  },
});
