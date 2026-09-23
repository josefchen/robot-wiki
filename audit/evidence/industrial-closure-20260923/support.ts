import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import matter from 'gray-matter';
import { buildManifest, type JsonValue } from '../../../lib/brand-v2-baseline.ts';
import type { LocalArtifact, LocalMember } from '../../../lib/audit-local-basis.ts';
export { defaults, ranges, oracle } from '../economics-local-20260923/support.ts';

export const DIRECTORY = 'audit/evidence/industrial-closure-20260923';
export const ARTICLE = 'content/data-hardware/industrial-deployment.mdx';
export const COMPONENT = 'components/interactive/deployment-economics.tsx';
export const UNIT = 'tests/unit/industrial-closure-evidence.test.ts';
export const BROWSER = 'tests/e2e/industrial-deployment.spec.ts';
export const ROUTE = '/data-hardware/industrial-deployment/';
export const sha = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');
export function artifact(path: string): LocalArtifact {
  const bytes = readFileSync(path);
  return { path, bytes: bytes.length, sha256: sha(bytes) };
}
export function member(path: string, excerpt?: string): LocalMember {
  const bytes = readFileSync(path);
  const selected = excerpt === undefined ? bytes : Buffer.from(excerpt);
  const offset = bytes.indexOf(selected);
  if (offset < 0) throw Error(`Missing excerpt: ${path}`);
  const prose = path === ARTICLE, source = path === COMPONENT;
  const id = prose ? `article:${path.slice(8, -4)}` : source ? `source:${path}` : `file:${path}`;
  const result: LocalMember = { file: artifact(path), id, offset, length: selected.length, sha256: sha(selected) };
  if (prose || source) {
    const kind = prose ? 'prose' : 'interactive-sources-mounts';
    const value: JsonValue = prose ? { path, body: matter(bytes.toString()).content.trim() } : { path, source: bytes.toString() };
    result.baseline = { kind, hash: buildManifest(kind, [{ id, value }]).members[0].hash };
  }
  return result;
}
export function save(name: string, value: unknown) {
  const path = `${DIRECTORY}/${name}`;
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  return artifact(path);
}
export function dependencies(browser = false) {
  return [ARTICLE, COMPONENT, 'lib/deployment-economics.ts', 'lib/audit-local-basis.ts',
    `${DIRECTORY}/support.ts`, 'audit/evidence/economics-local-20260923/support.ts',
    browser ? BROWSER : UNIT, ...(browser ? ['tests/e2e/slider.ts'] : [])].map(path => member(path));
}
export const surfacePaths = [ARTICLE, 'data/glossary.ts', 'data/citations.ts', 'data/schemas/citation.ts',
  'components/article/references.tsx', 'components/ui/term.tsx', 'components/ui/cite.tsx',
  'lib/deployment-economics.ts', COMPONENT, BROWSER, `${DIRECTORY}/support.ts`];
