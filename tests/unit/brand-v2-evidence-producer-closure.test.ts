import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { clearEvidenceClosureGraph, deriveEvidenceClosure } from '@/lib/brand-v2-evidence-closure';

const roots: string[] = [];
afterEach(() => { clearEvidenceClosureGraph(); for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'brand-v2-producer-closure-'));
  roots.push(root);
  for (const name of ['app', 'components', 'lib', 'content', 'data', 'tests', 'scripts']) mkdirSync(join(root, name));
  const put = (path: string, source: string) => { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), source); clearEvidenceClosureGraph(); };
  for (const path of ['mdx-components.tsx', 'playwright.config.ts', 'playwright.release.config.ts']) put(path, 'export {};');
  put('tests/e2e/sweep.ts', "import { context } from './helpers/context'; export const sweep = context;");
  put('tests/e2e/helpers/context.ts', "import { viewport } from '../../helpers/e2e-viewport'; export const context = viewport;");
  put('tests/helpers/e2e-viewport.ts', "import { measured } from '../../scripts/measurement'; export const viewport = measured;");
  put('scripts/measurement.ts', 'export const measured = 375;');
  const read = () => deriveEvidenceClosure({ root, entries: ['tests/e2e/sweep.ts'] });
  return { put, read };
}

describe('evidence producer dependency roots', () => {
  it('traverses support helpers and scripts transitively, while hashing only reached modules', () => {
    const { put, read } = fixture();
    put('tests/helpers/unused.ts', 'export const unused = 1;');
    const before = read();
    expect(before.modules).toEqual(['scripts/measurement.ts', 'tests/e2e/helpers/context.ts', 'tests/e2e/sweep.ts', 'tests/helpers/e2e-viewport.ts']);
    put('tests/helpers/unused.ts', 'export const unused = 2;');
    expect(read().fingerprint).toBe(before.fingerprint);
    put('scripts/measurement.ts', 'export const measured = 376;');
    expect(read().fingerprint).not.toBe(before.fingerprint);
  });

  it('fails closed when a transitive first-party import cannot be resolved', () => {
    const { put, read } = fixture();
    put('scripts/measurement.ts', "import { absent } from './missing'; export const measured = absent;");
    expect(read).toThrow(/missing/);
  });

  it('does not turn an existing module outside declared roots into an opaque asset', () => {
    const { put, read } = fixture();
    put('outside/measurement.ts', 'export const measured = 375;');
    put('scripts/measurement.ts', "export { measured } from '../outside/measurement';");
    expect(read).toThrow(/unscanned-module|outside\/measurement/);
  });
});
