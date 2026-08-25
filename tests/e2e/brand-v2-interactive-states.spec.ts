import {
  buildInteractiveExecutionPlan,
} from '../../lib/brand-v2-runners';
import {
  accountInteractiveCases,
  validateInteractiveCaseAccounting,
  type InteractiveStateCase,
} from '../../lib/brand-v2-interactive-accounting';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  brandV2Registry,
  expect,
  test,
} from './brand-v2-static-fixture';
import { setSlider } from './slider';
import type { Locator, Page } from '@playwright/test';

const INTERACTIVE_IMPORT =
  /import\s+\{\s*([A-Z][A-Za-z0-9]*)\s*\}\s+from\s+['"]@\/components\/interactive\/[^'"]+['"]/g;

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

function pairwiseRoot(page: Page, resetIndex: number): Locator {
  const reset = page
    .locator('main button')
    .filter({ hasText: /^\s*Reset\s*$/ })
    .nth(resetIndex);
  return reset.locator(
    "xpath=ancestor::div[count(.//button[normalize-space(.)='Reset'])=1 and .//input[@type='range'] and (.//*[@aria-pressed] or .//*[@aria-selected] or .//input[@type='radio'] or .//input[@type='checkbox'] or .//select or .//details)][1]",
  );
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

async function exerciseReset(page: Page, resetIndex: number) {
  const reset = page
    .locator('main button')
    .filter({ hasText: /^\s*Reset\s*$/ })
    .nth(resetIndex);
  expect(
    await reset.count(),
    'a mounted reset case exposes its own Reset action in the DOM',
  ).toBe(1);
  expect(await reset.isEnabled()).toBe(true);
  if (await reset.isVisible()) await reset.click();
  else await reset.evaluate((element) => (element as HTMLButtonElement).click());
}

async function exercisePairwise(
  page: Page,
  pairwiseIndex: number,
) {
  const root = pairwiseRoot(page, pairwiseIndex);
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
  kindIndex: number,
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
      await exerciseReset(page, kindIndex);
      return true;
    case 'discrete-options': {
      const witness = stateCase.id.match(/^(loading|error|empty|unavailable)-witness$/)?.[1];
      expect(
        witness,
        `${component}:${stateCase.id} identifies a bounded implemented-state witness`,
      ).toBeTruthy();
      const source = readFileSync(join(process.cwd(), sourcePath), 'utf8');
      expect(
        new RegExp(`\\b${witness}\\b`, 'i').test(source),
        `${component}:${stateCase.id} has an implemented source witness`,
      ).toBe(true);
      expect(
        html.includes(component),
        `${component}:${stateCase.id} ships the witness-owning component`,
      ).toBe(true);
      return true;
    }
    case 'pairwise':
      await exercisePairwise(page, kindIndex);
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
        let resetIndex = 0;
        let pairwiseIndex = 0;
        for (const mount of mounts) {
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
                stateCase.kind === 'reset' ? resetIndex : pairwiseIndex,
              )
            ) {
              reconciledCaseIds.add(caseId);
              if (stateCase.kind === 'reset') resetIndex += 1;
              if (stateCase.kind === 'pairwise') pairwiseIndex += 1;
            }
          }
          observedMounts += 1;
        }
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
