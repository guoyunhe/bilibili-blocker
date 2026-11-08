import { browser } from 'wxt/browser';

import homeStyle from './style.css?raw';

const HOME_STYLE_ID = 'bilibili-blocker-home-style';
const HOME_STYLE_CLASSES = [
  'bilibili-blocker-hide-floor-card',
  'bilibili-blocker-hide-live-card',
  'bilibili-blocker-hide-recommended-swipe',
];

function updateHomeStyle(
  hideFloorCard: boolean,
  hideLiveCard: boolean,
  hideRecommendedSwipe: boolean,
) {
  const enabled = [hideFloorCard, hideLiveCard, hideRecommendedSwipe];
  for (const [index, className] of HOME_STYLE_CLASSES.entries()) {
    document.documentElement.classList.toggle(className, enabled[index]);
  }
  if (!enabled.some(Boolean)) {
    document.getElementById(HOME_STYLE_ID)?.remove();
    return;
  }
  if (document.getElementById(HOME_STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = HOME_STYLE_ID;
  style.textContent = homeStyle;
  (document.head ?? document.documentElement).appendChild(style);
}

export default defineContentScript({
  matches: ['https://www.bilibili.com/*'],
  async main() {
    const config = await browser.runtime.sendMessage({ type: 'GET_CONFIG' });
    updateHomeStyle(
      config?.hideFloorCard ?? false,
      config?.hideLiveCard ?? false,
      config?.hideRecommendedSwipe ?? false,
    );

    browser.runtime.onMessage.addListener((message) => {
      if (message.type !== 'SETTING_UPDATED') return;
      updateHomeStyle(
        message.hideFloorCard ?? false,
        message.hideLiveCard ?? false,
        message.hideRecommendedSwipe ?? false,
      );
    });
  },
});
