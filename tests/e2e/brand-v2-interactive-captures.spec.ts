import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { devices, type Locator, type Page } from '@playwright/test';
import { test, expect, brandV2Registry } from './brand-v2-static-fixture';
import { inOwnContext } from './helpers/per-route-context';
import { collectGlobalConvergence } from './helpers/global-convergence-collector';
import { RESET_MARKER, mountRoots } from './helpers/interactive-mount-roots';
import { stateDigest } from './helpers/interactive-state-digest';
import { setSlider } from './slider';
import { PLAYWRIGHT_SWIFTSHADER_ARGS } from '../../playwright.config';
import { imageSpread } from '../../lib/visual-capture';
import {
  collectorInput,
  readConvergenceRegistry,
} from '../../lib/brand-v2-global-convergence-evidence';
import {
  ALTERNATE_IDENTITY_PATTERN_SOURCE,
  CAPTURE_RUBRIC,
  CAPTURE_SETTLE_ATTEMPTS,
  INTERACTIVE_CAPTURES_EVIDENCE_PATH,
  INTERACTIVE_CAPTURES_VERSION,
  INTERACTIVE_CAPTURE_SHEET_DIR,
  INTERACTIVE_CAPTURE_STATES,
  INTERACTIVE_CAPTURE_VIEWPORTS,
  RETIRED_FAMILY_PATTERN_SOURCE,
  SHEET_JPEG_QUALITY,
  SHEET_TILE_WIDTH_PX,
  captureKey,
  interactiveCapturePlan,
  interactiveCaptureVerdicts,
  interactiveCapturesEvidenceFingerprint,
  plannedSheets,
  readInteractiveCapturesEvidence,
  sheetCaptureKeys,
  type CapturePlanMount,
  type InteractiveCapture,
  type InteractiveCaptureCase,
  type InteractiveCaptureObservation,
  type InteractiveCaptureSheet,
  type InteractiveCapturesEvidence,
} from '../../lib/brand-v2-interactive-captures';
import { implementsState, type ImplementedState } from '../../lib/brand-v2-census';

/**
 * `VAL-B2-VIZ-012`: every production mount of every interactive source,
 * captured as pixels at the phone and the desktop page frame in its default
 * state and in one registered changed state, tiled into deterministic
 * contact sheets, with its registered cases observed in its own root and
 * the §1.12 rubric decided on every painted descendant of that root.
 *
 * Each mount is read on a page of its own, so no other mount's state can
 * move it. The readings and sheets are persisted and decided by the
 * fail-closed reader in `lib/brand-v2-interactive-captures.ts`, so the
 * enforcement generator states results it did not invent.
 */

// Two raster paths make one element shot differ from the next with nothing
// on the page moving, so a capture could never settle. GPU rasterisation
// under SwiftShader alternates a figure's text between two rasterisations
// (/classical/ros2-for-ml-engineers/ at 375 px: 309 px flipping every shot),
// and partial raster re-rasterises only the invalidated part of a tile, so a
// mount taller than the viewport alternates its shading
// (/manipulation/knowledge-insulation/ at 1440 px: 1,891 px). Full software
// rasterisation is deterministic; WebGL keeps SwiftShader.
test.use({
  launchOptions: {
    args: [...PLAYWRIGHT_SWIFTSHADER_ARGS, '--disable-gpu-rasterization', '--disable-partial-raster'],
  },
});

const ROOT = process.cwd();
const REGISTRY = readConvergenceRegistry(ROOT);
const PLAN = interactiveCapturePlan(brandV2Registry);
const REGISTRY_MOUNTS = new Map(brandV2Registry.interactive.mounts.map((mount) => [mount.id, mount]));

/** The attribute the sweep marks the measured mount's root with. */
const MOUNT_ATTRIBUTE = 'data-capture-mount';

/** Pages measured at once, each in a context of its own. */
const SWEEP_CONTEXTS = 3;

const DISCRETE_CONTROLS = [
  '[aria-pressed="false"]',
  '[aria-selected="false"]',
  'input[type="radio"]:not(:checked)',
  'input[type="checkbox"]:not(:checked)',
  'select',
  'details:not([open])',
];
const PAIRWISE_DISCRETE =
  '[aria-pressed], [aria-selected], input[type="radio"], input[type="checkbox"], select, details';
const FOCUSABLE = 'button:not(:disabled), input:not(:disabled), select:not(:disabled), summary, [tabindex]:not([tabindex="-1"])';

type Viewport = (typeof INTERACTIVE_CAPTURE_VIEWPORTS)[number];

const observations: InteractiveCaptureObservation[] = [];
const pixels = new Map<string, Buffer>();
const sheets: InteractiveCaptureSheet[] = [];

const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

/** Waits for what loads after `load`: fonts, and any explainer scene in the page. */
async function settlePage(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(
    () =>
      document.fonts.status === 'loaded' &&
      [...document.querySelectorAll<HTMLElement>('[data-explainers] [data-x="status"]')].every(
        (status) => status.hidden || status.textContent !== 'Loading…',
      ),
    undefined,
    { timeout: 60_000 },
  );
  await page.waitForTimeout(300);
}

/**
 * Sticky and fixed page chrome outside the mount is hidden while a capture
 * is taken: an element screenshot can paint it over the mount, which is a
 * stitching artefact of the capture, not something a reader sees. The
 * collector never runs while it is hidden.
 */
async function hideFloatingChrome(page: Page, hide: boolean) {
  await page.evaluate(
    ({ attribute, hide: on }) => {
      const marker = 'data-capture-chrome-hidden';
      if (!on) {
        for (const element of document.querySelectorAll<HTMLElement>(`[${marker}]`)) {
          element.style.removeProperty('visibility');
          element.removeAttribute(marker);
        }
        return;
      }
      for (const element of document.body.querySelectorAll<HTMLElement>('*')) {
        const position = getComputedStyle(element).position;
        if (position !== 'fixed' && position !== 'sticky') continue;
        if (element.closest(`[${attribute}]`) || element.querySelector(`[${attribute}]`)) continue;
        element.setAttribute(marker, '');
        element.style.setProperty('visibility', 'hidden', 'important');
      }
    },
    { attribute: MOUNT_ATTRIBUTE, hide },
  );
}

/** Element shots until two consecutive ones are byte-identical (§1.11). */
async function settledCapture(
  page: Page,
  scratch: Page,
  root: Locator,
): Promise<{ png: Buffer; capture: Omit<InteractiveCapture, 'state' | 'caseId' | 'control'> }> {
  await page.mouse.move(2, 2);
  await hideFloatingChrome(page, true);
  // Every shot of a mount is taken with its top at the same place in the
  // viewport, so a state that moved the page cannot move the capture.
  await root.evaluate((element) => element.scrollIntoView({ block: 'start', inline: 'nearest' }));
  await page.waitForTimeout(100);
  let previous: Buffer | null = null;
  let png: Buffer | null = null;
  let attempts = 0;
  let settled = false;
  try {
    while (attempts < CAPTURE_SETTLE_ATTEMPTS) {
      attempts += 1;
      const shot = await root.screenshot({ animations: 'allow', caret: 'hide', scale: 'css' });
      if (previous && previous.equals(shot)) {
        png = shot;
        settled = true;
        break;
      }
      previous = shot;
      png = shot;
      await page.waitForTimeout(120);
    }
  } finally {
    await hideFloatingChrome(page, false);
  }
  const geometry = await root.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      fonts: document.fonts.status === 'loaded',
    };
  });
  const bytes = png!;
  const luminanceSpread = await scratch.evaluate(imageSpread, `data:image/png;base64,${bytes.toString('base64')}`);
  return {
    png: bytes,
    capture: {
      sha256: sha256(bytes),
      widthPx: bytes.readUInt32BE(16),
      heightPx: bytes.readUInt32BE(20),
      settleAttempts: attempts,
      settled,
      luminanceSpread: Math.round(luminanceSpread * 100) / 100,
      fontsLoaded: geometry.fonts,
      rootLeftPx: Math.round(geometry.left * 10) / 10,
      rootRightPx: Math.round(geometry.right * 10) / 10,
      documentOverflowPx: geometry.overflow,
    },
  };
}

/** What a reader can name a control by. */
async function controlName(control: Locator): Promise<string> {
  return control.evaluate((element) => {
    const labelled = element.getAttribute('aria-labelledby');
    const text =
      element.getAttribute('aria-label') ??
      (labelled ? document.getElementById(labelled.split(/\s+/)[0])?.textContent : null) ??
      (element instanceof HTMLInputElement ? element.labels?.[0]?.textContent : null) ??
      (element.tagName === 'DETAILS' ? element.querySelector('summary')?.textContent : null) ??
      element.textContent ??
      '';
    const tag =
      element instanceof HTMLInputElement ? `input[type=${element.type}]` : element.tagName.toLowerCase();
    return `${tag} "${text.replace(/\s+/g, ' ').trim().slice(0, 60)}"`;
  });
}

async function firstVisible(candidates: Locator): Promise<Locator | null> {
  const count = await candidates.count();
  for (let index = 0; index < count; index += 1) {
    if (await candidates.nth(index).isVisible()) return candidates.nth(index);
  }
  return null;
}

async function pressReset(page: Page, root: Locator) {
  const reset = root.locator(`button${RESET_MARKER}`);
  if (await reset.isVisible()) await reset.click();
  else await reset.evaluate((element) => (element as HTMLButtonElement).click());
  await blurActive(page);
  await page.mouse.move(2, 2);
  await page.waitForTimeout(150);
}

async function blurActive(page: Page) {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
}

/** Puts the mount in its registered changed state and names what moved. */
async function changeState(page: Page, root: Locator, mount: CapturePlanMount): Promise<string> {
  switch (mount.changedBy) {
    case 'slider': {
      const ranges = root.locator('input[type="range"]:not(:disabled)');
      const range = (await firstVisible(ranges)) ?? ranges.first();
      expect(await range.count(), `${mount.mountId} renders a slider in its root`).toBe(1);
      const { from, to } = await range.evaluate((element) => {
        const input = element as HTMLInputElement;
        const min = Number(input.min || 0);
        const max = Number(input.max || 100);
        const current = Number(input.value);
        return { from: current, to: current === max ? min : max };
      });
      await setSlider(range, to);
      await expect(range).toHaveValue(String(to));
      await blurActive(page);
      return `${await controlName(range)} ${from} to ${to}`;
    }
    case 'discrete': {
      for (const selector of DISCRETE_CONTROLS) {
        const control = await firstVisible(root.locator(selector));
        if (!control) continue;
        const name = await controlName(control);
        const tag = await control.evaluate((element) => element.tagName.toLowerCase());
        if (tag === 'select') {
          const index = await control.evaluate((element) => (element as HTMLSelectElement).selectedIndex);
          await control.selectOption({ index: index === 0 ? 1 : 0 });
        } else if (tag === 'details') {
          await control.locator('summary').first().click();
        } else {
          await control.click();
        }
        await blurActive(page);
        return name;
      }
      throw new Error(`${mount.mountId} renders no visible unselected discrete option in its root`);
    }
    case 'action': {
      const action = await firstVisible(root.locator(`button:not(:disabled):not(${RESET_MARKER})`));
      if (!action) throw new Error(`${mount.mountId} renders no visible action besides its reset`);
      const name = await controlName(action);
      await action.click();
      await blurActive(page);
      return name;
    }
    case 'focus': {
      const control = await firstVisible(root.locator(FOCUSABLE));
      if (!control) throw new Error(`${mount.mountId} renders no visible focusable control`);
      // Reached by the keyboard, so the ring shows as a keyboard reader sees it.
      await control.focus();
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      expect(
        await control.evaluate((element) => element === document.activeElement && element.matches(':focus-visible')),
        `${mount.mountId} holds keyboard focus on its first control`,
      ).toBe(true);
      return `keyboard focus on ${await controlName(control)}`;
    }
  }
}

/** Each registered case, observed in the mount's own root. */
async function observeCases(root: Locator, mount: CapturePlanMount): Promise<InteractiveCaptureCase[]> {
  const registered = REGISTRY_MOUNTS.get(mount.mountId)!.cases;
  const source = readFileSync(join(ROOT, mount.sourcePath), 'utf8');
  const cases: InteractiveCaptureCase[] = [];
  for (const stateCase of registered) {
    const base = { caseId: stateCase.id, kind: stateCase.kind };
    if (stateCase.notApplicableReason) {
      cases.push({ ...base, status: 'not-applicable', matched: null, detail: stateCase.notApplicableReason });
      continue;
    }
    if (stateCase.kind === 'default') {
      cases.push({ ...base, status: 'observed', matched: null, detail: 'the default capture of the mount root' });
      continue;
    }
    if (stateCase.kind === 'reset') {
      const matched = await root.locator(`button${RESET_MARKER}`).count();
      cases.push({
        ...base,
        status: matched === 1 ? 'observed' : 'missing',
        matched,
        detail: `${matched} reset action(s) in the mount root`,
      });
      continue;
    }
    if (stateCase.kind === 'pairwise') {
      const ranges = await root.locator('input[type="range"]:not(:disabled)').count();
      const discrete = await root.locator(PAIRWISE_DISCRETE).count();
      cases.push({
        ...base,
        status: ranges > 0 && discrete > 0 ? 'observed' : 'missing',
        matched: ranges + discrete,
        detail: `${ranges} slider(s) and ${discrete} discrete control(s) as independent dimensions`,
      });
      continue;
    }
    const selector = 'selector' in stateCase && typeof stateCase.selector === 'string' ? stateCase.selector : null;
    if (selector) {
      const matched = await root.locator(selector).count();
      cases.push({
        ...base,
        status: matched > 0 ? 'observed' : 'missing',
        matched,
        detail: `${matched} control(s) match ${selector} in the mount root`,
      });
      continue;
    }
    const witness = stateCase.id.match(/^(loading|error|empty|unavailable)-witness$/)?.[1] as
      | ImplementedState
      | undefined;
    if (stateCase.kind === 'discrete-options' && witness) {
      const present = implementsState(source, witness);
      cases.push({
        ...base,
        status: present ? 'observed' : 'missing',
        matched: null,
        detail: present
          ? `the ${witness} state is implemented in ${mount.sourcePath}`
          : `${mount.sourcePath} implements no ${witness} state`,
      });
      continue;
    }
    cases.push({ ...base, status: 'missing', matched: null, detail: `no observation rule for a ${stateCase.kind} case` });
  }
  return cases;
}

/** Families, identity strings, devices and headline inside the mount root. */
async function readMount(root: Locator) {
  return root.evaluate(
    (element, patterns) => {
      const shown = (node: Element) => {
        const style = getComputedStyle(node);
        return style.visibility !== 'hidden' && style.display !== 'none' && node.getClientRects().length > 0;
      };
      const families = new Set<string>();
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const parent = node.parentElement;
        if (!parent || !/\S/.test(node.textContent ?? '') || !shown(parent)) continue;
        families.add(getComputedStyle(parent).fontFamily.split(',')[0].replace(/["']/g, '').trim());
      }
      const retired = new RegExp(patterns.retired);
      const identity = new RegExp(patterns.identity, 'g');
      const devices = [element, ...element.querySelectorAll('[data-brand-device-id]')].filter(
        (node) => node.hasAttribute('data-brand-device-id') && shown(node),
      ).length;
      const title = element.querySelector('[data-figure-title]');
      let headline: { text: string; lines: number } | null = null;
      if (title && shown(title)) {
        const range = document.createRange();
        range.selectNodeContents(title);
        const lineHeight = parseFloat(getComputedStyle(title).lineHeight) || parseFloat(getComputedStyle(title).fontSize) * 1.2;
        const tops = [...range.getClientRects()]
          .filter((rect) => rect.width > 0 && rect.height > 0)
          .map((rect) => rect.top)
          .sort((a, b) => a - b);
        let lines = 0;
        let last = -Infinity;
        for (const top of tops) {
          if (top - last > lineHeight / 2) lines += 1;
          last = top;
        }
        headline = { text: (title.textContent ?? '').replace(/\s+/g, ' ').trim(), lines };
      }
      return {
        families: [...families].sort(),
        retiredFamilies: [...families].filter((family) => retired.test(family)).sort(),
        alternateIdentity: [...new Set((element as HTMLElement).innerText.match(identity) ?? [])].sort(),
        deviceCount: devices,
        headline,
      };
    },
    { retired: RETIRED_FAMILY_PATTERN_SOURCE, identity: ALTERNATE_IDENTITY_PATTERN_SOURCE },
  );
}

async function collectInMount(page: Page, viewport: Viewport, mount: CapturePlanMount, state: string) {
  const collected = await page.evaluate(collectGlobalConvergence, {
    ...collectorInput(viewport.frame, REGISTRY),
    scopeAttribute: MOUNT_ATTRIBUTE,
  });
  return collected.findings
    .filter(({ scope }) => scope === mount.mountId)
    .map(({ predicate, element, detail, exemption }) => ({
      state: state as (typeof INTERACTIVE_CAPTURE_STATES)[number],
      predicate,
      element,
      detail,
      exemption,
    }));
}

/** Loads the mount's route and marks the mount's own root. */
async function openMount(page: Page, staticBase: string, mount: CapturePlanMount) {
  const response = await page.goto(`${staticBase}${mount.route}`, { waitUntil: 'load' });
  await settlePage(page);
  const routeMounts = PLAN.mounts.filter(({ route }) => route === mount.route);
  const roots = await mountRoots(
    page,
    mount.route,
    routeMounts.map(({ mountId, sourceId, component, ordinal }) => ({ id: mountId, sourceId, component, ordinal })),
  );
  const root = roots[routeMounts.indexOf(mount)];
  await root.evaluate((element, [attribute, id]) => element.setAttribute(attribute, id), [MOUNT_ATTRIBUTE, mount.mountId]);
  await root.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  return { status: response?.status() ?? 0, root };
}

async function measure(
  page: Page,
  staticBase: string,
  mount: CapturePlanMount,
  viewport: Viewport,
): Promise<InteractiveCaptureObservation> {
  const scratch = await page.context().newPage();
  await page.bringToFront();
  const { status, root } = await openMount(page, staticBase, mount);

  const cases = await observeCases(root, mount);
  const defaultState = await stateDigest(root);
  const defaultShot = await settledCapture(page, scratch, root);
  const defaultRead = await readMount(root);
  const findings = await collectInMount(page, viewport, mount, 'default');

  const control = await changeState(page, root, mount);
  const changedShot = await settledCapture(page, scratch, root);
  const changedRead = await readMount(root);
  findings.push(...(await collectInMount(page, viewport, mount, 'changed')));

  let reset: InteractiveCaptureObservation['reset'] = null;
  if (mount.hasReset) {
    const present = await root.locator(`button${RESET_MARKER}`).count();
    reset = { present, restoredDefault: false, restoredRestart: null };
    if (present === 1) {
      await pressReset(page, root);
      const afterReset = await stateDigest(root);
      reset.restoredDefault = afterReset === defaultState;
      if (!reset.restoredDefault) {
        const fresh = await openMount(page, staticBase, mount);
        await pressReset(page, fresh.root);
        reset.restoredRestart = (await stateDigest(fresh.root)) === afterReset;
      }
    }
  }
  await scratch.close();

  const at = (state: string) => captureKey(mount.mountId, viewport.id, state);
  pixels.set(at('default'), defaultShot.png);
  pixels.set(at('changed'), changedShot.png);
  return {
    mountId: mount.mountId,
    viewport: viewport.id,
    status,
    captures: [
      { state: 'default', caseId: 'default', control: null, ...defaultShot.capture },
      { state: 'changed', caseId: mount.changedCaseId, control, ...changedShot.capture },
    ],
    reset,
    cases,
    findings,
    headline: defaultRead.headline,
    deviceCount: defaultRead.deviceCount,
    families: [...new Set([...defaultRead.families, ...changedRead.families])].sort(),
    retiredFamilies: [...new Set([...defaultRead.retiredFamilies, ...changedRead.retiredFamilies])].sort(),
    alternateIdentity: [...new Set([...defaultRead.alternateIdentity, ...changedRead.alternateIdentity])].sort(),
  };
}

/** One contact sheet: a row per mount, desktop then phone, default then changed. */
function sheetHtml(mountIds: readonly string[]): string {
  const viewports = INTERACTIVE_CAPTURE_VIEWPORTS.toReversed();
  const head = viewports
    .flatMap(({ id }) => INTERACTIVE_CAPTURE_STATES.map((state) => `<div class="h">${id} ${state}</div>`))
    .join('');
  const rows = mountIds
    .map((mountId) => {
      const observationFor = (viewport: string) =>
        observations.find((row) => row.mountId === mountId && row.viewport === viewport)!;
      const changed = observationFor('1440x900').captures[1];
      const tiles = viewports
        .flatMap(({ id }) =>
          INTERACTIVE_CAPTURE_STATES.map((state) => {
            const png = pixels.get(captureKey(mountId, id, state))!;
            return `<img width="${SHEET_TILE_WIDTH_PX[id]}" src="data:image/png;base64,${png.toString('base64')}">`;
          }),
        )
        .join('');
      return `<div class="m">${mountId.replace(/^mount:/, '')}<br>changed: ${changed.control?.replace(/[<>&]/g, '') ?? ''}</div>${tiles}`;
    })
    .join('');
  return `<!doctype html><html><head><style>
body{margin:0;background:#FAFAF8;color:#1C1C1A;font:11px/1.4 monospace}
.g{display:grid;grid-template-columns:180px repeat(4,max-content);gap:12px 14px;padding:14px;align-items:start}
.h{font-weight:bold}.m{word-break:break-all}img{display:block;outline:1px solid rgba(28,28,26,0.22)}
</style></head><body><div class="g"><div class="h">mount</div>${head}${rows}</div></body></html>`;
}

async function renderSheet(page: Page, html: string): Promise<Buffer> {
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => Promise.all([...document.images].map((image) => image.decode())));
  return page.screenshot({ type: 'jpeg', quality: SHEET_JPEG_QUALITY, fullPage: true, animations: 'disabled' });
}

/** The artifact the sweep assembles, under a given fingerprint. */
const assemble = (fingerprint: string): InteractiveCapturesEvidence => ({
  version: INTERACTIVE_CAPTURES_VERSION,
  fingerprint,
  viewports: INTERACTIVE_CAPTURE_VIEWPORTS.map(({ id }) => id),
  reducedMotion: 'reduce',
  mountIds: PLAN.mounts.map(({ mountId }) => mountId),
  sources: PLAN.sources.map(({ sourceId, mountIds, notApplicableReason }) => ({ sourceId, mountIds, notApplicableReason })),
  observations: [...observations].sort(
    (a, b) =>
      PLAN.mounts.findIndex(({ mountId }) => mountId === a.mountId) -
        PLAN.mounts.findIndex(({ mountId }) => mountId === b.mountId) ||
      INTERACTIVE_CAPTURE_VIEWPORTS.findIndex(({ id }) => id === a.viewport) -
        INTERACTIVE_CAPTURE_VIEWPORTS.findIndex(({ id }) => id === b.viewport),
  ),
  sheets,
});

test.describe('brand-v2 interactive captures and contact sheets', () => {
  test.describe.configure({ mode: 'serial' });

  test('every mount is captured default and changed at the phone and desktop frames', async ({
    browser,
    staticBase,
  }) => {
    test.setTimeout(3_600_000);
    expect(PLAN.mounts.length, 'interactive mount population').toBeGreaterThan(0);
    expect(PLAN.mounts.length).toBe(brandV2Registry.interactive.mounts.length);
    const queue = PLAN.mounts.flatMap((mount) =>
      INTERACTIVE_CAPTURE_VIEWPORTS.map((viewport) => ({ mount, viewport })),
    );
    const total = queue.length;
    const sweep = async () => {
      for (let job = queue.shift(); job; job = queue.shift()) {
        const { mount, viewport } = job;
        const observation = await inOwnContext(
          browser,
          (page) => measure(page, staticBase, mount, viewport),
          {
            ...devices['Desktop Chrome'],
            viewport: { width: viewport.width, height: viewport.height },
            reducedMotion: 'reduce',
          },
        );
        expect(observation.status, `${mount.mountId} at ${viewport.id}`).toBe(200);
        observations.push(observation);
        if (observations.length % 20 === 0) {
          console.log(`interactive captures: ${observations.length}/${total} readings`);
        }
      }
    };
    await Promise.all(Array.from({ length: SWEEP_CONTEXTS }, sweep));
    expect(observations).toHaveLength(total);
  });

  test('the captures tile into deterministic contact sheets', async ({ browser }) => {
    test.setTimeout(600_000);
    const directory = join(ROOT, INTERACTIVE_CAPTURE_SHEET_DIR);
    mkdirSync(directory, { recursive: true });
    const planned = plannedSheets(PLAN);
    const plannedPaths = new Set(planned.map(({ path }) => path));
    for (const file of readdirSync(directory)) {
      const path = `${INTERACTIVE_CAPTURE_SHEET_DIR}/${file}`;
      // Only sheets this sweep wrote earlier are removed.
      if (/^sheet-\d+\.jpg$/.test(file) && !plannedPaths.has(path)) rmSync(join(ROOT, path));
    }
    await inOwnContext(
      browser,
      async (page) => {
        for (const sheet of planned) {
          const html = sheetHtml(sheet.mountIds);
          const first = await renderSheet(page, html);
          const second = await renderSheet(page, html);
          writeFileSync(join(ROOT, sheet.path), first);
          sheets.push({
            path: sheet.path,
            sha256: sha256(first),
            bytes: first.length,
            mountIds: sheet.mountIds,
            captures: sheetCaptureKeys(sheet.mountIds).map((key) => ({ key, sha256: sha256(pixels.get(key)!) })),
            renderedTwiceIdentical: first.equals(second),
          });
        }
      },
      { viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 },
    );
    expect(sheets).toHaveLength(planned.length);
    for (const sheet of sheets) expect(existsSync(join(ROOT, sheet.path)), sheet.path).toBe(true);
  });

  test('the measured evidence grants every mount its captures, cases and rubric', async () => {
    const artifact = assemble(interactiveCapturesEvidenceFingerprint({ root: ROOT, plan: PLAN }));
    const measured = readInteractiveCapturesEvidence({
      artifact,
      fingerprint: artifact.fingerprint,
      plan: PLAN,
      root: ROOT,
    });
    const verdicts = interactiveCaptureVerdicts(measured, PLAN);
    expect([...verdicts.keys()]).toEqual(PLAN.mounts.map(({ mountId }) => mountId));
    const failures = [...verdicts.values()].flatMap(({ id, failures: list }) => list.map((failure) => `${id}: ${failure}`));
    const artifactPath = join(ROOT, INTERACTIVE_CAPTURES_EVIDENCE_PATH);
    mkdirSync(dirname(artifactPath), { recursive: true });
    writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
    expect(failures).toEqual([]);
  });

  /**
   * The plant proof, on the corpus just measured: a defect planted on one
   * mount fails that mount alone, under the rubric row that owns it, and
   * evidence that drops, adds or reorders anything is refused before any
   * verdict. A mount whose captures are taken away is refused too, so
   * computed styles on its root can never stand in for pixels.
   */
  test('the capture verdicts fail independently when their subjects are broken', async () => {
    const measured = readInteractiveCapturesEvidence({ artifact: assemble('planted'), fingerprint: 'planted', plan: PLAN });
    const plant = (change: (planted: InteractiveCapturesEvidence) => void) => {
      const copy = structuredClone(measured);
      change(copy);
      return copy;
    };
    const failing = (evidence: InteractiveCapturesEvidence) =>
      [...interactiveCaptureVerdicts(evidence, PLAN).entries()]
        .filter(([, { failures }]) => failures.length > 0)
        .map(([id]) => id);
    // The last planned mount: one a hand-picked sample would skip.
    const target = PLAN.mounts[PLAN.mounts.length - 1];
    const at = (evidence: InteractiveCapturesEvidence, viewport: string) =>
      evidence.observations.find((row) => row.mountId === target.mountId && row.viewport === viewport)!;
    expect(failing(measured)).toEqual([]);

    for (const row of CAPTURE_RUBRIC) {
      for (const predicate of row.predicates) {
        const planted = plant((e) =>
          at(e, '375x812').findings.push({
            state: 'changed',
            predicate,
            element: 'div[data-planted]',
            detail: 'planted',
            exemption: null,
          }),
        );
        const verdict = interactiveCaptureVerdicts(planted, PLAN).get(target.mountId)!;
        expect(failing(planted), predicate).toEqual([target.mountId]);
        expect(verdict.observed.rubric[row.id], `${predicate} fails ${row.id}`).toBe('fail');
      }
    }

    const cases: Array<[string, (e: InteractiveCapturesEvidence) => void]> = [
      ['an unsettled capture', (e) => (at(e, '1440x900').captures[0].settled = false)],
      ['a blank capture', (e) => (at(e, '375x812').captures[1].luminanceSpread = 0)],
      ['a capture before fonts', (e) => (at(e, '1440x900').captures[1].fontsLoaded = false)],
      ['a clipped capture', (e) => (at(e, '375x812').captures[0].rootRightPx = 420)],
      ['a sideways scroll', (e) => (at(e, '375x812').captures[1].documentOverflowPx = 12)],
      [
        'a changed state that paints the default',
        (e) => (at(e, '1440x900').captures[1].sha256 = at(e, '1440x900').captures[0].sha256),
      ],
      ['a missing case', (e) => (at(e, '375x812').cases[0].status = 'missing')],
      ['a dropped case', (e) => at(e, '1440x900').cases.pop()],
      ['a retired family', (e) => at(e, '1440x900').retiredFamilies.push('Tektur')],
      ['an unsealed family', (e) => at(e, '375x812').families.push('Arial')],
      ['an alternate identity', (e) => at(e, '375x812').alternateIdentity.push('robot-wiki')],
      [
        'a phone capture with more devices',
        (e) => (at(e, '375x812').deviceCount = at(e, '1440x900').deviceCount + 1),
      ],
      ['a route that did not answer', (e) => (at(e, '1440x900').status = 404)],
    ];
    if (!target.plainTable) {
      cases.push([
        'a four-line headline',
        (e) => (at(e, '1440x900').headline = { text: 'planted', lines: 4 }),
      ]);
    }
    for (const [label, change] of cases) {
      expect(failing(plant(change)), label).toEqual([target.mountId]);
    }
    const resettable = PLAN.mounts.findLast(({ hasReset }) => hasReset)!;
    const resetPlant = plant((e) => {
      const row = e.observations.find((o) => o.mountId === resettable.mountId && o.viewport === '375x812')!;
      row.reset = { ...row.reset!, restoredDefault: false, restoredRestart: false };
    });
    expect(failing(resetPlant), 'a reset that restores no deterministic state').toEqual([resettable.mountId]);
    const resetGone = plant((e) => {
      const row = e.observations.find((o) => o.mountId === resettable.mountId && o.viewport === '1440x900')!;
      row.reset = { ...row.reset!, present: 0 };
    });
    expect(failing(resetGone), 'a registered reset the root does not render').toEqual([resettable.mountId]);

    const refused = (label: string, change: (e: InteractiveCapturesEvidence) => void, pattern: RegExp) =>
      expect(
        () => readInteractiveCapturesEvidence({ artifact: plant(change), fingerprint: 'planted', plan: PLAN }),
        label,
      ).toThrow(pattern);
    refused(
      'a dropped mount',
      (e) => {
        e.mountIds = e.mountIds.filter((id) => id !== target.mountId);
        e.observations = e.observations.filter(({ mountId }) => mountId !== target.mountId);
      },
      /dropped: mount:/,
    );
    refused('an extra mount', (e) => e.mountIds.push('mount:/planted/:Planted:1'), /unregistered: mount:\/planted/);
    refused('reordered mounts', (e) => e.mountIds.reverse(), /out of plan order/);
    refused(
      'a missing viewport reading',
      (e) => e.observations.splice(e.observations.indexOf(at(e, '375x812')), 1),
      /readings dropped/,
    );
    refused(
      'a reading with its captures taken away, leaving root computed styles',
      (e) => (at(e, '1440x900').captures = []),
      /captures/,
    );
    refused('a source without its typed reason', (e) => {
      const unmounted = e.sources.find(({ notApplicableReason }) => notApplicableReason !== null);
      if (unmounted) unmounted.notApplicableReason = null;
      else e.sources[0].notApplicableReason = 'planted';
    }, /typed reason/);
    refused(
      'an unowned predicate',
      (e) => at(e, '375x812').findings.push({ state: 'default', predicate: 'planted', element: 'div', detail: '', exemption: null }),
      /no rubric row/,
    );
    refused(
      'an invented exemption',
      (e) =>
        at(e, '375x812').findings.push({ state: 'default', predicate: 'shadow', element: 'div', detail: '', exemption: 'planted' }),
      /does not hold/,
    );
    refused('a sheet tile with other bytes', (e) => (e.sheets.at(-1)!.captures[0].sha256 = '0'.repeat(64)), /bytes the reading did not record/);
    refused('a sheet that drops a tile', (e) => e.sheets[0].captures.pop(), /exactly once/);
    refused('a nondeterministic sheet', (e) => (e.sheets[0].renderedTwiceIdentical = false), /not a deterministic/);
    refused('a dropped sheet', (e) => e.sheets.pop(), /contact sheets dropped/);
    expect(() =>
      readInteractiveCapturesEvidence({ artifact: assemble('planted'), fingerprint: 'current', plan: PLAN }),
    ).toThrow(/stale/);
  });
});
