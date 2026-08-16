import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { getCitation } from '../../data/citations';
import { inlineCitationIds, moduleBody } from '../../lib/references';

/**
 * References bibliography (VAL-WIKI-001 through VAL-WIKI-006). The section
 * is derived from the citation registry through the shared article template,
 * so these assertions run against real articles from different domains and
 * compare the rendered DOM with the content files and the registry.
 */

const ARTICLES = [
  { domain: 'manipulation', slug: 'action-chunking' },
  { domain: 'classical', slug: 'kinematics' },
  // Citation-dense (22 entries) with declared-but-not-inline entries, which
  // exercises the "Further reading" marker and the 375px wrap behavior.
  { domain: 'manipulation', slug: 'comparison-matrix' },
] as const;

const DENSE = '/manipulation/comparison-matrix/';

function moduleSource(domain: string, slug: string): string {
  return readFileSync(
    join(process.cwd(), 'content', domain, `${slug}.mdx`),
    'utf8',
  );
}

/** Declared citation ids, deduped, in frontmatter order. */
function declaredIds(domain: string, slug: string): string[] {
  const fm = matter(moduleSource(domain, slug)).data as {
    citations?: unknown;
  };
  const ids = Array.isArray(fm.citations) ? (fm.citations as string[]) : [];
  return [...new Set(ids)];
}

/** Ids actually cited inline via <Cite>, in order of first use. */
function inlineIds(domain: string, slug: string): string[] {
  return inlineCitationIds(moduleBody(moduleSource(domain, slug)));
}

async function renderedReferenceIds(page: Page): Promise<string[]> {
  return page
    .locator('ol [data-reference-id]')
    .evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-reference-id') ?? ''),
    );
}

async function renderedChipIds(page: Page): Promise<string[]> {
  return page
    .locator('[data-cite-id]')
    .evaluateAll((els) => [
      ...new Set(els.map((el) => el.getAttribute('data-cite-id') ?? '')),
    ]);
}

test.describe('References bibliography', () => {
  for (const { domain, slug } of ARTICLES) {
    const route = `/${domain}/${slug}/`;

    test(`complete References section on ${route} (VAL-WIKI-001)`, async ({
      page,
    }) => {
      await page.goto(route);

      // One References heading, rendered by the template (no MDX duplicate).
      const heading = page.getByRole('heading', {
        level: 2,
        name: 'References',
      });
      await expect(heading).toBeVisible();
      expect(await heading.count()).toBe(1);

      // The rendered entry set matches frontmatter.citations exactly, in
      // declaration order: nothing missing, nothing extra.
      expect(await renderedReferenceIds(page)).toEqual(
        declaredIds(domain, slug),
      );

      // References closes the article. See also and Linked from sections
      // may precede it when the article declares seeAlso or has inbound
      // links (wiki-seealso-backlinks), so the invariant is position, not
      // section count.
      const article = page.locator('article');
      const sections = article.locator('> section');
      await expect(sections.last()).toContainText('References');
      const count = await sections.count();
      for (let i = 0; i < count - 1; i += 1) {
        const heading = await sections.nth(i).locator('h2').textContent();
        expect(['See also', 'Linked from']).toContain(heading?.trim());
      }
    });

    test(`chip and References agreement on ${route} (VAL-WIKI-004)`, async ({
      page,
    }) => {
      await page.goto(route);

      const chipIds = await renderedChipIds(page);
      const entryIds = await renderedReferenceIds(page);
      const inline = new Set(inlineIds(domain, slug));

      // The DOM chips match the source scan.
      expect(new Set(chipIds)).toEqual(inline);

      // Every id cited inline appears in References.
      for (const id of inline) {
        expect(entryIds).toContain(id);
      }

      // Every References entry is cited inline or explicitly marked as
      // further reading; never a silent orphan.
      const expectedOrphans = declaredIds(domain, slug).filter(
        (id) => !inline.has(id),
      );
      let markers = 0;
      for (const id of entryIds) {
        const item = page.locator(`ol [data-reference-id="${id}"]`);
        if (inline.has(id)) {
          await expect(item.getByText('Further reading')).toHaveCount(0);
        } else {
          await expect(item.getByText('Further reading')).toBeVisible();
          markers += 1;
        }
      }
      expect(expectedOrphans).toHaveLength(markers);
    });
  }

  test('entries show title, authors, year, venue and a primary-source link, verbatim from the registry (VAL-WIKI-002, VAL-WIKI-003)', async ({
    page,
  }) => {
    // One article per domain, including entries without a venue
    // (mobile-aloha-2024) to prove absent fields are omitted, not invented.
    for (const { domain, slug } of [ARTICLES[0], ARTICLES[1]]) {
      await page.goto(`/${domain}/${slug}/`);
      const ids = declaredIds(domain, slug);
      const items = page.locator('ol [data-reference-id]');
      expect(await items.count()).toBe(ids.length);

      let sawVenuelessEntry = false;
      for (let i = 0; i < ids.length; i += 1) {
        const citation = getCitation(ids[i]);
        expect(citation, `registry entry ${ids[i]}`).toBeDefined();
        if (!citation) continue;

        const item = items.nth(i);
        const titleLink = item.locator('a[target="_blank"]').first();
        await expect(titleLink).toHaveText(citation.title);
        const href = await titleLink.getAttribute('href');
        expect(href).toBe(citation.url);
        expect(href ?? '').toMatch(/^https:\/\//);

        // The meta line is the registry record rendered verbatim: full
        // author list, venue only when the registry records one, and the
        // year, rendered once when the venue already states it ("RSS 2023."
        // rather than "RSS 2023, 2023."). The derivation is inlined here so
        // the spec does not grade the renderer with the renderer's own rule.
        const expectedMeta = `${citation.authors.join(', ')}${
          citation.venue ? `, ${citation.venue}` : ''
        }${citation.venue?.includes(String(citation.year)) ? '' : `, ${citation.year}`}.`;
        await expect(item.locator('p').first()).toHaveText(expectedMeta);
        if (!citation.venue) sawVenuelessEntry = true;

        // The primary-source URL is visible and wraps inside the column.
        await expect(item.locator('p').nth(1)).toHaveText(citation.url);
      }
      expect(sawVenuelessEntry).toBe(true);
    }
  });

  test("a chip's reference affordance jumps to the matching entry (VAL-WIKI-004)", async ({
    page,
  }) => {
    await page.goto('/manipulation/action-chunking/');
    const id = inlineIds('manipulation', 'action-chunking')[0];
    expect(id).toBeTruthy();

    const jump = page
      .locator(`[data-cite-id="${id}"]`)
      .first()
      .locator(`a[href="#ref-${id}"]`);
    await expect(jump).toBeVisible();
    await jump.click();

    // The reader lands on the matching References entry.
    await expect(page).toHaveURL(new RegExp(`#ref-${id}$`));
    const entry = page.locator(`ol [data-reference-id="${id}"]`);
    await expect(entry).toBeVisible();
    const box = await entry.boundingBox();
    const viewport = page.viewportSize();
    expect(box && viewport).toBeTruthy();
    if (box && viewport) {
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeLessThan(viewport.height);
      expect(box.y).toBeLessThan(viewport.height / 2);
    }
  });

  test('References is readable and wraps at 375px with no page-level horizontal scroll (VAL-WIKI-006)', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
    });
    const page = await context.newPage();
    await page.goto(DENSE);

    await page
      .getByRole('heading', { level: 2, name: 'References' })
      .scrollIntoViewIfNeeded();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    // Long titles and URLs stay inside the column on every entry.
    const rights = await page
      .locator('ol [data-reference-id]')
      .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().right));
    for (const right of rights) {
      expect(right).toBeLessThanOrEqual(375);
    }
    await context.close();
  });

  test('References is readable and wraps at 1440px with no page-level horizontal scroll (VAL-WIKI-006)', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    await page.goto(DENSE);

    await page
      .getByRole('heading', { level: 2, name: 'References' })
      .scrollIntoViewIfNeeded();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    const rights = await page
      .locator('ol [data-reference-id]')
      .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().right));
    for (const right of rights) {
      expect(right).toBeLessThanOrEqual(1440);
    }
    await context.close();
  });

  test('zero axe violations with the References section rendered', async ({
    page,
  }) => {
    await page.goto(DENSE);
    await page
      .getByRole('heading', { level: 2, name: 'References' })
      .scrollIntoViewIfNeeded();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
