import { browser } from 'wxt/browser';

function getPublisherUid(): string | null {
  const publisher = document.querySelector<HTMLAnchorElement>(
    '.up-panel-container a.up-name, .up-panel-container a.staff-name',
  );
  if (!publisher?.href) return null;

  const url = new URL(publisher.href);
  if (url.hostname !== 'space.bilibili.com') return null;
  return url.pathname.match(/^\/(\d+)(?:\/|$)/)?.[1] ?? null;
}

export default defineContentScript({
  matches: ['*://www.bilibili.com/video/*'],
  async main() {
    let redirecting = false;
    let checkedUid: string | null = null;

    async function checkPublisher() {
      if (redirecting) return;
      const uid = getPublisherUid();
      if (!uid) {
        checkedUid = null;
        return;
      }
      if (checkedUid === uid) return;
      checkedUid = uid;

      try {
        const isBlocked = await browser.runtime.sendMessage({
          type: 'IS_BLOCKED',
          uid,
        });
        if (!isBlocked || getPublisherUid() !== uid || redirecting) return;

        redirecting = true;
        location.replace('https://www.bilibili.com/');
      } catch (err) {
        console.error(`Failed to check blocked status for ${uid}:`, err);
        if (checkedUid === uid) checkedUid = null;
      }
    }

    void checkPublisher();

    const observer = new MutationObserver(() => void checkPublisher());
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['href'],
    });

    browser.runtime.onMessage.addListener((message) => {
      if (message.type !== 'RULES_UPDATED') return;
      checkedUid = null;
      void checkPublisher();
    });
  },
});
