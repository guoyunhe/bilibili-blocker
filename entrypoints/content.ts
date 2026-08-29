import { browser } from 'wxt/browser';

const BLUR_STYLE_ID = 'bilibili-blocker-blur-style';

function injectBlurStyle() {
  if (document.getElementById(BLUR_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = BLUR_STYLE_ID;
  style.textContent = `
    .bilibili-blocker-blurred {
      filter: blur(20px) grayscale(1);
      transition: filter 0.3s ease;
      pointer-events: auto;
    }
    .bilibili-blocker-blurred:hover {
      filter: blur(0) grayscale(0);
    }
  `;
  document.head.appendChild(style);
}

function removeBlurStyle() {
  const style = document.getElementById(BLUR_STYLE_ID);
  if (style) style.remove();
}

function blurElement(el: Element) {
  el.classList.add('bilibili-blocker-blurred');
}

async function processVideoCards(blockedIds: Set<string>) {
  if (blockedIds.size === 0) return;

  // Find all links to user spaces
  const links = document.querySelectorAll('a[href*="space.bilibili.com"]');
  const blurredCards = new Set<Element>();

  for (const link of links) {
    const href = link.getAttribute('href');
    if (!href) {
      console.log('No href found for link', link);
      continue;
    }
    const match = href.match(/space\.bilibili\.com\/(\d+)/);
    if (!match || !match[1]) continue;
    const uid = match[1];

    if (blockedIds.has(uid)) {
      const card = link.closest(
        '.feed-card, .bili-feed-card, .video-page-card-small, .bili-video-card',
      );

      if (card && !card.classList.contains('bilibili-blocker-blurred')) {
        console.log(`Blurring card for UID ${uid}`);
        blurElement(card);
        blurredCards.add(card);
      }
    }
  }
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
    if (blockedIdSet.size === 0) {
      console.log('No blocked IDs, skipping processing');
      return;
    }

    injectBlurStyle();

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
          removeBlurStyle();
          // Remove blur from all elements
          document.querySelectorAll('.bilibili-blocker-blurred').forEach((el) => {
            el.classList.remove('bilibili-blocker-blurred');
          });
        } else {
          injectBlurStyle();
          processVideoCards(blockedIdSet);
        }
      }
    });
  },
});
