const ADD_RULE_UIDS_MESSAGE_TYPE = 'ADD_RULE_UIDS';
const FLAG_CODE_PATTERN = /^[a-z0-9_-]{1,32}$/;

export default defineContentScript({
  matches: ['https://bilibili-blocker.guoyunhe.me/*'],
  runAt: 'document_start',
  main() {
    window.addEventListener('message', (event: MessageEvent<unknown>) => {
      if (
        event.source !== window ||
        event.origin !== window.location.origin ||
        typeof event.data !== 'object' ||
        event.data === null
      ) {
        return;
      }

      const message = event.data as {
        type?: string;
        code?: unknown;
        uids?: unknown;
      };
      if (
        message.type !== ADD_RULE_UIDS_MESSAGE_TYPE ||
        typeof message.code !== 'string' ||
        !FLAG_CODE_PATTERN.test(message.code) ||
        !Array.isArray(message.uids) ||
        !message.uids.every((uid) => typeof uid === 'string' && /^\d+$/.test(uid))
      ) {
        return;
      }

      void browser.runtime
        .sendMessage({ type: 'ADD_RULE_UIDS', code: message.code, uids: message.uids })
        .catch((error: unknown) => {
          console.error('Failed to add imported UIDs to extension rules:', error);
        });
    });
  },
});
