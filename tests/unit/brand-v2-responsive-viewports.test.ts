import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BRAND_V2_DEEP_ROWS } from '../../lib/brand-v2-runners';
import {
  RESPONSIVE_WIDTH_DECLARATIONS,
  deriveResponsiveSweepWidths,
  deriveResponsiveViewports,
} from '../../lib/brand-v2-responsive-viewports';

const read = (path: string) =>
  readFileSync(join(process.cwd(), path), 'utf8');

/**
 * A second, deliberately different extraction: drop the backticked assertion
 * id, then scan every three-or-four digit token on the declaring line. It has
 * no shared code with the production run regex, so a parser that silently
 * dropped a width would disagree with it.
 */
function widthsByIndependentScan(path: string, locator: RegExp): number[] {
  const lines = read(path)
    .split('\n')
    .filter((line) => locator.test(line));
  expect(lines).toHaveLength(1);
  const scanned = (lines[0].replace(/`[^`]*`/g, '').match(/\d{3,4}/g) ?? []).map(
    Number,
  );
  return [...new Set(scanned)].sort((left, right) => left - right);
}

describe('brand-v2 canonical responsive sweep widths', () => {
  it('derives one agreed width population from every declaring document', () => {
    const widths = deriveResponsiveSweepWidths();
    expect(widths.length).toBeGreaterThan(1);
    expect(RESPONSIVE_WIDTH_DECLARATIONS.length).toBeGreaterThan(1);
    for (const declaration of RESPONSIVE_WIDTH_DECLARATIONS) {
      expect(
        widthsByIndependentScan(declaration.path, declaration.locator),
        `${declaration.id} declares a different sweep population`,
      ).toEqual(widths);
    }
  });

  it('fails when two declaring documents disagree', () => {
    const [target] = RESPONSIVE_WIDTH_DECLARATIONS;
    const dropped = deriveResponsiveSweepWidths().at(-2);
    expect(dropped).toBeDefined();
    const divergent = (path: string) => {
      const text = read(path);
      if (path !== target.path) return text;
      return text
        .split('\n')
        .map((line) =>
          target.locator.test(line)
            ? line.replace(new RegExp(`${dropped}px,\\s*`), '')
            : line,
        )
        .join('\n');
    };
    expect(() => deriveResponsiveSweepWidths(divergent)).toThrow(
      /Responsive sweep widths disagree/,
    );
  });

  it('fails when a declaring line stops declaring a width run', () => {
    const emptied = (path: string) =>
      RESPONSIVE_WIDTH_DECLARATIONS.some(
        (declaration) => declaration.path === path,
      )
        ? read(path).replace(/\d{3,4}px/g, 'the standard widths')
        : read(path);
    expect(() => deriveResponsiveSweepWidths(emptied)).toThrow(
      /width runs; expected exactly one|matched 0 lines/,
    );
  });

  it('gives every declared width a height from the sealed evidence matrix', () => {
    const viewports = deriveResponsiveViewports();
    expect(viewports.map(({ width }) => width)).toEqual(
      deriveResponsiveSweepWidths(),
    );
    for (const viewport of viewports) {
      const declaredHeights = BRAND_V2_DEEP_ROWS.filter(
        (row) => row.viewport.width === viewport.width,
      ).map((row) => row.viewport.height);
      expect(declaredHeights.length).toBeGreaterThan(0);
      expect(declaredHeights).toContain(viewport.height);
      expect(viewport.height).toBe(Math.min(...declaredHeights));
      expect(viewport.id).toBe(`${viewport.width}px`);
    }
  });
});
