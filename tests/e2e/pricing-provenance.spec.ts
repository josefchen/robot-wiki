import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const source = 'https://github.com/alpibrusl/lex-robot/issues/3';
const evidence = process.env.PRICING_EVIDENCE_DIR;

async function settled(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
}

for (const viewport of [{ width: 375, height: 812 }, { width: 1440, height: 900 }]) {
  test(`pricing provenance renders and remains keyboard usable at ${viewport.width}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const output = evidence ?? testInfo.outputPath('pricing-provenance');
    mkdirSync(output, { recursive: true });
    const captures: string[] = [];
    const checks: object[] = [];
    async function capture(name: string, fullPage = false) {
      const path = join(output, `${viewport.width}-${name}.png`);
      await page.screenshot({ path, fullPage, animations: 'disabled' });
      captures.push(path);
    }
    async function inspect(route: string) {
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      const axe = await new AxeBuilder({ page }).analyze();
      expect(axe.violations).toEqual([]);
      checks.push({
        route, overflow, axeViolations: axe.violations,
        h1: await page.locator('h1').evaluate((element) => {
          const style = getComputedStyle(element);
          return { text: element.textContent, fontFamily: style.fontFamily, fontSize: style.fontSize };
        }),
      });
    }

    await page.goto('/');
    await settled(page);
    await expect(page.locator('h1')).toHaveText('Robot Wiki');
    await expect(page.getByText('Citation-first encyclopedia of modern robot learning.', { exact: true }).first()).toBeVisible();
    await expect(page.locator('mark[data-brand-highlight="home-premise"]')).toHaveText('traceable to cited evidence');
    await capture('home-full', true);
    const promise = page.locator('p').filter({ has: page.locator('mark[data-brand-highlight="home-premise"]') });
    await promise.scrollIntoViewIfNeeded();
    await expect(promise).toContainText('a citation is not a guarantee that a claim has been verified');
    await capture('home-source-strength');
    await inspect('/');

    await page.goto('/data-hardware/teleop-rigs/');
    await settled(page);
    await capture('teleop-top');
    const table = page.getByRole('table', { name: /teleoperation rig families/i });
    const aloha = table.locator('tbody tr').filter({ hasText: 'ALOHA-class workstation' });
    const cost = aloha.locator('td').nth(1);
    await expect(cost.getByText('not disclosed', { exact: true })).toBeVisible();
    for (const text of ['researched Jun 2026', 'ALOHA / ALOHA 2', '$17k-32k', 'currency code', 'configurations', 'inclusions/exclusions', 'not a vendor quote']) {
      await expect(cost).toContainText(text);
    }
    await expect(table.locator('tbody td:nth-child(2)').getByText('not disclosed', { exact: true })).toHaveCount(2);
    await expect(table.getByText('n/a', { exact: true })).toHaveCount(0);
    await cost.scrollIntoViewIfNeeded();
    await capture('teleop-community-cell');
    const highlight = page.getByRole('button', { name: 'Cost', exact: true });
    await highlight.focus();
    await page.keyboard.press('Enter');
    await expect(highlight).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('region', { name: 'Dimension detail' })).toContainText('not a current vendor quote');
    await capture('teleop-cost-disclosure');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('region', { name: 'Dimension detail' })).toHaveCount(0);
    const communityLink = aloha.getByRole('link', { name: 'Community estimate (Jun 2026)' });
    await communityLink.focus();
    await expect(communityLink).toBeFocused();
    await expect(communityLink).toHaveAttribute('href', source);
    await expect(communityLink).toHaveAttribute('rel', /noopener/);
    // Inspect the citation without opening a new external source request.
    const chip = page.locator('div.prose[data-pagefind-body] a').filter({ hasText: /2026/ }).and(page.locator(`a[href="${source}"]`)).first();
    await chip.focus();
    await expect(chip).toBeFocused();
    await expect(chip).toHaveAttribute('href', source);
    await expect(page.locator('div.prose[data-pagefind-body]')).toContainText('The $300 buys a controller only');
    expect(await page.locator('span.katex').count()).toBe(0);
    await inspect('/data-hardware/teleop-rigs/');
    await capture('teleop-citation-focus');

    await page.goto('/data-hardware/hardware-taxonomy/');
    await settled(page);
    const unknownFilter = page.getByRole('button', { name: 'No listed price', exact: true });
    await unknownFilter.focus();
    await page.keyboard.press('Enter');
    await expect(unknownFilter).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('20 of 40 entries')).toBeVisible();
    const hardware = page.getByRole('table', { name: /hardware entries/i });
    const hardwarePrice = hardware.locator('tbody tr').filter({ has: page.getByText('ALOHA 2', { exact: true }) }).locator('td').nth(2);
    await expect(hardwarePrice.getByText('not disclosed', { exact: true })).toBeVisible();
    await expect(hardwarePrice).toContainText('not a vendor quote');
    await expect(hardwarePrice).not.toContainText('as of');
    const issue = hardwarePrice.getByRole('link', { name: 'Community estimate (Jun 2026)' });
    await issue.focus();
    await expect(issue).toBeFocused();
    await expect(issue).toHaveAttribute('href', source);
    await capture('hardware-community-cell');
    await inspect('/data-hardware/hardware-taxonomy/');
    expect(errors).toEqual([]);
    writeFileSync(join(output, `${viewport.width}-render-checks.json`), JSON.stringify({
      viewport, source, checks, captures, pageErrors: errors,
      lane: 'Current Next development rendering; not production export or release acceptance',
      externalSourceNavigations: 0,
    }, null, 2));
  });
}


test('mobile price provenance remains readable after bounded table scrolling', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/data-hardware/hardware-taxonomy/');
  await settled(page);
  await page.getByRole('button', { name: 'No listed price', exact: true }).click();
  const table = page.getByRole('table', { name: /hardware entries/i });
  const cell = table.locator('tbody tr').filter({ has: page.getByText('ALOHA 2', { exact: true }) }).locator('td').nth(2);
  await cell.getByRole('link', { name: 'Community estimate (Jun 2026)' }).focus();
  await cell.evaluate((element) => element.scrollIntoView({ block: 'center', inline: 'center' }));
  const bounds = await cell.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(375);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  await expect(cell).toContainText('inclusions/exclusions not itemized');
  const output = evidence ?? testInfo.outputPath('pricing-provenance');
  mkdirSync(output, { recursive: true });
  await page.screenshot({ path: join(output, '375-hardware-price-scrolled.png'), animations: 'disabled' });
});
