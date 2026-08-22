import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { glossaryTermsAlphabetical } from '../../data/glossary';
import { DOMAIN_META, modules, publishedModules } from '../../data/modules';

/**
 * The A-Z index at /a-z (VAL-WIKI-019, VAL-WIKI-020, VAL-WIKI-021): every
 * published article and every glossary term in one alphabetical list,
 * grouped by first letter with jump links, complete against the registry,
 * drafts excluded, reachable by clicking from the site chrome.
 *
 * Expected ordering is derived here, independently of lib/az-index.ts, so
 * the spec cannot pass against its own implementation bug.
 */

type ExpectedEntry = {
  kind: 'article' | 'term';
  label: string;
  href: string;
  group: string;
};

const expectedEntries: ExpectedEntry[] = [
  ...publishedModules().map((m) => ({
    kind: 'article' as const,
    label: m.title,
    href: `/${m.domain}/${m.slug}/`,
    group: DOMAIN_META[m.domain].name,
  })),
  ...glossaryTermsAlphabetical().map((t) => ({
    kind: 'term' as const,
    label: t.term,
    href: `/glossary/#${t.id}`,
    group: 'Glossary',
  })),
].sort((a, b) => {
  // The page groups by first letter and files everything that does not start
  // with a letter under a trailing '#' group, so a label like
  // "3D Gaussian splatting" sorts after Z rather than before A. Deriving a
  // flat sort here would disagree with the rendered order for that entry
  // alone, which is exactly the case a flat sort cannot see.
  const bucket = (label: string) =>
    /^[a-z]/i.test(label.trim()) ? label.trim()[0]!.toUpperCase() : '~';
  const byBucket = bucket(a.label).localeCompare(bucket(b.label), 'en');
  if (byBucket !== 0) return byBucket;
  const byLabel = a.label.localeCompare(b.label, 'en', { sensitivity: 'base' });
  return byLabel !== 0 ? byLabel : a.label.localeCompare(b.label);
});

const articleCount = publishedModules().length;
const termCount = glossaryTermsAlphabetical().length;

test.describe('A-Z index', () => {
  test('loads with a visible total count of what a reader can read now', async ({
    page,
  }) => {
    const response = await page.goto('/a-z/');
    expect(response?.ok()).toBe(true);
    await expect(
      page.getByRole('heading', { level: 1, name: 'A-Z Index' }),
    ).toBeVisible();
    const main = page.locator('#main-content');
    await expect(
      main.getByText(`${articleCount} articles`),
    ).toBeVisible();
    await expect(
      main.getByText(new RegExp(`${termCount} glossary terms`)),
    ).toBeVisible();
    // No authoring-progress counters and no draft placeholders
    // (VAL-DESIGN-001/015, VAL-WIKI-021).
    await expect(main.getByText(/\d+\s+of\s+\d+\s+modules?/i)).toHaveCount(0);
    await expect(main.getByText(/planned/i)).toHaveCount(0);
    await expect(main.getByText(/coming soon/i)).toHaveCount(0);
  });

  test('lists every published article and term alphabetically, complete against the registry (VAL-WIKI-019/020)', async ({
    page,
  }) => {
    await page.goto('/a-z/');
    const entries = page.locator('[data-az-entry]');
    await expect(entries).toHaveCount(expectedEntries.length);

    const rendered = await entries.evaluateAll((els) =>
      els.map((el) => {
        const link = el.querySelector('a');
        return {
          label: link?.textContent?.trim() ?? '',
          href: link?.getAttribute('href') ?? '',
          group: el.getAttribute('data-az-group') ?? '',
        };
      }),
    );

    // Set equality against the registry (zero missing, zero extra).
    const renderedHrefs = new Set(rendered.map((e) => e.href));
    const expectedHrefs = new Set(expectedEntries.map((e) => e.href));
    for (const href of expectedHrefs) {
      expect(renderedHrefs.has(href), `missing entry ${href}`).toBe(true);
    }
    for (const href of renderedHrefs) {
      expect(expectedHrefs.has(href), `unexpected entry ${href}`).toBe(true);
    }

    // Order: exactly the independently-derived alphabetical run.
    expect(rendered.map((e) => e.label)).toEqual(
      expectedEntries.map((e) => e.label),
    );

    // Every entry shows its group: the domain name for articles,
    // "Glossary" for terms.
    for (const entry of rendered) {
      const expected = expectedEntries.find((e) => e.href === entry.href);
      expect(entry.group, `group label for ${entry.href}`).toBe(
        expected?.group,
      );
    }
  });

  test('excludes every draft module', async ({ page }) => {
    await page.goto('/a-z/');
    const main = page.locator('#main-content');
    for (const draft of modules.filter((m) => m.status === 'draft')) {
      await expect(
        main.getByRole('link', { name: draft.title, exact: true }),
      ).toHaveCount(0);
    }
  });

  test('every entry link resolves to a 200 page with a matching heading or anchor', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.goto('/a-z/');
    const hrefs = await page
      .locator('[data-az-entry] a')
      .evaluateAll((els) => els.map((el) => el.getAttribute('href') ?? ''));
    expect(hrefs.length).toBe(expectedEntries.length);

    for (const href of hrefs) {
      const [path, fragment] = href.split('#');
      const response = await page.request.get(path || '/');
      expect(response.ok(), `${href} returns 200`).toBe(true);
      if (fragment) {
        // Glossary term entry: the anchor target must exist on /glossary.
        const html = await response.text();
        expect(html, `#${fragment} anchor exists`).toContain(
          `id="${fragment}"`,
        );
      }
    }
  });

  test('groups entries by first letter with working jump links', async ({
    page,
  }) => {
    await page.goto('/a-z/');
    const jumpNav = page.getByRole('navigation', { name: 'Jump to letter' });
    await expect(jumpNav).toBeVisible();
    const jumpLinks = jumpNav.getByRole('link');
    const letterCount = await jumpLinks.count();
    expect(letterCount).toBeGreaterThan(5);

    // Every jump link targets a group heading that exists on the page.
    for (let i = 0; i < letterCount; i += 1) {
      const href = await jumpLinks.nth(i).getAttribute('href');
      expect(href).toMatch(/^\/a-z\/#letter-/);
      const id = href!.split('#')[1];
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }

    // Clicking the first jump link moves to its letter group.
    const first = jumpLinks.first();
    await first.click();
    await expect(page).toHaveURL(/#letter-/);
  });

  test('is reachable by clicking from the site chrome and shows an active state (VAL-WIKI-021)', async ({
    page,
  }) => {
    // Desktop: the sidebar carries the entry point.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const sidebar = page.locator('aside');
    await sidebar.getByRole('link', { name: 'A-Z Index' }).click();
    await page.waitForURL('/a-z/');
    await expect(page.locator('h1')).toHaveText('A-Z Index');
    await expect(
      sidebar.getByRole('link', { name: 'A-Z Index' }),
    ).toHaveAttribute('aria-current', 'page');

    // Mobile: the drawer carries the same entry point.
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
    const dialog = page.getByRole('dialog', { name: 'Site navigation' });
    await dialog.getByRole('link', { name: 'A-Z Index' }).click();
    await page.waitForURL('/a-z/');
    await expect(dialog).not.toBeVisible();
    await expect(page.locator('h1')).toHaveText('A-Z Index');
  });

  test('renders without horizontal overflow at 375px and 1440px', async ({
    browser,
  }) => {
    for (const width of [375, 1440]) {
      const context = await browser.newContext({
        viewport: { width, height: width === 375 ? 812 : 900 },
      });
      const page = await context.newPage();
      await page.goto('/a-z/');
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, `no horizontal scroll at ${width}px`).toBeLessThanOrEqual(0);
      await context.close();
    }
  });

  test('zero axe violations', async ({ page }) => {
    await page.goto('/a-z/');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
