import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  DOMAIN_META,
  DOMAINS,
  modulesByDomain,
  publishedModules,
} from '../../data/modules';

/**
 * The seven domain landing pages (VAL-WIKI-022, VAL-WIKI-023, VAL-WIKI-024,
 * VAL-DESIGN-015): one generated page per top-level taxonomy entry, the six
 * core domains plus adjacent, each listing every published article in that
 * domain with its summary, zero drafts, reachable by clicking from the
 * chrome, complete against the module registry.
 */

test.describe('domain landing pages', () => {
  test('all seven exist with title, description, and a complete published-article list (VAL-WIKI-022)', async ({
    page,
  }) => {
    expect(DOMAINS).toHaveLength(7);
    const grouped = modulesByDomain();

    for (const domain of DOMAINS) {
      await test.step(`/${domain}/`, async () => {
        const response = await page.goto(`/${domain}/`);
        expect(response?.ok(), `/${domain}/ returns 200`).toBe(true);

        // Title is the taxonomy name the sidebar uses; description is the
        // taxonomy's own sentence, not a placeholder.
        await expect(page.locator('h1')).toHaveText(DOMAIN_META[domain].name);
        const main = page.locator('#main-content');
        await expect(
          main.getByText(DOMAIN_META[domain].description),
        ).toBeVisible();

        // The rendered article set equals the registry's published set for
        // this domain: symmetric difference empty, no duplicates. A domain
        // whose registry entries are all drafts (adjacent, until the
        // backfill feature publishes its articles) renders an empty list
        // and nothing else: no placeholders, no "coming soon".
        const expected = (grouped[domain] ?? []).filter(
          (m) => m.status === 'published',
        );
        const links = main.locator('[data-domain-article] a');
        await expect(links).toHaveCount(expected.length);
        const renderedHrefs = await links.evaluateAll((els) =>
          els.map((el) => el.getAttribute('href')),
        );
        expect(new Set(renderedHrefs).size).toBe(expected.length);
        for (const m of expected) {
          expect(renderedHrefs).toContain(`/${m.domain}/${m.slug}/`);
          // Each entry carries that article's own summary text.
          await expect(main.getByText(m.summary)).toBeVisible();
        }

        // Drafts appear in no form: no link, no dimmed row, no placeholder.
        for (const draft of (grouped[domain] ?? []).filter(
          (m) => m.status === 'draft',
        )) {
          await expect(
            main.getByRole('link', { name: draft.title, exact: true }),
          ).toHaveCount(0);
          await expect(
            main.getByText(draft.title, { exact: true }),
          ).toHaveCount(0);
        }

        // No authoring-progress counters (VAL-DESIGN-015): a count of what
        // exists to read is fine; counts of unwritten work are banned.
        await expect(main.getByText(/\d+\s+of\s+\d+\s+modules?/i)).toHaveCount(
          0,
        );
        await expect(
          main.getByText(
            /\d+\s+(modules?|articles?)\s+(planned|remaining|pending|upcoming)/i,
          ),
        ).toHaveCount(0);
        await expect(main.getByText(/coming soon/i)).toHaveCount(0);
      });
    }
  });

  test('every listed article link resolves to a 200 page whose h1 matches its label', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    // Every link across all seven landings returns 200 (document requests,
    // no rendering). The h1-match check navigates one article per domain
    // with published articles so the sweep stays fast on the dev server.
    for (const domain of DOMAINS) {
      await page.goto(`/${domain}/`);
      const entries = page.locator('[data-domain-article] a');
      const count = await entries.count();
      for (let i = 0; i < count; i += 1) {
        const href = await entries.nth(i).getAttribute('href');
        const response = await page.request.get(href!);
        expect(response.ok(), `${href} returns 200`).toBe(true);
      }
    }
    for (const domain of DOMAINS) {
      await page.goto(`/${domain}/`);
      const first = page.locator('[data-domain-article] a').first();
      if ((await first.count()) === 0) continue;
      const label = (await first.textContent())?.trim() ?? '';
      await first.click();
      await expect(
        page.locator('h1'),
        `first article h1 on /${domain}/`,
      ).toHaveText(label);
    }
  });

  test('reachable by clicking from the chrome, with an active state (VAL-WIKI-023)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const domain of DOMAINS) {
      await page.goto('/');
      const sidebar = page.locator('aside');
      const nav = sidebar.getByRole('navigation', {
        name: 'robot-wiki taxonomy',
      });
      const toggle = nav.getByRole('button', {
        name: DOMAIN_META[domain].name,
      });
      if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
        await toggle.click();
      }
      await nav.getByRole('link', { name: 'Domain overview' }).click();
      await page.waitForURL(`/${domain}/`);
      await expect(page.locator('h1')).toHaveText(DOMAIN_META[domain].name);
      await expect(
        nav.getByRole('link', { name: 'Domain overview' }),
      ).toHaveAttribute('aria-current', 'page');
    }
  });

  test('renders without horizontal overflow at 375px and 1440px (VAL-WIKI-024)', async ({
    browser,
  }) => {
    for (const width of [375, 1440]) {
      const context = await browser.newContext({
        viewport: { width, height: width === 375 ? 812 : 900 },
      });
      const page = await context.newPage();
      for (const domain of DOMAINS) {
        await page.goto(`/${domain}/`);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        expect(
          overflow,
          `/${domain}/ has no horizontal scroll at ${width}px`,
        ).toBeLessThanOrEqual(0);
      }
      await context.close();
    }
  });

  test('zero axe violations on every domain landing page (VAL-WIKI-024)', async ({
    page,
  }) => {
    for (const domain of DOMAINS) {
      await page.goto(`/${domain}/`);
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations, `axe on /${domain}/`).toEqual([]);
    }
  });

  test('the wiki-furniture loop closes by clicking alone (VAL-CROSS-028)', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    // / -> /a-z via the chrome.
    await page.goto('/');
    await page
      .locator('aside')
      .getByRole('link', { name: 'A-Z Index' })
      .click();
    await page.waitForURL('/a-z/');
    await expect(page.locator('h1')).toHaveText('A-Z Index');

    // -> an article via its index entry. action-chunking is the anchor:
    // see-also.spec.ts proves it carries both a See also list and inbound
    // backlinks, so the round trip below always has links to follow.
    const first = publishedModules().find(
      (m) => m.domain === 'manipulation' && m.slug === 'action-chunking',
    )!;
    await page
      .locator('[data-az-entry]')
      .getByRole('link', { name: first.title })
      .click();
    await page.waitForURL(`/${first.domain}/${first.slug}/`);
    await expect(page.locator('h1')).toHaveText(first.title);

    // -> one of that article's See also targets.
    const seeAlso = page.locator('section[data-section="see-also"] a').first();
    const targetLabel = (await seeAlso.textContent())?.trim() ?? '';
    await seeAlso.click();
    await expect(page.locator('h1')).toHaveText(targetLabel);
    const targetUrl = page.url();

    // -> back to the first article via its Linked from entry.
    const backlink = page
      .locator('section[data-section="linked-from"]')
      .getByRole('link', {
        name: first.title,
      });
    await expect(backlink).toBeVisible();
    await backlink.click();
    await expect(page.locator('h1')).toHaveText(first.title);
    expect(page.url()).not.toBe(targetUrl);

    // -> the article's domain landing via the middle breadcrumb.
    await page
      .getByRole('navigation', { name: 'Breadcrumb' })
      .getByRole('link', { name: DOMAIN_META[first.domain].name })
      .click();
    await page.waitForURL(`/${first.domain}/`);
    await expect(page.locator('h1')).toHaveText(DOMAIN_META[first.domain].name);
    // The sidebar highlight tracks the landing page.
    await expect(
      page.locator('aside').getByRole('link', { name: 'Domain overview' }),
    ).toHaveAttribute('aria-current', 'page');

    // -> /glossary via the chrome entry point -> back home.
    await page.locator('aside').getByRole('link', { name: 'Glossary' }).click();
    await page.waitForURL('/glossary/');
    await expect(page.locator('h1')).toHaveText('Glossary');
    await page
      .locator('aside')
      .getByRole('link', { name: 'robot-wiki' })
      .click();
    await page.waitForURL('/');
    await expect(page.locator('h1')).toContainText('robot-wiki');
  });
});
