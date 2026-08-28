import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    permissions: ['storage'],
    host_permissions: ['*://*.bilibili.com/*', 'https://bilibili-blocker.netlify.app/*'],
  },
  webExt: {
    startUrls: ['https://www.bilibili.com/', 'https://space.bilibili.com/3546971467942113'],
  },
});
