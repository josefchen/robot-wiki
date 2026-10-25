import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { DOMAIN_META, DOMAINS, publishedModules } from '../../data/modules';
import { PUBLIC_IDENTITY } from '../../lib/identity';
import { SITE_URL } from '../../lib/site';
import { openArticlesPanel } from './helpers/articles-panel';

/**
 * Article breadcrumbs (VAL-WIKI-016, VAL-WIKI-017, VAL-WIKI-018): every
 * published article carries Home > Domain > Article breadcrumbs with
 * BreadcrumbList structured data. The Home and Domain crumbs are working
 * links; the current article is the non-linked trailing crumb. Verified on
 * one article per top-level domain, including adjacent (its landing page is
 * the middle crumb's target).
 */

const published = publishedModules();
// One anchor article per domain that has published articles. All seven
// domains ship published articles since the adjacent-polish milestone
// (adjacent's four modules published 2026-08-14/15), so the sweep below
// covers all seven top-level domains — the condition VAL-WIKI-017's note
// required before the seven-domain breadcrumb sweep could run.
const anchorByDomain = new Map(
  DOMAINS.flatMap((domain) => {
    const anchor = published.find((m) => m.domain === domain);
    return anchor ? [[domain, anchor] as const] : [];
  }),
);
const domainsWithArticles = [...anchorByDomain.keys()];

/** The top bar's wordmark: the link to "/" on every page. */
function wordmark(page: Page) {
  return page.getByRole('banner').getByRole('link', { name: PUBLIC_IDENTITY, exact: true });
}

type BreadcrumbList = {
  '@type': string;
  itemListElement: Array<{ position: number; name: string; item: string }>;
};

/** The page's BreadcrumbList JSON-LD block, or null when it has none. */
async function readBreadcrumbList(page: Page): Promise<BreadcrumbList | null> {
  const scripts = page.locator('script[type="application/ld+json"]');
  const count = await scripts.count();
  for (let i = 0; i < count; i += 1) {
    const parsed = JSON.parse(
      (await scripts.nth(i).textContent()) ?? 'null',
    ) as { '@type'?: string } | null;
    if (parsed?.['@type'] === 'BreadcrumbList') return parsed as BreadcrumbList;
  }
  return null;
}

// VAL-WIKI-017 requires the sweep to sample an article in each of the
// SEVEN top-level domains once all have published articles, which is the
// state as of adjacent-polish. Pin that completeness so a future domain
// losing its last article fails loudly instead of silently narrowing.
test.describe('breadcrumb sweep completeness (VAL-WIKI-017)', () => {
  test('every one of the seven top-level domains has a sampled article', () => {
    expect(domainsWithArticles).toEqual([
      'manipulation',
      'rl-sim2real',
      'world-models',
      'data-hardware',
      'classical',
      'frontier',
      'adjacent',
    ]);
  });
});

test.describe('article breadcrumbs', () => {
  test('every domain renders Home > Domain > Article with the trailing crumb as non-link text (VAL-WIKI-016)', async ({
    page,
  }) => {
    for (const domain of domainsWithArticles) {
      const article = anchorByDomain.get(domain);
      expect(article, `published anchor article in ${domain}`).toBeDefined();

      await test.step(`${article!.domain}/${article!.slug}`, async () => {
        await page.goto(`/${article!.domain}/${article!.slug}/`);
        const nav = page.getByRole('navigation', { name: 'Breadcrumb' });
        await expect(nav).toBeVisible();

        // Three levels in order: home, this article's domain, the article.
        // Owner-approved successor (Josef, 2026-10-10, the research-page
        // standard): the old pin read a "Home" link, the domain link and the
        // article title as non-link text, all inside the Breadcrumb nav
        // (exactly two links). Since 9154d672 the trail is the masthead
        // eyebrow: the top bar's wordmark is the home link, the eyebrow
        // holds only the domain link (exactly one link), the H1 names the
        // article, and the full Home > Domain > Article trail is the
        // BreadcrumbList JSON-LD, checked here per domain.
        const home = wordmark(page);
        await expect(home).toHaveAttribute('href', '/');
        const domainCrumb = nav.getByRole('link', {
          name: DOMAIN_META[domain].name,
        });
        // trailingSlash: true normalizes rendered hrefs to the slashed form.
        await expect(domainCrumb).toHaveAttribute('href', `/${domain}/`);
        // The current article's title is the page's H1 and is not a link in
        // the trail: the domain crumb is the eyebrow's one link.
        await expect(
          page.getByRole('heading', { level: 1, name: article!.title, exact: true }),
        ).toBeVisible();
        await expect(nav.getByRole('link', { name: article!.title })).toHaveCount(0);
        await expect(nav.getByRole('link')).toHaveCount(1);
        const trail = await readBreadcrumbList(page);
        expect(trail, 'a BreadcrumbList JSON-LD block').not.toBeNull();
        expect(trail!.itemListElement.map((item) => item.name)).toEqual([
          'Home',
          DOMAIN_META[domain].name,
          article!.title,
        ]);

        // The domain label matches the sidebar taxonomy label exactly.
        // Owner-approved successor (Josef, 2026-10-10, the research-page
        // standard): the old pin read the group button in the persistent
        // sidebar; the same taxonomy groups now live in the Articles panel.
        await openArticlesPanel(page);
        const panel = page.getByRole('dialog', { name: 'Site navigation' });
        const sidebarGroup = panel
          .getByRole('navigation', { name: 'Robot Wiki taxonomy' })
          .getByRole('button', { name: DOMAIN_META[domain].name });
        await expect(sidebarGroup).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(panel).toBeHidden();
      });
    }
  });

  test('the breadcrumb trail is a landmark distinct from the taxonomy nav', async ({
    page,
  }) => {
    await page.goto('/manipulation/action-chunking/');
    const breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' });
    await expect(breadcrumb).toBeVisible();
    // Owner-approved successor (Josef, 2026-10-10, the research-page
    // standard): the old pin read the taxonomy nav at rest in the sidebar;
    // it now lives in the Articles panel, opened here, and stays a landmark
    // separate from the breadcrumb trail.
    await openArticlesPanel(page);
    const taxonomy = page.getByRole('navigation', { name: 'Robot Wiki taxonomy' });
    await expect(taxonomy).toBeVisible();
    await expect(taxonomy.getByRole('navigation', { name: 'Breadcrumb' })).toHaveCount(0);
    await expect(breadcrumb.getByRole('navigation', { name: 'Robot Wiki taxonomy' })).toHaveCount(0);
  });

  test('BreadcrumbList structured data matches the trail', async ({ page }) => {
    const article = anchorByDomain.get('manipulation')!;
    await page.goto(`/${article.domain}/${article.slug}/`);
    const breadcrumbList = await readBreadcrumbList(page);
    expect(breadcrumbList, 'a BreadcrumbList JSON-LD block').not.toBeNull();
    expect(breadcrumbList!.itemListElement).toHaveLength(3);
    const [home, domain, current] = breadcrumbList!.itemListElement;
    expect(home).toMatchObject({
      position: 1,
      name: 'Home',
      item: `${SITE_URL}/`,
    });
    expect(domain).toMatchObject({
      position: 2,
      name: DOMAIN_META[article.domain].name,
      item: `${SITE_URL}/${article.domain}/`,
    });
    expect(current).toMatchObject({
      position: 3,
      name: article.title,
      item: `${SITE_URL}/${article.domain}/${article.slug}/`,
    });
  });

  test('the ancestor crumbs navigate: home to / and domain to its landing page (VAL-WIKI-017)', async ({
    page,
  }) => {
    for (const domain of domainsWithArticles) {
      const article = anchorByDomain.get(domain)!;
      await test.step(`${article.domain}/${article.slug}`, async () => {
        await page.goto(`/${article.domain}/${article.slug}/`);
        const nav = page.getByRole('navigation', { name: 'Breadcrumb' });

        // Middle crumb: the domain landing page, HTTP 200, h1 is the
        // taxonomy name, not a module page or a 404.
        await nav
          .getByRole('link', { name: DOMAIN_META[domain].name })
          .click();
        await page.waitForURL(`/${domain}/`);
        await expect(page.locator('h1')).toHaveText(DOMAIN_META[domain].name);
        const landingResponse = await page.goto(`/${domain}/`);
        expect(landingResponse?.ok()).toBe(true);

        // Home crumb: the wiki home page.
        // Owner-approved successor (Josef, 2026-10-10, the research-page
        // standard): the old pin clicked the trail's "Home" link; since
        // 9154d672 the eyebrow trail starts at the domain and the top bar's
        // wordmark is the article page's link home (the JSON-LD keeps Home
        // as the trail's first crumb).
        await page.goto(`/${article.domain}/${article.slug}/`);
        await wordmark(page).click();
        await page.waitForURL('/');
        await expect(page.locator('h1')).toHaveText(PUBLIC_IDENTITY);
      });
    }
  });

  test('breadcrumb links are keyboard reachable with a visible focus indicator (VAL-WIKI-018)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/manipulation/action-chunking/');

    // Tab from the top of the page: a breadcrumb link must receive focus
    // before the article title region is reached, in visual order.
    const breadcrumbNav = page.getByRole('navigation', {
      name: 'Breadcrumb',
    });
    let focusedBreadcrumbLink = false;
    for (let i = 0; i < 60 && !focusedBreadcrumbLink; i += 1) {
      await page.keyboard.press('Tab');
      focusedBreadcrumbLink = await page.evaluate(() => {
        const active = document.activeElement;
        if (!active || active.tagName !== 'A') return false;
        const nav = document.querySelector('nav[aria-label="Breadcrumb"]');
        return nav?.contains(active) ?? false;
      });
    }
    expect(
      focusedBreadcrumbLink,
      'Tab reaches a breadcrumb link',
    ).toBe(true);

    // Owner-approved successor (Josef, 2026-10-10, the research-page
    // standard): the old pin read the signal-blue focus outline at 2px; the
    // standard's focus ring is a 1px ink outline offset 2px, so the focused
    // link pins width 1 and offset 2.
    const outline = await page.evaluate(() => {
      const style = getComputedStyle(document.activeElement as HTMLElement);
      return { width: style.outlineWidth, offset: style.outlineOffset };
    });
    expect(parseFloat(outline.width)).toBe(1);
    expect(parseFloat(outline.offset)).toBe(2);
    await expect(breadcrumbNav).toBeVisible();
  });

  test('zero axe violations with the breadcrumb trail rendered', async ({
    page,
  }) => {
    await page.goto('/manipulation/action-chunking/');
    const results = await new AxeBuilder({ page })
      .include('nav[aria-label="Breadcrumb"]')
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
