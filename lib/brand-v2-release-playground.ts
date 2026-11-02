import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { readReleaseBuildStamp } from './brand-v2-release-build.ts';
import { canonicalPlaygroundModel, playgroundModelProblems } from './brand-v2-playground-oracle.ts';
import { CANONICAL_PLAYGROUND_JOINTS, CANONICAL_PLAYGROUND_TRAJECTORY } from './playground-canonical-fixture.ts';
export const RELEASE_PLAYGROUND_PATH = 'evidence/brand-v2/release/playground-numerical.json';
export const PLAYGROUND_NUMERICAL_PROFILES = [{
  id: 'desktop',
  width: 1440,
  height: 900,
  dpr: 1
}, {
  id: 'phone',
  width: 375,
  height: 812,
  dpr: 1
}, {
  id: 'high-dpr',
  width: 375,
  height: 812,
  dpr: 3
}, {
  id: 'reduced-motion',
  width: 375,
  height: 812,
  dpr: 1
}, {
  id: 'unavailable',
  width: 375,
  height: 812,
  dpr: 1
}] as const;
export function playgroundNumericalStateIds() {
  return [...['default', ...CANONICAL_PLAYGROUND_JOINTS.flatMap(joint => ['min:' + joint, 'max:' + joint]), 'fk-changed', 'camera-orbit', 'camera-reset', 'ik-reached', 'ik-unreachable', 'trajectory-import', 'trajectory-middle', 'trajectory-reset', 'trajectory-clear', 'malformed-import', 'mismatched-import'].map(state => 'desktop:' + state), ...['default', 'fk-changed', 'reset'].map(state => 'phone:' + state), ...['default', 'resized', 'reset'].map(state => 'high-dpr:' + state), ...['default', 'fk-changed', 'camera-orbit', 'reset'].map(state => 'reduced-motion:' + state), 'unavailable:fallback'];
}
const text = z.string(),
  number = z.number().finite(),
  vector = z.tuple([number, number, number]);
export const playgroundModelSchema = z.object({
  kind: text,
  name: text,
  contextActive: z.boolean(),
  clearColour: text,
  toneMapping: number,
  points: number.int().nonnegative(),
  sprites: number.int().nonnegative(),
  fog: z.boolean(),
  joints: z.array(z.object({
    name: text,
    angle: number,
    lower: number,
    upper: number,
    position: vector
  }).strict()),
  links: z.array(z.object({
    name: text,
    position: vector
  }).strict()),
  meshes: z.array(z.object({
    name: text,
    vertices: number.int().nonnegative(),
    colours: z.array(text),
    roughness: z.array(number),
    metalness: z.array(number)
  }).strict())
}).strict();
export const playgroundReadingSchema = z.object({
  id: text.min(1),
  profile: z.enum(['desktop', 'phone', 'high-dpr', 'reduced-motion', 'unavailable']),
  steps: z.array(text.min(1)).min(1),
  viewport: z.object({
    width: number,
    height: number,
    dpr: number
  }).strict(),
  reducedMotion: z.boolean(),
  state: text,
  canvasCount: number.int().nonnegative(),
  canvasLabel: text,
  canvasTabIndex: number,
  model: playgroundModelSchema.nullable(),
  camera: z.array(number),
  cameraTarget: z.array(number),
  fov: number.nullable(),
  rendererDpr: number.nullable(),
  buffer: z.array(number),
  stage: z.object({
    width: number,
    height: number,
    background: text,
    pageBackground: text,
    borders: z.array(number)
  }).strict(),
  pixels: z.object({
    total: number.int().positive(),
    nonPaper: number.int().nonnegative(),
    accent: number.int().nonnegative(),
    miss: number.int().nonnegative(),
    hash: text.regex(/^[a-f0-9]{64}$/),
    repeatHash: text.regex(/^[a-f0-9]{64}$/)
  }).strict().nullable(),
  runtimeTokens: z.record(text, text),
  sliders: z.array(z.object({
    name: text,
    min: number,
    max: number,
    value: number,
    label: text,
    spoken: text
  }).strict()),
  hand: vector.nullable(),
  target: vector.nullable(),
  reachState: text,
  reachText: text,
  residualMm: number.nullable(),
  jointText: z.record(text, text),
  activeJoint: z.object({
    name: text,
    weight: number,
    markerWidth: number,
    markerHeight: number
  }).strict().nullable(),
  poseCount: number.int().nonnegative(),
  progress: z.object({
    t: number,
    duration: number
  }).strict().nullable(),
  message: text,
  exportedTrajectory: text.nullable(),
  publicText: text,
  resources: z.array(text)
}).strict();
export type PlaygroundReading = z.infer<typeof playgroundReadingSchema>;
export const releasePlaygroundSchema = z.object({
  version: z.literal(1),
  sourceFingerprint: text.regex(/^[a-f0-9]{64}$/),
  exportFingerprint: text.regex(/^[a-f0-9]{64}$/),
  stateIds: z.array(text.min(1)).min(1),
  readings: z.array(playgroundReadingSchema).min(1)
}).strict();
export type ReleasePlaygroundArtifact = z.infer<typeof releasePlaygroundSchema>;
const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && new Set(a).size === a.length && [...a].sort().every((v, i) => v === [...b].sort()[i]);
export function validateReleasePlayground(input: unknown, expected: {
  source: string;
  exported: string;
}) {
  const data = releasePlaygroundSchema.parse(input),
    wanted = playgroundNumericalStateIds();
  if (data.sourceFingerprint !== expected.source || data.exportFingerprint !== expected.exported) throw Error('stale playground numerical source/export');
  if (!same(data.stateIds, wanted) || !same(data.readings.map(row => row.id), wanted)) throw Error('missing, extra or duplicate numerical playground state');
  for (const row of data.readings) {
    if (!row.id.startsWith(row.profile + ':')) throw Error('misbound playground profile');
    const plan = PLAYGROUND_NUMERICAL_PROFILES.find(p => p.id === row.profile)!;
    const resized = row.profile === 'high-dpr' && row.id !== 'high-dpr:default';
    if (row.viewport.width !== (resized ? 1440 : plan.width) || row.viewport.height !== (resized ? 900 : plan.height) || row.viewport.dpr !== plan.dpr) throw Error('playground actual viewport differs from independent plan');
    if (row.reducedMotion !== (row.profile === 'reduced-motion')) throw Error('playground motion media differs');
  }
  return data;
}
export function readReleasePlayground(root: string, artifact?: unknown) {
  const build = readReleaseBuildStamp(root);
  return validateReleasePlayground(artifact ?? JSON.parse(readFileSync(join(root, RELEASE_PLAYGROUND_PATH), 'utf8')), {
    source: build.sourceAfter,
    exported: build.exportFingerprint
  });
}

/** Source colour expectations come from authored CSS, not from the probe
 * or the WebGL mirror. The renderer is allowed one byte of mix rounding. */
export function playgroundExpectedColours(root: string) {
  const css = readFileSync(join(root, 'app/globals.css'), 'utf8'),
    look = readFileSync(join(root, 'components/explainers/explainers.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const token = (name: string) => {
    const value = new RegExp('--color-' + name + ':\\s*(#[a-f\\d]{6})\\s*;', 'i').exec(css)?.[1];
    if (!value) throw Error('missing authored colour ' + name);
    return value.toLowerCase();
  };
  const channels = (value: string) => [1, 3, 5].map(at => parseInt(value.slice(at, at + 2), 16));
  const mix = (name: string) => {
    const m = new RegExp('--' + name + ':\\s*color-mix\\(in srgb, var\\(--color-([a-z-]+)\\), var\\(--color-([a-z-]+)\\) ([\\d.]+)%\\)').exec(look);
    if (!m) throw Error('unmeasured explainer mix ' + name);
    const a = channels(token(m[1])),
      b = channels(token(m[2])),
      p = Number(m[3]) / 100;
    return '#' + a.map((v, i) => Math.round(v * (1 - p) + b[i] * p).toString(16).padStart(2, '0')).join('');
  };
  return {
    paper: token('paper'),
    accent: token('signal'),
    miss: token('error'),
    clay: mix('clay'),
    dark: mix('dark')
  };
}
const near = (a: readonly number[], b: readonly number[], tolerance = 1e-5) => a.length === b.length && a.every((value, index) => Math.abs(value - b[index]) <= tolerance);
export function playgroundReadingProblems(root: string, row: PlaygroundReading): Record<string, string[]> {
  const out = Object.fromEntries(Array.from({
    length: 13
  }, (_, i) => ['VAL-B2-PLAY-' + String(i + 1).padStart(3, '0'), [] as string[]]));
  const fail = (id: number, condition: boolean, message: string) => {
    if (condition) out['VAL-B2-PLAY-' + String(id).padStart(3, '0')].push(message);
  };
  if (row.profile === 'unavailable') {
    fail(11, row.state !== 'unavailable' || row.canvasCount !== 0 || row.model !== null || !/WebGL is not available/i.test(row.publicText), 'unavailable-WebGL fallback did not replace the canvas with its explanation');
    return out;
  }
  const colours = playgroundExpectedColours(root),
    model = canonicalPlaygroundModel(root),
    angles = Object.fromEntries(row.sliders.map(slider => [slider.name, slider.value * Math.PI / 180]));
  const modelFailures = playgroundModelProblems(model, row.model, angles, row.hand);
  out['VAL-B2-PLAY-002'].push(...modelFailures);
  out['VAL-B2-PLAY-012'].push(...modelFailures);
  fail(1, row.stage.width <= 0 || row.stage.height <= 0 || row.stage.width > row.viewport.width || row.stage.background !== row.stage.pageBackground, 'stage is unbounded or differs from page ground');
  fail(1, row.stage.borders.length !== 4 || row.stage.borders[0] !== 1 || row.stage.borders[2] !== 1, 'stage lacks its two 1px rules');
  fail(1, row.model?.clearColour.toLowerCase() !== colours.paper, 'actual renderer clear colour differs from paper');
  const paints = row.model?.meshes.flatMap(mesh => mesh.colours.map(colour => colour.toLowerCase())) ?? [];
  fail(3, !paints.includes(colours.clay) || !paints.includes(colours.dark) || paints.some(paint => ![colours.clay, colours.dark, colours.accent].includes(paint)), 'actual mesh materials differ from clay/motor/active-joint colours');
  if (row.activeJoint) fail(3, !paints.includes(colours.accent) || row.activeJoint.weight < 600 || row.activeJoint.markerWidth <= 0 || row.activeJoint.markerHeight <= 0, 'active motor lacks accent plus bold label and square');
  fail(4, row.canvasCount !== 1 || row.canvasTabIndex !== 0 || !/(arrow keys|zoom)/i.test(row.canvasLabel) || row.sliders.some(slider => !slider.label.trim() || !slider.spoken.trim()), 'canvas or joint controls lack named keyboard semantics');
  fail(6, !same(Object.keys(row.jointText), [...CANONICAL_PLAYGROUND_JOINTS]) || row.hand === null || row.sliders.some(slider => !row.jointText[slider.name]?.trim()), 'current joint/hand state is missing as text');
  fail(8, /robot-atlas-trajectory/.test(row.publicText), 'technical trajectory format is visible outside a data/export context');
  fail(9, Boolean(row.model && (row.model.points !== 0 || row.model.sprites !== 0 || row.model.fog || row.model.toneMapping !== 0)), 'scene contains particles, sprites, fog or noncanonical tone mapping');
  fail(10, row.model?.clearColour.toLowerCase() !== colours.paper || row.runtimeTokens.paper?.toLowerCase() !== colours.paper || row.runtimeTokens.signal?.toLowerCase() !== colours.accent || row.runtimeTokens.error?.toLowerCase() !== colours.miss, 'measured runtime/renderer colours disagree with authored tokens');
  fail(11, row.canvasCount !== 1 || row.state !== 'ready' || !row.model?.contextActive, 'available WebGL rendered a fallback');
  fail(12, !row.pixels || row.pixels.nonPaper < Math.max(100, row.pixels.total * .01) || row.pixels.hash !== row.pixels.repeatHash, 'available scene is blank or pixels are not deterministic');
  fail(12, row.rendererDpr !== Math.min(2, row.viewport.dpr) || !near(row.buffer, [row.stage.width * Math.min(2, row.viewport.dpr), row.stage.height * Math.min(2, row.viewport.dpr)], 1.1), 'drawing buffer/DPR differs from actual resized stage');
  for (const slider of row.sliders) {
    const source = model.joints.find(joint => joint.name === slider.name);
    if (!source) continue;
    fail(2, !near([slider.min, slider.max], [source.lower * 180 / Math.PI, source.upper * 180 / Math.PI], 1e-7), 'slider limits differ from canonical ' + slider.name);
  }
  const bound = /^desktop:(min|max):(.+)$/.exec(row.id);
  if (bound) {
    const slider = row.sliders.find(s => s.name === bound[2]);
    fail(2, !slider || Math.abs(slider.value - (bound[1] === 'min' ? slider.min : slider.max)) > 1e-7, 'keyboard endpoint did not reach canonical ' + bound[2] + ' ' + bound[1]);
  }
  if (row.id.endsWith(':fk-changed')) {
    // Chromium's native range keyboard increment for step="any" is 1%
    // of its range. Ten ArrowRight actions start at the canonical zero
    // pose; use the independently parsed limits, not the rendered value.
    const pan = model.joints.find(joint => joint.name === 'shoulder_pan')!;
    fail(2, Math.abs((angles.shoulder_pan ?? NaN) - (pan.upper - pan.lower) * .1) > 1e-6, 'changed FK state differs from ten native range increments');
  }
  if (row.id === 'desktop:ik-reached' || row.id === 'desktop:ik-unreachable') {
    const reached = row.id.endsWith(':ik-reached');
    fail(2, row.reachState !== (reached ? 'reached' : 'unreachable') || row.residualMm === null || !row.target || !row.hand, 'IK result lacks its actual state/target/gap');
    if (row.target && row.hand && row.residualMm !== null) fail(2, Math.abs(Math.hypot(...row.target.map((v, i) => v - row.hand![i])) * 1000 - row.residualMm) > 1.8, 'IK text gap differs from hand-target geometry');
  }
  return out;
}
export function playgroundTransitionProblems(rows: readonly PlaygroundReading[]): Record<string, string[]> {
  const out: Record<string, string[]> = {
    'VAL-B2-PLAY-005': [],
    'VAL-B2-PLAY-007': [],
    'VAL-B2-PLAY-012': [],
    'VAL-B2-PLAY-013': []
  };
  const get = (id: string) => {
    const row = rows.find(row => row.id === id);
    if (!row) throw Error('missing required playground state ' + id);
    return row;
  };
  const reset = (profile: string, id: string) => {
    const initial = get(profile + ':default'),
      actual = get(id);
    if (actual.sliders.some(slider => Math.abs(slider.value) > 1e-6) || actual.target !== null || !near(actual.camera, initial.camera, .001) || !near(actual.cameraTarget, initial.cameraTarget, .001)) out['VAL-B2-PLAY-005'].push(id + ': pose, target or camera differs from deterministic default');
  };
  reset('desktop', 'desktop:camera-reset');
  reset('desktop', 'desktop:trajectory-reset');
  reset('phone', 'phone:reset');
  reset('reduced-motion', 'reduced-motion:reset');
  for (const profile of ['desktop', 'reduced-motion']) if (near(get(profile + ':default').camera, get(profile + ':camera-orbit').camera, .001)) out['VAL-B2-PLAY-004'] = [...(out['VAL-B2-PLAY-004'] ?? []), profile + ': canvas keyboard orbit did not move the camera'];
  const reduced = get('reduced-motion:fk-changed');
  if (!reduced.reducedMotion || reduced.canvasCount !== 1 || !reduced.model?.contextActive || reduced.sliders.find(slider => slider.name === 'shoulder_pan')!.value <= 0) out['VAL-B2-PLAY-007'].push('reduced motion lost direct manipulation or live state');
  const high = get('high-dpr:resized');
  if (high.rendererDpr !== 2 || !near(high.sliders.map(s => s.value), get('high-dpr:default').sliders.map(s => s.value))) out['VAL-B2-PLAY-012'].push('DPR/resize changed semantic joint state');
  const imported = get('desktop:trajectory-import'),
    middle = get('desktop:trajectory-middle'),
    resetMotion = get('desktop:trajectory-reset'),
    clear = get('desktop:trajectory-clear');
  if (imported.poseCount !== 2 || middle.poseCount !== 2 || resetMotion.poseCount !== 2 || clear.poseCount !== 0 || clear.progress !== null) out['VAL-B2-PLAY-013'].push('import/reset/clear did not retain and remove the canonical two keyframes correctly');
  if (imported.exportedTrajectory === null || JSON.stringify(JSON.parse(imported.exportedTrajectory)) !== JSON.stringify(CANONICAL_PLAYGROUND_TRAJECTORY)) out['VAL-B2-PLAY-013'].push('imported/exported canonical fixture differs');
  if (!middle.progress || middle.progress.t <= 0 || middle.progress.t >= 1.2 || middle.progress.duration !== 1.2) out['VAL-B2-PLAY-013'].push('no genuine intermediate playback time');else {
    const t = middle.progress.t / 1.2,
      eased = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    for (const slider of middle.sliders) {
      const expected = CANONICAL_PLAYGROUND_TRAJECTORY.keyframes[1].angles[slider.name as keyof typeof CANONICAL_PLAYGROUND_TRAJECTORY.keyframes[1]['angles']] * eased;
      if (Math.abs(slider.value * Math.PI / 180 - expected) > 1e-5) out['VAL-B2-PLAY-013'].push(slider.name + ': intermediate rendered/readout angle differs from independently evaluated fixture interpolation');
    }
  }
  if (clear.sliders.some(slider => Math.abs(slider.value) > 1e-6) || !near(clear.camera, resetMotion.camera, .001)) out['VAL-B2-PLAY-013'].push('Clear changed the reset pose or camera');
  const malformed = get('desktop:malformed-import').message,
    mismatched = get('desktop:mismatched-import').message;
  if (malformed !== 'That file is not valid JSON. Check for typos and try again.') out['VAL-B2-PLAY-006'] = [...(out['VAL-B2-PLAY-006'] ?? []), 'malformed JSON lacks its specific error text'];
  if (!mismatched.startsWith('The keyframe 1 does not match this arm: missing ') || CANONICAL_PLAYGROUND_JOINTS.some(joint => !mismatched.includes(joint))) out['VAL-B2-PLAY-006'] = [...(out['VAL-B2-PLAY-006'] ?? []), 'mismatched motion lacks its missing-joint error text'];
  return out;
}
