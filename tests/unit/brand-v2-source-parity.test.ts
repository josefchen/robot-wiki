import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SourceOracleContext } from '../../lib/brand-v2-source-oracle-core';
import { SOURCE_ORACLES } from '../../lib/brand-v2-source-oracles';
import { collectSourceParity } from '../../lib/brand-v2-source-parity';
import type { RawFrameData, ReleaseFrameArtifact } from '../../lib/brand-v2-release-frame-data';
import type { InteractiveLedgerEvidence } from '../../lib/brand-v2-interactive-ledger';
import type { BrandV2Registry } from '../../lib/brand-v2-runners';

const empty = (): RawFrameData => ({ labels: [], legend: [], series: {}, accentMarks: [], retiredMarks: [], canvasCount: 0, circles: [], seriesRects: [], text: '', sourceBindings: [], controls: [], readouts: [], svgMarks: [], svgTexts: [], declaredBindings: [], tables: [] });

/** Independent synthetic fixture from RAND Table 1, not a browser snapshot. */
function safety(): RawFrameData {
  const rows = [
    ['fatalities', 'Fatalities, 1.09 per 100 million miles', '275 million', 275e6, 34],
    ['injuries', 'Reported injuries, 77 per 100 million miles', '3.9 million', 3.9e6, 96],
    ['crashes', 'Reported crashes, 190 per 100 million miles', '1.6 million', 1.6e6, 136],
  ] as const;
  return {
    ...empty(), text: 'About 12.5 years for 100 cars driving nonstop.',
    sourceBindings: [{ citationId: 'kalra-paddock-2016', href: 'https://doi.org/10.1016/j.tra.2016.09.010', label: 'Kalra and Paddock' }],
    readouts: rows.map(([id, , text]) => ({ key: id, text, visible: true })),
    circles: rows.map(([, , , miles, y]) => ({ cx: 10 + Math.log10(miles / 1e6) / 3 * 320, cy: y, r: 2.5 })),
    series: Object.fromEntries(rows.map(([id]) => [id, { paints: ['ink'], geometries: ['dot'], labelled: true, marks: 1 }])),
    labels: rows.map(([id, row]) => ({ seriesIds: [id], via: 'label-for' as const, visibleText: row, inPlot: true, hidden: [] })),
    tables: [{ headers: ['human benchmark', 'failure-free miles at 95% confidence'], thCount: 5, scopedThCount: 5, sortable: false, ariaSortCount: 0, naCells: [], notDisclosedColumns: [], notDisclosedCount: 0, blankCellCount: 0, approxCellCount: 0, numericColumns: [], cells: rows.map(([, row, text]) => ({ row, column: 'failure-free miles at 95% confidence', text })) }],
  };
}
function problems(frame: RawFrameData) {
  const oracle = SOURCE_ORACLES['interactive:AvSafetyMiles'];
  const context = new SourceOracleContext(frame, oracle, 'test');
  oracle.check(context); context.finish(); return context.failures;
}

describe('independent source and numerical parity', () => {
  it('checks published values against independent coordinates rather than copied rendered numbers', () => {
    expect(problems(safety())).toEqual([]);
    const alteredValue = safety(); alteredValue.tables[0].cells[0].text = '274 million';
    expect(problems(alteredValue).join(' ')).toMatch(/275 million/);
    const alteredCoordinate = safety(); alteredCoordinate.circles[0].cx += 1;
    expect(problems(alteredCoordinate).join(' ')).toMatch(/point Fatalities/);
    const missing = safety(); missing.circles.pop();
    expect(problems(missing).join(' ')).toMatch(/circle population/);
  });
  it('fails extra quantitative output and unknown substitutions instead of silently excluding them', () => {
    const extra = safety(); extra.readouts.push({ key: 'new-result', text: '99.4 percent', visible: true });
    expect(problems(extra).join(' ')).toMatch(/uncovered numeric readout/);
    const substituted = safety(); substituted.tables[0].cells[1].text = 'not disclosed';
    expect(problems(substituted).join(' ')).toMatch(/3.9 million/);
    const unknown = safety(); unknown.tables[0].cells.push({ row: 'New benchmark', column: 'new measurement', text: 'n/a' });
    expect(problems(unknown).join(' ')).toMatch(/uncovered table binding/);
  });
  it('refuses duplicated marks and broken legend-to-series bindings', () => {
    const duplicate = safety(); duplicate.circles.push({ ...duplicate.circles[0] });
    expect(problems(duplicate).join(' ')).toMatch(/circle population|point Fatalities/);
    const legend = safety(); legend.legend.push({ text: 'Invented group', seriesId: 'unbound', swatch: null });
    expect(problems(legend).join(' ')).toMatch(/legend item/);
    const missingLabel = safety(); missingLabel.labels = [];
    expect(problems(missingLabel).join(' ')).toMatch(/lacks a legend or visible direct label/);
  });
  it('derives delay results from the native speed parameter and an independent 55 ms equation', () => {
    const oracle = SOURCE_ORACLES['interactive:TimeOffsetMiss'];
    const frame = empty();
    frame.controls.push({ index: 0, tag: 'input', type: 'range', id: 'speed', testId: '', label: 'Hand speed', value: '100', min: '0', max: '100', step: '5', checked: false, pressed: null, selected: null, disabled: false });
    frame.readouts = [{ key: 'value', text: '100 cm a second', visible: true }, { key: 'result', text: '100 cm a second · photo 50 mm behind', visible: true }];
    const context = new SourceOracleContext(frame, oracle, 'max'); oracle.check(context); context.finish();
    expect(context.failures.join(' ')).toMatch(/expected \[100,55\], observed \[100,50\]/);
  });
  it('requires exact mount coverage, source identity and raw transition frames', () => {
    const full = JSON.parse(readFileSync('contract/brand-v2-registries.json', 'utf8')) as BrandV2Registry;
    const source = full.interactive.sources.find(({ id }) => id === 'interactive:AvSafetyMiles')!;
    const mount = full.interactive.mounts.find(({ sourceId }) => sourceId === source.id)!;
    const registry = { interactive: { ...full.interactive, sources: [source], mounts: [mount] } };
    const frame = safety();
    const frames: ReleaseFrameArtifact = { version: 1, sourceFingerprint: 'a'.repeat(64), exportFingerprint: 'b'.repeat(64), mountIds: [mount.id], frames: ['1440x900', '375x812'].map((viewport) => ({ ...structuredClone(frame), route: mount.route, routeText: '', mountId: mount.id, sourceId: source.id, viewport })) } as ReleaseFrameArtifact;
    const ledger = { observations: [{ mountId: mount.id, transitions: [] }] } as unknown as InteractiveLedgerEvidence;
    const run = () => collectSourceParity({ root: process.cwd(), registry, frames, ledger });
    expect([...run().keys()]).toEqual([mount.id]);
    expect(run().get(mount.id)!.failures).toEqual([]);
    frames.frames[0].sourceBindings = [];
    expect(run().get(mount.id)!.failures.join(' ')).toMatch(/source binding/);
    frames.frames.pop();
    expect(run().get(mount.id)!.failures.join(' ')).toMatch(/each declared width/);
    ledger.observations[0].transitions.push({ caseId: 'max', control: 0, keys: ['End'], series: null } as never);
    expect(run().get(mount.id)!.failures.join(' ')).toMatch(/lacks raw numerical frame/);
  });
  it('keeps uncovered source entries failing and zero-mount applicability explicit', () => {
    const full = JSON.parse(readFileSync('contract/brand-v2-registries.json', 'utf8')) as BrandV2Registry;
    const source = full.interactive.sources.find(({ id }) => id === 'interactive:AvSafetyMiles')!;
    const mount = full.interactive.mounts.find(({ sourceId }) => sourceId === source.id)!;
    const absent = { ...source, id: 'interactive:MissingOracle' };
    const registry = { interactive: { ...full.interactive, sources: [absent, source], mounts: [{ ...mount, sourceId: absent.id }] } };
    const result = collectSourceParity({ root: process.cwd(), registry, frames: { frames: [] } as unknown as ReleaseFrameArtifact, ledger: { observations: [] } as unknown as InteractiveLedgerEvidence });
    expect(result.get(mount.id)!.failures.join(' ')).toMatch(/uncovered source\/assumption/);
    expect(result.get(source.id)!.notApplicable?.reason).toMatch(/zero production mounts/);
    expect(result.size).toBe(2);
  });
  it('compares independent SVG coordinates and command topology, rejecting extra or shifted marks', () => {
    const oracle = SOURCE_ORACLES['interactive:AvSafetyMiles'];
    const frame = empty();
    frame.svgMarks = [{ tag: 'path', seriesId: 'event', testId: '', id: '', attrs: { d: 'M 10 20 L 14 24 M 10 24 L 14 20' }, viewBox: '0 0 100 100' }];
    const run = () => {
      const c = new SourceOracleContext(frame, oracle, 'cross');
      c.svgMarkCount('event', 'path', 1);
      c.svgMark('event', 'path', { d: 'M10,20 L14,24 M10,24 L14,20' });
      return c.failures;
    };
    expect(run()).toEqual([]);
    frame.svgMarks[0].attrs.d = 'M 11 20 L 15 24 M 11 24 L 15 20';
    expect(run().join(' ')).toMatch(/SVG path event/);
    frame.svgMarks[0].attrs.d = 'M 10 20 Q 14 24 M 10 24 L 14 20';
    expect(run().join(' ')).toMatch(/SVG path event/);
    frame.svgMarks.push({ ...frame.svgMarks[0] });
    expect(run().join(' ')).toMatch(/population/);
  });
  it('requires an exact table header identity when duplicate row/column pairs occur', () => {
    const frame = safety();
    frame.tables.push({ ...structuredClone(frame.tables[0]), headers: ['another benchmark', 'failure-free miles at 95% confidence'] });
    const oracle = SOURCE_ORACLES['interactive:AvSafetyMiles'];
    const unscoped = new SourceOracleContext(frame, oracle, 'duplicate');
    unscoped.cell('Fatalities, 1.09 per 100 million miles', 'failure-free miles at 95% confidence', '275 million');
    expect(unscoped.failures.join(' ')).toMatch(/exactly one/);
    const scoped = new SourceOracleContext(frame, oracle, 'specific');
    scoped.cell('Fatalities, 1.09 per 100 million miles', 'failure-free miles at 95% confidence', '275 million', { tableHeaders: frame.tables[0].headers });
    expect(scoped.failures).toEqual([]);
  });
  it('keeps oracle expectations away from renderer exports and observed results', () => {
    const source = readFileSync('lib/brand-v2-source-oracles.ts', 'utf8');
    expect(source).not.toMatch(/from\s+['"][^'"]*components\/interactive\//);
    expect(source).not.toMatch(/\bc\.(?:frame|checks|failures)\b/);
  });
});
