import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { decodePng } from './png-decode.ts';
import { releaseArtifactHash } from './brand-v2-release-evidence.ts';
import { evaluateReferenceFeatures, referenceComparisonPayloadSchema, type ReferenceFeatureMeasurements } from './brand-v2-reference-rubric.ts';
import type { DeepRow, OrderedCapture } from './brand-v2-runners.ts';

const text = z.string().min(1);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const size = z.number().positive();
const viewport = z.object({ width: size, height: size }).strict();
const shot = z.object({ path: text, sha256: hash }).strict();
export const deepPhaseSchema = shot.extend({ id: text, afterStep: text, subject: text, width: size, height: size }).strict();
export type DeepPhaseCapture = z.infer<typeof deepPhaseSchema>;

export const deepComputedSchema = z.object({
  publicText: text, viewport, fontsLoaded: z.boolean(), pendingFonts: z.array(text),
  busy: z.array(text), transitions: z.array(text),
  tokens: z.record(z.string(), z.string()),
  elements: z.array(z.object({
    selector: text, text: z.string(), fontFamily: text, fontSize: text, lineHeight: text,
    colour: text, background: text, radius: text, shadow: text, filter: text,
    outline: text, outlineOffset: text, aria: z.record(z.string(), z.string()),
  }).strict()).min(1),
}).strict();

export const deepReleaseSchema = z.object({
  version: z.literal(1), sourceFingerprint: hash, exportFingerprint: hash,
  id: text, declaredRoute: text, renderedRoute: text, viewport, state: text,
  expectedSteps: z.array(text).min(1), executedSteps: z.array(text).min(1),
  captures: z.array(z.object({ order: z.number().int().positive(), id: text, afterStep: text, kind: z.enum(['full-page','bounded','computed-style','semantic']) }).strict()).min(1),
  documentCapture: z.object({
    geometry: viewport.extend({ documentHeight: size, scrollY: z.number().nonnegative() }).strict(),
    files: z.array(shot.extend({ top: z.number().nonnegative(), bottom: size }).strict()).min(1),
  }).strict(),
  phaseCaptures: z.array(deepPhaseSchema).min(1), bounded: shot,
  computed: deepComputedSchema,
  measurements: z.custom<ReferenceFeatureMeasurements>((value) => Boolean(value && typeof value === 'object')),
  payload: referenceComparisonPayloadSchema,
  referenceHashes: z.array(shot).length(2),
}).strict();
export type DeepReleaseArtifact = z.infer<typeof deepReleaseSchema>;

/** The subject is derived from the executed action. A missing company sheet,
 * figure or live stage may never fall back to an unrelated page heading. */
export function deepPhaseSubject(row: DeepRow, capture: OrderedCapture): string {
  const action = row.steps.find(({ id }) => id === capture.afterStep)?.action;
  if (!action) throw new Error(`${row.id}: capture has no owning step`);
  if (action === 'open-drawer' || action === 'cycle-focus') return 'open navigation dialog';
  if (action === 'select-company') return 'selected company detail';
  if (row.route === '/playground/') return 'live playground stage';
  if (action === 'scroll-heading') return 'article section heading';
  if (action === 'focus-copy-link') return 'article figure';
  if (action === 'focus-table' || action === 'scroll-table') return 'article table';
  if (row.route === '/search/') return 'search state';
  if (row.route === '/market-map/') return 'market map state';
  if (action === 'focus-first-letter') return 'A-Z letter navigation';
  if (action === 'activate-glossary-entry') return 'glossary destination';
  return 'page identity';
}

/** Decode actual bytes with the checked-in PNG decoder. A valid header alone
 * cannot prove an image, its dimensions, or a nonblank captured subject. */
export function releaseScreenshotFacts(bytes: Uint8Array) {
  const decoded = decodePng(bytes);
  if (!decoded.width || !decoded.height) throw new Error('release screenshot has no area');
  const colours = new Set<number>();
  for (let at = 0; at < decoded.rgba.length; at += 4) {
    if (decoded.rgba[at + 3] === 0) continue;
    colours.add((decoded.rgba[at] << 16) | (decoded.rgba[at + 1] << 8) | decoded.rgba[at + 2]);
    if (colours.size > 8) break;
  }
  if (colours.size < 2) throw new Error('release screenshot is blank or fully transparent');
  return { width: decoded.width, height: decoded.height, distinctColourFloor: colours.size };
}

export function readDeepReleaseArtifact(root: string, row: DeepRow, fingerprint: string, exported: string, input: unknown): DeepReleaseArtifact {
  const artifact = deepReleaseSchema.parse(input);
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  const reject = (condition: boolean, reason: string) => { if (condition) throw new Error(`${row.id}: ${reason}`); };
  reject(artifact.sourceFingerprint !== fingerprint || artifact.id !== row.id || artifact.declaredRoute !== row.route || artifact.state !== row.state || !same(artifact.viewport, row.viewport), 'stale or misidentified deep evidence');
  reject(artifact.exportFingerprint !== exported, 'deep capture came from another production export');
  const renderedRoute = row.state === 'home-to-credits' ? '/credits/' : row.state === 'az-to-glossary' ? '/glossary/' : row.route;
  reject(artifact.renderedRoute !== renderedRoute, 'rendered route is not the declared action destination');
  const steps = row.steps.map(({ id }) => id);
  reject(!same(artifact.expectedSteps, steps) || !same(artifact.executedSteps, steps), 'missing or reordered executed deep steps');
  reject(!same(artifact.captures, row.captures), 'capture plan differs from the sealed execution plan');
  const phases = row.captures.filter(({ kind }) => kind === 'bounded');
  reject(!same(phases.map(({ id }) => id), artifact.phaseCaptures.map(({ id }) => id)), 'missing or reordered phase capture');
  for (const [i, phase] of artifact.phaseCaptures.entries()) reject(phase.afterStep !== phases[i].afterStep || phase.subject !== deepPhaseSubject(row, phases[i]), 'phase subject or owning step differs');
  reject(!same(artifact.computed.viewport, row.viewport) || !artifact.computed.fontsLoaded || artifact.computed.pendingFonts.length > 0 || artifact.computed.busy.length > 0 || artifact.computed.transitions.length > 0, 'unsettled fonts, data, transitions or viewport');
  for (const token of ['--color-paper', '--color-ink', '--color-signal']) reject(!artifact.computed.tokens[token]?.trim(), `missing computed token ${token}`);
  const derived = evaluateReferenceFeatures(artifact.measurements);
  reject(!artifact.payload.passed || !derived.passed || !same(artifact.payload.anchors, derived.anchors), 'reference anchors failed or disagree with raw measurement');
  reject(artifact.payload.surfaceId !== row.id || !same(artifact.measurements.viewport, row.viewport), 'reference measurement has the wrong surface or viewport');
  const shots = artifact.documentCapture.files;
  const geometry = artifact.documentCapture.geometry;
  reject(geometry.width !== row.viewport.width || geometry.height !== row.viewport.height || shots[0].top !== 0 || shots.at(-1)!.bottom < geometry.documentHeight || shots.some((s, i) => s.bottom <= s.top || s.bottom > geometry.documentHeight || i > 0 && s.top > shots[i - 1].bottom), 'full-document evidence has a missing or invalid interval');
  reject(!same(artifact.payload.screenshotPaths, [...shots.map(({ path }) => path), artifact.bounded.path]), 'screenshot index differs');
  reject(!same(artifact.referenceHashes.map(({ path }) => path), artifact.payload.referenceIds), 'approved reference hash is missing');
  for (const file of [...shots, artifact.bounded, ...artifact.referenceHashes, ...artifact.phaseCaptures]) reject(releaseArtifactHash(root, file.path) !== file.sha256, `changed evidence bytes ${file.path}`);
  for (const file of [...shots, artifact.bounded]) {
    const facts = releaseScreenshotFacts(readFileSync(join(root, file.path)));
    reject(facts.width !== row.viewport.width, `screenshot width differs ${file.path}`);
    const interval = shots.find(({ path }) => path === file.path);
    if (interval) reject(facts.height < interval.bottom - interval.top, `screenshot omits document pixels ${file.path}`);
    if (file === artifact.bounded) reject(facts.height !== row.viewport.height, 'bounded viewport capture dimensions differ');
  }
  for (const phase of artifact.phaseCaptures) {
    const facts = releaseScreenshotFacts(readFileSync(join(root, phase.path)));
    reject(Math.abs(facts.width - phase.width) > 1 || Math.abs(facts.height - phase.height) > 1, `phase capture dimensions differ ${phase.path}`);
  }
  return artifact;
}
