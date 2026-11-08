import { browser } from 'wxt/browser';

import type { SetUserEntryResult, UserLists } from '../../types';
import { getUidFromUrl } from '../../utils/uid';

import userButtonStyle from './user-block-button.css?raw';

export const USER_BUTTON_ID = 'bilibili-blocker-user-button';
const BLOCKED_STATUS_ID = 'bilibili-blocker-blocked-status';

function injectUserButtonStyle() {
  if (document.getElementById('bilibili-blocker-user-button-style')) return;
  const style = document.createElement('style');
  style.id = 'bilibili-blocker-user-button-style';
  style.textContent = userButtonStyle;
  document.head.appendChild(style);
}

function getProfileUid(): string | null {
  return getUidFromUrl(location.href);
}

function getProfileUsername(): string {
  const selectors = ['.up-name', '.h-name', '.nickname', 'h1'];
  for (const selector of selectors) {
    const text = document.querySelector(selector)?.textContent?.trim();
    if (text) return text;
  }
  return getProfileUid() ?? '';
}

export function applyUserPageButtonState(uid: string, lists: UserLists, isBlocked: boolean): void {
  const button = document.getElementById(USER_BUTTON_ID) as HTMLButtonElement | null;
  const blockedStatus = document.getElementById(BLOCKED_STATUS_ID);
  if (!button || !blockedStatus || button.dataset.uid !== uid || getProfileUid() !== uid) return;

  const blacklisted = lists.blacklist.some((entry) => entry.uid === uid);
  const whitelisted = lists.whitelist.some((entry) => entry.uid === uid);
  button.dataset.blocked = String(isBlocked);
  button.dataset.blacklisted = String(blacklisted);
  button.dataset.whitelisted = String(whitelisted);
  button.textContent = browser.i18n.getMessage(isBlocked ? 'unblock' : 'block');
  button.className = isBlocked ? 'bilibili-blocker-unblock' : 'bilibili-blocker-block';
  button.disabled = false;
  blockedStatus.hidden = !isBlocked;
}

export async function setupUserPageButton() {
  const uid = getProfileUid();
  if (!uid || !document.body) return;

  if (getProfileUid() !== uid) return;
  const operations = document.querySelector('.operations');
  if (!operations) return;

  injectUserButtonStyle();

  let button = document.getElementById(USER_BUTTON_ID) as HTMLButtonElement | null;
  if (!button) {
    button = document.createElement('button');
    button.id = USER_BUTTON_ID;
    button.type = 'button';
    button.addEventListener('click', async () => {
      const targetUid = button?.dataset.uid;
      if (!targetUid || targetUid !== getProfileUid()) return;
      const isBlocked = button?.dataset.blocked === 'true';
      const isBlacklisted = button?.dataset.blacklisted === 'true';
      const isWhitelisted = button?.dataset.whitelisted === 'true';
      const list = isBlocked
        ? isBlacklisted
          ? 'blacklist'
          : 'whitelist'
        : isWhitelisted
          ? 'whitelist'
          : 'blacklist';
      const enabled = isBlocked ? !isBlacklisted : !isWhitelisted;
      const result = (await browser.runtime.sendMessage({
        type: 'SET_USER_ENTRY',
        list,
        enabled,
        entry: { uid: targetUid, username: getProfileUsername() },
      })) as SetUserEntryResult;
      applyUserPageButtonState(targetUid, result.lists, result.isBlocked);
    });
  }
  if (button.parentElement !== operations) operations.prepend(button);
  button.dataset.uid = uid;
  button.disabled = true;

  let blockedStatus = document.getElementById(BLOCKED_STATUS_ID);
  if (!blockedStatus) {
    blockedStatus = document.createElement('span');
    blockedStatus.id = BLOCKED_STATUS_ID;
    const icon = document.createElement('img');
    icon.src = browser.runtime.getURL('/icon/48.png');
    icon.alt = '';
    blockedStatus.append(icon, document.createTextNode(browser.i18n.getMessage('blockedStatus')));
  }
  if (blockedStatus.parentElement !== operations) operations.insertBefore(blockedStatus, button);

  try {
    const [lists, isBlocked] = await Promise.all([
      browser.runtime.sendMessage({ type: 'GET_USER_LISTS' }),
      browser.runtime.sendMessage({ type: 'IS_BLOCKED', uid }),
    ]);
    if (getProfileUid() !== uid || button.dataset.uid !== uid) return;
    if (typeof isBlocked !== 'boolean') {
      throw new Error(`Invalid blocked status response for ${uid}`);
    }

    applyUserPageButtonState(uid, lists, isBlocked);
  } catch (err) {
    console.error(`Failed to load blocked status for ${uid}:`, err);
    if (button.dataset.uid === uid) {
      button.dataset.uid = '';
      button.disabled = false;
    }
  }
}
