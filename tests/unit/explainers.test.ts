import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EXPLAINER_CURRICULUM, EXPLAINER_ORDER } from '../../components/explainers/catalog';
import { EXPLAINER_WORDS } from '../../components/explainers/words';
import { explainerDigest, explainerSources, teachBackProblems } from '../../lib/teach-back';

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
  it('digest the scene and the model files it imports', async () => {
    expect(explainerSources('.', 'arm')).toEqual(['components/explainers/models/so101.js', 'components/explainers/scenes/arm.js']);
    expect(await explainerDigest('.', 'arm')).toBe(await explainerDigest('.', 'arm'));
    expect(await explainerDigest('.', 'arm')).not.toBe(await explainerDigest('.', 'hand'));
  });

  it('name the explainer that has no record', async () => {
    const empty = mkdtempSync(join(tmpdir(), 'teach-back-'));
    try {
      expect(await teachBackProblems(empty, 'grip')).toEqual(['#grip: no teach-back record at evidence/teach-back/grip.json']);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
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
