import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { getCitation } from '../../data/citations';
import { publishedModules } from '../../data/modules';
import { inlineCitationIds, moduleBody } from '../../lib/references';
import { forEachInOwnContext } from './helpers/per-route-context';

/**
 * References bibliography (VAL-WIKI-001 through VAL-WIKI-006). The section
 * is derived from the citation registry through the shared article template,
 * so these assertions run against real articles from different domains and
 * compare the rendered DOM with the content files and the registry.
 */

const ARTICLES = [
  // Source-corrected ORB bibliography: same existing population/order assertions.
  { domain: 'classical', slug: 'scene-representation' },
  { domain: 'manipulation', slug: 'action-chunking' },
  { domain: 'classical', slug: 'kinematics' },
  // Citation-dense (22 entries) with declared-but-not-inline entries, which
  // exercises the "Further reading" group and the 375px wrap behavior.
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

/**
 * Declared ids in print order: the ones the body cites, then the further
 * reading, each in frontmatter order.
 */
function printedIds(domain: string, slug: string): string[] {
  const inline = new Set(inlineIds(domain, slug));
  const declared = declaredIds(domain, slug);
  return [
    ...declared.filter((id) => inline.has(id)),
    ...declared.filter((id) => !inline.has(id)),
  ];
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
    .evaluateAll((els) =>
      [...new Set(els.map((el) => el.getAttribute('data-cite-id') ?? ''))],
    );
}

test.describe('References bibliography', () => {
  for (const { domain, slug } of ARTICLES) {
    const route = `/${domain}/${slug}/`;

    test(`complete References section on ${route} (VAL-WIKI-001)`, async ({
      page,
    }) => {
      await page.goto(route);

      // One References heading, rendered by the template (no MDX duplicate).
      const heading = page.getByRole('heading', { level: 2, name: 'References' });
      await expect(heading).toBeVisible();
      expect(await heading.count()).toBe(1);

      // The rendered entry set matches frontmatter.citations exactly:
      // nothing missing, nothing extra. Successor (2026-10-13, one "Further
      // reading" heading in place of a badge on each uncited entry): the
      // order is declaration order within the cited group and within the
      // further-reading group that follows it.
      expect(await renderedReferenceIds(page)).toEqual(printedIds(domain, slug));
      expect([...(await renderedReferenceIds(page))].sort()).toEqual(
        [...declaredIds(domain, slug)].sort(),
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
      // further reading; never a silent orphan. Successor (2026-10-13,
      // drift repair under library/design-system.md, "no repeated eyebrow
      // clutter"): the mark is one visible sentence-case "Further reading"
      // heading with exactly the uncited entries in the list after it,
      // where each entry used to carry its own tracked-capitals badge.
      const expectedOrphans = declaredIds(domain, slug).filter(
        (id) => !inline.has(id),
      );
      const section = page.locator('section[aria-labelledby="references-heading"]');
      const heading = section.getByRole('heading', { level: 3, name: 'Further reading' });
      await expect(section.getByText('Further reading')).toHaveCount(
        expectedOrphans.length > 0 ? 1 : 0,
      );
      let markers = 0;
      if (expectedOrphans.length > 0) {
        await expect(heading).toBeVisible();
        expect(await heading.evaluate((el) => getComputedStyle(el).textTransform)).not.toBe(
          'uppercase',
        );
        const grouped = await heading.evaluate((el) =>
          Array.from(
            el.nextElementSibling?.matches('ol')
              ? el.nextElementSibling.querySelectorAll('[data-reference-id]')
              : [],
          ).map((li) => li.getAttribute('data-reference-id') ?? ''),
        );
        expect(grouped).toEqual(expectedOrphans);
        markers = grouped.length;
      } else {
        await expect(heading).toHaveCount(0);
      }
      for (const id of entryIds) {
        const item = page.locator(`ol [data-reference-id="${id}"]`);
        await expect(item).toHaveAttribute(
          'data-further-reading',
          inline.has(id) ? 'false' : 'true',
        );
        await expect(item.getByText('Further reading')).toHaveCount(0);
      }
      expect(expectedOrphans).toHaveLength(markers);
    });
  }

  // A source's superscript in the text, its sidenote and its References
  // entry carry one number, and the entries run 1 to n in print order. An
  // article that declares an uncited source between cited ones prints the
  // cited sources first, so their numbers differ from declaration order;
  // the walk proves at least one such article renumbered consistently. The
  // population is every published article, derived from the registry.
  test('every article gives each source one number in its superscripts, sidenotes and References entry', async ({
    browser,
    baseURL,
  }) => {
    const articles = publishedModules().map(({ domain, slug }) => ({ domain, slug }));
    expect(articles.length).toBeGreaterThan(0);
    test.setTimeout(articles.length * 15_000);
    let renumbered = 0;
    let numberedMarks = 0;
    await forEachInOwnContext(
      browser,
      articles,
      async (page, { domain, slug }) => {
        const route = `/${domain}/${slug}/`;
        await page.goto(route, { waitUntil: 'domcontentloaded' });
        const observed = await page.evaluate(() => {
          const section = document.querySelector(
            'section[aria-labelledby="references-heading"]',
          );
          const entries = Array.from(
            section?.querySelectorAll('li[data-reference-id]') ?? [],
          ).map((li) => ({
            id: li.getAttribute('data-reference-id') ?? '',
            number: (
              li.querySelector(':scope > span[aria-hidden="true"]')?.textContent ?? ''
            ).trim(),
            further: li.getAttribute('data-further-reading'),
          }));
          const marks = Array.from(document.querySelectorAll('[data-cite-id]')).flatMap(
            (chip) => {
              const mark = chip.querySelector('sup.cite-mark a');
              if (!mark) return [];
              return [
                {
                  id: chip.getAttribute('data-cite-id') ?? '',
                  href: mark.getAttribute('href') ?? '',
                  mark: (mark.textContent ?? '').replace(/^\s*Source\s*/, '').trim(),
                  note: (
                    chip.querySelector('[data-sidenote] .sidenote-index')?.textContent ?? ''
                  ).trim(),
                },
              ];
            },
          );
          const furtherHeadings = Array.from(section?.querySelectorAll('h3') ?? []).filter(
            (h3) => (h3.textContent ?? '').trim() === 'Further reading',
          ).length;
          return { entries, marks, furtherHeadings };
        });

        const printed = printedIds(domain, slug);
        const inline = new Set(inlineIds(domain, slug));
        const uncited = declaredIds(domain, slug).filter((id) => !inline.has(id));
        expect(observed.entries.map(({ id }) => id), `${route} print order`).toEqual(printed);
        expect(
          observed.entries.map(({ number }) => number),
          `${route} numbers its References entries 1 to n`,
        ).toEqual(printed.map((_, index) => String(index + 1)));
        expect(
          observed.entries.filter(({ further }) => further === 'true').map(({ id }) => id),
          `${route} marks exactly its uncited sources data-further-reading`,
        ).toEqual(uncited);
        expect(
          observed.entries.filter(({ further }) => further === 'false').map(({ id }) => id),
          `${route} marks every cited source data-further-reading="false"`,
        ).toEqual(printed.filter((id) => inline.has(id)));
        expect(observed.furtherHeadings, `${route} Further reading headings`).toBe(
          uncited.length > 0 ? 1 : 0,
        );

        const numberOf = new Map(observed.entries.map(({ id, number }) => [id, number]));
        for (const { id, href, mark, note } of observed.marks) {
          expect(mark, `${route} superscript for ${id}`).toBe(numberOf.get(id));
          expect(note, `${route} sidenote for ${id}`).toBe(mark);
          expect(href, `${route} superscript for ${id} leads to its entry`).toBe(`#ref-${id}`);
        }
        numberedMarks += observed.marks.length;
        const declared = declaredIds(domain, slug);
        if (printed.some((id, index) => id !== declared[index])) renumbered += 1;
      },
      { baseURL },
    );
    expect(numberedMarks, 'no numbered citation was read').toBeGreaterThan(0);
    expect(
      renumbered,
      'no article interleaves an uncited source, so the renumbering case is vacuous',
    ).toBeGreaterThan(0);
  });

  test('entries show title, authors, year, venue and a primary-source link, verbatim from the registry (VAL-WIKI-002, VAL-WIKI-003)', async ({
    page,
  }) => {
    // One article per domain, including entries without a venue
    // (mobile-aloha-2024) to prove absent fields are omitted, not invented.
    for (const { domain, slug } of [ARTICLES[1], ARTICLES[2]]) {
      await page.goto(`/${domain}/${slug}/`);
      const ids = printedIds(domain, slug);
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

        // The meta line is the registry record rendered verbatim: the
        // author list, venue only when the registry records one, and the
        // year, rendered once when the venue already states it ("RSS 2023."
        // rather than "RSS 2023, 2023."). A list longer than eight names
        // shows the first eight and a count, and its toggle swaps in the
        // full registry list. An undated source ("n.d.") also states the
        // registry's access date. The derivation is inlined here so the spec
        // does not grade the renderer with the renderer's own rule.
        const year = citation.year === 'n.d.'
          ? `n.d.; accessed ${citation.accessedOn}`
          : String(citation.year);
        const trailing = `${citation.venue ? `, ${citation.venue}` : ''}${
          citation.venue?.includes(String(citation.year)) ? '' : `, ${year}`}.`;
        const meta = item.locator('p').first();
        const count = citation.authors.length;
        if (count > 8) {
          await expect(meta).toHaveText(
            `${citation.authors.slice(0, 8).join(', ')}, and ${count - 8} more${trailing} Show all ${count} authors`);
          await meta.getByRole('button', { name: `Show all ${count} authors`, exact: true }).click();
          await expect(meta).toHaveText(`${citation.authors.join(', ')}${trailing} Show 8 authors`);
        } else {
          await expect(meta).toHaveText(`${citation.authors.join(', ')}${trailing}`);
        }
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
      .evaluateAll((els) =>
        els.map((el) => el.getBoundingClientRect().right),
      );
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
      .evaluateAll((els) =>
        els.map((el) => el.getBoundingClientRect().right),
      );
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
