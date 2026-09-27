import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  MOTION_CLIP_BUDGET_BYTES,
  clipBudgetViolations,
  loadManifest,
} from '../../scripts/generate-motion-clips';

const ROOT = join(__dirname, '../..');

describe('clip size budget', () => {
  it('is exactly three mebibytes', () => {
    expect(MOTION_CLIP_BUDGET_BYTES).toBe(3 * 1024 * 1024);
  });

  it('accepts a file at the budget and rejects one byte over', () => {
    expect(
      clipBudgetViolations([
        { path: 'public/clips/at-budget.webm', bytes: MOTION_CLIP_BUDGET_BYTES },
      ]),
    ).toEqual([]);
    expect(
      clipBudgetViolations([
        {
          path: 'public/clips/over-budget.webm',
          bytes: MOTION_CLIP_BUDGET_BYTES + 1,
        },
      ]),
    ).toEqual([
      expect.objectContaining({
        path: 'public/clips/over-budget.webm',
        bytes: MOTION_CLIP_BUDGET_BYTES + 1,
        budgetBytes: MOTION_CLIP_BUDGET_BYTES,
      }),
    ]);
  });

  it('names every offending file when several exceed the budget', () => {
    const violations = clipBudgetViolations([
      { path: 'public/clips/a.webm', bytes: 1 },
      { path: 'public/clips/b.mp4', bytes: MOTION_CLIP_BUDGET_BYTES * 2 },
      { path: 'public/clips/c.mp4', bytes: MOTION_CLIP_BUDGET_BYTES * 3 },
    ]);
    expect(violations.map((violation) => violation.path)).toEqual([
      'public/clips/b.mp4',
      'public/clips/c.mp4',
    ]);
  });

  it('rejects every shipped video artifact over the budget', () => {
    const dir = join(ROOT, 'public', 'clips');
    const files = exists(dir)
      ? readdirSync(dir)
          .filter((name) => name.endsWith('.webm') || name.endsWith('.mp4'))
          .map((name) => ({
            path: `public/clips/${name}`,
            bytes: statSync(join(dir, name)).size,
          }))
      : [];
    expect(files.length).toBeGreaterThanOrEqual(
      loadManifest().clips.length * 2,
    );
    expect(clipBudgetViolations(files)).toEqual([]);
  });
});

function exists(path: string): boolean {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}
