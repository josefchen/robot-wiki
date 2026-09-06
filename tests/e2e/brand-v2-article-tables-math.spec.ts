import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Locator } from '@playwright/test';
import { expect, test } from './brand-v2-static-fixture';
import {
  TABLE_MATH_EVIDENCE_PATH,
  TABLE_MATH_VIEWPORTS,
  equationAccessibilityVerdicts,
  readTableMathEvidence,
  scrollRegionVerdicts,
  tableContainmentVerdicts,
  tableMathEvidenceFingerprint,
  tableMathRoutes,
  type TableMathRouteObservation,
} from '../../lib/brand-v2-table-math-evidence';
import { setSlider } from './slider';

const ROOT = process.cwd();

/**
 * Runs inside the page.
 *
 * Every table and every equation is discovered from the rendered document,
 * and every scroll container is found by walking up from the element to the
 * first ancestor whose COMPUTED `overflow-x` scrolls. Neither population can
 * be steered by a list of selectors that agrees with itself, and a table
 * authored tomorrow inside a hand-rolled `overflow-x-auto` div joins the
 * sweep without anyone registering it.
 *
 * The scroll container is also really scrolled and put back, because a
 * `scrollWidth` larger than a `clientWidth` is equally consistent with a
 * clipped box that no reader can move.
 */
function collectTablesAndMath(): Omit<
  TableMathRouteObservation,
  'route' | 'viewport'
> {
  const round = (value: number) => Math.round(value * 100) / 100;
  const clean = (value: string | null | undefined) =>
    (value ?? '').replace(/\s+/g, ' ').trim();
  const textOf = (el: Element | null | undefined) => clean(el?.textContent);

  const scrollParent = (el: Element): HTMLElement | null => {
    let node = el.parentElement;
    while (node) {
      const overflowX = getComputedStyle(node).overflowX;
      if (overflowX === 'auto' || overflowX === 'scroll') return node;
      node = node.parentElement;
    }
    return null;
  };

  /**
   * The accessible name an element gets from `aria-labelledby` or
   * `aria-label`. Deliberately not the full accname algorithm: these are the
   * only two mechanisms a scroll container or a table can use here, and a
   * partial implementation that silently invented a name from content would
   * report unnamed boxes as named.
   */
  const ariaName = (el: Element | null): string => {
    if (!el) return '';
    const labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy) {
      return clean(
        labelledBy
          .split(/\s+/)
          .map((id) => textOf(document.getElementById(id)))
          .join(' '),
      );
    }
    return clean(el.getAttribute('aria-label'));
  };

  /**
   * How far a table extends past the box that is supposed to hold it.
   *
   * For a scroll container that is NOT its visible edge: a table wider than
   * the visible box is the intended state, and `getBoundingClientRect`
   * reports the unclipped layout box, so comparing the two would call every
   * correctly scrolling table a spill. The box that has to hold it is the
   * container's whole scrollable extent, which is what a reader can reach by
   * scrolling. For a table with no scroll container it is the parent's own
   * visible box, because nothing can be scrolled to reach the rest.
   */
  const overflowPastHolder = (table: Element, container: HTMLElement | null) => {
    const tableRight = table.getBoundingClientRect().right;
    if (container) {
      const box = container.getBoundingClientRect();
      // `scrollWidth` is an integer truncation of a fractional layout, so
      // the extent a reader can actually reach is [scrollWidth,
      // scrollWidth + 1). Charging that quantum to the table would report a
      // 700.5px table in a 700px-reported box as a spill.
      const reachableRight =
        box.left - container.scrollLeft + container.scrollWidth + 1;
      return round(Math.max(0, tableRight - reachableRight));
    }
    const parent = table.parentElement;
    if (!parent) return 0;
    return round(Math.max(0, tableRight - parent.getBoundingClientRect().right));
  };

  const tables = Array.from(document.querySelectorAll<HTMLTableElement>('table')).map(
    (table, index) => {
      const container = scrollParent(table);
      const caption = textOf(table.querySelector('caption'));
      const cells = Array.from(table.querySelectorAll('td, th')).map((cell) =>
        textOf(cell).toLowerCase(),
      );
      let scrolledBy = 0;
      if (container) {
        const start = container.scrollLeft;
        container.scrollLeft = start + 40;
        scrolledBy = container.scrollLeft - start;
        container.scrollLeft = start;
      }
      const tableBox = table.getBoundingClientRect();
      const containerBox = (container ?? table).getBoundingClientRect();
      return {
        index,
        // A caption names the table directly; a labelled region around it
        // names it for anyone who reaches the box instead of the grid.
        accessibleName: caption || ariaName(table) || ariaName(container),
        captionText: caption,
        columnHeaders: table.querySelectorAll('th[scope="col"]').length,
        rowHeaders: table.querySelectorAll('th[scope="row"]').length,
        unscopedHeaders: table.querySelectorAll('th:not([scope])').length,
        sortButtons: table.querySelectorAll('thead button').length,
        sortedColumns: table.querySelectorAll('th[aria-sort]').length,
        notDisclosedCells: cells.filter((text) => text.includes('not disclosed'))
          .length,
        notApplicableCells: cells.filter((text) => /(^|\s)n\/a(\s|$)/.test(text))
          .length,
        scrollContainer: container
          ? {
              overflowX: getComputedStyle(container).overflowX,
              tabIndex: container.tabIndex,
              role: container.getAttribute('role'),
              accessibleName: ariaName(container),
              clientWidth: container.clientWidth,
              scrollWidth: container.scrollWidth,
              scrolledBy: round(scrolledBy),
            }
          : null,
        tableWidth: round(tableBox.width),
        containerOverflowPx: overflowPastHolder(table, container),
        viewportOverflowPx: round(
          Math.max(0, containerBox.right - window.innerWidth, -containerBox.left),
        ),
      };
    },
  );

  /**
   * Every expression a reader meets, typeset or not.
   *
   * A failed parse is NOT a `.katex` with an error inside it: KaTeX renders
   * it as a ROOT `<span class="katex-error">` whose class list carries no
   * `katex` token at all. A population derived from `.katex` therefore loses
   * the broken equation before anything grades it, and its absence reads as
   * a clean sweep. Both roots are collected, and the outermost of any nested
   * pair is kept so one expression is one member.
   */
  const mathRoots = Array.from(
    document.querySelectorAll<HTMLElement>('.katex, .katex-error'),
  ).filter(
    (element) => element.parentElement?.closest('.katex, .katex-error') == null,
  );

  const equations = mathRoots.map((root, index) => {
    const parseFailed = root.classList.contains('katex-error');
    // KaTeX nests `.katex` inside `.katex-display`; the display wrapper is
    // the box that scrolls and carries the tab stop, so measure that one.
    const display = root.closest<HTMLElement>('.katex-display');
    const box = display ?? root;
    const rect = box.getBoundingClientRect();
    return {
      index,
      display: display !== null,
      mathmlText: textOf(root.querySelector('.katex-mathml')),
      annotationTex: textOf(
        root.querySelector('annotation[encoding="application/x-tex"]'),
      ),
      htmlLayerHidden:
        root.querySelector('.katex-html')?.getAttribute('aria-hidden') ===
        'true',
      renderError: parseFailed || root.querySelector('.katex-error') !== null,
      // The glyph layer only. The MathML layer legitimately carries the
      // TeX source in its annotation, so reading the whole subtree would
      // report every correctly typeset equation as leaking raw TeX. A
      // failed parse has no glyph layer: its own text is the raw source
      // KaTeX gave up on, which is what the reader sees.
      renderedText: parseFailed
        ? textOf(root)
        : textOf(root.querySelector('.katex-html')),
      fontFamilyHead: (getComputedStyle(root).fontFamily.split(',')[0] ?? '')
        .replace(/"/g, '')
        .trim(),
      scrollWidth: box.scrollWidth,
      clientWidth: box.clientWidth,
      tabIndex: box.tabIndex,
      role: box.getAttribute('role'),
      accessibleName: ariaName(box),
      viewportOverflowPx: round(
        Math.max(0, rect.right - window.innerWidth, -rect.left),
      ),
    };
  });

  /**
   * Every box a reader can scroll, or tab into, that is not a control.
   *
   * Two independent conditions, and neither is the property being asserted:
   * a box joins because its computed overflow scrolls and its content is
   * wider than its visible width, or because it takes keyboard focus while
   * being no control at all. A box that is unreachable joins on the first,
   * a box that is anonymous joins on the second, and a collector that
   * admitted only reachable named boxes would have neither in its
   * population. Native controls are excluded because their name comes from
   * their content and their role from their tag.
   */
  const CONTROL_SELECTOR =
    'a[href], button, input, select, textarea, summary, [contenteditable], [role="button"], [role="link"], [role="tab"]';
  const scrollRegions = Array.from(
    document.querySelectorAll<HTMLElement>('body *'),
  )
    .filter((element) => {
      if (element.matches(CONTROL_SELECTOR)) return false;
      const overflowX = getComputedStyle(element).overflowX;
      const scrolls =
        (overflowX === 'auto' || overflowX === 'scroll') &&
        element.scrollWidth > element.clientWidth + 1;
      return scrolls || element.tabIndex >= 0;
    })
    .map((element, index) => {
      const start = element.scrollLeft;
      element.scrollLeft = start + 40;
      const scrolledBy = element.scrollLeft - start;
      element.scrollLeft = start;
      const holds = (selector: string) =>
        element.matches(selector) || element.querySelector(selector) !== null;
      return {
        index,
        kind: holds('table')
          ? ('table' as const)
          : holds('.katex, .katex-error')
          ? ('math' as const)
          : element.tagName === 'PRE' || holds('pre, code')
          ? ('code' as const)
          : ('other' as const),
        outline: `<${element.tagName.toLowerCase()}${
          element.className && typeof element.className === 'string'
            ? ` class="${element.className.slice(0, 60)}"`
            : ''
        }>`,
        role: element.getAttribute('role'),
        accessibleName: ariaName(element),
        tabIndex: element.tabIndex,
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        scrolledBy: round(scrolledBy),
      };
    });

  // The measure the sheet actually sets, read the way VAL-B2-ART-002 reads
  // it: the widest running paragraph, divided by the advance of its own `0`.
  const paragraphs = Array.from(
    document.querySelectorAll<HTMLParagraphElement>('[data-prose-column] p'),
  ).filter(
    (p) =>
      !p.closest('[data-brand-surface-id]') && !p.closest('figure, table, aside'),
  );
  const widest = paragraphs.reduce<HTMLParagraphElement | null>(
    (best, candidate) =>
      best === null ||
      candidate.getBoundingClientRect().width > best.getBoundingClientRect().width
        ? candidate
        : best,
    null,
  );
  let zeroAdvancePx = 0;
  if (widest) {
    const style = getComputedStyle(widest);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (context) {
      context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      zeroAdvancePx = round(context.measureText('0').width);
    }
  }

  return {
    viewportWidth: window.innerWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
    rootOverflowX: getComputedStyle(document.documentElement).overflowX,
    bodyOverflowX: getComputedStyle(document.body).overflowX,
    proseWidthPx: widest ? round(widest.getBoundingClientRect().width) : 0,
    zeroAdvancePx,
    visibleTextLength: (document.body.innerText ?? '').trim().length,
    tables,
    equations,
    scrollRegions,
  };
}

test.describe('brand-v2 article tables, code, math and wide layouts', () => {
  test('records every table and equation every published article renders, at both widths', async ({
    page,
    staticBase,
  }) => {
    test.setTimeout(300_000);
    const routes = tableMathRoutes();
    const observations: TableMathRouteObservation[] = [];

    for (const viewport of TABLE_MATH_VIEWPORTS) {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      for (const route of routes) {
        const response = await page.goto(`${staticBase}${route}`);
        expect(response?.status(), route).toBe(200);
        await page.evaluate(() => document.fonts.ready);
        // A table's own width depends on the face its cells are set in, and
        // `transition-colors` covers nothing here, but the KaTeX font swap
        // does move an equation's box, so settle a frame before measuring.
        await page.evaluate(
          () =>
            new Promise((resolve) => requestAnimationFrame(() => resolve(null))),
        );
        observations.push({
          ...(await page.evaluate(collectTablesAndMath)),
          route,
          viewport: viewport.id,
        });
      }
    }

    const artifact = {
      version: 1 as const,
      fingerprint: tableMathEvidenceFingerprint({ root: ROOT }),
      viewports: TABLE_MATH_VIEWPORTS.map(({ id }) => id),
      routes,
      observations,
    };

    // Enforced here as well as in the generator, so a table or an equation
    // that regressed fails the suite that measured it and not only the
    // artifact check.
    const evidence = readTableMathEvidence({
      artifact,
      fingerprint: artifact.fingerprint,
      root: ROOT,
    });

    for (const [label, verdicts] of [
      ['VAL-B2-ART-007 equation accessibility', equationAccessibilityVerdicts(evidence)],
      ['VAL-B2-ART-008 table containment', tableContainmentVerdicts(evidence)],
      ['scrollable regions are keyboard reachable and labelled', scrollRegionVerdicts(evidence)],
    ] as const) {
      const failures = [...verdicts.values()]
        .flatMap(({ failures: own }) => own)
        .sort();
      expect(failures.slice(0, 12), label).toEqual([]);
    }

    const artifactPath = join(ROOT, TABLE_MATH_EVIDENCE_PATH);
    mkdirSync(dirname(artifactPath), { recursive: true });
    writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
  });
});

/**
 * The sample module carries every dense surface at once: a fenced Python
 * block, inline and display math, two interactives and a data table. Four
 * contract rows are decided on it and none of them had a spec that named it.
 */
const SAMPLE_ROUTE = '/manipulation/action-chunking/';

test.describe('brand-v2 dense surfaces on the sample module', () => {
  test('code blocks are highlighted, mono, bordered and scroll in their own box (VAL-NAV-023)', async ({
    page,
    staticBase,
  }) => {
    await page.goto(`${staticBase}${SAMPLE_ROUTE}`);
    await page.evaluate(() => document.fonts.ready);

    const blocks = await page.evaluate(() =>
      Array.from(
        document.querySelectorAll<HTMLElement>('[data-prose-column] pre'),
      ).map((pre) => {
        const style = getComputedStyle(pre);
        const labelledBy = pre.getAttribute('aria-labelledby');
        return {
          text: (pre.textContent ?? '').trim(),
          fontFamily: style.fontFamily,
          overflowX: style.overflowX,
          borderWidth: Number.parseFloat(style.borderTopWidth) || 0,
          tabIndex: pre.tabIndex,
          role: pre.getAttribute('role'),
          accessibleName: labelledBy
            ? (
                labelledBy
                  .split(/\s+/)
                  .map((id) => document.getElementById(id)?.textContent ?? '')
                  .join(' ') ?? ''
              ).trim()
            : (pre.getAttribute('aria-label') ?? '').trim(),
          tokenColours: Array.from(
            new Set(
              Array.from(pre.querySelectorAll('span')).map(
                (span) => getComputedStyle(span).color,
              ),
            ),
          ).length,
        };
      }),
    );

    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      expect(block.text.length).toBeGreaterThan(0);
      expect(block.fontFamily).toMatch(/mono/i);
      expect(block.overflowX).toBe('auto');
      expect(block.borderWidth).toBeGreaterThan(0);
      // A box that scrolls has to be reachable, and a box a keyboard reader
      // lands on has to say what it holds. The sample's own title bar is
      // the name, so the reader who reaches the box and the reader who
      // reads the caption hear the same filename.
      expect(block.tabIndex).toBe(0);
      expect(block.role).toBe('region');
      expect(block.accessibleName.length).toBeGreaterThan(0);
      // "Syntax highlighting applied" is exactly this: the tokens are not
      // all one colour. A single colour means the highlighter never ran.
      expect(block.tokenColours).toBeGreaterThan(1);
    }

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('math is typeset, error-free, and shows no raw TeX (VAL-NAV-024)', async ({
    page,
    staticBase,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    await page.goto(`${staticBase}${SAMPLE_ROUTE}`);
    await page.evaluate(() => document.fonts.ready);

    const math = await page.evaluate(() => {
      // Everything a reader meets EXCEPT the typeset expressions, whose own
      // MathML annotation legitimately holds the TeX source. Reading the
      // whole column would report a correctly typeset page as leaking.
      const column = document
        .querySelector<HTMLElement>('[data-prose-column]')
        ?.cloneNode(true) as HTMLElement | undefined;
      for (const katex of column?.querySelectorAll('.katex') ?? []) {
        katex.remove();
      }
      return {
        typeset: document.querySelectorAll('.katex').length,
        displays: document.querySelectorAll('.katex-display').length,
        errors: document.querySelectorAll('.katex-error').length,
        proseText: (column?.textContent ?? '').replace(/\s+/g, ' '),
      };
    });
    expect(math.proseText.length).toBeGreaterThan(0);

    expect(math.typeset).toBeGreaterThan(0);
    expect(math.displays).toBeGreaterThan(0);
    expect(math.errors).toBe(0);
    // The two forms that survive a broken pipeline: display delimiters left
    // in place, and a control sequence sitting in text because it was never
    // typeset. KaTeX renders neither.
    expect(math.proseText).not.toContain('$$');
    expect(math.proseText).not.toMatch(/\\frac|\\begin\{|\\sum_|\\int_/);
    expect(consoleErrors).toEqual([]);
  });

  test('the embedded interactives are deterministic, operable and resettable (VAL-NAV-025)', async ({
    page,
    staticBase,
  }) => {
    await page.goto(`${staticBase}${SAMPLE_ROUTE}`);
    await page.evaluate(() => document.fonts.ready);

    // Read through `textContent`, not `innerText`: the article is long
    // enough that a mount far down the page sits in a subtree Chromium has
    // not laid out, and `innerText` reports that as the empty string, which
    // would read as a broken interactive rather than an unrendered one.
    const text = async (locator: Locator) =>
      ((await locator.textContent()) ?? '').trim();
    const readout = page.getByTestId('chunk-success-readout');
    const decisions = page.getByTestId('chunk-decisions-readout');
    const initial = await text(readout);
    const initialDecisions = await text(decisions);
    expect(initial.length).toBeGreaterThan(0);

    // Deterministic on load: the same document reloaded opens on the same
    // numbers, so nothing in the mount is seeded from the clock.
    await page.reload();
    await page.evaluate(() => document.fonts.ready);
    expect(await text(readout)).toBe(initial);

    // Every control on the page is named. An unnamed slider is a slider only
    // a sighted pointer user can operate. All five naming mechanisms count:
    // an anonymous radio inside a `<label>` wrapper is named, and reading
    // only `innerText` would report a plain text button as anonymous because
    // headless Chromium returns '' for it.
    const unnamed = await page.evaluate(() =>
      Array.from(
        document.querySelectorAll<HTMLElement>(
          '[data-prose-column] input, [data-prose-column] button, [data-prose-column] select',
        ),
      )
        .filter((control) => {
          const attribute = (name: string) =>
            (control.getAttribute(name) ?? '').trim().length > 0;
          const named =
            attribute('aria-label') ||
            attribute('aria-labelledby') ||
            attribute('title') ||
            (control.textContent ?? '').trim().length > 0 ||
            control.closest('label') !== null ||
            (control.id.length > 0 &&
              document.querySelector(
                `label[for="${CSS.escape(control.id)}"]`,
              ) !== null);
          return !named;
        })
        .map((control) => control.outerHTML.slice(0, 120)),
    );
    expect(unnamed).toEqual([]);

    // Keyboard operability is the control moving, and the readout responding
    // is a separate fact: the decision count is a ceiling over the chunk
    // size, so a one-step nudge can legitimately leave it unchanged. Asking
    // one assertion to carry both would report a working slider as broken.
    const slider = page.locator('#csc-chunk-size');
    const initialChunk = await slider.inputValue();
    await slider.focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => slider.inputValue()).not.toBe(initialChunk);

    await setSlider(slider, Number(await slider.getAttribute('max')));
    await expect.poll(async () => text(decisions)).not.toBe(initialDecisions);

    // The article mounts the latency interactive twice, so the slider, the
    // readout and the reset all have to be taken from ONE surface: driving a
    // control in one mount and reading the other would pass whatever either
    // does. The first mount opens at zero delay, where the readout still has
    // room to move; the second opens already saturated.
    const latencyMount = page
      .locator('[data-brand-surface-id]')
      .filter({ has: page.getByTestId('te-throughput-readout') })
      .first();
    const throughput = latencyMount.getByTestId('te-throughput-readout');
    const initialThroughput = await text(throughput);
    expect(initialThroughput.length).toBeGreaterThan(0);
    await setSlider(latencyMount.locator('input[type="range"]').first(), 200);
    await expect.poll(() => text(throughput)).not.toBe(initialThroughput);

    await latencyMount.getByRole('button', { name: 'Reset' }).click();
    await expect.poll(() => text(throughput)).toBe(initialThroughput);
  });

  test('several interactives share a page without overlapping or shifting it (VAL-CROSS-016)', async ({
    page,
    staticBase,
  }) => {
    await page.goto(`${staticBase}${SAMPLE_ROUTE}`);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => resolve(null))),
    );

    // An interactive is its surface, not its chart: one mount can draw two
    // described SVGs inside a single box, and comparing charts would report
    // that box as overlapping itself. Deriving the surfaces from the
    // rendered document means a third mount added tomorrow joins this check
    // by itself.
    const boxes = await page.evaluate(() => {
      const surfaces = new Set<Element>();
      for (const svg of document.querySelectorAll<SVGElement>(
        '[data-prose-column] svg[role][aria-describedby], [data-prose-column] svg[role][aria-labelledby]',
      )) {
        const surface = svg.closest('[data-brand-surface-id]');
        if (surface) surfaces.add(surface);
      }
      return [...surfaces].map((surface) => {
        const box = surface.getBoundingClientRect();
        return {
          top: box.top + window.scrollY,
          bottom: box.bottom + window.scrollY,
          left: box.left,
          right: box.right,
        };
      });
    });
    expect(boxes.length).toBeGreaterThan(1);
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i];
        const b = boxes[j];
        const overlaps =
          a.left < b.right &&
          b.left < a.right &&
          a.top < b.bottom - 0.5 &&
          b.top < a.bottom - 0.5;
        expect(overlaps, `interactive ${i} overlaps interactive ${j}`).toBe(
          false,
        );
      }
    }

    // Settled geometry: nothing moves once the page has stopped loading, so
    // a reader who started reading does not have the paragraph pulled away.
    const before = await page.evaluate(
      () =>
        document
          .querySelector('[data-prose-column] p')
          ?.getBoundingClientRect().top ?? null,
    );
    await page.waitForTimeout(500);
    const after = await page.evaluate(
      () =>
        document
          .querySelector('[data-prose-column] p')
          ?.getBoundingClientRect().top ?? null,
    );
    expect(before).not.toBeNull();
    expect(after).toBeCloseTo(before as number, 1);

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
    ).toBeLessThanOrEqual(0);
  });
});
