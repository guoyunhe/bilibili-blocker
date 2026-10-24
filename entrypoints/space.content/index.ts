import { browser } from 'wxt/browser';

import { setupUserPageButton, USER_BUTTON_ID } from './user-block-button';
import { USER_FLAGS_CONTAINER_ID, setupUserFlags } from './user-flags';

function getProfileUid(): string | null {
  const match = location.pathname.match(/^\/(\d+)(?:\/|$)/);
  return match?.[1] ?? null;
}

export default defineContentScript({
  matches: ['*://space.bilibili.com/*'],
  async main() {
    const pendingSetupUids = new Set<string>();

    function setupProfileFeatures() {
      const uid = getProfileUid();
      if (!uid || pendingSetupUids.has(uid)) return;

      pendingSetupUids.add(uid);
      void (async () => {
        try {
          if (getProfileUid() !== uid) return;
          const detailsTop = document.querySelector('.upinfo-detail__top');
          await Promise.all([
            detailsTop ? setupUserFlags(uid, detailsTop) : Promise.resolve(),
            setupUserPageButton(),
          ]);
        } finally {
          pendingSetupUids.delete(uid);
        }
      })();
    }

    setupProfileFeatures();

    const observer = new MutationObserver(() => {
      const uid = getProfileUid();
      const button = document.getElementById(USER_BUTTON_ID);
      const flagsContainer = document.getElementById(USER_FLAGS_CONTAINER_ID);
      const detailsTop = document.querySelector('.upinfo-detail__top');
      if (
        uid &&
        (!button ||
          button.dataset.uid !== uid ||
          (detailsTop && (!flagsContainer || flagsContainer.dataset.uid !== uid)))
      ) {
        setupProfileFeatures();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    browser.runtime.onMessage.addListener((message) => {
      if (message.type !== 'RULES_UPDATED') return;
      setupUserPageButton();
    });
  },
});
