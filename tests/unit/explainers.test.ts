import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { EXPLAINER_CURRICULUM, EXPLAINER_ORDER } from '../../components/explainers/catalog';
import { EXPLAINER_WORDS } from '../../components/explainers/words';
import {
  explainerDigest, explainerSources, measuredVerdict, ownerAcceptanceLine, teachBackProblems, uncountedReason, type TeachBackRecord,
} from '../../lib/teach-back';

const ORDER = ['arm', 'humanoid', 'hand', 'reaching', 'upright', 'flying', 'path', 'grip', 'mug', 'whereami', 'puppeteer', 'worlds'];
// The concept each explainer names, which only its last step may say.
const TERMS: Record<string, string[]> = {
  arm: ['kinematic chain'],
  humanoid: ['degree of freedom'],
  hand: ['dexterous manipulation'],
  reaching: ['inverse kinematics', 'forward kinematics'],
  upright: ['support polygon'],
  flying: ['attitude control'],
  path: ['rapidly-exploring random tree'],
  grip: ['friction cone'],
  mug: ['scene representation'],
  whereami: ['Kalman filter'],
  puppeteer: ['teleoperation', 'imitation learning'],
  worlds: ['massively parallel simulation', 'domain randomization'],
};
const words = (text: string) => text.trim().split(/\s+/).length;

describe('the explainer catalog', () => {
  it('holds the twelve explainers in curriculum order under the five groups', () => {
    expect(EXPLAINER_ORDER.map(({ id }) => id)).toEqual(ORDER);
    expect(EXPLAINER_CURRICULUM.map(({ group }) => group)).toEqual(['Body', 'Move', 'Touch', 'Sense', 'Learn']);
    expect(Object.keys(EXPLAINER_WORDS).sort()).toEqual([...ORDER].sort());
  });
});

describe.each(ORDER)('the words of #%s', (id) => {
  const w = EXPLAINER_WORDS[id as keyof typeof EXPLAINER_WORDS];

  it('ask a question under a small kicker and register one takeaway sentence', () => {
    expect(w.question).toMatch(/^[A-Z].*\?$/);
    expect(w.kicker.length).toBeLessThanOrEqual(48);
    expect(w.takeaway).toMatch(/^[A-Z][^.?!]*[.]$/);
  });

  it('take three to five steps of at most 25 words each', () => {
    expect(w.steps.length).toBeGreaterThanOrEqual(3);
    expect(w.steps.length).toBeLessThanOrEqual(5);
    for (const step of w.steps) expect(words(step), step).toBeLessThanOrEqual(25);
  });

  it('name the concept only in the last step', () => {
    for (const term of TERMS[id]) {
      const said = (text: string) => text.toLowerCase().includes(term.toLowerCase());
      expect(said(w.steps.at(-1)!), `last step names ${term}`).toBe(true);
      for (const step of [w.question, w.takeaway, ...w.steps.slice(0, -1)]) expect(said(step), step).toBe(false);
    }
  });

  it('close with the concept, its own name linked into the article, and a self-check', () => {
    expect(w.concept.href).toMatch(/^https:\/\/robot-wiki\.com\/[a-z0-9-]+\/[a-z0-9-]+\/(#[a-z0-9-]+)?$/);
    expect(w.concept.name).toContain(w.concept.term);
    expect(TERMS[id].some((t) => w.concept.term.toLowerCase().includes(t.toLowerCase())), w.concept.term).toBe(true);
    expect(w.selfCheck.q).toMatch(/\?$/);
    expect(w.selfCheck.a.length).toBeGreaterThan(0);
  });
});

describe('the teach-back records', () => {
  it('digest the scene and the model files it imports', () => {
    expect(explainerSources('.', 'arm')).toEqual(['components/explainers/models/so101.js', 'components/explainers/scenes/arm.js']);
    expect(explainerDigest('.', 'arm')).toBe(explainerDigest('.', 'arm'));
    expect(explainerDigest('.', 'arm')).not.toBe(explainerDigest('.', 'hand'));
  });

  it('are current for every explainer, each failing one citing the owner acceptance', async () => {
    for (const { id } of EXPLAINER_ORDER) {
      expect(await teachBackProblems('.', id), id).toEqual([]);
      const record = JSON.parse(readFileSync(`evidence/teach-back/${id}.json`, 'utf8')) as TeachBackRecord;
      expect(record.verdict, id).toBe(measuredVerdict(record));
      if (record.verdict === 'fail') expect(record.ownerAcceptance, id).toBe(ownerAcceptanceLine(record.unclearTerms));
    }
  });

  it('name the explainer that has no record', async () => {
    const empty = mkdtempSync(join(tmpdir(), 'teach-back-'));
    try {
      expect(await teachBackProblems(empty, 'grip')).toEqual(['#grip: no teach-back record at evidence/teach-back/grip.json']);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });

  it('let go only the concept the last step names and words that appear only in the kicker', () => {
    const arm = EXPLAINER_WORDS.arm;
    expect(uncountedReason(arm, 'kinematic chain')).toBe('the concept the last step introduces');
    expect(uncountedReason(arm, 'Kinematic')).toBe('the concept the last step introduces');
    expect(uncountedReason(arm, 'anatomy')).toBe('only in the kicker');
    expect(uncountedReason(arm, 'motor')).toBeNull();
    expect(uncountedReason(arm, 'newton-metres')).toBeNull();
    expect(uncountedReason(EXPLAINER_WORDS.humanoid, 'Degrees of freedom')).toBe('the concept the last step introduces');
    expect(uncountedReason(EXPLAINER_WORDS.path, 'millionths')).toBeNull();
  });

  it('run from npm, and the production build runs the check', () => {
    const scripts = (JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> }).scripts;
    expect(scripts['check:teach-back']).toBe('node scripts/check-teach-back.ts');
    expect(scripts['check:teach-back:plant']).toBe('node scripts/plant-teach-back.ts');
    expect(scripts['vercel-build']).toContain('&& npm run check:teach-back &&');
  });
});

describe('the teach-back check on a planted record', () => {
  const id = 'grip';
  let root = '';
  const unclear = ['"Fingertip cone" (what the cone stands for)', '"30°", "17°" (where the values come from)'];
  const failing = (): TeachBackRecord => ({
    schemaVersion: 'teach-back-record-v2',
    explainer: id,
    round: 2,
    screenshots: [`evidence/teach-back/${id}/1280-s1.jpg`, `evidence/teach-back/${id}/390-s1.jpg`],
    takeaway: EXPLAINER_WORDS.grip.takeaway,
    selfCheck: { question: EXPLAINER_WORDS.grip.selfCheck.q, answer: 'Rubber.', correct: true },
    sentence: 'A fingertip can push only within a cone.',
    unclearTerms: unclear,
    uncountedTerms: [{ term: 'friction cone', why: 'the concept the last step introduces' }],
    samePoint: 'yes',
    reason: 'Same rule.',
    noiseAudit: [{ width: 1280, step: '1', words: 20, labels: 1, controls: 0, colours: ['focus'] }],
    noiseClean: true,
    verdict: 'fail',
    ownerAcceptance: ownerAcceptanceLine(unclear),
    screenshotCommit: 'dd79fd5c',
    date: '2026-10-06',
    reviewerSession: 'reader-session-0f1e2d3c',
    sourceDigest: explainerDigest('.', id),
  });
  // The check runs as the build runs it, on a copy whose only record is the planted one.
  const problems = (record: Partial<TeachBackRecord>) => {
    writeFileSync(join(root, 'evidence/teach-back', `${id}.json`), JSON.stringify(record));
    const run = spawnSync(process.execPath, ['scripts/check-teach-back.ts', '--root', root], { encoding: 'utf8' });
    return run.stderr.split('\n').filter((line) => line.startsWith(`teach-back: #${id}:`)).map((line) => line.slice('teach-back: '.length));
  };

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'teach-back-'));
    cpSync('components/explainers', join(root, 'components/explainers'), { recursive: true });
    mkdirSync(join(root, 'evidence/teach-back', id), { recursive: true });
    for (const width of [1280, 390]) writeFileSync(join(root, `evidence/teach-back/${id}/${width}-s1.jpg`), '');
  });
  afterAll(() => rmSync(root, { recursive: true, force: true }));

  it('accepts a failing round-2 record that carries the owner-acceptance line', () => {
    expect(problems(failing())).toEqual([]);
  });

  it('rejects a failing record without the owner-acceptance line, or one that leaves out a residual word', () => {
    const bare: Partial<TeachBackRecord> = failing();
    delete bare.ownerAcceptance;
    expect(problems(bare)).toEqual(['#grip: failing teach-back record lacks the line citing the owner acceptance of 12 Oct 2026']);
    expect(problems({ ...failing(), ownerAcceptance: ownerAcceptanceLine(unclear.slice(1)) })).toEqual([
      '#grip: the owner-acceptance line does not list the residual unclear word "Fingertip cone"',
    ]);
  });

  it('rejects a verdict the measured answers do not give, and a failing round after the owner acceptance', () => {
    expect(problems({ ...failing(), verdict: 'pass' })).toEqual(['#grip: record says pass, but its measured answers give fail']);
    expect(problems({ ...failing(), date: '2026-10-19' })).toEqual([
      '#grip: a teach-back that fails after the owner acceptance of 12 Oct 2026 needs a fresh round that passes',
    ]);
  });

  it('rejects a record that names a tool or keeps a full session id, and one whose scene has changed since', () => {
    expect(problems({ ...failing(), reason: 'Read by Claude.' })).toEqual(['#grip: record names a tool, model or vendor']);
    const fullId = ['0f1e2d3c', '4b5a', '4968', '8776', '655443322110'].join('-');
    expect(problems({ ...failing(), reviewerSession: `reader-session-${fullId}` })).toEqual([
      '#grip: record lacks its commit, date or neutral reviewer session',
    ]);
    expect(problems({ ...failing(), sourceDigest: '0'.repeat(64) })).toEqual([
      expect.stringMatching(/^#grip: scene or model files changed since the teach-back/),
    ]);
  });
});

describe('the explainer stylesheet', () => {
  const css = readFileSync('components/explainers/explainers.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({ selector: selector.trim(), body }));

  it('declares its custom properties on the explainers root only, never on :root', () => {
    expect(css).not.toMatch(/:root/);
    const declaring = rules.filter((r) => /(^|;)\s*--[\w-]+\s*:/.test(r.body)).map((r) => r.selector);
    expect(declaring).toEqual(['.explainers']);
  });

  it('maps every custom property to a site token or font, and has no raw colour literal', () => {
    const root = rules.find((r) => r.selector === '.explainers')!.body;
    for (const [, name, value] of root.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      const tokens = [...value.matchAll(/var\((--[\w-]+)\)/g)].map((m) => m[1]);
      if (!tokens.length) expect(value.trim(), `${name} is a number`).toMatch(/^\d*\.?\d+$/);
      for (const token of tokens) expect(token, name).toMatch(/^--(color|role|font)-/);
    }
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(|(?<![\w-])(white|black|gr[ae]y)(?![\w-])/i);
  });
});
