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

function processVideoCards(blockedIds: Set<string>) {
  const links = document.querySelectorAll('a[href*="space.bilibili.com"]');
  const hiddenCards = new Set<Element>();

  for (const link of links) {
    const href = link.getAttribute('href');
    if (!href) continue;

    const match = href.match(/space\.bilibili\.com\/(\d+)/);
    if (!match || !match[1]) continue;
    const uid = match[1];

    if (blockedIds.has(uid) || link.textContent?.includes('账号已注销')) {
      let card: Element | null = null;
      let current: Element | null = link;
      while (current) {
        if (
          current.matches(
            '.feed-card, .bili-feed-card, .video-page-card-small, .bili-video-card, .col_3.col_xs_1_5.col_md_2.col_xl_1_7.mb_x40',
          )
        ) {
          card = current;
        }
        current = current.parentElement;
      }
      if (card) {
        hideElement(card);
        hiddenCards.add(card);
      }
    }
  }

  document.querySelectorAll(`.${HIDDEN_CLASS}`).forEach((card) => {
    if (!hiddenCards.has(card)) card.classList.remove(HIDDEN_CLASS);
  });
}

export default defineContentScript({
  matches: ['*://*.bilibili.com/*'],
  async main() {
    console.log('Bilibili Blocker content script loaded');

    // Get blocked IDs from background
    let blockedIds: string[] = [];
    try {
      blockedIds = await browser.runtime.sendMessage({ type: 'GET_RULES' });
    } catch (err) {
      console.error('Failed to get rules:', err);
    }

    const blockedIdSet = new Set(blockedIds);
    injectHideStyle();

    // Process existing cards
    processVideoCards(blockedIdSet);

    // Watch for dynamically added content
    const observer = new MutationObserver(() => {
      processVideoCards(blockedIdSet);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Listen for rule updates from background
    browser.runtime.onMessage.addListener((message) => {
      if (message.type === 'RULES_UPDATED') {
        const newIds = message.ids as string[];
        blockedIdSet.clear();
        for (const id of newIds) blockedIdSet.add(id);
        if (blockedIdSet.size === 0) {
          processVideoCards(blockedIdSet);
        } else {
          injectHideStyle();
          processVideoCards(blockedIdSet);
        }
      }
    });
  },
});
