import { browser } from 'wxt/browser';

const USER_BUTTON_ID = 'bilibili-blocker-user-button';
const BLOCKED_STATUS_ID = 'bilibili-blocker-blocked-status';
const FLAGS_CONTAINER_ID = 'bilibili-blocker-account-flags';
const FLAGGING_LINK_ID = 'bilibili-blocker-flagging-link';

interface AccountFlag {
  code: string;
  name: string;
  description: string;
  status: string | null;
  score: number;
}

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
    #${FLAGS_CONTAINER_ID} {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    #${FLAGS_CONTAINER_ID} .bilibili-blocker-account-flag {
      border: 1px solid #333;
      border-radius: 4px;
      padding: 2px 6px;
      background: #333;
      color: #fff;
      font-size: 12px;
      line-height: 18px;
      white-space: nowrap;
    }
    #${FLAGS_CONTAINER_ID} .bilibili-blocker-account-flag[data-approved='true'] {
    }
    #${FLAGS_CONTAINER_ID} .bilibili-blocker-account-flag[data-approved='false'] {
      background: #fffa;
      color: #333;
    }
    #${FLAGGING_LINK_ID} {
      display: inline-block;
      margin: 8px 6px;
      border: 1px solid #fb7299;
      border-radius: 4px;
      padding: 2px 6px;
      background: #fb7299;
      color: #fff;
      font-size: 12px;
      line-height: 18px;
      text-decoration: none;
      vertical-align: middle;
      white-space: nowrap;
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

async function setupAccountFlags(uid: string, detailsTop: Element) {
  let flagsContainer = document.getElementById(FLAGS_CONTAINER_ID);
  if (!flagsContainer) {
    flagsContainer = document.createElement('div');
    flagsContainer.id = FLAGS_CONTAINER_ID;
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
    const flags = (await browser.runtime.sendMessage({
      type: 'GET_ACCOUNT_FLAGS',
      uid,
    })) as AccountFlag[];
    if (flagsContainer.dataset.uid !== uid) return;
    if (!Array.isArray(flags)) throw new Error('Invalid account flags response');

    flagsContainer.replaceChildren();
    for (const flag of flags.filter((item) => item.status === 'approved' || item.score > 0)) {
      const flagElement = document.createElement('span');
      flagElement.className = 'bilibili-blocker-account-flag';
      flagElement.dataset.approved = String(flag.status === 'approved');
      flagElement.title = flag.description;
      flagElement.textContent = `${flag.name} (${flag.score})`;
      flagsContainer.append(flagElement);
    }
    flagsContainer.hidden = flagsContainer.childElementCount === 0;
  } catch (err) {
    if (flagsContainer.dataset.uid !== uid) return;
    console.error(`Failed to load account flags for ${uid}:`, err);
    flagsContainer.textContent = '标记加载失败';
    flagsContainer.hidden = false;
  }
}

async function setupUserPageButton() {
  const uid = getProfileUid();
  if (!uid || !document.body) return;

  await waitForIdle();
  if (getProfileUid() !== uid) return;
  const operations = document.querySelector('.operations');
  const detailsTop = document.querySelector('.upinfo-detail__top');
  if (detailsTop) void setupAccountFlags(uid, detailsTop);
  if (!operations) return;

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
      await browser.runtime.sendMessage({
        type: 'SET_USER_ENTRY',
        list,
        enabled,
        entry: { uid: targetUid, username: getProfileUsername() },
      });
      await setupUserPageButton();
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

    const blacklisted = lists.blacklist.some((entry: { uid: string }) => entry.uid === uid);
    const whitelisted = lists.whitelist.some((entry: { uid: string }) => entry.uid === uid);
    button.dataset.blocked = String(isBlocked);
    button.dataset.blacklisted = String(blacklisted);
    button.dataset.whitelisted = String(whitelisted);
    button.textContent = browser.i18n.getMessage(isBlocked ? 'unblock' : 'block');
    button.className = isBlocked ? 'bilibili-blocker-unblock' : 'bilibili-blocker-block';
    button.disabled = false;
    blockedStatus.hidden = !isBlocked;
  } catch (err) {
    console.error(`Failed to load blocked status for ${uid}:`, err);
    if (button.dataset.uid === uid) {
      button.dataset.uid = '';
      button.disabled = false;
    }
  }
}

export default defineContentScript({
  matches: ['*://space.bilibili.com/*'],
  async main() {
    injectUserPageStyle();
    setupUserPageButton();

    const observer = new MutationObserver(() => {
      const uid = getProfileUid();
      const button = document.getElementById(USER_BUTTON_ID);
      if (uid && (!button || button.dataset.uid !== uid)) setupUserPageButton();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    browser.runtime.onMessage.addListener((message) => {
      if (message.type !== 'RULES_UPDATED') return;
      setupUserPageButton();
    });
  },
});
