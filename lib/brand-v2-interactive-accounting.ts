import type { StateCase } from './brand-v2-census';

export type InteractiveStateCase = StateCase;

export type InteractiveCaseAccounting = {
  selectorReconciled: number;
  typedNotApplicable: number;
  unhandledKind: number;
  total: number;
};

export function accountInteractiveCases(
  cases: readonly InteractiveStateCase[],
  reconciledCaseIds: ReadonlySet<string>,
): InteractiveCaseAccounting {
  const accounting: InteractiveCaseAccounting = {
    selectorReconciled: 0,
    typedNotApplicable: 0,
    unhandledKind: 0,
    total: cases.length,
  };

  for (const stateCase of cases) {
    if (stateCase.kind === 'exception' && stateCase.notApplicableReason) {
      accounting.typedNotApplicable += 1;
    } else if (reconciledCaseIds.has(stateCase.id)) {
      accounting.selectorReconciled += 1;
    } else {
      accounting.unhandledKind += 1;
    }
  }

  return accounting;
}

export function validateInteractiveCaseAccounting(
  accounting: InteractiveCaseAccounting,
  expectedTotal: number,
  selectorFloor: number,
): string[] {
  const failures: string[] = [];
  const accounted =
    accounting.selectorReconciled +
    accounting.typedNotApplicable +
    accounting.unhandledKind;

  if (accounted !== expectedTotal) {
    failures.push(
      `case-accounting-mismatch: expected ${expectedTotal}, accounted ${accounted}`,
    );
  }
  if (accounting.total !== expectedTotal) {
    failures.push(
      `plan-case-count-mismatch: expected ${expectedTotal}, observed ${accounting.total}`,
    );
  }
  if (accounting.unhandledKind !== 0) {
    failures.push(
      `unhandled-interactive-kind: expected 0, observed ${accounting.unhandledKind}`,
    );
  }
  if (accounting.selectorReconciled < selectorFloor) {
    failures.push(
      `selector-reconciliation-floor: expected at least ${selectorFloor}, observed ${accounting.selectorReconciled}`,
    );
  }

  return failures;
}
