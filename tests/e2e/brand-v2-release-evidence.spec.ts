import { brandV2Registry, expect, test } from './brand-v2-static-fixture';
import { RELEASE_PROFILES, releaseProfileProblems } from '../../lib/brand-v2-release-evidence';
import { FINAL_RELEASE_PROFILES, probeReleaseState, writeReleaseStateGroup } from './helpers/release-state-probe';

/** Final release runs this with ROBOT_WIKI_RELEASE_PROFILES=1. Independent
 * routes are shardable; each writes only its own artifact. The final reader
 * requires all registry routes, so a filtered/sharded run cannot masquerade
 * as whole-site acceptance. */
test.describe('final release route profiles', () => {
  test.skip(!FINAL_RELEASE_PROFILES, 'The final release profile gate is explicitly enabled by ROBOT_WIKI_RELEASE_PROFILES=1.');
  for (const route of brandV2Registry.routes.public) {
    test(`${route.id} preserves content and semantics in every sealed profile`, async ({ page, staticBase }) => {
      test.setTimeout(RELEASE_PROFILES.length * 120_000);
      const response = await page.goto(`${staticBase}${route.path}`, { waitUntil: 'networkidle' });
      expect(response?.status()).toBe(200);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator('main')).toBeVisible();
      // Keyboard-only entry proves the skip target belongs to the live page.
      await page.keyboard.press('Tab');
      await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.locator('#main-content')).toBeFocused();
      const record = await probeReleaseState(page, {
        id: route.id, route: route.path, state: 'settled-default',
        steps: ['navigate-export', 'fonts-ready', 'keyboard-skip-to-content', 'all-sealed-profiles'],
      });
      const group = `route-${route.path.replace(/^\/+|\/+$/g, '').replace(/\//g, '-') || 'home'}`;
      writeReleaseStateGroup(group, [route.id], [record]);
    });
  }
});

test('the profile observer measures real media and restores a live form state', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setContent(`<!doctype html><html lang="en"><head><title>Release probe fixture</title><style>
    body{font-family:Arial,sans-serif;color:#111;background:white;margin:8px}main{max-width:100%}input{max-width:90%;box-sizing:border-box}button:focus-visible,input:focus-visible{outline:1px solid #111;outline-offset:2px}
  </style></head><body><main><h1>Fixture</h1><p>This text remains available.</p><label for="query">Query</label><input id="query" value="kept"><button type="button">Read</button></main></body></html>`);
  await page.setViewportSize({ width: 1280, height: 720 });
  const record = await probeReleaseState(page, { id: 'fixture', route: '/', state: 'typed-value', steps: ['render-controlled-fixture', 'set-value'] });
  expect(record.profiles).toHaveLength(RELEASE_PROFILES.length);
  for (const profile of record.profiles) expect(releaseProfileProblems(profile, RELEASE_PROFILES.find(({ id }) => id === profile.id)!)).toEqual([]);
  await expect(page.locator('#query')).toHaveValue('kept');
  expect(await page.evaluate(() => ({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio }))).toEqual({ width: 1280, height: 720, dpr: 1 });
});

test('the profile observer proves responsive contents and citation text through keyboard disclosures', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.setContent(`<!doctype html><html lang="en"><head><title>Disclosure fixture</title><style>
    body{font-family:Arial,sans-serif;color:#111;background:white;margin:8px}a{color:#111}a:focus-visible,summary:focus-visible{outline:1px solid #111;outline-offset:2px}.sidenote{display:none}.sidenote[data-open=true]{display:inline}.sidenote-index{display:none}.desktop-contents{display:none} @media(min-width:1200px){.sidenote,.sidenote-index,.desktop-contents{display:inline}.mobile-contents{display:none}}
  </style></head><body><main><h1>Fixture</h1><nav class="desktop-contents" aria-label="Contents"><a href="#section">A section</a></nav><details class="mobile-contents"><summary>Contents</summary><nav aria-label="Contents"><a href="#section">A section</a></nav></details><h2 id="section">A section</h2><p>A cited statement <span class="cite"><sup class="cite-mark"><a href="#ref" aria-describedby="note" onclick="event.preventDefault();const note=document.getElementById('note');note.dataset.open=note.dataset.open==='true'?'false':'true'">1</a></sup><span id="note" data-sidenote class="sidenote" data-open="false"><span class="sidenote-index">1 </span>Author 2026, A useful source.</span></span></p><p id="ref">Reference.</p></main></body></html>`);
  await page.locator('.cite-mark a').evaluate((link) => link.addEventListener('click', () => {
    const note = document.getElementById('note')!;
    note.querySelector('[data-full-reference]')?.remove();
    if (note.dataset.open === 'true') {
      const more = document.createElement('a'); more.dataset.fullReference = ''; more.href = '#ref'; more.textContent = ' Full reference'; note.append(more);
    }
  }));
  const record = await probeReleaseState(page, { id: 'disclosures', route: '/', state: 'default', steps: ['render responsive citation and contents'] });
  for (const profile of record.profiles) {
    expect(profile.requiredDisclosureIds).toEqual(['contents', 'citation:note']);
    expect(profile.disclosures.every(({ keyboard, reached, restored, textPresent }) => keyboard && reached && restored && textPresent)).toBe(true);
    expect(releaseProfileProblems(profile, RELEASE_PROFILES.find(({ id }) => id === profile.id)!)).toEqual([]);
  }
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
  await expect(page.locator('#note')).toHaveAttribute('data-open', 'false');
});
