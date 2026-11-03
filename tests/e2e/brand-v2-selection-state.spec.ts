import { writeFileSync } from 'node:fs';
import { test, expect, brandV2Registry } from './brand-v2-static-fixture';
import { measureLedgerMount, type LedgerPlant } from './helpers/interactive-ledger-driver';
import { interactiveLedgerPlan } from '../../lib/brand-v2-interactive-ledger';
import { SourceOracleContext } from '../../lib/brand-v2-source-oracle-core';
import { SOURCE_ORACLES } from '../../lib/brand-v2-source-oracles';

const plan = interactiveLedgerPlan(brandV2Registry);
const mounted = (component: string) => plan.mounts.find(mount => mount.sourceId === `interactive:${component}`)!;

for (const [component, label] of [
  ['AdvantageScrubber', 'What it learns'],
  ['NoiseOrEdit', 'Guess and movement edit (EXPO)'],
]) test(`canonical ledger positively selects ${component}'s intended mode`, async ({ browser, staticBase }, info) => {
  test.setTimeout(180_000);
  const mount = mounted(component);
  const observation = await measureLedgerMount(browser, staticBase, plan, mount);
  writeFileSync(info.outputPath(`${component}-selection.json`), JSON.stringify(observation, null, 2));
  const control = observation.controls.find(control => control.name === label)!;
  expect(control, `named control ${label}`).toBeDefined();
  const transitions = observation.transitions.filter(transition => transition.control === control.index);
  expect(transitions).toHaveLength(1);
  const transition = transitions[0];
  expect(transition.before.control).toContain('aria-pressed=false');
  expect(transition.after.control).toContain('aria-pressed=true');
  expect(transition.stateExposed).toBe(true);
  const frame = transition.series!.frame!;
  expect(frame.controls.find(control => control.label === label)?.pressed).toBe('true');
  if (component === 'AdvantageScrubber') expect(frame.text).toContain('All 5 steps stay in the training data');
  const oracle = SOURCE_ORACLES[mount.sourceId], context = new SourceOracleContext(frame, oracle, label);
  oracle.check(context); context.finish();
  expect(context.failures).toEqual([]);
});

for (const mutation of ['expanded-only', 'no-op'] as const) test(`canonical ledger rejects an unselected option with ${mutation} behavior`, async ({ browser, staticBase }, info) => {
  test.setTimeout(180_000);
  const plant: LedgerPlant = async (_page, root) => {
    await root.evaluate((element, change) => {
      element.addEventListener('click', event => {
        const target = event.target instanceof Element ? event.target.closest('[data-testid="noise-or-edit-edit"]') : null;
        if (!target) return;
        event.stopImmediatePropagation();
        if (change === 'expanded-only') target.setAttribute('aria-expanded', 'true');
      }, true);
    }, mutation);
  };
  const observation = await measureLedgerMount(browser, staticBase, plan, mounted('NoiseOrEdit'), plant);
  writeFileSync(info.outputPath(`${mutation}-selection.json`), JSON.stringify(observation, null, 2));
  const control = observation.controls.find(control => control.name === 'Guess and movement edit (EXPO)')!;
  const transitions = observation.transitions.filter(transition => transition.control === control.index);
  expect(transitions).toHaveLength(1);
  const transition = transitions[0];
  expect(transition.before.control).toContain('aria-pressed=false');
  expect(transition.after.control).toContain('aria-pressed=false');
  if (mutation === 'expanded-only') {
    expect(transition.after.control).toContain('aria-expanded=true');
    expect(transition.after.control).not.toBe(transition.before.control);
  } else expect(transition.after.control).toBe(transition.before.control);
  expect(transition.stateExposed).toBe(false);
});
