import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GRASP_READER_INPUTS, graspReaderBase } from '../e2e/grasp-reader-inputs';

const root = '/fixture';
const url = 'http://127.0.0.1:3268';
const env = { ROBOT_WIKI_SCOPED_READER_URL: url, ROBOT_WIKI_GATE_INPUTS: '/manifest' };
function fixture() {
  const names = [...GRASP_READER_INPUTS, 'tests/e2e/glossary.spec.ts', 'tests/e2e/owned-reader-base.ts'];
  const files = new Map(names.map(name => [resolve(root, name), Buffer.from(name)]));
  const inputs = Object.fromEntries([...files].map(([path, bytes]) =>
    [path, { bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }]));
  const manifest = { requiredStage: 'orb-reader-closeout-v1:readers', readerBaseURL: url,
    requiredInputs: structuredClone(inputs), inputs: structuredClone(inputs) };
  const read = (path: string) => path === '/manifest' ? Buffer.from(JSON.stringify(manifest)) : files.get(path)!;
  return { files, manifest, read };
}

describe('owned grasp reader input boundary', () => {
  it('leaves the standard fixture unchanged without opt-in', () => {
    expect(graspReaderBase({}, () => { throw new Error('Unexpected read'); }, root)).toBeUndefined();
  });
  it('accepts the complete exact reader population', () => {
    expect(graspReaderBase(env, fixture().read, root)).toBe(url);
  });
  for (const name of GRASP_READER_INPUTS) {
    it(`refuses missing and stale ${name} before navigation`, () => {
      const path = resolve(root, name);
      const missing = fixture();
      delete missing.manifest.requiredInputs[path];
      expect(() => graspReaderBase(env, missing.read, root)).toThrow();
      const stale = fixture();
      stale.files.set(path, Buffer.from('changed'));
      expect(() => graspReaderBase(env, stale.read, root)).toThrow();
    });
  }
});
