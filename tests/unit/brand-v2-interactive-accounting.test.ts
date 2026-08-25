import { describe, expect, it } from 'vitest';
import {
  accountInteractiveCases,
  validateInteractiveCaseAccounting,
  type InteractiveStateCase,
} from '../../lib/brand-v2-interactive-accounting';

const cases: InteractiveStateCase[] = [
  { id: 'focus', kind: 'focus', selector: 'button' },
  { id: 'default', kind: 'default' },
  {
    id: 'loading-not-applicable',
    kind: 'exception',
    notApplicableReason: 'No loading state is implemented.',
  },
];

describe('brand-v2 interactive case accounting', () => {
  it('reconciles selector, concrete per-kind, and typed exception cases', () => {
    const accounting = accountInteractiveCases(
      cases,
      new Set(['focus', 'default']),
    );

    expect(accounting).toEqual({
      selectorReconciled: 2,
      typedNotApplicable: 1,
      unhandledKind: 0,
      total: 3,
    });
    expect(validateInteractiveCaseAccounting(accounting, 3, 1)).toEqual([]);
  });

  it('fails when an in-memory execution plan drops a case', () => {
    const accounting = accountInteractiveCases(
      cases.slice(0, -1),
      new Set(['focus', 'default']),
    );

    expect(validateInteractiveCaseAccounting(accounting, cases.length, 1)).toContain(
      'plan-case-count-mismatch: expected 3, observed 2',
    );
  });

  it('fails when a typed exception loses its notApplicableReason', () => {
    const stripped = cases.map((stateCase) =>
      stateCase.id === 'loading-not-applicable'
        ? { id: stateCase.id, kind: stateCase.kind }
        : stateCase,
    );
    const accounting = accountInteractiveCases(
      stripped,
      new Set(['focus', 'default']),
    );

    expect(accounting.unhandledKind).toBe(1);
    expect(validateInteractiveCaseAccounting(accounting, 3, 1)).toContain(
      'unhandled-interactive-kind: expected 0, observed 1',
    );
  });
});
