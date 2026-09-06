import { describe, expect, it } from 'vitest';
import {
  NAVIGATION_BUDGET,
  auditNavigationBudget,
  describeRow,
  readDebt,
} from '../../scripts/check-e2e-navigation-budget';

/**
 * The per-page navigation budget, run as a unit test so the corpus tells the
 * author who wrote the sweep, in seconds, instead of exhausting the renderer
 * and killing an unrelated spec half an hour into a browser run.
 */
describe('e2e per-page navigation budget', () => {
  it('bounds how many navigations one page performs inside one test', async () => {
    const { unlisted } = await auditNavigationBudget();
    expect(
      unlisted.map(describeRow),
      'A Chromium renderer retains every document it navigates away from ' +
        '(~26MB per route on this corpus), so a sweep that walks the corpus on ' +
        'one shared page spends hundreds of megabytes and kills a later, ' +
        "innocent test. Do not shrink the sweep's route coverage: give each " +
        'route its own context with `forEachInOwnContext` from ' +
        'tests/e2e/helpers/per-route-context.ts.',
    ).toEqual([]);
  });

  it('keeps the recorded debt list free of entries that no longer exceed the budget', async () => {
    const { stale } = await auditNavigationBudget();
    expect(
      stale.map((entry) => `${entry.file} :: ${entry.title} [${entry.receiver}]`),
      'these pages are within budget now; delete their entries from contract/e2e-navigation-budget-debt.json',
    ).toEqual([]);
  });

  it('records a reason for every page it could not certify', () => {
    const missing = readDebt().filter((entry) => !entry.reason.trim());
    expect(missing.map((entry) => `${entry.file} :: ${entry.title}`)).toEqual([]);
  });

  it('measures the budget the sweeps were converted against', () => {
    expect(NAVIGATION_BUDGET).toBe(16);
  });
});
