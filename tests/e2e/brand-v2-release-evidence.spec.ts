import { brandV2Registry, expect, test } from './brand-v2-static-fixture';
import { RELEASE_PROFILES, releaseProfileProblems } from '../../lib/brand-v2-release-evidence';
import { FINAL_RELEASE_PROFILES, captureReleaseState, probeReleaseState, writeReleaseStateGroup } from './helpers/release-state-probe';
import { collectReleaseAccessibilityDetails } from './helpers/release-accessibility-details';
import { captureTextPopulation,measureTextPopulation } from './helpers/release-text-profile';
import { RELEASE_TEXT_ONLY_SELECTORS } from '../../lib/brand-v2-release-text';
import { readReleaseFonts } from './helpers/release-fonts';
import { installReleaseActivityObserver,takeReleaseActivity,resumeReleaseActivity } from './helpers/release-activity';
import { releaseActivityProblems } from '../../lib/brand-v2-release-activity';

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
      const record = await captureReleaseState(page, {
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
    body{font-family:Arial,sans-serif;color:#111;background:white;margin:8px}main{max-width:100%}button,input{min-width:24px;min-height:24px}input{max-width:90%;box-sizing:border-box}button:focus-visible,input:focus-visible{outline:1px solid #1c1c1a;outline-offset:2px}
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
    body{font-family:Arial,sans-serif;color:#111;background:white;margin:8px}a{color:#111;display:inline-block;min-width:24px;min-height:24px}summary{min-height:24px}a:focus-visible,summary:focus-visible{outline:1px solid #1c1c1a;outline-offset:2px}.sidenote{display:none}.sidenote[data-open=true]{display:inline}.sidenote-index{display:none}.desktop-contents{display:none} @media(min-width:1200px){.sidenote,.sidenote-index,.desktop-contents{display:inline}.mobile-contents{display:none}}
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

test('SVG contrast uses the actual painted shape behind a label and excludes hidden decorative icons',async({page})=>{
  await page.setContent('<main style="background:rgb(250,250,248)"><span aria-hidden="true"><svg width="16" height="16"><path d="M0 0H16V16H0Z"/></svg></span><svg role="img" aria-label="Two labels" aria-describedby="description" width="200" height="100"><rect x="0" y="0" width="100" height="100" fill="rgb(28,28,26)"/><text x="40" y="55" font-size="16" fill="rgb(250,250,248)">6</text><text x="130" y="55" font-size="16" fill="rgb(163,163,158)">bad</text></svg><p id="description">A white number on an ink block and a low contrast gray word on paper.</p></main>');
  const reading=await page.evaluate(collectReleaseAccessibilityDetails);
  expect(reading.graphics).toHaveLength(1);
  expect(reading.svgText).toHaveLength(2);
  expect(reading.svgText[0].background).toBe('rgb(28, 28, 26)');
  expect(reading.svgText[0].ratio).toBeGreaterThan(4.5);
  expect(reading.svgText[1].ratio).toBeLessThan(4.5);
});

test('the bound text-only census rejects ancestor clipping, overlapping lines and a removed member',async({page})=>{
  await page.setContent('<main><div style="width:90px;overflow:hidden"><p id="clipped" style="width:400px;font-size:16px">A long clipped line of readable text.</p></div><p id="overlapped" style="font-size:16px;line-height:6px;width:80px">Many words wrap into several lines with impossible line spacing.</p><p id="clear" style="font-size:16px;line-height:2;width:600px">This line has sufficient room.</p></main>');
  const population=await page.evaluate(captureTextPopulation,[...RELEASE_TEXT_ONLY_SELECTORS]);
  expect(population).toHaveLength(3);
  await page.addStyleTag({content:population.map(({baselinePx},index)=>`[data-release-text-probe="${index}"]{font-size:${baselinePx*2}px!important}`).join('\n')});
  const readings=await page.evaluate(measureTextPopulation,population);
  expect(readings.find(({selector})=>selector==='#clipped')?.clipped).toBe(true);
  expect(readings.find(({selector})=>selector==='#overlapped')?.overlapped).toBe(true);
  expect(readings.find(({selector})=>selector==='#clear')).toMatchObject({actualPx:32,visible:true,clipped:false,overlapped:false});
  await page.locator('#clear').evaluate((node)=>node.remove());
  expect((await page.evaluate(measureTextPopulation,population)).find(({selector})=>selector==='#clear')).toMatchObject({actualPx:null,visible:false});
});

test('font readiness distinguishes an unused local fallback from a failed selected face',async({page})=>{
  await page.setContent('<main style="font-family:Arial,sans-serif"><h1>Loaded system text</h1><p id="sample">Visible text</p></main>');
  await page.evaluate(async()=>{const face=new FontFace('Missing local fallback','local("not-a-real-installed-font-7319")');document.fonts.add(face);await face.load().catch(()=>undefined);});
  const unused=await page.evaluate(readReleaseFonts);
  expect(unused.usedFaceFailures).toEqual([]);
  expect(unused.used.every(({ready})=>ready)).toBe(true);
  expect(unused.unusedFaceFailures).toEqual([expect.objectContaining({family:'Missing local fallback',status:'error'})]);
  await page.locator('#sample').evaluate((node)=>node.style.fontFamily='"Missing local fallback", Arial');
  const selected=await page.evaluate(readReleaseFonts);
  expect(selected.usedFaceFailures).toEqual([expect.objectContaining({family:'Missing local fallback',status:'error'})]);
  expect(selected.used.some(({ready})=>!ready)).toBe(true);
});

test('the registered text-only members detect heading-to-prose collisions',async({page})=>{
  await page.setContent('<main><h1 style="font-size:32px;line-height:32px;margin:0">A heading</h1><p style="font-size:16px;line-height:20px;margin:0">Visible lead paragraph</p></main>');
  const population=await page.evaluate(captureTextPopulation,[...RELEASE_TEXT_ONLY_SELECTORS]);
  expect((await page.evaluate(measureTextPopulation,population)).every(({overlapped})=>!overlapped)).toBe(true);
  await page.addStyleTag({content:population.map(({baselinePx},index)=>`[data-release-text-probe="${index}"]{font-size:${baselinePx*2}px!important}`).join('\n')});
  expect((await page.evaluate(measureTextPopulation,population)).every(({overlapped})=>overlapped)).toBe(true);
});

test('the activity observer retains native operation timing and excludes measurement-induced updates',async({page})=>{
  await page.setContent('<main><button id="update" onclick="setTimeout(()=>document.getElementById(\'status\').textContent=\'Updated\',25)">Update</button><p id="status" role="status"></p></main>');
  // document.open used by setContent clears Document event listeners. Real
  // navigations receive the observer through the page-init script.
  await page.evaluate(installReleaseActivityObserver,true);
  await page.evaluate(resumeReleaseActivity);
  await page.keyboard.press('Tab');await page.keyboard.press('Enter');
  await expect(page.locator('#status')).toHaveText('Updated');
  const first=await page.evaluate(takeReleaseActivity);
  expect(releaseActivityProblems(first)).toEqual([]);
  expect(first.operations.map(({key})=>key)).toEqual(['Tab','Enter']);
  expect(first.operations.every(({trusted})=>trusted)).toBe(true);
  expect(first.changes).toHaveLength(1);
  expect(first.changes[0]).toMatchObject({operationId:2,after:{text:'Updated',role:'status'}});
  expect(first.changes[0].atMs-first.operations[1].atMs).toBeGreaterThanOrEqual(20);
  expect(first.endFocus?.selector).toBe('#update');
  await page.locator('#status').evaluate((node)=>node.textContent='Measurement-only disclosure');
  await page.evaluate(resumeReleaseActivity);
  const next=await page.evaluate(takeReleaseActivity);
  expect(next.operations).toEqual([]);expect(next.changes).toEqual([]);
  expect(next.initialRegions[0].text).toBe('Measurement-only disclosure');
});
