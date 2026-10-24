import { registerMessageHandlers } from './messages';
import { getActiveRules } from './rules';

export default defineBackground(() => {
  console.log('Bilibili Blocker background started', { id: browser.runtime.id });

  void getActiveRules().catch((err) => {
    console.error('Failed to load active rules:', err);
  });

  registerMessageHandlers();
});
