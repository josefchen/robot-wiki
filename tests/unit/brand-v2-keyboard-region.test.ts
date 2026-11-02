import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validatePrimitiveRegistries } from '../../lib/brand-v2-census';

const registry = JSON.parse(readFileSync('contract/brand-v2-registries.json', 'utf8'));
const region = {
  ...registry.controls.find((entry: { id: string }) => entry.id === 'control:input'),
  id: 'control:keyboard-region', statePurpose: 'keyboard-region',
  persistentAria: [], supportedStates: ['default', 'focus-visible'],
  disabledException: 'A reading region remains available and has no disabled action state.',
  pointerAlternative: 'Scrollbar, wheel and touch scrolling; canvas pointer drag.',
};
const problems = (changes: Record<string, unknown>) => validatePrimitiveRegistries({ ...registry, controls: [{ ...region, ...changes }] }).filter(({ memberId }) => memberId === 'control:keyboard-region').map(({ reason }) => reason);

describe('keyboard-region control registration', () => {
  it('supports only default and focus while preserving a concrete source owner', () => {
    expect(problems({})).toEqual([]);
    expect(region.definedIn.length).toBeGreaterThan(0);
    expect(problems({ ownerRouteOrMount: ['components/invented-owner.tsx'] })).toContain('owner-outside-definition-set');
  });
  it('rejects action/link/selection semantics and invented disabled or pointer behavior', () => {
    for (const state of ['hover', 'active', 'visited', 'selected', 'disabled']) {
      expect(problems({ supportedStates: ['default', 'focus-visible', state] })).toContain('keyboard-region-has-action-or-selection-semantics');
    }
    expect(problems({ persistentAria: ['aria-pressed'] })).toContain('keyboard-region-has-action-or-selection-semantics');
    expect(problems({ statePurpose: 'information-path' })).toContain('keyboard-region-has-action-or-selection-semantics');
    expect(problems({ disabledException: null })).toContain('keyboard-region-missing-disabled-applicability');
    expect(problems({ pointerAlternative: 'Click to activate a link' })).toContain('keyboard-region-false-pointer-action');
  });
});
