import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { afterEach, describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../..');
// Runtime specimens keep forbidden attribution vocabulary out of this file.
const toolName = String.fromCharCode(99, 111, 100, 101, 120);
const scientificPhrase = `OpenAI ${toolName[0].toUpperCase()}${toolName.slice(1)} code-davinci-002`;
const scientificLine = readFileSync(join(root, 'audit/compound-evidence.json'), 'utf8')
  .split('\n').find((line) => line.includes(scientificPhrase))!;
const policyLine = readFileSync(join(root, 'lib/reader-first.ts'), 'utf8')
  .split('\n').find((line) => line.startsWith('const NAMED_TOOL = '))!;
const scratch: string[] = [];
afterEach(() => { for (const path of scratch.splice(0)) rmSync(path, { recursive: true, force: true }); });

function check(text: string, file = 'evidence/reader-first/fixture.json', compressed = false) {
  const directory = mkdtempSync(join(tmpdir(), 'neutral-vocabulary-test-')); scratch.push(directory);
  mkdirSync(join(directory, 'scripts'));
  cpSync(join(root, 'scripts/check-neutral-tooling.ts'), join(directory, 'scripts/check-neutral-tooling.ts'));
  mkdirSync(dirname(join(directory, file)), { recursive: true });
  const bytes = compressed ? gzipSync(text) : Buffer.from(text);
  writeFileSync(join(directory, file), bytes);
  execFileSync('git', ['init', '-q', directory]);
  execFileSync('git', ['add', '--', file, 'scripts/check-neutral-tooling.ts'], { cwd: directory });
  const run = spawnSync(process.execPath, ['scripts/check-neutral-tooling.ts'], { cwd: directory, encoding: 'utf8' });
  expect(readFileSync(join(directory, file))).toEqual(bytes);
  return run;
}

describe('public attribution vocabulary', () => {
  it.each([toolName, toolName.toUpperCase(), `${toolName[0].toUpperCase()}${toolName.slice(1)}`, toolName.split('').map((letter, index) => index % 2 ? letter.toUpperCase() : letter).join('')])
    ('rejects an attribution in every case variant (%#)', (name) => {
      const run = check(JSON.stringify({ reviewerSession: `${name}-blind-reader` }));
      expect(run.status).toBe(1);
      expect(run.stderr).toContain('outside the quoted passage');
    });

  it('accepts an explicitly automated neutral identity', () => {
    expect(check(JSON.stringify({ reviewerSession: 'reader-session-automated-r4-a-20261103' })).status).toBe(0);
  });

  it('preserves the original quoted scientific passage', () => {
    expect(scientificLine).toContain(scientificPhrase);
    expect(check(scientificLine, 'audit/quoted-source.json').status).toBe(0);
  });

  it('does not let the scientific passage exempt an unrelated attribution on the same line', () => {
    const run = check(`${scientificLine} reviewerSession=${toolName}-blind-reader`);
    expect(run.status).toBe(1);
    expect(run.stderr).toContain('outside the quoted passage');
  });

  it.each([false, true])('applies the rule inside compressed history payloads (forbidden=%s)', (forbidden) => {
    const path = `tests/fixtures/history/blobs/${'a'.repeat(64)}.txt.gz`;
    const run = check(forbidden ? `reviewerSession=${toolName}-blind-reader` : scientificLine, path, true);
    expect(run.status).toBe(forbidden ? 1 : 0);
  });

  it('allows only the exact reader policy declaration in its owning file', () => {
    expect(check(policyLine, 'lib/reader-first.ts').status).toBe(0);
    expect(check(`${policyLine} const attribution = '${toolName}';`, 'lib/reader-first.ts').status).toBe(1);
    expect(check(policyLine, 'lib/unrelated.ts').status).toBe(1);
  });
});
