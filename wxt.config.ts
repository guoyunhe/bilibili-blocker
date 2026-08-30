import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: '__MSG_extensionName__',
    description: '__MSG_extensionDescription__',
    default_locale: 'en',
    permissions: ['storage'],
    host_permissions: ['*://*.bilibili.com/*', 'https://bilibili-blocker.netlify.app/*'],
    browser_specific_settings: {
      gecko: {
        id: 'bilibili-blocker@guoyunhe.me',
        strict_min_version: '115.0',
        data_collection_permissions: {
          required: ['none'],
        },
      },
    },
  },
  webExt: {
    startUrls: ['https://www.bilibili.com/', 'https://space.bilibili.com/3546971467942113'],
  },
});
