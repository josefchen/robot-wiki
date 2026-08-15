// @vitest-environment node
/**
 * VAL-CROSS-029: publishing a module propagates it to every discovery
 * surface with no per-surface wiring, and reverting removes it again.
 *
 * Draft-probe pattern (see tests/helpers/draft-fixtures.ts): this test
 * flips the first draft module in registry order to `published`, ships a
 * minimal probe article for it, rebuilds, and asserts the probe appears in
 * the sidebar taxonomy, the /a-z index, its domain landing page,
 * sitemap.xml, the Pagefind prose search index, and the "Linked from"
 * backlinks of the articles its seeAlso names. It then restores the
 * registry and content tree byte-for-byte, rebuilds, and asserts the probe
 * is gone everywhere and its route 404s again.
 *
 * RUNS STANDALONE (`npm run test:propagation`), excluded from the default
 * vitest suite: it mutates the real registry and content tree mid-run,
 * which races the real-repo validator tests in a parallel suite.
 *
 * Isolation: builds run with PROBE_DIST_DIR=.next-probe (next.config.ts),
 * so the static export lands inside .next-probe/ and the canonical out/
 * artifact is never clobbered mid-test. Pagefind is run against the probe
 * export directly. If the test process is SIGKILLed mid-run, recovery is
 * `git checkout data/modules.ts && rm content/<domain>/<slug>.mdx &&
 * rm -rf .next-probe` — the registry edit is a single added line.
 */
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  chromium,
  expect as pwExpect,
  type Browser,
  type Page,
} from '@playwright/test';
import { firstDraftModule } from '../helpers/draft-fixtures';
import {
  startStaticExportServer,
  type StaticExportServer,
} from '../e2e/static-export-server';
import { DOMAIN_META } from '@/data/modules';

const ROOT = join(import.meta.dirname, '..', '..');
const MODULES_TS = join(ROOT, 'data', 'modules.ts');
const PROBE_DIST = join(ROOT, '.next-probe');
const PAGEFIND_BIN = join(ROOT, 'node_modules', '.bin', 'pagefind');
const PORT = 3202;
const BASE = `http://localhost:${PORT}`;
// Distinctive real-word marker: unique across the site, and genuine enough
// for the Pagefind index (a nonsense token trips the truncation-fallback
// quirk, see library/user-testing.md quirk on isGenuineHit).
const MARKER = 'lattice zephyr quorum';
const SCREENSHOT_DIR = '/tmp/propagation-probe';

const probe = firstDraftModule();

function build() {
  execFileSync('npx', ['next', 'build'], {
    cwd: ROOT,
    env: { ...process.env, PROBE_DIST_DIR: '.next-probe' },
    stdio: 'pipe',
    timeout: 300_000,
  });
  execFileSync(PAGEFIND_BIN, ['--site', PROBE_DIST], {
    cwd: ROOT,
    stdio: 'pipe',
    timeout: 120_000,
  });
}

async function get(path: string): Promise<{ status: number; body: string }> {
  // The in-process static server shares the event loop with execFileSync
  // builds, so a keep-alive socket opened before a build can be stale by
  // the time the next request reuses it (ECONNRESET). Connection: close
  // plus a short retry makes each request a fresh socket.
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(`${BASE}${path}`, {
        headers: { connection: 'close' },
      });
      return { status: response.status, body: await response.text() };
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw lastError;
}

// Vitest evaluates the describe factory at collection even when skipIf
// skips the suite, so dereferencing `probe!` in the factory body throws
// once no drafts remain (all 42 modules published, 2026-08-15). Type the
// sentinel as the real registry entry: with no drafts the suite is skipped
// and the sentinel's fields are never read.
import type { ModuleRegistryEntry } from '@/data/modules';
const PROBE_SENTINEL: ModuleRegistryEntry =
  probe ?? { domain: 'adjacent', slug: '', title: '', summary: '', order: 0, status: 'draft' };

describe.skipIf(probe === undefined)(
  'draft-probe propagation (VAL-CROSS-029)',
  () => {
    const key = `${PROBE_SENTINEL.domain}/${PROBE_SENTINEL.slug}`;
    const probeFile = join(ROOT, 'content', PROBE_SENTINEL.domain, `${PROBE_SENTINEL.slug}.mdx`);
    let originalModulesTs: string;
    let server: StaticExportServer;
    let browser: Browser;
    let page: Page;
    let filesRestored = false;

    function restoreFiles() {
      if (filesRestored) return;
      writeFileSync(MODULES_TS, originalModulesTs);
      rmSync(probeFile, { force: true });
      filesRestored = true;
    }

    beforeAll(async () => {
      originalModulesTs = readFileSync(MODULES_TS, 'utf8');

      // Flip the registry: one added line in the PUBLISHED set. The set's
      // closer is the only `]);` in the file; assert that shape so a
      // registry refactor fails loudly here instead of flipping nothing.
      const closers = originalModulesTs.match(/\n\]\);/g) ?? [];
      expect(closers).toHaveLength(1);
      const flipped = originalModulesTs.replace(
        /\n\]\);/,
        `\n  '${key}',\n]);`,
      );
      expect(flipped).toContain(`'${key}',`);
      writeFileSync(MODULES_TS, flipped);

      // Ship the probe article. Frontmatter mirrors the registry entry
      // (check 4 requires the match); seeAlso points at two published
      // modules so the backlink surface has edges to show.
      writeFileSync(
        probeFile,
        `---
title: "${PROBE_SENTINEL.title}"
description: "${PROBE_SENTINEL.summary}"
domain: ${PROBE_SENTINEL.domain}
slug: ${PROBE_SENTINEL.slug}
order: ${PROBE_SENTINEL.order}
status: published
lastReviewed: "2026-08-11"
citations:
  - modern-robotics-2017
seeAlso:
  - "classical/kinematics"
  - "data-hardware/hardware-taxonomy"
---

The ${MARKER} marks this page as a propagation probe: it exists so every
discovery surface has something distinctive to find, and it cites a real
source so the content gate treats it as an ordinary article
<Cite id="modern-robotics-2017" />.
`,
      );

      build();
      expect(
        existsSync(join(PROBE_DIST, PROBE_SENTINEL.domain, PROBE_SENTINEL.slug, 'index.html')),
      ).toBe(true);

      server = await startStaticExportServer(PROBE_DIST, PORT);
      browser = await chromium.launch();
      page = await browser.newPage();
      mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }, 420_000);

    afterAll(async () => {
      // Belt and braces: the revert test restores and rebuilds, but a
      // failure before it runs must not leave the tree flipped.
      restoreFiles();
      await page?.close();
      await browser?.close();
      await server?.stop();
      rmSync(PROBE_DIST, { recursive: true, force: true });
    }, 120_000);

    it('serves the probe route with its marker prose', async () => {
      const { status, body } = await get(`/${key}/`);
      expect(status).toBe(200);
      expect(body).toContain(MARKER);
    });

    it('appears in the sidebar taxonomy under its domain', async () => {
      await page.goto(`${BASE}/`);
      const nav = page.getByRole('navigation', { name: 'robot-wiki taxonomy' });
      await nav
        .getByRole('button', { name: DOMAIN_META[PROBE_SENTINEL.domain].name })
        .click();
      const link = nav.getByRole('link', { name: PROBE_SENTINEL.title });
      await pwExpect(link).toBeVisible();
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/sidebar-published.png`,
      });
    });

    it('appears in the /a-z index', async () => {
      const { body } = await get('/a-z/');
      expect(body).toContain(`/${key}/`);
      expect(body).toContain(PROBE_SENTINEL.title);
      await page.goto(`${BASE}/a-z/`);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/a-z-published.png`, fullPage: false });
    });

    it('appears on its domain landing page', async () => {
      const { body } = await get(`/${PROBE_SENTINEL.domain}/`);
      expect(body).toContain(`/${key}/`);
      expect(body).toContain(PROBE_SENTINEL.title);
    });

    it('appears in sitemap.xml', async () => {
      const { body } = await get('/sitemap.xml');
      expect(body).toContain(`/${key}/`);
    });

    it('appears as a backlink on the articles its seeAlso names', async () => {
      const { body } = await get('/classical/kinematics/');
      const linkedFrom = body.match(
        /data-section="linked-from"[\s\S]*?<\/section>/,
      );
      expect(linkedFrom).not.toBeNull();
      expect(linkedFrom![0]).toContain(`/${key}/`);
      await page.goto(`${BASE}/classical/kinematics/`);
      await page
        .locator('section[data-section="linked-from"]')
        .screenshot({ path: `${SCREENSHOT_DIR}/backlink-published.png` });
    });

    it('is returned by the prose search index for its marker query', async () => {
      await page.goto(`${BASE}/search/?q=${encodeURIComponent(MARKER)}`);
      const result = page.locator(`a[href="/${key}/"]`).first();
      await pwExpect(result).toBeVisible({ timeout: 20_000 });
      await page.screenshot({ path: `${SCREENSHOT_DIR}/search-published.png` });
    });

    it(
      'reverting the flip removes the probe from every surface',
      async () => {
        restoreFiles();
        build();

        // Route 404s again.
        const route = await get(`/${key}/`);
        expect(route.status).toBe(404);

        // Static surfaces no longer reference it.
        for (const path of ['/', '/a-z/', `/${PROBE_SENTINEL.domain}/`]) {
          const { body } = await get(path);
          expect(body).not.toContain(`/${key}/`);
        }
        const sitemap = await get('/sitemap.xml');
        expect(sitemap.body).not.toContain(`/${key}/`);

        // The backlink on kinematics is gone.
        const kinematics = await get('/classical/kinematics/');
        const linkedFrom = kinematics.body.match(
          /data-section="linked-from"[\s\S]*?<\/section>/,
        );
        if (linkedFrom) {
          expect(linkedFrom[0]).not.toContain(`/${key}/`);
        }

        // The search index no longer returns it.
        await page.goto(`${BASE}/search/?q=${encodeURIComponent(MARKER)}`);
        await pwExpect(
          page.getByText(/No module prose matches/i).first(),
        ).toBeVisible({ timeout: 20_000 });
        await pwExpect(page.locator(`a[href="/${key}/"]`)).toHaveCount(0);
      },
      420_000,
    );
  },
);
