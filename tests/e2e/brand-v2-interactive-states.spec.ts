import {
  buildInteractiveExecutionPlan,
} from '../../lib/brand-v2-runners';
import {
  accountInteractiveCases,
  validateInteractiveCaseAccounting,
  type InteractiveStateCase,
} from '../../lib/brand-v2-interactive-accounting';
import { implementsState, type ImplementedState } from '../../lib/brand-v2-census';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  brandV2Registry,
  expect,
  test,
} from './brand-v2-static-fixture';
import { setSlider } from './slider';
import {
  MOUNT_FRAME_SELECTOR,
  PLAIN_TABLE_SOURCES,
  RESET_MARKER,
  mountRoots,
} from './helpers/interactive-mount-roots';
import type { Browser, Locator, Page } from '@playwright/test';
import {
  idleWindow,
  measureLedgerMount,
  type LedgerPlant,
} from './helpers/interactive-ledger-driver';
import {
  IDLE_MOTION_MODES,
  INTERACTIVE_LEDGER_EVIDENCE_PATH,
  INTERACTIVE_LEDGER_VERSION,
  INTERACTIVE_LEDGER_VIEWPORT,
  LEDGER_ASSERTIONS,
  LIVE_REGION_SELECTOR,
  READOUT_SELECTOR,
  interactiveLedgerEvidenceFingerprint,
  interactiveLedgerPlan,
  interactiveLedgerSourceJoins,
  interactiveLedgerVerdicts,
  readInteractiveLedgerEvidence,
  type InteractiveLedgerEvidence,
  type InteractiveLedgerVerdict,
  type LedgerAssertion,
  type LedgerIdle,
  type LedgerObservation,
  type LedgerPlanMount,
  type SourceDefaultJoin,
} from '../../lib/brand-v2-interactive-ledger';

const INTERACTIVE_IMPORT =
  /import\s+\{\s*([A-Z][A-Za-z0-9]*)\s*\}\s+from\s+['"]@\/components\/interactive\/[^'"]+['"]/g;
const FRAMED_RESETS = `${MOUNT_FRAME_SELECTOR} button${RESET_MARKER}`;

function filesUnder(path: string): string[] {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    return entry.isDirectory() ? filesUnder(child) : [child];
  });
}

function deriveMountIdsFromSource(): string[] {
  const mountFiles = [
    ...filesUnder(join(process.cwd(), 'content')).filter((path) =>
      path.endsWith('.mdx'),
    ),
    join(process.cwd(), 'app', 'page.tsx'),
  ];
  const mountIds: string[] = [];
  for (const path of mountFiles) {
    const text = readFileSync(path, 'utf8');
    const route = path.endsWith('app/page.tsx')
      ? '/'
      : `/${path
          .slice(join(process.cwd(), 'content').length + 1)
          .replace(/\.mdx$/, '/')}`;
    const matches: Array<{ component: string; index: number }> = [];
    for (const match of text.matchAll(INTERACTIVE_IMPORT)) {
      for (const mount of text.matchAll(new RegExp(`<${match[1]}\\b`, 'g'))) {
        matches.push({ component: match[1], index: mount.index });
      }
    }
    const ordinals = new Map<string, number>();
    for (const { component } of matches.sort((left, right) => left.index - right.index)) {
      const ordinal = (ordinals.get(component) ?? 0) + 1;
      ordinals.set(component, ordinal);
      mountIds.push(`mount:${route}:${component}:${ordinal}`);
    }
  }
  return mountIds;
}

async function controlState(root: Locator) {
  return root
    .locator(
      'input, select, [aria-pressed], [aria-selected], details, [aria-live], [data-testid]',
    )
    .evaluateAll((elements) =>
      elements.map((element) => ({
        checked:
          element instanceof HTMLInputElement ? element.checked : undefined,
        open: element instanceof HTMLDetailsElement ? element.open : undefined,
        pressed: element.getAttribute('aria-pressed'),
        selected: element.getAttribute('aria-selected'),
        text: element.textContent?.trim(),
        value:
          element instanceof HTMLInputElement ||
          element instanceof HTMLSelectElement
            ? element.value
            : undefined,
      })),
    );
}

async function activateDiscrete(discrete: Locator) {
  const tagName = await discrete.evaluate((element) =>
    element.tagName.toLowerCase(),
  );
  const visible = await discrete.isVisible();
  if (tagName === 'select') {
    if (visible) {
      const selectedIndex = await discrete.evaluate(
        (element) => (element as HTMLSelectElement).selectedIndex,
      );
      await discrete.selectOption({ index: selectedIndex === 0 ? 1 : 0 });
    } else {
      await discrete.evaluate((element) => {
        const select = element as HTMLSelectElement;
        select.selectedIndex = select.selectedIndex === 0 ? 1 : 0;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }
  } else if (tagName === 'details' && visible) {
    await discrete.locator('summary').click();
  } else if (tagName === 'details') {
    await discrete.evaluate((element) => {
      (element as HTMLDetailsElement).open =
        !(element as HTMLDetailsElement).open;
      element.dispatchEvent(new Event('toggle', { bubbles: false }));
    });
  } else if (visible) {
    await discrete.click();
  } else {
    await discrete.evaluate((element) => (element as HTMLElement).click());
  }
}

async function exerciseReset(root: Locator) {
  // The reset lives in the mount's own root, so a mount can neither borrow
  // a neighbour's reset nor hide a second one.
  const reset = root.locator(`button${RESET_MARKER}`);
  expect(
    await reset.count(),
    'a mounted reset case exposes its own reset action in the DOM',
  ).toBe(1);
  expect(await reset.isEnabled()).toBe(true);
  if (await reset.isVisible()) await reset.click();
  else await reset.evaluate((element) => (element as HTMLButtonElement).click());
}

async function exercisePairwise(root: Locator) {
  const range = root.locator('input[type="range"]:not(:disabled)').first();
  const discrete = root
    .locator(
      '[aria-pressed="false"], [aria-selected="false"], input[type="radio"]:not(:checked), input[type="checkbox"]:not(:checked), select, details',
    )
    .first();
  expect(
    await range.count(),
    'pairwise case exposes a range-control dimension',
  ).toBe(1);
  expect(
    await discrete.count(),
    'pairwise case exposes an independent discrete-control dimension',
  ).toBe(1);

  const changedValue = await range.evaluate((element) => {
    const input = element as HTMLInputElement;
    const min = Number(input.min || 0);
    const max = Number(input.max || 100);
    const current = Number(input.value);
    return String(current === min ? max : min);
  });
  if (await range.isVisible()) {
    await setSlider(range, Number(changedValue));
  } else {
    await range.evaluate((element, value) => {
      const input = element as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )?.set;
      setter?.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, changedValue);
  }
  await expect(range).toHaveValue(changedValue);
  const discreteBefore = await controlState(root);
  await activateDiscrete(discrete);
  await expect
    .poll(() => controlState(root), {
      message: 'the discrete pairwise dimension changes state',
    })
    .not.toEqual(discreteBefore);
}

async function exerciseNonSelectorCase(
  page: Page,
  html: string,
  component: string,
  sourcePath: string,
  stateCase: InteractiveStateCase,
  root: Locator,
) {
  switch (stateCase.kind) {
    case 'default':
      await expect(page.locator('main')).toBeVisible();
      expect(
        html.includes(component),
        `${component}:${stateCase.id} has a shipped default render`,
      ).toBe(true);
      return true;
    case 'reset':
      await exerciseReset(root);
      return true;
    case 'discrete-options': {
      const witness = stateCase.id.match(/^(loading|error|empty|unavailable)-witness$/)?.[1] as
        | ImplementedState
        | undefined;
      expect(
        witness,
        `${component}:${stateCase.id} identifies a bounded implemented-state witness`,
      ).toBeTruthy();
      const source = readFileSync(join(process.cwd(), sourcePath), 'utf8');
      // The census reads code only; a state named in a comment is not a witness.
      expect(
        implementsState(source, witness!),
        `${component}:${stateCase.id} has an implemented source witness`,
      ).toBe(true);
      expect(
        html.includes(component),
        `${component}:${stateCase.id} ships the witness-owning component`,
      ).toBe(true);
      return true;
    }
    case 'pairwise':
      await exercisePairwise(root);
      return true;
    default:
      return false;
  }
}

test.describe('brand-v2 interactive-state runner', () => {
  test('reconciles non-empty registry sources, production mounts, controls, and exact cases', async ({
    page,
    staticBase,
  }) => {
    test.setTimeout(600_000);
    const plan = buildInteractiveExecutionPlan(brandV2Registry);
    const sourceDerivedMountIds = deriveMountIdsFromSource();
    expect(new Set(plan.mounts.map(({ id }) => id))).toEqual(
      new Set(sourceDerivedMountIds),
    );

    const sourceById = new Map(plan.sources.map((source) => [source.id, source]));
    const mountById = new Map(plan.mounts.map((mount) => [mount.id, mount]));
    const mountsByRoute = Map.groupBy(
      sourceDerivedMountIds.map((id) => {
        const mount = mountById.get(id);
        expect(mount, `${id} resolves to a registry mount`).toBeTruthy();
        return mount!;
      }),
      (mount) => mount.route,
    );
    const reconciledCaseIds = new Set<string>();
    const allCases: InteractiveStateCase[] = [];
    let observedMounts = 0;
    for (const [route, mounts] of mountsByRoute) {
      await test.step(route, async () => {
        await page.goto(`${staticBase}${route}`);
        const html = readFileSync(
          join(process.cwd(), 'out', route, 'index.html'),
          'utf8',
        );
        const roots = await mountRoots(
          page,
          route,
          mounts.map(({ id, sourceId, ordinal }) => ({
            id,
            sourceId,
            component: sourceById.get(sourceId)?.component ?? sourceId,
            ordinal,
          })),
        );
        for (const [mountIndex, mount] of mounts.entries()) {
          const root = roots[mountIndex];
          const source = sourceById.get(mount.sourceId);
          expect(source, `${mount.id} resolves to a source`).toBeTruthy();
          expect(
            html.includes(source?.component ?? ''),
            `${mount.id} renders ${source?.component} in shipped RSC output`,
          ).toBe(true);
          for (const stateCase of mount.cases) {
            const caseId = `${mount.id}:${stateCase.id}`;
            allCases.push({ ...stateCase, id: caseId });
            if (stateCase.notApplicableReason) continue;
            const selector =
              'selector' in stateCase &&
              typeof stateCase.selector === 'string'
                ? stateCase.selector
                : null;
            if (selector) {
              expect(
                await page.locator(selector).count(),
                `${caseId} reconciles a DOM control/action`,
              ).toBeGreaterThan(0);
              reconciledCaseIds.add(caseId);
              continue;
            }
            if (
              await exerciseNonSelectorCase(
                page,
                html,
                source?.component ?? '',
                source?.sourcePath ?? '',
                stateCase,
                root,
              )
            ) {
              reconciledCaseIds.add(caseId);
            }
          }
          observedMounts += 1;
        }
        const framedResetMounts = mounts.filter(
          (mount) =>
            !PLAIN_TABLE_SOURCES.has(mount.sourceId) &&
            mount.cases.some(({ kind }) => kind === 'reset'),
        ).length;
        expect(
          await page.locator(FRAMED_RESETS).count(),
          `${route} renders exactly one framed reset per framed mount with a reset case (${framedResetMounts})`,
        ).toBe(framedResetMounts);
      });
    }
    expect(observedMounts).toBe(plan.mounts.length);

    const planDerivedTotalCaseCount = plan.mounts.reduce(
      (total, mount) => total + mount.cases.length,
      0,
    );
    const registryDerivedSelectorFloor = plan.mounts.reduce(
      (total, mount) =>
        total + mount.cases.filter(({ selector }) => Boolean(selector)).length,
      0,
    );
    const accounting = accountInteractiveCases(allCases, reconciledCaseIds);
    expect(
      accounting.selectorReconciled +
        accounting.typedNotApplicable +
        accounting.unhandledKind,
    ).toBe(planDerivedTotalCaseCount);
    expect(accounting.unhandledKind).toBe(0);
    expect(accounting.selectorReconciled).toBeGreaterThanOrEqual(
      registryDerivedSelectorFloor,
    );
    expect(
      validateInteractiveCaseAccounting(
        accounting,
        planDerivedTotalCaseCount,
        registryDerivedSelectorFloor,
      ),
    ).toEqual([]);
  });
});

/**
 * The keyboard transition ledger (`VAL-B2-VIZ-002/007/008/016`,
 * `VAL-EDU-015/038`, lib/brand-v2-interactive-ledger.ts): every production
 * mount operated by real key presses on a page of its own, each transition
 * read back with its announcements, focus, pointer twin and keyboard
 * return, and every mount watched idle under both motion preferences.
 *
 * Each site section is swept by its own test, so no single test carries the
 * whole corpus; the readings are joined, decided and written as evidence by
 * the test after them, and the plants after that prove each clause fails.
 */
const ROOT = process.cwd();
const LEDGER_PLAN = interactiveLedgerPlan(brandV2Registry);

/** Pages operated at once, each in a context of its own. */
const LEDGER_CONTEXTS = 6;
/** One section's budget; the largest section runs in a fraction of it. */
const LEDGER_GROUP_TIMEOUT_MS = 900_000;

const ledgerMain = new Map<string, Omit<LedgerObservation, 'idle'>>();
const ledgerIdle = new Map<string, LedgerIdle[]>();
/** A reading that could not be taken; the section's test fails on any, after the rest are taken. */
const ledgerErrors = new Map<string, string>();

async function sweepLedger(
  browser: Browser,
  staticBase: string,
  mounts: readonly LedgerPlanMount[],
) {
  const queue = mounts.flatMap((mount) => [
    { mount, job: 'main' as const },
    ...IDLE_MOTION_MODES.map((motion) => ({ mount, job: motion })),
  ]);
  const total = queue.length;
  let done = 0;
  const worker = async () => {
    for (let item = queue.shift(); item; item = queue.shift()) {
      const { mount, job } = item;
      try {
        if (job === 'main') {
          ledgerMain.set(mount.mountId, await measureLedgerMount(browser, staticBase, LEDGER_PLAN, mount));
        } else {
          const idle = await idleWindow(browser, staticBase, LEDGER_PLAN, mount, job);
          const readings = ledgerIdle.get(mount.mountId) ?? [];
          readings.push(idle);
          readings.sort((a, b) => IDLE_MOTION_MODES.indexOf(a.motion) - IDLE_MOTION_MODES.indexOf(b.motion));
          ledgerIdle.set(mount.mountId, readings);
        }
      } catch (error) {
        const where = error instanceof Error ? (error.stack ?? '').split('\n').find((line) => line.includes('interactive-ledger-driver')) : '';
        ledgerErrors.set(`${mount.mountId} ${job}`, `${error instanceof Error ? error.message.split('\n')[0] : String(error)} ${where?.trim() ?? ''}`);
      }
      done += 1;
      if (done % 10 === 0) console.log(`interactive ledger: ${done}/${total} readings`);
    }
  };
  await Promise.all(Array.from({ length: LEDGER_CONTEXTS }, worker));
}

function assembleLedger(fingerprint: string): InteractiveLedgerEvidence {
  return {
    version: INTERACTIVE_LEDGER_VERSION,
    fingerprint,
    viewport: INTERACTIVE_LEDGER_VIEWPORT.id,
    groups: LEDGER_PLAN.groups,
    mountIds: LEDGER_PLAN.mounts.map(({ mountId }) => mountId),
    observations: LEDGER_PLAN.mounts
      .filter(({ mountId }) => ledgerMain.has(mountId))
      .map(({ mountId }) => ({ ...ledgerMain.get(mountId)!, idle: ledgerIdle.get(mountId) ?? [] })),
  };
}

let ledgerJoins: Map<string, SourceDefaultJoin> | undefined;
const sourceJoins = () => (ledgerJoins ??= interactiveLedgerSourceJoins(ROOT, LEDGER_PLAN));

const verdictsOf = (evidence: InteractiveLedgerEvidence, joins: ReadonlyMap<string, SourceDefaultJoin> = sourceJoins()) =>
  interactiveLedgerVerdicts(evidence, LEDGER_PLAN, joins);

/**
 * Every recorded failure, with the sealed-default drift of `VAL-EDU-015`
 * apart: that half is the comparison `npm run baseline:brand-v2` makes for
 * `VAL-B2-BASE-011`, restricted to mounted sources, and it closes through
 * approved deltas rather than through anything a browser measures.
 */
function ledgerFailures(verdicts: ReadonlyMap<string, InteractiveLedgerVerdict>) {
  const measured: string[] = [];
  const sealedDrift: string[] = [];
  for (const { id, failures, sealedDefaultDrift } of verdicts.values()) {
    for (const assertion of LEDGER_ASSERTIONS) {
      for (const failure of failures[assertion]) {
        const line = `${assertion} ${id}: ${failure}`;
        if (assertion === 'VAL-EDU-015' && sealedDefaultDrift.includes(failure)) sealedDrift.push(line);
        else measured.push(line);
      }
    }
  }
  return { measured, sealedDrift };
}

/** The corpus the verdict test assembled, which the plants then break. */
let measuredLedger: InteractiveLedgerEvidence | undefined;

function corpus(): InteractiveLedgerEvidence {
  if (!measuredLedger) throw new Error('the ledger plants run on the corpus the section sweeps just measured; run the whole ledger suite');
  return measuredLedger;
}

/** The first measured mount, in plan order, that holds what a plant needs. */
function mountWhere(evidence: InteractiveLedgerEvidence, label: string, holds: (observation: LedgerObservation) => boolean): string {
  const found = evidence.observations.find(holds);
  if (!found) throw new Error(`no measured mount holds what the ${label} plant needs`);
  return found.mountId;
}

/**
 * Plants one defect in a copy of the measured corpus and proves it fails
 * each named row on that mount, and leaves every other mount's verdict as
 * it was.
 */
function expectPlantFails(
  label: string,
  rows: readonly LedgerAssertion[],
  mountId: string,
  change: (observation: LedgerObservation) => void,
  joins?: ReadonlyMap<string, SourceDefaultJoin>,
) {
  const base = corpus();
  const planted = structuredClone(base);
  change(planted.observations.find((observation) => observation.mountId === mountId)!);
  const before = verdictsOf(base);
  const after = verdictsOf(planted, joins);
  for (const row of rows) {
    const added = after.get(mountId)!.failures[row].filter((failure) => !before.get(mountId)!.failures[row].includes(failure));
    expect(added.length, `${label} fails ${row} on ${mountId}`).toBeGreaterThan(0);
  }
  for (const [id, verdict] of after) {
    if (id !== mountId) expect(verdict.failures, `${label} leaves ${id} as it was`).toEqual(before.get(id)!.failures);
  }
}

function expectRefused(label: string, artifact: InteractiveLedgerEvidence, message: RegExp, fingerprint = artifact.fingerprint) {
  expect(
    () => readInteractiveLedgerEvidence({ artifact, fingerprint, plan: LEDGER_PLAN }),
    `the reader refuses ${label}`,
  ).toThrow(message);
}

const OPERATED = new Set(['slider', 'toggle', 'action', 'disclosure', 'radio', 'checkbox', 'select', 'text']);

test.describe('brand-v2 interactive keyboard transition ledger', () => {
  test.describe.configure({ mode: 'serial' });

  for (const group of LEDGER_PLAN.groups) {
    test(`every ${group.id} mount is operated by keyboard, watched idle and read back`, async ({
      browser,
      staticBase,
    }) => {
      test.setTimeout(LEDGER_GROUP_TIMEOUT_MS);
      const registered = brandV2Registry.interactive.mounts.filter(
        ({ route }: { route: string }) => (route.split('/').filter(Boolean)[0] ?? 'home') === group.id,
      );
      expect(group.mountIds.length, `${group.id} mount population`).toBeGreaterThan(0);
      expect(group.mountIds.length).toBe(registered.length);
      const mounts = LEDGER_PLAN.mounts.filter((mount) => mount.group === group.id);
      await sweepLedger(browser, staticBase, mounts);
      expect(
        [...ledgerErrors].filter(([key]) => mounts.some(({ mountId }) => key.startsWith(`${mountId} `))).map(([key, message]) => `${key}: ${message}`),
        'readings that could not be taken',
      ).toEqual([]);
      for (const mount of mounts) {
        const main = ledgerMain.get(mount.mountId);
        expect(main?.status, `${mount.mountId} answered`).toBe(200);
        expect(ledgerIdle.get(mount.mountId)?.map(({ motion }) => motion)).toEqual([...IDLE_MOTION_MODES]);
      }
    });
  }

  test('the readings are joined, decided per mount and written as the ledger evidence', async () => {
    expect(LEDGER_PLAN.mounts.length, 'interactive mount population').toBeGreaterThan(0);
    expect(LEDGER_PLAN.mounts.length).toBe(brandV2Registry.interactive.mounts.length);
    const artifact = assembleLedger(interactiveLedgerEvidenceFingerprint({ root: ROOT, plan: LEDGER_PLAN }));
    let measured: InteractiveLedgerEvidence;
    try {
      measured = readInteractiveLedgerEvidence({ artifact, fingerprint: artifact.fingerprint, plan: LEDGER_PLAN });
    } catch (error) {
      // The readings live only in this run; keep the refused corpus for diagnosis, never as evidence.
      writeFileSync(test.info().outputPath('refused-interactive-ledger.json'), `${JSON.stringify(artifact, null, 2)}\n`);
      throw error;
    }
    const verdicts = verdictsOf(measured);
    expect([...verdicts.keys()]).toEqual(LEDGER_PLAN.mounts.map(({ mountId }) => mountId));
    const failures = ledgerFailures(verdicts);
    if (failures.sealedDrift.length > 0) {
      test.info().annotations.push({
        type: 'VAL-EDU-015 sealed-default drift (VAL-B2-BASE-011)',
        description: `${failures.sealedDrift.length} member(s) on ${new Set(failures.sealedDrift.map((line) => line.split(' ')[1])).size} mount(s): ${failures.sealedDrift.slice(0, 6).join('; ')}`,
      });
    }
    const artifactPath = join(ROOT, INTERACTIVE_LEDGER_EVIDENCE_PATH);
    mkdirSync(dirname(artifactPath), { recursive: true });
    writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
    measuredLedger = measured;
    expect(failures.measured).toEqual([]);
  });

  test('each ledger clause fails on the mount it is planted on', async ({ browser, staticBase }) => {
    test.setTimeout(600_000);
    const evidence = corpus();
    const planMount = (mountId: string) => LEDGER_PLAN.mounts.find((mount) => mount.mountId === mountId)!;
    const smallest = (holds: (observation: LedgerObservation) => boolean) =>
      [...evidence.observations].filter(holds).sort((a, b) => a.transitions.length - b.transitions.length)[0]?.mountId;
    const reMeasured = async (label: string, mountId: string | undefined, plant: LedgerPlant) => {
      if (!mountId) throw new Error(`no measured mount holds what the ${label} plant needs`);
      const observation = await measureLedgerMount(browser, staticBase, LEDGER_PLAN, planMount(mountId), plant);
      const planted = structuredClone(evidence);
      const at = planted.observations.findIndex((reading) => reading.mountId === mountId);
      planted.observations[at] = { ...observation, idle: planted.observations[at].idle };
      return { mountId, verdict: verdictsOf(planted).get(mountId)! };
    };

    // In the browser: a readout's live region stripped of its politeness
    // leaves the change it announced unspoken.
    const silent = await reMeasured(
      'unspoken readout',
      smallest(
        (observation) =>
          observation.transitions.some(
            (transition) =>
              observation.controls.find(({ index }) => index === transition.control)?.kind !== 'slider' &&
              transition.readouts.some(({ announced }) => announced === 'live-region'),
          ) &&
          observation.transitions.every(({ announcements }) => announcements.every(({ region }) => !region.startsWith('output#'))),
      ),
      async (_page, root) => {
        await root.evaluate((element, live) => {
          for (const region of element.querySelectorAll(live)) {
            region.removeAttribute('aria-live');
            region.removeAttribute('role');
          }
        }, LIVE_REGION_SELECTOR);
      },
    );
    for (const row of ['VAL-B2-VIZ-016', 'VAL-EDU-038'] as const) {
      expect(
        silent.verdict.failures[row].some((failure) => failure.includes('without being spoken')),
        `a readout without aria-live fails ${row} on ${silent.mountId}`,
      ).toBe(true);
    }

    // In the browser: a focus ring taken away fails the visible-focus clause.
    const ringless = await reMeasured(
      'removed focus ring',
      smallest((observation) => observation.controls.some(({ disabled, reached }) => !disabled && reached)),
      async (page) => {
        await page.addStyleTag({ content: '*, *:focus, *:focus-visible { outline: none !important; box-shadow: none !important; }' });
      },
    );
    expect(
      ringless.verdict.failures['VAL-B2-VIZ-007'].some((failure) => failure.includes('no visible focus ring')),
      `a removed focus ring fails VAL-B2-VIZ-007 on ${ringless.mountId}`,
    ).toBe(true);

    // In the browser: a readout a timer rewrites with no input fails the idle window under either preference.
    const ticking = mountWhere(evidence, 'idle timer', (observation) => observation.default.readouts.length > 0);
    for (const motion of IDLE_MOTION_MODES) {
      const idle = await idleWindow(browser, staticBase, LEDGER_PLAN, planMount(ticking), motion, async (_page, root) => {
        await root.evaluate((element, readouts) => {
          const readout = element.querySelector(readouts) ?? element;
          let tick = 0;
          window.setInterval(() => {
            tick += 1;
            readout.setAttribute('aria-valuetext', `${tick}`);
            readout.append(document.createTextNode(` ${tick}`));
          }, 250);
        }, READOUT_SELECTOR);
      });
      expect(idle.mutations, `a planted setInterval writes the readout of ${ticking} under ${motion} motion`).toBeGreaterThan(0);
      expectPlantFails(`a setInterval readout under ${motion} motion`, ['VAL-B2-VIZ-008'], ticking, (observation) => {
        observation.idle = observation.idle.map((reading) => (reading.motion === motion ? idle : reading));
      });
    }

    // On the measured corpus: each clause, planted on one mount.
    const anyTransition = mountWhere(evidence, 'transition', (observation) => observation.transitions.length > 0);
    const withSeries = mountWhere(evidence, 'series', (observation) => observation.transitions.some(({ series }) => series !== null));
    expectPlantFails('a series pair told apart only by colour', ['VAL-B2-VIZ-002'], withSeries, (observation) => {
      observation.transitions.find(({ series }) => series !== null)!.series!.violations.push('planted: two series share paint, geometry and label');
    });
    const sliderEnd = (observation: LedgerObservation) =>
      observation.transitions.find(
        (transition) =>
          observation.controls.find(({ index }) => index === transition.control)?.kind === 'slider' &&
          transition.keys.some((key) => key === 'End' || key === 'Home') &&
          (transition.series?.count ?? 0) >= 2,
      );
    const multiSeriesSlider = mountWhere(
      evidence,
      'slider end',
      (observation) =>
        Boolean(sliderEnd(observation)) &&
        planMount(observation.mountId).cases.some(({ kind, notApplicableReason }) => kind === 'slider-boundaries' && !notApplicableReason),
    );
    expectPlantFails('a slider end whose series were not re-read', ['VAL-B2-VIZ-002'], multiSeriesSlider, (observation) => {
      sliderEnd(observation)!.series = null;
    });
    const operable = mountWhere(evidence, 'operable control', (observation) => observation.controls.some(({ disabled }) => !disabled));
    const firstLive = (observation: LedgerObservation) => observation.controls.find(({ disabled }) => !disabled)!;
    expectPlantFails('a control the keyboard never reaches', ['VAL-B2-VIZ-007'], operable, (observation) => {
      firstLive(observation).reached = false;
    });
    expectPlantFails('a control without a visible ring', ['VAL-B2-VIZ-007'], operable, (observation) => {
      firstLive(observation).focusVisible = false;
    });
    expectPlantFails('a name without its visible label', ['VAL-B2-VIZ-016'], operable, (observation) => {
      firstLive(observation).labelInName = false;
    });
    const slider = mountWhere(evidence, 'slider', (observation) =>
      observation.transitions.some((transition) => observation.controls.find(({ index }) => index === transition.control)?.kind === 'slider'),
    );
    expectPlantFails('a slider set without its keys', ['VAL-B2-VIZ-007'], slider, (observation) => {
      observation.transitions.find(
        (transition) => observation.controls.find(({ index }) => index === transition.control)?.kind === 'slider',
      )!.keys = ['fill()'];
    });
    const noResetSlider = mountWhere(
      evidence,
      'no-reset slider',
      (observation) => !planMount(observation.mountId).hasReset && observation.controls.some(({ kind, disabled }) => kind === 'slider' && !disabled),
    );
    expectPlantFails('a no-reset slider whose default is not stated', ['VAL-B2-VIZ-007'], noResetSlider, (observation) => {
      observation.controls.find(({ kind, disabled }) => kind === 'slider' && !disabled)!.defaultStated = false;
    });
    expectPlantFails('a transition that exposes no state', ['VAL-B2-VIZ-007'], anyTransition, (observation) => {
      observation.transitions[0].stateExposed = false;
    });
    expectPlantFails('a transition the keyboard cannot undo', ['VAL-B2-VIZ-007', 'VAL-EDU-015'], anyTransition, (observation) => {
      observation.transitions[0].returned.restored = false;
    });
    const withReset = mountWhere(evidence, 'reset', (observation) => observation.reset !== null && planMount(observation.mountId).hasReset);
    expectPlantFails('a reset that does not restore the default', ['VAL-B2-VIZ-007', 'VAL-EDU-015'], withReset, (observation) => {
      observation.reset!.restored = false;
    });
    expectPlantFails('a reset pressed from the default', ['VAL-B2-VIZ-007'], withReset, (observation) => {
      observation.reset!.fromDigest = observation.default.digest;
    });
    expectPlantFails('a value that changes with no input', ['VAL-B2-VIZ-008'], anyTransition, (observation) => {
      observation.idle[0] = { ...observation.idle[0], mutations: 2, samples: ['planted readout text "1" to "2"'] };
    });
    expectPlantFails('a modelled number without a self-label', ['VAL-B2-VIZ-008'], anyTransition, (observation) => {
      observation.telemetry = { kind: 'illustrative', numericReadouts: ['42 %'], selfLabelled: false };
    });
    const withPointer = mountWhere(evidence, 'pointer twin', (observation) =>
      observation.transitions.some(({ pointer }) => 'matches' in pointer),
    );
    expectPlantFails('a pointer that reaches another state', ['VAL-B2-VIZ-016'], withPointer, (observation) => {
      const pointer = observation.transitions.find((transition) => 'matches' in transition.pointer)!.pointer as { matches: boolean };
      pointer.matches = false;
    });
    expectPlantFails('focus that leaves the operated control', ['VAL-B2-VIZ-016', 'VAL-EDU-038'], anyTransition, (observation) => {
      observation.transitions[0].focus = { ...observation.transitions[0].focus, retained: false, after: 'body' };
    });
    expectPlantFails('a duplicated id', ['VAL-B2-VIZ-016'], anyTransition, (observation) => {
      observation.transitions[0].duplicateIds = ['planted-id'];
    });
    expectPlantFails('a hover the focus does not reveal', ['VAL-B2-VIZ-016'], anyTransition, (observation) => {
      observation.hover.push({ target: 'planted tooltip', control: null, hoverRevealed: ['planted tip'], focusRevealed: [] });
    });
    const walked = mountWhere(evidence, 'tab walk', (observation) => new Set(observation.focusOrder.visited).size >= 2);
    expectPlantFails('a tab walk out of document order', ['VAL-B2-VIZ-016'], walked, (observation) => {
      observation.focusOrder.visited = [...observation.focusOrder.visited].reverse();
    });
    expectPlantFails('a positive tabindex', ['VAL-B2-VIZ-016'], anyTransition, (observation) => {
      observation.focusOrder.positiveTabindex = 1;
    });
    expectPlantFails('one action announced twice', ['VAL-B2-VIZ-016', 'VAL-EDU-038'], anyTransition, (observation) => {
      observation.transitions[0].announcements = [
        { region: 'div#0[aria-live=polite]', politeness: 'polite', text: 'Planted reading 42', atMs: 10 },
        { region: 'div#1[role=status]', politeness: 'polite', text: 'Planted reading 42', atMs: 20 },
      ];
    });
    expectPlantFails('a changed readout nothing speaks', ['VAL-B2-VIZ-016', 'VAL-EDU-038'], anyTransition, (observation) => {
      observation.transitions[0].readouts.push({ key: 'planted', before: '1', after: '2', announced: 'none' });
    });
    expectPlantFails('a fresh load that renders another default', ['VAL-EDU-015'], anyTransition, (observation) => {
      observation.idle = observation.idle.map((reading) => (reading.motion === 'reduce' ? { ...reading, digest: 'f'.repeat(64) } : reading));
    });
    // A source mounted once, so its drifted default fails that mount alone.
    const soleMount = mountWhere(
      evidence,
      'sealed default',
      (observation) =>
        LEDGER_PLAN.mounts.filter((mount) => mount.sourcePath === planMount(observation.mountId).sourcePath).length === 1,
    );
    const sourcePath = planMount(soleMount).sourcePath;
    const drifted = new Map(sourceJoins());
    const join = drifted.get(sourcePath)!;
    drifted.set(sourcePath, {
      ...join,
      sealed: true,
      members: [...join.members, { memberId: `default:${sourcePath}:planted`, status: 'unapproved', change: 'changed' }],
    });
    expectPlantFails('a sealed default changed without an approved delta', ['VAL-EDU-015'], soleMount, () => {}, drifted);

    // The reader: omission, empty population, order and staleness.
    const omitted = structuredClone(evidence);
    const holder = omitted.observations.find((observation) =>
      observation.controls.some(
        (control) =>
          !control.disabled &&
          OPERATED.has(control.kind) &&
          observation.transitions.filter((transition) => transition.control === control.index).length === 1,
      ),
    );
    if (!holder) throw new Error('no measured mount holds a control with exactly one transition to omit');
    const lone = holder.controls.find(
      (control) =>
        !control.disabled &&
        OPERATED.has(control.kind) &&
        holder.transitions.filter((transition) => transition.control === control.index).length === 1,
    )!;
    holder.transitions = holder.transitions.filter((transition) => transition.control !== lone.index);
    for (const record of holder.cases) {
      record.records = record.kind === 'focus'
        ? holder.controls.length
        : record.kind === 'hover'
          ? holder.hover.filter(({ control }) => control !== null).length
          : holder.transitions.filter(({ caseId }) => caseId === record.caseId).length;
    }
    expectRefused('an omitted transition', omitted, /omitted|records no transition/);
    expectRefused('an empty population', { ...structuredClone(evidence), mountIds: [], observations: [] }, /empty/);
    expectRefused('a dropped mount', { ...structuredClone(evidence), observations: evidence.observations.slice(1) }, /dropped/);
    expectRefused(
      'a reordered reading',
      { ...structuredClone(evidence), observations: [evidence.observations[1], evidence.observations[0], ...evidence.observations.slice(2)] },
      /out of plan order/,
    );
    const idleless = structuredClone(evidence);
    idleless.observations.at(-1)!.idle = idleless.observations.at(-1)!.idle.slice(0, 1);
    expectRefused('a missing idle window', idleless, /idle windows/);
    expectRefused('a stale fingerprint', structuredClone(evidence), /stale/, `${evidence.fingerprint}-planted`);
    expect(() =>
      readInteractiveLedgerEvidence({
        artifact: evidence,
        fingerprint: evidence.fingerprint,
        plan: { mounts: [], groups: [] },
      }),
    ).toThrow(/empty|dropped|unregistered/);
  });
});
