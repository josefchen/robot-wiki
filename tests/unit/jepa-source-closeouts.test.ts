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
    expect(jepa).toContain('not a demonstrated calibration');
    expect(jepa).toContain('interpretability decoder');
    expect(jepa).toContain('Fast-WAM separates video co-training');
  });

  it('keeps score protocols, units and non-robot anticipation separate', () => {
    for (const phrase of [
      '22M', '300M', '77.3%', '76.5', 'best of 20 classifier heads',
      'two temporal crops', 'three spatial crops', '39.7%',
      '32 frames at 8 fps', 'one second', 'not robot control',
    ]) expect(jepa, phrase).toContain(phrase);
    expect(jepa).toContain('value=">1M"');
    expect(taxonomy).toContain('value=">1M"');
  });

  it('bounds training labels, embodiment, camera setup and planning', () => {
    for (const phrase of [
      'state changes', 'filtered left-camera', 'over a million hours',
    ]) expect(taxonomy, phrase).toContain(phrase);
    for (const phrase of [
      'not robot state information', 'manually selected camera',
      '800 candidate samples', 'ten refinement iterations', 'planning horizon one',
      'supplied subgoals', 'not evidence of arbitrary new-embodiment transfer',
    ]) expect(jepa, phrase).toContain(phrase);
  });

  it('identifies the toy geometry instead of claiming measured latent control', () => {
    expect(jepa).toContain('not a projection of learned V-JEPA 2 features');
    expect(jepa).toContain('guaranteed by construction');
    expect(jepa).toContain('Euclidean distance');
    expect(jepa).toContain('not a measured robot result');
  });

  it('does not erase duplicate mounted citation obligations or permit a wrong source', () => {
    expect(missingOccurrences(['vjepa2-2025', 'vjepa2-2025'], ['vjepa2-2025']))
      .toEqual(['vjepa2-2025']);
    expect(missingOccurrences(['vjepa-2024'], ['vjepa2-2025']))
      .toEqual(['vjepa-2024']);
    expect(missingOccurrences(['vjepa-2024'], [])).toEqual(['vjepa-2024']);
  });
});
