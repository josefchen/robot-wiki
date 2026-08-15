import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTE = '/adjacent/surgical/';

test.describe('adjacent surgical module', () => {
  test('renders with h1 and substantive article prose (VAL-ADJ-004)', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto(ROUTE);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Surgical Robotics' }),
    ).toBeVisible();

    const prose = page.locator('div.prose[data-pagefind-body]');
    await expect(prose).toBeVisible();
    const text = (await prose.textContent()) ?? '';
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    // Concise but substantive, matching the drones module's bar
    // (VAL-ADJ-001's 3,000-word floor applies only to autonomous-vehicles).
    expect(words, `article word count (${words})`).toBeGreaterThanOrEqual(1500);

    const fontFamily = await prose.evaluate((el) =>
      getComputedStyle(el).getPropertyValue('font-family'),
    );
    expect(fontFamily.toLowerCase()).toContain('serif');

    const nav = page.getByRole('navigation', { name: 'robot-wiki taxonomy' });
    await expect(
      nav.getByRole('link', { name: 'Surgical Robotics' }),
    ).toHaveAttribute('aria-current', 'page');
    expect(errors).toEqual([]);
  });

  test('names the three companies in prose (VAL-ADJ-004)', async ({ page }) => {
    await page.goto(ROUTE);
    const prose = page.locator('div.prose[data-pagefind-body]');
    const text = (await prose.textContent()) ?? '';
    for (const name of [
      'Intuitive',
      'CMR Surgical',
      'Moon Surgical',
      'da Vinci',
      'Versius',
      'Maestro',
    ]) {
      expect(text, `prose should name ${name}`).toContain(name);
    }
  });

  test('covers the precision/reliability bar with citations (VAL-ADJ-004)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await expect(
      page.getByRole('heading', { level: 2, name: 'The precision and reliability bar' }),
    ).toBeVisible();
    const prose = page.locator('div.prose[data-pagefind-body]');
    const text = (await prose.textContent()) ?? '';
    // The reliability argument (compounding, adverse events) and the
    // precision argument (STAR's supervised autonomous suturing).
    expect(text).toMatch(/compounds|reliability gap/);
    expect(text).toMatch(/STAR/);
    expect(text).toMatch(/anastomosis/);
    expect(text).toMatch(/Yang/);
  });

  test('citation chips resolve to primary sources (VAL-ADJ-004)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const prose = page.locator('div.prose[data-pagefind-body]');
    // The three companies plus the framework and the STAR study.
    await expect(
      prose.getByRole('link', { name: 'Intuitive Surgical 2024' }).first(),
    ).toHaveAttribute(
      'href',
      'https://www.globenewswire.com/news-release/2024/03/14/2846718/7637/en/Intuitive-Announces-FDA-Clearance-of-Fifth-Generation-Robotic-System-da-Vinci-5.html',
    );
    await expect(
      prose.getByRole('link', { name: 'Intuitive Surgical 2026' }).first(),
    ).toHaveAttribute(
      'href',
      'https://www.globenewswire.com/news-release/2026/01/22/3224266/0/en/intuitive-announces-fourth-quarter-earnings.html',
    );
    await expect(
      prose.getByRole('link', { name: 'CMR Surgical 2024' }).first(),
    ).toHaveAttribute(
      'href',
      'https://www.globenewswire.com/news-release/2024/10/15/2963054/0/en/CMR-Surgical-receives-US-FDA-Marketing-Authorization-for-Versius-Surgical-System.html',
    );
    await expect(
      prose.getByRole('link', { name: 'Moon Surgical 2025' }).first(),
    ).toHaveAttribute(
      'href',
      'https://www.prnewswire.com/news-releases/moon-surgical-receives-fda-clearance-for-scopilot-on-maestro-industrys-first-ai-enhanced-intraoperative-capability-powered-by--nvidia-holoscan-302404920.html',
    );
    await expect(
      prose.getByRole('link', { name: 'Yang 2017' }).first(),
    ).toHaveAttribute('href', 'https://doi.org/10.1126/scirobotics.aam8638');
    await expect(
      prose.getByRole('link', { name: 'Shademan 2016' }).first(),
    ).toHaveAttribute('href', 'https://doi.org/10.1126/scitranslmed.aad9398');
    const chips = prose.locator('a[href^="https://"]');
    expect(await chips.count()).toBeGreaterThanOrEqual(10);
  });

  test('systems table renders completely with no unparsed JSX (VAL-ADJ-007)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const table = page.getByRole('table', {
      name: /surgical robotic systems compared/i,
    });
    await expect(table).toBeVisible();
    await expect(table.getByRole('columnheader').first()).toBeVisible();
    await expect(table.locator('tbody tr')).toHaveCount(3);
    // The overflow wrapper is a scrollable region: it must be keyboard
    // reachable (axe scrollable-region-focusable).
    const wrap = table.locator('xpath=ancestor::div[contains(@tabindex,"0")]');
    await expect(wrap).toHaveAttribute('tabindex', '0');
    const text =
      (await page.locator('div.prose[data-pagefind-body]').textContent()) ?? '';
    expect(text).not.toContain('import {');
    expect(text).not.toContain('<Cite');
    expect(text).not.toContain('<Term');
    expect(text).not.toContain('<SurgicalSystemsTable');
    expect(text).not.toContain('$$');
  });

  test('wiki apparatus renders: references, linked from, see also', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await expect(
      page.getByRole('heading', { level: 2, name: 'References' }),
    ).toBeVisible();
    // The drones sibling links back to this module from its closing prose,
    // so Linked from must list it.
    const linkedFrom = page.locator('section[data-section="linked-from"]');
    await expect(linkedFrom).toBeVisible();
    await expect(
      linkedFrom.getByRole('link', { name: 'Drones and Aerial Robotics' }),
    ).toBeVisible();
    const seeAlso = page.locator('section[data-section="see-also"]');
    await expect(seeAlso).toBeVisible();
    expect(await seeAlso.locator('li').count()).toBeGreaterThanOrEqual(2);
  });

  test('no horizontal page scroll at 375px', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
    });
    const page = await context.newPage();
    await page.goto(ROUTE);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await context.close();
  });

  test('zero axe violations', async ({ page }) => {
    await page.goto(ROUTE);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
