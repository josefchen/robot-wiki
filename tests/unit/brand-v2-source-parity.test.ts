import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SourceOracleContext } from '../../lib/brand-v2-source-oracle-core';
import { SOURCE_ORACLES } from '../../lib/brand-v2-source-oracles';
import { flowEndpointError, graspExpected, loopClosureValues, pendulumExpected, pushDistanceExpected } from '../../lib/brand-v2-source-oracle-models';
import { collectSourceParity, strideClockTransitionFailures } from '../../lib/brand-v2-source-parity';
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
    ...empty(), text: 'Miles needed to prove safetyNo fatalities in 275 million miles: 95% confidence. About 12.5 years for 100 cars driving nonstop.',
    svgTexts: [{ seriesId: null, text: 'Miles; each tick is ten times farther', x: 330, y: 182, testId: '' }],
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

/** Authored WBC marker/legend fixture, independent of the component renderer. */
function wbcFrame(forcedColours = false): RawFrameData {
  const paper = 'rgb(250,250,248)', ink = forcedColours ? 'rgb(0,0,0)' : 'rgb(28,28,26)';
  return {
    ...empty(), text: '10M 1000+ h 200,000+',
    controls: ['Figure', 'NVIDIA', 'Google DeepMind'].map((label, index) => ({ index, tag: 'button', type: 'button', id: '', testId: '', label, value: null, min: null, max: null, step: null, checked: null, pressed: index === 0 ? 'true' : 'false', selected: null, disabled: false })),
    readouts: ['Representative: Figure Helix 02 S0Layers: 3Fastest loop: 1000 Hz', 'Figure Helix 02 S0', '3', '1000 Hz'].map((text, index) => ({ key: String(index), text, visible: true })),
    series: { motors: { marks: 8, paints: [paper, ink], geometries: ['dot'], labelled: false } },
    legend: [{ text: 'joint motors', seriesId: 'motors', swatch: { tag: 'circle', fill: paper, stroke: ink, strokeWidth: '1px', dash: null } }],
    svgMarks: [[270,44],[302,44],[259,72],[313,72],[278,94],[294,94],[277,130],[295,130]].map(([cx, cy]) => ({ tag: 'circle', seriesId: 'motors', testId: '', id: '', effectiveOpacity: 1, displayed: true, viewBox: '0 0 340 200', attrs: { cx: String(cx), cy: String(cy), r: '2.75', fill: 'var(--paper, var(--color-paper))', stroke: 'var(--role-action-stage)' } })),
  };
}

function wbcProblems(frame: RawFrameData): string[] {
  const oracle = SOURCE_ORACLES['interactive:WbcDecomposition'];
  const context = new SourceOracleContext(frame, oracle, 'wbc-key');
  oracle.check(context); context.finish(); return context.failures;
}

function recipeFrame(sim = true): RawFrameData {
  const rows = [
    ['Simulation, trial and error', 'yes', 'ANYmal walked on flat ground after under 4 minutes of training'],
    ['Real demonstrations', 'no', 'ACT slotted a battery 80 to 90% of the time after 10 minutes of demonstrations'],
  ];
  return {
    ...empty(),
    controls: rows.map(([label], index) => ({ index, tag: 'button', type: 'button', id: '', testId: '', label, value: null, min: null, max: null, step: null, checked: null, pressed: (index === 0) === sim ? 'true' : 'false', selected: null, disabled: false })),
    svgTexts: [{ seriesId: null, ownerTestId: 'recipe-stage', text: sim ? 'The simulator’s contact errors carry over' : 'Real demonstrations need no contact model', x: 2, y: 16, testId: '', painted: true, paintFailures: [] }],
    tables: [{ headers: ['recipe', 'needs a contact model', 'example'], thCount: 5, scopedThCount: 5, sortable: false, ariaSortCount: 0, naCells: [], notDisclosedColumns: [], notDisclosedCount: 0, blankCellCount: 0, approxCellCount: 0, numericColumns: [], cells: rows.flatMap(([row, contact, example]) => [{ row, column: 'needs a contact model', text: contact }, { row, column: 'example', text: example }]) }],
  };
}

function namedProblems(name: string, frame: RawFrameData): string[] {
  const oracle = SOURCE_ORACLES[`interactive:${name}`], context = new SourceOracleContext(frame, oracle, 'source mutation');
  oracle.check(context); context.finish(); return context.failures;
}

function pressFrame(target: -0.5 | 0 | 0.5): RawFrameData {
  const words = target === 0.5 ? '0.5 marks past surface' : target === -0.5 ? '0.5 marks short of surface' : 'on the surface';
  const heading = target > 0 ? 'Surface stops the tool; stiffness times target gap sets push' : target < 0 ? 'Before contact, the tool follows its target without pushing' : 'At the surface, no target gap means no push';
  const hint = target > 0 ? 'The surface stops the tool. Stiffness 2 times a target gap of 0.5 ruler marks gives 1 dial marks of push.' : target < 0 ? 'Before contact, the tool follows the target and pushes on nothing.' : 'Target and tool meet the surface with no gap, so there is no push.';
  return {
    ...empty(), text: `Impedance action${heading} ${hint}`,
    controls: [
      { index: 0, tag: 'input', type: 'range', id: '', testId: '', label: 'Target', value: String(target), min: '-2', max: '3', step: '0.5', checked: false, pressed: null, selected: null, disabled: false },
      ...['Soft', 'Medium', 'Stiff'].map((label, index) => ({ index: index + 1, tag: 'button', type: 'button', id: '', testId: '', label, value: null, min: null, max: null, step: null, checked: null, pressed: index === 1 ? 'true' : 'false', selected: null, disabled: false })),
    ],
    readouts: [words, `Medium · ${words} · ${target > 0 ? 'push 1 dial marks' : 'no push'}`].map((text, index) => ({ key: String(index), text, visible: true })),
  };
}

/** Closed-form geometric sum for the uncorrected 5% recurrence, not renderer output. */
function oddHorizonFrame(): RawFrameData {
  const summed = (n: number) => 100 * (1.0005 * Math.expm1(n * Math.log1p(0.0005)) / 0.0005 - n);
  const x = (n: number) => (48 + n / 240 * 258).toFixed(1);
  const y = (value: number) => (Math.round((154 - Math.log10(1 + value / 100) / Math.log10(51) * 122) * 100) / 100).toFixed(1);
  const lines = [
    ['quadratic-reference', 2, (n: number) => 0.025 * n * (n + 1)],
    ['linear-reference', 2, (n: number) => 0.05 * n],
    ['summed-deviation', 1, summed],
  ] as const;
  const table = [
    ['0', '0.000', '0.000', '0.000'], ['48', '59.3', '58.8', '2.4'],
    ['96', '237', '233', '4.8'], ['144', '535', '522', '7.2'],
    ['192', '957', '926', '9.6'], ['240', '1505', '1446', '12.0'],
  ];
  return {
    ...empty(), text: 'Compounding errorTwice the task: about four times as far off course Copying an expert for twice as long leaves the robot about four times as far off course as its small slips accumulate.',
    controls: [
      { index: 0, tag: 'input', type: 'range', id: '', testId: '', label: 'How big each slip is', value: '5', min: '0.5', max: '15', step: '0.5', checked: false, pressed: null, selected: null, disabled: false },
      { index: 1, tag: 'input', type: 'range', id: '', testId: '', label: 'How many moves the task has', value: '235', min: '20', max: '240', step: '5', checked: false, pressed: null, selected: null, disabled: false },
      ...['25 moves per plan', 'A teacher corrects it'].map((label, index) => ({ index: index + 2, tag: 'button', type: 'button', id: '', testId: '', label, value: null, min: null, max: null, step: null, checked: null, pressed: 'false', selected: null, disabled: false })),
    ],
    readouts: ['5.0%', '235 moves', '235 moves · drift 1,442 toy units · the first 118 moves drift 358', '1,442', '358', '12.5'].map((text, index) => ({ key: String(index), text, visible: true })),
    series: Object.fromEntries(lines.map(([id]) => [id, { paints: ['ink'], geometries: ['line'], labelled: true, marks: id === 'summed-deviation' ? 2 : 1 }])),
    labels: lines.map(([id]) => ({ seriesIds: [id], via: 'label-for' as const, visibleText: id, inPlot: true, hidden: [] })),
    svgMarks: [
      ...lines.map(([id, stride, value]) => ({ tag: 'path', seriesId: id, testId: '', id: '', effectiveOpacity: 1, displayed: true, viewBox: '0 0 340 200', attrs: { d: Array.from({ length: 240 / stride + 1 }, (_, i) => `${i ? 'L' : 'M'}${x(i * stride)},${y(value(i * stride))}`).join(' ') } })),
      { tag: 'circle', seriesId: 'summed-deviation', testId: '', id: '', effectiveOpacity: 1, displayed: true, viewBox: '0 0 340 200', attrs: { cx: x(235), cy: y(summed(235)), r: '4.5' } },
    ],
    tables: [{ headers: ['horizon T (steps)', 'simulated', 'εT(T+1)/2', 'εT'], thCount: 4, scopedThCount: 4, sortable: false, ariaSortCount: 0, naCells: [], notDisclosedColumns: [], notDisclosedCount: 0, blankCellCount: 0, approxCellCount: 0, numericColumns: [], cells: table.flatMap(([row, sim, quadratic, linear]) => [{ row, column: 'simulated', text: sim }, { row, column: 'εT(T+1)/2', text: quadratic }, { row, column: 'εT', text: linear }]) }],
  };
}

describe('independent source and numerical parity', () => {
  it('uses the nearest whole half for an odd horizon and rejects a floored-half readout', () => {
    const frame = oddHorizonFrame();
    expect(namedProblems('CompoundingError', frame)).toEqual([]);
    frame.readouts[2].text = '235 moves · drift 1,442 toy units · the first 117 moves drift 352';
    frame.readouts[4].text = '352';
    expect(namedProblems('CompoundingError', frame)).toEqual([
      'source mutation readout 2: expected [235,1442,118,358], observed [235,1442,117,352]',
      'source mutation readout 4: expected [358], observed [352]',
    ]);
  });

  it.each([true, false])('binds the training-recipe annotation to the native simulation=%s mode', sim => {
    const frame = recipeFrame(sim);
    expect(namedProblems('DemoOrSim', frame)).toEqual([]);
    frame.svgTexts[0].text = recipeFrame(!sim).svgTexts[0].text;
    expect(namedProblems('DemoOrSim', frame).some(failure => failure.includes('SVG label'))).toBe(true);
  });

  it('requires one selected recipe and a painted mode annotation', () => {
    const frame = recipeFrame();
    frame.controls[1].pressed = 'true';
    expect(namedProblems('DemoOrSim', frame).some(failure => failure.includes('exclusive training recipe'))).toBe(true);
    frame.controls[1].pressed = 'false'; frame.svgTexts[0].painted = false;
    expect(namedProblems('DemoOrSim', frame).some(failure => failure.includes('SVG label paint'))).toBe(true);
  });

  it.each([-0.5, 0, 0.5] as const)('binds the press explanation to its settled native target %s', target => {
    const frame = pressFrame(target);
    expect(namedProblems('ImpedancePress', frame)).toEqual([]);
    frame.text = target > 0 ? frame.text.replace('gives 1 dial marks', 'gives 2 dial marks') : frame.text.replace(target < 0 ? 'pushes on nothing' : 'there is no push', 'pushes with one dial mark');
    expect(namedProblems('ImpedancePress', frame).some(failure => failure.includes('source label'))).toBe(true);
  });

  it('binds planning headings and captions to the selected durations, including a whole plan', () => {
    const frame: RawFrameData = {
      ...empty(),
      controls: [32, 32].map((value, index) => ({ index, tag: 'input', type: 'range', id: '', testId: '', label: index ? 'Steps acted on, before replanning' : 'Steps planned, at ten commands per second', value: String(value), min: '1', max: '32', step: '1', checked: null, pressed: null, selected: null, disabled: false })),
      readouts: ['32', '32', '3.2 seconds planned; 3.2 seconds acted; 0.31 replans per second', '3.2 seconds', '0.31 per second'].map((text, index) => ({ key: String(index), text, visible: true })),
      text: 'Receding horizonFollow all 3.2 seconds without replanning. The robot acts on all 3.2 seconds of this plan without replanning.',
    };
    const check = () => { const oracle = SOURCE_ORACLES['interactive:RecedingHorizon']; const c = new SourceOracleContext(frame, oracle, 'whole plan'); oracle.check(c); c.finish(); return c.failures; };
    expect(check()).toEqual([]);
    const correct = frame.text;
    frame.text = correct.replace('Follow all 3.2 seconds without replanning', 'Plan 1.6 seconds ahead; act on 0.8 seconds, then rethink');
    expect(check().some(failure => failure.includes('source label'))).toBe(true);
    frame.text = correct.replace('The robot acts on all 3.2 seconds of this plan without replanning.', 'The robot plans 3.2 seconds ahead, acts on 3.2 seconds, then replans and replaces the unused moves.');
    expect(check().some(failure => failure.includes('source label'))).toBe(true);
  });

  it('binds the hollow motor key to the source rings in normal and forced colours', () => {
    expect(wbcProblems(wbcFrame())).toEqual([]);
    expect(wbcProblems(wbcFrame(true))).toEqual([]);
  });

  it.each(['filled-key', 'missing-fill', 'missing-stroke', 'different-stroke', 'zero-stroke', 'wrong-meaning', 'filled-ring', 'missing-ring'])('rejects %s without changing WBC architecture values', mutation => {
    const frame = wbcFrame(), swatch = frame.legend[0].swatch!;
    if (mutation === 'filled-key') swatch.fill = swatch.stroke;
    if (mutation === 'missing-fill') swatch.fill = null;
    if (mutation === 'missing-stroke') swatch.stroke = null;
    if (mutation === 'different-stroke') swatch.stroke = 'rgb(255,0,0)';
    if (mutation === 'zero-stroke') swatch.strokeWidth = '0px';
    if (mutation === 'wrong-meaning') frame.legend[0].text = 'finger tools';
    if (mutation === 'filled-ring') frame.svgMarks[0].attrs.fill = 'var(--role-action-stage)';
    if (mutation === 'missing-ring') frame.svgMarks.pop();
    expect(wbcProblems(frame).length).toBeGreaterThan(0);
  });

  it('can require a literal legend outline paint without accepting another series colour', () => {
    const frame = wbcFrame(), oracle = SOURCE_ORACLES['interactive:WbcDecomposition'];
    const check = () => { const c = new SourceOracleContext(frame, oracle, 'literal-key'); c.legendEncoding({ 'joint motors': ['motors'] }, { 'joint motors': { tag: 'circle', fill: 'rgb(250,250,248)', stroke: 'rgb(28,28,26)' } }); return c.failures; };
    expect(check()).toEqual([]);
    frame.legend[0].swatch!.stroke = 'rgb(0,0,0)';
    expect(check()).toHaveLength(1);
  });
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
  it('rejects a changed scale explanation even when the benchmark values remain correct', () => {
    const frame = safety();
    frame.svgTexts[0].text = 'Miles; each tick is twice as far';
    expect(problems(frame).join(' ')).toMatch(/SVG label/);
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
  it('proves empty filters and named groups without accepting missing observations', () => {
    const frame = empty(), oracle = SOURCE_ORACLES['interactive:AvSafetyMiles'];
    const c = new SourceOracleContext(frame, { ...oracle, seriesIds: [] }, 'empty'); c.tablePopulation([]); c.finish(); expect(c.failures).toEqual([]);
    frame.tables = safety().tables;
    const unexpected = new SourceOracleContext(frame, oracle, 'unexpected'); unexpected.tablePopulation([]); unexpected.finish();
    expect(unexpected.failures.join(' ')).toMatch(/table population/);
    const option = { index: 0, tag: 'button', type: 'button', id: '', testId: '', label: 'Not disclosed', value: null, min: null, max: null, step: null, checked: null, pressed: 'true', selected: null, disabled: false };
    frame.controls = [{ ...option, group: 'Robot hours' }, { ...option, index: 1, group: 'Human hours', pressed: 'false' }];
    const groups = new SourceOracleContext(frame, oracle, 'groups');
    expect(() => groups.selected(/^Not disclosed$/)).toThrow(/found 2/);
    expect(groups.selected(/^Not disclosed$/, { group: 'Robot hours' })).toBe(true);
    expect(groups.selected(/^Not disclosed$/, { group: 'Human hours' })).toBe(false);
    expect(() => groups.selected(/^Not disclosed$/, { group: 'Missing' })).toThrow(/found 0/);
  });
  it('requires source URLs, raw sort state, and actual HTML bar fractions', () => {
    const frame = empty(), oracle = SOURCE_ORACLES['interactive:AvSafetyMiles'];
    frame.htmlMarks = [{ seriesId: 'volume', ownerTestId: 'row-a', tag: 'div', box: { x: 0, y: 0, width: 30, height: 5 }, parentBox: { x: 0, y: 0, width: 100, height: 5 }, widthStyle: '30%', opacity: 1 }];
    const okay = new SourceOracleContext(frame, oracle, 'bar'); okay.htmlMarkCount(1); okay.htmlBar('row-a', 0.3); expect(okay.failures).toEqual([]);
    frame.htmlMarks[0].box.width = 40;
    const bad = new SourceOracleContext(frame, oracle, 'bar'); bad.htmlBar('row-a', 0.3); bad.sourceLink('https://primary.example/source');
    expect(bad.failures.join(' ')).toMatch(/HTML bar/); expect(bad.failures.join(' ')).toMatch(/source link/);
    expect(() => bad.tableSort()).toThrow(/found 0/);
    frame.tables = safety().tables; frame.tables[0].sortStates = [{ column: 'benchmark', direction: 'ascending' }];
    expect(bad.tableSort()).toEqual({ column: 'benchmark', direction: 'ascending' });
    frame.tables[0].sortStates.push({ column: 'miles', direction: 'descending' }); expect(() => bad.tableSort()).toThrow(/found 2/);
  });
  it('derives mechanical expectations independently at exact analytic boundaries', () => {
    expect(flowEndpointError(1) / flowEndpointError(10)).toBeCloseTo(10, 10);
    expect(graspExpected([0.125, 0.875, 0.625], 0.7).epsilon).toBeCloseTo(0.7 / Math.sqrt(2 + 0.7 ** 2), 10);
    expect(graspExpected([0.125, 0.875, 0.625], 0).epsilon).toBe(0);
    const closed = loopClosureValues(0); expect(closed.openGap).toBeLessThan(1e-12); expect(closed.closedWorst).toBeLessThan(1e-12);
  });
  it('replays only finite bounded physical inputs and rejects result-shaped or incomplete witnesses', () => {
    const release = pendulumExpected([], 0);
    expect(release.angle).toBe(12 * Math.PI / 180); expect(release.rate).toBe(0);
    expect(pendulumExpected([{ kind: 'push', impulse: 2 }], 0).rate).toBe(2);
    expect(() => pendulumExpected([{ kind: 'advance', steps: 1, kp: 25, ki: 0, kd: 3, angle: 0 }], 1)).toThrow(/invalid integration/);
    expect(() => pendulumExpected([{ kind: 'advance', steps: 288001, kp: 25, ki: 0, kd: 3 }], 288001)).toThrow(/bound/);
    expect(() => pendulumExpected([], 1)).toThrow(/step population/);
    expect(pushDistanceExpected([4])).toBeCloseTo(16 / (9 * 9.81)); expect(pushDistanceExpected([4, 6])).toBe(0.5);
    expect(() => pushDistanceExpected(Array(129).fill(4))).toThrow(/over-bound/);
    const frame = empty(); frame.declaredBindings = [{ element: 'div', attributes: { 'data-source-trace-complete': 'false' } }];
    for (const id of ['interactive:PendulumController', 'interactive:AppearancePhysicsPush']) {
      const oracle = SOURCE_ORACLES[id], c = new SourceOracleContext(frame, oracle, 'incomplete');
      expect(() => oracle.check(c)).toThrow(/incomplete/);
    }
  });
  it('keeps the exact stride UI clock bound to Step, Reset and reduced-motion playback behavior', () => {
    const base = { name: 'Step the preview forward', keys: ['Space'], beforeControl: 'label=Step the preview forward', afterControl: 'label=Step the preview forward', before: 'Preview phase: 0%', after: 'Preview phase: 5%', frame: 'Preview phase: 5%' };
    expect(strideClockTransitionFailures(base)).toEqual([]);
    expect(strideClockTransitionFailures({ ...base, after: 'Preview phase: 10%', frame: 'Preview phase: 10%' }).join(' ')).toMatch(/expected 5/);
    expect(strideClockTransitionFailures({ ...base, name: 'Reset', before: 'Preview phase: 5%', after: 'Preview phase: 0%', frame: 'Preview phase: 0%' })).toEqual([]);
    expect(strideClockTransitionFailures({ ...base, name: 'Play rollout preview', before: 'Preview phase: 5%', afterControl: 'label=Play rollout preview' })).toEqual([]);
    expect(strideClockTransitionFailures({ ...base, after: 'Preview phase: 101%' }).join(' ')).toMatch(/bounded/);
  });
  it('requires a real declared zero series and exact SVG owner scopes', () => {
    const frame = empty(), oracle = { ...SOURCE_ORACLES['interactive:AvSafetyMiles'], seriesIds: [] };
    const missing = new SourceOracleContext(frame, oracle, 'zero'); missing.zeroSeries('downtime', 'Zero at full uptime'); expect(missing.failures).toHaveLength(1);
    frame.seriesDeclarations = ['downtime']; frame.legend = [{seriesId:'downtime',text:'Downtime',swatch:null}];
    const present = new SourceOracleContext(frame, oracle, 'zero'); present.zeroSeries('downtime', 'Zero at full uptime'); present.tablePopulation([]); present.finish(); expect(present.failures).toEqual([]);
    frame.svgMarks = ['one', 'two'].map(ownerTestId => ({ ownerTestId, tag:'circle',seriesId:'same',testId:'',id:'',attrs:{cx:'10',cy:'20'},viewBox:'0 0 100 100' }));
    const scoped = new SourceOracleContext(frame, oracle, 'scoped'); scoped.svgMark('same','circle',{cx:10,cy:20},0.05,{ownerTestId:'one'}); expect(scoped.failures).toEqual([]);
    scoped.svgMark('same','circle',{cx:10,cy:20}); expect(scoped.failures).toHaveLength(1);
  });
  it('covers the independently registered mounted source population exactly', () => {
    const registry = JSON.parse(readFileSync('contract/brand-v2-registries.json', 'utf8')) as BrandV2Registry;
    expect(Object.keys(SOURCE_ORACLES).sort()).toEqual([...new Set(registry.interactive.mounts.map(mount => mount.sourceId))].sort());
  });
  it('limits hidden-label alternatives to exact painted matrix cards or verified excluded context', () => {
    const oracle = { basis: [{ id: 'assumption:ComparisonMatrix:test', kind: 'assumption' as const, reference: 'source fixture' }], evidencePaths: [], seriesIds: ['tokens'], check() {} };
    const frame = empty(); frame.readouts = [{key:'count',text:'1 method',visible:true}];
    frame.series = {tokens:{marks:1,paints:['ink'],geometries:['dot'],labelled:false}};
    frame.labels = [{seriesIds:['tokens'],via:'label-for',visibleText:'',inPlot:false,hidden:['"word-like codes": aria-hidden']}];
    frame.svgMarks = [{tag:'circle',seriesId:'tokens',testId:'',id:'',ownerTestId:'method-year-strip',effectiveOpacity:1,displayed:true,attrs:{'data-method-dot':'method-one',cx:'10',cy:'20'},viewBox:'0 0 100 100'}];
    frame.svgTexts = [{seriesId:'tokens',text:'word-like codes',x:10,y:20,testId:'',ownerTestId:'method-year-strip',dy:null,painted:true,paintFailures:[]}];
    frame.methodCards = [{id:'method-one',text:'Method one2026Outputtokens',visible:true,paintFailures:[]}];
    const run = (selected = true) => { const c = new SourceOracleContext(frame,oracle,'matrix'); c.readoutNumbers(0,[1]); c.comparisonCardPopulation(selected?['method-one']:[],{tokens:'word-like codes'}); c.comparisonCardAlternative('tokens','method-one','Method one2026Outputtokens',selected); c.finish(); return c.failures; };
    expect(run()).toEqual([]);
    frame.methodCards[0].text='Method one2027Outputtokens'; expect(run().join(' ')).toMatch(/semantic alternative/);
    frame.methodCards=[]; frame.svgMarks[0].effectiveOpacity=.2; expect(run(false)).toEqual([]);
    frame.svgMarks[0].effectiveOpacity=.4; expect(run(false).join(' ')).toMatch(/semantic alternative/);
    frame.svgMarks[0].effectiveOpacity=.2; frame.svgTexts[0].painted=false; frame.svgTexts[0].paintFailures=['clipped']; expect(run(false).join(' ')).toMatch(/lacks a legend/);
  });
  it('grades exact provenance key shapes and refuses a visible supposedly inactive series', () => {
    const oracle = { basis: [{id:'assumption:AdvantageScrubber:test',kind:'assumption' as const,reference:'fixture'}],evidencePaths:[],seriesIds:['value'],check(){} }, frame=empty();
    frame.series={value:{marks:1,paints:['ink'],geometries:['line'],labelled:false}};frame.legend=[{text:'Blog',seriesId:null,swatch:{tag:'polygon',points:'1,2 3,4 5,6',stroke:null,fill:'ink',dash:null,strokeWidth:null}}];
    const key=new SourceOracleContext(frame,oracle,'key');key.legendEncoding({Blog:['value']},{Blog:{tag:'polygon',vertices:3}});key.tablePopulation([]);key.finish();expect(key.failures).toEqual([]);
    frame.legend[0].swatch!.points='1,2 3,4 5,6 7,8';const wrong=new SourceOracleContext(frame,oracle,'key');wrong.legendEncoding({Blog:['value']},{Blog:{tag:'polygon',vertices:3}});expect(wrong.failures).toHaveLength(1);
    frame.legend=[];frame.svgMarks=[{tag:'path',seriesId:'value',testId:'',id:'',attrs:{d:'M0 0L1 1'},viewBox:'0 0 10 10',displayed:false}];
    const hidden=new SourceOracleContext(frame,oracle,'view');hidden.inactiveRetainedSeries('value','Native training view retains its hidden episode');hidden.tablePopulation([]);hidden.finish();expect(hidden.failures).toEqual([]);
    frame.svgMarks[0].displayed=true;const visible=new SourceOracleContext(frame,oracle,'view');visible.inactiveRetainedSeries('value','Native training view');expect(visible.failures).toHaveLength(1);
  });
  it('keeps oracle expectations away from renderer exports and observed results', () => {
    const source = readFileSync('lib/brand-v2-source-oracles.ts', 'utf8');
    expect(source).not.toMatch(/from\s+['"][^'"]*components\/interactive\//);
    expect(source).not.toMatch(/\bc\.(?:frame|checks|failures)\b/);
  });
});
