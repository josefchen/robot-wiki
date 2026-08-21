import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  startStaticExportServer,
  type StaticExportServer,
} from './static-export-server';

/**
 * VAL-DIST-008: the credits page carries an About section distinct from
 * the licence list. The heading must match /about|who|why|behind/i, the
 * section must hold >=40 words of visible prose stating why the site
 * exists, its subtree must contain zero licence rows
 * ([data-credits-entry]) and no licence identifier from the permitted
 * licence set in contract/imagery.md, and the page must carry a
 * keyboard-reachable contact affordance with a non-empty accessible name.
 *
 * Served from the static export (like imagery.spec.ts) because the About
 * prose must ship in the built crawler view, not only under a dev server.
 * The licence list itself is VAL-IMG-004's (imagery.spec.ts); this spec
 * additionally pins that the About section does not trim or absorb it.
 */

import { IMAGES } from '../../data/images';
import { IMAGE_LICENCES } from '../../data/schemas/image';

/**
 * The whole permitted-licence set, derived from the schema enum rather
 * than from the licences today's registry happens to use: a licence that
 * no current image carries is still a licence the prose must not restate,
 * and deriving from IMAGES would silently shrink the scan as the registry
 * changes. Each identifier is expanded into the forms prose could carry:
 * the enum literal, and the spaced form the page's own credit lines and
 * header use ("cc by 4.0", "public domain").
 */
const PERMITTED_LICENCE_IDENTIFIERS: string[] = Array.from(
  new Set(
    IMAGE_LICENCES.flatMap((licence) => [
      licence,
      licence.replace(/-/g, ' '),
    ]),
  ),
);

let BASE: string;
let server: StaticExportServer | null = null;

test.beforeAll(async () => {
  const outDir = join(process.cwd(), 'out');
  expect(
    existsSync(join(outDir, 'index.html')),
    'out/ is missing or stale: run `npm run build` before this spec',
  ).toBe(true);
  server = await startStaticExportServer(outDir);
  BASE = `http://localhost:${server.port}`;
});

test.afterAll(async () => {
  await server?.stop();
});

test('the credits page carries an About section (VAL-DIST-008)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE}/credits/`);

  // Heading matching /about|who|why|behind/i. Scoped to main so the footer
  // or chrome cannot satisfy the assertion.
  const heading = page
    .locator('main')
    .getByRole('heading')
    .filter({ hasText: /about|who|why|behind/i });
  await expect(heading.first()).toBeVisible();

  // The section that owns the heading: the nearest ancestor <section> (or
  // the heading's parent flow root if no <section> wraps it). Measured in
  // one browser call because a DOM node returned from evaluate does not
  // serialize back into the test.
  const measured = await heading.first().evaluate((el) => {
    const section = (el.closest('section') ??
      el.parentElement ??
      el) as HTMLElement;
    const all = (section.innerText ?? '').replace(/\s+/g, ' ').trim();
    const headingText = (el as HTMLElement).innerText ?? '';
    // The 40-word floor is about PROSE, so the heading's own words do not
    // count toward it.
    const body = all
      .replace(headingText.replace(/\s+/g, ' ').trim(), '')
      .trim();
    return {
      all,
      body,
      licenceRows: section.querySelectorAll('[data-credits-entry]').length,
    };
  });
  const wordCount = measured.body.split(' ').filter(Boolean).length;
  expect(wordCount, 'About prose is at least 40 words').toBeGreaterThanOrEqual(
    40,
  );

  // The prose states why the site exists (heuristic: reads as a sentence,
  // not a licence restatement). At least one complete sentence: a period
  // terminating a run of >=10 words.
  expect(
    /[A-Za-z][^.]{40,}\./.test(measured.body),
    'About prose contains at least one complete sentence',
  ).toBe(true);

  // Zero licence rows in the section subtree.
  expect(
    measured.licenceRows,
    'About subtree contains zero licence rows',
  ).toBe(0);

  // No licence identifier from the permitted set in the prose.
  const proseLower = measured.all.toLowerCase();
  const hits = PERMITTED_LICENCE_IDENTIFIERS.filter((id) =>
    proseLower.includes(id),
  );
  expect(hits, 'About prose contains no permitted-licence identifier').toEqual(
    [],
  );

  await page.mouse.move(2, 2);
  await page.screenshot({ path: '/tmp/credits-about.png' });
});

test('the credits page carries a keyboard-reachable contact affordance (VAL-DIST-008)', async ({
  page,
}) => {
  await page.goto(`${BASE}/credits/`);

  /**
   * A licence row's source link is NOT a contact affordance. The licence
   * list is generated from data/images.ts and every entry links out to
   * Wikimedia and a licence deed, so a bare `main a[href^="http"]` is
   * satisfied on a page carrying no way to reach the author at all: with
   * every author link deleted from the page, that locator still matched
   * 12 anchors and the assertion passed. Exclude the generated rows so the
   * clause measures the affordance it names.
   */
  const contacts = await page.evaluate(() => {
    const main = document.querySelector('main');
    if (!main) return [];
    return Array.from(main.querySelectorAll('a'))
      .filter((a) => !a.closest('[data-credits-entry]'))
      .map((a) => ({
        href: a.getAttribute('href') ?? '',
        name: (
          a.getAttribute('aria-label') ??
          (a as HTMLElement).innerText ??
          ''
        )
          .replace(/\s+/g, ' ')
          .trim(),
      }))
      .filter(
        (a) =>
          /^mailto:/.test(a.href) ||
          (/^https?:\/\//.test(a.href) &&
            new URL(a.href).origin !== window.location.origin),
      )
      .filter((a) => a.name.length > 0);
  });

  expect(
    contacts.length,
    'a contact affordance (mailto: or external profile) with a non-empty accessible name exists outside the licence rows',
  ).toBeGreaterThan(0);

  // Keyboard trace: tab from the page start until one of those affordances
  // holds focus, within a bounded number of presses. Bound to the element,
  // not merely to a matching href, so a focusable duplicate elsewhere on
  // the page cannot satisfy the clause on the affordance's behalf.
  const hrefs = contacts.map((c) => c.href);
  let focused: string | null = null;
  for (let i = 0; i < 80 && focused === null; i++) {
    await page.keyboard.press('Tab');
    focused = await page.evaluate((candidates: string[]) => {
      const el = document.activeElement as HTMLElement | null;
      const anchor = el?.closest('a');
      if (!anchor) return null;
      if (anchor.closest('[data-credits-entry]')) return null;
      if (!anchor.closest('main')) return null;
      const href = anchor.getAttribute('href') ?? '';
      return candidates.includes(href) ? href : null;
    }, hrefs);
  }
  expect(
    focused,
    'the contact affordance is reachable by Tab from the top of the page',
  ).not.toBeNull();
});

test('the About section does not trim the licence list (VAL-IMG-004 guard)', async ({
  page,
}) => {
  await page.goto(`${BASE}/credits/`);
  const entryCount = await page.locator('[data-credits-entry]').count();
  const registryCount = IMAGES.length;
  expect(entryCount, 'every registered image still has a licence row').toBe(
    registryCount,
  );
});

test('the About prose carries no em-dash or en-dash', async ({ page }) => {
  await page.goto(`${BASE}/credits/`);
  const heading = page
    .locator('main')
    .getByRole('heading')
    .filter({ hasText: /about|who|why|behind/i });
  await expect(heading.first()).toBeVisible();
  const prose = await heading.first().evaluate((el) => {
    const section = el.closest('section') ?? el.parentElement ?? el;
    return (section as HTMLElement).innerText ?? '';
  });
  expect(prose, 'no em-dash or en-dash in the About prose').not.toMatch(
    /[\u2013\u2014]/,
  );

  // Crawler view (no JS): the About prose ships in the exported HTML, and
  // it ships inside the About section rather than only in the page header.
  const html = readFileSync(
    join(process.cwd(), 'out/credits/index.html'),
    'utf8',
  );
  const sentence = 'This wiki is that map';
  expect(html, 'About prose is present without JavaScript').toContain(
    sentence,
  );
});
