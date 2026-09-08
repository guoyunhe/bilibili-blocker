import { browser } from 'wxt/browser';

const HOME_STYLE_ID = 'bilibili-blocker-home-style';

function updateFloorCardStyle(hideFloorCard: boolean) {
  document.getElementById(HOME_STYLE_ID)?.remove();
  if (!hideFloorCard) return;

  const style = document.createElement('style');
  style.id = HOME_STYLE_ID;
  style.textContent = `
    .floor-single-card {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
}

export default defineContentScript({
  matches: ['https://www.bilibili.com/*'],
  async main() {
    const config = await browser.runtime.sendMessage({ type: 'GET_CONFIG' });
    updateFloorCardStyle(config?.hideFloorCard ?? false);

    browser.runtime.onMessage.addListener((message) => {
      if (message.type !== 'SETTING_UPDATED') return;
      updateFloorCardStyle(message.hideFloorCard ?? false);
    });
  },
});
