import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import matter from 'gray-matter';
import { buildManifest, type JsonValue } from '../../../lib/brand-v2-baseline.ts';
import { type LocalArtifact, type LocalMember } from '../../../lib/audit-local-basis.ts';

export const DIRECTORY = 'audit/evidence/parallel-local-20260923';
export const ARTICLE = 'content/rl-sim2real/parallel-sim-rl.mdx';
export const COMPONENT = 'components/interactive/training-time-chart.tsx';
export const UNIT = 'tests/unit/parallel-local-evidence.test.ts';
export const BROWSER = 'tests/e2e/parallel-local-evidence.spec.ts';
export const ROUTE = '/rl-sim2real/parallel-sim-rl/';
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
export function save(name: string, value: unknown): LocalArtifact {
  const path = `${DIRECTORY}/${name}`;
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  return artifact(path);
}
export function dependencies(browser = false) {
  return [ARTICLE, COMPONENT, 'lib/parallel-sim.ts', 'lib/audit-local-basis.ts',
    `${DIRECTORY}/support.ts`, browser ? BROWSER : UNIT,
    ...(browser ? ['tests/e2e/slider.ts', 'playwright.config.ts', 'package-lock.json'] : []),
  ].map(path => member(path));
}
export const cases = [
  { id: 'p18-parameters', recipe: { id: 'parallel', mode: 'parameters', inputs: {} } },
  ...[64, 4096, 16384].flatMap(envs => [false, true].map(cpuBound => ({
    id: `p18-${envs}-${cpuBound ? 'on' : 'off'}`,
    recipe: { id: 'parallel' as const, mode: 'derive' as const, inputs: { envs, cpuBound, samples: 49 } },
  }))),
] as const;

// Independent numeric oracle: no production model or native adapter imports.
// Closed-form time separates inverse-env fixed costs from marginal cost.
export const round2 = (n: number) => Number(n.toFixed(2));
export function oracle(envs: number, cpuBound: boolean) {
  const marginal = cpuBound ? 26 / 1_000_000 : 4 / 1_000_000;
  const sim = 0.02 + envs / 250_000;
  const cpu = 0.03 + (cpuBound ? 22 * envs / 1_000_000 : 0);
  const total = sim + 0.04 + cpu;
  const iterations = 220_000_000 / 24 / envs;
  const seconds = (220_000_000 / 24) * (0.09 / envs + marginal);
  const fps = 24 / (0.09 / envs + marginal);
  const clock = (s: number) => s >= 3600 ? `${(s / 3600).toFixed(1)} h`
    : s >= 60 ? `${(s / 60).toFixed(1)} min` : `${Math.round(s)} s`;
  const rate = (v: number) => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M FPS`
    : v >= 1000 ? `${Math.round(v / 1000)}k FPS` : `${Math.round(v)} FPS`;
  // 8 octaves / 48 intervals = one sixth of an octave per interval.
  const curve = Array.from({ length: 49 }, (_, i) => {
    const n = Math.round(2 ** (6 + i / 6));
    return { envs: n, minutes: round2((220_000_000 / 24) * (0.09 / n + marginal) / 60) };
  });
  const shares = [sim, 0.04, cpu].map(x => round2(100 * x / total));
  const x = (n: number) => round2(64 + (Math.log2(n) - 6) * 70);
  const y = (minutes: number) => round2(316 - Math.log10(minutes) / Math.log10(300) * 300);
  return {
    breakdown: { simSeconds: sim, learnSeconds: 0.04, cpuSeconds: cpu, totalSeconds: total },
    iterations, seconds, fps, crossover: cpuBound ? null : 12500, curve,
    display: [envs.toLocaleString('en-US'), clock(seconds), rate(fps)],
    iterationDisplay: `${Math.round(total * 1000)} ms x ${Math.round(iterations).toLocaleString('en-US')} iters`,
    shares, shareDisplay: shares.map(v => `${Math.round(v)}%`),
    barWidths: shares.map(v => round2(v * 6.4)),
    point: { x: x(envs), y: y(round2(seconds / 60)) },
    polyline: curve.map(p => `${x(p.envs)},${y(p.minutes)}`).join(' '),
  };
}
