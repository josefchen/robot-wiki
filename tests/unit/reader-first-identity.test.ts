import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  readerRecordIdentityProblems, readRegistry, recordPath, recordProblems, screenshotPath, sourceDigest,
  type ReaderRecord, type RegistryEntry,
} from '../../lib/reader-first';
import { loadRubric, RUBRIC_PATH } from '../../lib/reader-first-rubric';

const root = resolve(import.meta.dirname, '../..');
const toolName = String.fromCharCode(99, 111, 100, 101, 120);
const product = readRegistry(root).figures.find(({ id }) => id === 'manipulation--comparison-matrix--chunk-buffer')!;
const neutral: RegistryEntry = {
  id: 'fixture--one', route: '/credits/', mount: 'mount:/credits/:Fixture:1', figure: 'fixture', audit: null,
  sources: ['components/fixture.ts'], takeaway: 'A figure explains one point.',
};
const makeRecord = (entry = neutral): ReaderRecord => ({
  schemaVersion: 'reader-first-record-v1', route: entry.route, mount: entry.mount,
  screenshots: { 1280: screenshotPath(entry.id, 1280), 375: screenshotPath(entry.id, 375) },
  takeaway: entry.takeaway, sentence: 'The figure explains one point.', unclearTerms: [], samePoint: 'yes', reason: 'The points agree.',
  verdict: 'pass', screenshotCommit: 'abcdef1', date: '2026-11-03', reviewerSession: 'reader-session-automated-r4-a-20261103',
  sourceDigest: 'a'.repeat(64), rubricDigest: loadRubric(root).digest,
});
const scratch: string[] = [];
afterEach(() => { for (const path of scratch.splice(0)) rmSync(path, { recursive: true, force: true }); });
const put = (base: string, file: string, text: string) => {
  mkdirSync(dirname(join(base, file)), { recursive: true }); writeFileSync(join(base, file), text);
};

describe('reader identity and the registered robotics product', () => {
  it('accepts a neutral automated session without requiring a passing review', () => {
    expect(readerRecordIdentityProblems(makeRecord(), neutral)).toEqual([]);
    expect(readerRecordIdentityProblems({ ...makeRecord(), verdict: 'fail', samePoint: 'no', unclearTerms: ['unfamiliar'] }, neutral)).toEqual([]);
  });

  it.each([toolName, toolName.toUpperCase(), `${toolName[0].toUpperCase()}${toolName.slice(1)}`])
    ('rejects named reviewer identities in every case (%#)', (name) => {
      expect(readerRecordIdentityProblems({ ...makeRecord(), reviewerSession: `${name}-blind-reader` }, neutral))
        .toContain('record lacks its commit, date or neutral reviewer session');
      expect(readerRecordIdentityProblems({ ...makeRecord(), reviewerSession: `reader-session-${name}-review` }, neutral))
        .toContain('record names a tool, model or vendor');
    });

  it('rejects a neutral-looking identifier without the required prefix', () => {
    expect(readerRecordIdentityProblems({ ...makeRecord(), reviewerSession: 'automated-r4-a' }, neutral))
      .toContain('record lacks its commit, date or neutral reviewer session');
  });

  it.each(['sentence', 'reason', 'unclearTerms'] as const)('keeps the genuine product in %s without rewriting observations', (field) => {
    const record = { ...makeRecord(product), [field]: field === 'unclearTerms' ? ['Gemini Robotics: an unfamiliar product name'] : 'Gemini Robotics controls the arm.' };
    const before = structuredClone(record);
    expect(readerRecordIdentityProblems(record, product)).toEqual([]);
    expect(record).toEqual(before);
  });

  it('accepts the exact product takeaway and a differently cased product mention', () => {
    expect(readerRecordIdentityProblems({ ...makeRecord(product), sentence: 'GEMINI ROBOTICS supplies chunks.' }, product)).toEqual([]);
  });

  it.each(['entry-id', 'entry-takeaway', 'record-takeaway', 'route', 'mount'])('refuses an unrelated or changed product binding (%s)', (change) => {
    const entry = structuredClone(product), record = makeRecord(entry);
    record.sentence = 'Gemini Robotics controls the arm.';
    if (change === 'entry-id') entry.id = 'fixture--unrelated';
    if (change === 'entry-takeaway') entry.takeaway += ' Changed.';
    if (change === 'record-takeaway') record.takeaway += ' Changed.';
    if (change === 'route') record.route = '/another/';
    if (change === 'mount') record.mount = 'mount:/another/:Other:1';
    expect(readerRecordIdentityProblems(record, entry)).toContain('record names a tool, model or vendor');
  });

  it.each(['Gemini predicts movements.', 'Reviewed by Gemini Robotics.', 'Gemini Robotics as reviewer supplied this.', `Read by ${toolName}.`, 'gpt supplied the review.'])
    ('retains plain-name, attribution and other-tool rejection (%#)', (sentence) => {
      expect(readerRecordIdentityProblems({ ...makeRecord(product), sentence }, product)).toContain('record names a tool, model or vendor');
    });

  it('never exempts identity or extra attribution metadata', () => {
    expect(readerRecordIdentityProblems({ ...makeRecord(product), reviewerSession: 'reader-session-gemini-robotics' }, product))
      .toContain('record names a tool, model or vendor');
    const record = { ...makeRecord(product), reviewedBy: 'Gemini Robotics' };
    expect(readerRecordIdentityProblems(record, product)).toContain('record names a tool, model or vendor');
  });

  it.each([
    'The reviewer was Gemini Robotics.',
    'This review was produced by Gemini Robotics.',
    'I used Gemini Robotics to evaluate this figure.',
    'This figure was checked by Gemini Robotics.',
    'Gemini Robotics produced this review.',
  ].flatMap((text) => (['sentence', 'reason', 'unclearTerms'] as const).map((field) => ({ text, field }))))
    ('rejects indirect review attribution in every content field (%#)', ({ text, field }) => {
      const record = { ...makeRecord(product), [field]: field === 'unclearTerms' ? [text] : text };
      const before = structuredClone(record);
      expect(readerRecordIdentityProblems(record, product)).toContain('record names a tool, model or vendor');
      expect(record).toEqual(before);
    });

  it.each([
    'I checked the timings: Gemini Robotics supplies 13 actions to cover the wait.',
    'The figure checks whether Gemini Robotics supplies enough actions during the delay.',
    'Gemini Robotics was evaluated for its command rate.',
  ].flatMap((text) => (['sentence', 'reason', 'unclearTerms'] as const).map((field) => ({ text, field }))))
    ('preserves a reader checking genuine product behavior (%#)', ({ text, field }) => {
      const record = { ...makeRecord(product), [field]: field === 'unclearTerms' ? [text] : text };
      const before = structuredClone(record);
      expect(readerRecordIdentityProblems(record, product)).toEqual([]);
      expect(record).toEqual(before);
    });
});

function recorderTree() {
  const directory = mkdtempSync(join(tmpdir(), 'reader-identity-test-')); scratch.push(directory);
  const second = { ...neutral, id: 'fixture--two', mount: 'mount:/credits/:Fixture:2', figure: 'fixture-two' };
  put(directory, 'contract/reader-first-registry.json', JSON.stringify({ schemaVersion: 'reader-first-registry-v1', figures: [neutral, second] }));
  cpSync(join(root, RUBRIC_PATH), join(directory, RUBRIC_PATH));
  put(directory, neutral.sources[0], 'export const value = 1;\n');
  for (const entry of [neutral, second]) {
    put(directory, recordPath(entry.id), `previous observation for ${entry.id}\n`);
    for (const width of [1280, 375]) put(directory, screenshotPath(entry.id, width), `original screenshot ${entry.id}/${width}`);
  }
  const captured = [neutral, second].map((entry) => ({ id: entry.id, sourceDigest: sourceDigest(directory, entry.sources) }));
  put(directory, 'capture.json', JSON.stringify({ commit: 'abcdef1', captured }));
  const answers = [neutral, second].map((entry) => ({ id: entry.id, session: 'reader-session-automated-r4-a-20261103', sentence: 'A figure explains one point.', unclearTerms: [] as string[], samePoint: 'yes', reason: 'The points agree.' }));
  const run = () => {
    put(directory, 'answers.json', JSON.stringify(answers));
    return spawnSync(process.execPath, [join(root, 'scripts/record-reader-first.ts'), '--capture', 'capture.json', '--answers', 'answers.json', '--date', '2026-11-03'], { cwd: directory, encoding: 'utf8' });
  };
  return { directory, second, answers, run };
}

describe('reader recorder batch preflight', () => {
  it.each(['identity', 'named-tool'])('refuses a later bad answer before replacing any earlier record (%s)', (change) => {
    const { directory, second, answers, run } = recorderTree();
    if (change === 'identity') answers[1].session = 'unqualified-review';
    else answers[1].reason = `Read by ${toolName.toUpperCase()}.`;
    const previous = [neutral, second].map((entry) => readFileSync(join(directory, recordPath(entry.id))));
    const result = run();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(change === 'identity' ? 'neutral reviewer session' : 'names a tool');
    expect([neutral, second].map((entry) => readFileSync(join(directory, recordPath(entry.id))))).toEqual(previous);
  });

  it('records an honest failed answer and retains all acceptance failures', () => {
    const { directory, second, answers, run } = recorderTree();
    answers[1].samePoint = 'no'; answers[1].unclearTerms = ['unexplained mechanism']; answers[1].reason = 'I read a different point.';
    expect(run().status).toBe(0);
    expect(recordProblems(directory, neutral)).toEqual([]);
    const record = JSON.parse(readFileSync(join(directory, recordPath(second.id)), 'utf8')) as ReaderRecord;
    expect(record.verdict).toBe('fail');
    expect(record.samePoint).toBe('no');
    expect(record.unclearTerms).toEqual(answers[1].unclearTerms);
    expect(record.reason).toBe(answers[1].reason);
    const problems = recordProblems(directory, second);
    expect(problems).toContain('/credits/ [fixture-two]: reader-test verdict is fail');
    expect(problems).toContain('/credits/ [fixture-two]: reader-test record does not support a pass (missed point, 1 counted unclear term)');
    expect(problems.some((problem) => /neutral reviewer session|names a tool/.test(problem))).toBe(false);
    put(directory, second.sources[0], 'export const value = 2;\n');
    expect(recordProblems(directory, second).some((problem) => problem.includes('source files changed since'))).toBe(true);
    record.rubricDigest = 'b'.repeat(64); put(directory, recordPath(second.id), JSON.stringify(record));
    expect(recordProblems(directory, second).some((problem) => problem.includes('another reader-test rubric'))).toBe(true);
    rmSync(join(directory, screenshotPath(second.id, 375)));
    expect(recordProblems(directory, second)).toContain('/credits/ [fixture-two]: missing 375 px screenshot');
  });
});
