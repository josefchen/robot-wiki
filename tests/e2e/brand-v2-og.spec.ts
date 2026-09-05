import {
  expectedRedAssertionIds,
  test,
  expect,
} from './brand-v2-static-fixture';
import { PUBLIC_DESCRIPTOR, PUBLIC_IDENTITY } from '../../lib/identity';
import { cardTextRuns } from '../../lib/og-card-artwork';
import { ogCardCorpus, openSealedCardTree } from '../../lib/og-card-corpus';

test.describe('brand-v2 OG authority', () => {
  test('site metadata carries exact v2 identity and descriptor', async ({
    page,
    staticBase,
  }) => {
    await page.goto(`${staticBase}/`);
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute(
      'content',
      PUBLIC_IDENTITY,
    );
    await expect(
      page.locator('meta[property="og:description"]'),
    ).toHaveAttribute('content', PUBLIC_DESCRIPTOR);
  });

  test('article metadata uses compact Robot Wiki without the descriptor', async ({
    page,
    staticBase,
  }) => {
    await page.goto(`${staticBase}/manipulation/action-chunking/`);
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute(
      'content',
      PUBLIC_IDENTITY,
    );
    await expect(
      page.locator('meta[property="og:description"]'),
    ).not.toHaveAttribute('content', PUBLIC_DESCRIPTOR);
  });

  test('VAL-B2-ID-009 drawn card artwork carries the exact v2 identity', () => {
    // The drawn half of VAL-B2-ID-009 was archived while the cards still
    // painted the v1 lockup. It is enforced here now, and the archive is
    // asserted empty in the same row so re-archiving the claim cannot
    // quietly re-excuse it.
    expect(expectedRedAssertionIds('brand-v2 OG authority')).toEqual([]);

    const corpus = ogCardCorpus(process.cwd());
    const site = corpus.filter(({ cardId }) => cardId === 'site');
    expect(site, 'exactly one site card in the corpus').toHaveLength(1);
    expect(corpus.length, 'article cards beside it').toBeGreaterThan(1);

    for (const { cardId, card } of corpus) {
      const runs = cardTextRuns(openSealedCardTree(card)).map(
        ({ text }) => text,
      );
      expect(runs, `${cardId} paints the compact identity`).toContain(
        PUBLIC_IDENTITY,
      );
      // The descriptor belongs to the site card alone; an article card that
      // carried it would be the duplicate-lockup defect in card form.
      expect(
        runs.includes(PUBLIC_DESCRIPTOR),
        `${cardId} descriptor presence`,
      ).toBe(cardId === 'site');
      for (const run of runs) {
        if (!/robot[- ]wiki/i.test(run)) continue;
        // A run naming the brand is either the exact display identity or
        // the production domain, a technical identifier VAL-B2-ID-004
        // keeps unchanged. Anything else is v1 residue.
        expect([PUBLIC_IDENTITY, 'ROBOT-WIKI.COM'], `${cardId} run`).toContain(
          run,
        );
      }
    }
  });
});
