import { browser } from 'wxt/browser';

const HOME_STYLE_ID = 'bilibili-blocker-home-style';

function updateHomeStyle(hideFloorCard: boolean, hideLiveRecommend: boolean) {
  document.getElementById(HOME_STYLE_ID)?.remove();
  if (!hideFloorCard && !hideLiveRecommend) return;

  const style = document.createElement('style');
  style.id = HOME_STYLE_ID;
  style.textContent = [
    hideFloorCard && '.floor-single-card { display: none !important; }',
    hideLiveRecommend && '.bili-feed-card:has(.bili-live-card) { display: none !important; }',
  ]
    .filter(Boolean)
    .join('\n');
  (document.head ?? document.documentElement).appendChild(style);
}

export default defineContentScript({
  matches: ['https://www.bilibili.com/*'],
  async main() {
    const config = await browser.runtime.sendMessage({ type: 'GET_CONFIG' });
    updateHomeStyle(config?.hideFloorCard ?? false, config?.hideLiveRecommend ?? false);

    browser.runtime.onMessage.addListener((message) => {
      if (message.type !== 'SETTING_UPDATED') return;
      updateHomeStyle(message.hideFloorCard ?? false, message.hideLiveRecommend ?? false);
    });
  },
});
