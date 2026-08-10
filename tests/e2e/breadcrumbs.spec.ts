import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { DOMAIN_META, DOMAINS, publishedModules } from '../../data/modules';
import { SITE_URL } from '../../lib/site';

/**
 * Article breadcrumbs (VAL-WIKI-016, VAL-WIKI-017, VAL-WIKI-018): every
 * published article carries Home > Domain > Article breadcrumbs with
 * BreadcrumbList structured data. The Home and Domain crumbs are working
 * links; the current article is the non-linked trailing crumb. Verified on
 * one article per top-level domain, including adjacent (its landing page is
 * the middle crumb's target).
 */

const published = publishedModules();
const anchorByDomain = new Map(
  DOMAINS.map((domain) => [
    domain,
    published.find((m) => m.domain === domain)!,
  ]),
);

test.describe('article breadcrumbs', () => {
  test('every domain renders Home > Domain > Article with the trailing crumb as non-link text (VAL-WIKI-016)', async ({
    page,
  }) => {
    for (const domain of DOMAINS) {
      const article = anchorByDomain.get(domain);
      expect(article, `published anchor article in ${domain}`).toBeDefined();

      await test.step(`${article!.domain}/${article!.slug}`, async () => {
        await page.goto(`/${article!.domain}/${article!.slug}/`);
        const nav = page.getByRole('navigation', { name: 'Breadcrumb' });
        await expect(nav).toBeVisible();

        // Three levels in order: home, this article's domain, the article.
        const home = nav.getByRole('link', { name: 'Home' });
        await expect(home).toHaveAttribute('href', '/');
        const domainCrumb = nav.getByRole('link', {
          name: DOMAIN_META[domain].name,
        });
        await expect(domainCrumb).toHaveAttribute('href', `/${domain}`);
        // The current article's title appears as the trailing crumb and is
        // not a link: exactly two links in the trail.
        await expect(nav.getByText(article!.title)).toBeVisible();
        await expect(nav.getByRole('link')).toHaveCount(2);

        // The domain label matches the sidebar taxonomy label exactly.
        const sidebarGroup = page.getByRole('button', {
          name: DOMAIN_META[domain].name,
        });
        await expect(sidebarGroup).toBeVisible();
      });
    }
  });

  test('the breadcrumb trail is a landmark distinct from the taxonomy nav', async ({
    page,
  }) => {
    await page.goto('/manipulation/action-chunking/');
    await expect(
      page.getByRole('navigation', { name: 'Breadcrumb' }),
    ).toBeVisible();
    await expect(
      page.getByRole('navigation', { name: 'robot-wiki taxonomy' }),
    ).toBeVisible();
  });

  test('BreadcrumbList structured data matches the trail', async ({ page }) => {
    const article = anchorByDomain.get('manipulation')!;
    await page.goto(`/${article.domain}/${article.slug}/`);
    const scripts = page.locator(
      'script[type="application/ld+json"]',
    );
    const count = await scripts.count();
    let breadcrumbList: {
      '@type': string;
      itemListElement: Array<{ position: number; name: string; item: string }>;
    } | null = null;
    for (let i = 0; i < count; i += 1) {
      const parsed = JSON.parse(
        (await scripts.nth(i).textContent()) ?? 'null',
      ) as { '@type'?: string } | null;
      if (parsed?.['@type'] === 'BreadcrumbList') {
        breadcrumbList = parsed as never;
        break;
      }
    }
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
    for (const domain of DOMAINS) {
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
        await page.goto(`/${article.domain}/${article.slug}/`);
        await page
          .getByRole('navigation', { name: 'Breadcrumb' })
          .getByRole('link', { name: 'Home' })
          .click();
        await page.waitForURL('/');
        await expect(page.locator('h1')).toContainText('robot-wiki');
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

    // The focused link shows the global amber focus outline.
    const outline = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement;
      return getComputedStyle(active).outlineWidth;
    });
    expect(parseFloat(outline)).toBeGreaterThanOrEqual(1);
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
