import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BRAND_V2_DEEP_ROWS } from './brand-v2-runners.ts';

/**
 * The canonical responsive sweep widths, derived from the documents that
 * declare them instead of retyped beside each test. A locally retyped list is
 * how the Tektur role sweep came to call 375/768/1440 "the sealed base
 * viewports" while product authority declares a fourth width, leaving a
 * 1024-only override unmeasured.
 */
export type ResponsiveWidthDeclaration = {
  id: string;
  path: string;
  /** Selects the single declaring line inside that document. */
  locator: RegExp;
};

export const RESPONSIVE_WIDTH_DECLARATIONS: readonly ResponsiveWidthDeclaration[] =
  [
    {
      id: 'library/design-system.md#responsive-overflow',
      path: 'library/design-system.md',
      locator: /widths there is no unintended document overflow/,
    },
    {
      id: 'contract/design-integrity.md#VAL-B2-SHELL-009',
      path: 'contract/design-integrity.md',
      locator: /`VAL-B2-SHELL-009`/,
    },
    {
      id: 'contract/design-integrity.md#VAL-B2-A11Y-008',
      path: 'contract/design-integrity.md',
      locator: /`VAL-B2-A11Y-008`/,
    },
  ] as const;

/** A comma-separated run of pixel widths, with or without the `px` suffix. */
const WIDTH_RUN = /\d{3,4}(?:px)?(?:,\s*(?:and\s+)?\d{3,4}(?:px)?)+/g;

export type ResponsiveViewport = {
  /** Stable label for failure messages: the width is the declared axis. */
  id: string;
  width: number;
  height: number;
};

export type SourceReader = (path: string) => string;

const readRepositorySource: SourceReader = (path) =>
  readFileSync(join(process.cwd(), path), 'utf8');

function widthsFromDeclaration(
  declaration: ResponsiveWidthDeclaration,
  read: SourceReader,
): number[] {
  const lines = read(declaration.path)
    .split('\n')
    .filter((line) => declaration.locator.test(line));
  if (lines.length !== 1) {
    throw new Error(
      `Responsive width declaration ${declaration.id} matched ${lines.length} lines; expected exactly one.`,
    );
  }
  const runs = lines[0].match(WIDTH_RUN) ?? [];
  if (runs.length !== 1) {
    throw new Error(
      `Responsive width declaration ${declaration.id} contains ${runs.length} width runs; expected exactly one.`,
    );
  }
  const widths = (runs[0].match(/\d{3,4}/g) ?? []).map(Number);
  if (widths.length < 2) {
    throw new Error(
      `Responsive width declaration ${declaration.id} yielded ${widths.length} widths; a sweep needs at least two.`,
    );
  }
  return [...new Set(widths)].sort((left, right) => left - right);
}

/**
 * Every declaring document must agree. Disagreement is a contract defect, not
 * something a consumer may resolve by picking one document.
 */
export function deriveResponsiveSweepWidths(
  read: SourceReader = readRepositorySource,
  declarations: readonly ResponsiveWidthDeclaration[] = RESPONSIVE_WIDTH_DECLARATIONS,
): number[] {
  if (declarations.length === 0) {
    throw new Error('No responsive width declarations to derive from.');
  }
  const derived = declarations.map((declaration) => ({
    id: declaration.id,
    widths: widthsFromDeclaration(declaration, read),
  }));
  const [first, ...rest] = derived;
  for (const other of rest) {
    if (other.widths.join(',') !== first.widths.join(',')) {
      throw new Error(
        `Responsive sweep widths disagree: ${first.id} declares [${first.widths.join(', ')}] and ${other.id} declares [${other.widths.join(', ')}].`,
      );
    }
  }
  return first.widths;
}

/**
 * The declared axis is the width; the height comes from the sealed browser
 * evidence matrix so that no test invents one. The shortest declared height
 * for a width is used, because it is the strictest for vertical layout and
 * stays deterministic if the matrix later gains another row at that width.
 */
export function deriveResponsiveViewports(
  read: SourceReader = readRepositorySource,
  declarations: readonly ResponsiveWidthDeclaration[] = RESPONSIVE_WIDTH_DECLARATIONS,
): ResponsiveViewport[] {
  return deriveResponsiveSweepWidths(read, declarations).map((width) => {
    const heights = BRAND_V2_DEEP_ROWS.filter(
      (row) => row.viewport.width === width,
    ).map((row) => row.viewport.height);
    if (heights.length === 0) {
      throw new Error(
        `Declared sweep width ${width} has no viewport height in the brand-v2 evidence matrix.`,
      );
    }
    return {
      id: `${width}px`,
      width,
      height: Math.min(...heights),
    };
  });
}

export const BRAND_V2_RESPONSIVE_VIEWPORTS: ResponsiveViewport[] =
  deriveResponsiveViewports();
