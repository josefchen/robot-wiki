import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  internalLinkTargets,
  normalizeInternalPath,
} from '../../lib/backlinks';

/**
 * Manipulation cross-references (VAL-CROSS-006): the in-prose internal
 * links from /manipulation/action-chunking/ to diffusion-policy and the
 * pi line live in the article's prose region (a real sentence carrying a
 * real link, not a glossary-term anchor or a See-also entry) and resolve
 * to the correct module pages. The backlink graph derives from the same
 * source scan, so the linked-from lists must pick the edges up too.
 */

const ROUTE = '/manipulation/action-chunking/';

/** Source-derived expectation: the prose body's internal article links. */
function proseTargets(): string[] {
  const source = readFileSync(
    join(process.cwd(), 'content', 'manipulation', 'action-chunking.mdx'),
    'utf8',
  );
  const body = source.replace(/^---[\s\S]*?---/, '');
  return internalLinkTargets(body);
}

const EXPECTED: ReadonlyArray<{ href: string; h1: string }> = [
  { href: '/manipulation/diffusion-policy/', h1: 'Diffusion Policy' },
  { href: '/manipulation/pi-line/', h1: 'The Pi Line' },
];

test.describe('action-chunking cross-references (VAL-CROSS-006)', () => {
  test('carries in-prose links to diffusion-policy and pi-line', async ({
    page,
  }) => {
    // Both targets must be extractable from the article source at all
    // (red-first: this fails against prose that links neither).
    const targets = proseTargets();
    for (const { href } of EXPECTED) {
      expect(targets, `action-chunking prose links to ${href}`).toContain(
        normalizeInternalPath(href),
      );
    }

    // Rendered: the link sits inside the article prose region, not the
    // trailing apparatus. Glossary-term anchors also live in prose, so
    // the href itself is the discriminator. Markdown in-prose links keep
    // their written href (no trailing slash) while the derived apparatus
    // links carry one, so anchors are compared normalized.
    await page.goto(ROUTE);
    const prose = page.locator('div.prose[data-pagefind-body]');
    const rendered = await prose
      .locator('a[href^="/manipulation/"]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('href') ?? ''));
    for (const { href } of EXPECTED) {
      const target = normalizeInternalPath(href);
      expect(
        rendered.filter((r) => normalizeInternalPath(r) === target),
        `in-prose anchor to ${href}`,
      ).toHaveLength(1);
    }
  });

  test('every in-prose cross-reference resolves to the correct module page', async ({
    page,
  }) => {
    for (const { href, h1 } of EXPECTED) {
      await test.step(href, async () => {
        await page.goto(ROUTE);
        const target = normalizeInternalPath(href);
        // Resolve the first in-prose anchor whose normalized href equals
        // the target (locators cannot express normalization; the written
        // markdown href carries no trailing slash).
        const ANCHORS =
          'div.prose[data-pagefind-body] a[href^="/manipulation/"]';
        const index = await page.locator(ANCHORS).evaluateAll((els, t) => {
          const norm = (u: string) =>
            u.split('#')[0].split('?')[0].replace(/\/$/, '');
          const hit = els.find(
            (el) => norm(el.getAttribute('href') ?? '') === t,
          );
          return hit ? els.indexOf(hit) : -1;
        }, target);
        expect(
          index,
          `in-prose anchor to ${href} exists`,
        ).toBeGreaterThanOrEqual(0);
        await page.locator(ANCHORS).nth(index).click();
        // trailingSlash:true normalizes the final URL, so accept either
        // form.
        await page.waitForURL(new RegExp(`${target}/?$`));
        const response = await page.goto(href);
        expect(response?.ok(), `${href} serves 200`).toBe(true);
        await expect(page.locator('h1')).toHaveText(h1);
      });
    }
  });

  test('the new edges surface in the derived backlink graph', async ({
    page,
  }) => {
    for (const { href, h1 } of EXPECTED) {
      await test.step(href, async () => {
        await page.goto(href);
        const linkedFrom = page.locator('section[data-section="linked-from"]');
        await expect(linkedFrom).toBeVisible();
        const entry = linkedFrom.locator(
          'li[data-article-key="manipulation/action-chunking"]',
        );
        await expect(entry).toBeVisible();
        await expect(entry.getByRole('link')).toHaveText(
          'Action Chunking (ACT and ALOHA)',
        );
        expect(h1).toBeTruthy();
      });
    }
  });
});
