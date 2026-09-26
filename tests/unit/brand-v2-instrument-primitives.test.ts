import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import registry from '../../contract/brand-v2-registries.json';

/**
 * The interactive-state plan derives each mount's bounded case set from the
 * interactive's OWN source text: a literal `<button`, a `type="range"`, a
 * literal `reset`. Shared instrument primitives move that markup into
 * `components/ui/instrument.tsx`, so the derivation must see controls
 * rendered through the primitives each interactive mounts. This test pins
 * that contract: an interactive that mounts an instrument control primitive
 * still derives the control-shaped cases (hover, reset) its rendered DOM
 * actually exposes, so shared chrome cannot silently shrink the measured
 * population.
 */

const INTERACTIVE_DIR = join(process.cwd(), 'components', 'interactive');

/** Instrument primitives arrive via the barrel or the module itself. */
const INSTRUMENT_IMPORT =
  /import\s+\{[^}]*\}\s+from\s+['"]@\/components\/ui(?:\/instrument)?['"]/;
/** The one instrument primitive that renders a native control. */
const RESET_MOUNT = /<InstrumentReset\b/;

type SourceRow = {
  component: string;
  sourcePath: string;
  cases: Array<{ id: string; kind: string }>;
};

function registrySourceRows(): SourceRow[] {
  const rows = (
    registry as unknown as {
      interactive: { sources: SourceRow[] };
    }
  ).interactive.sources;
  expect(rows.length).toBeGreaterThan(0);
  return rows;
}

/** Interactive files that mount shared instrument primitives. */
function instrumentMountingSources(): string[] {
  return readdirSync(INTERACTIVE_DIR).filter(
    (name) =>
      (name.endsWith('.tsx') || name.endsWith('.ts')) &&
      INSTRUMENT_IMPORT.test(
        readFileSync(join(INTERACTIVE_DIR, name), 'utf8'),
      ),
  );
}

describe('instrument primitives in the interactive-state plan', () => {
  it('has a non-empty population of interactives mounting instrument primitives', () => {
    expect(instrumentMountingSources().length).toBeGreaterThan(0);
  });

  it('keeps control-shaped cases for every interactive that mounts them', () => {
    const rows = registrySourceRows();
    const bySourcePath = new Map(rows.map((row) => [row.sourcePath, row]));
    const mounters = instrumentMountingSources();
    expect(mounters.length).toBeGreaterThan(0);
    for (const name of mounters) {
      const text = readFileSync(join(INTERACTIVE_DIR, name), 'utf8');
      const row = bySourcePath.get(`components/interactive/${name}`);
      expect(row, `components/interactive/${name} resolves to a registry source row`).toBeTruthy();
      const caseIds = row!.cases.map(({ id }) => id);
      // A fully static instrument mounts the family without a reset; the
      // reset case belongs to interactives that mount the reset primitive
      // or name their own reset action.
      if (RESET_MOUNT.test(text) || /\breset\b/i.test(text)) {
        expect(
          caseIds,
          `${row!.component} keeps its reset case through the shared reset primitive`,
        ).toContain('reset');
      }
      if (RESET_MOUNT.test(text) || /<button\b/.test(text)) {
        expect(
          caseIds,
          `${row!.component} keeps its hover case through the shared reset primitive`,
        ).toContain('meaningful-hover');
      }
    }
  });
});
