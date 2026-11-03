import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { selectionTransitionSatisfied } from '../../lib/brand-v2-selection-state';
import { interactiveLedgerPlan, interactiveLedgerVerdicts, type InteractiveLedgerEvidence } from '../../lib/brand-v2-interactive-ledger';
import type { BrandV2Registry } from '../../lib/brand-v2-runners';
import { emptyFocusPaint, type FocusPaint } from '../../lib/brand-v2-focus-paint';

const pressed = (value: string, rest = 'label=Option') => `aria-pressed=${value} aria-selected=null aria-checked=null aria-expanded=null disabled=null ${rest}`;

describe('native selection transition evidence', () => {
  it.each([
    ['toggle', pressed('false'), pressed('true')],
    ['toggle', pressed('true'), pressed('true')],
    ['toggle', pressed('true'), pressed('false')],
    ['toggle', 'aria-selected=false', 'aria-selected=true'],
    ['toggle', 'aria-pressed=mixed', 'aria-pressed=false'],
    ['checkbox', 'checked=false', 'checked=true'],
    ['checkbox', 'checked=true', 'checked=false'],
    ['checkbox', 'aria-checked=mixed', 'aria-checked=true'],
    ['radio', 'checked=false', 'checked=true'],
    ['radio', 'checked=true', 'checked=true'],
    ['radio', 'aria-checked=false', 'aria-checked=true'],
    ['toggle', 'aria-pressed=false aria-selected=false', 'aria-pressed=true aria-selected=true'],
    ['toggle', 'aria-pressed=true aria-selected=true', 'aria-pressed=false aria-selected=false'],
    ['checkbox', 'checked=false aria-checked=false', 'checked=true aria-checked=true'],
  ])('accepts the native %s transition from %s to %s', (kind, before, after) => {
    expect(selectionTransitionSatisfied(kind, before, after)).toBe(true);
  });

  it.each([
    ['toggle', pressed('false'), pressed('false', 'label=Changed label')],
    ['toggle', pressed('false'), pressed('false').replace('disabled=null', 'disabled=')],
    ['toggle', pressed('false'), pressed('false').replace('aria-expanded=null', 'aria-expanded=true')],
    ['toggle', pressed('false'), pressed('false')],
    ['toggle', pressed('false'), 'label=Option'],
    ['toggle', 'label=Option', pressed('true')],
    ['toggle', 'aria-pressed=null label=Option', 'aria-pressed=null label=Changed'],
    ['toggle', 'label=quoted aria-pressed=false', 'label=quoted aria-pressed=true'],
    ['toggle', pressed('false'), pressed('false', 'label=quotes aria-pressed=true')],
    ['toggle', pressed('false'), 'aria-pressed=false aria-pressed=true'],
    ['toggle', 'aria-selected=false', 'aria-pressed=true'],
    ['toggle', 'aria-selected=false', 'aria-selected=mixed'],
    ['toggle', 'aria-pressed=false', 'aria-pressed=unknown'],
    ['toggle', 'aria-pressed=false', 'aria-pressed'],
    ['checkbox', 'checked=true', 'checked=true label=Changed'],
    ['checkbox', 'checked=false', 'checked=false'],
    ['radio', 'checked=true', 'checked=false'],
    ['radio', 'checked=false', 'checked=false label=Selected'],
    ['radio', 'aria-pressed=false', 'aria-pressed=true'],
    ['action', 'aria-pressed=false label=Start', 'aria-pressed=false label=Stop'],
    ['toggle', 'aria-pressed=false aria-selected=true', 'aria-pressed=true aria-selected=false'],
    ['toggle', 'aria-pressed=false aria-selected=false', 'aria-pressed=true aria-selected=false'],
    ['checkbox', 'checked=false aria-checked=true', 'checked=true aria-checked=false'],
    ['checkbox', 'checked=false aria-checked=false', 'checked=true aria-checked=false'],
    ['radio', 'aria-checked=mixed', 'aria-checked=true'],
    ['radio', 'aria-checked=false', 'aria-checked=mixed'],
  ])('rejects contradictory or absent %s selection from %s to %s', (kind, before, after) => {
    expect(selectionTransitionSatisfied(kind, before, after)).toBe(false);
  });

  it.each([
    ['action', 'aria-pressed=null aria-selected=null aria-checked=null label=Run', 'aria-pressed=null aria-selected=null aria-checked=null label=Stop'],
    ['action', 'aria-sort=ascending label=Price', 'aria-sort=descending label=Price'],
    ['disclosure', 'open=false', 'open=true'],
    ['slider', 'value=1 valuetext=quoted aria-pressed=false', 'value=2 valuetext=quoted aria-pressed=true'],
  ])('leaves the ordinary %s state rule unchanged', (kind, before, after) => {
    expect(selectionTransitionSatisfied(kind, before, after)).toBeNull();
  });
});

const recorded = JSON.parse(readFileSync('evidence/brand-v2/interactive-ledger.json', 'utf8')) as InteractiveLedgerEvidence;
const registry = JSON.parse(readFileSync('contract/brand-v2-registries.json', 'utf8')) as BrandV2Registry;
const plan = interactiveLedgerPlan(registry);

describe('ledger selection consumer', () => {
  it('retains the actual committed selection, toggle-off and radio transitions', () => {
    const kinds = new Set<string>(); let toggleOff = 0;
    for (const observation of recorded.observations) for (const transition of observation.transitions) {
      const kind = observation.controls.find(control => control.index === transition.control)!.kind;
      if (!['toggle', 'checkbox', 'radio'].includes(kind)) continue;
      kinds.add(kind);
      if (kind === 'toggle' && transition.before.control.startsWith('aria-pressed=true') && transition.after.control.startsWith('aria-pressed=false')) toggleOff++;
      expect(selectionTransitionSatisfied(kind, transition.before.control, transition.after.control), `${observation.mountId}: ${transition.control}`).toBe(true);
    }
    expect(kinds.has('toggle') && kinds.has('radio')).toBe(true);
    expect(toggleOff).toBeGreaterThan(0);
  });

  it.each(['label', 'disabled', 'expanded', 'no-op', 'missing-selection', 'contradictory-toggle', 'contradictory-checkbox', 'mixed-radio'])('rejects %s even when the producer reports stateExposed=true', mutation => {
    const evidence = structuredClone(recorded);
    const observation = evidence.observations.find(row => row.transitions.some(transition => row.controls.find(control => control.index === transition.control)?.kind === 'toggle' && transition.before.control.startsWith('aria-pressed=false')))!;
    // An isolated consumer-clause fixture: the archived control layout supplies
    // real state strings, while current focus slots are independently authored.
    // This does not validate or rewrite the historical artifact's schema.
    const route = plan.mounts.find(mount => mount.mountId === observation.mountId)!.route;
    const keyboard: FocusPaint = { ...emptyFocusPaint(route), target: '<button>', matched: true, kind: 'outline', style: 'solid', widthPx: 1, color: 'rgb(28, 28, 26)', offsetPx: 2, visible: true };
    for (const control of observation.controls) control.ring = { ...keyboard };
    for (const row of observation.transitions) {
      row.focus.paint = { ...keyboard };
      if ('matches' in row.pointer) row.pointer.paint = emptyFocusPaint(route);
    }
    evidence.observations = [observation];
    const transition = observation.transitions.find(row => observation.controls.find(control => control.index === row.control)?.kind === 'toggle' && row.before.control.startsWith('aria-pressed=false'))!;
    const target = observation.controls.find(control => control.index === transition.control)!;
    const failures = () => interactiveLedgerVerdicts(evidence, plan, new Map()).get(observation.mountId)!.failures['VAL-B2-VIZ-007'];
    expect(failures()).toEqual([]);
    transition.after.control = transition.before.control;
    if (mutation === 'label') transition.after.control += ' changed';
    if (mutation === 'disabled') transition.after.control = transition.after.control.replace('disabled=null', 'disabled=');
    if (mutation === 'expanded') transition.after.control = transition.after.control.replace('aria-expanded=null', 'aria-expanded=true');
    if (mutation === 'missing-selection') transition.after.control = 'label=Selected';
    if (mutation === 'contradictory-toggle') {
      transition.before.control = 'aria-pressed=false aria-selected=true';
      transition.after.control = 'aria-pressed=true aria-selected=false';
    }
    if (mutation === 'contradictory-checkbox') {
      target.kind = 'checkbox';
      transition.before.control = 'checked=false aria-checked=true';
      transition.after.control = 'checked=true aria-checked=false';
    }
    if (mutation === 'mixed-radio') {
      target.kind = 'radio';
      transition.before.control = 'aria-checked=mixed';
      transition.after.control = 'aria-checked=true';
    }
    transition.stateExposed = true;
    expect(failures().some(failure => failure.includes('no valid native selection state'))).toBe(true);
  });
});
