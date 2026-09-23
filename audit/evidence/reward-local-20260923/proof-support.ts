import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import matter from 'gray-matter';
import { buildManifest, type JsonValue } from '../../../lib/brand-v2-baseline.ts';
import {
  recomputeLocalDerivation, type LocalArtifact, type LocalMember,
} from '../../../lib/audit-local-basis.ts';

export const ROOT = process.cwd();
export const DIRECTORY = 'audit/evidence/reward-local-20260923';
export const ARTICLE = 'content/rl-sim2real/reward-design-mpc.mdx';
export const UNIT = 'tests/unit/reward-local-evidence.test.ts';
export const BROWSER = 'tests/e2e/reward-local-evidence.spec.ts';
export const rewardDisclosure = 'This local teaching model uses twelve authored terms, weights and fixed per-term magnitudes. Its signed weighted total is dimensionless per step, not a measured reward. Freeze, prance and chatter are chosen classification rules and drawn poses, not trained policies, measured control frequencies or actuator-damage predictions.';
export const eurekaDisclosure = 'The panel below is a scripted teaching example of the Eureka loop, not a recorded Eureka or PPO experiment. All three generations, reward code, statistics, fitness scores and reflections are authored fixtures. The sequence illustrates sprinting and falling, standing still, then tracking a command; clicking advances the script without training a policy or calling a language model.';
export const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
export function artifact(path: string): LocalArtifact {
  const bytes = readFileSync(join(ROOT, path));
  return { path, bytes: bytes.length, sha256: sha(bytes) };
}
export function member(path: string, excerpt?: string): LocalMember {
  const file = artifact(path);
  const bytes = readFileSync(join(ROOT, path));
  const isArticle = path === ARTICLE;
  const isComponent = path.startsWith('components/');
  const id = isArticle ? `article:${path.slice(8, -4)}` : isComponent ? `source:${path}` : `file:${path}`;
  const selected = excerpt === undefined ? bytes : Buffer.from(excerpt);
  const offset = excerpt === undefined ? 0 : bytes.indexOf(selected);
  if (offset < 0) throw Error(`Absent exact member: ${path}`);
  const ref: LocalMember = { file, id, offset, length: selected.length, sha256: sha(selected) };
  if (isArticle || isComponent) {
    const kind = isArticle ? 'prose' : 'interactive-sources-mounts';
    const value: JsonValue = isArticle
      ? { path, body: matter(bytes.toString()).content.trim() }
      : { path, source: bytes.toString() };
    ref.baseline = { kind, hash: buildManifest(kind, [{ id, value }]).members[0].hash };
  }
  return ref;
}
export function save(name: string, value: unknown): LocalArtifact {
  const path = `${DIRECTORY}/${name}`;
  writeFileSync(join(ROOT, path), JSON.stringify(value, null, 2) + '\n');
  return artifact(path);
}
export function dependencies(id: 'reward' | 'eureka', test: string): LocalMember[] {
  return [
    ARTICLE,
    `components/interactive/${id === 'reward' ? 'reward-shaping' : 'eureka-loop'}.tsx`,
    `lib/${id === 'reward' ? 'reward-shaping' : 'eureka'}.ts`,
    ...(id === 'reward' ? ['lib/gait.ts'] : []),
    'lib/audit-local-basis.ts', test, `${DIRECTORY}/proof-support.ts`,
  ].map(path => member(path));
}
export function extract(recipe: unknown) {
  return recomputeLocalDerivation(recipe);
}
export const defaults = {
  velTrack: 1, yawTrack: 0.5, torque: 0.8, jointAccel: 0.5, actionRate: 0.8,
  jointLimit: 1, collision: 1, baseHeight: 0.5, orientation: 0.8,
  airTime: 0.6, stumble: 0.8, termination: 1.5,
};
export const rewardCases = {
  default: { ...defaults },
  freeze: { ...defaults, torque: 4 },
  prance: { ...defaults, airTime: 4 },
  chatter: { ...defaults, actionRate: 0 },
  dominanceCounterexample: { ...defaults, velTrack: 4, torque: 4 },
  priorityTie: { ...defaults, torque: 4, airTime: 4 },
};
export function rewardRecipe(name: keyof typeof rewardCases) {
  return { id: 'reward' as const, mode: 'derive' as const, inputs: { weights: rewardCases[name], phase: 0 } };
}
export function eurekaRecipe(next: number) {
  return { id: 'eureka' as const, mode: 'derive' as const, inputs: { previous: Math.max(0, next - 1), next } };
}
