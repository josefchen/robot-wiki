import { test as base, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
export { expect, type Locator, type Page } from '@playwright/test';
export const test = base.extend<{ offlineGuard: void }>({
  offlineGuard: [async ({ browser }, runFixture, testInfo) => {
    const denied: string[] = [];
    const original = browser.newContext.bind(browser);
    browser.newContext = async options => {
      const context = await original(options);
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (['localhost','127.0.0.1','[::1]'].includes(url.hostname)) return route.continue();
        denied.push(url.href); return route.abort();
      });
      await context.addInitScript(() => {
        const install = () => {
          if (!document.documentElement) return;
          const style = document.createElement('style');
          style.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}nextjs-portal{display:none!important}';
          document.documentElement.appendChild(style); observer.disconnect();
        };
        const observer = new MutationObserver(install); observer.observe(document,{childList:true,subtree:true}); install();
      });
      return context;
    };
    try { await runFixture(); } finally {
      browser.newContext = original;
      writeFileSync(testInfo.outputPath('offline-requests.json'), JSON.stringify({denied},null,2));
    }
    expect(denied).toEqual([]);
  }, { auto: true }],
});
