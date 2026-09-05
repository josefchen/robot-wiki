import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Locator, Page } from '@playwright/test';
import { test, expect, brandV2Registry } from './brand-v2-static-fixture';
import {
  CROSS_MOUNT_INPUT,
  FEATURED_INSTRUMENT_ANCHORS,
  HOME_TOOLS_EVIDENCE_PATH,
  HOME_TOOLS_ROUTE,
  HOME_TOOLS_VIEWPORT,
  accessibilityProfileVerdicts,
  crossMountVerdicts,
  deriveCrossContextTable,
  featuredComponentDefaults,
  interactiveContainers,
  featuredInstrumentVerdicts,
  homeDesignBoundVerdicts,
  homeToolsEvidenceFingerprint,
  playgroundEntryVerdicts,
  progressCounterVerdicts,
  readHomeToolsEvidence,
  responsiveOverflowVerdicts,
  type AccessibilityProfileObservation,
  type FeaturedMountRegistration,
  type HomeToolsEvidence,
  type MountObservation,
  type ProgressCounterObservation,
  type RouteWidthObservation,
  type SliderObservation,
  type SurfaceCountExpectation,
} from '../../lib/brand-v2-home-tools-evidence';
import { BRAND_V2_RESPONSIVE_VIEWPORTS } from '../../lib/brand-v2-responsive-viewports';
import { progressCounterSurfaces } from '../../lib/home-populations';
import { so101DerivedFigures, so101Preview } from '../../lib/so101-kinematics';

const ROOT = process.cwd();
const READOUT = '[data-testid="episode-success-readout"]';

/**
 * The live tool entry points on home, measured where they run.
 *
 * Everything this suite decides is a property of the rendered document under
 * a stated viewport and a stated interaction: that the featured instrument
 * computes rather than depicts, that the two mounts of one component agree,
 * that the playground preview is bound to the model the playground itself
 * loads, that no width overflows, and that no surface prints an authoring
 * counter. Each is measured once, persisted, and then decided by the
 * fail-closed readers in `lib/brand-v2-home-tools-evidence.ts`, so the
 * enforcement generator states results it did not invent.
 */

/** Authoring-progress copy `VAL-DESIGN-015` forbids on these surfaces. */
const PROGRESS_COUNTER_PATTERNS = [
  /\d+\s*(?:of|\/)\s*\d+\s+(?:articles?|modules?|entries|terms?|pages?)/gi,
  /\b\d+\s+(?:planned|remaining|pending|upcoming|to come|in progress)\b/gi,
  /\b(?:planned|remaining|pending|upcoming)\s*:?\s*\d+/gi,
];

/** Nouns whose printed counts must reconcile with registry truth. */
/**
 * The counted nouns the index surfaces print, with the one qualifier the
 * A-Z index puts between the number and its noun ("119 glossary terms").
 * Without it that total matched nothing, so the only phrase carrying the
 * glossary registry's size was never reconciled against it.
 */
const COUNT_PHRASE = /(\d[\d,]*)\s+(?:glossary\s+)?(articles?|modules?|entries|terms?|companies|company|segments?)\b/gi;

/**
 * The registered mounts of the component home features, derived from the
 * interactive registry rather than named here. A second mount added to
 * another article joins `VAL-CROSS-015`'s population automatically instead
 * of escaping a hard-coded pair.
 *
 * `ownerPath` and `props` come along with each row because they are what the
 * pairing and the prediction are derived from: the document that mounts an
 * instance, and the props it is mounted with. Both are generated from the
 * tree, so neither is something a mount can grant itself. The component's
 * own declared defaults come from its registered source file, so the value
 * every mount's opening state is measured against is read where it is
 * written rather than restated in the instrument.
 */
function featuredMounts() {
  const home = brandV2Registry.interactive.mounts.filter(
    (mount) => mount.route === HOME_TOOLS_ROUTE,
  );
  if (home.length !== 1) {
    throw new Error(
      `home registers ${home.length} interactive mounts; VAL-NAV-006 needs exactly one featured instrument`,
    );
  }
  const featured = home[0];
  const registered = brandV2Registry.interactive.mounts.filter(
    (mount) => mount.sourceId === featured.sourceId,
  );
  const siblings = registered.filter((mount) => mount.id !== featured.id);
  if (siblings.length === 0) {
    throw new Error(
      `${featured.sourceId} is mounted only on home, so VAL-CROSS-015 has no second context to compare`,
    );
  }
  const registrations: FeaturedMountRegistration[] = registered.map(
    ({ id, route, ownerPath, props, containers }) => ({
      mountId: id,
      route,
      ownerPath,
      props,
      containers,
    }),
  );
  const source = brandV2Registry.interactive.sources.find(
    ({ id }) => id === featured.sourceId,
  );
  if (!source?.sourcePath) {
    throw new Error(
      `${featured.sourceId} has no registered source path, so the component's declared defaults cannot be read`,
    );
  }
  const component = featuredComponentDefaults({
    component: source.component,
    path: source.sourcePath,
    text: readFileSync(join(ROOT, source.sourcePath), 'utf8'),
  });
  return { featured, siblings, registrations, component };
}

/** The nearest registered surface that holds one mount of the instrument. */
function mountRoot(page: Page, ordinal: number): Locator {
  return page
    .locator(READOUT)
    .nth(ordinal - 1)
    .locator(
      'xpath=ancestor::div[@data-brand-surface-id="surface:flat"][1]',
    );
}

async function sliderObservations(root: Locator): Promise<SliderObservation[]> {
  const sliders = root.locator('input[type="range"]');
  const count = await sliders.count();
  const observations: SliderObservation[] = [];
  for (let index = 0; index < count; index += 1) {
    const slider = sliders.nth(index);
    observations.push({
      accessibleName: (await slider.getAttribute('aria-label')) ?? '',
      value: Number(await slider.inputValue()),
      min: Number(await slider.getAttribute('min')),
      max: Number(await slider.getAttribute('max')),
      step: Number(await slider.getAttribute('step')),
    });
  }
  return observations;
}

async function readoutText(root: Locator): Promise<string> {
  return ((await root.locator(READOUT).first().textContent()) ?? '').trim();
}

/**
 * Drives one mount through the whole `VAL-NAV-007`/`VAL-CROSS-015` script:
 * read the initial state, operate a control by keyboard, drive both sliders
 * to the shared inputs, reset, and then repeat the drive and reset so that
 * "deterministic" means measured twice rather than asserted once.
 */
async function observeMount(
  page: Page,
  args: { mountId: string; route: string; ordinal: number },
): Promise<MountObservation> {
  const root = mountRoot(page, args.ordinal);
  await expect(root).toHaveCount(1);

  // A mount may ship behind the article's own commit-to-reveal disclosure.
  // Opening it is the reader's documented escape path ("Read the
  // reasoning"), so the comparison is made on the instrument a reader can
  // actually reach rather than by dropping the mount from the population.
  const revealedByControls = await root.evaluate((element) => {
    const opened: string[] = [];
    let ancestor = element.parentElement;
    while (ancestor) {
      if (ancestor instanceof HTMLDetailsElement && !ancestor.open) {
        const summary = ancestor.querySelector('summary');
        opened.push((summary?.textContent ?? 'details').trim());
        summary?.click();
      }
      ancestor = ancestor.parentElement;
    }
    return opened;
  });
  await expect(root.locator('input[type="range"]').first()).toBeVisible();

  const sliders = root.locator('input[type="range"]');
  const perStep = sliders.nth(0);
  const steps = sliders.nth(1);

  const initialReadout = await readoutText(root);
  const initialSliders = await sliderObservations(root);

  await perStep.focus();
  const focus = await perStep.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      width: parseFloat(style.outlineWidth),
      style: style.outlineStyle,
      colour: style.outlineColor,
    };
  });
  await page.keyboard.press('ArrowRight');
  const keyboardDrivenReadout = await readoutText(root);

  await perStep.fill(String(CROSS_MOUNT_INPUT.perStepPercent));
  await steps.fill(String(CROSS_MOUNT_INPUT.steps));
  const drivenReadout = await readoutText(root);
  const drivenSliders = await sliderObservations(root);

  const resetControl = root.getByRole('button', { name: /reset/i });
  const resetControlNames = await resetControl.allInnerTexts();
  await resetControl.first().click();
  const resetReadout = await readoutText(root);
  const resetSliders = await sliderObservations(root);

  await perStep.fill(String(CROSS_MOUNT_INPUT.perStepPercent));
  await steps.fill(String(CROSS_MOUNT_INPUT.steps));
  await resetControl.first().click();
  const secondResetReadout = await readoutText(root);

  const graphic = root.locator('svg, canvas').first();
  const graphicCount = await graphic.count();

  return {
    mountId: args.mountId,
    route: args.route,
    ordinal: args.ordinal,
    graphicTag:
      graphicCount === 0
        ? null
        : await graphic.evaluate((element) => element.tagName.toLowerCase()),
    graphicRole:
      graphicCount === 0 ? null : await graphic.getAttribute('role'),
    graphicAriaLabel:
      graphicCount === 0 ? null : await graphic.getAttribute('aria-label'),
    initialReadout,
    initialSliders,
    drivenReadout,
    drivenSliders,
    resetReadout,
    resetSliders,
    secondResetReadout,
    keyboardDrivenReadout,
    focusOutlineWidthPx: focus.width,
    focusOutlineStyle: focus.style,
    focusOutlineColour: focus.colour,
    resetControlNames: resetControlNames.map((name) => name.trim()),
    revealedByControls,
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

  test('the featured instrument is live, operable, resettable, and identical across its registered mounts', async ({
    page,
    staticBase,
  }) => {
    const { featured, siblings } = featuredMounts();
    await page.setViewportSize({
      width: HOME_TOOLS_VIEWPORT.width,
      height: HOME_TOOLS_VIEWPORT.height,
    });
    const response = await page.goto(`${staticBase}${HOME_TOOLS_ROUTE}`);
    expect(response?.status(), HOME_TOOLS_ROUTE).toBe(200);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    await page.mouse.move(2, 2);

    const homeMount = await observeMount(page, {
      mountId: featured.id,
      route: featured.route,
      ordinal: featured.ordinal,
    });

    const section = page.locator('section[aria-labelledby="featured-heading"]');
    await expect(section).toHaveCount(1);
    const claimText = (
      (await section.locator('p').first().innerText()) ?? ''
    ).trim();
    const root = mountRoot(page, featured.ordinal);
    const currentStateText = (await root.locator('label').first().innerText())
      .replace(/\s+/g, ' ')
      .trim();
    const graphic = root.locator('svg[role="img"]').first();
    const geometry = await graphic.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const describedBy = element.getAttribute('aria-describedby') ?? '';
      const description = describedBy
        ? document.getElementById(describedBy)
        : null;
      return {
        topPx: Math.round((rect.top + window.scrollY) * 100) / 100,
        heightPx: Math.round(rect.height * 100) / 100,
        describedByText: description
          ? (description.textContent ?? '').replace(/\s+/g, ' ').trim()
          : null,
      };
    });

    evidence.featured = {
      ...homeMount,
      claimText,
      currentStateText,
      graphicTopPx: geometry.topPx,
      graphicHeightPx: geometry.heightPx,
      describedByText: geometry.describedByText,
    };

    const observedSiblings: MountObservation[] = [];
    for (const sibling of siblings) {
      const siblingResponse = await page.goto(`${staticBase}${sibling.route}`);
      expect(siblingResponse?.status(), sibling.route).toBe(200);
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => document.fonts.ready);
      observedSiblings.push(
        await observeMount(page, {
          mountId: sibling.id,
          route: sibling.route,
          ordinal: sibling.ordinal,
        }),
      );
    }
    evidence.siblingMounts = observedSiblings;
  });

  test('the playground entry point previews the shipped model and carries its textual alternative', async ({
    page,
    staticBase,
  }) => {
    await page.setViewportSize({
      width: HOME_TOOLS_VIEWPORT.width,
      height: HOME_TOOLS_VIEWPORT.height,
    });
    await page.goto(`${staticBase}${HOME_TOOLS_ROUTE}`);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    await page.mouse.move(2, 2);

    evidence.playground = await page.evaluate(() => {
      const main = document.querySelector('main');
      if (!main) throw new Error('home rendered no main landmark');
      const link = [...main.querySelectorAll('a[href]')].find((anchor) =>
        (anchor.getAttribute('href') ?? '').includes('/playground'),
      );
      if (!link) throw new Error('home renders no playground entry point');
      const card = link.closest('article') ?? link;
      const figure = card.querySelector('figure');
      const graphics = [...card.querySelectorAll('svg, canvas, img')].map(
        (element) => {
          const rect = element.getBoundingClientRect();
          return {
            tag: element.tagName.toLowerCase(),
            role: element.getAttribute('role'),
            ariaHidden: element.getAttribute('aria-hidden'),
            ariaLabel: element.getAttribute('aria-label'),
            describedBy: element.getAttribute('aria-describedby'),
            shapeCount: element.querySelectorAll(
              'circle, line, path, polyline, polygon, rect',
            ).length,
            naturalWidth:
              element instanceof HTMLImageElement ? element.naturalWidth : null,
            widthPx: Math.round(rect.width),
            heightPx: Math.round(rect.height),
          };
        },
      );
      const described = graphics.find(
        (graphic) => (graphic.describedBy ?? '') !== '',
      );
      const description = described?.describedBy
        ? document.getElementById(described.describedBy)
        : null;
      // Only the preview's own numbers: the figure, its legend, and the
      // textual alternative bound to it. The heading and the prose beside
      // them are the card, not the drawing. A digit run glued to a word
      // (the "101" inside "so101.urdf") is part of a name, not a quantity.
      const previewText = `${figure?.textContent ?? ''} ${description?.textContent ?? ''}`;
      const numbers = [
        ...previewText.matchAll(/(?<![\w.])-?\d+(?:\.\d+)?/g),
      ].map((match) => Number(match[0]));
      return {
        href: link.getAttribute('href') ?? '',
        graphics,
        describedByText: description
          ? (description.textContent ?? '').replace(/\s+/g, ' ').trim()
          : null,
        surfaceId: figure?.getAttribute('data-brand-surface-id') ?? null,
        surfaceBackgroundColour: figure
          ? getComputedStyle(figure).backgroundColor
          : null,
        renderedNumbers: [...new Set(numbers)],
        textLength: (card.textContent ?? '').trim().length,
      };
    });
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
      const summary = main.querySelector('details > summary');
      const summaryStyle = summary ? getComputedStyle(summary) : null;
      return {
        microLabels,
        borderedBoxCount,
        chartDisclosureSummary: summary
          ? {
              text: (summary.textContent ?? '').replace(/\s+/g, ' ').trim(),
              textTransform: summaryStyle!.textTransform,
              letterSpacing: summaryStyle!.letterSpacing,
              fontSizePx: parseFloat(summaryStyle!.fontSize),
              borderTopWidthPx: parseFloat(summaryStyle!.borderTopWidth),
              borderBottomWidthPx: parseFloat(summaryStyle!.borderBottomWidth),
            }
          : null,
      };
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
        // Controls sealed inside a closed disclosure are deliberately out of
        // the tab order; the summary that opens them is the control a
        // reader tabs to, and it is in the population.
        const reachable =
          ':not(details:not([open]) *)';
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
            'main svg[role="img"]',
            'main input[type="range"]',
            'main a[href]',
          ];
          const failures: string[] = [];
          let measured = 0;
          for (const selector of required) {
            const elements = [...document.querySelectorAll(selector)];
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
            'home keeps its landmarks, instrument, and controls under forced-colors: active',
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
    page,
    staticBase,
  }) => {
    test.setTimeout(180_000);
    const surfaces = progressCounterSurfaces();
    const rows: ProgressCounterObservation[] = [];
    for (const surface of surfaces) {
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
    }
    evidence.progressCounters = rows;
  });

  test('the measured evidence grants every home tool result', async () => {
    const routes = brandV2Registry.routes.public;
    const { registrations: mountRegistrations } = featuredMounts();
    const artifact: HomeToolsEvidence = {
      version: 1,
      fingerprint: homeToolsEvidenceFingerprint({
        root: ROOT,
        routeIds: routes.map(({ id }) => id),
      }),
      route: HOME_TOOLS_ROUTE,
      viewport: HOME_TOOLS_VIEWPORT.id,
      featured: evidence.featured!,
      siblingMounts: evidence.siblingMounts!,
      crossContext: deriveCrossContextTable(
        {
          featured: evidence.featured!,
          siblingMounts: evidence.siblingMounts!,
        } as HomeToolsEvidence,
        mountRegistrations,
      ),
      playground: evidence.playground!,
      responsive: evidence.responsive!,
      accessibility: evidence.accessibility!,
      progressCounters: evidence.progressCounters!,
      designBounds: evidence.designBounds!,
    };
    const measured = readHomeToolsEvidence({
      artifact,
      fingerprint: artifact.fingerprint,
    });

    // VAL-NAV-006, VAL-NAV-007, VAL-DESIGN-004: the featured instrument.
    const featuredVerdicts = featuredInstrumentVerdicts(measured);
    expect(featuredVerdicts.map(({ id }) => id)).toEqual([
      ...FEATURED_INSTRUMENT_ANCHORS,
    ]);
    expect(featuredVerdicts.flatMap(({ failures }) => failures)).toEqual([]);

    // VAL-CROSS-015: home paired with the module pages the same component
    // is registered on, and the shared behaviour of every registered mount.
    const featuredComponent = featuredMounts();
    const parity = crossMountVerdicts(
      measured,
      featuredComponent.registrations,
      featuredComponent.component,
    );
    expect(parity.length).toBe(measured.siblingMounts.length + 1);
    expect(
      parity.filter(({ observed }) => observed.isFeaturedHomeMount === true)
        .length,
      'the home mount decided by the same clauses as every other',
    ).toBe(1);
    // The pair the locked reset clause is about, and it is measured rather
    // than asserted: every module-page mount the document does not nest
    // inside another interactive component carries home's readings.
    expect(
      measured.crossContext.pairs.length,
      'module-page mounts compared with home observation against observation',
    ).toBeGreaterThan(0);
    for (const pair of measured.crossContext.pairs) {
      expect(
        pair.readouts.map(({ phase, agrees }) => `${phase}:${agrees}`),
        pair.mountId,
      ).toEqual([
        'initial:true',
        'reset:true',
        'second-reset:true',
        'driven:true',
      ]);
      expect(
        [...pair.initialControls, ...pair.resetControls].every(
          ({ agrees }) => agrees,
        ),
        pair.mountId,
      ).toBe(true);
    }
    // And every mount the pair clause does not reach is excluded for a
    // structural reason the registry generated, never for a prop it wrote.
    for (const row of measured.crossContext.excluded) {
      const registration = featuredComponent.registrations.find(
        ({ mountId }) => mountId === row.mountId,
      )!;
      expect(row.containerPath, row.mountId).toEqual(
        registration.containers.map(({ component }) => component),
      );
      expect(
        interactiveContainers(registration).length > 0 ||
          !registration.ownerPath.startsWith('content/'),
        row.mountId,
      ).toBe(true);
      expect(
        parity.find(({ id }) => id === row.mountId)!.observed.clauses,
      ).toEqual(expect.arrayContaining(row.stillBoundBy));
    }
    expect(parity.flatMap(({ failures }) => failures)).toEqual([]);

    // VAL-DESIGN-013: the playground preview is bound to the shipped model.
    const preview = so101Preview();
    const figures = so101DerivedFigures(preview.chain);
    const modelNumbers = [
      preview.chain.length,
      preview.geometry.scaleBar.labelMm,
      figures.reachMm,
      figures.wristHeightMm,
      figures.widestTravelDeg,
      figures.narrowestTravelDeg,
      ...preview.chain.flatMap((joint) => [
        joint.lowerDeg,
        joint.upperDeg,
        joint.travelDeg,
      ]),
    ];
    const playground = playgroundEntryVerdicts(measured, {
      description: preview.description,
      numbers: modelNumbers,
    });
    expect(playground.flatMap(({ failures }) => failures)).toEqual([]);

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
    const counters = progressCounterVerdicts(
      measured,
      progressCounterSurfaces(),
    );
    expect(counters.flatMap(({ failures }) => failures)).toEqual([]);

    // VAL-EDU-027: home keeps the bounds the retrofit inherited.
    expect(
      homeDesignBoundVerdicts(measured).flatMap(({ failures }) => failures),
    ).toEqual([]);

    const artifactPath = join(ROOT, HOME_TOOLS_EVIDENCE_PATH);
    mkdirSync(dirname(artifactPath), { recursive: true });
    writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
  });

  /**
   * The plant proof. A page whose playground preview has lost its binding to
   * the shipped model has to fail the model-bound anchor and only it, and a
   * mount driven to different inputs has to fail parity and only parity;
   * otherwise these rows are one boolean wearing several names.
   */
  test('the tool verdicts fail independently when their subjects are broken', async () => {
    const { registrations, component } = featuredMounts();
    const measured = readHomeToolsEvidence({
      artifact: {
        version: 1,
        fingerprint: 'planted',
        route: HOME_TOOLS_ROUTE,
        viewport: HOME_TOOLS_VIEWPORT.id,
        featured: evidence.featured!,
        siblingMounts: evidence.siblingMounts!,
        crossContext: deriveCrossContextTable(
          {
            featured: evidence.featured!,
            siblingMounts: evidence.siblingMounts!,
          } as HomeToolsEvidence,
          registrations,
        ),
        playground: evidence.playground!,
        responsive: evidence.responsive!,
        accessibility: evidence.accessibility!,
        progressCounters: evidence.progressCounters!,
        designBounds: evidence.designBounds!,
      },
      fingerprint: 'planted',
    });

    const preview = so101Preview();
    const plantedPreview = playgroundEntryVerdicts(
      {
        ...measured,
        playground: {
          ...measured.playground,
          renderedNumbers: [...measured.playground.renderedNumbers, 4242],
          describedByText: 'A robot arm, rendered for illustration.',
        },
      },
      { description: preview.description, numbers: [] },
    );
    expect(
      plantedPreview
        .filter(({ failures }) => failures.length > 0)
        .map(({ id }) => id)
        .sort(),
    ).toEqual([
      'anchor:playground-entry-model-bound',
      'anchor:playground-entry-textual-alternative',
    ]);

    // The accepted half first: the unplanted reading is green through the
    // same function that has to refuse each plant below.
    expect(
      crossMountVerdicts(measured, registrations, component).flatMap(
        ({ failures }) => failures,
      ),
    ).toEqual([]);

    /** A planted sweep, with the cross-context table re-derived from it. */
    const replant = (
      change: (evidence: HomeToolsEvidence) => void,
      mounts: readonly FeaturedMountRegistration[] = registrations,
    ): HomeToolsEvidence => {
      const copy = JSON.parse(JSON.stringify(measured)) as HomeToolsEvidence;
      change(copy);
      copy.crossContext = deriveCrossContextTable(copy, mounts);
      return copy;
    };

    // Clause 3: identical control values, divergent readouts.
    const plantedParity = crossMountVerdicts(
      replant((planted) => {
        for (const mount of planted.siblingMounts) mount.drivenReadout = '99.9%';
      }),
      registrations,
      component,
    );
    expect(
      plantedParity
        .filter(({ failures }) => failures.length > 0)
        .map(({ id }) => id)
        .sort(),
    ).toEqual(measured.siblingMounts.map(({ mountId }) => mountId).sort());

    // Clause 2, the locked cross-context reset clause, planted one phase at
    // a time on the article's own calculator. The mount stays internally
    // consistent with the model in the phases it is not planted on, so only
    // the cross-context comparison can produce the failure.
    const paired = measured.crossContext.pairs[0].mountId;
    for (const [phase, plant, expected] of [
      ['initialReadout', '61.4%', 'opens 61.4%'],
      ['resetReadout', '61.4%', 'resets to 61.4%'],
      ['secondResetReadout', '61.4%', 'resets a second time to 61.4%'],
    ] as const) {
      const drifted = replant((planted) => {
        const mount = planted.siblingMounts.find(
          ({ mountId }) => mountId === paired,
        )!;
        mount[phase] = plant;
      });
      expect(drifted.crossContext.pairs[0].readouts.some(({ agrees }) => !agrees))
        .toBe(true);
      const failing = crossMountVerdicts(drifted, registrations, component)
        .filter(({ failures }) => failures.length > 0);
      expect(failing.map(({ id }) => id), phase).toEqual([paired]);
      expect(failing[0].failures.join(' '), phase).toContain(
        'the two contexts do not restore the identical initial state',
      );
      expect(failing[0].failures.join(' '), phase).toContain(expected);
    }

    // The same clause on a control value rather than a readout: a module
    // page whose calculator opens with a different slider position is a
    // different initial state even when the readout coincides.
    const movedControl = replant((planted) => {
      const mount = planted.siblingMounts.find(
        ({ mountId }) => mountId === paired,
      )!;
      mount.initialSliders[1].value += 1;
      mount.resetSliders[1].value += 1;
    });
    expect(
      crossMountVerdicts(movedControl, registrations, component)
        .find(({ id }) => id === paired)!
        .failures.join(' '),
    ).toMatch(/opens control 2 .* where home opens it/);

    // The exclusion cannot be self-granted. A `default*` prop on a mount the
    // document does not nest is exactly the case that used to pass: it is
    // still compared with home, and now it fails.
    const selfDeclared = registrations.map((mount) =>
      mount.mountId === paired
        ? { ...mount, props: `defaultSteps={14} ${mount.props}` }
        : mount,
    );
    expect(
      selfDeclared.find(({ mountId }) => mountId === paired)!.props,
    ).not.toEqual(
      registrations.find(({ mountId }) => mountId === paired)!.props,
    );
    const stillPaired = deriveCrossContextTable(measured, selfDeclared);
    expect(stillPaired.pairs.map(({ mountId }) => mountId)).toContain(paired);
    const declaredAway = crossMountVerdicts(
      { ...measured, crossContext: stillPaired },
      selfDeclared,
      component,
    ).filter(({ failures }) => failures.length > 0);
    expect(declaredAway.map(({ id }) => id)).toEqual([paired]);
    expect(declaredAway[0].failures.join(' ')).toMatch(
      /where the shared model predicts 48.8%/,
    );

    // The persisted table is a rendering of the observations, not a place to
    // write an agreement: a table that disagrees with the mounts is refused.
    expect(() =>
      crossMountVerdicts(
        {
          ...measured,
          crossContext: {
            ...measured.crossContext,
            excluded: [],
          },
        },
        registrations,
        component,
      ),
    ).toThrow(/not the one the measured mounts derive/);

    // Clause 1: home featuring a configured copy rather than the canonical
    // one, which is the drift the deleted configuration clause was groping
    // for. It fails home and nothing else.
    const configuredHome = registrations.map((mount) =>
      mount.mountId === measured.featured.mountId
        ? { ...mount, props: `defaultSteps={14} ${mount.props}` }
        : mount,
    );
    expect(
      configuredHome.find(
        ({ mountId }) => mountId === measured.featured.mountId,
      )!.props,
    ).not.toEqual(registrations.find(
      ({ mountId }) => mountId === measured.featured.mountId,
    )!.props);
    const configured = crossMountVerdicts(
      measured,
      configuredHome,
      component,
    ).filter(({ failures }) => failures.length > 0);
    expect(configured.map(({ id }) => id)).toEqual([measured.featured.mountId]);
    expect(configured[0].failures.join(' ')).toMatch(
      /so the copy a reader meets first is not the component's canonical default/,
    );

    // Clauses 3 and 4 on the excluded mount. The one mount the pair clause
    // does not reach is nested inside a component that declares controls of
    // its own, and it is still fully decided: fabricating its opening state
    // fails the model, and driving it off the shared inputs fails the
    // behaviour clause.
    const nested = registrations.filter(
      (mount) => interactiveContainers(mount).length > 0,
    );
    expect(nested.map(({ mountId }) => mountId)).toEqual(
      measured.crossContext.excluded.map(({ mountId }) => mountId),
    );
    const quiz = nested[0];
    expect(quiz.ownerPath.startsWith('content/')).toBe(true);
    expect(
      crossMountVerdicts(measured, registrations, component).find(
        ({ id }) => id === quiz.mountId,
      )!.observed.clauses,
    ).toEqual([
      'clause:equivalent-inputs-equivalent-readouts',
      'clause:model-predicted-from-declared-defaults-and-own-props',
    ]);
    const quizPlant = crossMountVerdicts(
      replant((planted) => {
        const mount = planted.siblingMounts.find(
          ({ mountId }) => mountId === quiz.mountId,
        )!;
        mount.initialReadout = '61.4%';
        mount.resetReadout = '61.4%';
        mount.secondResetReadout = '61.4%';
      }),
      registrations,
      component,
    ).filter(({ failures }) => failures.length > 0);
    expect(quizPlant.map(({ id }) => id)).toEqual([quiz.mountId]);
    expect(quizPlant[0].failures.join(' ')).toMatch(
      /opens 61.4% where the shared model predicts/,
    );
    const quizBehaviour = crossMountVerdicts(
      replant((planted) => {
        const mount = planted.siblingMounts.find(
          ({ mountId }) => mountId === quiz.mountId,
        )!;
        mount.drivenReadout = '12.3%';
      }),
      registrations,
      component,
    ).filter(({ failures }) => failures.length > 0);
    expect(quizBehaviour.map(({ id }) => id)).toEqual([quiz.mountId]);
    expect(quizBehaviour[0].failures.join(' ')).toMatch(
      /reads 12.3% where home reads/,
    );

    // Clause 4's other input: the component's own declared default. Moving
    // it moves the value every mount that inherits it has to print, which is
    // what makes the number a reading of the component rather than a copy.
    const movedDefault = crossMountVerdicts(
      measured,
      registrations,
      { ...component, steps: component.steps - 1 },
    ).filter(({ failures }) => failures.length > 0);
    expect(movedDefault.map(({ id }) => id)).toContain(
      measured.featured.mountId,
    );
    expect(movedDefault.map(({ id }) => id)).not.toContain(quiz.mountId);

    // A registered mount nobody measured, and a measured mount nobody
    // registered, both refuse rather than reading as a complete population.
    expect(() =>
      crossMountVerdicts(
        measured,
        [
          ...registrations,
          {
            mountId: 'mount:/nowhere/:ReliabilityCompounding:1',
            route: '/nowhere/',
            ownerPath: 'content/nowhere.mdx',
            props: '/',
            containers: [],
          },
        ],
        component,
      ),
    ).toThrow(/which the measured population does not contain/);
    expect(() =>
      crossMountVerdicts(
        measured,
        registrations.filter(
          ({ mountId }) => mountId !== measured.siblingMounts[0].mountId,
        ),
        component,
      ),
    ).toThrow(/which the interactive registry does not register/);

    // VAL-DESIGN-015: one printed total that no expectation explains fails
    // the surface, even where another total on the same page reconciles.
    const surfaces = progressCounterSurfaces();
    const aToZ = surfaces.find(({ id }) => id === 'route:/a-z/')!;
    const plantedCounts = progressCounterVerdicts(
      {
        ...measured,
        progressCounters: measured.progressCounters.map((row) =>
          row.routeId === aToZ.id
            ? { ...row, unreconciledCounts: ['84 citations'] }
            : row,
        ),
      },
      surfaces,
    );
    expect(
      plantedCounts
        .filter(({ failures }) => failures.length > 0)
        .map(({ id }) => id),
    ).toEqual([aToZ.id]);
    expect(plantedCounts.flatMap(({ failures }) => failures).join(' ')).toMatch(
      /prints "84 citations", which no declared expectation explains/,
    );

    // And each required member is demanded on its own: dropping the glossary
    // total from the A-Z index used to leave the article total reconciling
    // alone and the surface passing.
    const droppedMember = progressCounterVerdicts(
      {
        ...measured,
        progressCounters: measured.progressCounters.map((row) =>
          row.routeId === aToZ.id
            ? {
                ...row,
                reconciledCounts: row.reconciledCounts.filter(
                  ({ memberId }) => memberId !== 'count:/a-z/:glossary-terms',
                ),
              }
            : row,
        ),
      },
      surfaces,
    );
    expect(
      droppedMember
        .filter(({ failures }) => failures.length > 0)
        .map(({ id }) => id),
    ).toEqual([aToZ.id]);
    expect(droppedMember.flatMap(({ failures }) => failures).join(' ')).toMatch(
      /"count:\/a-z\/:glossary-terms" \(\d+\) went unmeasured/,
    );
    // The baseline half: the unplanted artifact is accepted by the same
    // reader that refused both plants.
    expect(
      progressCounterVerdicts(measured, surfaces).flatMap(
        ({ failures }) => failures,
      ),
    ).toEqual([]);

    const plantedOverflow = responsiveOverflowVerdicts(
      {
        ...measured,
        responsive: measured.responsive.map((row) =>
          row.route === HOME_TOOLS_ROUTE
            ? { ...row, documentScrollWidthPx: row.documentClientWidthPx + 40 }
            : row,
        ),
      },
      brandV2Registry.routes.public,
    );
    expect(
      plantedOverflow
        .filter(({ failures }) => failures.length > 0)
        .map(({ id }) => id),
    ).toEqual(['route:/']);

    const plantedBounds = homeDesignBoundVerdicts({
      ...measured,
      designBounds: {
        ...measured.designBounds,
        borderedBoxCount: 99,
      },
    });
    expect(
      plantedBounds
        .filter(({ failures }) => failures.length > 0)
        .map(({ id }) => id),
    ).toEqual(['bound:home-bordered-boxes']);
  });
});
