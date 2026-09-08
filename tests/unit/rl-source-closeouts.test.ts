import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getCitation } from '../../data/citations';
import { ANCHORS, DEFAULT_PARAMS, computeLedger } from '../../lib/sample-efficiency';

// Match reader text across source wrapping and Markdown emphasis, without
// removing words, punctuation, qualifiers, or citation identifiers.
const readerText = (source: string) => source.replaceAll('**', '').replace(/\s+/g, ' ');
const read = (path: string) => readerText(readFileSync(resolve(process.cwd(), path), 'utf8'));
const article = read('content/rl-sim2real/rl-for-robotics.mdx');
const widget = read('components/interactive/sample-efficiency-ledger.tsx');
const glossary = read('data/glossary.ts');

describe('sixteen RL source closeouts: identity, scope and toy units', () => {
  it('normalizes presentation only and cannot manufacture a missing qualifier', () => {
    expect(readerText('**editorial** recommendation')).toBe('editorial recommendation');
    expect(readerText('not a\n measured mean')).toBe('not a measured mean');
    expect(readerText('a measured mean')).not.toContain('not a measured mean');
    expect(readerText('empirical recommendation')).not.toContain('editorial recommendation');
  });
  it('binds the four-author preprint separately from the unchanged journal identity', () => {
    expect(getCitation('levine-hand-eye-2016')?.authors).toEqual([
      'Sergey Levine', 'Peter Pastor', 'Alex Krizhevsky', 'Deirdre Quillen',
    ]);
    expect(getCitation('levine-hand-eye-2018')?.authors).toEqual([
      'Sergey Levine', 'Peter Pastor', 'Alex Krizhevsky', 'Julian Ibarz',
      'Deirdre Quillen',
    ]);
    expect(getCitation('levine-hand-eye-2018')?.url).toBe(
      'https://doi.org/10.1177/0278364917710318',
    );
    expect(ANCHORS.find((anchor) => anchor.id === 'hand-eye')?.citation).toBe(
      'levine-hand-eye-2016',
    );
    for (const phrase of ['about 800,000', 'over 800,000', 'several months']) {
      expect(article).toContain(phrase);
    }
  });

  it('keeps the complete HER and literal Q-Transformer printed bylines', () => {
    expect(getCitation('her-2017')?.authors).toEqual([
      'Marcin Andrychowicz', 'Filip Wolski', 'Alex Ray', 'Jonas Schneider',
      'Rachel Fong', 'Peter Welinder', 'Bob McGrew', 'Josh Tobin',
      'Pieter Abbeel', 'Wojciech Zaremba',
    ]);
    expect(getCitation('q-transformer-2023')?.authors).toEqual([
      'Yevgen Chebotar', 'Quan Vuong', 'Alex Irpan', 'Karol Hausman',
      'Fei Xia', 'Yao Lu', 'Aviral Kumar', 'Tianhe Yu', 'Alexander Herzog',
      'Karl Pertsch', 'Keerthana Gopalakrishnan', 'Julian Ibarz', 'Ofir Nachum',
      'Sumedh Sontakke', 'Grecia Salazar', 'Huong T Tran', 'Jodilyn Peralta',
      'Clayton Tan', 'Deeksha Manjunath', 'Jaspiar Singht', 'Brianna Zitkovich',
      'Tomas Jackson', 'Kanishka Rao', 'Chelsea Finn', 'Sergey Levine',
    ]);
  });

  it('qualifies intervention, HER protocol, and conditional offline comparisons', () => {
    for (const phrase of [
      'one Unitree A1 training run', 'ten minutes of additional online learning',
      'manually intervened', 'squared-contact-penetration reward penalty',
      'half of its training episodes', 'achieved-goal mapping',
      'recomputing the reward', 'not restricted to failed episodes',
      'worst-case result', 'equal amount of expert data',
      'simulated drawer-manipulation', 'Editorial recommendation',
    ]) expect(article, phrase).toContain(phrase);
    expect(glossary).toContain('contact-penetration reward penalty');
  });

  it('distinguishes training from deployment and scale from regularization', () => {
    expect(article).toContain('without additional environment interaction during training');
    expect(article).toContain('counterfactual');
    expect(article).toContain('Bellman');
    expect(article).toContain('Q-Transformer combines scale with regularization');
    expect(article).toContain('conservative');
    expect(article).toContain('failed autonomous trials');
    expect(glossary).toContain('The trained policy can then be deployed');
    expect(article).not.toContain('The obstacle is not optimization');
  });

  it('removes the invalid empirical QT-Opt rate without changing the toy arithmetic', () => {
    expect(widget).not.toContain('QT_OPT_STEPS_PER_ROBOT_SECOND');
    expect(widget).not.toContain('which admits');
    expect(widget).toContain('not a measured mean');
    expect(widget).toContain('Robot-hours are not parallel wall time');
    expect(widget).toContain('bands do not rule algorithms in or out');
    const ledger = computeLedger(DEFAULT_PARAMS);
    expect(ledger.budgetSteps).toBeCloseTo(10 ** 8.2, 5);
    expect(ledger.rows.map((row) => row.stepsPerSecond)).toEqual([
      122_880, 160_000 / 7200, (160_000 / 7200) * 7,
    ]);
    expect(ANCHORS.map((anchor) => anchor.seconds)).toEqual([
      240, 1200, 3600, 7200, 2_880_000, 5_184_000,
    ]);
    for (const id of [
      'rudin-2021', 'daydreamer-2022', 'haarnoja-walk-2019',
      'qt-opt-2018', 'levine-hand-eye-2016',
    ]) expect(widget).toContain(`<CiteRef id="${id}"`);
  });
});
