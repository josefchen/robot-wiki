import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Page } from '@playwright/test';
import { BRAND_V2_FLOW_SUITES, executeEvidencePlans } from '../../lib/brand-v2-runners';
import { COMPANIES } from '../../data/companies';
import { SEGMENT_LABELS } from '../../lib/market-map';
import {
  MARKET_MAP_AXE_CASES,
  MARKET_MAP_CASE_GROUPS,
  MARKET_MAP_DEFAULT_VIEW,
  MARKET_MAP_DIMENSION_CONTROLS,
  MARKET_MAP_FILTER_DIMENSIONS,
  MARKET_MAP_LATENCY_SAMPLES,
  MARKET_MAP_ROUTE,
  MARKET_MAP_STATES_EVIDENCE_PATH,
  MARKET_MAP_UPDATE_CEILING_MS,
  MARKET_MAP_VIEWPORT,
  expectedCountText,
  expectedFilterBarTabOrder,
  expectedSearchParams,
  historyExpectations,
  marketMapCaseGroupMemberId,
  marketMapCaseVerdicts,
  marketMapGroupCaseCounts,
  marketMapGroupVerdicts,
  marketMapKeyboardScript,
  marketMapStatePlan,
  marketMapStatesEvidenceFingerprint,
  readMarketMapStatesEvidence,
  type MarketMapCase,
  type MarketMapCaseObservation,
  type MarketMapCaseRecord,
  type MarketMapFilters,
  type MarketMapStatePlan,
  type MarketMapStatesEvidence,
  type MarketMapView,
} from '../../lib/brand-v2-market-map-states';
import { expect, test } from './brand-v2-static-fixture';

const ROOT = process.cwd();

function segment(page: Page, name: RegExp) {
  return page.getByRole('group', { name: 'Segment' }).getByRole('button', { name });
}

test.describe('brand-v2-market-map-states', () => {
  test('executes ordered view, filter, selection, and history phases', async ({
    page,
    staticBase,
  }) => {
    const flow = BRAND_V2_FLOW_SUITES['brand-v2-market-map-states'];
    const records = await executeEvidencePlans(
      [{ id: 'route:/market-map/', ...flow }],
      {
        step: async (_, step) => {
          if (step.order === 1) await page.goto(`${staticBase}/market-map/`);
          if (step.action === 'exercise-three-views') {
            for (const name of ['Grid', 'Bubble', 'Timeline']) {
              await page.getByRole('button', { name, exact: true }).click();
            }
          } else if (step.action === 'exercise-filters') {
            await segment(page, /^Humanoids/).click();
            await expect(
              page.getByText(new RegExp(`of ${COMPANIES.length} companies`)),
            ).toBeVisible();
            await page.getByRole('button', { name: 'Clear filters' }).click();
          } else if (step.action === 'select-dismiss-company') {
            await page.getByRole('button', { name: 'Bubble', exact: true }).click();
            const mark = page.locator('circle[data-company-id]').first();
            await mark.click();
            await expect(page.locator('[data-company-detail]')).toBeVisible();
            await expect(page).toHaveURL(/#company-/);
            await mark.click();
            await expect(page.locator('[data-company-detail]')).toHaveCount(0);
            expect(new URL(page.url()).hash).toBe('');
          } else if (step.action === 'history-restore') {
            await page.evaluate(() => {
              history.pushState({}, '', location.pathname);
            });
            await segment(page, /^Humanoids/).click();
            const filtered = page.url();
            await page.goBack();
            await expect(segment(page, /^All/)).toHaveAttribute('aria-pressed', 'true');
            await page.goForward();
            await expect(page).toHaveURL(filtered);
          } else {
            throw new Error(`Unsupported market-map flow action: ${step.action}`);
          }
        },
        capture: async (_, capture) => {
          await test.step(capture.id, async () => {
            await expect(page.getByRole('heading', { name: 'Market Map' })).toBeVisible();
          });
        },
      },
    );
    expect(records[0].steps).toHaveLength(flow.steps.length);
    expect(records[0].captures).toHaveLength(flow.captures.length);
  });
});

/* ------------------------------------------------------------------ */
/* The in-page probe                                                   */
/* ------------------------------------------------------------------ */

type ProbeConfig = {
  /** [visible tab label, segment id] */
  segments: Array<[string, string]>;
  /** [dimension, select element id] */
  selects: Array<[string, string]>;
  /** How long a step may take to land before the probe stops waiting. */
  reachTimeoutMs: number;
};

type Action = [control: string, value: string];

/**
 * The state a step should leave the page in: what the count reads, and the
 * view where the case has set one.
 */
type ReachTarget = { countText: string; view?: string };
type RunReach = { reset?: ReachTarget; steps?: Array<ReachTarget | undefined> };

/**
 * Installed before every document the sweep loads. It reads the page the
 * way a reader sees it (pressed tabs, select values, rendered tiles, marks
 * and rows, the count's text) and drives the real controls in-page, so a
 * case is one round trip. Nothing here decides what a case should produce:
 * every expectation lives in lib/brand-v2-market-map-states.ts, and the
 * driver passes only the count and view each step should settle on, so the
 * probe waits for an update to land before acting again.
 */
function installMarketMapProbe(config: ProbeConfig) {
  const segmentByLabel = new Map(config.segments);
  const selectByDimension = new Map(config.selects);
  const dimensionBySelect = new Map(config.selects.map(([dimension, id]) => [id, dimension]));
  const clean = (node: Node | null | undefined) =>
    (node?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const round = (ms: number) => Math.round(ms * 10) / 10;
  const frame = () =>
    new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  // A task boundary: React flushes a discrete event's update in a microtask,
  // so after this the next control reads the filters the last one wrote.
  const yieldTask = () =>
    new Promise<void>((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = () => resolve();
      channel.port2.postMessage(null);
    });
  const drainMicrotasks = async () => {
    for (let turn = 0; turn < 8; turn += 1) await Promise.resolve();
  };
  const settle = async () => {
    await frame();
    await frame();
    await new Promise((resolve) => setTimeout(resolve, 50));
  };

  const state = {
    docToken: `${performance.timeOrigin}-${Math.random().toString(36).slice(2)}`,
    pushes: 0,
    keydowns: [] as number[],
    keyTasks: [] as Array<{ at: number; end: number }>,
    countRecords: [] as Array<{ at: number; text: string }>,
    countNode: null as Element | null,
  };
  const pushState = history.pushState;
  history.pushState = function countedPushState(
    this: History,
    ...args: Parameters<History['pushState']>
  ) {
    state.pushes += 1;
    return pushState.apply(this, args);
  };
  window.addEventListener('keydown', () => state.keydowns.push(performance.now()), true);
  // Each key event's task spans from the event to the next task, which a
  // posted message marks; a region update recorded between the two (its
  // observer runs as a microtask of that task) came from that key.
  for (const type of ['keydown', 'keypress', 'keyup']) {
    window.addEventListener(
      type,
      () => {
        const task = { at: performance.now(), end: Number.POSITIVE_INFINITY };
        state.keyTasks.push(task);
        const channel = new MessageChannel();
        channel.port1.onmessage = () => {
          task.end = performance.now();
        };
        channel.port2.postMessage(null);
      },
      true,
    );
  }

  const segmentButtons = () => [
    ...document.querySelectorAll<HTMLButtonElement>(
      '[role="group"][aria-label="Segment"] button',
    ),
  ];
  const viewButtons = () => [
    ...document.querySelectorAll<HTMLButtonElement>('[role="group"][aria-label="View"] button'),
  ];
  const segmentIdOf = (button: HTMLButtonElement) => {
    const label = clean(button.firstChild);
    if (label === 'All') return 'all';
    return segmentByLabel.get(label) ?? `unlabelled:${label}`;
  };
  const viewIdOf = (button: HTMLButtonElement) => clean(button).toLowerCase();
  const countNode = () => document.querySelector('[data-result-count]');
  const controlRow = () => countNode()?.parentElement ?? null;
  const clearButton = () =>
    [...(controlRow()?.querySelectorAll<HTMLButtonElement>('button') ?? [])].find(
      (button) => clean(button) === 'Clear filters',
    ) ?? null;
  const moreButton = () =>
    controlRow()?.querySelector<HTMLButtonElement>('button[aria-expanded][aria-controls]') ?? null;
  const search = () => document.querySelector<HTMLInputElement>('[data-market-map-search]');
  const timelineRows = () => [...document.querySelectorAll('li[data-timeline-id]')];
  const timelineHits = () => [
    ...document.querySelectorAll('svg[data-timeline-plot] circle[fill="transparent"]'),
  ];

  const describe = (element: Element | null): string => {
    if (!element || element === document.body) return 'body';
    if (element instanceof HTMLButtonElement && element.closest('[aria-label="Segment"]')) {
      return `tab:${segmentIdOf(element)}`;
    }
    if (element.matches('[data-market-map-search]')) return 'search';
    if (element instanceof HTMLButtonElement && element.closest('[aria-label="View"]')) {
      return `view:${viewIdOf(element)}`;
    }
    if (element instanceof HTMLSelectElement) {
      return `select:${dimensionBySelect.get(element.id) ?? element.id}`;
    }
    if (element === moreButton()) return 'more-filters';
    if (element === clearButton()) return 'clear-filters';
    const tile = element.getAttribute('data-map-tile');
    if (tile) return `trigger:grid:${tile}`;
    if (element.matches('circle[data-company-id]')) {
      return `trigger:bubble:${element.getAttribute('data-company-id')}`;
    }
    const row = element.closest('li[data-timeline-id]');
    if (row && element instanceof HTMLButtonElement) {
      return `trigger:timeline:${row.getAttribute('data-company-id')}`;
    }
    if (element.closest('[role="dialog"]')) return `sheet:${element.tagName.toLowerCase()}`;
    return `${element.tagName.toLowerCase()}:${clean(element).slice(0, 40)}`;
  };

  const params = () =>
    Object.fromEntries(
      [...new URLSearchParams(location.search)].sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    );

  const snapshot = () => {
    const pressedView = viewButtons().find(
      (button) => button.getAttribute('aria-pressed') === 'true',
    );
    const view = pressedView ? viewIdOf(pressedView) : 'none';
    const pressedSegment = segmentButtons().find(
      (button) => button.getAttribute('aria-pressed') === 'true',
    );
    const segmentTabCounts: Record<string, number> = {};
    for (const button of segmentButtons()) {
      segmentTabCounts[segmentIdOf(button)] = Number(clean(button.querySelector('span')));
    }
    const bands: Record<string, number> = {};
    for (const section of document.querySelectorAll('section[data-segment]')) {
      bands[section.getAttribute('data-segment') ?? ''] = Number(
        clean(section.querySelector('h2 > span:last-child')),
      );
    }
    const empty = document.querySelector('[data-market-map-empty]');
    const selectValues: Record<string, string> = {};
    for (const [dimension, id] of selectByDimension) {
      selectValues[dimension] =
        (document.getElementById(id) as HTMLSelectElement | null)?.value ?? '';
    }
    return {
      docToken: state.docToken,
      pushes: state.pushes,
      view,
      params: params(),
      hash: location.hash,
      countText: clean(countNode()),
      renderedIds: [
        ...[...document.querySelectorAll('[data-map-tile]')].map(
          (tile) => tile.getAttribute('data-map-tile') ?? '',
        ),
        ...[...document.querySelectorAll('circle[data-company-id]')].map(
          (mark) => mark.getAttribute('data-company-id') ?? '',
        ),
        ...timelineRows().map((row) => row.getAttribute('data-company-id') ?? ''),
      ],
      segmentTabCounts,
      bandCounts: view === 'grid' ? bands : null,
      emptyState: empty !== null,
      emptyStateRole: empty?.getAttribute('role') ?? null,
      bubbleEmptyNote: [...document.querySelectorAll('[data-bubble-chart] p')].some((note) =>
        clean(note).startsWith('No company in this set has both'),
      ),
      timelineEmptyNote:
        view === 'timeline' &&
        [...document.querySelectorAll('p')].some(
          (note) => clean(note) === 'No 2023-2026 rounds in the current set.',
        ),
      pressedSegment: pressedSegment ? segmentIdOf(pressedSegment) : null,
      selectValues,
      query: search()?.value ?? '',
      moreOpen: moreButton()?.getAttribute('aria-expanded') ?? 'missing',
      sheetCompanyId:
        document
          .querySelector('[role="dialog"] [data-company-detail]')
          ?.getAttribute('data-company-detail') ?? null,
      sheetHeading: clean(document.querySelector('[role="dialog"] h2')) || null,
      focus: describe(document.activeElement),
    };
  };

  const act = ([control, value]: Action): boolean => {
    if (control === 'clear') {
      clearButton()?.click();
      return true;
    }
    if (control === 'segment') {
      const button = segmentButtons().find((candidate) => segmentIdOf(candidate) === value);
      button?.click();
      return button !== undefined;
    }
    if (control === 'view') {
      const button = viewButtons().find((candidate) => viewIdOf(candidate) === value);
      // A reader does not press the view they are already in. Pressing it
      // rewrites the same URL, and the router transition that write starts
      // would race the next synthetic event in the same few milliseconds,
      // a timing no keyboard or pointer can produce.
      if (button?.getAttribute('aria-pressed') !== 'true') button?.click();
      return button !== undefined;
    }
    if (control === 'query') {
      const input = search();
      if (!input) return false;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(
        input,
        value,
      );
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
    const id = selectByDimension.get(control);
    const select = id ? (document.getElementById(id) as HTMLSelectElement | null) : null;
    if (!select || ![...select.options].some((option) => option.value === value)) return false;
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  };

  const probe = {
    describe,
    snapshot,
    settle,
    /**
     * Applies the reset, then each action in turn. Where the driver names
     * the state an action should reach (the count text and the pressed
     * view), the probe waits for the page to show it before the next action,
     * up to a timeout, and times that one update; the latency reported is
     * the slowest update of the case. A state never reached is not hidden:
     * the snapshot still records whatever the page shows.
     */
    async run(reset: Action[], actions: Action[], reach: RunReach = {}) {
      const pressedView = () => {
        const pressed = viewButtons().find(
          (button) => button.getAttribute('aria-pressed') === 'true',
        );
        return pressed ? viewIdOf(pressed) : 'none';
      };
      const shows = (target: ReachTarget) =>
        clean(countNode()) === target.countText &&
        (target.view === undefined || pressedView() === target.view);
      const reached = async (target: ReachTarget | undefined) => {
        if (!target) return;
        const deadline = performance.now() + config.reachTimeoutMs;
        while (!shows(target) && performance.now() < deadline) {
          await frame();
        }
      };
      for (const action of reset) {
        act(action);
        await yieldTask();
      }
      await reached(reach.reset);
      const missing: string[] = [];
      const latencies: number[] = [];
      const lateSteps: number[] = [];
      for (const [index, action] of actions.entries()) {
        const start = performance.now();
        if (!act(action)) missing.push(action.join('='));
        // Only the microtasks the event queued have run here: no task,
        // timer, frame or network response. An update that already shows
        // is immediate however slow the machine is.
        await drainMicrotasks();
        const target = reach.steps?.[index];
        if (target && !shows(target)) lateSteps.push(index);
        await yieldTask();
        await reached(target);
        latencies.push(round(performance.now() - start));
      }
      // The frame after the last update lets anything drawn on layout
      // settle before it is read.
      await frame();
      return {
        latencyMs: latencies.length > 0 ? Math.max(...latencies) : 0,
        stepLatenciesMs: latencies,
        lateSteps,
        missing,
        snapshot: snapshot(),
      };
    },
    renderedOptions() {
      const options: Record<string, string[]> = {
        segment: segmentButtons()
          .map(segmentIdOf)
          .filter((id) => id !== 'all'),
      };
      for (const [dimension, id] of selectByDimension) {
        const select = document.getElementById(id) as HTMLSelectElement | null;
        options[dimension] = [...(select?.options ?? [])]
          .map((option) => option.value)
          .filter((value) => value !== '');
      }
      return options;
    },
    subSegmentOptions() {
      const id = selectByDimension.get('subSegment') ?? '';
      const select = document.getElementById(id) as HTMLSelectElement | null;
      return [...(select?.options ?? [])]
        .map((option) => option.value)
        .filter((value) => value !== '');
    },
    triggers(view: string) {
      const triggers =
        view === 'grid'
          ? [...document.querySelectorAll('[data-map-tile]')]
          : view === 'bubble'
            ? [...document.querySelectorAll('circle[data-company-id]')]
            : [...document.querySelectorAll('li[data-timeline-id] > button')];
      const idOf = (trigger: Element) =>
        trigger.getAttribute('data-map-tile') ??
        trigger.getAttribute('data-company-id') ??
        trigger.closest('li')?.getAttribute('data-company-id') ??
        '';
      return {
        expanded: triggers
          .filter((trigger) => trigger.getAttribute('aria-expanded') === 'true')
          .map(idOf),
        collapsed: triggers.filter((trigger) => trigger.getAttribute('aria-expanded') === 'false')
          .length,
        rendered: triggers.length,
        bubbleSelected:
          document.querySelector('svg[data-bubble-selected]')?.getAttribute('data-bubble-selected') ??
          null,
      };
    },
    focusTrigger(view: string, companyId: string) {
      const trigger =
        view === 'grid'
          ? document.querySelector<HTMLElement>(`[data-map-tile="${CSS.escape(companyId)}"]`)
          : view === 'bubble'
            ? document.querySelector<SVGElement>(`circle[data-company-id="${CSS.escape(companyId)}"]`)
            : document.querySelector<HTMLElement>(
                `li[data-timeline-id][data-company-id="${CSS.escape(companyId)}"] > button`,
              );
      trigger?.focus();
      return trigger !== null;
    },
    blur() {
      (document.activeElement as HTMLElement | null)?.blur?.();
    },
    markCentre(view: string, markId: string) {
      let mark: Element | null = null;
      if (view === 'bubble') {
        mark = document.querySelector(`circle[data-company-id="${CSS.escape(markId)}"]`);
      } else {
        // The plot and the list draw the same events array, so with nothing
        // open the n-th hit circle is the n-th row's round.
        const index = timelineRows().findIndex(
          (row) => row.getAttribute('data-timeline-id') === markId,
        );
        mark = index === -1 ? null : (timelineHits()[index] ?? null);
      }
      if (!mark) return null;
      let box = mark.getBoundingClientRect();
      if (box.top < 120 || box.bottom > innerHeight - 40) {
        mark.scrollIntoView({ block: 'center' });
        box = mark.getBoundingClientRect();
      }
      return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    },
    labelLines(view: string): string[] | null {
      const label =
        view === 'bubble'
          ? document.querySelector('[data-bubble-label]')
          : document.querySelector('svg[data-timeline-plot] > g[pointer-events="none"]');
      return label ? [...label.querySelectorAll('text')].map((line) => clean(line)) : null;
    },
    async waitForLabel(view: string, present: boolean) {
      for (let attempt = 0; attempt < 12; attempt += 1) {
        if ((probe.labelLines(view) !== null) === present) return true;
        await frame();
      }
      return (probe.labelLines(view) !== null) === present;
    },
    hitAt(view: string, x: number, y: number): string | null {
      const hit = document.elementFromPoint(x, y);
      if (!hit) return null;
      if (view === 'bubble') {
        return hit.matches('circle[data-company-id]') ? hit.getAttribute('data-company-id') : null;
      }
      const index = timelineHits().indexOf(hit);
      return index === -1 ? null : (timelineRows()[index]?.getAttribute('data-timeline-id') ?? null);
    },
    async focusLabel(companyId: string) {
      const mark = document.querySelector<SVGElement>(
        `circle[data-company-id="${CSS.escape(companyId)}"]`,
      );
      if (!mark) return null;
      mark.focus({ preventScroll: true });
      await probe.waitForLabel('bubble', true);
      const lines = probe.labelLines('bubble');
      mark.blur();
      await probe.waitForLabel('bubble', false);
      return lines;
    },
    timelineRow(eventId: string) {
      const row = timelineRows().find((entry) => entry.getAttribute('data-timeline-id') === eventId);
      const cells = [...(row?.querySelector('button')?.children ?? [])];
      if (!row || cells.length === 0) return null;
      return {
        name: clean(row.querySelector('[data-timeline-name]')),
        date: clean(cells[0]),
        amount: clean(cells[cells.length - 1]),
      };
    },
    async focusStop() {
      const element = document.activeElement;
      // The controls fade their colours, outline included, in 150 ms; the
      // ring is read once it has finished arriving.
      if (element) {
        await Promise.all(
          element.getAnimations().map((animation) => animation.finished.catch(() => undefined)),
        );
      }
      const style = element ? getComputedStyle(element) : null;
      return {
        descriptor: describe(element),
        focusVisible: element !== null && element.matches(':focus-visible'),
        outlineStyle: style?.outlineStyle ?? '',
        outlineWidth: style?.outlineWidth ?? '',
        outlineColor: style?.outlineColor ?? '',
        outlineOffset: style?.outlineOffset ?? '',
      };
    },
    startCountLedger() {
      const node = countNode();
      state.countNode = node;
      state.countRecords = [];
      if (!node) return null;
      new MutationObserver((records) => {
        const at = performance.now();
        for (let index = 0; index < records.length; index += 1) {
          state.countRecords.push({ at, text: clean(node) });
        }
      }).observe(node, { childList: true, characterData: true, subtree: true, attributes: true });
      return {
        role: node.getAttribute('role'),
        ariaLive: node.getAttribute('aria-live'),
        ariaAtomic: node.getAttribute('aria-atomic'),
      };
    },
    beginLedgerStep() {
      state.countRecords = [];
      state.keydowns = [];
      state.keyTasks = [];
    },
    async endLedgerStep() {
      await settle();
      const records = state.countRecords.splice(0);
      const keydowns = state.keydowns.splice(0);
      const keyTasks = state.keyTasks.splice(0);
      const first = records[0];
      const before = first ? keydowns.filter((at) => at <= first.at) : [];
      const view = snapshot();
      return {
        mutations: records.length,
        latencyMs: first && before.length > 0 ? round(first.at - Math.max(...before)) : null,
        inKeyTask: first
          ? keyTasks.some((task) => task.at <= first.at && first.at <= task.end)
          : null,
        text: clean(countNode()),
        focusAfter: describe(document.activeElement),
        params: params(),
        state: {
          view: view.view,
          moreOpen: view.moreOpen,
          segment: view.pressedSegment ?? 'none',
          subSegment: view.selectValues.subSegment ?? '',
          country: view.selectValues.country ?? '',
          query: view.query,
        },
        sameNode: countNode() === state.countNode,
      };
    },
  };
  (window as unknown as { __marketMapProbe: typeof probe }).__marketMapProbe = probe;
  return probe;
}

type MarketMapProbe = ReturnType<typeof installMarketMapProbe>;
type ProbeWindow = { __marketMapProbe: MarketMapProbe };
type Snapshot = ReturnType<MarketMapProbe['snapshot']>;

function probeConfig(): ProbeConfig {
  return {
    segments: Object.entries(SEGMENT_LABELS).map(([id, label]) => [label, id]),
    selects: MARKET_MAP_FILTER_DIMENSIONS.flatMap((dimension) => {
      const id = MARKET_MAP_DIMENSION_CONTROLS[dimension].selectId;
      return id ? [[dimension, id] as [string, string]] : [];
    }),
    reachTimeoutMs: MARKET_MAP_UPDATE_CEILING_MS,
  };
}

/* ------------------------------------------------------------------ */
/* Node-side drivers                                                   */
/* ------------------------------------------------------------------ */

/**
 * Requests that could carry data. Images (the logo probes), fonts, styles
 * and scripts are assets, and the router's own link prefetches are not a
 * refetch of anything the map shows. A HEAD response has no body, so it
 * cannot carry data either: in a static export the router opens each link
 * prefetch with a HEAD of the target page to check its status, without the
 * prefetch header the segment fetch that follows carries.
 */
const DATA_REQUEST_TYPES = new Set(['document', 'fetch', 'xhr', 'eventsource', 'websocket']);

type SeenRequest = { line: string; type: string; fromMap: boolean };

function trackRequests(page: Page): SeenRequest[] {
  const seen: SeenRequest[] = [];
  page.on('request', (request) => {
    if (!DATA_REQUEST_TYPES.has(request.resourceType())) return;
    if (request.method() === 'HEAD') return;
    if (request.headers()['next-router-prefetch']) return;
    let fromMap = false;
    try {
      fromMap = new URL(request.frame().url()).pathname.startsWith(MARKET_MAP_ROUTE);
    } catch {
      fromMap = false;
    }
    seen.push({
      line: `${request.resourceType()} ${request.method()} ${request.url()}`,
      type: request.resourceType(),
      fromMap,
    });
  });
  return seen;
}

async function waitForMap(page: Page) {
  await page.waitForFunction(() => {
    const field = document.querySelector('[data-market-map-search]');
    return field !== null && Object.keys(field).some((key) => key.startsWith('__reactProps'));
  });
  // A reader does not act in the first instant after hydration; timing a
  // case against the page's own start-up work would measure the start-up.
  await page.waitForLoadState('networkidle');
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        void document.fonts.ready.then(() =>
          requestIdleCallback(() => resolve(), { timeout: 2_000 }),
        );
      }),
  );
}

async function openMap(page: Page, url: string): Promise<Snapshot> {
  await page.goto(url);
  await waitForMap(page);
  return snapshotOf(page);
}

function snapshotOf(page: Page): Promise<Snapshot> {
  return page.evaluate(async () => {
    const probe = (window as unknown as ProbeWindow).__marketMapProbe;
    await probe.settle();
    return probe.snapshot();
  });
}

function mapUrl(staticBase: string, query: Record<string, string>, hash = ''): string {
  const search = new URLSearchParams(query).toString();
  return `${staticBase}${MARKET_MAP_ROUTE}${search ? `?${search}` : ''}${hash}`;
}

function filterActions(stateCase: MarketMapCase): Action[] {
  const filters = stateCase.filters ?? {};
  const order = stateCase.applyOrder ?? [...MARKET_MAP_FILTER_DIMENSIONS, 'query'];
  for (const dimension of Object.keys(filters)) {
    if (!order.includes(dimension as (typeof order)[number])) {
      throw new Error(`${stateCase.id} sets ${dimension}, which its apply order leaves out`);
    }
  }
  return order.flatMap((dimension) => {
    const value = filters[dimension];
    return value ? [[dimension, value] as Action] : [];
  });
}

function caseActions(stateCase: MarketMapCase): Action[] {
  const view: Action = ['view', stateCase.view ?? MARKET_MAP_DEFAULT_VIEW];
  // The registered view-switch combination switches after filtering, which
  // is the order the invariant is about; everything else picks its view first.
  return stateCase.id.startsWith('higher-order:filters-survive-view-switch:')
    ? [...filterActions(stateCase), view]
    : [view, ...filterActions(stateCase)];
}

/**
 * What each action should settle on, from the registry: the count of the
 * filters applied so far and the view last chosen. With `fromReset`, the
 * actions run after Clear filters, which itself settles on the full count.
 */
function reachFor(actions: readonly Action[], fromReset: boolean): RunReach {
  const filters: MarketMapFilters = {};
  let view: string | undefined;
  const steps = actions.map(([control, value]): ReachTarget => {
    if (control === 'view') {
      view = value;
    } else if (control === 'clear') {
      for (const key of Object.keys(filters)) delete filters[key as keyof MarketMapFilters];
    } else {
      filters[control as keyof MarketMapFilters] = value;
    }
    return { countText: expectedCountText(filters), view };
  });
  return { reset: fromReset ? { countText: expectedCountText({}) } : undefined, steps };
}

function filterObservation(
  snapshot: Snapshot,
  extra: {
    reloaded: boolean;
    requests: string[];
    latencyMs: number | null;
    latencySamplesMs: number[];
    lateSteps: number[];
  },
): Extract<MarketMapCaseObservation, { kind: 'filter' }> {
  return {
    kind: 'filter',
    view: snapshot.view as MarketMapView,
    params: snapshot.params,
    countText: snapshot.countText,
    renderedIds: snapshot.renderedIds,
    segmentTabCounts: snapshot.segmentTabCounts,
    bandCounts: snapshot.bandCounts,
    emptyState: snapshot.emptyState,
    emptyStateRole: snapshot.emptyStateRole,
    bubbleEmptyNote: snapshot.bubbleEmptyNote,
    timelineEmptyNote: snapshot.timelineEmptyNote,
    ...extra,
  };
}

async function runFilterCase(
  page: Page,
  stateCase: MarketMapCase,
  context: { docToken: string; requests: SeenRequest[] },
): Promise<{ observation: Extract<MarketMapCaseObservation, { kind: 'filter' }>; missing: string[] }> {
  const before = context.requests.length;
  const actions = caseActions(stateCase);
  const apply = () =>
    page.evaluate(
      ({ actions: steps, reach }) =>
        (window as unknown as ProbeWindow).__marketMapProbe.run([['clear', '']], steps, reach),
      { actions, reach: reachFor(actions, true) },
    );
  const result = await apply();
  const samples = [result.latencyMs];
  while (
    samples[samples.length - 1] > MARKET_MAP_UPDATE_CEILING_MS &&
    samples.length < MARKET_MAP_LATENCY_SAMPLES
  ) {
    samples.push((await apply()).latencyMs);
  }
  const observation = filterObservation(result.snapshot, {
    reloaded: result.snapshot.docToken !== context.docToken,
    requests: context.requests.slice(before).map(({ line }) => line),
    latencyMs: Math.min(...samples),
    latencySamplesMs: samples,
    lateSteps: result.lateSteps,
  });
  if (stateCase.group === 'dependent-options') {
    observation.subSegmentOptions = await page.evaluate(() =>
      (window as unknown as ProbeWindow).__marketMapProbe.subSegmentOptions(),
    );
  }
  return { observation, missing: result.missing };
}

async function axeViolations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations.map(
    (violation) => `${violation.id} (${violation.nodes.length} node(s))`,
  );
}

function triggerLocator(page: Page, view: MarketMapView, stateCase: MarketMapCase) {
  const id = stateCase.companyId as string;
  if (view === 'grid') return page.locator(`[data-map-tile="${id}"]`);
  if (view === 'bubble') return page.locator(`circle[data-company-id="${id}"]`);
  return page.locator(`li[data-timeline-id="${stateCase.eventId}"] > button`);
}

async function waitForSheet(page: Page, companyId: string | null) {
  await page
    .waitForFunction(
      (id) =>
        (document
          .querySelector('[role="dialog"] [data-company-detail]')
          ?.getAttribute('data-company-detail') ?? null) === id,
      companyId,
      { timeout: 5_000 },
    )
    .catch(() => undefined);
}

async function runSelectionCase(
  page: Page,
  stateCase: MarketMapCase,
  docToken: string,
  whileOpen?: () => Promise<void>,
): Promise<Extract<MarketMapCaseObservation, { kind: 'selection' }>> {
  const view = stateCase.view as MarketMapView;
  const id = stateCase.companyId as string;
  const viewActions: Action[] = [['view', view]];
  await page.evaluate(
    ({ actions, reach }) =>
      (window as unknown as ProbeWindow).__marketMapProbe.run([['clear', '']], actions, reach),
    { actions: viewActions, reach: reachFor(viewActions, true) },
  );
  await page.mouse.move(2, 2);
  const pushesBefore = (await snapshotOf(page)).pushes;
  const activation = stateCase.dismissal ? 'click' : 'keyboard';
  if (activation === 'click') {
    await triggerLocator(page, view, stateCase).click();
  } else {
    await page.evaluate(
      ({ view: target, id: companyId }) =>
        (window as unknown as ProbeWindow).__marketMapProbe.focusTrigger(target, companyId),
      { view, id },
    );
    await page.keyboard.press('Enter');
  }
  await waitForSheet(page, id);
  const open = await snapshotOf(page);
  const triggers = await page.evaluate(
    (target) => (window as unknown as ProbeWindow).__marketMapProbe.triggers(target),
    view,
  );
  if (whileOpen) await whileOpen();
  let dismissed: Snapshot | null = null;
  if (stateCase.dismissal === 'close') {
    await page.locator('[role="dialog"] button[aria-label^="Close "]').click();
  } else if (stateCase.dismissal === 'escape') {
    await page.keyboard.press('Escape');
  } else if (stateCase.dismissal === 'back') {
    await page.goBack();
  }
  if (stateCase.dismissal) {
    await waitForSheet(page, null);
    dismissed = await snapshotOf(page);
  }
  const observation: Extract<MarketMapCaseObservation, { kind: 'selection' }> = {
    kind: 'selection',
    view: open.view as MarketMapView,
    activation,
    hashWhileOpen: open.hash,
    sheetCompanyId: open.sheetCompanyId,
    sheetHeading: open.sheetHeading,
    expandedTriggers: triggers.expanded,
    collapsedTriggers: triggers.collapsed,
    renderedTriggers: triggers.rendered,
    bubbleSelected: triggers.bubbleSelected,
    pushes: open.pushes - pushesBefore,
    dismissedBy: stateCase.dismissal ?? null,
    sheetAfterDismiss: dismissed ? dismissed.sheetCompanyId !== null : null,
    hashAfterDismiss: dismissed ? dismissed.hash : null,
    focusAfterDismiss: dismissed ? dismissed.focus : null,
    reloaded: (dismissed ?? open).docToken !== docToken,
  };
  if (!stateCase.dismissal) {
    await page.keyboard.press('Escape');
    await waitForSheet(page, null);
  }
  return observation;
}

async function runHistoryCase(
  page: Page,
  staticBase: string,
  stateCase: MarketMapCase,
): Promise<Extract<MarketMapCaseObservation, { kind: 'history' }>> {
  const expectations = historyExpectations(stateCase);
  if (!expectations) throw new Error(`${stateCase.id} registers no history steps`);
  const filters = stateCase.filters ?? {};
  const view = stateCase.view ?? MARKET_MAP_DEFAULT_VIEW;
  const query = expectedSearchParams(filters, view);
  const snapshots: Array<[string, Snapshot]> = [];
  switch (stateCase.id) {
    case 'url:deep-link-filters-and-view':
      snapshots.push(['loaded', await openMap(page, mapUrl(staticBase, query))]);
      break;
    case 'url:deep-link-company': {
      const hash = `#company-${stateCase.companyId}`;
      const loaded = await openMap(page, mapUrl(staticBase, query, hash));
      await waitForSheet(page, stateCase.companyId ?? null);
      snapshots.push(['loaded', loaded.sheetCompanyId ? loaded : await snapshotOf(page)]);
      break;
    }
    case 'history:filters-return-and-reload': {
      snapshots.push(['loaded', await openMap(page, mapUrl(staticBase, {}))]);
      const applyActions: Action[] = [...filterActions(stateCase), ['view', view]];
      const applied = await page.evaluate(
        ({ actions, reach }) =>
          (window as unknown as ProbeWindow).__marketMapProbe.run([], actions, reach),
        { actions: applyActions, reach: reachFor(applyActions, false) },
      );
      snapshots.push(['applied', applied.snapshot]);
      await page.goto(`${staticBase}/`);
      await page.goBack();
      await waitForMap(page);
      snapshots.push(['returned', await snapshotOf(page)]);
      await page.reload();
      await waitForMap(page);
      snapshots.push(['reloaded', await snapshotOf(page)]);
      break;
    }
    case 'history:details-back-forward': {
      snapshots.push(['loaded', await openMap(page, mapUrl(staticBase, query))]);
      await page.locator(`[data-map-tile="${stateCase.companyId}"]`).click();
      await waitForSheet(page, stateCase.companyId ?? null);
      snapshots.push(['opened', await snapshotOf(page)]);
      await page.goBack();
      await waitForSheet(page, null);
      snapshots.push(['back', await snapshotOf(page)]);
      await page.goForward();
      await waitForSheet(page, stateCase.companyId ?? null);
      snapshots.push(['forward', await snapshotOf(page)]);
      break;
    }
    default:
      throw new Error(`${stateCase.id} has no history driver`);
  }
  const [, first] = snapshots[0];
  return {
    kind: 'history',
    steps: snapshots.map(([label, snapshot]) => ({
      label,
      params: snapshot.params,
      hash: snapshot.hash,
      view: snapshot.view as MarketMapView,
      countText: snapshot.countText,
      renderedIds: snapshot.renderedIds,
      pressedSegment: snapshot.pressedSegment,
      selectValues: snapshot.selectValues,
      sheetCompanyId: snapshot.sheetCompanyId,
      pushes:
        snapshot.docToken === first.docToken ? snapshot.pushes - first.pushes : snapshot.pushes,
      sameDocument: snapshot.docToken === first.docToken,
    })),
  };
}

async function runTooltipCase(
  page: Page,
  stateCase: MarketMapCase,
): Promise<Extract<MarketMapCaseObservation, { kind: 'tooltip' }>> {
  const view = stateCase.view as 'bubble' | 'timeline';
  const markId = (view === 'timeline' ? stateCase.eventId : stateCase.companyId) as string;
  await page.mouse.move(2, 2);
  const centre = await page.evaluate(
    ({ view: target, markId: mark }) => {
      const probe = (window as unknown as ProbeWindow).__marketMapProbe;
      probe.blur();
      return probe.markCentre(target, mark);
    },
    { view, markId },
  );
  const observation: Extract<MarketMapCaseObservation, { kind: 'tooltip' }> = {
    kind: 'tooltip',
    view,
    markId,
    hitId: null,
    pointerReachable: false,
    hoverLabel: [],
    labelAfterLeave: false,
    focusLabel: null,
    row: null,
  };
  if (!centre) return observation;
  await page.mouse.move(centre.x, centre.y);
  const hover = await page.evaluate(
    async ({ view: target, x, y }) => {
      const probe = (window as unknown as ProbeWindow).__marketMapProbe;
      await probe.waitForLabel(target, true);
      return { hitId: probe.hitAt(target, x, y), lines: probe.labelLines(target) ?? [] };
    },
    { view, x: centre.x, y: centre.y },
  );
  await page.mouse.move(2, 2);
  const after = await page.evaluate(
    async ({ view: target, hitId }) => {
      const probe = (window as unknown as ProbeWindow).__marketMapProbe;
      const cleared = await probe.waitForLabel(target, false);
      if (hitId === null) return { cleared, focusLabel: null, row: null };
      return target === 'bubble'
        ? { cleared, focusLabel: await probe.focusLabel(hitId), row: null }
        : { cleared, focusLabel: null, row: probe.timelineRow(hitId) };
    },
    { view, hitId: hover.hitId },
  );
  return {
    ...observation,
    hitId: hover.hitId,
    pointerReachable: hover.hitId === markId,
    hoverLabel: hover.lines,
    labelAfterLeave: after.cleared,
    focusLabel: after.focusLabel,
    row: after.row,
  };
}

/** Tab, or Shift+Tab, until the named filter-bar control has focus. */
async function tabTo(page: Page, target: string, keys: string[]) {
  const order = expectedFilterBarTabOrder();
  for (let presses = 0; presses < 60; presses += 1) {
    const current = await page.evaluate(() =>
      (window as unknown as ProbeWindow).__marketMapProbe.describe(document.activeElement),
    );
    if (current === target) return;
    const from = order.indexOf(current);
    const to = order.indexOf(target);
    const key = from !== -1 && to !== -1 && to < from ? 'Shift+Tab' : 'Tab';
    await page.keyboard.press(key);
    keys.push(key);
  }
  throw new Error(`keyboard focus never reached ${target}`);
}

const FILTER_BAR_STOP = /^(tab:|search$|more-filters$|clear-filters$|view:|select:)/;

async function runFocusTrace(
  page: Page,
  staticBase: string,
  stateCase: MarketMapCase,
  screenshotPath: string,
): Promise<Extract<MarketMapCaseObservation, { kind: 'focus-trace' }>> {
  await openMap(
    page,
    mapUrl(staticBase, expectedSearchParams(stateCase.filters ?? {}, stateCase.view)),
  );
  await page.evaluate(() => (window as unknown as ProbeWindow).__marketMapProbe.blur());
  await tabTo(page, 'tab:all', []);
  const stops: Extract<MarketMapCaseObservation, { kind: 'focus-trace' }>['stops'] = [];
  for (let presses = 0; presses < 60; presses += 1) {
    const stop = await page.evaluate(() =>
      (window as unknown as ProbeWindow).__marketMapProbe.focusStop(),
    );
    if (!FILTER_BAR_STOP.test(stop.descriptor)) break;
    stops.push(stop);
    if (stop.descriptor === 'more-filters') {
      await page.screenshot({ path: screenshotPath, animations: 'disabled' });
    }
    await page.keyboard.press('Tab');
  }
  return { kind: 'focus-trace', stops };
}

function keyboardAction(step: ReturnType<typeof marketMapKeyboardScript>[number]) {
  const [verb] = step.step.split('-');
  const target = step.step === 'enter-clear-filters' ? 'clear-filters' : step.focusAfter;
  if (verb === 'enter' || verb === 'open') return { target, key: 'Enter' };
  if (verb === 'space') return { target, key: 'Space' };
  if (verb === 'backspace') return { target, key: 'Backspace' };
  if (verb === 'arrow') return { target, key: 'ArrowDown' };
  if (verb === 'type' && step.filters.query) return { target, key: step.filters.query };
  throw new Error(`the keyboard script step ${step.step} has no key`);
}

async function runKeyboardLedger(
  page: Page,
  staticBase: string,
  screenshotPath: string | null,
  plant?: () => Promise<void>,
): Promise<Extract<MarketMapCaseObservation, { kind: 'keyboard-ledger' }>> {
  await openMap(page, mapUrl(staticBase, {}));
  if (plant) await plant();
  const region = await page.evaluate(() =>
    (window as unknown as ProbeWindow).__marketMapProbe.startCountLedger(),
  );
  await page.evaluate(() => (window as unknown as ProbeWindow).__marketMapProbe.blur());
  await tabTo(page, 'tab:all', []);
  const startFocus = await page.evaluate(() =>
    (window as unknown as ProbeWindow).__marketMapProbe.describe(document.activeElement),
  );
  const steps: Extract<MarketMapCaseObservation, { kind: 'keyboard-ledger' }>['steps'] = [];
  const announcements: string[] = [];
  let sameNode = true;
  for (const step of marketMapKeyboardScript()) {
    const { target, key } = keyboardAction(step);
    const keys: string[] = [];
    await page.evaluate(() => (window as unknown as ProbeWindow).__marketMapProbe.beginLedgerStep());
    await tabTo(page, target, keys);
    await page.keyboard.press(key);
    keys.push(key);
    const read = await page.evaluate(() =>
      (window as unknown as ProbeWindow).__marketMapProbe.endLedgerStep(),
    );
    sameNode &&= read.sameNode;
    if (read.mutations > 0) announcements.push(read.text);
    steps.push({
      step: step.step,
      keys,
      focusAfter: read.focusAfter,
      expectedText: expectedCountText(step.filters),
      text: read.text,
      mutations: read.mutations,
      latencyMs: read.latencyMs,
      inKeyTask: read.inKeyTask,
      params: read.params,
      state: read.state,
    });
    if (screenshotPath && step.step === 'arrow-country') {
      await page.screenshot({ path: screenshotPath, animations: 'disabled' });
    }
  }
  return {
    kind: 'keyboard-ledger',
    region: {
      role: region?.role ?? null,
      ariaLive: region?.ariaLive ?? null,
      ariaAtomic: region?.ariaAtomic ?? null,
      sameNodeThroughout: sameNode,
    },
    startFocus,
    steps,
    announcements,
  };
}

/* ------------------------------------------------------------------ */
/* The sweep                                                           */
/* ------------------------------------------------------------------ */

/** One case per line, so the artifact diffs case by case. */
function serializeArtifact(artifact: MarketMapStatesEvidence): string {
  const { cases, ...head } = artifact;
  const json = JSON.stringify({ ...head, cases: [] }, null, 2);
  const body = cases.map((record) => `    ${JSON.stringify(record)}`).join(',\n');
  return `${json.replace('"cases": []', `"cases": [\n${body}\n  ]`)}\n`;
}

/** An artifact of one case, for the verdict of that case alone. */
function oneCaseVerdict(
  plan: MarketMapStatePlan,
  stateCase: MarketMapCase,
  observed: MarketMapCaseObservation,
): string[] {
  const evidence: MarketMapStatesEvidence = {
    version: 1,
    fingerprint: 'plant',
    route: MARKET_MAP_ROUTE,
    viewport: MARKET_MAP_VIEWPORT.id,
    generator: plan.generator,
    caseCounts: { expected: 1, observed: 1 },
    cases: [{ id: stateCase.id, group: stateCase.group, observed }],
    axe: [{ state: 'plant', violations: [] }],
  };
  const [verdict] = marketMapCaseVerdicts(evidence, { ...plan, cases: [stateCase] });
  return verdict.failures;
}

async function preparePage(page: Page) {
  await page.setViewportSize({
    width: MARKET_MAP_VIEWPORT.width,
    height: MARKET_MAP_VIEWPORT.height,
  });
  await page.addInitScript(installMarketMapProbe, probeConfig());
}

const PER_CASE_LOADS = new Set(['default-reset', 'url-history', 'focus-keyboard']);

test.describe('brand-v2 market map states sweep', () => {
  test('measures every registered market-map case and persists the artifact', async ({
    page,
    staticBase,
  }, testInfo) => {
    // ~3,100 cases, nearly all one in-page round trip each.
    test.setTimeout(1_200_000);
    await preparePage(page);
    const requests = trackRequests(page);
    const plan = marketMapStatePlan();
    const records: MarketMapCaseRecord[] = [];
    const axe: MarketMapStatesEvidence['axe'] = [];
    const missingControls: string[] = [];
    const axeCases = new Set<string>(MARKET_MAP_AXE_CASES);
    const runAxe = async (state: string) => {
      axe.push({ state, violations: await axeViolations(page) });
    };
    let group: string | null = null;
    let docToken = '';
    let tooltipView: string | null = null;

    for (const stateCase of plan.cases) {
      if (stateCase.group !== group) {
        group = stateCase.group;
        tooltipView = null;
        if (!PER_CASE_LOADS.has(group)) {
          docToken = (await openMap(page, mapUrl(staticBase, {}))).docToken;
        }
      }
      let observed: MarketMapCaseObservation;
      if (stateCase.kind === 'exception') {
        // Completed after the sweep, from every request the map made.
        observed = {
          kind: 'exception',
          notApplicableReason: stateCase.notApplicableReason ?? '',
          requestsDuringSweep: [],
        };
      } else if (stateCase.id === 'default') {
        const loaded = await openMap(page, mapUrl(staticBase, {}));
        docToken = loaded.docToken;
        const before = requests.length;
        const renderedOptions = await page.evaluate(() =>
          (window as unknown as ProbeWindow).__marketMapProbe.renderedOptions(),
        );
        observed = {
          ...filterObservation(loaded, {
            reloaded: false,
            requests: requests.slice(before).map(({ line }) => line),
            latencyMs: null,
            latencySamplesMs: [],
            lateSteps: [],
          }),
          renderedOptions,
        };
      } else if (stateCase.id === 'reset') {
        const dirty = plan.cases.find(({ group: candidate }) => candidate === 'higher-order');
        const dirtyActions = dirty ? filterActions(dirty) : [];
        await page.evaluate(
          ({ actions, reach }) =>
            (window as unknown as ProbeWindow).__marketMapProbe.run([], actions, reach),
          { actions: dirtyActions, reach: reachFor(dirtyActions, false) },
        );
        const before = requests.length;
        const clearActions: Action[] = [['clear', '']];
        const cleared = await page.evaluate(
          ({ actions, reach }) =>
            (window as unknown as ProbeWindow).__marketMapProbe.run([], actions, reach),
          { actions: clearActions, reach: reachFor(clearActions, false) },
        );
        observed = {
          ...filterObservation(cleared.snapshot, {
            reloaded: cleared.snapshot.docToken !== docToken,
            requests: requests.slice(before).map(({ line }) => line),
            latencyMs: cleared.latencyMs,
            latencySamplesMs: [cleared.latencyMs],
            lateSteps: cleared.lateSteps,
          }),
          focusAfterReset: cleared.snapshot.focus,
        };
      } else if (stateCase.group === 'selection') {
        observed = await runSelectionCase(
          page,
          stateCase,
          docToken,
          axeCases.has(stateCase.id) ? () => runAxe(stateCase.id) : undefined,
        );
      } else if (stateCase.group === 'url-history') {
        observed = await runHistoryCase(page, staticBase, stateCase);
      } else if (stateCase.group === 'tooltip-parity') {
        if (tooltipView !== stateCase.view) {
          const viewActions: Action[] = [['view', stateCase.view ?? MARKET_MAP_DEFAULT_VIEW]];
          await page.evaluate(
            ({ actions, reach }) =>
              (window as unknown as ProbeWindow).__marketMapProbe.run([['clear', '']], actions, reach),
            { actions: viewActions, reach: reachFor(viewActions, true) },
          );
          tooltipView = stateCase.view ?? null;
        }
        observed = await runTooltipCase(page, stateCase);
      } else if (stateCase.id === 'focus:each-filter-bar-control') {
        observed = await runFocusTrace(
          page,
          staticBase,
          stateCase,
          testInfo.outputPath('market-map-focus-ring.png'),
        );
      } else if (stateCase.id === 'keyboard:operate-filter-bar') {
        observed = await runKeyboardLedger(
          page,
          staticBase,
          testInfo.outputPath('market-map-keyboard-ledger.png'),
        );
      } else {
        const result = await runFilterCase(page, stateCase, { docToken, requests });
        observed = result.observation;
        missingControls.push(...result.missing.map((entry) => `${stateCase.id}: ${entry}`));
      }
      records.push({ id: stateCase.id, group: stateCase.group, observed });
      if (axeCases.has(stateCase.id) && stateCase.group !== 'selection') {
        await runAxe(stateCase.id);
      }
    }

    // No request the map itself made between its loads could have carried
    // data: the not-applicable loading, error and unavailable states rest on it.
    const runtime = requests
      .filter(({ type, fromMap }) => type !== 'document' && fromMap)
      .map(({ line }) => line);
    for (const record of records) {
      if (record.observed.kind === 'exception') record.observed.requestsDuringSweep = runtime;
    }

    const fingerprint = marketMapStatesEvidenceFingerprint({ root: ROOT });
    const artifact: MarketMapStatesEvidence = {
      version: 1,
      fingerprint,
      route: MARKET_MAP_ROUTE,
      viewport: MARKET_MAP_VIEWPORT.id,
      generator: plan.generator,
      caseCounts: { expected: plan.cases.length, observed: records.length },
      cases: records,
      axe,
    };
    await testInfo.attach('market-map-axe.json', {
      body: JSON.stringify(axe, null, 2),
      contentType: 'application/json',
    });
    // The run's own copy, kept whether or not the verdicts below pass; only
    // a passing run writes the committed artifact.
    writeFileSync(testInfo.outputPath('market-map-states.json'), serializeArtifact(artifact));

    const evidence = readMarketMapStatesEvidence({ artifact, fingerprint, plan });
    const verdicts = marketMapGroupVerdicts(evidence, plan);
    expect(verdicts.map(({ id }) => id)).toEqual(
      MARKET_MAP_CASE_GROUPS.map(marketMapCaseGroupMemberId),
    );
    const failures = verdicts.flatMap(({ failures: found }) => found);
    expect(
      failures,
      [...missingControls, ...failures].slice(0, 40).join('\n'),
    ).toEqual([]);
    const counts = marketMapGroupCaseCounts(plan);
    for (const verdict of verdicts) {
      const groupId = verdict.observed.group as keyof typeof counts;
      expect(verdict.observed.expectedCaseCount).toBe(counts[groupId]);
      expect(verdict.observed.observedCaseCount).toBe(counts[groupId]);
      expect(counts[groupId]).toBeGreaterThan(0);
    }

    // A dropped, an extra and a reordered case are each refused by name.
    expect(() =>
      readMarketMapStatesEvidence({
        artifact: { ...artifact, cases: records.slice(1) },
        fingerprint,
        plan,
      }),
    ).toThrow(/incomplete: missing default/);
    expect(() =>
      readMarketMapStatesEvidence({
        artifact: {
          ...artifact,
          cases: [...records, { ...records[records.length - 1], id: 'option:segment=unregistered' }],
        },
        fingerprint,
        plan,
      }),
    ).toThrow(/unregistered case option:segment=unregistered/);
    expect(() =>
      readMarketMapStatesEvidence({
        artifact: { ...artifact, cases: [records[1], records[0], ...records.slice(2)] },
        fingerprint,
        plan,
      }),
    ).toThrow(/out of registry order at case 0/);

    const artifactPath = join(ROOT, MARKET_MAP_STATES_EVIDENCE_PATH);
    mkdirSync(dirname(artifactPath), { recursive: true });
    writeFileSync(artifactPath, serializeArtifact(artifact));
  });

  /**
   * Plant proofs: each corrupts the live page the way the defect would look
   * and shows the verdict that covers it fails by name.
   */
  test('refuses a rendered tile set that drops one registry company', async ({
    page,
    staticBase,
  }) => {
    await preparePage(page);
    const plan = marketMapStatePlan();
    const stateCase = plan.cases.find(({ id }) => id === 'option:segment=humanoids');
    if (!stateCase) throw new Error('the plan registers no humanoids option case');
    const requests = trackRequests(page);
    const { docToken } = await openMap(page, mapUrl(staticBase, {}));
    const clean = await runFilterCase(page, stateCase, { docToken, requests });
    expect(oneCaseVerdict(plan, stateCase, clean.observation)).toEqual([]);
    const dropped = await page.evaluate(() => {
      const tile = document.querySelector('[data-map-tile]');
      const id = tile?.getAttribute('data-map-tile') ?? null;
      tile?.closest('li')?.remove();
      return id;
    });
    const planted = filterObservation(await snapshotOf(page), {
      reloaded: false,
      requests: [],
      latencyMs: clean.observation.latencyMs,
      latencySamplesMs: clean.observation.latencySamplesMs,
      lateSteps: clean.observation.lateSteps,
    });
    const failures = oneCaseVerdict(plan, stateCase, planted);
    expect(failures.some((failure) => failure.includes(`missing [${dropped}`))).toBe(true);
  });

  test('refuses a filter update that waits for a timer', async ({ page, staticBase }) => {
    await preparePage(page);
    const plan = marketMapStatePlan();
    const stateCase = plan.cases.find(({ id }) => id === 'option:country=US');
    if (!stateCase) throw new Error('the plan registers no country=US option case');
    const requests = trackRequests(page);
    const { docToken } = await openMap(page, mapUrl(staticBase, {}));
    // Hold every select change back for one timer turn before the page sees it.
    await page.evaluate(() => {
      const deferred = new WeakSet<Event>();
      window.addEventListener(
        'change',
        (event) => {
          if (deferred.has(event) || !(event.target instanceof HTMLSelectElement)) return;
          event.stopImmediatePropagation();
          const target = event.target;
          setTimeout(() => {
            const again = new Event('change', { bubbles: true });
            deferred.add(again);
            target.dispatchEvent(again);
          }, 0);
        },
        true,
      );
    });
    const { observation } = await runFilterCase(page, stateCase, { docToken, requests });
    expect(observation.renderedIds.length).toBeGreaterThan(0);
    expect(observation.lateSteps.length).toBeGreaterThan(0);
    const failures = oneCaseVerdict(plan, stateCase, observation);
    expect(failures.some((failure) => /had not landed when their event's task ended/.test(failure))).toBe(true);
  });

  test('refuses a result count that lies about its rows', async ({ page, staticBase }) => {
    await preparePage(page);
    const plan = marketMapStatePlan();
    const stateCase = plan.cases.find(({ id }) => id === 'option:segment=humanoids');
    if (!stateCase) throw new Error('the plan registers no humanoids option case');
    const requests = trackRequests(page);
    const { docToken } = await openMap(page, mapUrl(staticBase, {}));
    const { observation } = await runFilterCase(page, stateCase, { docToken, requests });
    await page.evaluate(() => {
      const count = document.querySelector('[data-result-count]');
      if (count) count.textContent = `0 of ${count.textContent?.split(' of ')[1] ?? ''}`;
    });
    const planted = filterObservation(await snapshotOf(page), {
      reloaded: false,
      requests: [],
      latencyMs: observation.latencyMs,
      latencySamplesMs: observation.latencySamplesMs,
      lateSteps: observation.lateSteps,
    });
    const failures = oneCaseVerdict(plan, stateCase, planted);
    expect(failures.some((failure) => /^count reads "0 of /.test(failure))).toBe(true);
  });

  test('refuses a result count that is no longer a polite live region', async ({
    page,
    staticBase,
  }) => {
    test.setTimeout(120_000);
    await preparePage(page);
    const plan = marketMapStatePlan();
    const stateCase = plan.cases.find(({ id }) => id === 'keyboard:operate-filter-bar');
    if (!stateCase) throw new Error('the plan registers no keyboard case');
    const observed = await runKeyboardLedger(page, staticBase, null, async () => {
      await page.evaluate(() =>
        document.querySelector('[data-result-count]')?.removeAttribute('aria-live'),
      );
    });
    const failures = oneCaseVerdict(plan, stateCase, observed);
    expect(failures).toContain('the count region is aria-live null');
  });
});
