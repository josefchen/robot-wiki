import { expect, type Page } from '@playwright/test';

/**
 * Opens the site navigation panel from the top bar's "Articles" button.
 *
 * Owner-approved successor (Josef, 2026-10-10, the research-page standard):
 * the persistent sidebar is gone. The taxonomy navigation, with its groups,
 * links and current-route state, lives in the panel this button opens at
 * every width (tests/e2e/navigation.spec.ts). Specs that read the sidebar
 * open the panel first and assert the same links and states there.
 */
export async function openArticlesPanel(page: Page): Promise<void> {
  // On a cold dev-server compile the first load can beat hydration, and a
  // click before it is a no-op. The router stamps history.state once it
  // initializes (the same wait as tests/e2e/navigation.spec.ts).
  await page.waitForFunction(() => window.history.state !== null);
  await page.getByRole('button', { name: 'Articles' }).click();
  await expect(page.getByRole('dialog', { name: 'Site navigation' })).toBeVisible();
}
