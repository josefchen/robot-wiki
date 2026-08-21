import { expect, test, type Locator, type Page } from '@playwright/test';
import { publishedModules } from '../../data/modules';

/**
 * Answer-feedback contract (VAL-EDU-042, 043, 044) over every prediction
 * step and every self-check.
 *
 * Population is DERIVED from the module registry, never a route list
 * typed here, so a region added on any published route is graded rather
 * than skipped. The per-kind counts at the end are the drift guard, and
 * they are computed from the derived walk, so read them as "the corpus
 * has not changed shape", not as proof the walk was complete: the walk's
 * completeness comes from the registry, not from the totals.
 *
 * The contract's definitions, implemented verbatim below:
 * - Colour channel: a computed color/border-color/background-color/
 *   outline-color/box-shadow colour on a row or a descendant resolving
 *   to --color-ok, parsed RGB, per-component tolerance 2.
 * - Non-colour channel: (i) a rendered marker with a non-empty
 *   accessible name no unmarked row carries, (ii) a font-weight at least
 *   200 units above every unmarked row, (iii) a painted edge where every
 *   unmarked row has none, (iv) a text-decoration-line where every
 *   unmarked row has none.
 * - Verdict word: an element inside a region whose WHOLE rendered text
 *   is a verdict. The word inside a reasoning sentence is fine and
 *   banning it would degrade the writing.
 */

const EXPECTED_PREDICT = 8;
const EXPECTED_SELF_CHECK = 6;

const VERDICT =
  /^\s*(correct|incorrect|wrong|right|nice|well done|good job|try again|yes|no|✓|✗|✔|✘)\s*[.!]?\s*$/i;

interface RowStyle {
  reason: string;
  correct: boolean;
  selected: boolean;
  colours: string[];
  fontWeight: number;
  borderWidths: number[];
  boxShadow: string;
  textDecorationLine: string;
  /** Accessible names of marker elements the row owns. */
  markers: string[];
}

/** Rendered rows of one region, with every property the clauses read. */
async function readRows(region: Locator): Promise<RowStyle[]> {
  return region.evaluate((root) => {
    const rows = Array.from(root.querySelectorAll('[data-reason]'));
    const COLOUR_PROPS = [
      'color',
      'borderTopColor',
      'borderRightColor',
      'borderBottomColor',
      'borderLeftColor',
      'backgroundColor',
      'outlineColor',
    ] as const;
    return rows.map((row) => {
      const el = row as HTMLElement;
      const cs = getComputedStyle(el);
      const colours: string[] = [];
      // The row and every descendant it owns: a marking applied to the
      // label span is the row's marking.
      for (const node of [el, ...Array.from(el.querySelectorAll('*'))]) {
        const ns = getComputedStyle(node as HTMLElement);
        for (const prop of COLOUR_PROPS) colours.push(ns[prop]);
        if (ns.boxShadow !== 'none') colours.push(ns.boxShadow);
      }
      const markers = Array.from(el.querySelectorAll('[data-pick-marker]'))
        .map((m) => (m as HTMLElement).innerText.trim())
        .filter((t) => t.length > 0);
      return {
        reason: el.dataset.reason ?? '',
        correct: el.dataset.correct === 'true',
        selected: el.dataset.selected === 'true',
        colours,
        fontWeight: Math.max(
          ...[el, ...Array.from(el.querySelectorAll('*'))].map((n) =>
            parseFloat(getComputedStyle(n as HTMLElement).fontWeight),
          ),
        ),
        borderWidths: [
          parseFloat(cs.borderTopWidth),
          parseFloat(cs.borderRightWidth),
          parseFloat(cs.borderBottomWidth),
          parseFloat(cs.borderLeftWidth),
        ],
        boxShadow: cs.boxShadow,
        textDecorationLine: cs.textDecorationLine,
        markers,
      };
    });
  });
}

function parseRgb(value: string): [number, number, number] | null {
  const m = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** Per-component tolerance 2, per the contract's colour-channel rule. */
function matchesToken(value: string, token: [number, number, number]): boolean {
  // A box-shadow string can carry its colour anywhere in the value.
  const found = value.match(/rgba?\([^)]*\)/g) ?? [value];
  return found.some((part) => {
    const rgb = parseRgb(part);
    return (
      rgb != null && rgb.every((c, i) => Math.abs(c - token[i]) <= 2)
    );
  });
}

function hueSat(value: string): { hue: number; sat: number } | null {
  const rgb = parseRgb(value);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let hue = 0;
  if (d !== 0) {
    if (max === r) hue = 60 * (((g - b) / d) % 6);
    else if (max === g) hue = 60 * ((b - r) / d + 2);
    else hue = 60 * ((r - g) / d + 4);
  }
  return { hue: (hue + 360) % 360, sat: sat * 100 };
}

/** Which non-colour channel (clause letter) distinguishes this row. */
function nonColourChannel(row: RowStyle, unmarked: RowStyle[]): string | null {
  const unmarkedMarkers = new Set(unmarked.flatMap((u) => u.markers));
  if (row.markers.some((m) => !unmarkedMarkers.has(m))) return 'i:marker';
  if (unmarked.every((u) => row.fontWeight - u.fontWeight >= 200)) {
    return 'ii:font-weight';
  }
  for (let side = 0; side < 4; side += 1) {
    if (
      row.borderWidths[side] >= 1 &&
      unmarked.every((u) => u.borderWidths[side] < 1)
    ) {
      return 'iii:border';
    }
  }
  if (row.boxShadow !== 'none' && unmarked.every((u) => u.boxShadow === 'none')) {
    return 'iii:box-shadow';
  }
  if (
    row.textDecorationLine !== 'none' &&
    unmarked.every((u) => u.textDecorationLine === 'none')
  ) {
    return 'iv:text-decoration';
  }
  return null;
}

async function scanVerdicts(region: Locator): Promise<string[]> {
  const texts = await region.evaluate((root) =>
    Array.from(root.querySelectorAll('*'))
      .map((el) => (el as HTMLElement).innerText ?? '')
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && t.length <= 24),
  );
  return texts.filter((t) => VERDICT.test(t));
}

/** The resolved --color-ok value, read from the document, not a literal. */
async function okToken(page: Page): Promise<[number, number, number]> {
  const raw = await page.evaluate(() => {
    const probe = document.createElement('span');
    probe.style.color = 'var(--color-ok)';
    document.body.appendChild(probe);
    const resolved = getComputedStyle(probe).color;
    probe.remove();
    return resolved;
  });
  const rgb = parseRgb(raw);
  expect(rgb, `--color-ok did not resolve to an rgb colour: ${raw}`).not.toBeNull();
  return rgb!;
}

interface Region {
  route: string;
  kind: 'predict' | 'self-check';
  index: number;
}

/** Every region in the corpus, derived from the module registry. */
async function derivedRegions(page: Page): Promise<Region[]> {
  const routes = publishedModules().map((m) => `/${m.domain}/${m.slug}/`);
  expect(routes.length, 'no published routes derived from the registry').toBeGreaterThan(0);
  const out: Region[] = [];
  for (const route of routes) {
    await page.goto(route);
    const regions = page.locator('[data-predict], [data-self-check]');
    const count = await regions.count();
    for (let i = 0; i < count; i += 1) {
      const kind =
        (await regions.nth(i).getAttribute('data-predict')) === ''
          ? 'predict'
          : 'self-check';
      out.push({ route, kind, index: i });
    }
  }
  return out;
}

test.describe('answer feedback (VAL-EDU-042/043/044)', () => {
  test('the derived corpus is 8 prediction steps and 6 self-checks', async ({ page }) => {
    const regions = await derivedRegions(page);
    const predict = regions.filter((r) => r.kind === 'predict');
    const check = regions.filter((r) => r.kind === 'self-check');
    expect(predict, `prediction steps: ${predict.map((r) => r.route).join(', ')}`).toHaveLength(
      EXPECTED_PREDICT,
    );
    expect(check, `self-checks: ${check.map((r) => r.route).join(', ')}`).toHaveLength(
      EXPECTED_SELF_CHECK,
    );
    expect(new Set(regions.map((r) => r.route)).size).toBe(10);
  });

  test('VAL-EDU-042: a commit marks the correct option and the reader pick, in both directions', async ({
    page,
  }) => {
    const regions = await derivedRegions(page);
    const token = await okToken(page);
    let graded = 0;
    for (const { route, kind, index } of regions) {
      const where = `${route} ${kind}#${index}`;
      await page.goto(route);
      const region = page.locator('[data-predict], [data-self-check]').nth(index);
      const radios = region.locator('fieldset input[type="radio"]');
      const values = await radios.evaluateAll((els) =>
        els.map((e) => (e as HTMLInputElement).value),
      );
      const answer = await region
        .locator('[data-reason][data-correct="true"]')
        .getAttribute('data-reason');
      expect(answer, `${where}: no correct row`).toBeTruthy();

      for (const commit of [
        values.find((v) => v !== answer)!,
        answer!,
      ]) {
        await radios.nth(values.indexOf(commit)).check();
        await expect(region.locator('details[data-reveal]')).toHaveAttribute('open');
        const rows = await readRows(region);
        expect(rows, `${where}: expected 3 reasoning rows`).toHaveLength(3);

        // (a) exactly one of each marking, bound to the right values.
        const correctRows = rows.filter((r) => r.correct);
        const selectedRows = rows.filter((r) => r.selected);
        expect(correctRows, `${where}: data-correct count`).toHaveLength(1);
        expect(selectedRows, `${where}: data-selected count`).toHaveLength(1);
        expect(correctRows[0].reason).toBe(answer);
        expect(selectedRows[0].reason, `${where}: selection not bound to the radio`).toBe(
          commit,
        );

        const unmarked = rows.filter((r) => !r.correct && !r.selected);
        expect(unmarked.length, `${where}: no unmarked row to compare against`).toBeGreaterThan(0);

        // (b) the correct row carries a colour channel AND a non-colour one.
        const correctColour = correctRows[0].colours.some((c) =>
          matchesToken(c, token),
        );
        expect(correctColour, `${where}: correct row carries no ok-token colour`).toBe(true);
        const correctChannel = nonColourChannel(correctRows[0], unmarked);
        expect(
          correctChannel,
          `${where}: correct row carries no non-colour channel`,
        ).not.toBeNull();

        if (commit === answer) {
          // (e) both marks land on one row, still individually detectable.
          expect(correctRows[0].reason).toBe(selectedRows[0].reason);
          expect(
            correctRows[0].markers.length,
            `${where}: the selection marker vanished on a correct commit`,
          ).toBeGreaterThan(0);
          expect(correctColour).toBe(true);
        } else {
          // (c) the selection row is distinguishable from an unmarked row,
          // by a DIFFERENT non-colour channel than the correct row's.
          const selChannel = nonColourChannel(selectedRows[0], unmarked);
          expect(
            selChannel,
            `${where}: selection row indistinguishable from an unmarked row`,
          ).not.toBeNull();
          expect(
            selChannel,
            `${where}: selection and correct rows share one non-colour channel`,
          ).not.toBe(correctChannel);

          // (d) neutral: no ok token, no green, no red above 25% sat.
          for (const colour of selectedRows[0].colours) {
            expect(
              matchesToken(colour, token),
              `${where}: ok token on the selection row (${colour})`,
            ).toBe(false);
            const hs = hueSat(colour);
            if (!hs || hs.sat <= 25) continue;
            const green = hs.hue >= 90 && hs.hue <= 150;
            const red = hs.hue >= 340 || hs.hue <= 20;
            expect(
              green || red,
              `${where}: green/red on the selection row (${colour}, hue ${hs.hue.toFixed(0)}, sat ${hs.sat.toFixed(0)}%)`,
            ).toBe(false);
          }
        }
      }
      graded += 1;
    }
    expect(graded).toBe(EXPECTED_PREDICT + EXPECTED_SELF_CHECK);
  });

  test('VAL-EDU-043: the mark survives forced colours, and no verdict word is rendered', async ({
    page,
  }) => {
    const regions = await derivedRegions(page);
    let graded = 0;
    for (const { route, kind, index } of regions) {
      const where = `${route} ${kind}#${index}`;
      // (b) verdict scan across all four states, before forcing colours.
      await page.goto(route);
      const region = page.locator('[data-predict], [data-self-check]').nth(index);
      expect(await scanVerdicts(region), `${where}: verdict, unanswered`).toEqual([]);
      const summary = region.locator('details[data-reveal] > summary');
      await summary.click();
      expect(await scanVerdicts(region), `${where}: verdict, declined`).toEqual([]);
      const radios = region.locator('fieldset input[type="radio"]');
      const values = await radios.evaluateAll((els) =>
        els.map((e) => (e as HTMLInputElement).value),
      );
      const answer = await region
        .locator('[data-reason][data-correct="true"]')
        .getAttribute('data-reason');
      await radios.nth(values.indexOf(values.find((v) => v !== answer)!)).check();
      expect(await scanVerdicts(region), `${where}: verdict, wrong commit`).toEqual([]);
      await radios.nth(values.indexOf(answer!)).check();
      expect(await scanVerdicts(region), `${where}: verdict, correct commit`).toEqual([]);

      // (a) forced colours: the non-colour channel still measures. The
      // custom colour is deliberately NOT asserted here, because forced
      // colours is entitled to drop it; that is the whole point.
      //
      // Measured in the DECLINED state, opened through the summary with
      // no option committed. A correct commit puts the reader's own pick
      // marker on the same row, and that marker would then satisfy the
      // clause on behalf of the correct-row marking: with the weight
      // step deleted as a plant, this test passed until it was scoped
      // this way. The correct row has to be identifiable on its own.
      await page.emulateMedia({ forcedColors: 'active' });
      await page.goto(route);
      const forced = page.locator('[data-predict], [data-self-check]').nth(index);
      await forced.locator('details[data-reveal] > summary').click();
      const rows = await readRows(forced);
      expect(
        rows.flatMap((r) => r.markers),
        `${where}: a pick marker in the declined state under forced colours`,
      ).toEqual([]);
      const correctRow = rows.find((r) => r.correct)!;
      const unmarked = rows.filter((r) => !r.correct && !r.selected);
      const channel = nonColourChannel(correctRow, unmarked);
      expect(
        channel,
        `${where}: no non-colour channel survives forced colours`,
      ).not.toBeNull();
      await page.emulateMedia({ forcedColors: null });
      graded += 1;
    }
    expect(graded).toBe(EXPECTED_PREDICT + EXPECTED_SELF_CHECK);
  });

  test('VAL-EDU-044: nothing is marked before a commit, and the declined state needs no script', async ({
    page,
    browser,
  }) => {
    const regions = await derivedRegions(page);
    for (const { route, kind, index } of regions) {
      const where = `${route} ${kind}#${index}`;
      await page.goto(route);
      const region = page.locator('[data-predict], [data-self-check]').nth(index);
      const reveal = region.locator('details[data-reveal]');

      // (a) closed on load, so no marking is rendered even though the
      // correct row's attribute is present in the served markup.
      await expect(reveal).not.toHaveAttribute('open');
      // Chromium hides a closed disclosure with content-visibility, not
      // display:none, so the rows keep a layout box and an offsetParent
      // while never being painted. checkVisibility and innerText are the
      // properties that see this, and they are the ones the contract
      // names ("out of the accessibility tree and out of innerText").
      const visibleBefore = await region.evaluate((root) => {
        const rows = Array.from(root.querySelectorAll('[data-reason]')) as HTMLElement[];
        return rows.filter(
          (r) => r.checkVisibility() || r.innerText.trim().length > 0,
        ).length;
      });
      expect(visibleBefore, `${where}: reasoning rendered before a commit`).toBe(0);
      const selectedBefore = await region.locator('[data-reason][data-selected]').count();
      expect(selectedBefore, `${where}: a selection mark before any commit`).toBe(0);

      // (b) declined: the correct row is marked, nothing is selected.
      await region.locator('details[data-reveal] > summary').click();
      const rows = await readRows(region);
      expect(rows.filter((r) => r.selected), `${where}: selection mark in the declined state`).toHaveLength(0);
      expect(rows.filter((r) => r.correct), `${where}: correct row unmarked when declined`).toHaveLength(1);
      expect(
        rows.flatMap((r) => r.markers),
        `${where}: a pick marker in the declined state`,
      ).toEqual([]);
    }

    // (c) the same declined state with no script at all: the marking is
    // CSS driven off data-correct, not applied by a hydration effect.
    const context = await browser.newContext({ javaScriptEnabled: false });
    const noJs = await context.newPage();
    const token = await (async () => {
      await noJs.goto(regions[0].route);
      return okToken(noJs);
    })();
    for (const { route, kind, index } of regions) {
      const where = `${route} ${kind}#${index} (no JS)`;
      await noJs.goto(route);
      const region = noJs.locator('[data-predict], [data-self-check]').nth(index);
      await region.locator('details[data-reveal] > summary').click();
      const rows = await readRows(region);
      const correctRow = rows.find((r) => r.correct);
      expect(correctRow, `${where}: no correct row`).toBeTruthy();
      expect(
        correctRow!.colours.some((c) => matchesToken(c, token)),
        `${where}: the ok-token colour needs script`,
      ).toBe(true);
      const unmarked = rows.filter((r) => !r.correct);
      expect(
        nonColourChannel(correctRow!, unmarked),
        `${where}: the non-colour channel needs script`,
      ).not.toBeNull();
      expect(rows.filter((r) => r.selected), `${where}: a selection mark`).toHaveLength(0);
    }
    await context.close();
  });
});
