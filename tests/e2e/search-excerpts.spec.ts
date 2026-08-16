import { expect, test, type Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { getModule } from '../../data/modules';
import {
  startStaticExportServer,
  type StaticExportServer,
} from './static-export-server';

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

/**
 * Stabilization wait for the search result list: sample the excerpt set
 * until two consecutive reads agree, then return it. Replaces a fixed
 * 300 ms sleep that read whatever was on screen once the first excerpt
 * appeared (the closest surviving cousin of the run-sleep-pause race
 * fixed in 73b12c9): under load the final keystroke's debounced search
 * can land later than the sleep, and the assertions would run against a
 * stale prefix's result set. Waiting for observed quiescence removes the
 * assumption that 300 ms is always enough; when the system is fast the
 * cost is one extra 250 ms sample.
 *
 * The 250 ms sample gap is wider than the 200 ms debounce, so a pair of
 * agreeing reads always spans the moment the final search applies. The
 * 10 s bound keeps a never-settling result list a loud failure instead
 * of a silent stale read: proven by mutation (2026-08-15), a debounce
 * re-triggering a fresh search with a strictly growing hit count on
 * every fire exhausted this budget and failed every excerpt spec.
 */
const STABILIZE_SAMPLE_MS = 250;
const STABILIZE_BUDGET_MS = 10_000;

async function settledExcerpts(page: Page): Promise<string[]> {
  const excerpts = page.locator('[data-search-result] .search-excerpt');
  let previous = await excerpts.allTextContents();
  const deadline = Date.now() + STABILIZE_BUDGET_MS;
  while (Date.now() < deadline) {
    await page.waitForTimeout(STABILIZE_SAMPLE_MS);
    const current = await excerpts.allTextContents();
    if (
      current.length > 0 &&
      current.length === previous.length &&
      current.every((text, index) => text === previous[index])
    ) {
      return current;
    }
    previous = current;
  }
  throw new Error(
    `search excerpts did not stabilize within ${
      STABILIZE_BUDGET_MS / 1000
    } s; last read held ${previous.length} excerpt(s)` +
      (previous[0] ? `, first: "${previous[0].slice(0, 70)}"` : ''),
  );
}

/** Runs a real query through the /search UI and returns every excerpt. */
async function searchExcerpts(page: Page, query: string): Promise<string[]> {
  await page.goto(`${BASE}/search`);
  const box = page.getByRole('searchbox', { name: 'Search the wiki' });
  await box.pressSequentially(query, { delay: 15 });
  const first = page.locator('[data-search-result] .search-excerpt').first();
  await first.waitFor({ state: 'visible', timeout: 15000 });
  // Latest-wins sequencing has settled only once the excerpt set itself
  // has stopped changing, not after a fixed deadline.
  return settledExcerpts(page);
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
      excerpts.some((excerpt) =>
        excerpt.replace(/\u200B/g, '').includes('dπ∗'),
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
      expect(excerpt, 'excerpt leaks the reference-jump glyph').not.toContain(
        '↓',
      );
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

/**
 * Third noise sweep (2026-08-14, harden-search-excerpt-credits): figure
 * credit lines and interactive transport labels fused into excerpts —
 * "Deviation feeds itself.Diagram: robot-wiki contributors / ..." and
 * "Step backStep forwardReset. step 0 of 10 ...", both measured on the
 * live index. The decision here is per element type, never a blanket
 * rule:
 *
 * - Figure CREDIT (the data-image-credit span: kind, creator, source and
 *   licence links) is attribution chrome and is excluded from the index.
 *   The credit stays VISIBLE on the page with both links intact:
 *   data-pagefind-ignore is index-only, so the VAL-IMG-002/003 licensing
 *   guarantees (visible attribution, link to the original) are untouched
 *   and the imagery spec keeps asserting them against the same DOM.
 * - Figure CAPTION (figcaption) stays indexed. Captions are real content
 *   a reader may legitimately search ("...results above all ran on this
 *   platform"); the positive controls below pin this so the credit fix
 *   cannot silently over-exclude.
 * - Interactive TRANSPORT/ACTION buttons (Play/Pause, Step, Step back,
 *   Step forward, Reset, Reseed, Clear filters, Push, Plan step, Add/
 *   Remove contact, Run next generation, Copy) are excluded per button.
 *   They are UI chrome verbs; a reader searching "reset" wants the prose
 *   concept (episode reset), not a button.
 * - Interactive SELECTORS (the aria-pressed option chips: gait names,
 *   filter options, model/layer/strategy/thesis pickers, sort headers)
 *   and all READOUTS stay indexed: their labels and values are concept
 *   nouns and named regimes ("Trot", "balanced gait", "370 units",
 *   "pure Gaussian noise") that carry the substance of the page.
 */
test.describe('excerpt chrome: figure credits and interactive controls', () => {
  test('figure credit lines never leak into search excerpts', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    // Caption-adjacent queries whose pre-fix excerpts fused the credit
    // line (measured on the pre-fix export, 2026-08-14):
    //   "CeBIT 2017" → "...guiding it by hand.Photo: Ims / Wikimedia
    //     Commons. Licence: CC BY-SA 4.0. Humanoids: shipping..."
    //   "ran on this platform" → "...ran on this platform.Photo: ANYbotics
    //     / Wikimedia Commons. Licence: CC BY-SA 4.0. Choi and..."
    for (const query of ['CeBIT 2017', 'ran on this platform']) {
      const excerpts = await searchExcerpts(page, query);
      expect(
        excerpts.length,
        `query "${query}" returns at least one excerpt`,
      ).toBeGreaterThan(0);
      for (const excerpt of excerpts) {
        // Credit vocabulary is unambiguous: no indexed prose or caption
        // contains these strings (verified by corpus sweep), so any
        // occurrence is the credit line. The fusion joins without
        // whitespace ("...by hand.Photo: Ims /..."), so match plainly.
        expect(
          excerpt,
          `excerpt for "${query}" leaks a credit kind`,
        ).not.toMatch(/(Photo|Diagram): /);
        expect(
          excerpt,
          `excerpt for "${query}" leaks the licence statement`,
        ).not.toContain('Licence:');
        expect(
          excerpt,
          `excerpt for "${query}" leaks the credit creator`,
        ).not.toContain('robot-wiki contributors');
      }
    }
  });

  test('interactive transport labels never leak into search excerpts', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    // Readout-anchored queries whose pre-fix excerpts fused the transport
    // buttons (measured on the pre-fix export, 2026-08-14):
    //   "370 units" → "cost near-linear in T. Reset. Per-timestep
    //     predictionChunk of 25 actions. ... accumulated deviation =
    //     370 units over 120 steps ..."
    //   "balanced gait" → "PlayStepResetbalanced gait. weighted total:
    //     -5.52 / stepterms: 12preview phase: 0% balanced gait. ..."
    // No published prose contains a capitalized "Reset" (corpus sweep:
    // only lowercase "episode reset"), so any "Reset" in an excerpt is a
    // button label.
    const cases: ReadonlyArray<{
      query: string;
      forbidden: readonly string[];
    }> = [
      { query: '370 units', forbidden: ['Reset'] },
      { query: 'balanced gait', forbidden: ['PlayStep', 'StepReset', 'Reset'] },
    ];
    for (const { query, forbidden } of cases) {
      const excerpts = await searchExcerpts(page, query);
      expect(
        excerpts.length,
        `query "${query}" returns at least one excerpt`,
      ).toBeGreaterThan(0);
      for (const excerpt of excerpts) {
        for (const label of forbidden) {
          expect(
            excerpt,
            `excerpt for "${query}" fuses the "${label}" control label`,
          ).not.toContain(label);
        }
      }
    }
  });

  test('figure captions stay indexed (positive control against over-exclusion)', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    // Both fragments exist ONLY inside figure captions (verified: no prose
    // occurrence anywhere in content/). If the caption were excluded
    // together with the credit, these queries would lose their excerpt.
    const cases: ReadonlyArray<readonly [string, string]> = [
      ['CeBIT 2017', 'guiding it by hand'],
      ['ran on this platform', 'ran on this platform'],
    ];
    for (const [query, captionFragment] of cases) {
      const excerpts = await searchExcerpts(page, query);
      expect(
        excerpts.some((excerpt) => excerpt.includes(captionFragment)),
        `caption text "${captionFragment}" no longer reaches any excerpt`,
      ).toBe(true);
    }
  });

  test('interactive readouts stay indexed (positive control against over-exclusion)', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    // "370 units" exists only in the CompoundingError readout and
    // "balanced gait" only in the RewardShaping status readout (verified:
    // no prose occurrence). If readouts were excluded with the buttons,
    // these queries would lose their excerpt.
    const cases: ReadonlyArray<readonly [string, string]> = [
      ['370 units', '370 units'],
      ['balanced gait', 'balanced gait'],
    ];
    for (const [query, readoutFragment] of cases) {
      const excerpts = await searchExcerpts(page, query);
      expect(
        excerpts.some((excerpt) => excerpt.includes(readoutFragment)),
        `readout text "${readoutFragment}" no longer reaches any excerpt`,
      ).toBe(true);
    }
  });

  test('figure credit stays visible and fully linked, ignored by the index only', async ({
    page,
  }) => {
    await page.goto(`${BASE}/rl-sim2real/legged-locomotion/`);

    const credit = page.locator('main [data-image-credit]').first();
    // The licensing guarantee (VAL-IMG-002/003) is a VISIBLE credit with
    // working links; the attribute excludes the index only.
    await expect(credit).toBeVisible();
    await expect(credit).toHaveAttribute('data-pagefind-ignore', 'true');
    await expect(credit).toContainText('Photo: ANYbotics');
    await expect(credit).toContainText('Licence: CC BY-SA 4.0');
    const links = credit.locator('a');
    await expect(links).toHaveCount(2);
    await expect(links.nth(0)).toHaveAttribute(
      'href',
      'https://commons.wikimedia.org/wiki/File:ANYbotics_robot_dog_ANYmal.jpg',
    );
    await expect(links.nth(0)).toHaveAttribute('target', '_blank');
    await expect(links.nth(1)).toHaveAttribute(
      'href',
      'https://creativecommons.org/licenses/by-sa/4.0',
    );

    // The caption is content and keeps its index presence.
    const caption = page.locator('main figcaption').first();
    await expect(caption).toContainText('ran on this platform');
    expect(await caption.getAttribute('data-pagefind-ignore')).toBeNull();
  });

  test('transport buttons are index-ignored; selectors and readouts are not', async ({
    page,
  }) => {
    await page.goto(`${BASE}/manipulation/diffusion-policy/`);

    // Every transport/action button on the page carries the attribute.
    for (const name of ['Step back', 'Step forward', 'Reset']) {
      const buttons = page.getByRole('button', { name, exact: true });
      const all = await buttons.all();
      expect(all.length, `page has a "${name}" button`).toBeGreaterThan(0);
      for (const button of all) {
        await expect(button).toHaveAttribute('data-pagefind-ignore', 'true');
      }
    }
    // The readout keeps its index presence: it carries the substance.
    const readout = page.getByTestId('denoise-step-readout');
    await expect(readout).toContainText('step 0 of 10');
    expect(await readout.getAttribute('data-pagefind-ignore')).toBeNull();

    // Selector chips are concept nouns and stay indexed (gait names on
    // the legged-locomotion GaitDiagram).
    await page.goto(`${BASE}/rl-sim2real/legged-locomotion/`);
    const trot = page.getByRole('button', { name: 'Trot', exact: true });
    await expect(trot).toBeVisible();
    expect(await trot.getAttribute('data-pagefind-ignore')).toBeNull();
    const reset = page.getByRole('button', { name: 'Reset', exact: true });
    await expect(reset).toHaveAttribute('data-pagefind-ignore', 'true');
    const play = page.getByRole('button', { name: 'Play gait cycle' });
    await expect(play).toHaveAttribute('data-pagefind-ignore', 'true');
  });
});

/**
 * Fourth noise sweep (2026-08-15, harden-search-header-metadata-fusion):
 * the article header's metadata row fused into excerpts. The ArticleHeader
 * root element is itself a data-pagefind-body region (title + summary +
 * metadata dl), and Pagefind joins the dl's dt/dd text without the CSS gap
 * that separates them on the page, so description-matching queries read
 * "...prediction and the conditioning-strength problem. Last reviewed8
 * August 2026. Reading time8 min. Citations10. The third paradigm..."
 * (measured on the pre-fix export). Decision, extending the per-element
 * record in library/search.md: metadata values (dates, counts) are page
 * chrome, not prose, so the whole dl row is excluded from the index. The
 * title and summary stay indexed — they are the content a
 * description-matching query is looking for.
 */
test.describe('excerpt chrome: article header metadata row', () => {
  test('header metadata (last reviewed, reading time, citations) never fuses into excerpts', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    // Description-anchored queries whose pre-fix excerpts fused the header
    // metadata row (measured on the pre-fix export, 2026-08-15):
    //   "video prediction" → "...action-conditioned video prediction and
    //     the conditioning-strength problem. Last reviewed8 August 2026.
    //     Reading time8 min. Citations10. The third paradigm..."
    //   "neural simulator" → "...real physics engines beats generated
    //     dynamics. Last reviewed8 August 2026. Reading time7 min.
    //     Citations8. The previous three modules..."
    //   "generated dynamics" → "...compact learned dynamics for
    //     imagination-based control. Last reviewed8 August 2026.
    //     Reading time6 min. Citations9. Of the six paradigms..."
    for (const query of [
      'video prediction',
      'neural simulator',
      'generated dynamics',
    ]) {
      const excerpts = await searchExcerpts(page, query);
      expect(
        excerpts.length,
        `query "${query}" returns at least one excerpt`,
      ).toBeGreaterThan(0);
      for (const excerpt of excerpts) {
        // Header-label vocabulary is unambiguous: no indexed prose,
        // caption or readout anywhere in content/ or data/ contains
        // "Last reviewed", "Reading time" or "Citations" (verified by
        // corpus sweep), so any occurrence is the metadata row.
        expect(
          excerpt,
          `excerpt for "${query}" fuses the header metadata row`,
        ).not.toMatch(/Last reviewed|Reading time|Citations/);
      }
    }
  });

  test('header title and summary stay indexed (positive control against over-exclusion)', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    // "conditioning-strength problem" exists only in the generative-video
    // header summary (registry summary; verified: no prose occurrence),
    // and "video prediction" only matches the same page's summary in the
    // header region. If the whole header were excluded together with the
    // metadata row, this excerpt would lose its summary text.
    const excerpts = await searchExcerpts(page, 'video prediction');
    expect(
      excerpts.some((excerpt) =>
        excerpt.includes('conditioning-strength problem'),
      ),
      'header summary text no longer reaches any excerpt',
    ).toBe(true);
  });

  test('metadata row is index-ignored; title and summary are not', async ({
    page,
  }) => {
    await page.goto(`${BASE}/world-models/generative-video/`);

    // Title and lastReviewed are derived from the module registry and the
    // article's real frontmatter, so a content edit (a re-review date
    // bump, a retitle) cannot silently break this spec: the expectation
    // moves with the fixture instead of hardcoding "Generative Video
    // World Models" / datetime="2026-08-08".
    const entry = getModule('world-models', 'generative-video');
    expect(entry, 'world-models/generative-video is registered').toBeTruthy();
    const fm = matter(
      readFileSync(
        join(process.cwd(), 'content', 'world-models', 'generative-video.mdx'),
        'utf8',
      ),
    ).data as { lastReviewed?: string };

    // The whole metadata row (one dl: last reviewed, reading time,
    // citations) carries the attribute.
    const row = page.locator('article header dl');
    await expect(row).toHaveCount(1);
    await expect(row).toHaveAttribute('data-pagefind-ignore', 'true');

    // Title and summary are content and keep their index presence.
    const title = page.locator('article header h1');
    await expect(title).toHaveText(entry!.title);
    expect(await title.getAttribute('data-pagefind-ignore')).toBeNull();
    const summary = page.locator('article header p');
    await expect(summary).toContainText('conditioning-strength problem');
    expect(await summary.getAttribute('data-pagefind-ignore')).toBeNull();

    // The attribute is index-only: the row stays visible with all three
    // values, so the VAL-WIKI header apparatus is untouched.
    await expect(row).toBeVisible();
    await expect(row).toContainText('Last reviewed');
    await expect(row).toContainText('Reading time');
    await expect(row).toContainText('Citations');
    if (fm.lastReviewed) {
      await expect(row.locator('time')).toHaveAttribute(
        'datetime',
        fm.lastReviewed,
      );
    }
  });
});
