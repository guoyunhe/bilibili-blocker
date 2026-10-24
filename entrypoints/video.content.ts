import { browser } from 'wxt/browser';

function getPublisherUid(): string | null {
  const publisher = document.querySelector<HTMLAnchorElement>('.up-panel-container a.up-name');
  if (!publisher?.href) return null;

  const url = new URL(publisher.href);
  if (url.hostname !== 'space.bilibili.com') return null;
  return url.pathname.match(/^\/(\d+)(?:\/|$)/)?.[1] ?? null;
}

export default defineContentScript({
  matches: ['*://www.bilibili.com/video/*'],
  async main() {
    let blockedIds: string[] = [];
    try {
      blockedIds = await browser.runtime.sendMessage({ type: 'GET_RULES' });
    } catch (err) {
      console.error('Failed to get rules:', err);
    }

    const blockedIdSet = new Set(blockedIds);
    let redirecting = false;

    function checkPublisher() {
      if (redirecting) return;
      const uid = getPublisherUid();
      if (!uid || !blockedIdSet.has(uid)) return;

      redirecting = true;
      location.replace('https://www.bilibili.com/');
    }

    checkPublisher();

    const observer = new MutationObserver(checkPublisher);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['href'],
    });

    browser.runtime.onMessage.addListener((message) => {
      if (message.type !== 'RULES_UPDATED') return;
      const newIds = message.ids as string[];
      blockedIdSet.clear();
      for (const id of newIds) blockedIdSet.add(id);
      checkPublisher();
    });
  },
});
