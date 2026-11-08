import { browser } from 'wxt/browser';

import { formatRating } from '../../utils/rating';
import type { UserAccountData } from '../../utils/server-api';

import userFlagsStyle from './user-flags.css?raw';

export const USER_FLAGS_CONTAINER_ID = 'bilibili-blocker-user-flags';
const FLAGGING_LINK_ID = 'bilibili-blocker-flagging-link';

function injectUserFlagsStyle() {
  if (document.getElementById('bilibili-blocker-user-flags-style')) return;
  const style = document.createElement('style');
  style.id = 'bilibili-blocker-user-flags-style';
  style.textContent = userFlagsStyle;
  document.head.appendChild(style);
}

export async function setupUserFlags(uid: string, detailsTop: Element) {
  injectUserFlagsStyle();

  let flagsContainer = document.getElementById(USER_FLAGS_CONTAINER_ID);
  if (!flagsContainer) {
    flagsContainer = document.createElement('div');
    flagsContainer.id = USER_FLAGS_CONTAINER_ID;
  }
  if (flagsContainer.parentElement !== detailsTop) detailsTop.append(flagsContainer);

  let flaggingLink = document.getElementById(FLAGGING_LINK_ID) as HTMLAnchorElement | null;
  if (!flaggingLink) {
    flaggingLink = document.createElement('a');
    flaggingLink.id = FLAGGING_LINK_ID;
    flaggingLink.textContent = '打标';
    flaggingLink.target = '_blank';
    flaggingLink.rel = 'noreferrer';
  }
  flaggingLink.href = `https://bilibili-blocker.guoyunhe.me/accounts/${uid}`;
  if (flaggingLink.parentElement !== detailsTop) detailsTop.append(flaggingLink);

  if (flagsContainer.dataset.uid === uid) return;
  flagsContainer.dataset.uid = uid;
  flagsContainer.hidden = false;
  flagsContainer.textContent = '标记加载中…';

  try {
    const result = (await browser.runtime.sendMessage({
      type: 'GET_ACCOUNT_DATA',
      uid,
    })) as UserAccountData;
    if (flagsContainer.dataset.uid !== uid) return;
    const { rating, flags } = result;

    flagsContainer.replaceChildren();
    if (rating !== null) {
      const ratingElement = document.createElement('span');
      const formattedRating = formatRating(rating);
      const star = document.createElement('span');
      star.textContent = '★';
      star.style.color = formattedRating.color;
      star.setAttribute('aria-hidden', 'true');
      const value = document.createElement('span');
      value.textContent = formattedRating.value;
      value.style.color = formattedRating.color;
      ratingElement.setAttribute(
        'aria-label',
        `评分 ${formattedRating.value}，${result.ratingCount} 个评分`,
      );
      ratingElement.append(star, ' ', value, ` (${result.ratingCount})`);
      flagsContainer.append(ratingElement);
    }
    for (const flag of flags.filter((item) => item.status === 'approved' || item.score > 0)) {
      const flagElement = document.createElement('span');
      flagElement.className = 'bilibili-blocker-user-flag';
      flagElement.dataset.approved = String(flag.status === 'approved');
      flagElement.title = flag.description;
      flagElement.textContent = `${flag.name} (${flag.score})`;
      flagsContainer.append(flagElement);
    }
    flagsContainer.hidden = flagsContainer.childElementCount === 0;
  } catch (err) {
    if (flagsContainer.dataset.uid !== uid) return;
    console.error(`Failed to load user flags for ${uid}:`, err);
    flagsContainer.textContent = '标记加载失败';
    flagsContainer.hidden = false;
  }
}
