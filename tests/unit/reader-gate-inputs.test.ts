import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  READER_INPUTS_SCHEMA, READER_LANES, readerGateInputs, readerInputFiles, runReaderInputsPath,
  verifyReaderInputs, writeReaderInputsForRun, writeRunReaderInputs, type ReaderLane,
} from '../e2e/helpers/reader-gate-inputs';

const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const lanes = Object.keys(READER_LANES) as ReaderLane[];

describe('offline reader gate inputs', () => {
  const root = '/fixture';
  const outputDir = `${root}/test-results`;
  const manifestPath = runReaderInputsPath(outputDir);
  const info = (spec: string) => ({ file: `${root}/${spec}`, project: { outputDir }, config: { configFile: `${root}/playwright.config.ts` } });
  const bytes = (path: string) => Buffer.from(`bytes of ${path}`);
  const current = (patch: object = {}) => ({
    schema: READER_INPUTS_SCHEMA,
    inputs: Object.fromEntries(readerInputFiles(root).map(file => [file, { sha256: sha(bytes(file)) }])),
    ...patch,
  });
  const reader = (manifest: unknown, changed: Record<string, Buffer> = {}) => (path: string) => {
    if (path !== manifestPath) return changed[path] ?? bytes(path);
    if (manifest === undefined) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    return Buffer.from(typeof manifest === 'string' ? manifest : JSON.stringify(manifest));
  };
  const laneFiles = (lane: ReaderLane) => [`${root}/${READER_LANES[lane].specs[0]}`, ...READER_LANES[lane].helpers.map(helper => `${root}/${helper}`)];

  it('keeps explicit program inputs and evidence roots unchanged', () => {
    const env = { ROBOT_WIKI_GATE_INPUTS: '/program/inputs.json', ROBOT_WIKI_EVIDENCE_ROOT: '/program/evidence' };
    const read = (path: string) => {
      if (path !== env.ROBOT_WIKI_GATE_INPUTS) throw new Error(`must not read ${path}`);
      return Buffer.from('program manifest');
    };
    for (const lane of lanes) {
      expect(readerGateInputs(info(READER_LANES[lane].specs[0]), lane, env, read)).toEqual({
        inputPath: env.ROBOT_WIKI_GATE_INPUTS, inputSha256: sha(Buffer.from('program manifest')), root: env.ROBOT_WIKI_EVIDENCE_ROOT,
      });
    }
    expect(() => readerGateInputs(info(READER_LANES.keypoint.specs[0]), 'keypoint', { ROBOT_WIKI_GATE_INPUTS: '/absent' }, () => {
      throw new Error('ENOENT');
    })).toThrow();
  });

  it('binds every registered spec to the current-run manifest and output root', () => {
    const manifest = current();
    for (const lane of lanes) {
      for (const spec of READER_LANES[lane].specs) {
        expect(readerGateInputs(info(spec), lane, {}, reader(manifest))).toEqual({
          inputPath: manifestPath, inputSha256: sha(Buffer.from(JSON.stringify(manifest))), root: outputDir,
        });
      }
    }
  });

  it('fails closed on a missing, unreadable or malformed manifest', () => {
    const spec = info(READER_LANES['motion-planning'].specs[0]);
    expect(() => readerGateInputs(spec, 'motion-planning', {}, reader(undefined))).toThrow(/Missing or unreadable reader input manifest/);
    expect(() => readerGateInputs(spec, 'motion-planning', {}, reader('{"schema":'))).toThrow(/Missing or unreadable reader input manifest/);
    for (const manifest of ['null', current({ schema: 'browser-current-attempt-inputs-v0' }), current({ inputs: null }), { schema: READER_INPUTS_SCHEMA }]) {
      expect(() => readerGateInputs(spec, 'motion-planning', {}, reader(manifest))).toThrow(/Malformed reader input manifest/);
    }
  });

  it('fails closed on every omitted or stale lane input', () => {
    for (const lane of lanes) {
      const spec = info(READER_LANES[lane].specs[0]);
      for (const file of laneFiles(lane)) {
        const omitted = current();
        delete omitted.inputs[file];
        expect(() => readerGateInputs(spec, lane, {}, reader(omitted))).toThrow(`Missing or stale reader input: ${file}`);
        expect(() => readerGateInputs(spec, lane, {}, reader(current(), { [file]: Buffer.from('edited after setup') })))
          .toThrow(`Missing or stale reader input: ${file}`);
      }
    }
  });

  it('rejects unregistered specs and a half-configured program run', () => {
    expect(() => readerGateInputs(info('tests/e2e/unregistered.spec.ts'), 'motion-planning', {}, reader(current())))
      .toThrow(/not registered in the motion-planning reader lane/);
    expect(() => readerGateInputs(info(READER_LANES['state-smoothing'].specs[0]), 'motion-planning', {}, reader(current())))
      .toThrow(/not registered/);
    expect(() => readerGateInputs(info(READER_LANES.keypoint.specs[0]), 'keypoint', { ROBOT_WIKI_EVIDENCE_ROOT: outputDir }, reader(current())))
      .toThrow('ROBOT_WIKI_EVIDENCE_ROOT requires ROBOT_WIKI_GATE_INPUTS');
  });
});

describe('offline reader gate input files', () => {
  const temporary: string[] = [];
  const scratch = () => {
    const dir = mkdtempSync(join(tmpdir(), 'reader-gate-inputs-'));
    temporary.push(dir);
    return dir;
  };
  afterEach(() => {
    for (const dir of temporary.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  it('writes a manifest that verifies until an input changes or the manifest disappears', () => {
    const dir = scratch();
    const files = [join(dir, 'a.spec.ts'), join(dir, 'b.ts')];
    for (const file of files) writeFileSync(file, `content of ${file}`);
    const path = runReaderInputsPath(join(dir, 'out'));
    writeRunReaderInputs(path, files, readFileSync, new Date('2026-09-29T00:00:00Z'));
    const manifest = JSON.parse(readFileSync(path, 'utf8'));
    expect(manifest).toMatchObject({ schema: READER_INPUTS_SCHEMA, createdAt: '2026-09-29T00:00:00.000Z', sourceAuditPerformed: false, independentAcceptance: false });
    expect(Object.keys(manifest.inputs)).toEqual(files);
    expect(verifyReaderInputs(path, files)).toBe(sha(readFileSync(path)));
    writeFileSync(files[1], 'edited');
    expect(() => verifyReaderInputs(path, files)).toThrow(`Missing or stale reader input: ${files[1]}`);
    rmSync(path);
    expect(() => verifyReaderInputs(path, files)).toThrow(/Missing or unreadable reader input manifest/);
  });

  it('writes one manifest per project output directory and none for program runs', () => {
    const [first, second, program] = [scratch(), scratch(), scratch()];
    const repo = process.cwd();
    const configFile = resolve(repo, 'playwright.config.ts');
    writeReaderInputsForRun({ configFile, projects: [{ outputDir: first }, { outputDir: first }, { outputDir: second }] }, {});
    for (const outputDir of [first, second]) {
      for (const lane of lanes) {
        for (const spec of READER_LANES[lane].specs) {
          const test = { file: resolve(repo, spec), project: { outputDir }, config: { configFile } };
          expect(readerGateInputs(test, lane, {})).toMatchObject({ inputPath: runReaderInputsPath(outputDir), root: outputDir });
        }
      }
    }
    writeReaderInputsForRun({ configFile, projects: [{ outputDir: program }] }, { ROBOT_WIKI_GATE_INPUTS: '/program/inputs.json' });
    expect(existsSync(runReaderInputsPath(program))).toBe(false);
  });

  it('registers every spec that runs on an offline reader fixture or resolves a lane', () => {
    const repo = process.cwd();
    for (const file of readerInputFiles(repo)) expect(existsSync(file), file).toBe(true);
    const fixtureLane = { 'motion-planning-offline-fixture': 'motion-planning', 'state-smoothing-fixture': 'state-smoothing' } as const;
    const specs = readdirSync(resolve(repo, 'tests/e2e')).filter(name => name.endsWith('.spec.ts'));
    const found: string[] = [];
    for (const name of specs) {
      const path = `tests/e2e/${name}`;
      const source = readFileSync(resolve(repo, path), 'utf8');
      const fixture = source.match(/import \{[^}]*\btest\b(?! as)[^}]*\} from '\.\/helpers\/(motion-planning-offline-fixture|state-smoothing-fixture)'/)?.[1];
      if (fixture) {
        const lane = fixtureLane[fixture as keyof typeof fixtureLane];
        expect(READER_LANES[lane].specs as readonly string[], path).toContain(path);
        found.push(path);
      }
      for (const [, lane] of source.matchAll(/readerGateInputs\([^,]+,\s*'([a-z-]+)'/g)) {
        expect(READER_LANES[lane as ReaderLane].specs as readonly string[], path).toContain(path);
        found.push(path);
      }
    }
    expect([...new Set(found)].sort()).toEqual(lanes.flatMap(lane => [...READER_LANES[lane].specs]).sort());
    expect(readFileSync(resolve(repo, 'playwright.config.ts'), 'utf8')).toContain("globalSetup: './tests/e2e/helpers/reader-gate-inputs.ts'");
  });
});
