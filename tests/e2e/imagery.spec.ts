import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { IMAGES, licenceLabel } from '../../data/images';
import { startStaticExportServer, type StaticExportServer } from './static-export-server';

/**
 * Licensed imagery and attribution (VAL-IMG-001 through VAL-IMG-014, the
 * browser-side half): alt text, visible credits, credit links, the /credits
 * page and its chrome reachability, intrinsic dimensions and layout shift,
 * static-asset serving, no 404s, 375px responsiveness, and axe. Verified
 * against the shipped artifact: the static export served locally (an
 * OS-assigned free port; see static-export-server.ts), not the dev
 * server. The build-time half (registry schema, three-way agreement,
 * licence gate) lives in tests/unit/images.test.ts and
 * scripts/validate-content.ts.
 */

let BASE: string;

/** Every route that renders at least one content image. */
const IMAGE_ROUTES = [
  '/',
  '/classical/kinematics/',
  '/data-hardware/hardware-taxonomy/',
  '/manipulation/action-chunking/',
  '/manipulation/bc-foundations/',
  '/rl-sim2real/legged-locomotion/',
  '/credits/',
] as const;

const GENERIC_ALT =
  /^(image|photo|picture|screenshot|diagram|figure|graphic|illustration|img)$/i;

let server: StaticExportServer | null = null;

test.beforeAll(async () => {
  const outDir = join(process.cwd(), 'out');
  expect(
    existsSync(join(outDir, 'index.html')),
    'out/ is missing or stale: run `npm run build` before the imagery spec',
  ).toBe(true);
  server = await startStaticExportServer(outDir);
  BASE = `http://localhost:${server.port}`;
});

test.afterAll(async () => {
  await server?.stop();
});

/** Content images: img elements inside main, at least 64px in both dims. */
const CONTENT_IMAGES = 'main img';

test.describe('licensed imagery', () => {
  test('every content image has meaningful alt text (VAL-IMG-001)', async ({
    page,
  }) => {
    for (const route of IMAGE_ROUTES) {
      await page.goto(`${BASE}${route}`);
      const imgs = page.locator(CONTENT_IMAGES);
      for (const img of await imgs.all()) {
        const alt = await img.getAttribute('alt');
        const src = (await img.getAttribute('src')) ?? '';
        expect(alt, `alt present on ${src} (${route})`).not.toBeNull();
        expect(
          alt!.trim().length,
          `alt length on ${src} (${route})`,
        ).toBeGreaterThanOrEqual(15);
        const filename = src.split('/').pop() ?? '';
        const stem = filename.replace(/\.[a-z0-9]+$/i, '');
        const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
        expect(
          normalize(alt!.trim()),
          `alt is not the filename on ${src} (${route})`,
        ).not.toBe(normalize(filename));
        expect(normalize(alt!.trim())).not.toBe(normalize(stem));
        expect(
          GENERIC_ALT.test(alt!.trim()),
          `alt is not generic on ${src} (${route})`,
        ).toBe(false);
        expect(alt, `alt has no em/en dash on ${src} (${route})`).not.toMatch(
          /[—–]/,
        );
      }
    }
  });

  test('every content image carries a visible credit naming source and licence (VAL-IMG-002)', async ({
    page,
  }) => {
    for (const route of IMAGE_ROUTES) {
      await page.goto(`${BASE}${route}`);
      const figures = page.locator('main figure', { has: page.locator('img') });
      for (const figure of await figures.all()) {
        const credit = figure.locator('[data-image-credit]');
        await expect(credit, `credit on ${route}`).toBeVisible();
        const text = (await credit.textContent()) ?? '';
        expect(text, `credit names a source on ${route}`).toMatch(
          /(Photo|Diagram): \S/,
        );
        expect(text, `credit states a licence on ${route}`).toMatch(
          /Licence: \S/,
        );
      }
    }
  });

  test('credits link to the original where a source URL exists (VAL-IMG-003)', async ({
    page,
  }) => {
    for (const route of IMAGE_ROUTES) {
      await page.goto(`${BASE}${route}`);
      const credits = page.locator('main [data-image-credit]');
      for (const credit of await credits.all()) {
        const links = credit.locator('a');
        for (const link of await links.all()) {
          const href = (await link.getAttribute('href')) ?? '';
          expect(href, `absolute https href (${route})`).toMatch(/^https:\/\//);
          expect(await link.getAttribute('target')).toBe('_blank');
          expect(await link.getAttribute('rel')).toContain('noopener');
        }
      }
    }
    // Spot-check: a photographed entry's source link equals its registry
    // sourceUrl, and its licence link equals its registry licenceUrl.
    const photo = IMAGES.find((i) => i.id === 'franka-emika-panda-cebit-2017')!;
    await page.goto(`${BASE}/data-hardware/hardware-taxonomy/`);
    const credit = page.locator('main [data-image-credit]').first();
    await expect(
      credit.getByRole('link', { name: photo.sourceName }),
    ).toHaveAttribute('href', photo.sourceUrl!);
    await expect(
      credit.getByRole('link', { name: licenceLabel(photo) }),
    ).toHaveAttribute('href', photo.licenceUrl);
  });

  test('/credits lists every registered image with source, licence and link (VAL-IMG-004)', async ({
    page,
  }) => {
    const response = await page.goto(`${BASE}/credits/`);
    expect(response!.status()).toBe(200);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Credits' }),
    ).toBeVisible();
    const entries = page.locator('[data-credits-entry]');
    await expect(entries).toHaveCount(IMAGES.length);
    for (const image of IMAGES) {
      const entry = page.locator(`[data-credits-entry="${image.id}"]`);
      await expect(entry.locator('img')).toHaveCount(1);
      const credit = entry.locator('[data-image-credit]');
      await expect(credit).toBeVisible();
      const text = (await credit.textContent()) ?? '';
      expect(text, `${image.id} names its creator`).toContain(image.creator);
      expect(text, `${image.id} names its source`).toContain(image.sourceName);
      expect(text, `${image.id} states its licence`).toContain(
        licenceLabel(image),
      );
      if (image.sourceUrl) {
        await expect(
          credit.getByRole('link', { name: image.sourceName }),
        ).toHaveAttribute('href', image.sourceUrl);
      }
    }
  });

  test('/credits is reachable by clicking from the chrome at 1440px and 375px (VAL-IMG-005)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE}/`);
    const nav = page.getByRole('navigation', { name: 'robot-wiki taxonomy' });
    const link = nav.getByRole('link', { name: 'Credits' });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/credits\/?$/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Credits' }),
    ).toBeVisible();

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE}/`);
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
    const drawer = page.getByRole('dialog', { name: 'Site navigation' });
    const drawerLink = drawer.getByRole('link', { name: 'Credits' });
    await expect(drawerLink).toBeVisible();
    await drawerLink.click();
    await expect(page).toHaveURL(/\/credits\/?$/);
  });

  test('the credits page renders exactly the registered set (VAL-IMG-006)', async ({
    page,
  }) => {
    await page.goto(`${BASE}/credits/`);
    const rendered = await page
      .locator('[data-credits-entry]')
      .evaluateAll((els) =>
        els.map((el) => el.getAttribute('data-credits-entry')).sort(),
      );
    expect(rendered).toEqual(IMAGES.map((i) => i.id).sort());
  });

  test('images declare intrinsic dimensions and cause no layout shift (VAL-IMG-009)', async ({
    page,
  }) => {
    for (const route of IMAGE_ROUTES) {
      await page.goto(`${BASE}${route}`);
      const imgs = page.locator(CONTENT_IMAGES);
      for (const img of await imgs.all()) {
        const src = await img.getAttribute('src');
        expect(
          await img.getAttribute('width'),
          `width declared on ${src} (${route})`,
        ).not.toBeNull();
        expect(
          await img.getAttribute('height'),
          `height declared on ${src} (${route})`,
        ).not.toBeNull();
      }
      const cls = await page.evaluate(
        () =>
          new Promise<number>((resolve) => {
            let shift = 0;
            const observer = new PerformanceObserver((list) => {
              for (const entry of list.getEntries() as PerformanceEntry[]) {
                const layout = entry as unknown as {
                  hadRecentInput: boolean;
                  value: number;
                };
                if (!layout.hadRecentInput) shift += layout.value;
              }
            });
            observer.observe({ type: 'layout-shift', buffered: true });
            // Images are already loaded by the time we observe (goto awaits
            // load); a buffered read catches the shifts that happened.
            // Resolve only after fonts settle: late font swaps are the
            // observed source of sub-pixel shift noise under full-suite
            // load (four sightings, all <= 0.0002, on migrating routes).
            document.fonts.ready.then(() => {
              setTimeout(() => resolve(shift), 300);
            });
          }),
      );
      // Sub-perceptual epsilon, not exact zero: 0.001 is 100x tighter than
      // Lighthouse's "good" CLS threshold (0.1) and ~5x the largest noise
      // ever observed here (0.000196). A genuine lazy-image reflow is
      // orders of magnitude larger, so the assertion still fails on the
      // defect VAL-IMG-009 exists to catch.
      expect(cls, `no perceptible layout shift on ${route}`).toBeLessThan(0.001);
    }
  });

  test('images are static assets; no optimisation endpoint, no 404s (VAL-IMG-010, VAL-IMG-011)', async ({
    page,
  }) => {
    for (const route of IMAGE_ROUTES) {
      const failed: string[] = [];
      page.on('response', (response) => {
        const url = response.url();
        if (/\.(jpe?g|png|svg|webp|gif|avif)(\?|$)/.test(url) && response.status() >= 400) {
          failed.push(`${response.status()} ${url}`);
        }
      });
      await page.goto(`${BASE}${route}`);
      expect(failed, `image request failures on ${route}`).toEqual([]);
      const imgs = page.locator(CONTENT_IMAGES);
      for (const img of await imgs.all()) {
        const src = (await img.getAttribute('src')) ?? '';
        const srcset = (await img.getAttribute('srcset')) ?? '';
        expect(src, `no optimizer endpoint in src (${route})`).not.toContain(
          '/_next/image',
        );
        expect(srcset, `no optimizer endpoint in srcset (${route})`).not.toContain(
          '/_next/image',
        );
        const naturalWidth = async () =>
          img.evaluate((el) => (el as HTMLImageElement).naturalWidth);
        // Images are loading="lazy": only scroll-triggered loads fetch, so
        // bring each into view before measuring (a validator does the same).
        await img.scrollIntoViewIfNeeded();
        await expect
          .poll(naturalWidth, `naturalWidth non-zero for ${src} (${route})`)
          .toBeGreaterThan(0);
      }
    }
  });

  test('no horizontal overflow at 375px on image-bearing routes (VAL-IMG-012)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    for (const route of IMAGE_ROUTES) {
      await page.goto(`${BASE}${route}`);
      const widths = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        inner: window.innerWidth,
      }));
      expect(
        widths.scroll,
        `no page-level horizontal scroll on ${route}`,
      ).toBeLessThanOrEqual(widths.inner);
      const imgs = page.locator(CONTENT_IMAGES);
      for (const img of await imgs.all()) {
        const overflow = await img.evaluate((el) => {
          const rect = el.getBoundingClientRect();
          const parent = el.parentElement!.getBoundingClientRect();
          return rect.right - parent.right;
        });
        expect(
          overflow,
          `image stays inside its container on ${route}`,
        ).toBeLessThanOrEqual(1);
      }
    }
  });

  test('zero axe violations on /credits and every image-bearing article (VAL-IMG-014)', async ({
    page,
  }) => {
    for (const route of IMAGE_ROUTES) {
      await page.goto(`${BASE}${route}`);
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations, `axe violations on ${route}`).toEqual([]);
    }
  });

  test('share-alike images state their own licence, never the site licence', async ({
    page,
  }) => {
    // The two CC BY-SA entries must show CC BY-SA 4.0 in their credit and
    // on /credits; nothing on an image-bearing page may claim CC BY 4.0
    // for them (share-alike stays attached to the image, not the site).
    const shareAlike = IMAGES.filter((i) => i.licence === 'cc-by-sa-4.0');
    expect(shareAlike.length).toBeGreaterThanOrEqual(2);
    const articleRoutes: Record<string, string> = {
      'anymal-anybotics-2022': '/rl-sim2real/legged-locomotion/',
      'franka-emika-panda-cebit-2017': '/data-hardware/hardware-taxonomy/',
    };
    for (const image of shareAlike) {
      const routes = [articleRoutes[image.id], '/credits/'].filter(Boolean);
      for (const route of routes) {
        await page.goto(`${BASE}${route}`);
        const credit = page
          .locator('main [data-image-credit]')
          .filter({ hasText: image.creator })
          .first();
        const text = (await credit.textContent()) ?? '';
        expect(text, `${image.id} states CC BY-SA on ${route}`).toContain(
          'CC BY-SA 4.0',
        );
        expect(text, `${image.id} never claims CC BY 4.0 on ${route}`).not.toContain(
          'CC BY 4.0',
        );
        await expect(
          credit.getByRole('link', { name: 'CC BY-SA 4.0' }),
        ).toHaveAttribute('href', image.licenceUrl);
      }
    }
  });
});
