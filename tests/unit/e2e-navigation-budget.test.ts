import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { Browser, Page } from '@playwright/test';
import ts from 'typescript6';
import { describe, expect, it, vi } from 'vitest';
import { expectedApparatusGraph } from '../../lib/brand-v2-apparatus-evidence';
import { forEachInOwnContext } from '../e2e/helpers/per-route-context';
import {
  NAVIGATION_BUDGET,
  auditNavigationBudget,
  collectNavigationCounts,
  describeRow,
  isOverBudget,
  readDebt,
} from '../../scripts/check-e2e-navigation-budget';

// Feed only fixture source into the real scanner; do not replace its analysis
// or policy, write fixture files, import a browser spec, or launch a browser.
async function inspectFixture(source: string) {
  // An isolated Node process keeps fixture I/O out of Vitest's cached native
  // imports. The actual checker is imported after interception; no policy code
  // is copied or mocked. All other reads, including the real debt file, pass through.
  const script = `
    import fs from 'node:fs';
    import { syncBuiltinESMExports } from 'node:module';
    import { join } from 'node:path';
    const source = fs.readFileSync(0, 'utf8');
    const directory = join(process.cwd(), 'tests/e2e');
    const fixture = join(directory, 'navigation-lifecycle-fixture.spec.ts');
    const read = fs.readFileSync;
    const list = fs.readdirSync;
    fs.readdirSync = (path, ...args) => String(path) === directory
      ? ['navigation-lifecycle-fixture.spec.ts'] : list(path, ...args);
    fs.readFileSync = (path, ...args) => String(path) === fixture
      ? source : read(path, ...args);
    syncBuiltinESMExports();
    const { auditNavigationBudget } = await import('./scripts/check-e2e-navigation-budget.ts');
    process.stdout.write(JSON.stringify(await auditNavigationBudget()));
  `;
  return JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: process.cwd(), input: source, encoding: 'utf8',
    env: { ...process.env, NODE_DISABLE_COMPILE_CACHE: '1' },
    timeout: 30_000,
  })) as Awaited<ReturnType<typeof auditNavigationBudget>>;
}

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

describe('dynamic route ownership uses the existing navigation policy', () => {
  it('rejects a shared page in an unresolved dynamic route loop', async () => {
    const result = await inspectFixture(`
      test('dynamic shared route walk', async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        try {
          for (const route of deriveRoutes()) await page.goto(route);
        } finally { await context.close(); }
      });
    `);
    expect(result.counts).toHaveLength(1);
    expect(result.counts[0]).toMatchObject({ receiver: 'page', navigations: null });
    expect(result.counts[0].unresolved.length).toBeGreaterThan(0);
    expect(result.unlisted).toEqual(result.counts);
    expect(isOverBudget(result.counts[0])).toBe(true);
  });

  it('certifies a callback-owned page for the same unresolved route population', async () => {
    const result = await inspectFixture(`
      test('dynamic isolated route walk', async ({ browser }) => {
        await forEachInOwnContext(browser, deriveRoutes(), async (page, route) => {
          await page.goto(route);
        }, { viewport: { width: 1440, height: 1000 } });
      });
    `);
    expect(result.counts).toHaveLength(1);
    expect(result.counts[0]).toMatchObject({ receiver: 'page', navigations: 1, unresolved: [] });
    expect(result.unlisted).toEqual([]);
    expect(isOverBudget(result.counts[0])).toBe(false);
    expect(NAVIGATION_BUDGET).toBe(16);
  });

  it('certifies the real RL reader without debt, dropped routes, or shared ownership', async () => {
    const counts = (await collectNavigationCounts())
      .filter(row => row.file === 'tests/e2e/rl-source-closeouts.spec.ts');
    expect(counts).toHaveLength(3);
    expect(counts.every(row => row.navigations === 1 && row.unresolved.length === 0)).toBe(true);
    expect(readDebt().filter(row => row.file === 'tests/e2e/rl-source-closeouts.spec.ts')).toEqual([]);
    const graph = expectedApparatusGraph(process.cwd());
    const changed = ['levine-hand-eye-2016', 'her-2017', 'q-transformer-2023'];
    const affected = [...graph].filter(([, value]) =>
      [...value.references, ...value.citationMarkers,
        ...value.componentCitationSites.map(site => site.id)]
        .some(id => changed.includes(id)),
    );
    // The production line's offline-RL article also cites q-transformer-2023,
    // so the reader walks both consumers, each in its own context.
    expect(affected.map(([route]) => route).sort())
      .toEqual(['/rl-sim2real/offline-rl/', '/rl-sim2real/rl-for-robotics/']);
    expect([...graph.keys()].filter(route => route.endsWith('/generalist-policies/')))
      .toEqual(['/manipulation/generalist-policies/']);
  });
});

function instrumentedBrowser() {
  let active = 0;
  const events: string[] = [];
  const contexts: { page: Page; close: ReturnType<typeof vi.fn> }[] = [];
  const newContext = vi.fn(async () => {
    expect(active, 'previous context must finish closing before the next is created').toBe(0);
    active++;
    const index = contexts.length;
    const page = { contextIndex: index } as unknown as Page;
    const close = vi.fn(async () => {
      events.push(`close-start:${index}`);
      await Promise.resolve();
      active--;
      events.push(`close-end:${index}`);
    });
    contexts.push({ page, close });
    events.push(`create:${index}`);
    return { newPage: async () => page, close };
  });
  return {
    browser: { newContext } as unknown as Browser,
    newContext, contexts, events, active: () => active,
  };
}

describe('actual per-route helper lifecycle, instrumented without a browser', () => {
  it.each([1440, 375])('visits every item serially on a distinct page and closes it at width %i', async (width) => {
    const harness = instrumentedBrowser();
    const options = { viewport: { width, height: 1000 } };
    const items = ['first', 'second', 'third'];
    const visited: string[] = [];
    const pages: Page[] = [];
    await forEachInOwnContext(harness.browser, items, async (page, item) => {
      const index = visited.length;
      expect(harness.active()).toBe(1);
      expect(page).toBe(harness.contexts[index].page);
      harness.events.push(`visit-start:${index}`);
      visited.push(item);
      pages.push(page);
      await Promise.resolve();
      expect(harness.active()).toBe(1);
      harness.events.push(`visit-end:${index}`);
    }, options);
    expect(visited).toEqual(items);
    expect(new Set(pages).size).toBe(items.length);
    expect(harness.newContext.mock.calls).toEqual(items.map(() => [options]));
    expect(harness.events).toEqual(items.flatMap((_, index) => [
      `create:${index}`, `visit-start:${index}`, `visit-end:${index}`,
      `close-start:${index}`, `close-end:${index}`,
    ]));
    expect(harness.active()).toBe(0);
    for (const context of harness.contexts) expect(context.close).toHaveBeenCalledExactlyOnceWith();
  });

  it.each([1440, 375])('closes the failing item and propagates the original callback error at width %i', async (width) => {
    const harness = instrumentedBrowser();
    const originalFailure = new Error('reader assertion failed');
    const visited: string[] = [];
    const options = { viewport: { width, height: 1000 } };
    await expect(forEachInOwnContext(harness.browser, ['first', 'second', 'unvisited'], async (page, item) => {
      expect(page).toBe(harness.contexts[visited.length].page);
      visited.push(item);
      await Promise.resolve();
      if (item === 'second') throw originalFailure;
    }, options)).rejects.toBe(originalFailure);
    expect(visited).toEqual(['first', 'second']);
    expect(harness.contexts).toHaveLength(2);
    expect(harness.newContext.mock.calls).toEqual([[options], [options]]);
    expect(harness.events).toEqual([
      'create:0', 'close-start:0', 'close-end:0',
      'create:1', 'close-start:1', 'close-end:1',
    ]);
    expect(harness.active()).toBe(0);
    for (const context of harness.contexts) expect(context.close).toHaveBeenCalledExactlyOnceWith();
  });
});

// Canonical AST printer removes indentation/comments only. The frozen inventory
// covers every non-lifecycle call (including all assertions, listeners, captures
// and output writes), loop inputs, viewports, titles, and graph derivation.
// Lifecycle ownership is checked separately; no browser result is inferred.
describe('RL reader route, viewport and assertion preservation', () => {
  it('retains the complete pre-repair behavior inventory and original route-body statements', () => {
    const path = 'tests/e2e/rl-source-closeouts.spec.ts';
    const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
    const printer = ts.createPrinter({ removeComments: true });
    const print = (node: ts.Node) => printer.printNode(ts.EmitHint.Unspecified, node, source);
    const inventory = {
      testTitles: [] as string[], viewports: [] as string[],
      iterations: [] as { binding: string; iterable: string }[],
      calls: [] as string[], graphBindings: [] as string[], captureFunction: [] as string[],
    };
    let routeBody: string[] = [];
    const helpers: ts.CallExpression[] = [];
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node)) {
        const callee = node.expression.getText(source);
        if (callee === 'test') inventory.testTitles.push(print(node.arguments[0]));
        else if (!['forEachInOwnContext', 'browser.newContext', 'context.newPage', 'context.close'].includes(callee)) {
          inventory.calls.push(print(node));
        }
        if (callee === 'forEachInOwnContext') {
          helpers.push(node);
          const callback = node.arguments[2] as ts.ArrowFunction;
          inventory.iterations.push({ binding: print(callback.parameters[1].name), iterable: print(node.arguments[1]) });
          routeBody = (callback.body as ts.Block).statements.filter(statement =>
            !ts.isExpressionStatement(statement) || !ts.isCallExpression(statement.expression)
            || statement.expression.expression.getText(source) !== 'page.on',
          ).map(print);
        }
      }
      if (ts.isPropertyAssignment(node) && node.name.getText(source) === 'viewport') {
        inventory.viewports.push(print(node.initializer));
      }
      if (ts.isForOfStatement(node)) {
        const declarations = node.initializer as ts.VariableDeclarationList;
        inventory.iterations.push({ binding: print(declarations.declarations[0].name), iterable: print(node.expression) });
        if (node.expression.getText(source) === 'affected') routeBody = (node.statement as ts.Block).statements.map(print);
      }
      if (ts.isVariableDeclaration(node) && ['graph', 'changed', 'affected'].includes(node.name.getText(source))) {
        inventory.graphBindings.push(print(node));
      }
      if (ts.isFunctionDeclaration(node) && node.name?.text === 'captureSlices') inventory.captureFunction.push(print(node));
      ts.forEachChild(node, visit);
    };
    visit(source);
    inventory.calls.sort();
    const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
    expect(inventory.testTitles).toHaveLength(3);
    expect(inventory.viewports).toHaveLength(3);
    // Re-frozen 2026-09-22 at the continuation integration: the production
    // line's offline-RL article also renders q-transformer-2023, so the
    // reader walks every affected route. Reviewed delta against the prior
    // freeze (288 calls, 4719865f.../1e01c083...): the heading title, the
    // affected-route pin, the capture name and the changed-id loop now key
    // off the route (AFFECTED_TITLES, capturePrefix, rendered); the RL
    // reader keeps every Term/widget/reset/table call inside its route
    // guard, and the other 282 calls are byte-identical.
    expect(inventory.calls).toHaveLength(298);
    expect(digest(inventory)).toBe('7a12f93d4ebe309a3a606d08c37e8a405f2a68e6a079efa737dbb233633c093e');
    expect(digest(routeBody)).toBe('d58f803cb3faa7484c6b0fb13b427b7f7ba118e23927a8b953f18e5dfbd8ff8e');
    expect(helpers).toHaveLength(1);
    expect(helpers[0].arguments[0].getText(source)).toBe('browser');
    expect(helpers[0].arguments[1].getText(source)).toBe('affected');
    const callback = helpers[0].arguments[2] as ts.ArrowFunction;
    expect(callback.parameters.map(parameter => parameter.name.getText(source))).toEqual(['page', '[route, required]']);
    expect(print(helpers[0].arguments[3])).toBe('{ viewport: { width, height: 1000 } }');
    expect(ts.isAwaitExpression(helpers[0].parent)).toBe(true);
  });
});
