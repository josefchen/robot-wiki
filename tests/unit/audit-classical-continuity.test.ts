import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { currentClassicalCorrectionArticle, parseClassicalCorrectionContinuity } from '@/lib/audit-classical-continuity';

const root = process.cwd();
const records = JSON.parse(readFileSync('audit/evidence/motion-classical-20260927/continuity.json', 'utf8'));

describe('classical correction continuity', () => {
  it('binds both historical correction articles to the active, reviewed prose', () => {
    const entries = parseClassicalCorrectionContinuity(records);
    expect(entries.map((entry) => entry.article)).toEqual([
      'content/classical/control.mdx',
      'content/classical/kinematics.mdx',
    ]);
    for (const entry of entries) {
      const article = currentClassicalCorrectionArticle(root, entry.historical, entries);
      for (const phrase of entry.requiredPresent) expect(article).toContain(phrase);
      for (const phrase of entry.requiredAbsent) expect(article).not.toContain(phrase);
    }
  });

  it('fails closed on a missing, drifted or unreviewed continuation', () => {
    const entries = parseClassicalCorrectionContinuity(records);
    const original = entries[0];
    for (const variant of [
      entries.filter((entry) => entry.article !== original.article),
      entries.map((entry) => entry.article === original.article
        ? { ...entry, current: { ...entry.current, sha256: '0'.repeat(64) } } : entry),
      entries.map((entry) => entry.article === original.article
        ? { ...entry, review: { ...entry.review, inputDigest: '0'.repeat(64) } } : entry),
      entries.map((entry) => entry.article === original.article
        ? { ...entry, snapshot: { ...entry.snapshot, sha256: '0'.repeat(64) } } : entry),
    ]) {
      expect(() => currentClassicalCorrectionArticle(root, original.historical, variant)).toThrow();
    }
  });
});
