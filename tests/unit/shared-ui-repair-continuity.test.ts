import { historicalGit } from '../helpers/historical-git';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { UI_REPAIR_REVIEW_FILE, uiRepairPredecessor, verifyUiRepairSource, type UiRepairReview } from '../../lib/audit-ui-repair-continuity';

describe('reviewed shared UI successor inputs', () => {
  const review = JSON.parse(readFileSync(UI_REPAIR_REVIEW_FILE, 'utf8')) as UiRepairReview;
  it('reconstructs the four named predecessors and preserves exact current references', () => {
    expect(review.sources.map((source) => source.after.path).sort()).toEqual([
      'components/article/references.tsx', 'components/interactive/eureka-loop.tsx',
      'components/interactive/reward-shaping.tsx', 'components/ui/cite.tsx',
    ]);
    for (const source of review.sources) {
      const live = readFileSync(source.after.path);
      const prior = verifyUiRepairSource(source, live);
      expect(prior).toEqual(historicalGit(['show', `${source.archivedFrom}:${source.before.path}`]));
      expect(uiRepairPredecessor(process.cwd(), source.after, live)).toBe(live);
      expect(uiRepairPredecessor(process.cwd(), source.before, live)).toEqual(prior);
    }
  });
  it('does not accept drift, missing preserved behavior, or a fabricated predecessor', () => {
    for (const source of review.sources) {
      const live = readFileSync(source.after.path);
      const changed = Buffer.concat([live, Buffer.from('\n')]);
      expect(uiRepairPredecessor(process.cwd(), source.before, changed)).toBe(changed);
      expect(() => verifyUiRepairSource(source, changed)).toThrow();
      expect(() => verifyUiRepairSource({ ...source, preserved: ['unreviewed replacement'] }, live)).toThrow();
      expect(() => verifyUiRepairSource({ ...source, before: { ...source.before, sha256: '0'.repeat(64) } }, live)).toThrow();
      expect(() => verifyUiRepairSource({ ...source, checks: [] }, live)).toThrow();
    }
  });
});
