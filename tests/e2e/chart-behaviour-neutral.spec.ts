import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { publishedModules } from '../../data/modules';
import { PLAYWRIGHT_SWIFTSHADER_ARGS } from '../../playwright.config';
import type { ChartDescriptionEntry } from '../../lib/chart-description-rules';
import { CHART_DESCRIPTIONS } from '../../lib/chart-descriptions';
import { collectConsole } from './helpers/console';
import { openHowThisWasMade } from './helpers/figure-fold';
import { stateDigest } from './helpers/interactive-state-digest';
import { openClosedAncestorDetails } from './helpers/open-ancestor-details';
import { inOwnContext } from './helpers/per-route-context';
import { waitForHydration } from './interaction-ready';
import { settleTransitions } from './settle';
import { startStaticExportServer, type StaticExportServer } from './static-export-server';

/**
 * VAL-EDU-030 under its owner-approved successor S1: the chart retrofit is
 * behaviour-neutral, judged per figure frame against that frame's own
 * settled state on the current build. No stored capture is read.
 *
 * Population: every mounted CHART_DESCRIPTIONS entry, joined through the
 * interactive registry (`contract/brand-v2-registries.json`, source by file,
 * then every mount of that source) to the published article routes, `/`
 * excluded (VAL-EDU-027 owns it). The sweep visits every published article
 * and requires the routes that render a frame with a chart-data disclosure
 * to equal that derived set exactly. The owner route alone is not enough:
 * a chart can be mounted on a second article.
 *
 * Measured frames are the `[data-figure-frame]` elements that own a
 * `details[data-chart-data]`. A frame's roots are its top-level `svg` (no
 * `svg` ancestor) and `canvas` elements that are not `aria-hidden="true"`,
 * outside its folds and outside any nested frame. A drawing inside a fold is
 * the fold's own content, so its growth is graded by the height accounting,
 * not as a resized chart. Root boxes are taken relative to the frame's
 * top-left; the frame box is in page coordinates, so a scroll is not a shift.
 *
 * A state is settled after the transitions finish and two reads 100 ms
 * apart agree.
 *
 * (1) Open "How this was made" by its summary, toggle each chart-data
 * disclosure away from its default and back, close the fold: at every step
 * each root's offset, width and height and the frame width stay within 2 px
 * of the settled state.
 * (2) For the fold and each toggle, the frame's height change equals the
 * toggled element's own height change plus the change in its gap to the box
 * below it (its next laid-out sibling, or the frame's bottom edge), within
 * 4 px. The frame never ends shorter than settled while the fold is open,
 * and is back within 2 px once it closes.
 * (3) The primary control is the first range, option or toggle in the
 * frame's visible controls row outside any fold, never a secondary action.
 * Operated by keyboard it changes the readout and moves no root or frame
 * edge more than 2 px, and the keyboard returns the figure to its state.
 *
 * Per route: zero axe violations at 1440 when settled, zero console errors
 * over the whole visit, and `scrollWidth === innerWidth` at 375.
 *
 * The run's evidence goes to test-results/edu-030/geometry.json, or to the
 * tracked evidence/edu-030/geometry.json under EDU030_WRITE_EVIDENCE=1.
 */

// GPU rasterisation under SwiftShader draws a large isometric stage at a
// frame every few seconds, and the figures cap each frame's time step, so a
// 5 s run replayed by a choice took minutes, and two reads 100 ms apart
// could agree in the middle of a run (/rl-sim2real/offline-rl/, the
// stitching figure). Full software rasterisation draws it in real time; no
// frame in this population draws WebGL.
test.use({
  launchOptions: {
    args: [...PLAYWRIGHT_SWIFTSHADER_ARGS, '--disable-gpu-rasterization', '--disable-partial-raster'],
  },
});

const OUT = join(process.cwd(), 'out');
/**
 * The tracked evidence is rewritten only when EDU030_WRITE_EVIDENCE=1 asks
 * for it, so a validation run leaves the tree clean; any other run writes the
 * same file under test-results/, which is not tracked. The assertions do not
 * depend on where it goes.
 */
const EVIDENCE =
  process.env.EDU030_WRITE_EVIDENCE === '1'
    ? join(process.cwd(), 'evidence', 'edu-030', 'geometry.json')
    : join(process.cwd(), 'test-results', 'edu-030', 'geometry.json');
const REGISTRIES = join(process.cwd(), 'contract', 'brand-v2-registries.json');

const GEOMETRY_VIEWPORT = { width: 1440, height: 900 };
const OVERFLOW_VIEWPORT = { width: 375, height: 812 };
const BOX_TOLERANCE_PX = 2;
const HEIGHT_RESIDUAL_PX = 4;
/** Sub-pixel layout rounding; anything larger is a frame shorter than settled. */
const SHRINK_EPSILON_PX = 0.5;
const SETTLE_INTERVAL_MS = 100;
const SETTLE_ATTEMPTS = 60;
/** A run can lead in for over a second before its readout first moves. */
const READOUT_REACH_MS = 3_000;
/** A choice can replay a run of several seconds before the figure holds still. */
const RESTORE_REACH_MS = 20_000;
const RESTORE_POLL_MS = 250;

const CHART_FRAME = '[data-figure-frame]';
const CANDIDATE_CONTROLS = [
  'input[type="range"]',
  'input[type="radio"]',
  'input[type="checkbox"]',
  'select',
  '[role="radio"]',
  '[role="switch"]',
  '[role="checkbox"]',
  '[role="tab"]',
  'button[aria-pressed]',
  'button[aria-checked]',
  'button[aria-selected]',
  'button[data-brand-control-id="control:selection"]',
  'button[data-brand-control-id="control:toggle"]',
].join(', ');

type RegistrySource = { id: string; sourcePath: string };
type RegistryMount = { sourceId: string; route: string };

function slash(path: string): string {
  return path.endsWith('/') ? path : `${path}/`;
}

const ARTICLE_ROUTES = publishedModules().map((m) => slash(`/${m.domain}/${m.slug}`));

function chartRoutePopulation(
  entries: readonly ChartDescriptionEntry[],
  sources: readonly RegistrySource[],
  mounts: readonly RegistryMount[],
  articles: ReadonlySet<string>,
) {
  const routes = new Set<string>();
  const joins = entries
    .filter((entry) => !entry.unmounted)
    .map((entry) => {
      const sourceIds = new Set(sources.filter((s) => s.sourcePath === entry.file).map((s) => s.id));
      const mountRoutes = mounts.filter((m) => sourceIds.has(m.sourceId)).map((m) => slash(m.route));
      const candidates = [...new Set([slash(entry.route), ...mountRoutes])];
      const routesKept = candidates.filter((route) => route !== '/' && articles.has(route));
      for (const route of routesKept) routes.add(route);
      return {
        component: entry.component,
        file: entry.file,
        owner: slash(entry.route),
        sourceIds: [...sourceIds],
        mountRoutes,
        routesKept,
        routesDropped: candidates.filter((route) => !routesKept.includes(route)),
      };
    });
  return {
    entries: entries.length,
    unmounted: entries.filter((entry) => entry.unmounted).map((entry) => entry.component),
    joins,
    routes: [...routes].sort(),
  };
}

function derivePopulation() {
  const registries = JSON.parse(readFileSync(REGISTRIES, 'utf8')) as {
    interactive: { sources: RegistrySource[]; mounts: RegistryMount[] };
  };
  return chartRoutePopulation(
    CHART_DESCRIPTIONS,
    registries.interactive.sources,
    registries.interactive.mounts,
    new Set(ARTICLE_ROUTES),
  );
}

type Box = { x: number; y: number; width: number; height: number };
type Root = { kind: 'svg' | 'canvas'; label: string; box: Box };
type Section = { box: Box; open: boolean; gap: number; gapTo: string };
type Snapshot = {
  container: Box;
  roots: Root[];
  fold: Section | null;
  disclosures: (Section & { domIndex: number })[];
};
type Step = { step: string; snapshot: Snapshot; settledAfterReads: number };

/** The frame's geometry, read in the page. Kept self-contained for evaluate. */
function snapshotInPage(index: number): Snapshot {
  const frame = document.querySelectorAll('[data-figure-frame]')[index] as HTMLElement;
  const frameRect = frame.getBoundingClientRect();
  const r2 = (value: number) => Math.round(value * 100) / 100;
  const relative = (rect: DOMRect): Box => ({
    x: r2(rect.x - frameRect.x),
    y: r2(rect.y - frameRect.y),
    width: r2(rect.width),
    height: r2(rect.height),
  });
  const owned = (element: Element) => element.closest('[data-figure-frame]') === frame;
  const inFold = (element: Element) => {
    const fold = element.closest('[data-figure-fold]');
    return Boolean(fold && frame.contains(fold));
  };
  const describe = (element: Element) => {
    const data = [...element.attributes].find(({ name }) => name.startsWith('data-'));
    return `${element.tagName.toLowerCase()}${data ? `[${data.name}]` : ''}`;
  };
  const flowItems = (parent: Element): Element[] =>
    [...parent.children].flatMap((child) =>
      getComputedStyle(child).display === 'contents' ? flowItems(child) : [child],
    );
  const section = (element: HTMLDetailsElement): Section => {
    const rect = element.getBoundingClientRect();
    const below = flowItems(element.parentElement!)
      .filter((other) => other !== element && other.getClientRects().length > 0)
      .filter((other) => !['absolute', 'fixed'].includes(getComputedStyle(other).position))
      .map((other) => ({ other, top: other.getBoundingClientRect().top }))
      .filter(({ top }) => top >= rect.bottom - 0.5)
      .sort((a, b) => a.top - b.top)[0];
    return {
      box: relative(rect),
      open: element.open,
      gap: r2(below ? below.top - rect.bottom : frameRect.bottom - rect.bottom),
      gapTo: below ? describe(below.other) : 'container-bottom',
    };
  };
  const roots = [...frame.querySelectorAll('svg, canvas')]
    .filter((element) => owned(element) && !inFold(element))
    .filter((element) => !element.parentElement?.closest('svg'))
    .filter((element) => element.getAttribute('aria-hidden') !== 'true')
    .map((element) => ({
      kind: element.tagName.toLowerCase() === 'canvas' ? ('canvas' as const) : ('svg' as const),
      label: (element.getAttribute('aria-label') ?? element.getAttribute('role') ?? '').slice(0, 80),
      box: relative(element.getBoundingClientRect()),
    }));
  const fold = [...frame.querySelectorAll<HTMLDetailsElement>('details[data-figure-fold="method"]')].find(owned) ?? null;
  const disclosures = fold
    ? [...fold.querySelectorAll<HTMLDetailsElement>('details[data-chart-data]')]
        .map((element, domIndex) => ({ element, domIndex }))
        .filter(({ element }) => owned(element))
        .map(({ element, domIndex }) => ({ ...section(element), domIndex }))
    : [];
  return {
    container: {
      x: r2(frameRect.x + window.scrollX),
      y: r2(frameRect.y + window.scrollY),
      width: r2(frameRect.width),
      height: r2(frameRect.height),
    },
    roots,
    fold: fold ? section(fold) : null,
    disclosures,
  };
}

/** The frame's readouts, its stage text, and the spoken value of a range. */
function readoutInPage(index: number) {
  const frame = document.querySelectorAll('[data-figure-frame]')[index] as HTMLElement;
  const owned = (element: Element) => element.closest('[data-figure-frame]') === frame;
  const inFold = (element: Element) => {
    const fold = element.closest('[data-figure-fold]');
    return Boolean(fold && frame.contains(fold));
  };
  const visible = (element: Element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 1 && rect.height > 1;
  };
  const text = (element: Element) => (element.textContent ?? '').replace(/\s+/g, ' ').trim();
  // The status label ("Illustrative, not measured") says how the figure was
  // made and never moves with a control, so it is not a readout.
  const surfaces = [
    ...frame.querySelectorAll('[data-readout], [data-figure-readout], [aria-live], [role="status"]'),
  ].filter(
    (element) =>
      owned(element) &&
      !inFold(element) &&
      visible(element) &&
      !element.closest('[data-fold-readout-relay], [data-figure-status], [data-scene-status]'),
  );
  const outermost = surfaces.filter((element) => !surfaces.some((other) => other !== element && other.contains(element)));
  return {
    readout: outermost.map(text).filter(Boolean).join(' | '),
    description: [...frame.querySelectorAll('[data-chart-description]')].filter(owned).map(text).join(' | '),
    stage: [...frame.querySelectorAll('[data-figure-stage]')].filter(owned).map(text).join(' | '),
  };
}

/** The frame's state as lines, read the way `stateDigest` reads it, to name a residue. */
function stateLinesInPage(index: number): string[] {
  const frame = document.querySelectorAll('[data-figure-frame]')[index] as HTMLElement;
  const lines: string[] = [];
  const walk = (node: Node, path: string) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const value = (node.textContent ?? '').trim();
      if (value) lines.push(`${path} "${value.slice(0, 120)}"`);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node as HTMLElement;
    const attributes = [...element.attributes]
      .filter(({ name }) => name !== 'data-inview' && !name.startsWith('data-ledger-'))
      .map(({ name, value }) => `${name}="${value.slice(0, 80)}"`)
      .sort();
    const here = `${path}/${element.tagName.toLowerCase()}`;
    lines.push(`${here} ${attributes.join(' ')}`);
    if (element.matches('[aria-live], [role="status"], [role="alert"]')) return;
    [...element.childNodes].forEach((child, k) => walk(child, `${here}[${k}]`));
  };
  walk(frame, '');
  for (const control of frame.querySelectorAll('input, select, textarea')) {
    lines.push(
      control instanceof HTMLInputElement
        ? `control ${control.type}:${control.value}:${control.checked}`
        : `control ${(control as HTMLSelectElement).value}`,
    );
  }
  return lines;
}

type Readout = { readout: string; description: string; stage: string; valuetext: string };
type ControlKind = 'range' | 'option' | 'toggle' | 'select';
type PrimaryControl = {
  candidateIndex: number;
  kind: ControlKind;
  name: string;
  value: string;
  min: number;
  max: number;
  step: number;
  /** For an option group: the option pressed, and the one selected at default. */
  targetIndex: number;
  originalIndex: number | null;
  resetIndex: number | null;
};

function primaryControlInPage({ index, selector }: { index: number; selector: string }): PrimaryControl | { reason: string } {
  const frame = document.querySelectorAll('[data-figure-frame]')[index] as HTMLElement;
  const owned = (element: Element) => element.closest('[data-figure-frame]') === frame;
  const inFold = (element: Element) => {
    const fold = element.closest('[data-figure-fold]');
    return Boolean(fold && frame.contains(fold));
  };
  const visible = (element: Element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== 'hidden';
  };
  const all = [...frame.querySelectorAll<HTMLElement>(selector)];
  const row = [...frame.querySelectorAll('[data-figure-controls]')].find(owned);
  if (!row || !visible(row)) return { reason: 'no visible controls row' };
  const eligible = (element: HTMLElement) =>
    owned(element) &&
    row.contains(element) &&
    !inFold(element) &&
    visible(element) &&
    element.getAttribute('data-brand-control-id') !== 'control:secondary-action' &&
    !(element as HTMLButtonElement).disabled &&
    element.getAttribute('aria-disabled') !== 'true';
  const primary = all.find(eligible);
  if (!primary) return { reason: 'no range, option or toggle in the controls row outside a fold' };
  const name = (element: HTMLElement) =>
    (
      element.getAttribute('aria-label') ??
      (element.id ? document.querySelector(`label[for="${CSS.escape(element.id)}"]`)?.textContent : null) ??
      element.textContent ??
      ''
    )
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 100);
  const selected = (element: HTMLElement) =>
    element.getAttribute('aria-pressed') === 'true' ||
    element.getAttribute('aria-checked') === 'true' ||
    element.getAttribute('aria-selected') === 'true' ||
    (element instanceof HTMLInputElement && element.checked);
  const resets = [...frame.querySelectorAll<HTMLElement>('[data-instrument-reset]')].filter(owned);
  const resetIndex = resets.length
    ? [...frame.querySelectorAll<HTMLElement>('[data-instrument-reset]')].indexOf(resets[0])
    : null;
  const base = {
    candidateIndex: all.indexOf(primary),
    name: name(primary),
    value: '',
    min: 0,
    max: 0,
    step: 1,
    targetIndex: all.indexOf(primary),
    originalIndex: null as number | null,
    resetIndex,
  };
  if (primary instanceof HTMLInputElement && primary.type === 'range') {
    return {
      ...base,
      kind: 'range',
      value: primary.value,
      min: Number(primary.min || 0),
      max: Number(primary.max || 100),
      step: Number(primary.step) || 1,
    };
  }
  if (primary instanceof HTMLSelectElement) return { ...base, kind: 'select', value: primary.value };
  const radioName = primary instanceof HTMLInputElement && primary.type === 'radio' ? primary.name : null;
  const group = radioName
    ? null
    : primary.closest('[role="group"], [role="radiogroup"], [role="tablist"], [data-brand-control-id="control:segmented"]');
  const options = radioName
    ? all.filter((element) => element instanceof HTMLInputElement && element.type === 'radio' && element.name === radioName)
    : group
      ? all.filter((element) => group.contains(element) && eligible(element))
      : [primary];
  if (options.length < 2) {
    return { ...base, kind: 'toggle', value: String(selected(primary)) };
  }
  const target = options.find((element) => !selected(element));
  const original = options.find(selected) ?? null;
  if (!target) return { reason: 'every option in the primary group is already selected' };
  return {
    ...base,
    kind: 'option',
    value: original ? name(original) : '(none selected)',
    targetIndex: all.indexOf(target),
    originalIndex: original ? all.indexOf(original) : null,
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function delta(a: Box, b: Box): Box {
  return {
    x: round(b.x - a.x),
    y: round(b.y - a.y),
    width: round(b.width - a.width),
    height: round(b.height - a.height),
  };
}

function sameGeometry(a: Snapshot, b: Snapshot): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function snapshot(page: Page, index: number): Promise<Snapshot> {
  return page.evaluate(snapshotInPage, index);
}

/** Wait for the transitions, then for two reads 100 ms apart to agree. */
async function settled(page: Page, index: number): Promise<{ snapshot: Snapshot; reads: number }> {
  await settleTransitions(page);
  let previous = await snapshot(page, index);
  for (let reads = 2; reads <= SETTLE_ATTEMPTS + 1; reads += 1) {
    await page.waitForTimeout(SETTLE_INTERVAL_MS);
    const current = await snapshot(page, index);
    if (sameGeometry(previous, current)) return { snapshot: current, reads };
    previous = current;
  }
  throw new Error(`frame ${index} did not hold still for ${SETTLE_INTERVAL_MS} ms within ${SETTLE_ATTEMPTS} reads`);
}

async function settlePage(page: Page) {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await settleTransitions(page);
}

function sliderReturnKeys(from: number, to: number, facts: { min: number; max: number; step: number }): string[] {
  const steps = (value: number) => Math.round((value - facts.min) / facts.step);
  const at = steps(from);
  const target = steps(to);
  const last = steps(facts.max);
  const direct = Array.from({ length: Math.abs(target - at) }, () => (target > at ? 'ArrowRight' : 'ArrowLeft'));
  const viaHome = ['Home', ...Array.from({ length: target }, () => 'ArrowRight')];
  const viaEnd = ['End', ...Array.from({ length: last - target }, () => 'ArrowLeft')];
  return [direct, viaHome, viaEnd].sort((a, b) => a.length - b.length)[0];
}

function compressKeys(keys: readonly string[]): string[] {
  const out: string[] = [];
  for (const key of keys) {
    const last = out[out.length - 1];
    const match = last?.match(/^(.+?)(?: x(\d+))?$/);
    if (match && match[1] === key) out[out.length - 1] = `${key} x${Number(match[2] ?? 1) + 1}`;
    else out.push(key);
  }
  return out;
}

async function pressAll(page: Page, keys: readonly string[]) {
  for (const key of keys) await page.keyboard.press(key);
}

/** Wait until `read` differs from `before`, up to `reach` ms. */
async function waitForChange<T>(
  page: Page,
  before: T,
  read: () => Promise<T>,
  reach: number,
  interval = SETTLE_INTERVAL_MS,
): Promise<T> {
  const deadline = Date.now() + reach;
  let current = await read();
  while (JSON.stringify(current) === JSON.stringify(before) && Date.now() < deadline) {
    await page.waitForTimeout(interval);
    current = await read();
  }
  return current;
}

type FrameRecord = {
  index: number;
  id: string;
  openedAncestors: number;
  rootCount: number;
  canvasRoots: number;
  foldContentSvgs: number;
  disclosureDefaults: boolean[];
  steps: Array<Step & { deltaFromSettled: { container: Box; roots: Box[] } }>;
  heightAccounting: Array<{
    step: string;
    element: string;
    containerGrowth: number;
    ownGrowth: number;
    gapGrowth: number;
    contentGrowth: number;
    residual: number;
    gapTo: string;
  }>;
  afterClose: { containerHeightDelta: number; containerWidthDelta: number };
  control:
    | { noPrimaryControl: true; reason: string }
    | {
        noPrimaryControl: false;
        kind: ControlKind;
        name: string;
        operated: string;
        keys: string[];
        valueBefore: string;
        valueAfter: string;
        readoutBefore: Readout;
        readoutAfter: Readout;
        /** The readout parts that changed; empty fails. */
        readoutChanged: (keyof Readout)[];
        before: { container: Box; roots: Box[] };
        after: { container: Box; roots: Box[] };
        delta: { container: Box; roots: Box[] };
        restore: {
          keys: string[];
          via: 'control' | 'reset';
          restored: boolean;
          residue: { lost: string[]; gained: string[] };
        };
      };
  failures: string[];
};

type RouteRecord = {
  route: string;
  frames: FrameRecord[];
  axe: { violations: unknown[]; passes: number; incomplete: number; inapplicable: number };
  overflow: { width: number; scrollWidth: number; innerWidth: number; reads: number };
  console: { errors: string[]; overflowErrors: string[]; messages: Array<{ type: string; text: string }> };
  failures: string[];
};

function exceeds(box: Box, keys: ReadonlyArray<keyof Box>, tolerance: number): string[] {
  return keys.filter((key) => Math.abs(box[key]) > tolerance).map((key) => `${key} ${box[key]}`);
}

async function measureFrame(page: Page, route: string, index: number, id: string): Promise<FrameRecord> {
  const failures: string[] = [];
  const fail = (message: string) => failures.push(`${route} ${id}: ${message}`);
  const frame = page.locator(CHART_FRAME).nth(index);
  const openedAncestors = await openClosedAncestorDetails(frame);
  await frame.scrollIntoViewIfNeeded();
  await waitForHydration(frame);

  const census = await frame.evaluate((element) => {
    const owned = (node: Element) => node.closest('[data-figure-frame]') === element;
    const svgs = [...element.querySelectorAll('svg')].filter((svg) => owned(svg) && !svg.parentElement?.closest('svg'));
    return {
      foldContentSvgs: svgs.filter((svg) => {
        const fold = svg.closest('[data-figure-fold]');
        return Boolean(fold && element.contains(fold));
      }).length,
    };
  });

  const steps: FrameRecord['steps'] = [];
  const heightAccounting: FrameRecord['heightAccounting'] = [];
  const s0 = await settled(page, index);
  const record = (step: string, state: { snapshot: Snapshot; reads: number }) => {
    steps.push({
      step,
      snapshot: state.snapshot,
      settledAfterReads: state.reads,
      deltaFromSettled: {
        container: delta(s0.snapshot.container, state.snapshot.container),
        roots: state.snapshot.roots.map((root, k) =>
          s0.snapshot.roots[k] ? delta(s0.snapshot.roots[k].box, root.box) : root.box,
        ),
      },
    });
  };
  record('settled', s0);
  if (!s0.snapshot.fold) fail('no "How this was made" fold owns the chart-data disclosure');

  const account = (step: string, element: string, from: Snapshot, to: Snapshot, a: Section, b: Section) => {
    const containerGrowth = round(to.container.height - from.container.height);
    const ownGrowth = round(b.box.height - a.box.height);
    const gapGrowth = round(b.gap - a.gap);
    const contentGrowth = round(ownGrowth + gapGrowth);
    const residual = round(containerGrowth - contentGrowth);
    heightAccounting.push({ step, element, containerGrowth, ownGrowth, gapGrowth, contentGrowth, residual, gapTo: b.gapTo });
    if (Math.abs(residual) > HEIGHT_RESIDUAL_PX) {
      fail(`clause 2 ${step}: frame grew ${containerGrowth} px, ${element} accounts for ${contentGrowth} px (residual ${residual})`);
    }
  };

  const disclosureDefaults = s0.snapshot.disclosures.map((d) => d.open);
  if (s0.snapshot.fold) {
    const fold = await openHowThisWasMade(frame);
    const s1 = await settled(page, index);
    record('method fold open', s1);
    account('method fold open', 'method fold', s0.snapshot, s1.snapshot, s0.snapshot.fold, s1.snapshot.fold!);
    let previous = s1.snapshot;
    for (const [k, disclosure] of s1.snapshot.disclosures.entries()) {
      const details = fold.locator('details[data-chart-data]').nth(disclosure.domIndex);
      const summary = details.locator(':scope > summary');
      for (const phase of ['away from default', 'back to default'] as const) {
        const wasOpen = await details.evaluate((element) => (element as HTMLDetailsElement).open);
        await summary.click();
        await expect(details).toHaveJSProperty('open', !wasOpen);
        const state = await settled(page, index);
        const step = `chart-data disclosure ${k + 1} ${phase} (${wasOpen ? 'closed' : 'opened'})`;
        record(step, state);
        account(step, `chart-data disclosure ${k + 1}`, previous, state.snapshot, previous.disclosures[k], state.snapshot.disclosures[k]);
        previous = state.snapshot;
      }
      if (previous.disclosures[k].open !== disclosure.open) fail(`chart-data disclosure ${k + 1} did not return to its default`);
    }
    await fold.locator(':scope > summary').click();
    await expect(fold).toHaveJSProperty('open', false);
    record('method fold closed', await settled(page, index));
  }

  for (const step of steps) {
    const { snapshot: state, deltaFromSettled } = step;
    if (state.roots.length !== s0.snapshot.roots.length) {
      fail(`clause 1 ${step.step}: ${state.roots.length} roots, settled had ${s0.snapshot.roots.length}`);
    }
    deltaFromSettled.roots.forEach((rootDelta, k) => {
      const over = exceeds(rootDelta, ['x', 'y', 'width', 'height'], BOX_TOLERANCE_PX);
      if (over.length) fail(`clause 1 ${step.step}: root ${k + 1} moved or resized (${over.join(', ')})`);
    });
    const width = exceeds(deltaFromSettled.container, ['width'], BOX_TOLERANCE_PX);
    if (width.length) fail(`clause 1 ${step.step}: frame ${width.join(', ')}`);
    if (step.step !== 'settled' && step.step !== 'method fold closed' && deltaFromSettled.container.height < -SHRINK_EPSILON_PX) {
      fail(`clause 2 ${step.step}: frame is ${deltaFromSettled.container.height} px shorter than settled while the fold is open`);
    }
  }
  const closed = steps[steps.length - 1];
  const afterClose = {
    containerHeightDelta: closed.deltaFromSettled.container.height,
    containerWidthDelta: closed.deltaFromSettled.container.width,
  };
  if (Math.abs(afterClose.containerHeightDelta) > BOX_TOLERANCE_PX) {
    fail(`clause 2 after the fold closed: frame height is ${afterClose.containerHeightDelta} px from settled`);
  }

  const control = await measurePrimaryControl(page, frame, index, fail);
  return {
    index,
    id,
    openedAncestors,
    rootCount: s0.snapshot.roots.length,
    canvasRoots: s0.snapshot.roots.filter((root) => root.kind === 'canvas').length,
    foldContentSvgs: census.foldContentSvgs,
    disclosureDefaults,
    steps,
    heightAccounting,
    afterClose,
    control,
    failures,
  };
}

async function measurePrimaryControl(
  page: Page,
  frame: Locator,
  index: number,
  fail: (message: string) => void,
): Promise<FrameRecord['control']> {
  const found = await page.evaluate(primaryControlInPage, { index, selector: CANDIDATE_CONTROLS });
  if ('reason' in found) return { noPrimaryControl: true, reason: found.reason };
  const candidates = frame.locator(CANDIDATE_CONTROLS);
  const primary = candidates.nth(found.candidateIndex);
  const target = candidates.nth(found.targetIndex);
  await waitForHydration(primary);

  const valueOf = async () =>
    found.kind === 'range' || found.kind === 'select'
      ? primary.evaluate((element) => (element as HTMLInputElement).value)
      : target.evaluate((element) =>
          String(
            element.getAttribute('aria-pressed') ??
              element.getAttribute('aria-checked') ??
              element.getAttribute('aria-selected') ??
              (element as HTMLInputElement).checked,
          ),
        );
  // The readout is what the figure says about its state: its readout lines,
  // its chart description and the text drawn on its stage. A range's spoken
  // value only counts when the figure says nothing else.
  const readoutOf = async (): Promise<Readout> => {
    const now = await page.evaluate(readoutInPage, index);
    const valuetext = await primary.evaluate(
      (element) => element.getAttribute('aria-valuetext') ?? (element as HTMLInputElement).value ?? '',
    );
    return { ...now, valuetext: now.readout || now.description || now.stage ? '' : valuetext };
  };

  const digestBefore = await stateDigest(frame);
  const linesBefore = await page.evaluate(stateLinesInPage, index);
  const before = (await settled(page, index)).snapshot;
  const readoutBefore = await readoutOf();
  const valueBefore = await valueOf();

  let keys: string[];
  let returnKeys: () => Promise<string[]>;
  if (found.kind === 'range') {
    keys = [Number(found.value) < found.max ? 'End' : 'Home'];
    await primary.focus();
    returnKeys = async () => {
      const now = Number(await primary.evaluate((element) => (element as HTMLInputElement).value));
      await primary.focus();
      return sliderReturnKeys(now, Number(found.value), found);
    };
  } else if (found.kind === 'select') {
    keys = ['ArrowDown'];
    await primary.focus();
    returnKeys = async () => {
      await primary.focus();
      return ['ArrowUp'];
    };
  } else if (found.kind === 'toggle') {
    keys = ['Space'];
    await primary.focus();
    returnKeys = async () => {
      await primary.focus();
      return ['Space'];
    };
  } else {
    keys = ['Space'];
    await target.focus();
    returnKeys = async () => {
      if (found.originalIndex === null) return [];
      await candidates.nth(found.originalIndex).focus();
      return ['Space'];
    };
  }
  await pressAll(page, keys);
  const readoutAfter = await waitForChange(page, readoutBefore, readoutOf, READOUT_REACH_MS);
  const after = (await settled(page, index)).snapshot;
  const valueAfter = await valueOf();

  const rootDeltas = after.roots.map((root, k) => (before.roots[k] ? delta(before.roots[k].box, root.box) : root.box));
  const containerDelta = delta(before.container, after.container);
  const readoutChanged = (Object.keys(readoutBefore) as (keyof Readout)[]).filter(
    (part) => readoutAfter[part] !== readoutBefore[part],
  );
  if (valueAfter === valueBefore) fail(`clause 3: the primary control "${found.name}" did not respond to ${keys.join(' ')}`);
  if (!readoutChanged.length) fail(`clause 3: operating "${found.name}" left the readout, description and stage text unchanged`);
  if (after.roots.length !== before.roots.length) fail(`clause 3: ${after.roots.length} roots after the control, ${before.roots.length} before`);
  rootDeltas.forEach((rootDelta, k) => {
    const over = exceeds(rootDelta, ['x', 'y', 'width', 'height'], BOX_TOLERANCE_PX);
    if (over.length) fail(`clause 3: operating "${found.name}" moved or resized root ${k + 1} (${over.join(', ')})`);
  });
  const frameOver = exceeds(containerDelta, ['x', 'y', 'width', 'height'], BOX_TOLERANCE_PX);
  if (frameOver.length) fail(`clause 3: operating "${found.name}" moved or resized the frame (${frameOver.join(', ')})`);

  const restoreKeys = await returnKeys();
  await pressAll(page, restoreKeys);
  const returned = async () =>
    (await waitForChange(
      page,
      'pending',
      async () => ((await stateDigest(frame)) === digestBefore ? 'restored' : 'pending'),
      RESTORE_REACH_MS,
      RESTORE_POLL_MS,
    )) === 'restored';
  let via: 'control' | 'reset' = 'control';
  let restored = await returned();
  if (!restored && found.resetIndex !== null) {
    via = 'reset';
    restoreKeys.push(...(await pressResetByKeyboard(page, frame.locator('[data-instrument-reset]').nth(found.resetIndex))));
    restored = await returned();
  }
  let residue: { lost: string[]; gained: string[] } = { lost: [], gained: [] };
  if (!restored) {
    const linesAfter = await page.evaluate(stateLinesInPage, index);
    const now = new Set(linesAfter);
    const then = new Set(linesBefore);
    residue = {
      lost: linesBefore.filter((line) => !now.has(line)).slice(0, 12),
      gained: linesAfter.filter((line) => !then.has(line)).slice(0, 12),
    };
    fail(`clause 3: the keyboard did not return "${found.name}" to its default state`);
  }

  return {
    noPrimaryControl: false,
    kind: found.kind,
    name: found.name,
    operated: found.kind === 'option' ? `option ${found.targetIndex - found.candidateIndex + 1} of the group` : found.kind,
    keys,
    valueBefore,
    valueAfter,
    readoutBefore,
    readoutAfter,
    readoutChanged,
    before: { container: before.container, roots: before.roots.map((root) => root.box) },
    after: { container: after.container, roots: after.roots.map((root) => root.box) },
    delta: { container: containerDelta, roots: rootDeltas },
    restore: { keys: compressKeys(restoreKeys), via, restored, residue },
  };
}

/**
 * Presses the figure's reset by keyboard. A reset kept in "Adjust more" is
 * reached by opening that fold from its summary and closed the same way
 * afterwards, so the fold ends where it started.
 */
async function pressResetByKeyboard(page: Page, reset: Locator): Promise<string[]> {
  const keys: string[] = [];
  const ancestors = reset.locator('xpath=ancestor::details');
  const closed: Locator[] = [];
  for (let k = 0; k < (await ancestors.count()); k += 1) {
    const details = ancestors.nth(k);
    if (!(await details.evaluate((element) => (element as HTMLDetailsElement).open))) closed.push(details);
  }
  for (const details of closed) {
    await details.locator(':scope > summary').focus();
    await page.keyboard.press('Enter');
    await expect(details).toHaveJSProperty('open', true);
    keys.push('Enter (open fold)');
  }
  await reset.focus();
  await page.keyboard.press('Enter');
  keys.push('Enter (reset)');
  for (const details of [...closed].reverse()) {
    await details.locator(':scope > summary').focus();
    await page.keyboard.press('Enter');
    await expect(details).toHaveJSProperty('open', false);
    keys.push('Enter (close fold)');
  }
  return keys;
}

function gitHead() {
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const dirty = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .map((line) => line.slice(3))
    .filter((path) => !path.startsWith('evidence/edu-030/') && path !== 'next-env.d.ts');
  return { commit, uncommittedPaths: dirty };
}

/** Local servers on this machine stay inside 3200-3299; 3200 is the dev server's. */
const EXPORT_PORTS = { first: 3201, last: 3299 };

async function freeExportPort(): Promise<number> {
  for (let port = EXPORT_PORTS.first; port <= EXPORT_PORTS.last; port += 1) {
    const free = await new Promise<boolean>((resolve) => {
      const probe = createServer();
      probe.once('error', () => resolve(false));
      probe.listen(port, () => probe.close(() => resolve(true)));
    });
    if (free) return port;
  }
  throw new Error(`no free port in ${EXPORT_PORTS.first}-${EXPORT_PORTS.last} for the static export`);
}

let BASE: string;
let server: StaticExportServer | null = null;

test.beforeAll(async () => {
  expect(
    existsSync(join(OUT, 'index.html')),
    'out/ is missing or stale: run `npm run build` before the chart-behaviour-neutral spec',
  ).toBe(true);
  server = await startStaticExportServer(OUT, await freeExportPort());
  BASE = `http://localhost:${server.port}`;
});

test.afterAll(async () => {
  await server?.stop();
});

test.describe('chart retrofit is behaviour-neutral per figure frame (VAL-EDU-030, successor S1)', () => {
  test('the population joins the chart registry to published article routes and is not empty', () => {
    const population = derivePopulation();
    expect(population.routes.length, 'the derived population is empty').toBeGreaterThan(0);
    expect(population.routes).not.toContain('/');
    for (const route of population.routes) expect(ARTICLE_ROUTES).toContain(route);
  });

  test('every chart frame holds its geometry against its own settled state, with axe, console and 375 px overflow per route', async ({
    browser,
  }) => {
    test.setTimeout(60 * 60_000);
    const population = derivePopulation();
    const inPopulation = new Set(population.routes);
    const failures: string[] = [];
    const routes: RouteRecord[] = [];
    const rendered: Array<{ route: string; frames: number }> = [];

    for (const route of ARTICLE_ROUTES) {
      const record = await inOwnContext(
        browser,
        async (page): Promise<RouteRecord | null> => {
          const consoleLog = collectConsole(page);
          const messages: Array<{ type: string; text: string }> = [];
          page.on('console', (message) => messages.push({ type: message.type(), text: message.text() }));
          await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
          await settlePage(page);
          const frames = await page.evaluate(() =>
            [...document.querySelectorAll('[data-figure-frame]')]
              .map((frame, index) => ({ frame, index }))
              .filter(({ frame }) =>
                [...frame.querySelectorAll('details[data-chart-data]')].some(
                  (details) => details.closest('[data-figure-frame]') === frame,
                ),
              )
              .map(({ frame, index }) => ({ index, id: frame.getAttribute('data-figure-frame') ?? `frame-${index}` })),
          );
          if (frames.length) rendered.push({ route, frames: frames.length });
          if (!inPopulation.has(route)) return null;

          const axe = await new AxeBuilder({ page }).analyze();
          const routeFailures: string[] = [];
          if (axe.violations.length) {
            routeFailures.push(`${route}: ${axe.violations.length} axe violations (${axe.violations.map((v) => v.id).join(', ')})`);
          }
          const measured: FrameRecord[] = [];
          for (const { index, id } of frames) measured.push(await measureFrame(page, route, index, id));
          if (consoleLog.errors.length) routeFailures.push(`${route}: console errors at 1440: ${consoleLog.errors.join(' || ')}`);
          return {
            route,
            frames: measured,
            axe: {
              violations: axe.violations,
              passes: axe.passes.length,
              incomplete: axe.incomplete.length,
              inapplicable: axe.inapplicable.length,
            },
            overflow: { width: OVERFLOW_VIEWPORT.width, scrollWidth: -1, innerWidth: -1, reads: 0 },
            console: { errors: [...consoleLog.errors], overflowErrors: [], messages },
            failures: routeFailures,
          };
        },
        { viewport: GEOMETRY_VIEWPORT },
      );
      if (!record) continue;

      await inOwnContext(
        browser,
        async (narrow) => {
          const narrowLog = collectConsole(narrow);
          await narrow.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
          await settlePage(narrow);
          const read = () =>
            narrow.evaluate(() => ({
              scrollWidth: document.documentElement.scrollWidth,
              innerWidth: window.innerWidth,
            }));
          let previous = await read();
          let reads = 1;
          for (; reads <= SETTLE_ATTEMPTS; reads += 1) {
            await narrow.waitForTimeout(SETTLE_INTERVAL_MS);
            const current = await read();
            if (JSON.stringify(current) === JSON.stringify(previous)) break;
            previous = current;
          }
          record.overflow = { width: OVERFLOW_VIEWPORT.width, ...previous, reads: reads + 1 };
          if (previous.scrollWidth !== previous.innerWidth) {
            record.failures.push(`${route}: at 375 scrollWidth ${previous.scrollWidth} !== innerWidth ${previous.innerWidth}`);
          }
          record.console.overflowErrors = [...narrowLog.errors];
          if (narrowLog.errors.length) record.failures.push(`${route}: console errors at 375: ${narrowLog.errors.join(' || ')}`);
        },
        { viewport: OVERFLOW_VIEWPORT },
      );
      routes.push(record);
      failures.push(...record.failures, ...record.frames.flatMap((frame) => frame.failures));
    }

    const renderedRoutes = rendered.map(({ route }) => route).sort();
    const frameCount = routes.reduce((sum, route) => sum + route.frames.length, 0);
    const reconciliation = {
      articleRoutes: ARTICLE_ROUTES.length,
      excluded: ['/'],
      derivedRoutes: population.routes,
      renderedRoutes,
      derivedNotRendered: population.routes.filter((route) => !renderedRoutes.includes(route)),
      renderedNotDerived: renderedRoutes.filter((route) => !inPopulation.has(route)),
    };
    const reconciled =
      reconciliation.derivedNotRendered.length === 0 &&
      reconciliation.renderedNotDerived.length === 0 &&
      population.routes.length > 0;
    if (population.routes.length === 0) failures.push('population: the derived route population is empty');
    if (frameCount === 0) failures.push('population: no chart frame was measured');
    if (!reconciled) {
      failures.push(
        `population: derived and rendered route sets differ (derived not rendered: ${reconciliation.derivedNotRendered.join(', ') || 'none'}; rendered not derived: ${reconciliation.renderedNotDerived.join(', ') || 'none'})`,
      );
    }

    const frames = routes.flatMap((route) => route.frames);
    const evidence = {
      assertion: 'VAL-EDU-030',
      successor: 'S1 (contract/educational-ux.md, owner-approved 2026-10-23)',
      spec: 'tests/e2e/chart-behaviour-neutral.spec.ts',
      generatedAt: new Date().toISOString(),
      ...gitHead(),
      target: {
        build: 'static export (out/) served by tests/e2e/static-export-server.ts',
        exportIndexModifiedAt: statSync(join(OUT, 'index.html')).mtime.toISOString(),
        browser: `chromium ${browser.version()}`,
      },
      geometryReference: "each frame's own settled state on this build; no stored capture is read",
      viewports: { geometry: GEOMETRY_VIEWPORT, overflow: OVERFLOW_VIEWPORT },
      settle: `goto networkidle, document.fonts.ready, settleTransitions, then two reads ${SETTLE_INTERVAL_MS} ms apart agree`,
      tolerances: {
        boxPx: BOX_TOLERANCE_PX,
        heightResidualPx: HEIGHT_RESIDUAL_PX,
        shrinkEpsilonPx: SHRINK_EPSILON_PX,
      },
      population: {
        registryEntries: population.entries,
        unmountedEntries: population.unmounted,
        joins: population.joins,
        reconciliation,
        reconciled,
        routeCount: routes.length,
        frameCount,
        rootCount: frames.reduce((sum, frame) => sum + frame.rootCount, 0),
        canvasRootCount: frames.reduce((sum, frame) => sum + frame.canvasRoots, 0),
        chartDataDisclosures: frames.reduce((sum, frame) => sum + frame.disclosureDefaults.length, 0),
        framesWithPrimaryControl: frames.filter((frame) => !frame.control.noPrimaryControl).length,
        noPrimaryControl: frames
          .filter((frame) => frame.control.noPrimaryControl)
          .map((frame) => ({ id: frame.id, reason: 'reason' in frame.control ? frame.control.reason : '' })),
      },
      routes,
      failures,
      pass: failures.length === 0,
    };
    mkdirSync(dirname(EVIDENCE), { recursive: true });
    writeFileSync(EVIDENCE, `${JSON.stringify(evidence, null, 2)}\n`);

    expect(population.routes.length, 'the derived population is empty').toBeGreaterThan(0);
    expect(frameCount, 'no chart frame was measured').toBeGreaterThan(0);
    expect(reconciliation.renderedNotDerived).toEqual([]);
    expect(reconciliation.derivedNotRendered).toEqual([]);
    expect(failures).toEqual([]);
  });
});
