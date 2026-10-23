import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  classifyLegendText,
  classifyResolvedPaint,
  geometryClassOf,
  INTERACTIVE_DATA_CLASSIFICATION,
  nonColourDistinct,
  paintHex,
  RETIRED_PAINTS,
  STATUS_LABEL_VOCABULARY,
  tableSortCensus,
  tableSortKindOf,
  type MarkObservation,
} from '../../lib/brand-v2-interactive-data';

describe('brand-v2 interactive data: resolved paint classification', () => {
  const theme = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8');
  const token = (name: string) => {
    const value = new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6});`).exec(theme)?.[1];
    if (!value) throw new Error(`${name} is not declared as a hex in app/globals.css`);
    return value;
  };
  const rgb = (hex: string, alpha?: number) => {
    const [r, g, b] = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));
    return alpha === undefined ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  it('classifies the research-page accent as accent, solid and from a quarter opacity up', () => {
    expect(token('--color-signal')).toBe('#3B6EA8');
    expect(classifyResolvedPaint('rgb(59, 110, 168)')).toBe('accent');
    expect(classifyResolvedPaint('#3B6EA8')).toBe('accent');
    expect(classifyResolvedPaint(rgb('#3B6EA8', 0.25))).toBe('accent');
    expect(classifyResolvedPaint(rgb('#3B6EA8', 0.6))).toBe('accent');
    // A wash under a quarter opacity is scaffold, not a series paint.
    expect(classifyResolvedPaint(rgb('#3B6EA8', 0.13))).toBe('neutral');
  });

  it('reads every whitespace form the browser serialises the same way', () => {
    for (const form of [
      'rgb(59, 110, 168)',
      'rgb(59,110,168)',
      'rgb(59 110 168)',
      'rgba(59,110,168,0.5)',
      'rgba(59, 110, 168, 0.5)',
      'rgb(59 110 168 / 0.5)',
      ' rgb(59, 110, 168) ',
    ]) {
      expect(classifyResolvedPaint(form), form).toBe('accent');
    }
  });

  it('classifies the grayscale chart tones and the page grounds as neutral scaffold', () => {
    for (const name of [
      '--color-concrete',
      '--color-highlight',
      '--color-graphite',
      '--color-paper',
      '--color-white',
      '--color-surface-2',
    ]) {
      expect(classifyResolvedPaint(rgb(token(name))), name).toBe('neutral');
    }
    expect(classifyResolvedPaint('rgba(28, 28, 26, 0.14)')).toBe('neutral');
    expect(classifyResolvedPaint('rgba(28, 28, 26, 0.22)')).toBe('neutral');
    expect(classifyResolvedPaint('none')).toBe('neutral');
    expect(classifyResolvedPaint('transparent')).toBe('neutral');
  });

  it('classifies ink, the muted text tone and the outcome marks by their tokens', () => {
    expect(classifyResolvedPaint(rgb(token('--color-ink')))).toBe('text');
    expect(classifyResolvedPaint(rgb(token('--color-text-dim')))).toBe('text-dim');
    expect(classifyResolvedPaint(rgb(token('--color-ok')))).toBe('ok');
    expect(classifyResolvedPaint(rgb(token('--color-warn')))).toBe('warn');
    expect(classifyResolvedPaint(rgb(token('--color-error')))).toBe('error');
  });

  it('classifies each retired brand-v2 paint as retired at any opacity, never as accent', () => {
    expect(RETIRED_PAINTS).toEqual(['#C6FF19', '#245FFF', '#245EDB']);
    for (const hex of RETIRED_PAINTS) {
      expect(classifyResolvedPaint(rgb(hex)), hex).toBe('retired');
      expect(classifyResolvedPaint(rgb(hex, 0.1)), `${hex} at 10%`).toBe('retired');
      expect(classifyResolvedPaint(hex.toLowerCase()), hex).toBe('retired');
    }
    expect(classifyResolvedPaint('rgb(36,95,255)')).toBe('retired');
    expect(classifyResolvedPaint(rgb('#245FFF', 0))).toBe('neutral');
  });

  it('reads a color-mix() result in srgb units', () => {
    expect(paintHex('color(srgb 0.231373 0.431373 0.658824)')).toEqual({ hex: '#3B6EA8', alpha: 1 });
    expect(classifyResolvedPaint('color(srgb 0.905725 0.905725 0.895216)')).toBe('neutral');
  });

  it('classifies url() pattern paints as their own geometry-bearing token', () => {
    expect(classifyResolvedPaint('url("#dot-tile")')).toBe('pattern');
  });
});

describe('brand-v2 interactive data: geometry classes', () => {
  it('separates lines, dashed lines, dots, rings, bars, and bands', () => {
    expect(geometryClassOf({ tag: 'polyline', dashed: false, filled: false })).toBe('line');
    expect(geometryClassOf({ tag: 'path', dashed: true, filled: false })).toBe('dashed-line');
    expect(geometryClassOf({ tag: 'circle', dashed: false, filled: true })).toBe('dot');
    expect(geometryClassOf({ tag: 'circle', dashed: false, filled: false })).toBe('ring');
    expect(geometryClassOf({ tag: 'rect', dashed: false, filled: true })).toBe('bar');
    expect(geometryClassOf({ tag: 'rect', dashed: true, filled: true })).toBe('bar');
  });
});

describe('brand-v2 interactive data: non-colour distinctness', () => {
  const base: MarkObservation = {
    paint: 'accent',
    geometries: ['line'],
    labelled: false,
  };
  it('passes marks that differ by geometry, dash, or direct labels', () => {
    expect(
      nonColourDistinct(base, { ...base, geometries: ['dot'] }),
    ).toBe(true);
    expect(
      nonColourDistinct(base, { ...base, geometries: ['dashed-line'] }),
    ).toBe(true);
    expect(nonColourDistinct(base, { ...base, labelled: true })).toBe(true);
  });

  it('fails two same-geometry series distinguished only by paint', () => {
    expect(nonColourDistinct(base, { ...base, paint: 'error' })).toBe(false);
    expect(
      nonColourDistinct(
        { ...base, geometries: ['dot'] },
        { ...base, geometries: ['dot'], paint: 'text-dim' },
      ),
    ).toBe(false);
  });

  it('passes a series against itself-free pairs of different geometry even when paints match', () => {
    expect(
      nonColourDistinct(base, { ...base, paint: 'accent', geometries: ['band'] }),
    ).toBe(true);
  });
});

describe('brand-v2 interactive data: legend text naming', () => {
  it('rejects colour-name-only legend subjects', () => {
    expect(classifyLegendText('blue: dims this source drives')).toBe('colour-name-only');
    expect(classifyLegendText('dashed blue: sideways attention (forward)')).toBe('colour-name-only');
    expect(classifyLegendText('red line')).toBe('colour-name-only');
  });

  it('accepts entries that name the series or state', () => {
    expect(classifyLegendText('estimate')).toBe('named');
    expect(classifyLegendText('dashed outline: zero-padding')).toBe('named');
    expect(classifyLegendText('trained over uniform mu in [0.3, 1.3]')).toBe('named');
    expect(classifyLegendText('HIL-SERL')).toBe('named');
    expect(classifyLegendText('')).toBe('empty');
  });
});

describe('brand-v2 interactive data: classification registry', () => {
  const registry = JSON.parse(
    readFileSync(join(process.cwd(), 'contract', 'brand-v2-registries.json'), 'utf8'),
  ) as { interactive: { sources: Array<{ id: string; component: string }> } };

  it('classifies exactly the registry interactive sources', () => {
    const registryIds = registry.interactive.sources.map(({ id }) => id).sort();
    const classifiedIds = Object.keys(INTERACTIVE_DATA_CLASSIFICATION).sort();
    expect(classifiedIds).toEqual(registryIds);
  });

  it('records a kind for every source and a lead series only for charts', () => {
    for (const [id, row] of Object.entries(INTERACTIVE_DATA_CLASSIFICATION)) {
      expect(
        ['source-data', 'authored-model', 'schematic'],
        `${id} kind`,
      ).toContain(row.kind);
      if (row.leadSeriesId) {
        expect(
          row.kind,
          `${id} declares a lead series, so it plots a series`,
        ).not.toBe('schematic');
        expect(
          row.leadPaints,
          `${id} lead paints`,
        ).toBeTruthy();
      }
    }
  });

  it('keeps the status vocabulary non-empty and pattern-only', () => {
    expect(STATUS_LABEL_VOCABULARY.source).toBeTruthy();
    expect(STATUS_LABEL_VOCABULARY.source).toBeInstanceOf(RegExp);
  });
});

describe('brand-v2 interactive data: sortable-table census', () => {
  it('reads a sortable Table column as a header sort', () => {
    expect(
      tableSortKindOf(`const COLUMNS = [{ key: 'year', header: 'Year', sortable: true, numeric: true }];`),
    ).toBe('header-sort');
  });

  it('reads a "Sort by" preset group over aria-sort headers as a control sort', () => {
    const source = `
      <PresetGroup label="Sort by" presets={SORT_PRESETS} />
      <th
        scope="col"
        aria-sort={sort.key === 'dof' ? 'descending' : undefined}
      >DoF</th>`;
    expect(tableSortKindOf(source)).toBe('control-sort');
  });

  it('does not count a table that only describes sorting, or a sort control with no sorted header', () => {
    expect(tableSortKindOf('/* sort headers (aria-pressed / aria-sort) */ <th scope="col">Year</th>')).toBeNull();
    expect(tableSortKindOf('<PresetGroup label="Sort by" presets={P} /><th scope="col">Year</th>')).toBeNull();
    expect(tableSortKindOf(`{ key: 'name', header: 'Name', sortable: false }`)).toBeNull();
  });

  it('finds the five registered instruments that sort a table, four in headers and one by its visible control', () => {
    const registry = JSON.parse(
      readFileSync(join(process.cwd(), 'contract', 'brand-v2-registries.json'), 'utf8'),
    ) as { interactive: { sources: Array<{ id: string; sourcePath?: string }> } };
    const census = tableSortCensus(registry.interactive.sources, (path) =>
      readFileSync(join(process.cwd(), path), 'utf8'),
    );
    expect(Object.fromEntries([...census].sort(([a], [b]) => a.localeCompare(b)))).toEqual({
      'interactive:ComparisonMatrix': 'header-sort',
      'interactive:DatasetTable': 'header-sort',
      'interactive:HandComparison': 'control-sort',
      'interactive:HardwareGuide': 'header-sort',
      'interactive:TeleopRigMatrix': 'header-sort',
    });
  });
});
