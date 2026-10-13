import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getCitation } from '../../data/citations';
import { missingOccurrences } from '../e2e/source-reader-requirements';

const read = (path: string) => readFileSync(path, 'utf8');
const jepa = read('content/world-models/jepa.mdx');
const taxonomy = read('content/world-models/taxonomy.mdx');

describe('JEPA retained-primary closeouts', () => {
  it('preserves the complete ordered v1 body byline, not the split abs metadata', () => {
    expect(getCitation('vjepa2-2025')?.authors).toEqual([
      'Mahmoud Assran', 'Adrien Bardes', 'David Fan', 'Quentin Garrido',
      'Russell Howes', 'Mojtaba Komeili', 'Matthew Muckley', 'Ammar Rizvi',
      'Claire Roberts', 'Koustuv Sinha', 'Artem Zholus', 'Sergio Arnaud',
      'Abha Gejji', 'Ada Martin', 'Francois Robert Hogan', 'Daniel Dugas',
      'Piotr Bojanowski', 'Vasil Khalidov', 'Patrick Labatut', 'Francisco Massa',
      'Marc Szafraniec', 'Kapil Krishnakumar', 'Yong Li', 'Xiaodong Ma',
      'Sarath Chandar', 'Franziska Meier', 'Yann LeCun', 'Michael Rabbat',
      'Nicolas Ballas',
    ]);
    expect(getCitation('vjepa2-2025')?.url).toBe('https://arxiv.org/abs/2506.09985');
  });

  it('cuts the unsupported value follow-up without deleting its historical registry identity', () => {
    expect(jepa).not.toContain('jepa-value-planning-2026');
    expect(getCitation('jepa-value-planning-2026')).toBeDefined();
    expect(jepa).toContain('This goal distance has no demonstrated calibration to a value function');
    expect(jepa).toContain('the pixel decoder trained for visualization plays no part in control');
    expect(jepa).toContain('Fast-WAM separates video co-training');
  });

  it('keeps score protocols and units with their scores', () => {
    // The appendix ablation and the Epic-Kitchens anticipation probe left with the
    // world-models length cut of 2026-10-12, which records their pins as retired.
    for (const phrase of [
      '22M', '300M', '77.3%', 'best of 20 heads',
      'two temporal and three spatial crops',
    ]) expect(jepa, phrase).toContain(phrase);
    expect(jepa).toContain('value=">1M"');
    expect(taxonomy).toContain('value=">1M"');
  });

  it('bounds training labels, embodiment, camera setup and planning', () => {
    for (const phrase of [
      'filtered left-camera', 'over a million hours',
    ]) expect(taxonomy, phrase).toContain(phrase);
    for (const phrase of [
      'end-effector position, orientation and gripper state', 'the authors hand-picked camera positions',
      '800 candidates', 'ten iterations', 'horizon one',
      'supplied goals and subgoals', 'though Droid itself is Franka teleoperation',
    ]) expect(jepa, phrase).toContain(phrase);
  });

  it('identifies the toy geometry instead of claiming measured latent control', () => {
    const figure = read('components/interactive/jepa-planning.tsx');
    expect(figure).toContain('this toy plans over synthetic');
    expect(figure).toContain('two-dimensional points and loads no trained encoder or predictor');
    expect(figure).toContain('The toy prescribes this by construction, so it measures');
    expect(figure).toContain('nothing about a real robot');
  });

  it('does not erase duplicate mounted citation obligations or permit a wrong source', () => {
    expect(missingOccurrences(['vjepa2-2025', 'vjepa2-2025'], ['vjepa2-2025']))
      .toEqual(['vjepa2-2025']);
    expect(missingOccurrences(['vjepa-2024'], ['vjepa2-2025']))
      .toEqual(['vjepa-2024']);
    expect(missingOccurrences(['vjepa-2024'], [])).toEqual(['vjepa-2024']);
  });
});
