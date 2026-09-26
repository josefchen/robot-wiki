import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  classifyLegendText,
  classifyResolvedPaint,
  geometryClassOf,
  INTERACTIVE_DATA_CLASSIFICATION,
  nonColourDistinct,
  STATUS_LABEL_VOCABULARY,
  type MarkObservation,
} from '../../lib/brand-v2-interactive-data';

describe('brand-v2 interactive data: resolved paint classification', () => {
  it('maps rendered rgb() strings to their data tokens', () => {
    expect(classifyResolvedPaint('rgb(36, 95, 255)')).toBe('accent');
    expect(classifyResolvedPaint('rgb(198, 255, 25)')).toBe('highlight');
    expect(classifyResolvedPaint('rgb(165, 42, 30)')).toBe('error');
    expect(classifyResolvedPaint('rgb(11, 11, 12)')).toBe('text');
    expect(classifyResolvedPaint('rgb(36, 45, 51)')).toBe('text-dim');
    // Scaffold paints are neutral, never a data series token.
    expect(classifyResolvedPaint('rgb(217, 218, 219)')).toBe('neutral');
    expect(classifyResolvedPaint('rgb(141, 145, 148)')).toBe('neutral');
    expect(classifyResolvedPaint('none')).toBe('neutral');
    expect(classifyResolvedPaint('rgb(26, 111, 69)')).toBe('ok');
    expect(classifyResolvedPaint('rgb(138, 90, 0)')).toBe('warn');
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
