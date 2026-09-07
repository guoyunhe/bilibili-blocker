import { browser } from 'wxt/browser';

const USER_BUTTON_ID = 'bilibili-blocker-user-button';
const BLOCKED_STATUS_ID = 'bilibili-blocker-blocked-status';

function injectUserPageStyle() {
  if (document.getElementById('bilibili-blocker-user-style')) return;
  const style = document.createElement('style');
  style.id = 'bilibili-blocker-user-style';
  style.textContent = `
    #bilibili-blocker-user-button {
      position: relative;
      z-index: 2;
      margin: 8px;
      border: 0;
      border-radius: 4px;
      padding: 7px 14px;
      color: #fff;
      cursor: pointer;
      font-size: 13px;
    }
    #bilibili-blocker-user-button.bilibili-blocker-block { background: #fb7299; }
    #bilibili-blocker-user-button.bilibili-blocker-unblock { background: #666; }
    #bilibili-blocker-blocked-status {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      margin: 8px 0 8px 8px;
      color: #fff;
      text-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
      font-size: 13px;
      line-height: 16px;
      vertical-align: middle;
    }
    #bilibili-blocker-blocked-status[hidden] { display: none; }
    #bilibili-blocker-blocked-status img {
      width: 16px;
      height: 16px;
    }
  `;
  document.head.appendChild(style);
}

function getProfileUid(): string | null {
  const match = location.pathname.match(/^\/(\d+)(?:\/|$)/);
  return match?.[1] ?? null;
}

function getProfileUsername(): string {
  const selectors = ['.up-name', '.h-name', '.nickname', 'h1'];
  for (const selector of selectors) {
    const text = document.querySelector(selector)?.textContent?.trim();
    if (text) return text;
  }
  return getProfileUid() ?? '';
}

function waitForIdle(): Promise<void> {
  return new Promise((resolve) => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => resolve(), { timeout: 1000 });
    } else {
      setTimeout(resolve, 0);
    }
  });
}

async function setupUserPageButton(blockedIds: Set<string>) {
  const uid = getProfileUid();
  if (!uid || !document.body) return;

  await waitForIdle();
  const operations = document.querySelector('.operations');
  if (!operations) return;

  let button = document.getElementById(USER_BUTTON_ID) as HTMLButtonElement | null;
  if (!button) {
    button = document.createElement('button');
    button.id = USER_BUTTON_ID;
    button.type = 'button';
    button.addEventListener('click', async () => {
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
      await browser.runtime.sendMessage({
        type: 'SET_USER_ENTRY',
        list,
        enabled,
        entry: { uid, username: getProfileUsername() },
      });
      const newIds = (await browser.runtime.sendMessage({ type: 'GET_RULES' })) as string[];
      blockedIds.clear();
      for (const id of newIds) blockedIds.add(id);
      await setupUserPageButton(blockedIds);
    });
  }
  if (button.parentElement !== operations) operations.prepend(button);

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

  const lists = await browser.runtime.sendMessage({ type: 'GET_USER_LISTS' });
  const blacklisted = lists.blacklist.some((entry: { uid: string }) => entry.uid === uid);
  const whitelisted = lists.whitelist.some((entry: { uid: string }) => entry.uid === uid);
  const isBlocked = blockedIds.has(uid) && !whitelisted;
  button.dataset.blocked = String(isBlocked);
  button.dataset.blacklisted = String(blacklisted);
  button.dataset.whitelisted = String(whitelisted);
  button.dataset.uid = uid;
  button.textContent = browser.i18n.getMessage(isBlocked ? 'unblock' : 'block');
  button.className = isBlocked ? 'bilibili-blocker-unblock' : 'bilibili-blocker-block';
  blockedStatus.hidden = !isBlocked;
}

export default defineContentScript({
  matches: ['*://space.bilibili.com/*'],
  async main() {
    let blockedIds: string[] = [];
    try {
      blockedIds = await browser.runtime.sendMessage({ type: 'GET_RULES' });
    } catch (err) {
      console.error('Failed to get rules:', err);
    }

    const blockedIdSet = new Set(blockedIds);
    injectUserPageStyle();
    setupUserPageButton(blockedIdSet);

    const observer = new MutationObserver(() => {
      const uid = getProfileUid();
      const button = document.getElementById(USER_BUTTON_ID);
      if (uid && (!button || button.dataset.uid !== uid)) setupUserPageButton(blockedIdSet);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    browser.runtime.onMessage.addListener((message) => {
      if (message.type !== 'RULES_UPDATED') return;
      blockedIdSet.clear();
      for (const id of message.ids as string[]) blockedIdSet.add(id);
      setupUserPageButton(blockedIdSet);
    });
  },
});
