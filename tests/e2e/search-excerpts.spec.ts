import { expect, test, type Page } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { startStaticExportServer, type StaticExportServer } from './static-export-server';

/**
 * Search excerpt quality. Pagefind must never fuse the hidden tooltip copy
 * of <Term> definitions or <Cite> references onto the prose around them
 * (defect reported 2026-08-11: excerpts rendered "flow matchingA generative
 * modeling recipe..." and citation author lines such as "Chi, Zhenjia Xu,
 * Siyuan Feng et al., RSS 2023" leading the Diffusion Policy excerpt). The
 * tooltip spans carry data-pagefind-ignore, which excludes them from the
 * index ONLY: they stay in the DOM, wired to their trigger by
 * aria-describedby, fully available to hover, keyboard focus and screen
 * readers.
 *
 * Verified against the shipped artifact (the static export served locally
 * on an OS-assigned free port; see static-export-server.ts) because the
 * dev server never serves the Pagefind index. The assertion
 * strings are chosen to exist ONLY inside hidden tooltip copy within the
 * indexed region (article header + prose): the glossary definitions live on
 * /glossary, which is not indexed, and the References bibliography is
 * outside data-pagefind-body.
 *
 * Second noise sweep (2026-08-12): rehype-katex emits every formula as
 * three text representations — MathML markup and the application/x-tex
 * annotation (both inside .katex-mathml) plus the rendered HTML
 * (.katex-html) — and Pagefind indexed all three, triplicating every
 * formula ("dπ∗d_{\pi^*}dπ∗" on bc-foundations). lib/rehype-pagefind-math.mjs
 * marks .katex-mathml data-pagefind-ignore so only the rendered text is
 * indexed; the MathML stays in the DOM, un-aria-hidden, exactly what
 * assistive technology reads. Separately, the cite chip's reference-jump
 * glyph (↓) was indexed as visible text ("2024↓."); the glyph anchor alone
 * now carries data-pagefind-ignore while the chip label stays indexed.
 */

let server: StaticExportServer | null = null;
let BASE: string;

test.beforeAll(async () => {
  const outDir = join(process.cwd(), 'out');
  expect(
    existsSync(join(outDir, 'pagefind', 'pagefind.js')),
    'out/ is missing or stale: run `npm run build` before the search-excerpts spec',
  ).toBe(true);
  server = await startStaticExportServer(outDir);
  BASE = `http://localhost:${server.port}`;
});

test.afterAll(async () => {
  await server?.stop();
});

/** Runs a real query through the /search UI and returns every excerpt. */
async function searchExcerpts(page: Page, query: string): Promise<string[]> {
  await page.goto(`${BASE}/search`);
  const box = page.getByRole('searchbox', { name: 'Search the wiki' });
  await box.pressSequentially(query, { delay: 15 });
  const first = page.locator('[data-search-result] .search-excerpt').first();
  await first.waitFor({ state: 'visible', timeout: 15000 });
  // Latest-wins sequencing settles once the final keystroke's search lands.
  await page.waitForTimeout(300);
  return page.locator('[data-search-result] .search-excerpt').allTextContents();
}

test.describe('search excerpt quality', () => {
  test('term tooltip definitions never leak into search excerpts', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    // Each fragment is the opening of a glossary definition: within indexed
    // content it exists only inside the hidden <Term> tooltip.
    const cases: ReadonlyArray<readonly [string, string]> = [
      ['flow matching', 'generative modeling recipe'],
      ['covariate shift', 'the mismatch between the state distribution'],
    ];
    for (const [query, tooltipOnlyFragment] of cases) {
      const excerpts = await searchExcerpts(page, query);
      expect(
        excerpts.length,
        `query "${query}" returns at least one excerpt`,
      ).toBeGreaterThan(0);
      for (const excerpt of excerpts) {
        expect(
          excerpt,
          `excerpt for "${query}" fuses hidden term-tooltip copy`,
        ).not.toContain(tooltipOnlyFragment);
      }
    }
  });

  test('citation tooltip author lines never leak into search excerpts', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    // "Siyuan Feng" appears only in the hidden <Cite> tooltip meta (and the
    // non-indexed References list); it is in no article's indexed prose.
    const excerpts = await searchExcerpts(page, 'flow matching');
    expect(excerpts.length).toBeGreaterThan(0);
    for (const excerpt of excerpts) {
      expect(
        excerpt,
        'excerpt fuses hidden citation-tooltip copy',
      ).not.toContain('Siyuan Feng');
    }
  });

  test('math excerpts carry the rendered formula once, never the TeX source', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    // "two diverge" excerpts the bc-foundations covariate-shift paragraph;
    // pre-fix its excerpt read exactly "dπ∗d_{\pi^*}dπ∗ ... dπd_\pidπ"
    // (measured on the pre-fix export, 2026-08-12).
    const excerpts = await searchExcerpts(page, 'two diverge');
    expect(excerpts.length).toBeGreaterThan(0);
    for (const excerpt of excerpts) {
      // TeX annotation leakage is unambiguous: no indexed prose or code
      // contains a backslash or _{ / ^{ source syntax (verified by sweep),
      // so any occurrence is the KaTeX annotation.
      expect(excerpt, 'excerpt leaks the TeX annotation').not.toMatch(
        /\\|_\{|\^\{/,
      );
      expect(
        excerpt,
        'excerpt contains the reported triplication defect',
      ).not.toContain('d_{\\pi^*}');
      // The rendered formula may appear at most once per excerpt (pre-fix
      // it appeared twice: MathML text + rendered HTML). Strip the
      // zero-width space KaTeX emits inside sub/superscript structure.
      const normalized = excerpt.replace(/\u200B/g, '');
      expect(
        normalized.split('dπ∗').length - 1,
        'excerpt duplicates the rendered formula',
      ).toBeLessThanOrEqual(1);
    }
    // Positive control against over-exclusion: the rendered math text is
    // still indexed and still reaches the excerpt.
    expect(
      excerpts.some(
        (excerpt) => excerpt.replace(/\u200B/g, '').includes('dπ∗'),
      ),
      'rendered math text no longer reaches any excerpt',
    ).toBe(true);
  });

  test('cite chip reference-jump glyph never leaks into excerpts', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    // bc-foundations ends its quadratic-cost sentence with a cite chip
    // directly before the period, so pre-fix excerpts read "2011↓."
    const excerpts = await searchExcerpts(page, 'quadratic');
    expect(excerpts.length).toBeGreaterThan(0);
    for (const excerpt of excerpts) {
      expect(
        excerpt,
        'excerpt leaks the reference-jump glyph',
      ).not.toContain('↓');
    }
  });

  test('cite chip label stays indexed (only the glyph anchor is ignored)', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    // "Pomerleau" occurs in indexed content ONLY as the alvinn-1988 chip
    // label: the tooltip copy is data-pagefind-ignore'd and the References
    // bibliography is outside data-pagefind-body. Any genuine hit therefore
    // proves the label anchor itself is still indexed.
    const excerpts = await searchExcerpts(page, 'Pomerleau');
    expect(
      excerpts.length,
      'chip label must stay indexed: "Pomerleau" returns no hits',
    ).toBeGreaterThan(0);
  });

  test('math stays exposed to assistive technology, hidden from the index only', async ({
    page,
  }) => {
    await page.goto(`${BASE}/manipulation/bc-foundations/`);

    const mathml = page.locator('.katex .katex-mathml').first();
    await expect(mathml).toHaveAttribute('data-pagefind-ignore', 'true');
    // The MathML span is what screen readers announce: no aria-hidden, not
    // display:none, and the <math> subtree (annotation included) is intact.
    expect(await mathml.getAttribute('aria-hidden')).toBeNull();
    expect(
      await mathml.evaluate((el) => getComputedStyle(el).display),
    ).not.toBe('none');
    await expect(mathml.locator('math semantics annotation')).toHaveCount(1);

    // The rendered HTML half keeps its aria-hidden marker and stays indexed.
    const html = page.locator('.katex .katex-html').first();
    await expect(html).toHaveAttribute('aria-hidden', 'true');
    expect(await html.getAttribute('data-pagefind-ignore')).toBeNull();
  });

  test('cite chip: only the glyph anchor is index-ignored, label and a11y wiring intact', async ({
    page,
  }) => {
    await page.goto(`${BASE}/manipulation/bc-foundations/`);

    const chip = page.locator('[data-cite-id="alvinn-1988"]').first();
    const label = chip.locator('a[aria-describedby]').first();
    await expect(label).toContainText('Pomerleau 1988');
    expect(await label.getAttribute('data-pagefind-ignore')).toBeNull();

    const jump = chip.locator('a[href^="#ref-"]');
    await expect(jump).toHaveAttribute('data-pagefind-ignore', 'true');
    // The jump affordance keeps its accessible name and glyph semantics.
    await expect(jump).toHaveAttribute(
      'aria-label',
      /Jump to the full reference/,
    );
    await expect(jump.locator('span[aria-hidden="true"]')).toHaveText('↓');
  });

  test('tooltips stay in the DOM for assistive technology, hidden from the index only', async ({
    page,
  }) => {
    await page.goto(`${BASE}/manipulation/pi-line/`);

    // Term: the link keeps its aria-describedby wiring to an in-DOM tooltip
    // that carries the full definition; only the index ignores it.
    const termRoot = page.locator('[data-term-id="flow-matching"]').first();
    const termLink = termRoot.locator('a.term-link');
    const termTooltip = termRoot.locator('span[role="tooltip"]');
    await expect(termTooltip).toHaveCount(1);
    await expect(termTooltip).toHaveAttribute('data-pagefind-ignore', 'true');
    const termDescribedBy = await termLink.getAttribute('aria-describedby');
    expect(termDescribedBy).toBeTruthy();
    await expect(termTooltip).toHaveAttribute('id', termDescribedBy ?? '');
    await expect(termTooltip).toContainText('generative modeling recipe');
    // Hidden at rest, revealed on keyboard focus: the reader contract.
    await expect(termTooltip).toBeHidden();
    await termLink.focus();
    await expect(termTooltip).toBeVisible();

    // Cite: same contract on a citation chip's tooltip.
    const citeRoot = page.locator('[data-cite-id="pistar06-2025"]').first();
    const citeLink = citeRoot.locator(`a[aria-describedby]`).first();
    const citeTooltip = citeRoot.locator('span[role="tooltip"]');
    await expect(citeTooltip).toHaveCount(1);
    await expect(citeTooltip).toHaveAttribute('data-pagefind-ignore', 'true');
    const citeDescribedBy = await citeLink.getAttribute('aria-describedby');
    expect(citeDescribedBy).toBeTruthy();
    await expect(citeTooltip).toHaveAttribute('id', citeDescribedBy ?? '');
  });
});
