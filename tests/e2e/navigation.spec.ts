import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const GROUPS = [
  'Manipulation & Learned Policies',
  'RL, Sim-to-Real & Locomotion',
  'World Models',
  'Data, Hardware & Evaluation',
  'Classical Foundations',
  'Frontier & Open Problems',
  'Adjacent Domains',
];

test.describe('navigation shell', () => {
  test('sidebar shows seven groups plus market map and playground', async ({
    page,
  }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Atlas taxonomy' });
    for (const name of GROUPS) {
      await expect(nav.getByRole('button', { name })).toBeVisible();
    }
    await expect(nav.getByRole('link', { name: 'Market Map' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Playground' })).toBeVisible();
  });

  test('group headers toggle their module lists', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Atlas taxonomy' });
    const toggle = nav.getByRole('button', { name: 'World Models' });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(
      nav.getByRole('link', { name: 'Domain overview' }),
    ).toBeVisible();
    // Other groups are untouched.
    await expect(
      nav.getByRole('button', { name: 'Classical Foundations' }),
    ).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  test('deep link to a module expands its group and highlights it', async ({
    page,
  }) => {
    await page.goto('/manipulation/action-chunking/');
    const nav = page.getByRole('navigation', { name: 'Atlas taxonomy' });
    await expect(
      nav.getByRole('button', { name: 'Manipulation & Learned Policies' }),
    ).toHaveAttribute('aria-expanded', 'true');
    const active = nav.getByRole('link', {
      name: 'Action Chunking (ACT and ALOHA)',
    });
    await expect(active).toHaveAttribute('aria-current', 'page');
  });

  test('domain landing lists planned and published modules', async ({
    page,
  }) => {
    await page.goto('/classical/');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Classical Foundations' }),
    ).toBeVisible();
    const main = page.locator('#main-content');
    await expect(
      main.getByText('Kinematics', { exact: true }),
    ).toBeVisible();
    await expect(main.getByText('planned').first()).toBeVisible();
  });

  test('mobile drawer opens, navigates, and closes', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const trigger = page.getByRole('button', { name: 'Open navigation menu' });
    await expect(trigger).toBeVisible();
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const dialog = page.getByRole('dialog', { name: 'Site navigation' });
    await expect(dialog).toBeVisible();
    for (const name of GROUPS) {
      await expect(dialog.getByRole('button', { name })).toBeVisible();
    }
    // Navigate to a domain landing; the drawer must close itself.
    await dialog.getByRole('button', { name: 'Classical Foundations' }).click();
    await dialog.getByRole('link', { name: 'Domain overview' }).click();
    await expect(page).toHaveURL(/\/classical\/$/);
    await expect(dialog).not.toBeVisible();
  });

  test('mobile drawer closes via Escape', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
    const dialog = page.getByRole('dialog', { name: 'Site navigation' });
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });

  test('featured interactive on home is operable', async ({ page }) => {
    await page.goto('/');
    const readout = page.getByTestId('episode-success-readout');
    await expect(readout).toContainText('21.5%');
    const slider = page.getByRole('slider', { name: /episode length/i });
    await slider.focus();
    for (let i = 0; i < 20; i += 1) {
      await page.keyboard.press('ArrowDown');
    }
    await expect(readout).toContainText('59.9%');
    await page.getByRole('button', { name: /reset/i }).click();
    await expect(readout).toContainText('21.5%');
  });

  test('zero axe violations on a domain landing', async ({ page }) => {
    await page.goto('/manipulation/');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('themed not-found page renders for unknown routes', async ({ page }) => {
    await page.goto('/manipulation/bc-foundations/');
    await expect(
      page.getByRole('heading', { name: 'Page not found' }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /Back to the atlas home/ }),
    ).toBeVisible();
  });
});
