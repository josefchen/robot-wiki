import AxeBuilder from '@axe-core/playwright';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { devices, type Page } from '@playwright/test';
import { test, expect, brandV2Registry } from './brand-v2-static-fixture';
import { forEachInOwnContext } from './helpers/per-route-context';
import {
  CROSS_CONTEXT_CLAUSES,
  FEATURED_INSTRUMENT_ANCHORS,
  HOME_TOOLS_EVIDENCE_PATH,
  HOME_TOOLS_ROUTE,
  HOME_TOOLS_VIEWPORT,
  SCENE_KEY_SCRIPT,
  accessibilityProfileVerdicts,
  crossMountVerdicts,
  featuredInstrumentVerdicts,
  homeDesignBoundVerdicts,
  homeToolsEvidenceFingerprint,
  progressCounterVerdicts,
  readHomeToolsEvidence,
  responsiveOverflowVerdicts,
  sceneCanonicalRoute,
  toolsLineVerdicts,
  type AccessibilityProfileObservation,
  type HomeToolsEvidence,
  type ProgressCounterObservation,
  type RouteWidthObservation,
  type SceneObservation,
  type SurfaceCountExpectation,
} from '../../lib/brand-v2-home-tools-evidence';
import { BRAND_V2_RESPONSIVE_VIEWPORTS } from '../../lib/brand-v2-responsive-viewports';
import { homeCounts } from '../../lib/home-counts';
import { progressCounterSurfaces } from '../../lib/home-populations';

const ROOT = process.cwd();

/**
 * Home's featured scene, its tools line, and its responsive convergence,
 * measured where they run.
 *
 * Everything this suite decides is a property of the rendered document under
 * a stated viewport and a stated interaction: that the featured explainer
 * waits for its start control and then runs, that stepping it moves its
 * readout, that home and the explainer's own page print the same stills,
 * that the tools are plain links, that no width overflows, and that no
 * surface prints an authoring counter. Each is measured once, persisted, and then decided
 * by the fail-closed readers in `lib/brand-v2-home-tools-evidence.ts`, so the
 * enforcement generator states results it did not invent.
 */

/** Authoring-progress copy `VAL-DESIGN-015` forbids on these surfaces. */
const PROGRESS_COUNTER_PATTERNS = [
  /\d+\s*(?:of|\/)\s*\d+\s+(?:articles?|modules?|entries|terms?|pages?)/gi,
  /\b\d+\s+(?:planned|remaining|pending|upcoming|to come|in progress)\b/gi,
  /\b(?:planned|remaining|pending|upcoming)\s*:?\s*\d+/gi,
];

/**
 * The counted nouns the index surfaces print, with the one qualifier the
 * A-Z index and home put between the number and its noun ("119 glossary
 * terms"). Sources are counted too, because home prints its distinct-source
 * total and an unchecked total is what this sweep exists to catch.
 */
const COUNT_PHRASE = /(\d[\d,]*)\s+(?:glossary\s+)?(articles?|modules?|entries|terms?|sources?|companies|company|segments?)\b/gi;

/** How long the sweep watches for animation frames before and after the start control. */
const FRAME_WINDOW_MS = 800;

/** Runs before any page script: counts every animation frame requested. */
function installFrameCounter() {
  const counted = window as unknown as { __frameRequests: number };
  counted.__frameRequests = 0;
  const request = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (callback: FrameRequestCallback) => {
    counted.__frameRequests += 1;
    return request(callback);
  };
}

async function frameRequests(page: Page): Promise<number> {
  return page.evaluate(
    () => (window as unknown as { __frameRequests: number }).__frameRequests,
  );
}

/**
 * The viewer and scene module a document drives its explainer stage with,
 * read from the document itself: a component it imports and mounts that
 * loads the explainer viewer, while the explainer catalog loads this scene's
 * module. Null when the document mounts no such component, so a look-alike
 * copy on home has nothing to name.
 */
function sceneImport(documentPath: string, sceneId: string): string | null {
  if (!existsSync(join(ROOT, documentPath))) return null;
  const catalog = readFileSync(join(ROOT, 'components/explainers/catalog.ts'), 'utf8');
  if (!catalog.includes(`import('./scenes/${sceneId}.js')`)) return null;
  const text = readFileSync(join(ROOT, documentPath), 'utf8');
  for (const [, names, specifier] of text.matchAll(
    /import\s+\{([^}]*)\}\s+from\s+'@\/(components\/[^']+)'/g,
  )) {
    const path = `${specifier}.tsx`;
    if (!existsSync(join(ROOT, path))) continue;
    const component = readFileSync(join(ROOT, path), 'utf8');
    const viewer =
      /import\(\s*'@\/components\/explainers\/viewer'\s*\)/.test(component) ||
      (path.startsWith('components/explainers/') && /import\(\s*'\.\/viewer'\s*\)/.test(component));
    const mounted = names
      .split(',')
      .map((name) => name.trim())
      .some((name) => name.length > 0 && new RegExp(`<${name}\\b`).test(text));
    if (viewer && mounted) {
      return `components/explainers/viewer.ts > components/explainers/scenes/${sceneId}.js`;
    }
  }
  return null;
}

/** The app document behind a route: home's page, or the route's own page. */
function sceneDocument(route: string): string {
  const path = route.replace(/#.*$/, '');
  return path === HOME_TOOLS_ROUTE ? 'app/page.tsx' : `app${path.replace(/\/$/, '')}/page.tsx`;
}

const normalise = (text: string) => text.replace(/\s+/g, ' ').trim();
/** The readout and step text the explainer prints right now. */
async function sceneStill(page: Page) {
  const root = page.locator('main [data-explainers]').first();
  return {
    readout: normalise(await root.locator('[data-readout]').innerText()),
    caption: normalise(await root.locator('[data-step-text]').innerText()),
  };
}

/** Enough for one keypress to settle into the step's readout and text. */
const SETTLE_MS = 300;

type ExplainerHook = { id: string; live: boolean; busy: boolean };

/**
 * Reads one explainer the way a keyboard reader meets it: the poster at
 * first paint, an untouched window with the stage in view, the start control
 * by Enter where the page has one, the key script, and reset by Enter twice.
 * Home and the explainer's own page go through this one function, so the two
 * observations differ only in where they were taken.
 */
async function observeScene(
  page: Page,
  url: string,
  route: string,
  documentPath: string,
): Promise<SceneObservation & { heading: string }> {
  await page.addInitScript(installFrameCounter);
  // three.js's renderer is the one module that carries this message.
  const kitChunks: string[] = [];
  page.on('response', (response) => {
    if (!/\/_next\/static\/chunks\/.+\.js/.test(response.url())) return;
    void response
      .text()
      .then((body) => {
        if (body.includes('THREE.WebGLRenderer')) kitChunks.push(response.url());
      })
      .catch(() => undefined);
  });
  await page.setViewportSize({
    width: HOME_TOOLS_VIEWPORT.width,
    height: HOME_TOOLS_VIEWPORT.height,
  });
  const response = await page.goto(url);
  expect(response?.status(), route).toBe(200);
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(2, 2);

  const sceneCount = await page.locator('main [data-explainers], main [data-motion-scene]').count();
  const root = page.locator('main [data-explainers]').first();
  const stage = root.locator('[data-x="stage"]');
  await expect(stage, `${route} shows an explainer stage`).toBeVisible();

  const firstPaint = await root.evaluate((element) => {
    const text = (node: Element | null) => (node?.textContent ?? '').replace(/\s+/g, ' ').trim();
    const frame = element.closest('[data-explainer-scene]');
    const described = (frame?.getAttribute('aria-describedby') ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .map((ref) => document.getElementById(ref)?.textContent ?? '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    const stageElement = element.querySelector('[data-x="stage"]')!;
    const box = stageElement.getBoundingClientRect();
    const poster = element.querySelector<HTMLImageElement>('[data-x="poster"]');
    const posterBox = poster?.getBoundingClientRect();
    const painted =
      !!poster &&
      stageElement.getAttribute('data-mode') === 'poster' &&
      poster.complete &&
      poster.naturalWidth > 0 &&
      !!posterBox &&
      posterBox.width > 0 &&
      posterBox.height > 0 &&
      poster.checkVisibility();
    const controls = [...element.querySelectorAll('button, input, select, [tabindex="0"]')]
      .filter(
        (control) =>
          !(control as HTMLButtonElement).disabled && (control as HTMLElement).checkVisibility(),
      )
      .map((control) => control.getAttribute('aria-label') ?? text(control));
    const hook = (window as unknown as { __explainer?: { id: string } }).__explainer;
    const current = document.querySelector('[data-rail-id][data-current] span:last-child');
    return {
      sceneId: frame?.getAttribute('data-explainer-scene') ?? hook?.id ?? '',
      frameRole: frame?.getAttribute('role') ?? null,
      frameAriaLabel: frame?.getAttribute('aria-label') ?? null,
      describedByText: described.length > 0 ? described : null,
      graphicTopPx: Math.round(box.top + window.scrollY),
      posterSrc: poster?.getAttribute('src') ?? null,
      posterMarkCount: painted ? 1 : 0,
      canvas: stageElement.querySelector('canvas') !== null,
      posterControls: controls,
      posterCaption: text(element.querySelector('[data-step-text]')),
      heading: frame
        ? (frame.getAttribute('aria-label') ?? '').replace(/^3D explainer:\s*/, '')
        : text(current),
    };
  });

  // Nobody has touched the page and the stage is in view: whatever it
  // animates or loads now, it does on its own.
  await stage.scrollIntoViewIfNeeded();
  await page.waitForTimeout(SETTLE_MS);
  const idleStart = await frameRequests(page);
  await page.waitForTimeout(FRAME_WINDOW_MS);
  const idleFrameRequests = (await frameRequests(page)) - idleStart;
  const playerMountedAtFirstPaint =
    firstPaint.canvas || kitChunks.length > 0 || (await stage.locator('canvas').count()) > 0;

  // The start control, where the page waits for one; the explainer's own
  // page starts the scene itself once the stage is near.
  const start = root.locator('[data-x="start"]');
  const startControl = (await start.isVisible()) ? normalise(await start.innerText()) : null;
  let focus: { width: number; style: string; colour: string } | null = null;
  if (startControl !== null) {
    await start.focus();
    // The control eases its colours, the outline's among them, so read the
    // ring once those transitions end.
    const ring = await start.evaluate(async (element) => {
      await Promise.all(
        element
          .getAnimations()
          .filter((animation) => 'transitionProperty' in animation)
          .map((animation) => animation.finished.catch(() => undefined)),
      );
      const style = getComputedStyle(element);
      return {
        focused: document.activeElement === element,
        width: parseFloat(style.outlineWidth),
        style: style.outlineStyle,
        colour: style.outlineColor,
      };
    });
    expect(ring.focused, `${route} start control takes keyboard focus`).toBe(true);
    focus = ring;
  }
  const playStart = await frameRequests(page);
  if (startControl !== null) await page.keyboard.press('Enter');
  await page.waitForFunction(
    () => (window as unknown as { __explainer?: ExplainerHook }).__explainer?.live === true,
    undefined,
    { timeout: 90_000 },
  );
  await page.waitForTimeout(FRAME_WINDOW_MS);
  const playingFrameRequests = (await frameRequests(page)) - playStart;
  await page.waitForFunction(
    () => (window as unknown as { __explainer?: ExplainerHook }).__explainer?.busy === false,
    undefined,
    { timeout: 30_000 },
  );
  const live = await stage.evaluate((element) => {
    const canvas = element.querySelector('canvas');
    const box = canvas?.getBoundingClientRect();
    return {
      tag: canvas && element.getAttribute('data-mode') === 'live' ? canvas.tagName.toLowerCase() : null,
      heightPx: box ? Math.round(box.height) : 0,
    };
  });
  const opening = await sceneStill(page);

  const steps: SceneObservation['steps'] = [];
  for (const key of SCENE_KEY_SCRIPT) {
    await root.getByRole('button', { name: key, exact: true }).focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(SETTLE_MS);
    steps.push({ key, ...(await sceneStill(page)) });
  }

  // Reset is the first step's control in the step rail.
  const reset = root.getByRole('button', { name: 'Step 1', exact: true });
  const resetControlNames = await reset.evaluateAll((controls) =>
    controls.map((control) => control.getAttribute('aria-label') ?? ''),
  );
  await reset.first().focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(SETTLE_MS);
  const afterReset = await sceneStill(page);
  await root.getByRole('button', { name: 'Next', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(SETTLE_MS);
  await reset.first().focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(SETTLE_MS);
  const afterSecondReset = await sceneStill(page);

  return {
    sceneId: firstPaint.sceneId,
    frameRole: firstPaint.frameRole,
    frameAriaLabel: firstPaint.frameAriaLabel,
    describedByText: firstPaint.describedByText,
    graphicTopPx: firstPaint.graphicTopPx,
    posterSrc: firstPaint.posterSrc,
    posterMarkCount: firstPaint.posterMarkCount,
    posterControls: firstPaint.posterControls,
    posterCaption: firstPaint.posterCaption,
    heading: firstPaint.heading,
    route,
    sceneCount,
    graphicTag: live.tag,
    graphicHeightPx: live.heightPx,
    playerMountedAtFirstPaint,
    idleFrameRequests,
    playingFrameRequests,
    startControl,
    focusOutlineWidthPx: focus && Number.isFinite(focus.width) ? focus.width : null,
    focusOutlineStyle: focus?.style || null,
    focusOutlineColour: focus?.colour || null,
    openingReadout: opening.readout,
    openingCaption: opening.caption,
    steps,
    resetControlNames,
    resetReadout: afterReset.readout,
    resetCaption: afterReset.caption,
    secondResetReadout: afterSecondReset.readout,
    componentModule: sceneImport(documentPath, firstPaint.sceneId),
  };
}
/** Runs in the page: the elements that overflow with nothing clipping them. */
function collectOverflow() {
  const doc = document.documentElement;
  const clipping = new Set(['hidden', 'clip', 'auto', 'scroll']);
  const unclipped: Array<{ tag: string; id: string; rightPx: number }> = [];
  for (const element of document.querySelectorAll('body *')) {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    if (Math.round(rect.right) <= doc.clientWidth + 1) continue;
    let clipped = false;
    let ancestor: Element | null = element.parentElement;
    while (ancestor && ancestor !== document.body) {
      const style = getComputedStyle(ancestor);
      if (
        clipping.has(style.overflowX) ||
        style.position === 'fixed' ||
        style.contain.includes('paint')
      ) {
        clipped = true;
        break;
      }
      ancestor = ancestor.parentElement;
    }
    const own = getComputedStyle(element);
    if (own.position === 'fixed' || own.visibility === 'hidden') clipped = true;
    if (!clipped) {
      unclipped.push({
        tag: element.tagName.toLowerCase(),
        id: element.id || (element.className?.toString?.() ?? '').slice(0, 60),
        rightPx: Math.round(rect.right),
      });
    }
  }
  return {
    documentScrollWidthPx: doc.scrollWidth,
    documentClientWidthPx: doc.clientWidth,
    unclippedOverflow: unclipped.slice(0, 8),
  };
}

/** Runs in the page: every element whose own text is non-empty. */
function collectTextMembers() {
  const members: Array<{ index: number; fontSizePx: number }> = [];
  let index = 0;
  for (const element of document.querySelectorAll('body *')) {
    if (element.tagName === 'SCRIPT' || element.tagName === 'STYLE') continue;
    const own = [...element.childNodes]
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent ?? '')
      .join('')
      .trim();
    if (own.length === 0) continue;
    // Visually hidden text is announced, never painted, so a sighted
    // reader cannot find it clipped at any text size.
    if (element.closest('.sr-only')) continue;
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    element.setAttribute('data-text-scale-id', String(index));
    members.push({
      index,
      fontSizePx: parseFloat(getComputedStyle(element).fontSize),
    });
    index += 1;
  }
  return members;
}

/** Runs in the page: whether each doubled member still reads and fits. */
function checkDoubledText(members: Array<{ index: number; fontSizePx: number }>) {
  const failures: string[] = [];
  for (const member of members) {
    const element = document.querySelector(
      `[data-text-scale-id="${member.index}"]`,
    );
    if (!element) {
      failures.push(`text member ${member.index} disappeared under 200% text`);
      continue;
    }
    const style = getComputedStyle(element);
    const size = parseFloat(style.fontSize);
    if (Math.abs(size - member.fontSizePx * 2) > 0.5) {
      failures.push(
        `text member ${member.index} computed ${size}px, not ${member.fontSizePx * 2}px`,
      );
      continue;
    }
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0 || style.display === 'none') {
      failures.push(`text member ${member.index} became invisible under 200% text`);
      continue;
    }
    // Clipped: the element's own content is cut off by a box that neither
    // scrolls nor was registered as an internal-scroll region.
    let ancestor: Element | null = element as Element;
    while (ancestor && ancestor !== document.body) {
      const ancestorStyle = getComputedStyle(ancestor);
      const clips =
        ancestorStyle.overflowY === 'hidden' ||
        ancestorStyle.overflowY === 'clip';
      if (clips && ancestor.scrollHeight > ancestor.clientHeight + 1) {
        failures.push(
          `text member ${member.index} is clipped vertically by <${ancestor.tagName.toLowerCase()}>`,
        );
        break;
      }
      ancestor = ancestor.parentElement;
    }
  }
  return failures.slice(0, 12);
}

test.describe('brand-v2 home live tools and responsive convergence', () => {
  test.describe.configure({ mode: 'serial' });

  const evidence: Partial<HomeToolsEvidence> = {};

  test('the featured scene waits for its start control, steps, resets, and matches its own page', async ({
    browser,
    staticBase,
  }) => {
    test.setTimeout(240_000);
    const homeContext = await browser.newContext();
    const { heading, ...home } = await observeScene(
      await homeContext.newPage(),
      `${staticBase}${HOME_TOOLS_ROUTE}`,
      HOME_TOOLS_ROUTE,
      'app/page.tsx',
    );
    await homeContext.close();
    evidence.featured = { ...home, claimText: `${heading}. ${home.describedByText ?? ''}` };

    // The page is the one the explainer catalog serves the scene on, never
    // a route this suite names, so featuring another explainer moves the pair.
    const canonical = sceneCanonicalRoute(home.sceneId);
    expect(canonical, `${home.sceneId} is a catalogued explainer`).not.toBeNull();
    const articleContext = await browser.newContext();
    const { heading: articleHeading, ...article } = await observeScene(
      await articleContext.newPage(),
      `${staticBase}${canonical}`,
      canonical!,
      sceneDocument(canonical!),
    );
    await articleContext.close();
    expect(article.sceneId).toBe(home.sceneId);
    expect(articleHeading).toBe(heading);
    evidence.moduleScene = article;
  });

  test('the tools line is one line of plain links', async ({ page, staticBase }) => {
    await page.setViewportSize({
      width: HOME_TOOLS_VIEWPORT.width,
      height: HOME_TOOLS_VIEWPORT.height,
    });
    await page.goto(`${staticBase}${HOME_TOOLS_ROUTE}`);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    const row = page.locator('main section[aria-label="Tools"]');
    await expect(row).toHaveCount(1);
    evidence.toolsLine = await row.evaluate((section) => {
      const links = [...section.querySelectorAll('a[href]')].map((link) => ({
        text: (link.textContent ?? '').replace(/\s+/g, ' ').trim(),
        path: new URL((link as HTMLAnchorElement).href).pathname,
        topPx: Math.round(link.getBoundingClientRect().top + window.scrollY),
      }));
      const graphics = [
        ...section.querySelectorAll('img, svg, canvas, picture, video, iframe'),
      ].map((element) => element.tagName.toLowerCase());
      for (const element of [section, ...section.querySelectorAll('*')]) {
        const image = getComputedStyle(element).backgroundImage;
        if (image && image !== 'none') graphics.push(`background-image on ${element.tagName.toLowerCase()}`);
      }
      const boxed = [...section.querySelectorAll('*')].filter((element) => {
        const style = getComputedStyle(element);
        return (['top', 'right', 'bottom', 'left'] as const).every(
          (side) => parseFloat(style.getPropertyValue(`border-${side}-width`)) >= 1,
        );
      }).length;
      const text = (section.textContent ?? '').replace(/\s+/g, ' ').trim();
      return {
        links,
        graphics,
        renderedNumbers: [...text.matchAll(/\d+(?:\.\d+)?/g)].map(([value]) => Number(value)),
        boxedDescendants: boxed,
        text,
      };
    });
    await row.screenshot({ path: test.info().outputPath('tools-line.png') });
  });

  test('home holds its design bounds and reports no axe violation or console error', async ({
    page,
    staticBase,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(String(error)));

    await page.setViewportSize({
      width: HOME_TOOLS_VIEWPORT.width,
      height: HOME_TOOLS_VIEWPORT.height,
    });
    await page.goto(`${staticBase}${HOME_TOOLS_ROUTE}`);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    await page.mouse.move(2, 2);

    const bounds = await page.evaluate(() => {
      const main = document.querySelector('main');
      if (!main) throw new Error('home rendered no main landmark');
      const ownText = (element: Element) =>
        [...element.childNodes]
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent ?? '')
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
      const microLabels = [...main.querySelectorAll('*')]
        .map((element) => {
          const own = ownText(element);
          if (own.length === 0) return null;
          const style = getComputedStyle(element);
          const rendered =
            style.textTransform === 'uppercase' ? own.toUpperCase() : own;
          if (!/[A-Z]/.test(rendered)) return null;
          if (rendered !== rendered.toUpperCase()) return null;
          if (rendered.replace(/[^A-Za-z]/g, '').length < 2) return null;
          return {
            text: rendered,
            fontSizePx: parseFloat(style.fontSize),
            family: style.fontFamily.split(',')[0].replace(/["']/g, '').trim(),
            tag: element.tagName.toLowerCase(),
            role: element.getAttribute('data-tektur-role'),
          };
        })
        .filter((label): label is NonNullable<typeof label> => label !== null);
      const fourSided = (element: Element) => {
        const style = getComputedStyle(element);
        return (['top', 'right', 'bottom', 'left'] as const).every((side) => {
          const width = parseFloat(
            style.getPropertyValue(`border-${side}-width`),
          );
          const colour = style.getPropertyValue(`border-${side}-color`);
          return (
            width >= 1 && colour !== 'transparent' && colour !== 'rgba(0, 0, 0, 0)'
          );
        });
      };
      const borderedBoxCount = [...main.querySelectorAll('*')].filter(
        (element) =>
          fourSided(element) && element.getBoundingClientRect().height >= 80,
      ).length;
      // Every disclosure summary in main, not the first one: a chart mounted
      // on home later is measured here instead of hiding behind another.
      const chartDisclosureSummaries = [
        ...main.querySelectorAll('details > summary'),
      ].map((summary) => {
        const style = getComputedStyle(summary);
        return {
          text: (summary.textContent ?? '').replace(/\s+/g, ' ').trim(),
          textTransform: style.textTransform,
          letterSpacing: style.letterSpacing,
          fontSizePx: parseFloat(style.fontSize),
          borderTopWidthPx: parseFloat(style.borderTopWidth),
          borderBottomWidthPx: parseFloat(style.borderBottomWidth),
        };
      });
      return { microLabels, borderedBoxCount, chartDisclosureSummaries };
    });

    const axe = await new AxeBuilder({ page }).analyze();
    evidence.designBounds = {
      ...bounds,
      axeViolationIds: axe.violations.map(({ id }) => id),
      consoleErrors,
    };
  });

  test('home passes its accessibility and reflow profiles', async ({
    browser,
    staticBase,
  }) => {
    test.setTimeout(180_000);
    const profiles: AccessibilityProfileObservation[] = [];

    async function withPage(
      options: Parameters<typeof browser.newContext>[0],
      run: (page: Page) => Promise<AccessibilityProfileObservation>,
    ) {
      const context = await browser.newContext(options);
      const page = await context.newPage();
      const consoleErrors: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });
      page.on('pageerror', (error) => consoleErrors.push(String(error)));
      await page.goto(`${staticBase}${HOME_TOOLS_ROUTE}`);
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => document.fonts.ready);
      const observation = await run(page);
      observation.consoleErrors = [
        ...observation.consoleErrors,
        ...consoleErrors,
      ];
      await context.close();
      profiles.push(observation);
    }

    // Keyboard: every control home mounts is reachable and shows focus.
    await withPage(
      { viewport: { width: 1440, height: 900 } },
      async (page) => {
        // Controls sealed inside a closed disclosure, a disabled Back on the
        // first step and the explainer's parts that wait, hidden, for a
        // later step (its summary, guess and part card) are deliberately out
        // of the tab order. The poster's start control and the step rail are
        // the reachable entry points; starting the scene makes the stage
        // itself operable.
        const reachable =
          ':not(details:not([open]) *):not([hidden] *):not(:disabled)';
        const controls = page.locator(
          [
            'a[href]',
            'button',
            'input',
            'summary',
            '[tabindex="0"]',
          ]
            .map((selector) => `main ${selector}${reachable}`)
            .join(', '),
        );
        const total = await controls.count();
        const failures: string[] = [];
        for (let index = 0; index < total; index += 1) {
          const control = controls.nth(index);
          await control.focus();
          const state = await control.evaluate((element) => {
            const style = getComputedStyle(element);
            return {
              name:
                element.getAttribute('aria-label') ??
                (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40),
              tag: element.tagName.toLowerCase(),
              focused: document.activeElement === element,
              outlineWidth: parseFloat(style.outlineWidth),
              outlineStyle: style.outlineStyle,
              boxShadow: style.boxShadow,
            };
          });
          if (!state.focused) {
            failures.push(
              `<${state.tag}> "${state.name}" refused keyboard focus`,
            );
          } else if (
            state.outlineWidth <= 0 &&
            state.outlineStyle === 'none' &&
            state.boxShadow === 'none'
          ) {
            failures.push(
              `<${state.tag}> "${state.name}" paints no focus indicator`,
            );
          }
        }
        const overflow = await page.evaluate(collectOverflow);
        return {
          id: 'profile:home-keyboard',
          route: HOME_TOOLS_ROUTE,
          description:
            'every control inside main takes focus and paints a focus indicator at 1440x900',
          violationIds: [],
          consoleErrors: [],
          documentScrollWidthPx: overflow.documentScrollWidthPx,
          documentClientWidthPx: overflow.documentClientWidthPx,
          failures,
          measuredMembers: total,
        };
      },
    );

    // Forced colours: content survives when the user's palette replaces ours.
    await withPage(
      { viewport: { width: 1440, height: 900 }, forcedColors: 'active' },
      async (page) => {
        const results = await new AxeBuilder({ page }).analyze();
        const survived = await page.evaluate(() => {
          const required = [
            'main h1',
            'main section',
            'main input[type="search"]',
            'main [data-explainer-scene] [data-x="stage"] img[data-x="poster"]',
            'main [data-explainer-scene] [data-x="start"]',
            'main a[href]',
          ];
          const failures: string[] = [];
          let measured = 0;
          for (const selector of required) {
            // A subtree the page hides on purpose until the reader reaches
            // it (the explainer's later steps) is no content that survived
            // or collapsed; every other match has to keep its box.
            const elements = [...document.querySelectorAll(selector)].filter(
              (element) => element.closest('[hidden]') === null,
            );
            if (elements.length === 0) {
              failures.push(`${selector} renders nothing under forced colours`);
              continue;
            }
            for (const element of elements) {
              measured += 1;
              const rect = element.getBoundingClientRect();
              if (rect.width === 0 || rect.height === 0) {
                failures.push(
                  `${selector} collapsed to an empty box under forced colours`,
                );
                break;
              }
            }
          }
          return { failures, measured };
        });
        const overflow = await page.evaluate(collectOverflow);
        return {
          id: 'profile:home-forced-colours',
          route: HOME_TOOLS_ROUTE,
          description:
            'home keeps its landmarks, search, featured scene, and links under forced-colors: active',
          violationIds: results.violations.map(({ id }) => id),
          consoleErrors: [],
          documentScrollWidthPx: overflow.documentScrollWidthPx,
          documentClientWidthPx: overflow.documentClientWidthPx,
          failures: survived.failures,
          measuredMembers: survived.measured,
        };
      },
    );

    // Literal 320x800 reflow, per VAL-B2-A11Y-008.
    await withPage({ viewport: { width: 320, height: 800 } }, async (page) => {
      const results = await new AxeBuilder({ page }).analyze();
      const overflow = await page.evaluate(collectOverflow);
      const members = await page.evaluate(
        () => document.querySelectorAll('main *').length,
      );
      return {
        id: 'profile:home-reflow-320x800',
        route: HOME_TOOLS_ROUTE,
        description: 'home reflows into a literal 320x800 CSS-px viewport',
        violationIds: results.violations.map(({ id }) => id),
        consoleErrors: [],
        documentScrollWidthPx: overflow.documentScrollWidthPx,
        documentClientWidthPx: overflow.documentClientWidthPx,
        failures: overflow.unclippedOverflow.map(
          (element) =>
            `<${element.tag}> reaches ${element.rightPx}px with nothing clipping it`,
        ),
        measuredMembers: members,
      };
    });

    // 200% zoom equivalent: half the CSS viewport at device pixel ratio 2.
    await withPage(
      { viewport: { width: 720, height: 450 }, deviceScaleFactor: 2 },
      async (page) => {
        const results = await new AxeBuilder({ page }).analyze();
        const overflow = await page.evaluate(collectOverflow);
        const members = await page.evaluate(
          () => document.querySelectorAll('main *').length,
        );
        return {
          id: 'profile:home-zoom-200-equivalent',
          route: HOME_TOOLS_ROUTE,
          description:
            'home at a halved 720x450 CSS viewport with deviceScaleFactor 2, the scripted equivalent of 200% zoom',
          violationIds: results.violations.map(({ id }) => id),
          consoleErrors: [],
          documentScrollWidthPx: overflow.documentScrollWidthPx,
          documentClientWidthPx: overflow.documentClientWidthPx,
          failures: overflow.unclippedOverflow.map(
            (element) =>
              `<${element.tag}> reaches ${element.rightPx}px with nothing clipping it`,
          ),
          measuredMembers: members,
        };
      },
    );

    // Injected 200% text-only: every text member doubled, nothing lost.
    await withPage(
      { viewport: { width: 1440, height: 900 } },
      async (page) => {
        const members = await page.evaluate(collectTextMembers);
        await page.evaluate((recorded) => {
          const rules = recorded
            .map(
              (member) =>
                `[data-text-scale-id="${member.index}"]{font-size:${member.fontSizePx * 2}px !important;}`,
            )
            .join('\n');
          const style = document.createElement('style');
          style.setAttribute('data-text-scale', 'injected');
          style.textContent = rules;
          document.head.append(style);
        }, members);
        await page.evaluate(
          () => new Promise((resolve) => requestAnimationFrame(resolve)),
        );
        const failures = await page.evaluate(checkDoubledText, members);
        const overflow = await page.evaluate(collectOverflow);
        return {
          id: 'profile:home-text-200',
          route: HOME_TOOLS_ROUTE,
          description:
            'every non-empty text member on home computes to exactly twice its baseline size and stays readable',
          violationIds: [],
          consoleErrors: [],
          documentScrollWidthPx: overflow.documentScrollWidthPx,
          documentClientWidthPx: overflow.documentClientWidthPx,
          failures,
          measuredMembers: members.length,
        };
      },
    );

    evidence.accessibility = profiles;
  });

  test('no public route overflows horizontally at any declared width', async ({
    page,
    staticBase,
  }) => {
    test.setTimeout(900_000);
    const routes = brandV2Registry.routes.public;
    expect(routes.length, 'public route population').toBeGreaterThan(0);
    const rows: RouteWidthObservation[] = [];
    for (const route of routes) {
      for (const viewport of BRAND_V2_RESPONSIVE_VIEWPORTS) {
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });
        const response = await page.goto(`${staticBase}${route.path}`);
        expect(response?.status(), route.path).toBe(200);
        await page.evaluate(() => document.fonts.ready);
        const measured = await page.evaluate(collectOverflow);
        rows.push({
          routeId: route.id,
          route: route.path,
          viewportId: viewport.id,
          width: viewport.width,
          ...measured,
        });
      }
    }
    evidence.responsive = rows;
  });

  test('no domain or index surface prints an authoring counter', async ({
    browser,
    staticBase,
  }) => {
    test.setTimeout(180_000);
    const surfaces = progressCounterSurfaces({
      citedSources: homeCounts().sources,
    });
    const rows: ProgressCounterObservation[] = [];
    // Each surface on a page of its own, with the project's desktop settings,
    // which a fresh context does not inherit.
    await forEachInOwnContext(browser, surfaces, async (page, surface) => {
      const response = await page.goto(`${staticBase}${surface.path}`);
      expect(response?.status(), surface.path).toBe(200);
      await page.waitForLoadState('networkidle');
      const text = await page.evaluate(() =>
        (document.body.innerText ?? '').replace(/\s+/g, ' '),
      );
      const matches = PROGRESS_COUNTER_PATTERNS.flatMap((pattern) => [
        ...text.matchAll(pattern),
      ]).map((match) => match[0]);

      // What each printed noun has to equal is declared by the surface
      // population, not decided here: the sweep that measures a total should
      // not also be the thing that says what the total was allowed to be.
      const counted = [...text.matchAll(COUNT_PHRASE)].map((match) => {
        const noun = match[2].toLowerCase();
        return {
          text: match[0],
          expectation:
            surface.countExpectations.find(({ nounPattern }) =>
              new RegExp(nounPattern).test(noun),
            ) ?? null,
          actual: Number(match[1].replace(/,/g, '')),
        };
      });

      rows.push({
        routeId: surface.id,
        route: surface.path,
        matches,
        reconciledCounts: counted
          .filter(
            (
              row,
            ): row is typeof row & { expectation: SurfaceCountExpectation } =>
              row.expectation !== null,
          )
          .map(({ text: phrase, expectation, actual }) => ({
            memberId: expectation.memberId,
            text: phrase,
            expected: expectation.expected,
            actual,
          })),
        unreconciledCounts: counted
          .filter(({ expectation }) => expectation === null)
          .map(({ text: phrase }) => phrase),
      });
    }, devices['Desktop Chrome']);
    evidence.progressCounters = rows;
  });

  /** The artifact the sweep assembles, under a given fingerprint. */
  const assemble = (fingerprint: string): HomeToolsEvidence => ({
    version: 2,
    fingerprint,
    route: HOME_TOOLS_ROUTE,
    viewport: HOME_TOOLS_VIEWPORT.id,
    featured: evidence.featured!,
    moduleScene: evidence.moduleScene!,
    toolsLine: evidence.toolsLine!,
    responsive: evidence.responsive!,
    accessibility: evidence.accessibility!,
    progressCounters: evidence.progressCounters!,
    designBounds: evidence.designBounds!,
  });

  const surfacesNow = () =>
    progressCounterSurfaces({ citedSources: homeCounts().sources });

  test('the measured evidence grants every home tool result', async () => {
    const routes = brandV2Registry.routes.public;
    const artifact = assemble(
      homeToolsEvidenceFingerprint({
        root: ROOT,
        routeIds: routes.map(({ id }) => id),
      }),
    );
    const measured = readHomeToolsEvidence({
      artifact,
      fingerprint: artifact.fingerprint,
    });

    // VAL-NAV-006, VAL-NAV-007, VAL-DESIGN-004, VAL-OPUS-017: the scene.
    const featuredVerdicts = featuredInstrumentVerdicts(measured);
    expect(featuredVerdicts.map(({ id }) => id)).toEqual([
      ...FEATURED_INSTRUMENT_ANCHORS,
    ]);
    expect(featuredVerdicts.flatMap(({ failures }) => failures)).toEqual([]);

    // VAL-CROSS-015: home and the scene's own article, still against still.
    const parity = crossMountVerdicts(measured);
    expect(parity.map(({ id }) => id)).toEqual(
      Object.values(CROSS_CONTEXT_CLAUSES),
    );
    expect(parity.flatMap(({ failures }) => failures)).toEqual([]);

    // VAL-DESIGN-013 and VAL-OPUS-020: the tools line.
    expect(
      toolsLineVerdicts(measured).flatMap(({ failures }) => failures),
    ).toEqual([]);

    // VAL-B2-SHELL-009 and the overflow half of VAL-DESIGN-014.
    const overflow = responsiveOverflowVerdicts(measured, routes);
    expect(overflow.length).toBe(routes.length);
    expect(overflow.flatMap(({ failures }) => failures)).toEqual([]);

    // VAL-DESIGN-014 and VAL-ADJ-018: the accessibility profiles.
    const profiles = accessibilityProfileVerdicts(measured);
    expect(profiles.map(({ id }) => id).sort()).toEqual([
      'profile:home-forced-colours',
      'profile:home-keyboard',
      'profile:home-reflow-320x800',
      'profile:home-text-200',
      'profile:home-zoom-200-equivalent',
    ]);
    expect(profiles.flatMap(({ failures }) => failures)).toEqual([]);

    // VAL-DESIGN-015: no authoring counters, and real counts reconcile.
    expect(
      progressCounterVerdicts(measured, surfacesNow()).flatMap(
        ({ failures }) => failures,
      ),
    ).toEqual([]);

    // VAL-EDU-027: home keeps its design bounds.
    expect(
      homeDesignBoundVerdicts(measured).flatMap(({ failures }) => failures),
    ).toEqual([]);

    const artifactPath = join(ROOT, HOME_TOOLS_EVIDENCE_PATH);
    mkdirSync(dirname(artifactPath), { recursive: true });
    writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
  });
  /**
   * The plant proof. An autoplaying scene has to fail the autoplay anchor
   * and only it, a page copy that drifts at one still has to fail the
   * clause that still belongs to and only it, and a preview in the tools line
   * has to fail the plain-link anchor; otherwise these rows are one boolean
   * wearing several names.
   */
  test('the tool verdicts fail independently when their subjects are broken', async () => {
    const measured = readHomeToolsEvidence({
      artifact: assemble('planted'),
      fingerprint: 'planted',
    });
    const plant = (change: (planted: HomeToolsEvidence) => void) => {
      const copy = JSON.parse(JSON.stringify(measured)) as HomeToolsEvidence;
      change(copy);
      return copy;
    };
    const failing = (verdicts: Array<{ id: string; failures: string[] }>) =>
      verdicts.filter(({ failures }) => failures.length > 0).map(({ id }) => id);

    expect(
      failing(featuredInstrumentVerdicts(plant((e) => (e.featured.idleFrameRequests = 12)))),
    ).toEqual(['anchor:featured-no-autoplay']);
    expect(
      failing(
        featuredInstrumentVerdicts(
          plant((e) => {
            e.featured.steps[2].readout = e.featured.steps[2].readout.replace(
              /about \d+ kilograms/,
              'about 5 kilograms',
            );
          }),
        ),
      ),
    ).toEqual(['anchor:featured-no-fabricated-telemetry']);

    expect(
      failing(
        toolsLineVerdicts(
          plant((e) => {
            e.toolsLine.graphics.push('svg');
            e.toolsLine.renderedNumbers.push(6);
          }),
        ),
      ),
    ).toEqual(['anchor:tools-line-plain']);
    expect(
      failing(
        toolsLineVerdicts(
          plant((e) => {
            e.toolsLine.links = e.toolsLine.links.map((link) =>
              link.path === '/playground/' ? { ...link, text: 'Try it' } : link,
            );
          }),
        ),
      ),
    ).toEqual(['anchor:tools-line-playground-link']);

    expect(
      failing(
        crossMountVerdicts(
          plant((e) => (e.moduleScene.steps[2].readout = 'The knees have the strongest motors. Each arm can carry only about 5 kilograms.')),
        ),
      ),
    ).toEqual([CROSS_CONTEXT_CLAUSES.sharedInputsSharedReadout]);
    expect(
      failing(
        crossMountVerdicts(
          plant((e) => {
            e.moduleScene.openingReadout = 'The G1: 1.32 metres tall.';
            e.moduleScene.resetReadout = e.moduleScene.openingReadout;
            e.moduleScene.secondResetReadout = e.moduleScene.openingReadout;
          }),
        ),
      ),
    ).toEqual([CROSS_CONTEXT_CLAUSES.identicalResetState]);
    expect(
      failing(
        crossMountVerdicts(
          plant((e) => (e.featured.componentModule = 'components/home/humanoid-copy.tsx')),
        ),
      ),
    ).toEqual([CROSS_CONTEXT_CLAUSES.sameComponent]);
    expect(() =>
      readHomeToolsEvidence({
        artifact: plant((e) => (e.moduleScene.route = '/frontier/')),
        fingerprint: 'planted',
      }),
    ).toThrow(/would compare the wrong pair/);
    // VAL-DESIGN-015: one printed total that no expectation explains fails
    // the surface, even where another total on the same page reconciles.
    const surfaces = surfacesNow();
    const aToZ = surfaces.find(({ id }) => id === 'route:/a-z/')!;
    const plantedCounts = progressCounterVerdicts(
      plant((e) => {
        const row = e.progressCounters.find(({ routeId }) => routeId === aToZ.id)!;
        row.unreconciledCounts = ['84 citations'];
      }),
      surfaces,
    );
    expect(failing(plantedCounts)).toEqual([aToZ.id]);
    expect(plantedCounts.flatMap(({ failures }) => failures).join(' ')).toMatch(
      /prints "84 citations", which no declared expectation explains/,
    );

    // Each required member is demanded on its own, home's three included:
    // the article total reconciling says nothing about the source total.
    for (const [routeId, memberId] of [
      ['route:/a-z/', 'count:/a-z/:glossary-terms'],
      ['route:/', 'count:/:sources'],
    ] as const) {
      const dropped = progressCounterVerdicts(
        plant((e) => {
          const row = e.progressCounters.find((entry) => entry.routeId === routeId)!;
          row.reconciledCounts = row.reconciledCounts.filter(
            (count) => count.memberId !== memberId,
          );
        }),
        surfaces,
      );
      expect(failing(dropped), memberId).toEqual([routeId]);
      expect(dropped.flatMap(({ failures }) => failures).join(' ')).toContain(
        `"${memberId}" (`,
      );
    }
    // The baseline half: the unplanted artifact is accepted by the same
    // reader that refused every plant.
    expect(
      progressCounterVerdicts(measured, surfaces).flatMap(({ failures }) => failures),
    ).toEqual([]);

    const plantedOverflow = responsiveOverflowVerdicts(
      plant((e) => {
        for (const row of e.responsive) {
          if (row.route === HOME_TOOLS_ROUTE) {
            row.documentScrollWidthPx = row.documentClientWidthPx + 40;
          }
        }
      }),
      brandV2Registry.routes.public,
    );
    expect(failing(plantedOverflow)).toEqual(['route:/']);

    expect(
      failing(homeDesignBoundVerdicts(plant((e) => (e.designBounds.borderedBoxCount = 99)))),
    ).toEqual(['bound:home-bordered-boxes']);
    expect(
      failing(
        homeDesignBoundVerdicts(
          plant((e) =>
            e.designBounds.chartDisclosureSummaries.push({
              text: 'Chart data',
              textTransform: 'uppercase',
              letterSpacing: '1.2px',
              fontSizePx: 11,
              borderTopWidthPx: 1,
              borderBottomWidthPx: 0,
            }),
          ),
        ),
      ),
    ).toEqual(['bound:home-chart-disclosure-summary']);
  });
});
