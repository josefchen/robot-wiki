import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import matter from 'gray-matter';
import { buildManifest, type JsonValue } from '../../../lib/brand-v2-baseline.ts';
import { type LocalArtifact, type LocalMember } from '../../../lib/audit-local-basis.ts';

export { oracle } from '../parallel-local-20260923/support.ts';

export const DIRECTORY = 'audit/evidence/parallel-local-20261009';
export const ARTICLE = 'content/rl-sim2real/parallel-sim-rl.mdx';
export const COMPONENT = 'components/motion/scenes/batch-scale.tsx';
export const UNIT = 'tests/unit/parallel-local-evidence.test.ts';
export const BROWSER = 'tests/e2e/parallel-local-evidence.spec.ts';
export const ROUTE = '/rl-sim2real/parallel-sim-rl/';
export const MOUNT = `mount:${ROUTE}:BatchScale:1`;
export const ENVS = [64, 4096, 16384] as const;
export const sha = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
export function artifact(path: string): LocalArtifact {
  const bytes = readFileSync(path);
  return { path, bytes: bytes.length, sha256: sha(bytes) };
}
export function member(path: string, excerpt?: string): LocalMember {
  const bytes = readFileSync(path);
  const selected = excerpt === undefined ? bytes : Buffer.from(excerpt);
  const offset = excerpt === undefined ? 0 : bytes.indexOf(selected);
  if (offset < 0) throw Error(`Absent member ${path}`);
  const id = path === ARTICLE ? `article:${path.slice(8, -4)}` : path === COMPONENT ? `source:${path}` : `file:${path}`;
  const result: LocalMember = { file: artifact(path), id, offset, length: selected.length, sha256: sha(selected) };
  if (path === ARTICLE || path === COMPONENT) {
    const kind = path === ARTICLE ? 'prose' : 'interactive-sources-mounts';
    const value: JsonValue = path === ARTICLE ? { path, body: matter(bytes.toString()).content.trim() } : { path, source: bytes.toString() };
    result.baseline = { kind, hash: buildManifest(kind, [{ id, value }]).members[0].hash };
  }
  return result;
}
// A run records the repository root by its neutral public spelling, as the
// earlier evidence runs do (lib/neutral-tooling.ts), so a run started
// anywhere else fails instead of recording a misleading root.
export function runCwd(): string {
  if (!existsSync(join(process.cwd(), DIRECTORY, 'support.ts'))) throw Error('Run from the repository root');
  return '/srv/robot-wiki';
}
export function save(name: string, value: unknown): LocalArtifact {
  const path = `${DIRECTORY}/${name}`;
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  return artifact(path);
}
/** Every file a run executes or reads for its result, each bound whole. */
export function dependencies(browser = false) {
  return [ARTICLE, COMPONENT, 'lib/parallel-sim.ts', 'lib/audit-local-basis.ts',
    `${DIRECTORY}/support.ts`, 'audit/evidence/parallel-local-20260923/support.ts', browser ? BROWSER : UNIT,
    ...(browser ? ['tests/e2e/helpers/figure-fold.ts'] : []),
  ].map(path => member(path));
}
export const cases = [
  { id: 'p18-batch-parameters', recipe: { id: 'batch-scale', mode: 'parameters', inputs: {} } },
  ...ENVS.flatMap(envs => [false, true].map(cpuBound => ({
    id: `p18-batch-${envs}-${cpuBound ? 'on' : 'off'}`,
    recipe: { id: 'batch-scale' as const, mode: 'derive' as const, inputs: { envs, cpuBound } },
  }))),
] as const;

// Independent BatchScale oracle: closed forms only, no production model,
// scene or checker imports.
export function batchOracle(envs: number, cpuBound: boolean) {
  const iterations = 220_000_000 / (envs * 24);
  const simSeconds = 0.02 + 0.000004 * envs;
  const cpuSeconds = 0.03 + (cpuBound ? 0.000022 * envs : 0);
  const totalSeconds = simSeconds + 0.04 + cpuSeconds;
  const seconds = iterations * totalSeconds;
  const words = seconds >= 3600 ? `${(seconds / 3600).toFixed(1)} hours`
    : seconds >= 60 ? `${(seconds / 60).toFixed(1)} minutes` : `${Math.round(seconds)} seconds`;
  const robots = envs.toLocaleString('en-US');
  return {
    iterations, seconds, words, robots,
    breakdown: { simSeconds, learnSeconds: 0.04, cpuSeconds, totalSeconds },
    readout: `${robots} robots at once: ${words} of training`,
    method: `${robots} robots, ${words}`,
    display: cpuBound ? [words] : [`${robots} robots at once: ${words} of training`, `${robots} robots, ${words}`],
  };
}

// The scene stage's plotting frame, restated independently: a log2 robot
// axis from 64 to 16,384 over x 62..234 and a log10 time axis from one
// minute to four hours over y 160..36, coordinates rounded to 0.01.
export function stagePoint(envs: number, seconds: number) {
  const round = (v: number) => Number(v.toFixed(2));
  return {
    x: round(62 + (Math.log2(envs / 64) / 8) * 172),
    y: round(160 - (Math.log10(seconds / 60) / Math.log10(240)) * 124),
  };
}
