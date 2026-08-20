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

// Derived from data/images.ts's licence enum (the permitted-licence set in
// contract/imagery.md), not hand-typed: any identifier the About prose must
// not contain is an identifier the registry can emit.
import { IMAGES } from '../../data/images';

const PERMITTED_LICENCES: string[] = Array.from(
  new Set(
    IMAGES.flatMap((image) => {
      const licence = image.licence as string;
      // Normalise the registry's kebab enum to the identifier forms the
      // prose could carry: the enum literal and the spaced form.
      return [licence, licence.replace(/-/g, ' ')];
    }),
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
  const prose = await heading.first().evaluate((el) => {
    const section = (el.closest('section') ??
      el.parentElement ??
      el) as HTMLElement;
    return (section.innerText ?? '').replace(/\s+/g, ' ').trim();
  });
  const wordCount = prose.split(' ').filter(Boolean).length;
  expect(wordCount, 'About prose is at least 40 words').toBeGreaterThanOrEqual(
    40,
  );

  // The prose states why the site exists (heuristic: reads as a sentence,
  // not a licence restatement). At least one complete sentence: a period
  // terminating a run of >=10 words.
  expect(
    /[A-Za-z][^.]{40,}\./.test(prose),
    'About prose contains at least one complete sentence',
  ).toBe(true);

  // Zero licence rows in the section subtree.
  const licenceRowCount = await heading.first().evaluate((el) => {
    const section = el.closest('section') ?? el.parentElement ?? el;
    return section.querySelectorAll('[data-credits-entry]').length;
  });
  expect(licenceRowCount, 'About subtree contains zero licence rows').toBe(0);

  // No licence identifier from the permitted set in the prose.
  const proseLower = prose.toLowerCase();
  const hits = PERMITTED_LICENCES.filter((id) => proseLower.includes(id));
  expect(
    hits,
    'About prose contains no permitted-licence identifier',
  ).toEqual([]);

  // Keyboard-reachable contact affordance: mailto: or external profile
  // link with a non-empty accessible name. Also traced by real Tab
  // presses below.
  const contact = page.locator(
    'main a[href^="mailto:"], main a[href^="http"]',
  );
  const contactCount = await contact.count();
  expect(contactCount, 'a contact affordance exists').toBeGreaterThan(0);
  let reachable: { href: string; name: string } | null = null;
  for (const link of await contact.all()) {
    const href = (await link.getAttribute('href')) ?? '';
    const name = ((await link.getAttribute('aria-label')) ??
      (await link.innerText())).trim();
    if (!name) continue;
    if (/^mailto:|^https?:\/\//.test(href)) {
      reachable = { href, name };
      break;
    }
  }
  expect(reachable, 'contact affordance with a non-empty accessible name').not
    .toBeNull();

  // Keyboard trace: tab from the page start until the contact link (or a
  // descendant of it) holds focus, within a bounded number of presses.
  if (reachable) {
    await page.goto(`${BASE}/credits/`);
    let focused = false;
    for (let i = 0; i < 60 && !focused; i++) {
      await page.keyboard.press('Tab');
      focused = await page.evaluate((href) => {
        const el = document.activeElement;
        return !!el && (el.closest?.(`a`)?.getAttribute('href') === href);
      }, reachable.href);
    }
    expect(focused, 'contact affordance is keyboard reachable').toBe(true);
  }

  await page.screenshot({
    path: '/tmp/credits-about.png',
    fullPage: false,
  });
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

  // Crawler view (no JS): the About prose ships in the exported HTML.
  const html = readFileSync(join(process.cwd(), 'out/credits/index.html'), 'utf8');
  expect(html, 'About prose is present without JavaScript').toContain(
    'Josef Chen',
  );
});
