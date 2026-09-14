import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ownedReaderBase } from '../e2e/owned-reader-base';

describe('explicit owned reader fixture', () => {
  const root = '/fixture';
  const files = ['data/glossary.ts', 'data/citations.ts', 'tests/e2e/glossary.spec.ts', 'tests/e2e/owned-reader-base.ts'];
  const bytes = Buffer.from('bound input');
  const bound = { bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
  const make = () => ({
    requiredStage: 'orb-reader-closeout-v1:readers', readerBaseURL: 'http://127.0.0.1:3264',
    inputs: Object.fromEntries(files.map(p => [`${root}/${p}`, { ...bound }])),
    requiredInputs: Object.fromEntries(files.map(p => [`${root}/${p}`, { ...bound }])),
  });
  const env = { ROBOT_WIKI_SCOPED_READER_URL: 'http://127.0.0.1:3264', ROBOT_WIKI_GATE_INPUTS: '/manifest' };
  it('keeps the normal static-export fixture when not opted in', () => {
    expect(ownedReaderBase({}, () => { throw new Error('must not read'); }, root)).toBeUndefined();
  });
  it('accepts only the exactly bound scoped target and bytes', () => {
    const manifest = make();
    expect(ownedReaderBase(env, p => p === '/manifest' ? Buffer.from(JSON.stringify(manifest)) : bytes, root)).toBe(env.ROBOT_WIKI_SCOPED_READER_URL);
  });
  it('rejects remote or unbound targets', () => {
    for (const url of ['https://example.org', 'http://localhost:3264', 'http://127.0.0.1:3264/path']) {
      expect(() => ownedReaderBase({ ...env, ROBOT_WIKI_SCOPED_READER_URL: url }, () => bytes, root)).toThrow();
    }
    expect(() => ownedReaderBase({ ROBOT_WIKI_SCOPED_READER_URL: env.ROBOT_WIKI_SCOPED_READER_URL }, () => bytes, root)).toThrow();
  });
  it('rejects a wrong run role or target', () => {
    for (const patch of [{ requiredStage: 'export-acceptance' }, { readerBaseURL: 'http://127.0.0.1:9999' }]) {
      expect(() => ownedReaderBase(env, p => p === '/manifest' ? Buffer.from(JSON.stringify({ ...make(), ...patch })) : bytes, root)).toThrow();
    }
  });
  it('rejects every omitted required consumer', () => {
    for (const path of files) {
      const manifest = make();
      delete manifest.requiredInputs[`${root}/${path}`];
      expect(() => ownedReaderBase(env, p => p === '/manifest' ? Buffer.from(JSON.stringify(manifest)) : bytes, root)).toThrow();
    }
  });
  it('rejects stale bytes and missing manifest membership', () => {
    const manifest = make();
    expect(() => ownedReaderBase(env, p => p === '/manifest' ? Buffer.from(JSON.stringify(manifest)) : Buffer.from('changed'), root)).toThrow();
    delete manifest.inputs[`${root}/${files[0]}`];
    expect(() => ownedReaderBase(env, p => p === '/manifest' ? Buffer.from(JSON.stringify(manifest)) : bytes, root)).toThrow();
  });
});
