import type { SourceBasis, SourceOracle, SourceOracleContext } from './brand-v2-source-oracle-core.ts';
import { DATASETS } from '../data/datasets.ts';
import { HARDWARE } from '../data/hardware.ts';
import { TELEOP_RIGS } from '../data/teleop-rigs.ts';
import { METHODS } from '../data/methods.ts';
import { citationLabel, getCitation } from '../data/citations.ts';
import { DEPLOYMENT_ROWS } from './deployment-reality.ts';
import { DEXTEROUS_HANDS, TRAINING_BET_LABEL } from './dexterous-hands.ts';
import { MILESTONES } from './bear-case.ts';
import { THESES } from './competing-theses.ts';
import { GENERALIST_RELEASES } from './generalist-policies.ts';
import { PI_GENERATIONS } from './pi-generations.ts';
import { PRACTICE } from './excavator-practice.ts';
import { RACING_CONTESTS, CHAMPIONS_SOURCES } from './drone-racing-champions.ts';
import { FUNDING_BY_YEAR, HUMANOID_COUNTS, FUNDING_HUMANOID_SOURCES, FUNDING_PARTIAL_UNTIL } from './funding-humanoid-counts.ts';
import { SAFETY_RULES, SAFETY_RULE_SOURCES } from './safety-rules-timeline.ts';
import { AUTONOMY_LEVELS, LADDER_ENTRIES, LADDER_SOURCES } from './surgical-autonomy-ladder.ts';
import { LADDER_POINTS, LADDER_ROWS } from './hardware-price-ladder.ts';
import { GR2_RESULTS } from './wbc-decomposition.ts';
import { TILE_PATHS } from '../components/iso/figures/gpu-test-bench.ts';
import {
  MODEL_BASED_LOOP, MODEL_BASED_LOOP_SOURCES, EVALUATION_RUNGS, EVALUATION_LADDER_SOURCES,
  SIMFOUNDRY_EVALUATION, WORLD_MODEL_OUTPUT_TIMES, WORLD_MODEL_OUTPUT_SOURCES,
} from './world-model-figures.ts';

const citations = (ids: readonly string[], reference: string): SourceBasis[] => ids.map(id => ({ id, kind: 'citation', reference }));
const assumption = (component: string, id: string, reference: string): SourceBasis => ({ id: `assumption:${component}:${id}`, kind: 'assumption', reference });
const rounded = (value: number, digits = 2) => Number(value.toFixed(digits));
const componentPath = (name: string) => `components/interactive/${name}.tsx`;
const crossPath = (x: number, y: number, radius = 2.5) => `M${x - radius} ${y - radius} L${x + radius} ${y + radius} M${x - radius} ${y + radius} L${x + radius} ${y - radius}`;
const exact = (text: string) => new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
const count = (value: number | null, note?: string) => value === null ? 'not disclosed' : `${value.toLocaleString('en-US')}${note ?? ''}`;
const dollars = (value: number) => `$${value.toLocaleString('en-US')}`;
const source = (id: string) => { const value = getCitation(id); if (!value) throw new Error(`Unknown source ${id}`); return value; };
const milestoneNames: Readonly<Record<string, string>> = {
  'unseen-homes-policy': 'One robot brain completes over 90% of fixed tasks across more than 10 new homes',
  'ten-thousand-unit-deployment': '10,000 humanoids doing documented work',
  'open-benchmark': 'Labs agree on one shared public test',
  'broad-rl-reliability': 'Practice gets robots to 99% on many tasks',
  'tactile-foundation-model': 'Touch sensing built into the robot’s brain',
  'sim-to-real-contact': 'Hand skills learned only in simulation work for real',
  'cost-per-task-parity': 'A humanoid matches a specialist machine’s cost per job',
  'data-scaling-law': '100 times more data; measure the gain in task success (required gain not specified)',
};
const thesisNames: Readonly<Record<string, string>> = {
  'end-to-end-vla': 'Just make it bigger', 'hierarchical-planner': 'A planner directs simple skills',
  'world-model-training': 'Let the robot imagine first', 'rl-finetuning': 'Copy first, then practise',
  'teleop-bridge': 'Humans steer while robots learn', 'form-factor': 'Human-shaped or built for the job',
};
function choice<T extends string>(c: SourceOracleContext, options: Readonly<Record<T, string>>, group?: string): T {
  const selected = Object.entries<string>(options).filter(([, label]) => c.selected(exact(label), group ? { group } : undefined));
  if (selected.length !== 1) throw new Error(`Expected one selected ${group ?? 'option'}, found ${selected.length}`);
  return selected[0][0] as T;
}

/** Independent metric anchor for the corridor gauge. The drawing contract
 * fixes a 640-wide orthographic view (azimuth120°, elevation30°), twelve-unit
 * margins and a20-unit/metre ruler. We fit the documented scene extremes
 * with elementary linear projection, then project the top cap of each
 * distance slab. No production projection, slab or scale helper is called. */
export function corridorGaugeTop(blindMetres: number, swerve: boolean): string {
  const reach = 25 * Math.SQRT2 + 16;
  const bounds: number[][] = [];
  for (const x of [-96, 204]) for (const y of [-74, 136]) for (const z of [-14, 0]) bounds.push([x, y, z]);
  bounds.push([160, -reach - 8, 103], [160, 8, 103], [-94, -70, 101], [156, -70, 101], [0, -59, 52], [-22 - reach, -reach, 84], [160 + reach, 8 + 2 * reach, 84]);
  const azimuth = 2 * Math.PI / 3, elevation = Math.PI / 6;
  const flat = ([x, y, z]: number[]) => [x * Math.sin(azimuth) - y * Math.cos(azimuth), (x * Math.cos(azimuth) + y * Math.sin(azimuth)) * Math.sin(elevation) - z * Math.cos(elevation)];
  const projected = bounds.map(flat), xs = projected.map(point => point[0]), ys = projected.map(point => point[1]);
  const left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys);
  const height = Math.ceil(616 * (bottom - top) / (right - left) + 24), scale = Math.min(616 / (right - left), (height - 24) / (bottom - top));
  const origin = [320 - (left + right) * scale / 2, height / 2 - (top + bottom) * scale / 2];
  const blind = Math.max(1, blindMetres * 20), remaining = Math.max(1, (8 - blindMetres) * 20);
  const x = swerve ? blind + 0.5 : 0, y = 110.6, width = swerve ? Math.max(0.5, remaining - 0.5) : blind - 0.5, depth = 11, radius = Math.min(1, width / 2, depth / 2);
  const corners = [[x + width - radius, y + radius, -90], [x + width - radius, y + depth - radius, 0], [x + radius, y + depth - radius, 90], [x + radius, y + radius, 180]];
  const points = corners.flatMap(([cx, cy, start]) => [0, 45, 90].map(offset => {
    const angle = (start + offset) * Math.PI / 180, p = flat([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle), 3.8]);
    return p.map((value, i) => Math.round((origin[i] + value * scale) * 10) / 10);
  }));
  return points.map(([px, py], i) => `${i ? 'L' : 'M'}${px} ${py}`).join('') + 'Z';
}

/** Canonical source records enter as expectations; measured browser output
 * is only accessible through the bounded comparison context. Each catalog
 * entry covers its full table, readouts and attributed quantitative marks. */
export const DATA_SOURCE_ORACLES: Readonly<Record<string, SourceOracle>> = {
  'interactive:ActionConditioning': {
    basis: [assumption('ActionConditioning', 'authored-action-futures', 'Toy start (0.5,0.12); left/right/lift endpoints (0.2,0.12)/(0.8,0.12)/(0.5,0.72). Strong blend1, weak blend0.04 toward intent(0.3,0.4); four evenly spaced futures. Sensitivity is mean Euclidean future separation; realism is authored constant0.91.')],
    evidencePaths: ['lib/action-conditioning.ts', componentPath('action-conditioning')],
    check(c) {
      const options = { left: 'Push left', right: 'Push right', lift: 'Lift gripper' };
      const a = choice(c, options, 'First command'), b = choice(c, options, 'Second command');
      const strength = c.selected(/^Listens to the action$/) ? 1 : 0.04;
      const ends = { left: [0.2, 0.12], right: [0.8, 0.12], lift: [0.5, 0.72] };
      // The mean ramp share is (1/4 + 2/4 + 3/4 + 4/4) / 4.
      const score = rounded(Math.hypot(ends[a][0] - ends[b][0], ends[a][1] - ends[b][1]) * strength * 0.625, 3);
      const phase = c.sourceState('data-source-frame');
      if (phase === 'rest') c.readoutNumbers(0, [score, 0.91]);
      else {
        const frame = Number(phase);
        if (!Number.isInteger(frame) || frame < 0 || frame > 4) throw new Error('Invalid observed toy playhead');
        c.readoutNumbers(0, frame === 0 ? [0.91] : [frame, 4, 0.91]);
      }
      c.readoutWhere({ key: /^sensitivity-readout$/ }, [score]); c.readoutWhere({ key: /^realism-readout$/ }, [0.91]);
      c.contains('The futures are hand-set for this toy, not produced by a trained video model');
    },
  },
  'interactive:ExcavatorPractice': {
    basis: [...citations(['excavator-mbrl-2026'], 'Canales et al. Fig.5 qualitative3/10/20-minute checkpoints and TableII:2.7cm timed tracking at20minutes; all three40-minute objectives have sub-centimetre contour error.'), assumption('ExcavatorPractice', 'illustrative-yard', 'The yard path and3/10-minute errors and model spread are authored illustrations. The playhead reports the current normalized trace progress, not an extra measured robot outcome.')],
    citationText: { 'excavator-mbrl-2026': 'Canales, Nan, Hutter and Ruiz-del-Solar (2026), Fig. 5 and Table II.' },
    evidencePaths: ['lib/excavator-practice.ts', componentPath('excavator-practice')],
    check(c) {
      const selected = PRACTICE.filter(row => c.selected(exact(row.label)));
      if (selected.length !== 1) throw new Error('Expected one excavator checkpoint');
      const s = Number(c.sourceState('data-source-progress')), tracing = c.sourceState('data-source-tracing');
      if (!Number.isFinite(s) || s < 0 || s > 1 || !['true', 'false'].includes(tracing)) throw new Error('Invalid observed excavator trace state');
      c.readoutText(0, tracing === 'true' ? `${selected[0].minutes} minutes · tracing, ${Math.round(s * 100)}% of the path` : selected[0].reads);
      c.contains(`Learning on the machine${selected[0].id === 'twenty' ? 'Arm model: 20 minutes matches 100 to 150 minutes’ practice' : selected[0].reads.replace(' · ', ': ')}`);
      c.contains('20 minutes the shovel tracked its timed path 2.7 cm off on average, against 2.8 and 4.5 cm');
      c.contains('100 to 150 minutes');
    },
  },
  'interactive:PerceptionLatency': {
    basis: [...citations(['falanga-latency-2019'], 'Sense-and-avoid Eq.9 v = 8/(tau + 2sqrt(0.75/u)); controls select lateral acceleration10/25/50/200m/s². The equality case has zero margin.'), assumption('PerceptionLatency', 'illustrative-rig', 'The carriage and drone are an authored illustration. The two gauge slabs encode the actual blind and avoidance distances on the same 8m corridor scale.')],
    citationText: { 'falanga-latency-2019': 'Model and reference latencies from Falanga, Kim and Scaramuzza (2019).' },
    evidencePaths: ['lib/aerial-latency.ts', componentPath('perception-latency'), 'components/iso/figures/latency-corridor.ts'],
    seriesIds: ['perception-latency', 'avoidance-maneuver'],
    check(c) {
      const ms = c.input(/^Camera delay/), agility = Number(choice(c, { '10': 'Gentle', '25': 'Standard (the study’s)', '50': 'Hard', '200': 'Extreme' }));
      const avoid = 2 * Math.sqrt(0.75 / agility), ttc = ms / 1000 + avoid, v = 8 / ttc, blind = v * ms / 1000, swerve = 8 - blind;
      c.readoutNumbers(0, [Math.round(v * 3.6), rounded(blind, 1), rounded(swerve, 1)]);
      c.readoutNumbers(1, [ms]); c.readoutNumbers(2, ms === 70 || ms === 12 ? [Math.round(v * 3.6)] : [ms, Math.round(v * 3.6)]);
      c.readoutWhere({ key: /^latency-readout$/ }, [ms]); c.readoutWhere({ key: /^avoid-readout$/ }, [Math.round(1000 * avoid)]);
      c.readoutWhere({ key: /^ttc-readout$/ }, [Math.round(1000 * ttc)]); c.readoutWhere({ key: /^max-speed-readout$/ }, [rounded(v)]);
      for (const [id, other] of [['perception-latency', false], ['avoidance-maneuver', true]] as const) {
        c.svgMarkCount(id, 'path', 8);
        c.svgMark(id, 'path', { d: corridorGaugeTop(blind, other), class: 'iso-top' });
      }
    },
  },
  'interactive:CollaborativeOperationModes': {
    basis: [...citations(['marvel-norcross-2017'], 'NIST-authored paper’s early-draft linear separation expression, with deliberately authored teaching settings.'), assumption('CollaborativeOperationModes', 'teaching-parameters', 'TR=.1s, deceleration10m/s², margin .85+.1m, available separation1.6m. Impact F=v sqrt(25000×4); limit255N is Han2024 thigh transient75th-percentile research pain threshold, not certified safe operating guidance.')],
    citationText: { 'marvel-norcross-2017': 'Separation formula as restated by Marvel and Norcross' },
    evidencePaths: ['lib/safety-modes.ts', 'lib/force-limits.ts', componentPath('collaborative-operation-modes')],
    check(c) {
      const mode = choice(c, { stop: 'Stops when you step in', guide: 'You guide it by hand', separation: 'Keeps its distance', force: 'Gentle enough to bump' });
      const v = c.input(/^Robot speed,/), human = c.input(/^Your walking speed/), phase = c.sourceState('data-source-phase');
      const terms = [human * (0.1 + v / 10), v * 0.1, v * v / 20, 0.95], separation = terms.reduce((a, b) => a + b, 0), force = v * Math.sqrt(100000);
      const words = (value: number, digits: number, suffix: string) => `${rounded(value, digits)} ${rounded(value, digits) === 1 ? 'metre' : 'metres'}${suffix}`;
      const speed = (value: number, at: number, gloss: string) => value === 0 ? 'standing still' : words(value, 2, ` a second${value === at ? `, ${gloss}` : ''}`);
      c.readoutText(0, speed(v, 1, 'a slow walk')); c.readoutText(2, speed(human, 1.6, 'a brisk walk'));
      let stage = '';
      if (mode === 'separation') {
        c.readoutText(1, separation <= 1.6 ? `At this speed the robot needs a gap of about ${words(separation, 1, '')}; you are 1.6 metres away, so it keeps working.` : `At this speed the robot needs a gap of about ${words(separation, 1, '')}, more than the 1.6 metres to you, so it stops.`);
        const phases: Record<string, string> = { rest: `needs ${separation.toFixed(2)} m, you stand at 1.60 m`, setup: 'you step back out of its zone', walk: human > 0 ? 'you walk in, it keeps working' : 'you stand still, it keeps working', work: 'you stand still, it keeps working', react: 'you cross the edge, it reacts', brake: 'it brakes, you keep walking', stopped: human > 0 ? 'stopped, 0.95 m left between you' : 'it stays stopped while you stand in its zone' };
        stage = phases[phase] ?? '';
        c.readoutWhere({ key: /^separation-readout$/ }, [rounded(separation)]);
        ['human', 'reaction', 'braking', 'margin'].forEach((term, i) => c.readoutWhere({ key: exact(`term-${term}`) }, [rounded(terms[i])]));
      } else if (mode === 'force') {
        c.readoutText(1, force <= 255 ? 'A bump at this speed stays under the safe limit, so the robot may touch you.' : 'A bump at this speed would push harder than the safe limit, so this mode is not allowed until the robot slows down.');
        stage = phase === 'setup' ? 'it backs off to its fixture' : phase === 'approach' ? `it moves toward you at ${v === 0 ? 'standing still' : words(v, 2, ' a second')}` : `a bump pushes ${Math.round(force)} newtons, the limit is 255: ${force <= 255 ? 'gentle enough' : 'too hard'}`;
        c.readoutWhere({ key: /^force-readout$/ }, [Math.round(force)]); c.readoutWhere({ key: /^force-limit-readout$/ }, [255]);
        c.readoutWhere({ key: /^force-limited-speed$/ }, [rounded(255 / Math.sqrt(100000))]);
        c.contains('research basis: 75th-percentile force pain threshold, Han 2024');
      } else {
        c.readoutText(1, mode === 'stop' ? 'The robot stands still while you are in the cell, so no gap or force limit applies.' : 'The robot moves only while you guide it, so no gap or force limit applies.');
        const phases: Record<string, string> = mode === 'guide' ? { push: 'you push its handle, it follows', held: 'you stop pushing, it holds still', rest: 'it moves only while you guide it' } : { out: 'you walk out, it holds still', work: 'you are outside the cell, it works', in: 'you walk back in', brake: 'you step into the cell, it stops', stopped: 'you are inside the cell, it holds still', rest: 'you are inside the cell, it holds still' };
        stage = phases[phase] ?? '';
        c.readoutWhere({ key: /^stated-readout$/ }, []);
      }
      if (!stage) throw new Error(`Uncovered collaborative-cell phase ${mode}/${phase}`);
      c.readoutText(3, stage);
    },
  },
  'interactive:CalibrationChain': {
    basis: [...citations(['humanoid-geometric-calibration-2025', 'omnicalib-2026', 'khoshelham-kinect-2012'], 'Three independently sourced calibration results on different robots/sensors. These are not summed into one robot error budget.'), assumption('CalibrationChain', 'frame-graph', 'The drawn robot and arrows are a qualitative frame graph; numeric measurements are only the source-scoped table entries.')],
    evidencePaths: [componentPath('calibration-chain')], seriesIds: ['robot-links', 'camera-links'],
    nonQuantitative: 'Frame/arrow coordinates have no metric meaning. The complete quantitative calibration table and its source scope are checked separately.',
    check(c) {
      c.row('robot base to wrist', { 'what sets it': 'joint readings and link lengths', 'measured error': 'RMS error cut 2.3-fold by calibration' });
      c.row('wrist to camera', { 'what sets it': 'hand-eye calibration', 'measured error': 'up to 10.56 mm and 1.74 degrees from CAD' });
      c.row('camera to box', { 'what sets it': 'what the camera measures (depth)', 'measured error': 'random depth error up to about 4 cm' });
      c.row('wrist to hand', { 'what sets it': 'tool offset', 'measured error': 'no sourced error; checked by touching one point from several angles' });
      c.contains('31 chosen postures'); c.contains("not one robot's error budget");
    },
  },
  'interactive:GeneralistReleaseTimeline': {
    basis: [assumption('GeneralistReleaseTimeline', 'canonical-release-records', 'Canonical source months, provenance and weight availability are independently projected on a January 2025–August 2026 axis; filtering fades excluded records and retains all rows. The selected card retains its original source.')],
    evidencePaths: ['lib/generalist-policies.ts', componentPath('generalist-release-timeline')],
    seriesIds: GENERALIST_RELEASES.map(row => row.id),
    check(c) {
      const filter = choice(c, { all: 'All', open: 'Downloadable', closed: 'Not downloadable', unknown: 'Not disclosed' }, 'Filter by weight availability');
      const sourceType = c.selected(/^Show source type$/);
      const selectedId = c.sourceState('data-source-selected');
      const selected = GENERALIST_RELEASES.find(row => row.id === selectedId);
      if (!selected) throw new Error('Unknown selected release');
      c.sourceLink(source(selected.citationId).url);
      // Independently spelled reader glosses preserve the Helix announcement's limited download scope.
      if (selected.citationId === 'helix-2025') {
        c.contains('Figure reports two connected parts: S2 represents the task; S1 uses that information, images and robot measurements, including joint positions, to control wrists, fingers, torso and head and report task completion.');
        c.contains('The February 20, 2025 announcement identifies a downloadable picture-and-language model; it does not establish a download or licence for Helix’s trained movement controller.');
      } else {
        c.contains(selected.capability);
        if (selected.weightsNote) c.contains(selected.weightsNote);
      }
      const available = (v: boolean | null) => v === null ? 'not disclosed' : v ? 'downloadable' : 'not downloadable';
      const tierLabel = { paper: 'paper (arXiv)', docs: 'repo release notes', blog: 'lab blog, vendor-reported', press: 'press release, vendor-reported' };
      if (sourceType) c.legendEncoding(Object.fromEntries(Object.entries(tierLabel).map(([tier, label]) => [label, GENERALIST_RELEASES.filter(row => row.provenance === tier).map(row => row.id)])), {
        'paper (arXiv)': { tag: 'circle' }, 'repo release notes': { tag: 'rect' },
        'lab blog, vendor-reported': { tag: 'polygon', vertices: 3 }, 'press release, vendor-reported': { tag: 'polygon', vertices: 4 },
      });
      c.tablePopulation([{ headers: ['Model', 'Maker', 'Month', 'Weights', 'Source type'], rows: GENERALIST_RELEASES.map(row => row.name) }]);
      // The annotation target adds one circle; the provenance legend adds its own paper swatch.
      c.circleCount((sourceType ? GENERALIST_RELEASES.filter(row => row.provenance === 'paper').length + 1 : GENERALIST_RELEASES.length) + 1);
      const visible = GENERALIST_RELEASES.filter(row => filter === 'all' || (filter === 'unknown' ? row.openWeights === null : row.openWeights === (filter === 'open')));
      c.contains(`in full${visible.length} of ${GENERALIST_RELEASES.length}`);
      for (const year of [2025, 2026]) c.svgText(null, String(year), rounded(146 + (year - 2025) * 12 * 184 / 19), 46 + GENERALIST_RELEASES.length * 22 + 20);
      GENERALIST_RELEASES.forEach((row, i) => {
        c.row(row.name, { Maker: row.org, Month: row.dateLabel, Weights: available(row.openWeights), 'Source type': tierLabel[row.provenance] });
        const [year, month] = row.released.split('-').map(Number), x = rounded(146 + ((year - 2025) * 12 + month - 1) * 184 / 19), y = 57 + i * 22;
        const fill = row.openWeights ? 'var(--role-measurement-stage)' : 'none';
        const tier = sourceType ? row.provenance : 'paper';
        c.rectCount(row.id, tier === 'docs' ? 2 : 1);
        c.rect(row.id, 0, y - 11, 340, 22);
        if (tier === 'paper') { c.svgMarkCount(row.id, 'circle', 1); c.svgMark(row.id, 'circle', { cx: x, cy: y, r: 3.5, fill }); }
        else if (tier === 'docs') { c.svgMarkCount(row.id, 'rect', 2); c.rect(row.id, rounded(x - 3.5), rounded(y - 3.5), 7, 7); c.svgMark(row.id, 'rect', { x: rounded(x - 3.5), y: rounded(y - 3.5), width: 7, height: 7, fill }); }
        else { c.svgMarkCount(row.id, 'polygon', 1); c.svgMark(row.id, 'polygon', { points: tier === 'blog' ? `${x},${y - 4.5} ${rounded(x + 4.5)},${y + 3.5} ${rounded(x - 4.5)},${y + 3.5}` : `${x},${y - 4.5} ${rounded(x + 4.5)},${y} ${x},${y + 4.5} ${rounded(x - 4.5)},${y}`, fill }); }
        c.svgText(row.id, row.name, 2, y);
      });
    },
  },
  'interactive:PiGenerationTimeline': {
    basis: citations(PI_GENERATIONS.map(row => row.citationId), 'Canonical source-publication months and pinned openpi catalogue status. An unverified MEM month stays unplotted; missing catalogue entries do not establish closed licensing.'),
    evidencePaths: ['lib/pi-generations.ts', componentPath('pi-generation-timeline')],
    check(c) {
      const selected = PI_GENERATIONS.filter(row => c.selected(exact(row.name)));
      if (selected.length !== 1) throw new Error('Expected one selected PI model');
      c.contains(selected[0].plain);
      c.contains('MEM adds memory: recent video plus notes the model writes for itself.');
      c.contains("Physical Intelligence's modelsNew model every few months; downloads confirmed for first three");
      c.contains("Physical Intelligence's releases A new model every few months Confirmed downloads Only the first three models Later models' availability is unverified.");
      const dated = PI_GENERATIONS.filter(row => row.released !== null), months = [...new Set(dated.map(row => row.released!))];
      const xAt = (ym: string) => { const [year, month] = ym.split('-').map(Number); return rounded(12 + ((year - 2024) * 12 + month - 1 - 8) * 316 / 21); };
      c.requireSeries([...months, 'downloadable']);
      c.circleCount(months.length + (selected[0].released === null ? 0 : 1));
      months.forEach(month => {
        const x = xAt(month), picked = month === selected[0].released;
        c.svgMarkCount(month, 'circle', picked ? 2 : 1);
        c.point(`source month ${month}`, x, 8, 3.5);
        if (picked) c.point(`selected month ${month}`, x, 8, 6.5);
        c.svgText(month, ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(month.slice(-2)) - 1], x, 30);
      });
      for (const year of [2024, 2025, 2026]) {
        const from = Math.max(12, xAt(`${year}-01`)), to = Math.min(328, xAt(`${year + 1}-01`));
        c.svgText(null, String(year), rounded((from + to) / 2), 49);
      }
      const open = dated.filter(row => row.openWeights === true);
      c.svgMarkCount('downloadable', 'path', 1); c.svgMark('downloadable', 'path', { d: `M${xAt(open[0].released!)} 57 V61 H${xAt(open.at(-1)!.released!)} V57` });
      c.tablePopulation([{ headers: ['Model', 'Source month', 'Weights', 'Architecture', 'Contribution', 'Source'], rows: PI_GENERATIONS.map(row => row.name) }]);
      PI_GENERATIONS.forEach(row => c.row(row.name, { 'Source month': row.dateLabel, Weights: row.openWeights === null ? 'unverified' : row.openWeights ? 'downloadable' : 'unavailable', Architecture: row.backbone, Contribution: row.contribution, Source: citationLabel(source(row.citationId)) }));
    },
  },
  'interactive:DeploymentDashboard': {
    basis: [assumption('DeploymentDashboard', 'canonical-records', 'The frozen deployment-reality records retain company-reported scope and date. Reported hours use a logarithmic 1–100000-hour scale; construction status has no invented zero-hour bar.')],
    evidencePaths: ['lib/deployment-reality.ts', componentPath('deployment-dashboard')],
    check(c) {
      const filter = choice(c, { all: 'All', verified: 'Backed by a company document', claimed: 'Demo only' });
      const rows = DEPLOYMENT_ROWS.filter(row => filter === 'all' || row.status === filter);
      c.tablePopulation([{ headers: ['Program', 'Value', 'What backs it', 'Source'], rows: rows.map(row => row.program + row.detail) }]);
      c.readoutNumbers(0, [rows.length, DEPLOYMENT_ROWS.length]);
      const hours = rows.filter(row => Number.isFinite(Number.parseFloat(row.value.replace(/,/g, ''))));
      c.htmlMarkCount(hours.length);
      for (const row of rows) {
        c.row(row.program + row.detail, { Value: row.value + row.metric, 'What backs it': row.status === 'verified' ? 'Backed by a company document' : 'Demo only', Source: row.sourceLabel + row.asOf });
        c.sourceLink(source(row.sourceId).url);
        if (hours.includes(row)) {
          c.htmlBar(`deployment-bar-${row.id}`, rounded(Math.log10(Number.parseFloat(row.value.replace(/,/g, ''))) * 20) / 100, 0.0005);
          c.contains(`${row.id === 'figure-8hr-shift' ? 'Figure Helix 02: one task streamed live' : row.program}${/hours?$/.test(row.value) ? row.value : `${row.value} hours`}`);
        } else c.contains(`${row.program}No work hours; robot production lines being built`);
      }
    },
  },
  'interactive:HandComparison': {
    basis: citations([...new Set(DEXTEROUS_HANDS.flatMap(row => [row.sourceId, ...(row.secondarySourceId ? [row.secondarySourceId] : [])]))], 'Source-backed hand specifications retain source dates, tactile units, unknowns and whole-robot price caveat. Hand-price sorting excludes a robot price.'),
    evidencePaths: ['lib/dexterous-hands.ts', componentPath('hand-comparison')],
    check(c) {
      const sort = c.tableSort();
      const labels: Record<string, Record<string, string>> = { DoF: { ascending: 'fewest ways to move first', descending: 'most ways to move first' }, 'Tactile threshold': { ascending: 'lightest touch felt first', descending: 'lightest touch felt last' }, Cost: { ascending: 'lowest hand price first', descending: 'highest hand price first' } };
      if (!labels[sort.column]?.[sort.direction]) throw new Error('Unrecognized hand sort dimension');
      const selected = DEXTEROUS_HANDS.filter(row => c.selected(exact(`Select ${row.name} for comparison`)));
      c.readoutText(0, `${DEXTEROUS_HANDS.length} hands, ${labels[sort.column][sort.direction]}${selected.length ? `, ${selected.length} selected` : ''}`);
      c.tablePopulation([{ headers: ['Hand', 'DoF', 'Tactile threshold', 'Cost', 'Training bet', 'Source'], rows: DEXTEROUS_HANDS.map(row => `${row.name}${row.maker} · ${row.actuation}`) }]);
      for (const row of DEXTEROUS_HANDS) {
        c.row(`${row.name}${row.maker} · ${row.actuation}`, { DoF: row.dofDisplay, 'Tactile threshold': row.tactileDisplay === null ? 'not disclosed' : row.tactileDisplay + (row.tactileNote ?? ''), Cost: row.costDisplay === null ? 'not disclosed' : row.costDisplay + (row.costNote ?? ''), 'Training bet': TRAINING_BET_LABEL[row.bet], Source: row.sourceLabel + (row.secondarySourceLabel ?? '') + row.asOf });
        if (selected.includes(row)) c.contains(row.tradeoff);
        const touch = row.tactileDisplay === null ? 'not disclosed' : row.id === 'sanctuary-phoenix' ? 'about half a gram' : row.id === 'figure-02-03' ? '3 grams' : row.tactileDisplay;
        const price = row.costNote === 'whole robot' ? `not disclosedWhole robot: ${row.costDisplay}` : row.costDisplay ?? 'not disclosed';
        c.contains(`${row.name}${row.maker}Joint motions${row.dofDisplay.replace('-', ' to ')}Lightest touch felt${touch}Price of the hand${price}`);
      }
      c.contains('Whole robot: $29,900');
    },
  },
  'interactive:MilestonesWatchlist': {
    basis: [...citations([...new Set(MILESTONES.flatMap(row => row.citationIds))], 'Each milestone status is an editorial judgment on the retained cited evidence, with its own falsifiable criterion.'), assumption('MilestonesWatchlist', 'status-tally', 'The displayed total and partly/not-yet/done tallies count the canonical eight milestone records, not robot performance.')],
    evidencePaths: ['lib/bear-case.ts', componentPath('milestones-watchlist')],
    check(c) {
      const done = MILESTONES.filter(row => row.status === 'met').length;
      const filter = choice(c, { all: 'All', 'not-met': 'Not yet', partial: 'Partly', met: `Done (${done})` });
      const rows = MILESTONES.filter(row => filter === 'all' || row.status === filter);
      const selected = rows.filter(row => c.selected(exact(milestoneNames[row.id])));
      if (selected.length > 1) throw new Error('More than one selected milestone');
      const status = { 'not-met': 'Not yet', partial: 'Partly there', met: 'Done' };
      const shown = filter === 'all' ? `Showing all ${MILESTONES.length}` : `Showing ${rows.length} of ${MILESTONES.length}: ${status[filter].toLowerCase()}`;
      c.readoutText(0, shown + (selected[0] ? `, open: ${milestoneNames[selected[0].id]}` : ''));
      c.contains(`September 2026: ${done} of ${MILESTONES.length} done`);
      c.contains(`${MILESTONES.filter(row => row.status === 'partial').length} partly there, ${MILESTONES.filter(row => row.status === 'not-met').length} not yet, ${done} done`);
      c.tablePopulation([{ headers: ['Milestone', 'Why it matters', 'Status', 'Evidence', 'How we’d know'], rows: MILESTONES.map(row => row.name + milestoneNames[row.id]) }]);
      for (const row of MILESTONES) c.row(row.name + milestoneNames[row.id], { 'Why it matters': row.whyItMatters, Status: status[row.status], Evidence: row.statusDetail, 'How we’d know': row.howWeKnow });
      if (!rows.length) c.contains('None of the eight milestones has reached this status yet.');
    },
  },
  'interactive:ThesisExplorer': {
    basis: [assumption('ThesisExplorer', 'editorial-taxonomy', 'The six competing-theses records are an authored grouping, not a published taxonomy. Their claims, named proponents, falsification criteria and the sources actually exposed by selection must retain the canonical text.')],
    evidencePaths: ['lib/competing-theses.ts', componentPath('thesis-explorer')],
    check(c) {
      const selected = THESES.filter(row => c.selected(exact(thesisNames[row.id])));
      if (selected.length > 1) throw new Error('More than one selected thesis');
      c.readoutText(0, selected[0] ? `${THESES.length} bets, showing: ${thesisNames[selected[0].id]}` : `${THESES.length} bets. Tap one to read the evidence for and against.`);
      c.tablePopulation([{ headers: ['Thesis', 'Proponents', 'Falsified if', 'Full criterion'], rows: THESES.map(row => row.name + thesisNames[row.id] + row.claim) }]);
      for (const row of THESES) c.row(row.name + thesisNames[row.id] + row.claim, { Proponents: row.proponents.join('; '), 'Falsified if': row.falsificationSignal, 'Full criterion': row.falsification });
      for (const row of selected) for (const evidence of [...row.evidenceFor, ...row.evidenceAgainst]) {
        c.contains(evidence.text); evidence.citationIds.forEach(id => c.sourceLink(`#ref-${id}`));
      }
    },
  },
  'interactive:DatasetTable': {
    basis: [assumption('DatasetTable', 'canonical-catalog', 'The audited data/datasets.ts records are the canonical source inputs. Exact source URLs, notes, unknown values and conjunctive numeric filter buckets are checked for each visible record.')],
    evidencePaths: ['data/datasets.ts', componentPath('dataset-table')],
    check(c) {
      const size = choice(c, { all: 'All sizes', small: 'Under 100k episodes', medium: '100k-1M episodes', large: '1M+ episodes', unknown: 'Unknown size' });
      const body = choice(c, { all: 'All platforms', single: 'Single platform', multi: 'Multi-platform' });
      const tasks = choice(c, { all: 'All task counts', small: 'Under 100 tasks', medium: '100-1,000 tasks', large: '1,000+ tasks', unknown: 'Unknown count' });
      const bucket = (n: number | null, selected: string, low: number, high: number) => selected === 'all' || (selected === 'unknown' ? n === null : n !== null && (selected === 'small' ? n < low : selected === 'medium' ? n >= low && n < high : n >= high));
      const rows = DATASETS.filter(row => bucket(row.episodes, size, 100000, 1000000) && bucket(row.tasks, tasks, 100, 1000) && (body === 'all' || (body === 'single' ? row.embodimentCount === 1 : row.embodimentCount > 1)));
      const headers = ['Dataset', 'Year', 'Episodes', 'Hours', 'Tasks', 'Scenes', 'Embodiments', 'License', 'Source'];
      c.tablePopulation(rows.length ? [{ headers, rows: rows.map(row => row.name) }] : []);
      c.contains(`${rows.length} of ${DATASETS.length} datasets`);
      for (const row of rows) {
        c.row(row.name, { Dataset: row.name, Year: row.year ?? 'not disclosed', Episodes: count(row.episodes, row.episodesNote), Hours: count(row.hours, row.hoursNote), Tasks: count(row.tasks, row.tasksNote), Scenes: count(row.scenes), Embodiments: `${row.embodimentCount} ${row.embodimentCount === 1 ? 'platform' : 'platforms'}${row.embodiments.join(', ')}`, License: row.license ?? 'not disclosed', Source: new URL(row.url).host });
        c.sourceLink(row.url);
      }
      if (!rows.length) c.contains('No datasets match these filters.');
    },
  },
  'interactive:HardwareGuide': {
    basis: [assumption('HardwareGuide', 'canonical-catalog', 'Audited data/hardware.ts values retain maker, range, dated price, source and availability scope. Independent filter predicates use the low price and reject unknown values from numeric buckets.')],
    evidencePaths: ['data/hardware.ts', componentPath('hardware-guide')],
    check(c) {
      const category = choice(c, { all: 'All categories', arm: 'Arms', humanoid: 'Humanoids', hand: 'Hands', sensor: 'Sensors', compute: 'Compute' });
      const price = choice(c, { all: 'All prices', small: 'Under $1k', medium: '$1k-$10k', high: '$10k-$25k', large: '$25k and up', unknown: 'No listed price' });
      const dof = choice(c, { all: 'Any DoF', small: 'Under 10', medium: '10-30', large: '30+', unknown: 'Not disclosed' });
      const availability = choice(c, { all: 'Any availability', buy: 'Orderable', preorder: 'Preorder', contact: 'Contact sales', closed: 'Not for sale', unknown: 'Not listed' });
      const rows = HARDWARE.filter(row => (category === 'all' || row.category === category)
        && (price === 'all' || (price === 'unknown' ? row.priceUsd === null : row.priceUsd !== null && (price === 'small' ? row.priceUsd < 1000 : price === 'medium' ? row.priceUsd >= 1000 && row.priceUsd < 10000 : price === 'high' ? row.priceUsd >= 10000 && row.priceUsd < 25000 : row.priceUsd >= 25000)))
        && (dof === 'all' || (dof === 'unknown' ? row.dof === null : row.dof !== null && (dof === 'small' ? row.dof < 10 : dof === 'medium' ? row.dof >= 10 && row.dof <= 30 : row.dof > 30)))
        && (availability === 'all' || (availability === 'unknown' ? row.availability === null : row.availability === availability)));
      c.tablePopulation(rows.length ? [{ headers: ['Entry', 'Category', 'Price (USD)', 'DoF', 'Availability', 'Distinction', 'Source'], rows: rows.map(row => row.name + row.maker) }] : []);
      c.contains(`${rows.length} of ${HARDWARE.length} entries`);
      const categories = { arm: 'Arm', humanoid: 'Humanoid', hand: 'Hand', sensor: 'Sensor', compute: 'Compute' };
      const availabilityLabels = { buy: 'Orderable', preorder: 'Preorder', contact: 'Contact sales', closed: 'Not for sale' };
      for (const row of rows) {
        const priceText = row.priceUsd === null
          ? `not disclosed${row.id === 'aloha-2' && row.priceNote ? `${row.priceNote}ACT paper (2023)` : ''}`
          : `${dollars(row.priceUsd)}${row.priceMaxUsd === null ? '' : `-${dollars(row.priceMaxUsd)}`}as of ${row.priceAsOf}${row.priceNote ? ` · ${row.priceNote}` : ''}`;
        const key = row.name + row.maker;
        c.row(key, { Entry: key, Category: categories[row.category], 'Price (USD)': priceText, DoF: row.dof === null ? 'not disclosed' : `${row.dof}${row.dofNote ?? ''}`, Availability: `${row.availability === null ? 'not disclosed' : availabilityLabels[row.availability]}${row.availabilityNote ?? ''}`, Distinction: row.highlight ?? 'not disclosed', Source: new URL(row.url).host });
        c.sourceLink(row.url);
      }
      if (!rows.length) c.contains('No hardware matches these filters.');
    },
  },
  'interactive:TeleopRigMatrix': {
    basis: [assumption('TeleopRigMatrix', 'canonical-catalog', 'The source-backed data/teleop-rigs.ts cost notes and explanatory ratings are canonical. Ratings are editorial categories, not measured numeric scores; every displayed source URL must remain bound to its row.')],
    evidencePaths: ['data/teleop-rigs.ts', 'lib/teleop-rigs.ts', componentPath('teleop-rig-matrix')],
    check(c) {
      c.tablePopulation([{ headers: ['Rig', 'Cost', 'Data quality', 'Throughput', 'Embodiment gap', 'Sources'], rows: TELEOP_RIGS.map(row => row.name + row.family + row.representatives.join(', ')) }]);
      c.contains(`${TELEOP_RIGS.length} of ${TELEOP_RIGS.length} rigs`);
      for (const row of TELEOP_RIGS) {
        const key = row.name + row.family + row.representatives.join(', ');
        c.row(key, { Rig: key, Cost: `${row.costUsd === null ? 'not disclosed' : dollars(row.costUsd)}${row.costNote ?? ''}`, 'Data quality': row.dataQuality + row.dataQualityNote, Throughput: row.throughput + row.throughputNote, 'Embodiment gap': row.embodimentGap + row.embodimentGapNote, Sources: row.links.map(link => link.label).join('') });
        row.links.forEach(link => c.sourceLink(link.url));
        for (const [field, label] of [['cost', 'Cost'], ['dataQuality', 'Data quality'], ['throughput', 'Throughput'], ['embodimentGap', 'Embodiment gap']] as const) if (c.selected(exact(label))) c.contains(row.details[field]);
      }
    },
  },
  'interactive:ComparisonMatrix': {
    basis: [assumption('ComparisonMatrix', 'canonical-catalog', 'The audited data/methods.ts rows are canonical. Independent state filters and year/output-style coordinates bind every method to its full table values, source links and current card facts.')],
    evidencePaths: ['data/methods.ts', componentPath('comparison-matrix')],
    check(c) {
      const weights = choice(c, { all: 'All weights', open: 'Downloadable', closed: 'Not released', unknown: 'Not disclosed' }, 'Filter by weights');
      const representation = choice(c, { all: 'All representations', continuous: 'Continuous', discrete: 'Discrete', diffusion: 'Diffusion', flow: 'Flow', unknown: 'Not disclosed' }, 'Filter by action representation');
      const query = c.textInput(/^Filter methods$/).trim().toLowerCase().split(/\s+/).filter(Boolean);
      const rows = METHODS.filter(row => (weights === 'all' || (weights === 'unknown' ? row.openWeights === null : row.openWeights === (weights === 'open')))
        && (representation === 'all' || row.actionRepresentation === (representation === 'unknown' ? null : representation))
        && query.every(token => [row.name, row.backbone ?? '', ...row.conditioning].join(' ').toLowerCase().includes(token)));
      c.tablePopulation(rows.length ? [{ headers: ['Method', 'Year', 'Action repr.', 'Horizon H/Ĥ', 'Control Hz', 'Backbone', 'Conditioning', 'Cross-embodiment', 'Hierarchy', 'Weights', 'Sources'], rows: rows.map(row => row.name) }] : []);
      const outputLabels: Record<string, string> = { codes: 'numbered words', numbers: 'movement amounts', noise: 'refined move guesses', undisclosed: 'not disclosed' };
      c.comparisonCardPopulation(rows.map(row => row.id), outputLabels);
      c.readoutNumbers(0, [rows.length, METHODS.length]);
      const representationText = { continuous: 'continuous', discrete: 'discrete tokens', diffusion: 'diffusion', flow: 'flow matching' };
      for (const row of rows) {
        const { planned, executed, note } = row.actionHorizon;
        const horizon = planned === null && executed === null ? 'not disclosed' : `${planned ?? 'n.d.'} / ${executed !== null && typeof executed === 'object' ? `{${executed.choices.join(', ')}}` : executed ?? 'n.d.'}`;
        c.row(row.name, { Method: row.name, Year: row.year ?? 'not disclosed', 'Action repr.': row.actionRepresentation === null ? 'not disclosed' : [representationText[row.actionRepresentation], row.actionRepresentationNote].filter(Boolean).join('; '), 'Horizon H/Ĥ': horizon + (note ?? ''), 'Control Hz': `${row.controlFrequencyHz === null ? 'not disclosed' : `${row.controlFrequencyHz} Hz`}${row.controlFrequencyNote ?? ''}`, Backbone: row.backbone ?? 'not disclosed', Conditioning: row.conditioning.length ? row.conditioning.join(', ') : 'not disclosed', 'Cross-embodiment': row.crossEmbodiment ?? 'not disclosed', Hierarchy: row.hierarchy ?? 'not disclosed', Weights: `${row.openWeights === null ? 'not disclosed' : row.openWeights ? 'downloadable' : 'not released'}${row.weightsNote ?? ''}`, Sources: row.sources.map(id => { const record = source(id); c.sourceLink(record.url); return `${citationLabel(record)}: ${record.title}`; }).join('') });
      }
      const style = (representation: string | null) => representation === 'discrete' ? 'codes' : representation === 'continuous' ? 'numbers' : representation === 'flow' || representation === 'diffusion' ? 'noise' : 'undisclosed';
      const years = METHODS.flatMap(row => row.year === null ? [] : [row.year]), first = Math.min(...years), span = Math.max(...years) - first + 1;
      const styles = ['codes', 'numbers', 'noise', 'undisclosed'];
      for (const row of METHODS) {
        const planned = row.actionHorizon.planned, kind = style(row.actionRepresentation);
        const facts = `${row.name}${row.year ?? 'not disclosed'}Output${outputLabels[kind]}Plans ahead${planned === null ? 'not disclosed' : planned === 1 ? '1 move' : `${planned} moves`}Speed${row.controlFrequencyHz === null ? 'not disclosed' : `${row.controlFrequencyHz} commands a second`}Download${row.openWeights === null ? 'not disclosed' : row.openWeights ? 'yes' : 'no'}`;
        c.comparisonCardAlternative(kind, row.id, facts, rows.includes(row), 0.2);
      }
      for (let year = first; year < first + span; year += 1) c.svgText(null, String(year), rounded(132 + (year - first + 0.5) * 208 / span), 14);
      c.requireSeries(styles.filter(kind => METHODS.some(row => row.year !== null && style(row.actionRepresentation) === kind)));
      c.circleCount(years.length);
      styles.forEach((kind, i) => {
        const members = METHODS.filter(row => row.year !== null && style(row.actionRepresentation) === kind);
        c.svgMarkCount(kind, 'circle', members.length);
        for (let year = first; year < first + span; year += 1) {
          const group = members.filter(row => row.year === year);
          group.forEach((row, j) => {
            const x = rounded(rounded(132 + (year - first + 0.5) * 208 / span) + (j - (group.length - 1) / 2) * 10), y = 36 + 22 * i;
            c.point(row.id, x, y, 3); c.svgMark(kind, 'circle', { cx: x, cy: y, r: 3, opacity: rows.includes(row) ? 1 : 0.2 });
          });
        }
      });
    },
  },
  'interactive:CubeTrials': {
    basis: citations(['openai-rubiks-cube-2019'], 'Fixed 43-subgoal scramble, ten trials: two complete with cube sensors and zero with vision. Filled squares are counts, not chronological trial outcomes.'),
    evidencePaths: [componentPath('cube-trials')], seriesIds: ['trials'],
    check(c) {
      const solved = c.selected(/^Cameras$/) ? 0 : 2;
      c.cell("The cube's own sensors", 'trials finished (of 10)', '2'); c.cell('Cameras', 'trials finished (of 10)', '0');
      c.contains(`After simulation: ${solved} of 10 real trials solved`);
      c.rectCount('trials', 10 + solved); c.svgMarkCount('trials', 'rect', 10 + solved);
      for (let i = 0; i < 10; i += 1) {
        const geometry = { x: 13 + 32 * i, y: 44, width: 26, height: 26 };
        c.svgMark('trials', 'rect', { ...geometry, stroke: 'var(--ink)' });
        if (i < solved) c.svgMark('trials', 'rect', { ...geometry, 'data-chart-role': 'highlight', opacity: 1 }, 0.05, { effectiveOpacity: 1 });
      }
    },
  },
  'interactive:ScannedTwinCheck': {
    basis: citations(['kadian-2019'], 'Sim-to-real success correlation is 0.18 for the scanned lab and 0.844 after tuning simulator parameters; correlation is not task success.'),
    evidencePaths: [componentPath('scanned-twin-check')], seriesIds: ['correlation', 'other'],
    check(c) {
      const tuned = c.selected(/^Motion settings tuned$/), value = tuned ? 0.844 : 0.18, other = tuned ? 0.18 : 0.844;
      c.row('As scanned', { 'correlation with real success': '0.18', why: 'robots learned to use unrealistic collisions' });
      c.row('Motion settings tuned', { 'correlation with real success': '0.844', why: 'wall sliding off; movement noise removed' });
      c.rectCount('correlation', 1); c.rect('correlation', 12, 70, rounded(316 * value), 18);
      c.svgMarkCount('other', 'line', 1); c.svgMark('other', 'line', { x1: rounded(12 + 316 * other), x2: rounded(12 + 316 * other), y1: 64, y2: 94 });
      c.svgText('correlation', `${value}: ${tuned ? 'Sim scores now track real ones' : 'Sim scores barely predict real ones'}`, 12, 16);
      c.svgText('other', `${tuned ? 'as scanned' : 'once tuned'}, ${other}`, rounded(12 + 316 * other), 60);
      c.svgText(null, '0, no linear link', 12, 114); c.svgText(null, '1, perfect linear match', 328, 114);
      c.svgText(null, 'Correlation: strength of a straight-line relationship', 170, 140);
      c.contains('a correlation of 1 means a perfect positive straight-line relationship between the two score sets, which may still have different scales or offsets');
    },
  },
  'interactive:HardwarePriceLadder': {
    basis: citations([...new Set(LADDER_POINTS.map(row => row.citationId))], 'Maker/seller prices come from the dated hardware registry. Parts lists, third-party prices and products with no disclosed sale price are excluded explicitly.'),
    evidencePaths: ['data/hardware.ts', 'lib/hardware-price-ladder.ts', componentPath('hardware-price-ladder')],
    seriesIds: LADDER_ROWS.map(row => row.id),
    check(c) {
      const arms=LADDER_POINTS.filter(row=>row.row==='arm'),humanoids=LADDER_POINTS.filter(row=>row.row==='humanoid');
      c.contains(`Maker list pricesArms ${dollars(Math.min(...arms.map(row=>row.priceUsd)))}–${dollars(Math.max(...arms.map(row=>row.priceUsd)))}; humanoids ${dollars(Math.min(...humanoids.map(row=>row.priceUsd)))}–${dollars(Math.max(...humanoids.map(row=>row.priceUsd)))}; some prices unpublished`);
      c.circleCount(LADDER_POINTS.length);
      for (const point of LADDER_POINTS) {
        const family = LADDER_ROWS.find(row => row.id === point.row)!;
        c.row(point.label, { family: family.label.toLowerCase(), 'listed price (US dollars)': point.priceUsd });
        c.point(`${point.rowId}:${point.end}`, rounded(10 + (Math.log10(point.priceUsd) - 2) * 320 / 3), 46 + 80 * LADDER_ROWS.indexOf(family), 3);
      }
      LADDER_ROWS.forEach((family, i) => {
        const rows = LADDER_POINTS.filter(row => row.row === family.id);
        [rows[0], rows.at(-1)!].forEach((row, j) => c.readoutNumbers(2 * i + j, [row.priceUsd]));
        c.svgText(family.id, `${family.label}: ${dollars(rows[0].priceUsd)}–${dollars(rows.at(-1)!.priceUsd)}`, 10, 30 + 80 * i);
        c.contains(`${family.label}, left to right: ${rows.map(row => `${row.label} (${dollars(row.priceUsd)})`).join('; ')}.`);
        const offsets: Record<string, number> = { 'so-arm101-pro-unassembled': -4, 'reachy-2': 4, 'unitree-r1': 4, 'unitree-h2': 0, 'jetson-thor-t4000': 0, 'jetson-thor-t5000': 0 };
        for (const row of [rows[0], rows.at(-1)!]) c.svgText(family.id, row.label, rounded(rounded(10 + (Math.log10(row.priceUsd) - 2) * 320 / 3) + offsets[row.rowId]), 64 + 80 * i);
      });
      for (const exponent of [2, 3, 4, 5]) c.svgText(null, dollars(10 ** exponent), rounded(10 + (exponent - 2) * 320 / 3), 278);
      c.svgText(null, 'listed price, US dollars', 330, 296);
    },
  },
  'interactive:HumanoidPickHeight': {
    basis: [...citations(['gemini-robotics-2-2026'], 'Vendor-reported GR2 pick-category rates on Apollo 2/Inspire, and the distinct Franka Duo gripper-insertion rate.'), assumption('HumanoidPickHeight', 'illustrative-pose', 'The body drawing is illustrative; the quantitative geometry is only the three success bars and insertion reference on a 0–100 percent ruler.')],
    evidencePaths: ['lib/wbc-decomposition.ts', componentPath('humanoid-pick-height')], seriesIds: ['shelf', 'table', 'floor', 'insertion'],
    check(c) {
      const success = (task: string) => GR2_RESULTS.find(row => row.task === task)!.success;
      const poses = [[90, 90, 86, 42, 28], [90, 90, 74, -22, -10]];
      const barY = [...poses.map(pose => rounded(rounded(196 - pose.reduce((sum, angle, i) => sum + [36, 36, 46, 27, 27][i] * Math.sin(angle * Math.PI / 180), 0) + 3) + 6)), 182];
      const entries = [['shelf', 'a shelf', 'from a shelf'], ['table', 'a table', 'from a table'], ['floor', 'the floor', 'from the floor']] as const;
      entries.forEach(([id, label, words], i) => {
        const percent = success(`pick from ${id}`);
        c.cell(label, 'picks that succeeded (%)', percent.toFixed(1));
        c.rectCount(id, 1); c.rect(id, 186, barY[i] - 2, rounded(percent * 1.42), 4);
        c.svgText(id, `${percent}% ${words}`, 186, barY[i] - 8);
      });
      const insertion = success('precise insertion'), x = rounded(186 + insertion * 1.42);
      c.cell('gripper insertion (Franka Duo)', 'picks that succeeded (%)', insertion.toFixed(1));
      c.svgMarkCount('insertion', 'line', 1); c.svgMark('insertion', 'line', { x1: x, x2: x, y1: 22, y2: 200 });
      c.svgText('insertion', `arm fitting ${insertion}%`, 328, 14);
      c.contains(`One model controls the humanoid’s whole body: success falls from ${Math.round(success('pick from shelf'))}% shelf to ${Math.round(success('pick from table'))}% table to ${Math.round(success('pick from floor'))}% floor, the least reliable height.`);
      for (const percent of [0, 50, 100]) c.svgText(null, String(percent), rounded(186 + 1.42 * percent), 206, 0.05, { dy: null });
      c.svgText(null, 'picks that succeeded (%)', 328, 206, 0.05, { dy: '1.5em' });
    },
  },
  'interactive:RobotsPerGpu': {
    basis: [...citations(['rudin-2021', 'isaac-gym-2021'], 'Rudin: 128 CPU-era environments, 4096 for the deployed walking policy and 16384 maximum on a workstation GPU. Isaac Gym keeps physics and learning on-device.'), assumption('RobotsPerGpu', 'tile-tally', 'Each of the authored 128 chip tiles represents 128 simulated robots. The physical card illustration makes no measured chip-layout claim.')],
    evidencePaths: [componentPath('robots-per-gpu'), 'components/iso/figures/gpu-test-bench.ts'], seriesIds: ['robots'],
    check(c) {
      const robots = c.selected(/^128$/) ? 128 : c.selected(/^4,096$/) ? 4096 : 16384, tiles = robots / 128;
      c.readoutText(0, `${robots.toLocaleString('en-US')} robots: ${tiles === 1 ? 'the older processor count' : `${tiles} times the older processor count`}`);
      for (const [count, note] of [[128, 'typical of CPU simulators'], [4096, 'trained the deployed walking policy in under 20 minutes'], [16384, 'the most on one workstation GPU']] as const) {
        c.row(count.toLocaleString('en-US'), { 'times the CPU-era 128': String(count / 128), 'in the paper': note });
      }
      c.svgMarkCount('robots', 'path', 256);
      TILE_PATHS.forEach((d, i) => c.svgMark('robots', 'path', { d, 'data-lit-tile': '', opacity: i < tiles ? 1 : 0 }, 0.05, { effectiveOpacity: i < tiles ? 1 : 0 }));
    },
  },
  'interactive:DroneChampionsTimeline': {
    basis: citations(CHAMPIONS_SOURCES, 'The dated contest records and quoted outcomes are frozen in drone-racing-champions.ts, with the original source passages and distinct lab/event conditions.'),
    evidencePaths: ['lib/drone-racing-champions.ts', componentPath('drone-champions-timeline')],
    seriesIds: RACING_CONTESTS.map(row => row.id),
    check(c) {
      c.circleCount(RACING_CONTESTS.filter(row => row.outcome === 'ai-won').length);
      RACING_CONTESTS.forEach((row, i) => {
        c.row(row.row, { announced: row.when, result: row.result, setting: row.setting });
        c.readoutText(i, row.id === 'a2rl-2026' ? 'hit gate; lost decider at 4 to 4' : row.readout);
        const x = rounded(10 + (row.year + (row.month - 0.5) / 12 - 2023) / 3.5 * 320), y = 34 + 42 * i;
        if (row.outcome === 'ai-won') c.point(row.id, x, y, 2.5);
        else { c.svgMarkCount(row.id, 'path', 1); c.svgMark(row.id, 'path', { d: crossPath(x, y) }); }
        c.svgText(row.id, row.label, 10, 18 + 42 * i);
      });
      for (const year of [2023, 2024, 2025, 2026]) c.svgText(null, String(year), rounded(10 + (year - 2023) / 3.5 * 320), 154);
      c.svgText(null, 'month announced', 330, 172);
    },
  },
  'interactive:FundingHumanoidCounts': {
    basis: citations(FUNDING_HUMANOID_SOURCES, 'Canonical annual robotics funding totals, partial-year cutoff and separately scoped IFR sales/SAG shipments; no ratio between differently scoped series.'),
    evidencePaths: ['lib/funding-humanoid-counts.ts', componentPath('funding-humanoid-counts')],
    seriesIds: ['funding', 'funding-partial-year', 'ifr', 'sag'],
    check(c) {
      c.rectCount('funding', FUNDING_BY_YEAR.filter(row => !row.partial).length);
      c.rectCount('funding-partial-year', FUNDING_BY_YEAR.filter(row => row.partial).length);
      FUNDING_BY_YEAR.forEach((row, i) => {
        c.row(`Robotics startup funding, ${row.year}${row.partial ? ` to ${FUNDING_PARTIAL_UNTIL}` : ''}`, { value: `$${row.billionsUsd} billion`, 'counted by': 'Crunchbase' });
        c.rect(row.partial ? 'funding-partial-year' : 'funding', 40, 26 + 19 * i, row.billionsUsd * 8, 11);
        c.svgText(row.partial ? 'funding-partial-year' : 'funding', String(row.year), 2, 36 + 19 * i);
      });
      c.rectCount('ifr', 1); c.rectCount('sag', 2);
      HUMANOID_COUNTS.forEach((row, i) => {
        c.row(row.row, { value: `about ${row.units.toLocaleString('en-US')}`, 'counted by': row.counter });
        c.rect(row.counter.toLowerCase(), 2, 243 + 42 * i, rounded(row.units / 20000 * 198), 11);
      });
      const last = FUNDING_BY_YEAR.at(-1)!;
      c.readoutText(0, `$${last.billionsUsd}B to ${FUNDING_PARTIAL_UNTIL}`);
      c.readoutText(1, `about ${HUMANOID_COUNTS[0].units.toLocaleString('en-US')}`);
      c.readoutText(2, `about ${HUMANOID_COUNTS[2].units.toLocaleString('en-US')}`);
      for (const value of [0, 10, 20]) c.svgText(null, `$${value}`, 40 + value * 8, 171);
      for (const value of [0, 10000, 20000]) c.svgText(null, value.toLocaleString('en-US'), 2 + value * 198 / 20000, 363);
      c.svgText(null, 'billions of US dollars a year', 200, 189); c.svgText(null, 'humanoids', 200, 381);
    },
  },
  'interactive:SafetyRulesTimeline': {
    basis: citations(SAFETY_RULE_SOURCES, 'Each source-backed date keeps its event type: publication, draft comment close or legal application; dates are not interchangeable.'),
    evidencePaths: ['lib/safety-rules-timeline.ts', componentPath('safety-rules-timeline')],
    seriesIds: SAFETY_RULES.map(row => row.id),
    check(c) {
      c.circleCount(SAFETY_RULES.length);
      SAFETY_RULES.forEach((row, i) => {
        const [year, month, day] = row.date.split('-').map(Number);
        const share = (Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 1)) / (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1));
        const x = rounded(10 + (year + share - 2025) * 80);
        c.row(row.row, { 'what happened': row.event, date: row.dateText });
        c.point(row.id, x, 32 + i * 40, 2.5);
        c.svgText(row.id, row.id === 'eu-machinery-regulation' ? 'EU law: safety systems that learn from data' : row.id === 'eu-ai-act' ? 'EU AI Act: AI subject to product safety checks' : row.label, 10, 18 + i * 40);
        if (row.id === 'iso-25785-1') {
          c.svgMarkCount(row.id, 'line', 1);
          c.svgMark(row.id, 'line', { x1: rounded(x + 7), x2: rounded(x + 52), y1: 112, y2: 112 });
          c.contains('next stage not dated');
        }
      });
      c.readoutText(0, SAFETY_RULES[3].dateText); c.readoutText(1, SAFETY_RULES[4].dateText);
      c.contains('Robot safety rules by date2025 standards; undated humanoid draft; learned-safety law in January 2027');
      c.contains('2025Industrial robot safety standards renewed');
      c.contains('No next dateHumanoid safety standard remains a draft');
      c.contains('January 2027EU law covers safety components that learn from data');
      c.contains('Separate 2028 AI Act rule: AI safety components or AI products requiring independent health or safety assessment under product laws.');
      for (const year of [2025, 2026, 2027, 2028, 2029]) c.svgText(null, String(year), 10 + (year - 2025) * 80, 222);
    },
  },
  'interactive:SurgicalAutonomyLadder': {
    basis: citations(LADDER_SOURCES, 'Yang autonomy categories; authorized systems and research placements retain evidence status and placement author. Level five has no system, so evidence and placement author are inapplicable there only.'),
    evidencePaths: ['lib/surgical-autonomy-ladder.ts', 'lib/surgical-systems.ts', componentPath('surgical-autonomy-ladder')],
    seriesIds: ['authorized', 'research'],
    check(c) {
      // Exact, independently reviewed display aliases. The canonical table checks below are unchanged.
      const levelWords = ['surgeon controls motion', 'robot assists surgeon', 'supervised task', 'human chooses robot plan', 'surgery under supervision', 'whole procedure alone'];
      const researchWords: Record<string, string> = { 'star-2016': 'STAR, 2016, stitching in live pigs', 'saeidi-2022': 'Bowel joining, 2022, live pigs', 'srt-h-2025': 'SRT-H, 2025, removed gallbladders' };
      c.circleCount(2); c.svgMarkCount('research', 'path', 3);
      for (const level of AUTONOMY_LEVELS) {
        const entry = LADDER_ENTRIES.find(row => row.level === level.level);
        c.row(`Level ${level.level}, ${level.name.toLowerCase()}`, { 'system or study': entry?.systems ?? 'none', evidence: entry?.evidenceText ?? 'n/a', 'placed by': entry?.placedBy ?? 'n/a' });
        c.svgText(null, `Level ${level.level}, ${levelWords[level.level]}`, 28, 18 + (5 - level.level) * 44);
        if (!entry) continue;
        const y = 34 + (5 - level.level) * 44;
        if (entry.evidence === 'authorized') c.point(entry.id, 16, y, 2.5);
        else c.svgMark('research', 'path', { d: crossPath(16, y) });
        c.svgText(entry.evidence, researchWords[entry.id] ?? entry.label, 28, y + 4);
      }
      c.contains([...AUTONOMY_LEVELS].reverse().map(level => {
        const entry = LADDER_ENTRIES.find(row => row.level === level.level);
        return `Level ${level.level}, ${levelWords[level.level]}${entry ? researchWords[entry.id] ?? entry.label : 'no system in this comparison'}`;
      }).join(''));
    },
  },
  'interactive:ModelBasedLoop': {
    basis: [...citations(MODEL_BASED_LOOP_SOURCES, 'TD-MPC2 sections 2 and 3: model learning from replay alternates with experience collection by planning.'), assumption('ModelBasedLoop', 'six-step-arrangement', 'The six-node diagram is an authored process arrangement, not a measured time or frequency; updates need not follow every action.')],
    evidencePaths: ['lib/world-model-figures.ts', componentPath('model-based-loop')],
    seriesIds: MODEL_BASED_LOOP.map(row => row.id),
    nonQuantitative: 'The positions encode process ordering only. There is no metric axis or performance quantity; every node and its source-backed explanation are checked.',
    check(c) {
      c.circleCount(MODEL_BASED_LOOP.length);
      for (const row of MODEL_BASED_LOOP) {
        c.point(row.id, row.x, row.y, 2.5); c.svgText(row.id, row.label, row.x, row.y - 15);
        c.contains(row.detail.join(' '));
      }
      c.contains('model updates need not follow every action');
    },
  },
  'interactive:WorldModelEvaluationLadder': {
    basis: [...citations(EVALUATION_LADDER_SOURCES, 'Source-specific evaluation questions; SimFoundry reports 0.911 Pearson correlation and 0.018 MMRV across seven tasks and five policy architectures.'), assumption('WorldModelEvaluationLadder', 'separate-questions', 'The rung order and spacing form an authored reading guide, not a universal benchmark or ordinal performance metric.')],
    evidencePaths: ['lib/world-model-figures.ts', componentPath('world-model-evaluation-ladder')],
    seriesIds: EVALUATION_RUNGS.map(row => row.id),
    check(c) {
      c.circleCount(EVALUATION_RUNGS.length);
      EVALUATION_RUNGS.forEach((row, i) => {
        c.point(row.id, 12, row.y, 2.5); c.svgText(row.id, `${i + 1}. ${row.id === 'closed-loop-use' ? 'Act, observe, replan' : row.id === 'policy-ranking' ? 'Robot strategy ranking' : row.label}`, 36, row.y + 4); c.contains(row.question);
      });
      c.readoutNumbers(0, [SIMFOUNDRY_EVALUATION.pearson]); c.readoutNumbers(1, [SIMFOUNDRY_EVALUATION.tasks, SIMFOUNDRY_EVALUATION.architectures]);
      c.contains(`mean maximum rank violation ${SIMFOUNDRY_EVALUATION.mmrv}`);
    },
  },
  'interactive:WorldModelOutputTimes': {
    basis: citations(WORLD_MODEL_OUTPUT_SOURCES, 'Each canonical timing retains its reported output, hardware, upper-bound/derived status and original measurement scope. The two Cosmos rows are distinct workloads.'),
    evidencePaths: ['lib/world-model-figures.ts', componentPath('world-model-output-times'), 'audit/evidence/world-model-figures-20261102/sources.json'],
    seriesIds: WORLD_MODEL_OUTPUT_TIMES.map(row => row.id),
    check(c) {
      const outputRoles: Readonly<Record<string, string>> = { '3dgs': 'Single image', dreamzero: 'Group of robot moves', '1xwm': 'Five seconds of predicted moves', vjepa2: 'One chosen move', predict2: 'Video clip', 'cosmos-planner': 'One chosen move' };
      c.circleCount(WORLD_MODEL_OUTPUT_TIMES.filter(row => row.kind !== 'upper-bound').length);
      WORLD_MODEL_OUTPUT_TIMES.forEach((row, i) => {
        c.row(row.label, { time: row.displayedTime, 'output and hardware': `${row.output}; ${row.hardware}`, 'measurement scope': row.note });
        const x = rounded(12 + (Math.log10(row.seconds) + 2) * 316 / (Math.log10(300) + 2), 3), y = 52 + 58 * i;
        if (row.kind === 'upper-bound') { c.svgMarkCount(row.id, 'path', 1); c.svgMark(row.id, 'path', { d: `M${x + 8} ${y - 4} L${x} ${y} L${x + 8} ${y + 4}` }); }
        else {
          c.point(row.id, x, y, 2.5);
          c.svgMark(row.id, 'circle', { cx: x, cy: y, r: 2.5 }, 0.05, { ownerTestId: `output-time-${row.id}` });
        }
        c.svgPlotPoints(row.id, row.kind === 'upper-bound' ? 'path' : 'circle', `output-time-${row.id}`, '0 0 340 416',
          row.kind === 'upper-bound' ? [[x + 8, y - 4], [x, y], [x + 8, y + 4]] : [[x, y], [x + 2.5, y], [x, y + 2.5]]);
        c.svgText(row.id, `${outputRoles[row.id]} · ${row.id === 'cosmos-planner' ? '' : row.id === '3dgs' ? 'method: ' : 'model: '}${row.label}`, 12, y - 36);
        c.svgText(row.id, `Chips: ${row.hardware}`, 12, y - 19);
      });
      [WORLD_MODEL_OUTPUT_TIMES[0], WORLD_MODEL_OUTPUT_TIMES[3], WORLD_MODEL_OUTPUT_TIMES[5]].forEach((row, i) => c.readoutText(i, row.displayedTime));
      for (const seconds of [0.01, 0.1, 1, 10, 100]) c.svgText(null, String(seconds), rounded(12 + (Math.log10(seconds) + 2) * 316 / (Math.log10(300) + 2), 3), 389);
      c.svgText(null, 'Seconds, each tick is ten times longer', 12, 405);
      c.contains('V-JEPA 2-AC is a prediction model; a planner uses its forecasts after proposed moves to choose a robot move.');
    },
  },
};
