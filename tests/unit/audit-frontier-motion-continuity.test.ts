import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { currentFrontierSafetyArticle, reviewedFrontierChecker } from '@/lib/audit-frontier-motion-continuity';

const root = process.cwd();
const current = readFileSync(`${root}/content/frontier/safety-and-assurance.mdx`);
const old = readFileSync(`${root}/audit/evidence/motion-frontier-adjacent-home-20260927/safety-article-before.mdx`);

describe('frontier safety prose continuation', () => {
  it('binds the changed article to the exact archived safety proof dependency', () => {
    expect(currentFrontierSafetyArticle(root, current)).toEqual(old);
  });

  it('rejects a changed live qualification without relabelling historical evidence', () => {
    expect(() => currentFrontierSafetyArticle(
      root, Buffer.from(current.toString().replace('at least 850 mm', '850 mm')),
    )).toThrow();
  });

  it('retains the two safety disclosures and their paper-specific limitations', () => {
    const text = current.toString();
    for (const phrase of [
      'an intrusion margin of at least 850 mm',
      '1200 mm for a single-height beam',
      'may reduce the margin to 250 mm',
      'exclude typical two-handed teach pendants',
      '1600 mm/s a worst-case assumption',
      '1600 mm/s option only when separation is greater than 500 mm',
      '2000 mm/s may be more prudent',
      '1.6 m/s here does not resolve those qualifications',
      'The instrument is an authored teaching model',
      'these controls are not certified operating limits',
      'requires traceable stopping-time and braking-distance measurements',
    ]) expect(text).toContain(phrase);
  });

  it('chains the historical checker revision without rewriting its review', () => {
    const checker = readFileSync(`${root}/lib/audit-local-basis.ts`);
    expect(reviewedFrontierChecker(root, checker)).toBe(true);
    expect(() => reviewedFrontierChecker(root, Buffer.from(`${checker.toString()}\n`)))
      .toThrow(/figure migration checker continuity drift/);
  });
});
