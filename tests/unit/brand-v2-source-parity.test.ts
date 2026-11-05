import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SourceOracleContext } from '../../lib/brand-v2-source-oracle-core';
import { SOURCE_ORACLES } from '../../lib/brand-v2-source-oracles';
import { flowEndpointError, graspExpected, loopClosureValues, pendulumExpected, pushDistanceExpected, representationExpected } from '../../lib/brand-v2-source-oracle-models';
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
    ...empty(), text: [
      'Miles needed to prove safetyFleet: 275 million miles without deaths, at 95% confidence',
      'Required fleet run at 95% confidence275 million miles 0 deaths',
      'Calculated upper bound for this hypothetical runAbout 1.09 deaths per 100 million milesNo higher than the study’s US human-driver benchmarkThe true fatality rate remains unknown. In the long run, at least 95 out of 100 upper bounds from studies of the same design would reach or exceed it.',
      'This is a hypothetical test with a fixed distance and zero deaths. The model assumes independent miles with the same failure probability on every mile. The study’s 2013 US benchmark includes all motor vehicles.',
      'Under the study’s per-mile model, a fleet at the US benchmark rate would finish this many miles without a death only about 1 time in 20. A higher fatality rate makes that result still less likely.',
      'About 12.5 years for 100 cars driving nonstop.',
    ].join(' '),
    svgTexts: [{ seriesId: null, text: 'Required miles; each tick is ten times farther', x: 330, y: 182, testId: '' }],
    sourceBindings: [{ citationId: 'kalra-paddock-2016', href: 'https://doi.org/10.1016/j.tra.2016.09.010', label: 'Kalra and Paddock' }],
    readouts: rows.map(([id, , text], index) => ({ key: id, text: `${text}; no ${['death', 'reported injury', 'reported crash'][index]}`, visible: true })),
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

/** Independent 12/13 boundary and illustrative default; no browser fixture is rewritten. */
function chunkFrame(size: 12 | 13 | 16): RawFrameData {
  return {
    ...empty(), text: [
      'Action chunks13 actions bridge 250 milliseconds at 50 commands a second',
      'Gemini Robotics replies About 250 milliseconds per reply Each reply carries a chunk of actions.',
      'Robot’s control clock Needs 50 commands each second.',
      '13 or more actions per reply cover the wait. Fewer leave the arm idle.',
      'Illustrative chunk size',
      'This card feeder represents the action queue. The robot arm is not drawn: empty belt slots show moments when it waits.',
      'One action every 20 ms',
      '250 ms ÷ 20 ms = 12.5 action intervals Round up → 13 actions per reply cover the wait',
      "Assumed: one request at a time, the next sent when an answer lands. Gemini Robotics does not publish its chunk length, so the deck size is the reader's; 16 is the chunk GR00T N1 samples.",
    ].join(' '),
    controls: [{ index: 0, tag: 'input', type: 'range', id: '', testId: '', label: 'Actions per chunk', value: String(size), min: '4', max: '24', step: '1', checked: false, pressed: null, selected: null, disabled: false }],
    readouts: [`Illustrative chunk size${size} actions`, `${size} per chunk · ${size === 12 ? 'arm waits 2 of 50 ticks' : 'the arm never waits'} · 13 or more cover the wait`].map((text, index) => ({ key: String(index), text, visible: true })),
  };
}

/** Synthetic 30 cm occupancy-grid case; copied claims cannot replace its original metric predicates. */
function sceneQuestionFrame(): RawFrameData {
  const room = [[20, 14, 260, 8], [86, 88, 44, 20], [139, 191, 22, 11], [145, 185, 10, 6]];
  const cells = representationExpected(30).cells;
  const rects = [...room.map(([x, y, width, height]) => ({ seriesId: 'room', x, y, width, height })), ...cells.map(cell => ({ seriesId: cell.state, x: cell.x, y: cell.y, width: 30, height: 30 }))];
  const marks = ['occupied', 'unknown', 'free', 'room'];
  return {
    ...empty(), text: [
      'Scene representationsOnly storage format changes which questions can be answered',
      'Storage format → questions it answers directly',
      'DotsNone of these three directly', 'Grid of boxesCan the robot move here?',
      'Small boxes: distance to seen surfacesCan the robot move here?Which way does the surface face?',
      'Surface of trianglesWhich way does the surface face?', 'Coloured shapes make camera picturesWhat does it look like from here?',
      'Other answers may need extra processing; the selected format’s details are shown below.',
      'Finer detail → more memory, the same questions', 'Smaller spacing shows finer detail for the same kinds of questions.',
      'Distance option: from each small box to a surface the camera sees, along its line of sight. Picture option: coloured shapes in 3D overlap to draw the room from a chosen camera position.',
      'At a wall or object face: the direction straight out from the surface, for planning contact.',
    ].join(' '),
    controls: [
      ...['Dots (points)', 'Grid of boxes (grid)', 'Small boxes: distance to seen surfaces (TSDF)', 'Surface of triangles (mesh)', 'Coloured shapes make camera pictures (3DGS)'].map((label, index) => ({ index, tag: 'button', type: 'button', id: '', testId: '', label, value: null, min: null, max: null, step: null, checked: null, pressed: index === 1 ? 'true' : 'false', selected: null, disabled: false })),
      { index: 5, tag: 'input', type: 'range', id: '', testId: '', label: 'Detail, currently 30 cm', value: '0', min: '0', max: '3', step: '1', checked: false, pressed: null, selected: null, disabled: false },
    ],
    readouts: ['30 cm', '667 B · 667 voxels · 30 cm', '667 B', '667 voxels'].map((text, index) => ({ key: String(index), text, visible: true })),
    series: Object.fromEntries(marks.map(id => [id, { paints: ['ink'], geometries: ['rect'], labelled: true, marks: id === 'room' ? 7 : cells.filter(cell => cell.state === id).length }])),
    labels: marks.map(id => ({ seriesIds: [id], via: 'label-for' as const, visibleText: id, inPlot: true, hidden: [] })),
    seriesRects: rects,
    svgMarks: [
      ...rects.map(({ seriesId, x, y, width, height }) => ({ tag: 'rect', seriesId, testId: '', id: '', effectiveOpacity: 1, displayed: true, viewBox: '0 0 340 240', attrs: { x: String(x), y: String(y), width: String(width), height: String(height) } })),
      ...[[240, 74, 12], [240, 74, 4], [200, 97, 1.6]].map(([cx, cy, r]) => ({ tag: 'circle', seriesId: 'room', testId: '', id: '', effectiveOpacity: 1, displayed: true, viewBox: '0 0 340 240', attrs: { cx: String(cx), cy: String(cy), r: String(r) } })),
    ],
  };
}

/** Synthetic spring-law cases only; this helper never writes browser readings. */
function pressFrame(target: number, spring: 'Soft' | 'Medium' | 'Stiff' = 'Medium'): RawFrameData {
  const rate = { Soft: 1, Medium: 2, Stiff: 4 }[spring], gap = Math.max(0, target), push = rate * gap;
  const amount = Math.abs(target), amountText = Number.isInteger(amount) ? String(amount) : amount.toFixed(1);
  const words = target === 0 ? 'on the surface' : `${amountText} ${amount === 1 ? 'mark' : 'marks'} ${target < 0 ? 'short of surface' : 'past surface'}`;
  const pushWords = Number.isInteger(push) ? String(push) : push.toFixed(1);
  const heading = target > 0 ? 'This action sends target and stiffness for contact' : target < 0 ? 'This action sends target and stiffness before contact' : 'This action sends target and stiffness at the surface';
  const hint = target > 0 ? `The surface stops the tool. Stiffness ${rate} times a target gap of ${target} ruler marks gives ${pushWords} dial marks of push.` : target < 0 ? 'Before contact, the tool follows the target and pushes on nothing.' : 'Target and tool meet the surface with no gap, so there is no push.';
  const gapKey = target > 0
    ? `Stopped tool Target level Marked target gap: ${gap} ruler ${gap === 1 ? 'mark' : 'marks'} from the stopped tool to the target level.`
    : `Tool and target ${target < 0 ? 'Tool follows target.' : 'Tool and target meet at the surface.'} Marked target gap: 0 ruler marks.`;
  const mechanism = target > 0 ? 'The surface stops the tool.' : target < 0 ? 'Before contact, the tool follows its target without pushing.' : 'No target gap means no push.';
  return {
    ...empty(), text: [
      `Impedance action${heading}`, hint,
      `An action sends target and stiffness; once the surface stops the tool, push equals stiffness times target gap. Action: target ${target > 0 ? '+' : ''}${target} and stiffness ${rate}.Action stiffnessSoftMediumStiffTarget${words}Run the press Controller: uses these settings to make the tool act like a spring.`,
      `Shown response ${target > 0 ? 'The surface stops the tool.' : target < 0 ? 'Before contact, the tool follows its target without pushing.' : 'Tool and target meet the surface without pushing.'} Surface stops tool Shown target: ${words}Schematic push scale from 0 to 12 dial marks, without physical units.04812 ↓ Shown calculation sent stiffness: ${rate} × times target gap: ${gap} ruler marks = equals push: ${Number(push.toFixed(1))} dial marks ${rate} × ${gap} = ${Number(push.toFixed(1))}`,
      'Ruler: target gap. Dial: push.',
      'Target is where to aim. Stiffness sets how strongly the tool behaves like a spring.',
      'Spring analogy: target gap',
      `${mechanism}${gapKey}`,
      'Schematic ruler and dial marks, with no physical units: springs give 1, 2 or 4 dial marks per ruler mark.',
      'Once the surface stops the tool, push equals stiffness times how far the target sits past it.',
      'An impedance action is a target pose plus a stiffness and a damping, and a controller under the policy turns the gap between the target and the tool into a push.',
      "Hogan's impedance law says exactly that: at rest the push is the stiffness times the gap, and the damping only acts while the tool moves.",
      'In free space nothing stops the tool, so it rides on the target and the scale reads nothing.',
      'The same target pushes four times as hard through the stiff spring as through the soft one.',
      'Illustrative: the three springs push 1, 2 and 4 dial marks per ruler mark of gap, and no force in newtons is claimed.',
      'Target-and-stiffness control from Hogan (1985): the controller makes the tool behave like a spring.',
    ].join(' '),
    controls: [
      { index: 0, tag: 'input', type: 'range', id: '', testId: '', label: 'Target', value: String(target), min: '-2', max: '3', step: '0.5', checked: false, pressed: null, selected: null, disabled: false },
      ...['Soft', 'Medium', 'Stiff'].map((label, index) => ({ index: index + 1, tag: 'button', type: 'button', id: '', testId: '', label, value: null, min: null, max: null, step: null, checked: null, pressed: label === spring ? 'true' : 'false', selected: null, disabled: false })),
    ],
    readouts: [words, ...[0, 4, 8, 12].map(String), `${spring} · ${words} · ${target > 0 ? `push ${pushWords} dial marks` : 'no push'}`].map((text, index) => ({ key: String(index), text, visible: true })),
    svgTexts: [0, 4, 8, 12].map(mark => {
      const radians = (-135 + 270 * mark / 12) * Math.PI / 180;
      return { seriesId: null, ownerTestId: 'press-push-dial', text: String(mark), x: 56 + 46 * Math.sin(radians), y: 50 - 46 * Math.cos(radians), dy: null, testId: '', painted: true, paintFailures: [] };
    }),
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
  it.each([12, 13, 16] as const)('keeps the %s-action queue state tied to the source timing and ceiling', size => {
    const frame = chunkFrame(size);
    expect(namedProblems('ChunkBuffer', frame)).toEqual([]);
    frame.readouts[1].text = size === 12 ? '12 per chunk · the arm never waits · 13 or more cover the wait' : `${size} per chunk · arm waits 2 of 50 ticks · 13 or more cover the wait`;
    expect(namedProblems('ChunkBuffer', frame).some(failure => failure.includes('readout 1'))).toBe(true);
  });

  it.each([
    ['reply timing', 'About 250 milliseconds per reply', 'About 20 milliseconds per reply'],
    ['clock demand', 'Needs 50 commands each second.', 'Needs 4 commands each second.'],
    ['rounding direction', 'Round up → 13 actions per reply cover the wait', 'Round down → 12 actions per reply cover the wait'],
    ['undisclosed model setting', 'Gemini Robotics does not publish its chunk length', 'Gemini Robotics publishes a chunk length of 16'],
    ['idle outcome', 'Fewer leave the arm idle.', 'Fewer still keep the arm moving.'],
  ])('rejects a Chunk %s mutation while original native values remain correct', (_name, before, after) => {
    const frame = chunkFrame(16);
    expect(namedProblems('ChunkBuffer', frame)).toEqual([]);
    frame.text = frame.text.replace(before, after);
    expect(namedProblems('ChunkBuffer', frame).some(failure => failure.includes('source label'))).toBe(true);
  });

  it.each(['direct answer', 'detail creates questions'])('rejects a wrong scene %s while native storage values and geometry stay unchanged', mutation => {
    const frame = sceneQuestionFrame();
    expect(namedProblems('SceneRepresentationLadder', frame)).toEqual([]);
    frame.text = mutation === 'direct answer'
      ? frame.text.replace('Grid of boxesCan the robot move here?', 'Grid of boxesWhat does it look like from here?')
      : frame.text.replace('Finer detail → more memory, the same questions', 'Finer detail → more memory, new kinds of questions');
    const failures = namedProblems('SceneRepresentationLadder', frame);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain('source label');
  });

  it.each([1, 10])('keeps %s-step exact-target error distinct from the accepted good-move area', steps => {
    const frame = empty(), error = steps === 1 ? '0.51' : '0.05';
    frame.controls = [{ index: 0, tag: 'input', type: 'range', id: '', testId: '', label: 'Refining steps, any number', value: String(steps), min: '1', max: '50', step: '1', checked: false, pressed: null, selected: null, disabled: false }];
    frame.text = 'Inside an outlined area counts as a good move. The small dot is its exact target; the readout measures distance to that dot.';
    frame.readouts = [String(steps), `Exact target-dot distance: ${steps} ${steps === 1 ? 'step' : 'steps'} average ${error}${steps === 1 ? '' : ' · one big jump averages 0.51'}`, String(steps), error].map((text, index) => ({ key: String(index), text, visible: true }));
    expect(namedProblems('FlowMatchingTrajectory', frame)).toEqual([]);
    frame.readouts[1].text = frame.readouts[1].text.replace('Exact target-dot distance', 'Distance outside the good-move area');
    expect(namedProblems('FlowMatchingTrajectory', frame).some(failure => failure.includes('readout 1'))).toBe(true);
    frame.readouts[1].text = frame.readouts[1].text.replace('Distance outside the good-move area', 'Exact target-dot distance').replace(`average ${error}`, 'average 0.00');
    expect(namedProblems('FlowMatchingTrajectory', frame).some(failure => failure.includes('readout 1'))).toBe(true);
  });

  it('binds Helix’s displayed controller roles and five-to-one rate relationship', () => {
    const frame = empty();
    frame.controls = [{ index: 0, tag: 'input', type: 'range', id: '', testId: '', label: 'Time on the clock', value: '25', min: '0', max: '100', step: '1', checked: false, pressed: null, selected: null, disabled: false }];
    frame.readouts = ['25', '25 milliseconds, 25 steps, 5 targets'].map((text, index) => ({ key: String(index), text, visible: true }));
    frame.text = "Helix 02 is the company Figure's system for controlling robots. Dark hand: 1,000 whole-body control steps each second; blue hand: 200 joint targets each second. 5 control steps for each new joint target.";
    expect(namedProblems('HelixClockwork', frame)).toEqual([]);
    frame.text = frame.text.replace('200 joint targets', '1,000 joint targets');
    expect(namedProblems('HelixClockwork', frame).some(failure => failure.includes('source label'))).toBe(true);
  });

  it('checks the press multiplication panel while the original push readout stays correct', () => {
    const frame = pressFrame(0.5);
    expect(namedProblems('ImpedancePress', frame)).toEqual([]);
    frame.text = frame.text.replace('= 1 Ruler:', '= 2 Ruler:');
    expect(frame.readouts[5].text).toBe('Medium · 0.5 marks past surface · push 1 dial marks');
    expect(namedProblems('ImpedancePress', frame).some(failure => failure.includes('Shown response The surface stops the tool. Surface'))).toBe(true);
  });

  it.each([
    ['Medium', -0.5, '0', 'no push'], ['Medium', 0, '0', 'no push'],
    ['Medium', 0.5, '1', 'push 1 dial marks'], ['Medium', 1.5, '3', 'push 3 dial marks'],
    ['Soft', 0.5, '0.5', 'push 0.5 dial marks'], ['Stiff', 0.5, '2', 'push 2 dial marks'],
    ['Medium', 2, '4', 'push 4 dial marks'], ['Medium', 1, '2', 'push 2 dial marks'],
    ['Stiff', 3, '12', 'push 12 dial marks'], ['Soft', -2, '0', 'no push'],
  ] as const)('keeps the independent spring-law output for %s at target %s', (spring, target, panelPush, readoutPush) => {
    const frame = pressFrame(target, spring);
    expect(namedProblems('ImpedancePress', frame)).toEqual([]);
    expect(frame.text).toContain(`= ${panelPush} Ruler:`);
    expect(frame.text).toContain(`push: ${panelPush} dial marks`);
    expect(frame.readouts[5].text.endsWith(` · ${readoutPush}`)).toBe(true);
  });

  it.each([
    ['controller pair', 'target +2 and stiffness 2.', 'one setting: target'],
    ['missing target', 'target +2 and stiffness 2.', 'one setting: stiffness'],
    ['controller destination', 'Controller: uses', 'Controller: ignores'],
    ['contact condition', 'Shown response The surface stops the tool. Surface', 'Shown response The tool pushes before contact. Surface'],
    ['chosen setting distinction', 'Action:', 'Actual shown settings'],
    ['action stiffness label', 'Action stiffness', 'Tool temperature'],
    ['stiffness definition', 'Stiffness sets how strongly the tool behaves like a spring.', 'Stiffness sets how fast the tool moves.'],
    ['gap key', 'Stopped tool Target level', 'Target level Stopped tool'],
    ['marked gap', 'Marked target gap: 2 ruler marks', 'Marked target gap: 3 ruler marks'],
    ['multiplication rule', '2 × 2 = 4', '2 + 2 = 4'],
    ['verbal product', 'push equals stiffness times target gap.', 'push equals stiffness plus target gap.'],
    ['named multiplication word', '× times target gap:', '× plus target gap:'],
    ['named equality word', '= equals push:', '= approximates push:'],
    ['named operand order', 'stiffness: 2 × times target gap: 2 ruler marks', 'target gap: 2 ruler marks × times stiffness: 2'],
    ['controller role', 'uses these settings to make the tool act like a spring.', 'uses these settings to make the tool perfectly rigid.'],
    ['scale meanings', 'Ruler: target gap. Dial: push.', 'Ruler: push. Dial: target gap.'],
    ['stiffness description', 'stiffness: 2', 'stiffness: 3'],
    ['gap description', 'target gap: 2 ruler marks', 'target gap: 1 ruler marks'],
    ['push description', 'push: 4 dial marks', 'push: 8 dial marks'],
    ['analogy qualification', 'Spring analogy: target gap', 'Measured robot force'],
    ['schematic units', 'Schematic ruler and dial marks, with no physical units', 'Measured newtons and metres, with physical units'],
    ['caption law', 'Once the surface stops the tool, push equals stiffness times how far the target sits past it.', 'Once the surface stops the tool, push equals stiffness times the target alone.'],
    ['method damping', 'the damping only acts while the tool moves.', 'the damping adds force even while the tool is still.'],
    ['spring ratio', 'four times as hard through the stiff spring', 'twice as hard through the stiff spring'],
    ['unit caveat', 'no force in newtons is claimed.', 'the dial shows measured force in newtons.'],
    ['source meaning', 'the controller makes the tool behave like a spring.', 'the controller makes the tool perfectly rigid.'],
  ])('rejects a press %s mutation with both numeric readouts unchanged', (_name, before, after) => {
    const frame = pressFrame(2);
    expect(namedProblems('ImpedancePress', frame)).toEqual([]);
    const readouts = structuredClone(frame.readouts);
    expect(frame.text).toContain(before);
    frame.text = frame.text.replace(before, after);
    expect(frame.readouts).toEqual(readouts);
    expect(namedProblems('ImpedancePress', frame).some(failure => failure.includes('source label'))).toBe(true);
  });

  it.each([-0.5, 0, 2])('rejects the wrong stage mechanism and gap key at target %s', target => {
    const frame = pressFrame(target), correct = frame.text;
    expect(namedProblems('ImpedancePress', frame)).toEqual([]);
    const explanation = target > 0 ? 'The surface stops the tool.' : target < 0 ? 'Before contact, the tool follows its target without pushing.' : 'No target gap means no push.';
    const key = target > 0 ? 'Stopped tool Target level' : 'Tool and target';
    frame.text = correct.replace(`${explanation}${key}`, `The tool pushes before contact.${key}`);
    expect(namedProblems('ImpedancePress', frame).some(failure => failure.includes('source label'))).toBe(true);
    frame.text = correct.replace(target > 0 ? 'Stopped tool Target level' : 'Tool and target ', target > 0 ? 'Tool and target' : 'Stopped tool Target level ');
    expect(namedProblems('ImpedancePress', frame).some(failure => failure.includes('source label'))).toBe(true);
  });

  it.each([-0.5, 0, 2])('binds the action-identity title to the native contact state at target %s', target => {
    const frame = pressFrame(target);
    expect(namedProblems('ImpedancePress', frame)).toEqual([]);
    const title = target > 0 ? 'This action sends target and stiffness for contact' : target < 0 ? 'This action sends target and stiffness before contact' : 'This action sends target and stiffness at the surface';
    const wrongTitle = target > 0 ? 'This action sends target and stiffness before contact' : 'This action sends target and stiffness for contact';
    const readouts = structuredClone(frame.readouts);
    frame.text = frame.text.replace(`Impedance action${title}`, `Impedance action${wrongTitle}`);
    expect(frame.readouts).toEqual(readouts);
    expect(namedProblems('ImpedancePress', frame).some(failure => failure.includes('source label Impedance action'))).toBe(true);
  });

  it.each([-0.5, 0])('rejects nonzero descriptor push at target %s while the equation and readout remain zero', target => {
    const frame = pressFrame(target);
    expect(namedProblems('ImpedancePress', frame)).toEqual([]);
    frame.text = frame.text.replace('push: 0 dial marks', 'push: 1 dial marks');
    expect(frame.text).toContain('2 × 0 = 0');
    expect(frame.readouts[5].text.endsWith(' · no push')).toBe(true);
    expect(namedProblems('ImpedancePress', frame).some(failure => failure.includes('source label Shown response'))).toBe(true);
  });

  it.each([-0.5, 0, 2])('binds the visible position condition and shown target independently of method text at %s', target => {
    const frame = pressFrame(target), correct = frame.text;
    expect(namedProblems('ImpedancePress', frame)).toEqual([]);
    const mainCondition = target > 0 ? 'The surface stops the tool.' : target < 0 ? 'Before contact, the tool follows its target without pushing.' : 'Tool and target meet the surface without pushing.';
    frame.text = correct.replace(`Shown response ${mainCondition} Surface`, 'Shown response The tool pushes before contact. Surface');
    expect(namedProblems('ImpedancePress', frame).some(failure => failure.includes('source label Shown response'))).toBe(true);
    const expectedTarget = frame.readouts[0].text;
    const wrongTarget = target === 0 ? '0.5 marks past surface' : 'on the surface';
    frame.text = correct.replace(`Shown target: ${expectedTarget}`, `Shown target: ${wrongTarget}`);
    expect(namedProblems('ImpedancePress', frame).some(failure => failure.includes('source label Surface'))).toBe(true);
    expect(frame.readouts[0].text).toBe(expectedTarget);
  });

  it('rejects a transient shown 2.9 frame when the native chosen target is 3', () => {
    // Deliberately contradictory synthetic input, never a captured observation.
    const frame = pressFrame(2.9, 'Stiff');
    frame.controls[0].value = '3';
    frame.readouts[0].text = '3 marks past surface';
    const failures = namedProblems('ImpedancePress', frame);
    expect(failures.some(failure => failure.includes('readout 5'))).toBe(true);
    expect(failures.some(failure => failure.includes('source label Surface'))).toBe(true);
  });


  it.each(['readout', 'label', 'x', 'y', 'owner', 'paint', 'dy', 'duplicate'] as const)('rejects a press dial %s mutation with native spring and target unchanged', mutation => {
    const frame = pressFrame(2), native = structuredClone(frame.controls);
    expect(namedProblems('ImpedancePress', frame)).toEqual([]);
    if (mutation === 'readout') frame.readouts[4].text = '13';
    if (mutation === 'label') frame.svgTexts[3].text = '13';
    if (mutation === 'x') frame.svgTexts[3].x! += 1;
    if (mutation === 'y') frame.svgTexts[3].y! += 1;
    if (mutation === 'owner') frame.svgTexts[3].ownerTestId = 'another-dial';
    if (mutation === 'paint') frame.svgTexts[3].painted = false;
    if (mutation === 'dy') frame.svgTexts[3].dy = '4';
    if (mutation === 'duplicate') frame.svgTexts.push(structuredClone(frame.svgTexts[3]));
    expect(frame.controls).toEqual(native);
    expect(namedProblems('ImpedancePress', frame).some(failure => mutation === 'readout' ? failure.includes('readout 4') : failure.includes('SVG label'))).toBe(true);
  });

  it.each([
    ['target', 'target +2 and stiffness 2.', 'target +3 and stiffness 2.'],
    ['stiffness', 'target +2 and stiffness 2.', 'target +2 and stiffness 4.'],
  ])('rejects wrong sent %s while native settings, product and original summary remain correct', (_name, correct, wrong) => {
    const frame = pressFrame(2), original = structuredClone(frame);
    expect(namedProblems('ImpedancePress', frame)).toEqual([]);
    frame.text = frame.text.replace(correct, wrong);
    expect(frame.controls).toEqual(original.controls);
    expect(frame.readouts).toEqual(original.readouts);
    expect(frame.text).toContain('2 × 2 = 4');
    expect(namedProblems('ImpedancePress', frame).some(failure => failure.includes('source label An action sends'))).toBe(true);
  });


  it.each(([-0.5, 0, 2] as const).flatMap(target => ['primary moved below natives', 'missing stopped-tool condition', 'obsolete lower law'].map(mutation => ({ target, mutation }))))('rejects R35 $mutation at native target $target while all measured vectors remain correct', ({ target, mutation }) => {
    const frame = pressFrame(target), native = structuredClone(frame.controls), readouts = structuredClone(frame.readouts), svg = structuredClone(frame.svgTexts);
    expect(namedProblems('ImpedancePress', frame)).toEqual([]);
    const primary = 'An action sends target and stiffness; once the surface stops the tool, push equals stiffness times target gap.';
    expect(frame.text).toContain(primary);
    if (mutation === 'primary moved below natives') frame.text = frame.text.replace(primary, 'Worked example.') + ' ' + primary;
    if (mutation === 'missing stopped-tool condition') frame.text = frame.text.replace('once the surface stops the tool, push equals stiffness times target gap.', 'push equals stiffness times target gap.');
    if (mutation === 'obsolete lower law') frame.text = frame.text.replace('↓ Shown calculation', '↓ push equals stiffness times target gap.');
    expect(frame.controls).toEqual(native);
    expect(frame.readouts).toEqual(readouts);
    expect(frame.svgTexts).toEqual(svg);
    expect(namedProblems('ImpedancePress', frame).some(failure => failure.includes('source label'))).toBe(true);
  });

  it('keeps the safety-filter explanation both least-change and conditional on safety', () => {
    const frame = empty();
    frame.controls = [{ index: 0, tag: 'input', type: 'range', id: '', testId: '', label: 'Along the stroke', value: '50', min: '0', max: '100', step: '1', checked: false, pressed: null, selected: null, disabled: false }];
    frame.readouts = ['50%', 'Filtering'].map((text, index) => ({ key: String(index), text, visible: true }));
    frame.text = 'no number is claimed. Safety filterThe simple filter gets checked; it guards each proposed move The simple safety filter is what engineers check. Learned controller proposes (trained from data) → Robot executes Safe move=The same move, unchanged Unsafe move→The smallest correction that stays outside the forbidden area';
    expect(namedProblems('SafetyFilterFence', frame)).toEqual([]);
    frame.text = frame.text.replace('Safe move=The same move, unchanged', 'Safe move=Corrected move');
    expect(namedProblems('SafetyFilterFence', frame).some(failure => failure.includes('source label'))).toBe(true);
  });

  it('requires the zero-event mileage labels and the qualified confidence meaning', () => {
    const frame = safety();
    expect(problems(frame)).toEqual([]);
    frame.readouts[0].text = '275 million; some deaths';
    expect(problems(frame).some(failure => failure.includes('readout fatalities'))).toBe(true);
    frame.readouts[0].text = '275 million; no death';
    frame.text = frame.text.replace('The true fatality rate remains unknown.', 'Every driverless car is proved safe.');
    expect(problems(frame).some(failure => failure.includes('source label'))).toBe(true);
  });

  it.each([
    ['hypothetical result', 'Calculated upper bound for this hypothetical run', 'Measured bound from an observed fleet'],
    ['posterior probability', 'The true fatality rate remains unknown.', 'The true fatality rate is below this bound with 95% probability.'],
    ['finite-batch guarantee', 'In the long run, at least 95 out of 100 upper bounds from studies of the same design would reach or exceed it.', 'Exactly 95 of the next 100 bounds are guaranteed to cover it.'],
    ['model assumption', 'independent miles with the same failure probability on every mile', 'dependent miles with changing failure probabilities'],
    ['rare-event direction', 'A higher fatality rate makes that result still less likely.', 'A higher fatality rate makes that result more likely.'],
  ])('rejects an AV %s mutation without changing any source-table value', (_name, before, after) => {
    const frame = safety();
    expect(problems(frame)).toEqual([]);
    frame.text = frame.text.replace(before, after);
    expect(problems(frame).some(failure => failure.includes('source label'))).toBe(true);
  });

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
