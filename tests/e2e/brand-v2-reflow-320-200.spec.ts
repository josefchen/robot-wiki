import type { BrowserContext } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildPublicRouteExecutionPlan } from '../../lib/brand-v2-runners';
import {
  brandV2Registry,
  expect,
  test,
} from './brand-v2-static-fixture';
import { documentOverflow } from './helpers/document-overflow';

async function sweepContext(
  context: BrowserContext,
  staticBase: string,
  routes: string[],
  profileId: string,
  failures: string[],
  swept: string[],
): Promise<void> {
  const page = await context.newPage();
  try {
    for (const route of routes) {
      await page.goto(`${staticBase}${route}`);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator('main')).toBeVisible();
      const overflow = await documentOverflow(page);
      if (overflow > 0) failures.push(`${profileId}:${route}:${overflow}px`);
      swept.push(`${profileId}:${route}`);
    }
  } finally {
    await page.close();
  }
}

test.describe('brand-v2-reflow-320-200', () => {
  test('enforces route loading, zoom-equivalent, and text-only profiles for every route', async ({
    browser,
    staticBase,
  }) => {
    test.setTimeout(600_000);
    const routes = brandV2Registry.routes.public.map(({ path }) => path);
    const plan = buildPublicRouteExecutionPlan(brandV2Registry, routes);
    expect(plan.members.length).toBeGreaterThan(5);
    const failures: string[] = [];
    const swept: string[] = [];

    const reflow = await browser.newContext({
      viewport: { width: 320, height: 800 },
      deviceScaleFactor: 1,
    });
    await sweepContext(reflow, staticBase, routes, 'reflow-320', failures, swept);
    await reflow.close();

    const zoomEquivalent = await browser.newContext({
      viewport: { width: 720, height: 450 },
      deviceScaleFactor: 2,
    });
    await sweepContext(
      zoomEquivalent,
      staticBase,
      routes,
      'zoom-equivalent-200',
      failures,
      swept,
    );
    await zoomEquivalent.close();
    expect(swept).toEqual([
      ...routes.map((route) => `reflow-320:${route}`),
      ...routes.map((route) => `zoom-equivalent-200:${route}`),
    ]);

    const textOnly = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await textOnly.newPage();
    try {
      for (const route of routes) {
        await page.goto(`${staticBase}${route}`);
        await page.evaluate(() => document.fonts.ready);
        const sizes = await page.evaluate(() => {
          const nodes = [
            ...document.querySelectorAll<HTMLElement>(
              'main h1, main h2, main h3, main p, main button, main label, main a',
            ),
          ].filter((node) => node.getClientRects().length > 0);
          return nodes.map((node, index) => {
            node.dataset.brandV2TextProbe = String(index);
            return {
              index,
              baseline: Number.parseFloat(getComputedStyle(node).fontSize),
            };
          });
        });
        expect(sizes.length, `${route} text population`).toBeGreaterThan(0);
        await page.addStyleTag({
          content: sizes
            .map(
              ({ index, baseline }) =>
                `[data-brand-v2-text-probe="${index}"]{font-size:${baseline * 2}px!important}`,
            )
            .join('\n'),
        });
        const sizeFailures = await page.evaluate((expected) => {
          return expected.flatMap(({ index, baseline }) => {
            const node = document.querySelector<HTMLElement>(
              `[data-brand-v2-text-probe="${index}"]`,
            );
            const actual = node
              ? Number.parseFloat(getComputedStyle(node).fontSize)
              : Number.NaN;
            return Number.isFinite(actual) &&
              Math.abs(actual - baseline * 2) <= 0.5
              ? []
              : [`${index}:${baseline}px→${actual}px`];
          });
        }, sizes);
        failures.push(
          ...sizeFailures.map(
            (failure) => `text-only-200:${route}:${failure}`,
          ),
        );
        const overflow = await documentOverflow(page);
        if (overflow > 0) {
          failures.push(`text-only-200:${route}:${overflow}px`);
        }
      }
    } finally {
      await page.close();
      await textOnly.close();
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });

  // VAL-B2-EVID-011 no longer archives 320px drift: the sweep above enforces
  // zero overflow on every route, and no expected-red entry may reopen it.
  test('all public routes reach zero 320px overflow', () => {
    const archive = JSON.parse(
      readFileSync(
        join(process.cwd(), 'evidence', 'brand-v2', 'expected-red-v1.json'),
        'utf8',
      ),
    ) as { failures: Array<{ suite: string; assertionId: string }> };
    expect(
      archive.failures.filter(
        ({ suite, assertionId }) =>
          suite === 'brand-v2-reflow-320-200' || assertionId === 'VAL-B2-EVID-011',
      ),
    ).toEqual([]);
  });
});
