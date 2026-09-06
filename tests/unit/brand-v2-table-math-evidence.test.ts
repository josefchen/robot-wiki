import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  TABLE_MATH_EVIDENCE_PATH,
  TABLE_MATH_DESKTOP_VIEWPORT_ID,
  TABLE_MATH_MOBILE_VIEWPORT_ID,
  equationAccessibilityVerdicts,
  equationOccurrenceMembers,
  mathSourceRoutes,
  readTableMathEvidence,
  tableContainmentVerdicts,
  tableMathEvidenceFingerprint,
  tableMathRoutes,
  tableOccurrenceMembers,
  type EquationObservation,
  type TableMathEvidence,
  type TableObservation,
} from '@/lib/brand-v2-table-math-evidence';

/**
 * The dense-surface lane's own gate (VAL-B2-ART-007 and VAL-B2-ART-008).
 *
 * Both rows are decided entirely by this reader and these two verdict
 * functions: the generator refuses to write a red row, so a verdict that
 * always came back green would certify a table nobody can scroll and an
 * equation nobody can hear. Every case below plants one defect in a copy of
 * the committed sweep and asserts the refusal, one clause at a time.
 */

const ROOT = process.cwd();

const artifact = JSON.parse(
  readFileSync(join(ROOT, TABLE_MATH_EVIDENCE_PATH), 'utf8'),
) as TableMathEvidence;

const fingerprint = tableMathEvidenceFingerprint({ root: ROOT });

function evidence(): TableMathEvidence {
  return readTableMathEvidence({
    artifact: structuredClone(artifact),
    fingerprint,
    root: ROOT,
  });
}

function read(mutate: (copy: TableMathEvidence) => void): () => unknown {
  const copy = structuredClone(artifact);
  mutate(copy);
  return () =>
    readTableMathEvidence({ artifact: copy, fingerprint, root: ROOT });
}

/**
 * A rewrite applied past the reader.
 *
 * Several defects below are ones the reader refuses outright, and routing
 * them through it again would prove the reader twice and the verdict never.
 */
function withTable(
  match: (table: TableObservation, viewport: string) => boolean,
  patch: Partial<TableObservation>,
): TableMathEvidence {
  const copy = structuredClone(evidence());
  let touched = 0;
  for (const observation of copy.observations) {
    observation.tables = observation.tables.map((table) => {
      if (!match(table, observation.viewport)) return table;
      touched += 1;
      return { ...table, ...patch };
    });
  }
  expect(touched, 'the mutation matched no table').toBeGreaterThan(0);
  return copy;
}

function withEquation(
  match: (equation: EquationObservation) => boolean,
  patch: Partial<EquationObservation>,
): TableMathEvidence {
  const copy = structuredClone(evidence());
  let touched = 0;
  for (const observation of copy.observations) {
    observation.equations = observation.equations.map((equation) => {
      if (!match(equation)) return equation;
      touched += 1;
      return { ...equation, ...patch };
    });
  }
  expect(touched, 'the mutation matched no equation').toBeGreaterThan(0);
  return copy;
}

function failuresOf(verdicts: Map<string, { failures: string[] }>): string[] {
  return [...verdicts.values()].flatMap(({ failures }) => failures);
}

/** A table that really scrolls somewhere, which is where the clauses bind. */
const scrolls = (table: TableObservation) =>
  table.scrollContainer !== null &&
  table.scrollContainer.scrollWidth > table.scrollContainer.clientWidth + 1;

describe('the committed dense-surface sweep', () => {
  it('is the sweep this tree needs, and every rendered occurrence passes on it', () => {
    const current = evidence();
    expect(current.routes).toEqual(tableMathRoutes());
    expect(failuresOf(equationAccessibilityVerdicts(current))).toEqual([]);
    expect(failuresOf(tableContainmentVerdicts(current))).toEqual([]);
  });

  it('quantifies each row over occurrences rather than over routes', () => {
    const current = evidence();
    const tables = tableOccurrenceMembers(current);
    const equations = equationOccurrenceMembers(current);
    // The defect this lane was opened for was four tables on four routes
    // that scrolled without a tab stop only at 375px. A population of routes
    // could not name them, and a population of one width could not see them.
    expect(tables.length).toBeGreaterThan(current.routes.length);
    expect(equations.length).toBeGreaterThan(current.routes.length);
    for (const viewport of [
      TABLE_MATH_MOBILE_VIEWPORT_ID,
      TABLE_MATH_DESKTOP_VIEWPORT_ID,
    ]) {
      expect(
        tables.filter((id) => id.includes(`|${viewport}|`)).length,
      ).toBeGreaterThan(0);
      expect(
        equations.filter((id) => id.includes(`|${viewport}|`)).length,
      ).toBeGreaterThan(0);
    }
    expect(new Set(tables).size).toBe(tables.length);
    expect(new Set(equations).size).toBe(equations.length);
  });

  it('measures a table that actually scrolls, so the scroll clauses are not vacuous', () => {
    const scrolling = evidence()
      .observations.flatMap(({ tables }) => tables)
      .filter(scrolls);
    expect(scrolling.length).toBeGreaterThan(0);
    expect(scrolling.every(({ scrollContainer }) => scrollContainer!.scrolledBy > 0)).toBe(
      true,
    );
  });

  it('derives the routes that must render display math from the articles themselves', () => {
    const mathRoutes = mathSourceRoutes(ROOT);
    expect(mathRoutes.length).toBeGreaterThan(0);
    expect(mathRoutes.every((route) => tableMathRoutes().includes(route))).toBe(
      true,
    );
  });
});

describe('article table and math evidence', () => {
  it('refuses stale, incomplete, and vacuous dense-surface evidence', () => {
    expect(read((copy) => (copy.fingerprint = 'stale'))).toThrow(/stale/);
    expect(
      read((copy) => {
        copy.version = 2 as unknown as 1;
      }),
    ).toThrow(/version/);
    expect(read((copy) => copy.routes.pop())).toThrow(/module registry/);
    expect(read((copy) => copy.routes.push('/invented/route/'))).toThrow(
      /module registry/,
    );
    expect(read((copy) => (copy.viewports = ['1440x900']))).toThrow(/swept at/);
    expect(
      read((copy) => copy.observations.push(structuredClone(copy.observations[0]))),
    ).toThrow(/twice/);
    expect(read((copy) => copy.observations.splice(0, 1))).toThrow(/missing/);
    expect(
      read((copy) => {
        copy.observations[0].visibleTextLength = 0;
      }),
    ).toThrow(/empty page/);
    expect(
      read((copy) => {
        const mathRoute = mathSourceRoutes(ROOT)[0];
        for (const observation of copy.observations) {
          if (observation.route === mathRoute) observation.equations = [];
        }
      }),
    ).toThrow(
      /typesets 0 display equation\(s\) where its own MDX body opens \d+ display-math block\(s\)/,
    );
    expect(
      read((copy) => {
        for (const observation of copy.observations) observation.tables = [];
      }),
    ).toThrow(/no table anywhere/);
  });

  it('refuses to grade a population it emptied', () => {
    // Reachable only past the reader for equations, which stops a sweep that
    // found none at the earlier and more specific display-math check. The
    // guard still has to exist and bite: a verdict map over nothing is a row
    // that passes without measuring anything.
    const empty = structuredClone(evidence());
    for (const observation of empty.observations) {
      observation.tables = [];
      observation.equations = [];
    }
    expect(() => tableContainmentVerdicts(empty)).toThrow(/vacuously/);
    expect(() => equationAccessibilityVerdicts(empty)).toThrow(/vacuously/);
  });

  it('fails a table whose scrolling box no reader can reach or name', () => {
    // The shipped defect, restored: a comparison table inside an
    // `overflow-x-auto` div with tabIndex -1 and no role or label.
    expect(
      failuresOf(
        tableContainmentVerdicts(
          withTable(scrolls, {
            scrollContainer: {
              overflowX: 'auto',
              tabIndex: -1,
              role: null,
              accessibleName: '',
              clientWidth: 343,
              scrollWidth: 720,
              scrolledBy: 40,
            },
          }),
        ),
      ).join('\n'),
    ).toMatch(/unreachable without a pointer[\s\S]*scrolls inside an anonymous box/);
  });

  it('fails a container that reports overflow it cannot actually scroll', () => {
    expect(
      failuresOf(
        tableContainmentVerdicts(
          withTable(scrolls, {
            scrollContainer: {
              overflowX: 'auto',
              tabIndex: 0,
              role: 'region',
              accessibleName: 'A named table',
              clientWidth: 343,
              scrollWidth: 720,
              scrolledBy: 0,
            },
          }),
        ),
      ).join('\n'),
    ).toMatch(/did not move when it was scrolled/);
  });

  it('fails an unnamed table, a headerless table and an unscoped header', () => {
    const failures = failuresOf(
      tableContainmentVerdicts(
        withTable(() => true, {
          accessibleName: '  ',
          columnHeaders: 0,
          unscopedHeaders: 3,
        }),
      ),
    ).join('\n');
    expect(failures).toMatch(/unnamed table/);
    expect(failures).toMatch(/declares no column header/);
    expect(failures).toMatch(/without a scope/);
  });

  it('fails a sortable table that never reports which column is sorted', () => {
    expect(
      failuresOf(
        tableContainmentVerdicts(
          withTable((table) => table.sortButtons > 0, { sortedColumns: 0 }),
        ),
      ).join('\n'),
    ).toMatch(/reports no aria-sort/);
  });

  it('fails a table that widens the page instead of scrolling', () => {
    expect(
      failuresOf(
        tableContainmentVerdicts(
          withTable(() => true, {
            scrollContainer: null,
            tableWidth: 900,
            containerOverflowPx: 540,
          }),
        ),
      ).join('\n'),
    ).toMatch(/no scroll container, so it widens the page/);
  });

  it('fails a table that pushes its own container outside the viewport', () => {
    expect(
      failuresOf(
        tableContainmentVerdicts(
          withTable(scrolls, { viewportOverflowPx: 42 }),
        ),
      ).join('\n'),
    ).toMatch(/outside the .* viewport/);
  });

  it('fails a page that scrolls sideways, and a page that hides that it does', () => {
    const overflowing = structuredClone(evidence());
    overflowing.observations[0].documentScrollWidth =
      overflowing.observations[0].viewportWidth + 60;
    expect(failuresOf(tableContainmentVerdicts(overflowing)).join('\n')).toMatch(
      /scrolls .* horizontally/,
    );

    // The band-aid: clip the overflow at the root and the document reports a
    // clean width while the table still spills.
    const clipped = structuredClone(evidence());
    for (const observation of clipped.observations) {
      observation.rootOverflowX = 'hidden';
      observation.bodyOverflowX = 'clip';
    }
    const failures = failuresOf(tableContainmentVerdicts(clipped)).join('\n');
    expect(failures).toMatch(/sets root overflow-x to hidden/);
    expect(failures).toMatch(/sets body overflow-x to clip/);
  });

  it('fails a desktop reading column squeezed under the sealed measure', () => {
    const squeezed = structuredClone(evidence());
    for (const observation of squeezed.observations) {
      if (observation.viewport !== TABLE_MATH_DESKTOP_VIEWPORT_ID) continue;
      observation.proseWidthPx = observation.zeroAdvancePx * 40;
    }
    expect(failuresOf(tableContainmentVerdicts(squeezed)).join('\n')).toMatch(
      /under the .*ch readable floor/,
    );
  });

  it('leaves the measure clause to the width that seals it', () => {
    // The same squeeze at 375px is not a defect: the mobile column is
    // narrow by design, and charging it here would make ART-008 disagree
    // with the measure ART-002 actually seals.
    const narrow = structuredClone(evidence());
    for (const observation of narrow.observations) {
      if (observation.viewport !== TABLE_MATH_MOBILE_VIEWPORT_ID) continue;
      observation.proseWidthPx = observation.zeroAdvancePx * 30;
    }
    expect(failuresOf(tableContainmentVerdicts(narrow)).join('\n')).not.toMatch(
      /readable floor/,
    );
  });

  it('fails an equation with no MathML, no annotation, or an exposed glyph layer', () => {
    const failures = failuresOf(
      equationAccessibilityVerdicts(
        withEquation(() => true, {
          mathmlText: '   ',
          annotationTex: '',
          htmlLayerHidden: false,
        }),
      ),
    ).join('\n');
    expect(failures).toMatch(/emits no MathML/);
    expect(failures).toMatch(/no TeX annotation/);
    expect(failures).toMatch(/leaves its glyph layer exposed/);
  });

  it('fails an equation that rendered a parse error or leaked raw TeX', () => {
    const failures = failuresOf(
      equationAccessibilityVerdicts(
        withEquation(({ display }) => display, {
          renderError: true,
          renderedText: '$$\\frac{a}{b}$$',
        }),
      ),
    ).join('\n');
    expect(failures).toMatch(/rendered a KaTeX parse error/);
    expect(failures).toMatch(/shows raw TeX to the reader/);
  });

  it('fails an equation set in neither the math face nor the mono face', () => {
    expect(
      failuresOf(
        equationAccessibilityVerdicts(
          withEquation(() => true, { fontFamilyHead: 'Newsreader' }),
        ),
      ).join('\n'),
    ).toMatch(/neither the math face nor the mono face/);
  });

  it('fails a scrollable equation with no tab stop, and spares a narrow one', () => {
    expect(
      failuresOf(
        equationAccessibilityVerdicts(
          withEquation(({ display }) => display, {
            scrollWidth: 900,
            clientWidth: 343,
            tabIndex: -1,
          }),
        ),
      ).join('\n'),
    ).toMatch(/right-hand side is unreachable without a pointer/);

    // A narrow equation is not a scrollable region: demanding a tab stop
    // there would put hundreds of empty stops in the reading order.
    expect(
      failuresOf(
        equationAccessibilityVerdicts(
          withEquation(() => true, {
            scrollWidth: 200,
            clientWidth: 200,
            tabIndex: -1,
          }),
        ),
      ).join('\n'),
    ).not.toMatch(/unreachable without a pointer/);
  });

  it('fails an equation painted outside the viewport', () => {
    expect(
      failuresOf(
        equationAccessibilityVerdicts(
          withEquation(() => true, { viewportOverflowPx: 18 }),
        ),
      ).join('\n'),
    ).toMatch(/paints 18.0px outside/);
  });
});
