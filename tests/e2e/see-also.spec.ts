import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { modules, publishedModules } from '../../data/modules';
import {
  buildBacklinkGraph,
  internalLinkTargets,
  normalizeInternalPath,
  type LinkGraphArticle,
} from '../../lib/backlinks';

/**
 * See also + Linked from (VAL-WIKI-007, VAL-WIKI-008, VAL-WIKI-011, VAL-WIKI-012).
 *
 * Both sections are rendered by the shared article template from derived
 * data, never hand-written in MDX: "See also" resolves the frontmatter
 * seeAlso list against the registry; "Linked from" inverts the wiki's
 * internal link graph (in-prose links unioned with seeAlso edges,
 * lib/backlinks.ts). The expected graph below is recomputed in-spec from
 * the raw content files and the registry, so the rendered DOM is compared
 * against an independent derivation rather than a snapshot.
 */

const published = publishedModules();
const registryByKey = new Map(modules.map((m) => [`${m.domain}/${m.slug}`, m]));

const articles: LinkGraphArticle[] = published.map((m) => {
  const source = readFileSync(
    join(process.cwd(), 'content', m.domain, `${m.slug}.mdx`),
    'utf8',
  );
  const parsed = matter(source);
  const rawSeeAlso = parsed.data.seeAlso;
  return {
    key: `${m.domain}/${m.slug}`,
    body: parsed.content,
    seeAlso: Array.isArray(rawSeeAlso)
      ? rawSeeAlso.filter((v): v is string => typeof v === 'string')
      : undefined,
  };
});

const articleByKey = new Map(articles.map((a) => [a.key, a]));

// Deterministic display order: registry position among published modules,
// exactly what lib/backlinks.publishedBacklinkGraph uses at build time.
const orderByRegistry = (() => {
  const position = new Map(
    published.map((m, index) => [`${m.domain}/${m.slug}`, index]),
  );
  return (key: string) => position.get(key) ?? Number.MAX_SAFE_INTEGER;
})();

const expectedBacklinks = buildBacklinkGraph(articles, orderByRegistry);

/** Registry keys of the articles this article links to (prose or seeAlso). */
function outboundArticleTargets(article: LinkGraphArticle): string[] {
  const targets = new Set<string>();
  for (const path of internalLinkTargets(article.body)) {
    const segments = path.split('/').filter(Boolean);
    if (segments.length === 2) targets.add(`${segments[0]}/${segments[1]}`);
  }
  for (const key of article.seeAlso ?? []) targets.add(key);
  return [...targets];
}

async function renderedKeys(
  page: Page,
  section: 'see-also' | 'linked-from',
): Promise<string[]> {
  return page
    .locator(`section[data-section="${section}"] li`)
    .evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-article-key') ?? ''),
    );
}

/** Every internal href inside the article region, normalized. */
async function articleRegionHrefs(page: Page): Promise<Set<string>> {
  const hrefs = await page
    .locator('article a')
    .evaluateAll((els) => els.map((el) => el.getAttribute('href') ?? ''));
  return new Set(
    hrefs.filter((h) => h.startsWith('/')).map(normalizeInternalPath),
  );
}

test.describe('See also + Linked from', () => {
  test('See also block matches the frontmatter order, registry titles and routes', async ({
    page,
  }) => {
    const withSeeAlso = articles.filter((a) => (a.seeAlso ?? []).length > 0);
    expect(withSeeAlso.length).toBeGreaterThan(0);

    for (const article of withSeeAlso) {
      await test.step(article.key, async () => {
        await page.goto(`/${article.key}/`);
        const section = page.locator('section[data-section="see-also"]');
        await expect(section).toBeVisible();
        await expect(
          section.getByRole('heading', { level: 2, name: 'See also' }),
        ).toBeVisible();

        const keys = await renderedKeys(page, 'see-also');
        expect(keys).toEqual(article.seeAlso);

        // Each entry shows the target's registry title and summary, links
        // to its route, and preserves the curated frontmatter order.
        const items = section.locator('li');
        for (let i = 0; i < (article.seeAlso ?? []).length; i += 1) {
          const target = registryByKey.get(article.seeAlso?.[i] ?? '');
          expect(
            target,
            `registry entry ${article.seeAlso?.[i]}`,
          ).toBeDefined();
          if (!target) continue;
          const item = items.nth(i);
          const link = item.getByRole('link');
          await expect(link).toHaveText(target.title);
          // next/link may append a trailing slash; normalization makes the
          // assertion robust to either rendering.
          expect(
            normalizeInternalPath((await link.getAttribute('href')) ?? ''),
          ).toBe(`/${target.domain}/${target.slug}`);
          await expect(item).toContainText(target.summary);
        }
      });
    }
  });

  test('the trailing sections stack See also, Linked from, References in order', async ({
    page,
  }) => {
    // An article carrying all three sections: seeAlso declared, inbound
    // links present, citations declared.
    const key = 'manipulation/action-chunking';
    expect((articleByKey.get(key)?.seeAlso ?? []).length).toBeGreaterThan(0);
    expect((expectedBacklinks.get(key) ?? []).length).toBeGreaterThan(0);

    await page.goto(`/${key}/`);
    const order = await page
      .locator('article > section')
      .evaluateAll((els) =>
        els.map(
          (el) =>
            el.getAttribute('data-section') ??
            el.querySelector('h2')?.textContent?.trim() ??
            '',
        ),
      );
    expect(order).toEqual(['see-also', 'linked-from', 'References']);
  });

  test('every See also link navigates to a published article whose h1 matches the label (VAL-WIKI-008)', async ({
    page,
  }) => {
    // The sweep clicks every edge in the published set: ~90 edges at
    // roughly three navigations each, far past the 30s default.
    test.setTimeout(300_000);
    const edges = articles.flatMap((article) =>
      (article.seeAlso ?? []).map((target) => ({
        source: article.key,
        target,
      })),
    );
    expect(edges.length).toBeGreaterThan(0);

    for (const { source, target } of edges) {
      const entry = registryByKey.get(target);
      expect(entry, `registry entry ${target}`).toBeDefined();
      if (!entry) continue;

      await test.step(`${source} -> ${target}`, async () => {
        await page.goto(`/${source}/`);
        const link = page
          .locator('section[data-section="see-also"]')
          .getByRole('link', { name: entry.title });
        await link.click();

        // The navigation lands on the target route and the destination h1
        // is exactly the link label: no draft, no external URL, no 404.
        await page.waitForURL(`/${target}/`);
        await expect(page.locator('h1')).toHaveText(entry.title);
      });

      // A fresh document request for the destination returns 200.
      const response = await page.goto(`/${target}/`);
      expect(response?.ok(), `${target} should return 200`).toBe(true);
    }
  });

  test('Linked from matches the derived backlink graph exactly for every published article (VAL-WIKI-011)', async ({
    page,
  }) => {
    test.setTimeout(300_000);

    for (const article of articles) {
      await test.step(article.key, async () => {
        await page.goto(`/${article.key}/`);

        // See also: rendered keys equal the frontmatter list (or nothing
        // at all when the article declares none).
        const seeAlso = article.seeAlso ?? [];
        if (seeAlso.length === 0) {
          await expect(
            page.locator('section[data-section="see-also"]'),
          ).toHaveCount(0);
        }
        expect(await renderedKeys(page, 'see-also')).toEqual(seeAlso);

        // Linked from: exactly the expected inbound sources, in registry
        // order; zero-inbound articles render no section at all
        // (VAL-WIKI-012), never a bare heading or an empty list.
        const expected = expectedBacklinks.get(article.key);
        if (!expected) {
          await expect(
            page.locator('section[data-section="linked-from"]'),
          ).toHaveCount(0);
          await expect(
            page
              .locator('article')
              .getByRole('heading', { name: 'Linked from' }),
          ).toHaveCount(0);
        }
        expect(await renderedKeys(page, 'linked-from')).toEqual(expected ?? []);

        // Direction (a) of VAL-WIKI-011: every outbound edge of this
        // article is visibly present in its article region (an in-prose
        // link or a See also entry), which is what makes its appearance
        // in the targets' Linked from lists truthful.
        const hrefs = await articleRegionHrefs(page);
        for (const target of outboundArticleTargets(article)) {
          expect(
            hrefs.has(`/${target}`),
            `${article.key} must visibly link to ${target}`,
          ).toBe(true);
        }
      });
    }
  });

  test('action-chunking reaches diffusion-policy through both a prose link and a seeAlso edge (VAL-WIKI-011)', async ({
    page,
  }) => {
    const source = articleByKey.get('manipulation/action-chunking');
    expect(source).toBeDefined();
    if (!source) return;

    // The edge exists twice over by design (VAL-CROSS-006 requires an
    // in-prose link; the curated seeAlso edge predates it): prose link
    // plus seeAlso entry, deduped to one backlink.
    expect(internalLinkTargets(source.body)).toContain(
      '/manipulation/diffusion-policy',
    );
    expect(source.seeAlso).toContain('manipulation/diffusion-policy');

    // The derived graph carries the edge exactly once, and the rendered
    // Linked from list on diffusion-policy shows it.
    const inbound =
      expectedBacklinks.get('manipulation/diffusion-policy') ?? [];
    expect(inbound).toContain('manipulation/action-chunking');
    expect(
      inbound.filter((k) => k === 'manipulation/action-chunking'),
    ).toHaveLength(1);

    await page.goto('/manipulation/diffusion-policy/');
    const item = page.locator(
      'section[data-section="linked-from"] li[data-article-key="manipulation/action-chunking"]',
    );
    await expect(item).toBeVisible();
    await expect(item.getByRole('link')).toHaveText(
      'Action Chunking (ACT and ALOHA)',
    );
  });

  test('a zero-inbound article renders no Linked from section and no bare heading (VAL-WIKI-012)', async ({
    page,
  }) => {
    const zeroInbound = articles.filter((a) => !expectedBacklinks.has(a.key));
    // After the wiki-wide seeAlso backfill the curated graph is complete:
    // every published article has at least one inbound edge, so this
    // fixture class is currently empty and the test skips itself (the
    // same self-skipping pattern as the registry-derived draft fixtures
    // in tests/helpers/draft-fixtures.ts). If a future article ships with
    // zero inbound links it lands here automatically.
    test.skip(
      zeroInbound.length === 0,
      'no zero-inbound published articles in the current link graph',
    );
    // All current zero-inbound articles still link out; the honesty rule is
    // about inbound edges, so sample two distinct ones as they are.
    expect(zeroInbound.some((a) => outboundArticleTargets(a).length > 0)).toBe(
      true,
    );
    const samples = zeroInbound.slice(0, 2);

    for (const article of samples) {
      await test.step(article.key, async () => {
        await page.goto(`/${article.key}/`);
        await expect(
          page.locator('section[data-section="linked-from"]'),
        ).toHaveCount(0);
        await expect(
          page.locator('article').getByRole('heading', { name: 'Linked from' }),
        ).toHaveCount(0);
        await expect(page.locator('article')).not.toContainText('Linked from');
        // References still closes the article.
        await expect(
          page.getByRole('heading', { level: 2, name: 'References' }),
        ).toBeVisible();
      });
    }
  });

  test('every published article renders 2 to 4 See also entries (VAL-WIKI-007)', async ({
    page,
  }) => {
    // seeAlso is required on published modules since the backfill (the
    // prebuild validator enforces it), so the no-seeAlso empty state is
    // unreachable in the shipped set. The meaningful registry-driven sweep
    // is the curated-count contract: between 2 and 4 links per article,
    // each labeled with the target article's title.
    test.setTimeout(300_000);
    expect(articles.length).toBeGreaterThan(0);
    for (const article of articles) {
      await test.step(article.key, async () => {
        await page.goto(`/${article.key}/`);
        const section = page.locator('section[data-section="see-also"]');
        await expect(section).toBeVisible();
        await expect(
          section.getByRole('heading', { level: 2, name: 'See also' }),
        ).toBeVisible();
        const items = section.locator('li[data-article-key]');
        const count = await items.count();
        expect(count, `${article.key} See also count`).toBeGreaterThanOrEqual(
          2,
        );
        expect(count, `${article.key} See also count`).toBeLessThanOrEqual(4);
        for (let i = 0; i < count; i += 1) {
          const key = await items.nth(i).getAttribute('data-article-key');
          const target = registryByKey.get(key ?? '');
          expect(target, `registry entry ${key}`).toBeDefined();
          await expect(items.nth(i).getByRole('link')).toHaveText(
            target?.title ?? '',
          );
        }
      });
    }
  });

  test('zero axe violations with See also, Linked from and References all present', async ({
    page,
  }) => {
    await page.goto('/manipulation/action-chunking/');
    await page
      .locator('section[data-section="see-also"]')
      .scrollIntoViewIfNeeded();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('the new sections wrap at 375px with no page-level horizontal scroll', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
    });
    const page = await context.newPage();
    await page.goto('/manipulation/action-chunking/');

    await page
      .locator('section[data-section="see-also"]')
      .scrollIntoViewIfNeeded();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    // Every trailing section stays inside the mobile column.
    const rights = await page
      .locator('article > section')
      .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().right));
    for (const right of rights) {
      expect(right).toBeLessThanOrEqual(375);
    }
    await context.close();
  });
});
