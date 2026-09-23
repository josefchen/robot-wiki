import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import matter from 'gray-matter';
import { buildManifest, type JsonValue } from '../../../lib/brand-v2-baseline.ts';
import { type LocalArtifact, type LocalMember } from '../../../lib/audit-local-basis.ts';

export const DIRECTORY = 'audit/evidence/sim2real-local-20260923';
export const ARTICLE = 'content/rl-sim2real/sim2real-transfer.mdx';
export const UNIT = 'tests/unit/sim2real-local-evidence.test.ts';
export const BROWSER = 'tests/e2e/sim2real-local-evidence.spec.ts';
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
  const article = path === ARTICLE;
  const component = path.startsWith('components/');
  const id = article ? `article:${path.slice(8, -4)}` : component ? `source:${path}` : `file:${path}`;
  const result: LocalMember = { file: artifact(path), id, offset, length: selected.length, sha256: sha(selected) };
  if (article || component) {
    const kind = article ? 'prose' : 'interactive-sources-mounts';
    const value: JsonValue = article ? { path, body: matter(bytes.toString()).content.trim() } : { path, source: bytes.toString() };
    result.baseline = { kind, hash: buildManifest(kind, [{ id, value }]).members[0].hash };
  }
  return result;
}
export function save(name: string, value: unknown): LocalArtifact {
  const path = `${DIRECTORY}/${name}`;
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  return artifact(path);
}
export function dependencies(family: 'friction' | 'teacher') {
  return [
    ARTICLE, `components/interactive/${family === 'friction' ? 'friction-transfer' : 'teacher-student'}.tsx`,
    'lib/sim2real.ts', 'lib/audit-local-basis.ts', UNIT,
    `${DIRECTORY}/proof-support.ts`, `${DIRECTORY}/typed-support.ts`,
  ].map(path => member(path));
}
export const cases = [
  { id: 's23-parameters', family: 'friction', recipe: { id: 'friction', mode: 'parameters', inputs: {} } },
  { id: 's23-default', family: 'friction', recipe: { id: 'friction', mode: 'derive', inputs: { mu: 0.8, range: 0.35 } } },
  { id: 's23-wide', family: 'friction', recipe: { id: 'friction', mode: 'derive', inputs: { mu: 0.8, range: 0.65 } } },
  { id: 's23-tail', family: 'friction', recipe: { id: 'friction', mode: 'derive', inputs: { mu: 1.5, range: 0.35 } } },
  { id: 's24-parameters', family: 'teacher', recipe: { id: 'teacher', mode: 'parameters', inputs: {} } },
  { id: 's24-zero', family: 'teacher', recipe: { id: 'teacher', mode: 'derive', inputs: { degradation: 0 } } },
  { id: 's24-default', family: 'teacher', recipe: { id: 'teacher', mode: 'derive', inputs: { degradation: 0.15 } } },
  { id: 's24-high', family: 'teacher', recipe: { id: 'teacher', mode: 'derive', inputs: { degradation: 1 } } },
] as const;
