import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { devices, type Browser, type Locator, type Page } from '@playwright/test';
import { inOwnContext } from './per-route-context';
import { RESET_MARKER, mountRoots } from './interactive-mount-roots';
import { stateDigest } from './interactive-state-digest';
import { collectFrame, seriesComparison } from './interactive-frame-evidence';
import { implementsState, type ImplementedState } from '../../../lib/brand-v2-census';
import { INTERACTIVE_DATA_CLASSIFICATION, STATUS_LABEL_VOCABULARY } from '../../../lib/brand-v2-interactive-data';
import {
  ANNOUNCEMENT_WINDOW_MS,
  IDLE_WINDOW_MS,
  INTERACTIVE_LEDGER_VIEWPORT,
  LIVE_REGION_SELECTOR,
  READOUT_SELECTOR,
  type ControlKind,
  type IdleMotion,
  type InteractiveLedgerPlan,
  type LedgerCaseRecord,
  type LedgerControl,
  type LedgerHover,
  type LedgerIdle,
  type LedgerObservation,
  type LedgerPlanMount,
  type LedgerSeries,
  type LedgerTransition,
} from '../../../lib/brand-v2-interactive-ledger';
import { valueTextCovers } from '../../../components/motion/settled-speech';

/**
 * The browser side of the keyboard transition ledger
 * (lib/brand-v2-interactive-ledger.ts): one mount, operated by real key
 * presses on a page of its own, read back as the ledger's observation.
 *
 * Every transition starts from a recorded base state (the default, or the
 * default with the folds that hold the control opened by keyboard) and is
 * checked to start there; a transition that cannot return reloads the mount
 * and re-opens its folds, so one broken control never moves the next
 * control's starting state.
 */

const MOUNT_ATTRIBUTE = 'data-ledger-mount';
/**
 * Each control registered at load carries its load-order index here, so a
 * control keeps its index when the figure adds or removes controls before
 * it. `stateDigest` ignores `data-ledger-*` attributes.
 */
const CONTROL_ATTRIBUTE = 'data-ledger-control';
const SENTINEL_ATTRIBUTE = 'data-ledger-sentinel';

/** How long a step that measures no announcement waits for the figure to hold still. */
const SETTLE_MS = 400;

/** Longest a run started by one action may keep the figure moving. */
const RUN_CAP_MS = 30_000;

/**
 * How much longer than the announcement window a figure must hold still for
 * its result to be read: a run that pauses between its steps (a calm run's
 * held stops) and moves on within this margin is still running.
 */
const HOLD_MS = 300;

const PLAIN_CONTEXT = { ...devices['Desktop Chrome'] };

type Base = { path: number[]; digest: string };

type ControlFacts = {
  index: number;
  kind: ControlKind;
  visibleText: string;
  disabled: boolean;
  /** Summary indices of the folds, outermost first, that are closed by default around it. */
  foldPath: number[];
  caseIds: string[];
  state: string;
  value: { value: number; min: number; max: number; step: number } | null;
  /** Native radio name or radiogroup index, for radios. */
  group: string | null;
  isSummary: boolean;
};

type ActiveInfo = {
  inRoot: boolean;
  index: number;
  descriptor: string;
  closedSummary: boolean;
  focusVisible: boolean;
  ring: { style: string; widthPx: number; color: string };
};

type Spoken = { region: string; politeness: string; text: string; atMs: number };

type ReadoutReading = {
  key: string;
  shown: boolean;
  text: string;
  live: string | null;
  controlIndex: number | null;
  /** The accessible label and value text of the control a value readout belongs to. */
  controlSays: string | null;
};

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

/** Loads the mount's route on `page`, marks the mount's own root and indexes its controls. */
async function openMount(page: Page, staticBase: string, plan: InteractiveLedgerPlan, mount: LedgerPlanMount) {
  const response = await page.goto(`${staticBase}${mount.route}`, { waitUntil: 'load' });
  await settlePage(page);
  const routeMounts = plan.mounts.filter(({ route }) => route === mount.route);
  const roots = await mountRoots(
    page,
    mount.route,
    routeMounts.map(({ mountId, sourceId, component, ordinal }) => ({ id: mountId, sourceId, component, ordinal })),
  );
  const root = roots[routeMounts.indexOf(mount)];
  await root.evaluate((element, [attribute, id]) => element.setAttribute(attribute, id), [MOUNT_ATTRIBUTE, mount.mountId]);
  const focusSelector = mount.cases.find(({ kind, selector }) => kind === 'focus' && selector)?.selector;
  if (focusSelector) {
    await root.evaluate(
      (element, [selector, attribute]) =>
        element.querySelectorAll(selector).forEach((node, index) => node.setAttribute(attribute, String(index))),
      [focusSelector, CONTROL_ATTRIBUTE],
    );
  }
  await root.evaluate((element) => element.scrollIntoView({ block: 'start' }));
  await page.mouse.move(2, 2);
  await page.waitForTimeout(400);
  return { status: response?.status() ?? 0, root };
}

/* ------------------------------------------------------------------ */
/* In-page readers                                                     */
/* ------------------------------------------------------------------ */

/**
 * Records every live-region text a screen reader would be handed, and the
 * time of the mount's last change outside its live regions.
 */
async function installRecorder(root: Locator) {
  await root.evaluate((element, live) => {
    type Recorder = {
      root: Element;
      spoken: Array<{ region: string; politeness: string; text: string; at: number }>;
      last: number;
      observer: MutationObserver;
    };
    const w = window as unknown as { __ledger?: Recorder };
    w.__ledger?.observer.disconnect();
    const lastText = new Map<Element, string>();
    const text = (node: Element) => (node.textContent ?? '').replace(/\s+/g, ' ').trim();
    const describe = (node: Element) => {
      const marks = ['aria-live', 'role', 'data-figure-readout', 'data-anatomy-announcer', 'data-testid']
        .filter((name) => node.hasAttribute(name))
        .map((name) => `${name}=${node.getAttribute(name)}`);
      const regions = [...element.querySelectorAll(live)];
      return `${node.tagName.toLowerCase()}#${regions.indexOf(node)}[${marks.join(' ')}]`;
    };
    const politeness = (region: Element) =>
      region.getAttribute('aria-live') ?? (region.getAttribute('role') === 'alert' ? 'assertive' : 'polite');
    for (const region of element.querySelectorAll(live)) lastText.set(region, text(region));
    const recorder: Recorder = {
      root: element,
      spoken: [],
      last: performance.now(),
      observer: new MutationObserver((records) => {
        const touched = new Set<Element>();
        for (const record of records) {
          const target = record.target instanceof Element ? record.target : record.target.parentElement;
          if (!target) continue;
          if (record.type === 'attributes' && record.attributeName?.startsWith('data-ledger')) continue;
          const region = target.closest(live);
          if (region && element.contains(region) && record.type !== 'attributes') {
            touched.add(region);
            continue;
          }
          recorder.last = performance.now();
        }
        for (const region of touched) {
          // A region that is off, or in a closed fold or not rendered (out of
          // the accessibility tree), says nothing, so what it shows there is
          // not what a listener last heard from it: text it held while off
          // and writes afresh once polite is said.
          if (politeness(region) === 'off' || !region.checkVisibility()) continue;
          const now = text(region);
          const previous = lastText.get(region) ?? '';
          lastText.set(region, now);
          if (!now || now === previous) continue;
          recorder.spoken.push({ region: describe(region), politeness: politeness(region), text: now, at: performance.now() });
        }
      }),
    };
    recorder.observer.observe(element, { subtree: true, childList: true, characterData: true, attributes: true });
    w.__ledger = recorder;
  }, LIVE_REGION_SELECTOR);
}

type Quiet = { at: number; capped: boolean };

/**
 * Resolves once the mount has changed nothing outside its live regions for
 * `quietMs` of time in which the page was drawing, with the page time it
 * resolved at. From then on the page counts how long it has drawn, for
 * `heldSince`.
 */
async function quiet(page: Page, quietMs: number, capMs = RUN_CAP_MS): Promise<Quiet> {
  return page.evaluate(
    ({ quietMs: span, capMs: cap, holdMs }) =>
      new Promise<Quiet>((resolve) => {
        const start = performance.now();
        // Time the page could not run or could not draw does not count as
        // quiet time. A stalled main thread holds back the figure's own
        // timers, and Chromium can go seconds without handing a busy page an
        // animation frame while its timers still run, so a figure that eases
        // or steps on requestAnimationFrame has not yet drawn its result.
        // Watching from frames means the figure's own pending frame has run
        // before the page counts as quiet.
        let from = start;
        let previous = start;
        let done = false;
        const finish = (capped: boolean) => {
          done = true;
          const at = performance.now();
          const hold = { at, drawn: 0 };
          const w = window as unknown as { __ledgerHold: typeof hold };
          w.__ledgerHold = hold;
          let last = at;
          const track = () => {
            if (w.__ledgerHold !== hold) return;
            const now = performance.now();
            if (now - last <= 250) hold.drawn += now - last;
            last = now;
            if (hold.drawn < holdMs) requestAnimationFrame(track);
          };
          requestAnimationFrame(track);
          resolve({ at, capped });
        };
        const frame = () => {
          if (done) return;
          const now = performance.now();
          if (now - previous > 250) from = now;
          previous = now;
          const last = (window as unknown as { __ledger: { last: number } }).__ledger.last;
          if (now - Math.max(last, from) >= span) finish(false);
          else requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
        setTimeout(() => {
          if (!done) finish(true);
        }, cap);
      }),
    { quietMs, capMs, holdMs: HOLD_MS },
  );
}

/**
 * Whether the mount has changed nothing outside its live regions since
 * `quiet` resolved at `at`, once the page has drawn for `HOLD_MS` after it.
 */
const heldSince = (page: Page, at: number): Promise<boolean> =>
  page.evaluate(
    ({ since, holdMs }) =>
      new Promise<boolean>((resolve) => {
        const w = window as unknown as { __ledgerHold?: { at: number; drawn: number }; __ledger: { last: number } };
        let done = false;
        const answer = () => {
          if (done) return;
          done = true;
          resolve(w.__ledger.last <= since);
        };
        const check = () => {
          const hold = w.__ledgerHold;
          if (!hold || hold.at !== since || hold.drawn >= holdMs) answer();
          else requestAnimationFrame(check);
        };
        check();
        setTimeout(answer, 20 * holdMs);
      }),
    { since: at, holdMs: HOLD_MS },
  );

/**
 * Reads the figure once it holds still: quiet for the announcement window,
 * read, and read again from the next quiet if the figure moved on within
 * `HOLD_MS` of seeming still, so a run is read where it ends rather than at
 * a pause between its steps.
 */
async function settledRead<T>(page: Page, read: () => Promise<T>): Promise<T> {
  const started = Date.now();
  for (;;) {
    const { at, capped } = await quiet(page, ANNOUNCEMENT_WINDOW_MS);
    const value = await read();
    if (capped || Date.now() - started > RUN_CAP_MS || (await heldSince(page, at))) return value;
  }
}

type SpokenMark = { count: number; at: number };

const spokenCount = (page: Page): Promise<SpokenMark> =>
  page.evaluate(() => ({
    count: (window as unknown as { __ledger: { spoken: unknown[] } }).__ledger.spoken.length,
    at: performance.now(),
  }));

/** What was spoken since `mark`, each with its time after the mark. */
const spokenSince = (page: Page, mark: SpokenMark): Promise<Spoken[]> =>
  page.evaluate(
    ({ count, at }) =>
      (window as unknown as { __ledger: { spoken: Array<{ region: string; politeness: string; text: string; at: number }> } }).__ledger.spoken
        .slice(count)
        .map(({ region, politeness, text, at: when }) => ({ region, politeness, text, atMs: Math.round(when - at) })),
    mark,
  );

/** Every registered focus-case control in the root, as the ledger indexes them. */
async function readControls(root: Locator, selector: string, caseSelectors: Array<[string, string]>): Promise<ControlFacts[]> {
  return root.evaluate(
    (element, { cases, reset, attribute }) => {
      const tag = (node: Element) => Number(node.getAttribute(attribute) ?? -1);
      const controls = [...element.querySelectorAll<HTMLElement>(`[${attribute}]`)];
      const radiogroups = [...element.querySelectorAll('[role="radiogroup"]')];
      // Text runs are joined with a space, as a label laid out in blocks reads.
      // Text hidden from assistive technology, and text the control names as
      // its description (aria-describedby), is not its label.
      const visibleText = (node: Element): string => {
        const described = (node.getAttribute('aria-describedby') ?? '')
          .split(/\s+/)
          .map((id) => (id ? document.getElementById(id) : null))
          .filter((target): target is HTMLElement => Boolean(target));
        const runs: string[] = [];
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
        for (let text = walker.nextNode(); text; text = walker.nextNode()) {
          const parent = text.parentElement;
          if (parent?.closest('[data-figure-control-value]')) continue;
          if (parent && node.contains(parent.closest('[aria-hidden="true"]'))) continue;
          if (described.some((target) => target.contains(text))) continue;
          runs.push(text.textContent ?? '');
        }
        return runs.join(' ').replace(/\s+/g, ' ').trim();
      };
      return controls.map((node) => {
        const index = tag(node);
        const input = node instanceof HTMLInputElement ? node : null;
        const role = node.getAttribute('role');
        let kind: string;
        if (input?.type === 'range') kind = 'slider';
        else if (input?.type === 'radio' || role === 'radio') kind = 'radio';
        else if (input?.type === 'checkbox' || role === 'checkbox' || role === 'switch') kind = 'checkbox';
        else if (node instanceof HTMLSelectElement) kind = 'select';
        else if (input) kind = 'text';
        else if (node.tagName === 'SUMMARY') kind = 'disclosure';
        else if (node.matches(reset)) kind = 'reset';
        else if (node.hasAttribute('aria-pressed') || node.hasAttribute('aria-selected')) kind = 'toggle';
        else if (node.tagName === 'BUTTON') kind = 'action';
        else kind = 'region';
        const foldPath: number[] = [];
        for (let details = node.parentElement?.closest('details'); details; details = details.parentElement?.closest('details')) {
          const summary = details.querySelector(':scope > summary');
          if (summary === node) continue;
          if (!details.open && summary) foldPath.unshift(tag(summary));
        }
        let label = '';
        if (input || node instanceof HTMLSelectElement) {
          const labels = [...((node as HTMLInputElement).labels ?? [])];
          label = labels.map(visibleText).join(' ');
          if (!label) {
            const labelledby = node.getAttribute('aria-labelledby');
            label = (labelledby ?? '')
              .split(/\s+/)
              .map((id) => (id ? document.getElementById(id) : null))
              .filter((target): target is HTMLElement => Boolean(target))
              .map(visibleText)
              .join(' ');
          }
        } else if (kind !== 'region') {
          label = visibleText(node);
        }
        const group =
          input?.type === 'radio'
            ? `name:${input.name}`
            : role === 'radio'
              ? `radiogroup:${radiogroups.indexOf(node.closest('[role="radiogroup"]') as Element)}`
              : null;
        const state = (() => {
          if (input?.type === 'range') {
            return `value=${input.value} valuetext=${input.getAttribute('aria-valuetext') ?? ''}`;
          }
          if (input?.type === 'radio' || input?.type === 'checkbox') return `checked=${input.checked}`;
          if (input || node instanceof HTMLSelectElement) return `value=${(node as HTMLInputElement).value}`;
          if (node.tagName === 'SUMMARY') return `open=${(node.parentElement as HTMLDetailsElement).open}`;
          // A sort button inside a column header exposes its state as the
          // header's aria-sort, the WAI-ARIA sortable-table pattern.
          const header = node.closest('th, [role="columnheader"]');
          const exposed = ['aria-pressed', 'aria-selected', 'aria-checked', 'aria-expanded', 'disabled']
            .map((name) => `${name}=${node.getAttribute(name)}`)
            .concat(header ? [`aria-sort=${header.getAttribute('aria-sort')}`] : [])
            .join(' ');
          // A button that says what pressing it now does ("Run the bench", then
          // "Stop the bench") exposes its state in its name.
          return node.tagName === 'BUTTON' ? `${exposed} label=${node.getAttribute('aria-label') ?? visibleText(node)}` : exposed;
        })();
        return {
          index,
          kind,
          visibleText: label,
          disabled: (node as HTMLButtonElement).disabled === true || node.getAttribute('aria-disabled') === 'true',
          foldPath,
          caseIds: cases.filter(([, caseSelector]) => node.matches(caseSelector)).map(([id]) => id),
          state,
          value:
            input?.type === 'range'
              ? {
                  value: Number(input.value),
                  min: Number(input.min || 0),
                  max: Number(input.max || 100),
                  step: input.step === 'any' ? 1 : Number(input.step || 1),
                }
              : null,
          group,
          isSummary: node.tagName === 'SUMMARY',
        };
      });
    },
    { cases: caseSelectors, reset: RESET_MARKER, attribute: CONTROL_ATTRIBUTE },
  ) as Promise<ControlFacts[]>;
}

/** The control's exposed state, as `readControls` words it. */
async function controlStateOf(root: Locator, selector: string, index: number): Promise<string> {
  const controls = await readControls(root, selector, []);
  return controls.find((control) => control.index === index)?.state ?? 'absent';
}

/** The designated readouts, keyed so a re-render keeps the key. */
async function readReadouts(root: Locator): Promise<ReadoutReading[]> {
  return root.evaluate(
    (element, { readouts, live, attribute }) => {
      const tag = (node: Element) => Number(node.getAttribute(attribute) ?? -1);
      const seen = new Map<string, number>();
      return [...element.querySelectorAll(readouts)].map((node) => {
        const field = node.closest('[data-figure-control-field], label');
        const control = node.hasAttribute('data-figure-control-value')
          ? (field?.querySelector('input, select') ??
            (field instanceof HTMLLabelElement ? field.control : null) ??
            node.parentElement?.querySelector('input, select') ??
            null)
          : null;
        const base =
          node.getAttribute('data-figure-readout') ||
          node.getAttribute('data-readout') ||
          node.getAttribute('data-testid') ||
          (control ? `control-value:${tag(control)}` : node.tagName.toLowerCase());
        const count = seen.get(base) ?? 0;
        seen.set(base, count + 1);
        const region = node.closest(live);
        const politeness = region
          ? (region.getAttribute('aria-live') ?? (region.getAttribute('role') === 'alert' ? 'assertive' : 'polite'))
          : null;
        let shown = node.checkVisibility({ opacityProperty: true, visibilityProperty: true });
        for (let details = node.closest('details'); shown && details; details = details.parentElement?.closest('details') ?? null) {
          if (!details.open && !details.querySelector(':scope > summary')?.contains(node)) shown = false;
        }
        return {
          key: count ? `${base}#${count}` : base,
          shown,
          text: (node.textContent ?? '').replace(/\s+/g, ' ').trim(),
          live: region && politeness !== 'off' ? `${region.tagName.toLowerCase()}#${[...element.querySelectorAll(live)].indexOf(region)}` : null,
          controlIndex: control ? tag(control) : null,
          controlSays: control
            ? [control.getAttribute('aria-label'), control.getAttribute('aria-valuetext'), (control as HTMLInputElement).value]
                .filter(Boolean)
                .join(' ')
            : null,
        };
      });
    },
    { readouts: READOUT_SELECTOR, live: LIVE_REGION_SELECTOR, attribute: CONTROL_ATTRIBUTE },
  );
}

/** Where focus is, relative to the mount, and how its ring is drawn. */
async function activeInfo(page: Page, root: Locator, selector: string): Promise<ActiveInfo> {
  return root.evaluate(
    (element, focusSelector) => {
      const active = document.activeElement as HTMLElement | null;
      const none = { style: 'none', widthPx: 0, color: '' };
      if (!active || !element.contains(active)) {
        return {
          inRoot: false,
          index: -1,
          descriptor: active ? `${active.tagName.toLowerCase()} outside the mount` : 'nothing',
          closedSummary: false,
          focusVisible: false,
          ring: none,
        };
      }
      void focusSelector;
      const index = Number(active.getAttribute('data-ledger-control') ?? -1);
      const ringOf = (node: Element | null) => {
        if (!node) return none;
        const style = getComputedStyle(node);
        return { style: style.outlineStyle, widthPx: parseFloat(style.outlineWidth) || 0, color: style.outlineColor };
      };
      // A visually hidden native input draws its ring on the label or the
      // element that stands for it.
      const candidates = [active, active.closest('label'), active.nextElementSibling, active.parentElement];
      const ring = candidates.map(ringOf).find((value) => value.style !== 'none' && value.widthPx > 0) ?? ringOf(active);
      const text = (active.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
      return {
        inRoot: true,
        index,
        descriptor: index >= 0 ? `c${index}` : `${active.tagName.toLowerCase()} "${text}"`,
        closedSummary: active.tagName === 'SUMMARY' && !(active.parentElement as HTMLDetailsElement).open,
        focusVisible: active.matches(':focus-visible'),
        ring,
      };
    },
    selector,
  );
}

/**
 * The tab order the document defines for the root as it stands: visible,
 * enabled, non-negative tabindex, one native radio per group, in document
 * order after any positive tabindex.
 */
async function documentTabOrder(root: Locator): Promise<{ order: string[]; positive: number }> {
  return root.evaluate((element, attribute) => {
    const candidates = [
      ...element.querySelectorAll<HTMLElement>(
        'a[href], button, input, select, textarea, summary, [tabindex], [contenteditable="true"]',
      ),
    ];
    const hiddenByFold = (node: Element) => {
      for (let details = node.closest('details'); details; details = details.parentElement?.closest('details') ?? null) {
        const summary = details.querySelector(':scope > summary');
        if (!details.open && !(summary && (summary === node || summary.contains(node)))) return true;
      }
      return false;
    };
    const radioSeen = new Set<string>();
    const tabbable = candidates.filter((node) => {
      if ((node as HTMLButtonElement).disabled) return false;
      if (node instanceof HTMLInputElement && node.type === 'hidden') return false;
      if (node.tagName === 'SUMMARY' && node.parentElement?.querySelector(':scope > summary') !== node) return false;
      if (node.tabIndex < 0 || node.closest('[inert]')) return false;
      if (hiddenByFold(node) || !node.checkVisibility({ visibilityProperty: true })) return false;
      if (node instanceof HTMLInputElement && node.type === 'radio' && node.name) {
        const group = [...element.querySelectorAll<HTMLInputElement>(`input[type="radio"]`)].filter(
          (radio) => radio.name === node.name,
        );
        const entry = group.find((radio) => radio.checked) ?? group[0];
        if (entry !== node || radioSeen.has(node.name)) return false;
        radioSeen.add(node.name);
      }
      return true;
    });
    const positive = tabbable.filter((node) => node.tabIndex > 0);
    const ordered = [...positive.sort((a, b) => a.tabIndex - b.tabIndex), ...tabbable.filter((node) => node.tabIndex === 0)];
    return {
      positive: positive.length,
      order: ordered.map((node) => {
        const index = Number(node.getAttribute(attribute) ?? -1);
        return index >= 0
          ? `c${index}`
          : `${node.tagName.toLowerCase()} "${(node.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40)}"`;
      }),
    };
  }, CONTROL_ATTRIBUTE);
}

/**
 * Text runs in the root a sighted reader can see: opacity and visibility
 * included, and text clipped to nothing (a screen-reader-only live region)
 * left out. Such a region is written on a timer after the figure settles,
 * so counting it would credit whichever hover or focus window it landed in
 * with a reveal neither of them made.
 */
async function visibleRuns(root: Locator): Promise<string[]> {
  return root.evaluate((element) => {
    const clippedAway = new Map<Element, boolean>();
    const isClippedAway = (node: Element): boolean => {
      const known = clippedAway.get(node);
      if (known !== undefined) return known;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      const own =
        style.clip === 'rect(0px, 0px, 0px, 0px)' ||
        style.clipPath === 'inset(50%)' ||
        (style.overflow !== 'visible' && rect.width <= 1 && rect.height <= 1);
      const result = own || (node !== element && node.parentElement !== null && isClippedAway(node.parentElement));
      clippedAway.set(node, result);
      return result;
    };
    const runs = new Set<string>();
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = (node.textContent ?? '').replace(/\s+/g, ' ').trim();
      const parent = node.parentElement;
      if (!text || !parent) continue;
      if (!parent.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
      if (isClippedAway(parent)) continue;
      runs.add(text);
    }
    return [...runs];
  });
}

/**
 * The root as path-keyed lines, read the way `stateDigest` reads it (inline
 * styles in their CSSOM form with an emptied one dropped, React ids folded,
 * live-region content left out), so two readings differ exactly where two
 * digests do and the difference can be named.
 */
async function flatReading(root: Locator): Promise<Map<string, string>> {
  const lines = await root.evaluate((element) => {
    const fold = (value: string) => value.replace(/_[rR]_[A-Za-z0-9]*_/g, '_id_').replace(/:[rR][A-Za-z0-9]*:/g, ':id:');
    const out: Array<[string, string]> = [];
    const walk = (node: Element, path: string) => {
      const current = node as HTMLElement | SVGElement;
      const attributes = [...current.attributes]
        .filter(({ name }) => name !== 'style' && !name.startsWith('data-ledger'))
        .map(({ name, value }) => `${name}=${fold(value).slice(0, 60)}`);
      const style = current.style?.cssText.trim();
      if (style) attributes.push(`style=${style.slice(0, 60)}`);
      const live = current.matches('[aria-live], [role="status"], [role="alert"]');
      const text = live
        ? ''
        : [...node.childNodes]
            .filter((child) => child.nodeType === Node.TEXT_NODE)
            .map((child) => child.textContent ?? '')
            .join('')
            .replace(/\s+/g, ' ')
            .trim();
      out.push([path, `${node.tagName.toLowerCase()} [${attributes.sort().join(' ')}] "${text.slice(0, 60)}"`]);
      if (live) return;
      [...node.children].forEach((child, index) => walk(child, `${path}/${index}`));
    };
    walk(element, '');
    const controls = [...element.querySelectorAll('input, select, textarea')].map((control, index): [string, string] => [
      `value ${index}`,
      control instanceof HTMLInputElement
        ? `${control.type}:${control.value}:${control.checked}`
        : (control as HTMLSelectElement | HTMLTextAreaElement).value,
    ]);
    return [...out, ...controls];
  });
  return new Map(lines);
}

/** Up to six lines naming what differs between two readings, then how many more. */
function differences(was: ReadonlyMap<string, string>, now: ReadonlyMap<string, string>): string[] {
  const lines: string[] = [];
  let total = 0;
  for (const key of new Set([...was.keys(), ...now.keys()])) {
    const before = was.get(key);
    const after = now.get(key);
    if (before === after) continue;
    total += 1;
    if (lines.length < 6) {
      lines.push(before === undefined ? `added ${after}` : after === undefined ? `removed ${before}` : `${before} -> ${after}`);
    }
  }
  if (total > lines.length) lines.push(`and ${total - lines.length} more`);
  return lines;
}

async function duplicateIds(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const counts = new Map<string, number>();
    for (const node of document.querySelectorAll('[id]')) counts.set(node.id, (counts.get(node.id) ?? 0) + 1);
    return [...counts].filter(([, count]) => count > 1).map(([id, count]) => `${id}×${count}`);
  });
}

/** The accessible names Chromium's accessibility tree gives the controls at `indices`. */
async function accessibleNames(session: Session, indices: readonly number[]): Promise<Map<number, string>> {
  const names = new Map<number, string>();
  if (indices.length === 0) return names;
  const cdp = await session.page.context().newCDPSession(session.page);
  try {
    await session.root.evaluate(
      (element, { focusSelector, wanted }) => {
        const controls = [...element.querySelectorAll(focusSelector)];
        for (const index of wanted) controls[index]?.setAttribute('data-ledger-probe', String(index));
      },
      { focusSelector: session.selector, wanted: [...indices] },
    );
    const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
    for (const index of indices) {
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: `[data-ledger-probe="${index}"]` });
      if (!nodeId) continue;
      const { nodes } = await cdp.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false });
      const node = nodes.find((candidate) => !candidate.ignored) ?? nodes[0];
      names.set(index, String(node?.name?.value ?? '').replace(/\s+/g, ' ').trim());
    }
  } finally {
    await session.page.evaluate(() => {
      for (const node of document.querySelectorAll('[data-ledger-probe]')) node.removeAttribute('data-ledger-probe');
    });
    await cdp.detach();
  }
  return names;
}

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/**
 * Numbers by size, as `duplicateAnnouncements` compares them: one region
 * says "x -0.23" where another says "0.23 left", and both say the readout.
 */
const numbersIn = (text: string) =>
  (text.replace(/[\u2212\u2013]/g, '-').match(/-?\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => Math.abs(Number(n.replace(/,/g, ''))));

/** Whether spoken text carries a readout: its words, or every number it prints. */
function speaks(spoken: string, readout: string): boolean {
  const said = normalize(spoken);
  if (said.includes(normalize(readout))) return true;
  const numbers = numbersIn(readout);
  if (numbers.length === 0) return false;
  const spokenNumbers = new Set(numbersIn(spoken));
  return numbers.every((number) => spokenNumbers.has(number));
}

/* ------------------------------------------------------------------ */
/* One mount                                                           */
/* ------------------------------------------------------------------ */

type Session = {
  page: Page;
  root: Locator;
  status: number;
  staticBase: string;
  plan: InteractiveLedgerPlan;
  mount: LedgerPlanMount;
  selector: string;
  controls: ControlFacts[];
  bases: Map<string, string>;
  /** Each base's flat reading, so a base a fresh load cannot reach says how it differs. */
  baseReadings: Map<string, Map<string, string>>;
  restores: number;
  plant: LedgerPlant | undefined;
  /** Rings of radios focus reaches by arrow keys, which the Tab walk passes over. */
  arrowRings: Map<number, { focusVisible: boolean; ring: ActiveInfo['ring'] }>;
  /** Each control's shape and words at load, to find it again after a re-render. */
  signatures: Array<[string, string]>;
  /** What the driver is doing, for an error to say where it happened. */
  trace: { step: string };
};

/** A defect planted in the page after it loads, to prove a clause can fail. */
export type LedgerPlant = (page: Page, root: Locator) => Promise<void>;

const pathKey = (path: readonly number[]) => path.join('/');
const within = (path: readonly number[], prefix: readonly number[]) =>
  path.length >= prefix.length && prefix.every((step, index) => path[index] === step);

const controlAt = (session: Session, index: number) => session.root.locator(`[${CONTROL_ATTRIBUTE}="${index}"]`);

async function focusControl(session: Session, index: number) {
  await relink(session);
  await controlAt(session, index).evaluate((element) => {
    (element as HTMLElement).scrollIntoView({ block: 'center' });
    (element as HTMLElement).focus();
  });
}

/** Opens the folds on `path`, outermost first, each by keyboard on its summary. */
async function openPath(session: Session, path: readonly number[]) {
  for (const summary of path) {
    await focusControl(session, summary);
    await session.page.keyboard.press('Enter');
    await quiet(session.page, SETTLE_MS);
  }
}

/** Reloads the mount and re-opens `path`, when a transition could not return. */
async function restore(session: Session, path: readonly number[]) {
  session.restores += 1;
  const fresh = await openMount(session.page, session.staticBase, session.plan, session.mount);
  session.root = fresh.root;
  await session.plant?.(session.page, session.root);
  await installRecorder(session.root);
  await openPath(session, path);
  const digest = await stateDigest(session.root);
  const expected = session.bases.get(pathKey(path));
  if (expected && digest !== expected) {
    const differs = differences(session.baseReadings.get(pathKey(path)) ?? new Map(), await flatReading(session.root));
    throw new Error(
      `${session.mount.mountId}: a fresh load with folds [${path.join(', ')}] opened does not reach its recorded state (recorded -> fresh): ${differs.join(' | ')}`,
    );
  }
}

async function ensureBase(session: Session, path: readonly number[]) {
  const expected = session.bases.get(pathKey(path))!;
  if ((await stateDigest(session.root)) !== expected) await restore(session, path);
  else await relink(session);
}

/** What identifies each marked control across a re-render: its shape (element, type, name, test id, role, value of a choice) and its words at load. */
async function controlSignatures(root: Locator): Promise<Array<[string, string]>> {
  return root.evaluate(
    (element, attribute) => {
      // Kept in step with the shape in relink.
      const shape = (node: Element) => {
        const choice = node instanceof HTMLInputElement && (node.type === 'radio' || node.type === 'checkbox');
        return [node.tagName, node.getAttribute('type'), node.getAttribute('name'), node.getAttribute('data-testid'),
          node.getAttribute('data-brand-control-id'), node.getAttribute('role'), choice ? node.value : ''].join('|');
      };
      return [...element.querySelectorAll(`[${attribute}]`)]
        .sort((a, b) => Number(a.getAttribute(attribute)) - Number(b.getAttribute(attribute)))
        .map((node) => [shape(node), (node.textContent ?? '').replace(/\s+/g, ' ').trim()] as [string, string]);
    },
    CONTROL_ATTRIBUTE,
  );
}

/**
 * A control React re-created (a table re-sorted, a list re-keyed) loses its
 * ledger mark. Each lost index is given back to the unmarked control of the
 * same shape with the same words, or, where the words changed, to the
 * unmarked controls of that shape in document order when they number
 * exactly the lost ones.
 */
async function relink(session: Session) {
  await session.root.evaluate(
    (element, [selector, attribute, signatures]) => {
      const marked = new Set([...element.querySelectorAll(`[${attribute}]`)].map((node) => node.getAttribute(attribute)));
      const missing = signatures.map((_, index) => index).filter((index) => !marked.has(String(index)));
      if (missing.length === 0) return;
      // Kept in step with the shape in controlSignatures.
      const shape = (node: Element) => {
        const choice = node instanceof HTMLInputElement && (node.type === 'radio' || node.type === 'checkbox');
        return [node.tagName, node.getAttribute('type'), node.getAttribute('name'), node.getAttribute('data-testid'),
          node.getAttribute('data-brand-control-id'), node.getAttribute('role'), choice ? node.value : ''].join('|');
      };
      const words = (node: Element) => (node.textContent ?? '').replace(/\s+/g, ' ').trim();
      const free = [...element.querySelectorAll(selector)].filter((node) => !node.hasAttribute(attribute));
      const unplaced: number[] = [];
      for (const index of missing) {
        const [wantShape, wantWords] = signatures[index];
        const pick = free.find((node) => shape(node) === wantShape && words(node) === wantWords);
        if (!pick) {
          unplaced.push(index);
          continue;
        }
        pick.setAttribute(attribute, String(index));
        free.splice(free.indexOf(pick), 1);
      }
      for (const wantShape of new Set(unplaced.map((index) => signatures[index][0]))) {
        const lost = unplaced.filter((index) => signatures[index][0] === wantShape);
        const candidates = free.filter((node) => shape(node) === wantShape);
        if (candidates.length !== lost.length) continue;
        lost.forEach((index, k) => candidates[k].setAttribute(attribute, String(index)));
      }
    },
    [session.selector, CONTROL_ATTRIBUTE, session.signatures] as const,
  );
}

function sliderReturnKeys(from: number, to: number, facts: NonNullable<ControlFacts['value']>): string[] {
  const steps = (value: number) => Math.round((value - facts.min) / facts.step);
  const at = steps(from);
  const target = steps(to);
  const last = steps(facts.max);
  const direct = Array.from({ length: Math.abs(target - at) }, () => (target > at ? 'ArrowRight' : 'ArrowLeft'));
  const viaHome = ['Home', ...Array.from({ length: target }, () => 'ArrowRight')];
  const viaEnd = ['End', ...Array.from({ length: last - target }, () => 'ArrowLeft')];
  return [direct, viaHome, viaEnd].sort((a, b) => a.length - b.length)[0];
}

/** Presses keys, compressing long runs of one key in the record. */
async function press(page: Page, keys: readonly string[]) {
  for (const key of keys) await page.keyboard.press(key);
}

function compress(keys: readonly string[]): string[] {
  const out: string[] = [];
  for (let index = 0; index < keys.length; ) {
    let run = 1;
    while (keys[index + run] === keys[index]) run += 1;
    out.push(run > 1 ? `${keys[index]}×${run}` : keys[index]);
    index += run;
  }
  return out;
}

/** Each enabled marked slider's value. */
async function sliderValues(session: Session): Promise<Map<number, number>> {
  const pairs = await session.root.evaluate((element, attribute) => {
    return [...element.querySelectorAll<HTMLInputElement>(`input[type="range"][${attribute}]`)]
      .filter((input) => !input.disabled)
      .map((input) => [Number(input.getAttribute(attribute)), Number(input.value)] as [number, number]);
  }, CONTROL_ATTRIBUTE);
  return new Map(pairs);
}

async function pressedSet(session: Session): Promise<number[]> {
  return session.root.evaluate((element, attribute) => {
    const controls = [...element.querySelectorAll(`[${attribute}]`)];
    return controls.flatMap((node) =>
      node.getAttribute('aria-pressed') === 'true' || node.getAttribute('aria-selected') === 'true'
        ? [Number(node.getAttribute(attribute))]
        : [],
    );
  }, CONTROL_ATTRIBUTE);
}

async function series(root: Locator): Promise<LedgerSeries> {
  return seriesComparison(await collectFrame(root));
}

type Plan = {
  caseId: string;
  keys: string[];
  /** The control focused before the keys, when it is not the operated one (a radio group's checked radio). */
  focusFirst?: number;
  /** The control focus should rest on after the keys. */
  target: number;
  pointer: ((session: Session) => Promise<string>) | { reason: string };
  readSeries: boolean;
};

async function pointerClick(session: Session, index: number): Promise<string> {
  await relink(session);
  const point = await controlAt(session, index).evaluate((element) => {
    const input = element as HTMLInputElement;
    // A visually hidden native radio is clicked where a reader clicks it: its label.
    const hidden =
      input.type === 'radio' &&
      (!element.checkVisibility({ opacityProperty: true }) || element.getBoundingClientRect().width < 4);
    const target = hidden && input.labels?.[0] ? input.labels[0] : element;
    target.scrollIntoView({ block: 'center' });
    const rect = target.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, label: target !== element };
  });
  await session.page.mouse.click(point.x, point.y);
  return point.label ? 'click on its label' : 'click';
}

async function pointerSliderEnd(session: Session, index: number, end: 'min' | 'max'): Promise<string> {
  await relink(session);
  const control = controlAt(session, index);
  await control.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  const box = await control.boundingBox();
  if (!box) throw new Error(`${session.mount.mountId}: slider ${index} has no box to click`);
  const x = end === 'max' ? box.x + box.width - 0.5 : box.x + 0.5;
  await session.page.mouse.click(x, box.y + box.height / 2);
  return `click at the track's ${end === 'max' ? 'right' : 'left'} end`;
}

function transitionPlans(session: Session, facts: ControlFacts): Plan[] {
  const caseOf = (kind: string) =>
    session.mount.cases.find((stateCase) => stateCase.kind === kind && !stateCase.notApplicableReason && stateCase.selector)?.id;
  const focusCase = caseOf('focus')!;
  const discreteCase = caseOf('discrete-options') ?? focusCase;
  const sliderCase = caseOf('slider-boundaries') ?? focusCase;
  const { index } = facts;
  switch (facts.kind) {
    case 'slider': {
      const value = facts.value!;
      const plans: Plan[] = [];
      if (value.value < value.max) {
        plans.push({
          caseId: sliderCase,
          keys: ['End'],
          target: index,
          pointer: (session) => pointerSliderEnd(session, index, 'max'),
          readSeries: true,
        });
      }
      if (value.value > value.min) {
        plans.push({
          caseId: sliderCase,
          keys: ['Home'],
          target: index,
          pointer: (session) => pointerSliderEnd(session, index, 'min'),
          readSeries: true,
        });
      }
      plans.push({
        caseId: sliderCase,
        keys: [value.value < value.max ? 'ArrowRight' : 'ArrowLeft'],
        target: index,
        pointer: { reason: 'one key step has no exact pointer equivalent; the End and Home states carry the pointer parity' },
        readSeries: false,
      });
      return plans;
    }
    case 'toggle':
      return [{ caseId: discreteCase, keys: ['Space'], target: index, pointer: (s) => pointerClick(s, index), readSeries: true }];
    case 'checkbox':
      return [{ caseId: discreteCase, keys: ['Space'], target: index, pointer: (s) => pointerClick(s, index), readSeries: true }];
    case 'disclosure':
      return [{ caseId: discreteCase, keys: ['Enter'], target: index, pointer: (s) => pointerClick(s, index), readSeries: false }];
    case 'action':
      return [{ caseId: focusCase, keys: ['Enter'], target: index, pointer: (s) => pointerClick(s, index), readSeries: true }];
    case 'select':
      return [
        {
          caseId: discreteCase,
          keys: ['ArrowDown'],
          target: index,
          pointer: { reason: 'a native select list opens outside the page; its keyboard change is the reader path' },
          readSeries: true,
        },
      ];
    case 'text':
      return [
        {
          caseId: focusCase,
          keys: ['a'],
          target: index,
          pointer: { reason: 'typing has no pointer equivalent' },
          readSeries: false,
        },
      ];
    case 'radio': {
      const group = session.controls.filter((control) => control.group === facts.group && control.foldPath.join() === facts.foldPath.join());
      const checked = group.find((control) => /checked=true|aria-checked=true/.test(control.state)) ?? group[0];
      if (checked.index === index) {
        return [{ caseId: discreteCase, keys: ['Space'], target: index, pointer: (s) => pointerClick(s, index), readSeries: true }];
      }
      const position = (control: ControlFacts) => group.indexOf(control);
      const steps = (position(facts) - position(checked) + group.length) % group.length;
      return [
        {
          caseId: discreteCase,
          keys: Array.from({ length: steps }, () => 'ArrowRight'),
          focusFirst: checked.index,
          target: index,
          pointer: (s) => pointerClick(s, index),
          readSeries: true,
        },
      ];
    }
    default:
      return [];
  }
}

/** Keys that return the mount from the operated state to its base, read off what moved. */
async function returnKeys(
  session: Session,
  facts: ControlFacts,
  plan: Plan,
  pressedBefore: number[],
): Promise<{ focus: number | null; keys: string[] }[]> {
  switch (facts.kind) {
    case 'slider': {
      await relink(session);
      const now = Number(await controlAt(session, facts.index).inputValue());
      return [{ focus: facts.index, keys: sliderReturnKeys(now, facts.value!.value, facts.value!) }];
    }
    case 'toggle': {
      const after = new Set(await pressedSet(session));
      const released = pressedBefore.filter((index) => !after.has(index) && index !== facts.index);
      if (released.length > 0) return released.map((index) => ({ focus: index, keys: ['Space'] }));
      const flipped = pressedBefore.includes(facts.index) !== after.has(facts.index);
      return flipped ? [{ focus: facts.index, keys: ['Space'] }] : [];
    }
    case 'checkbox':
    case 'disclosure':
      return [{ focus: facts.index, keys: plan.keys }];
    case 'select':
      return [{ focus: facts.index, keys: ['ArrowUp'] }];
    case 'text':
      return [{ focus: facts.index, keys: ['Backspace'] }];
    case 'radio':
      return plan.keys.length > 0 && plan.keys[0] !== 'Space'
        ? [{ focus: facts.index, keys: plan.keys.map(() => 'ArrowLeft') }]
        : [];
    case 'action': {
      // A run that ended on its default frame needs nothing; one the
      // control can stop (it says it is pressed, or its name now says
      // what pressing it again does) is stopped by it.
      const exposed = await controlStateOf(session.root, session.selector, facts.index);
      const renamed = exposed.replace(/^.* label=/, '') !== facts.state.replace(/^.* label=/, '');
      return /aria-pressed=true/.test(exposed) || (renamed && !/(^| )disabled=(?!null)/.test(exposed))
        ? [{ focus: facts.index, keys: ['Enter'] }]
        : [];
    }
    default:
      return [];
  }
}

async function runReturn(session: Session, steps: { focus: number | null; keys: string[] }[]): Promise<string[]> {
  const record: string[] = [];
  for (const step of steps) {
    if (step.focus !== null) {
      await focusControl(session, step.focus);
      record.push(`focus c${step.focus}`);
    }
    await press(session.page, step.keys);
    record.push(...compress(step.keys));
    await quiet(session.page, SETTLE_MS);
  }
  return record;
}

async function runTransition(session: Session, facts: ControlFacts, plan: Plan, base: Base): Promise<LedgerTransition> {
  const { page } = session;
  const started = Date.now();
  session.trace.step = `c${facts.index} ${compress(plan.keys).join('+')} from [${base.path.join(', ')}]`;
  await ensureBase(session, base.path);
  await focusControl(session, plan.focusFirst ?? facts.index);
  await quiet(page, 150);
  const beforeDigest = await stateDigest(session.root);
  const beforeState = await controlStateOf(session.root, session.selector, plan.target);
  const readoutsBefore = await readReadouts(session.root);
  const pressedBefore = await pressedSet(session);
  const slidersBefore = await sliderValues(session);
  await controlAt(session, plan.target).evaluate((element) => {
    (window as unknown as { __ledgerTarget: Element }).__ledgerTarget = element;
  });
  const beforeReading = await flatReading(session.root);
  const mark = await spokenCount(page);

  await press(page, plan.keys);
  const { afterDigest, afterState, readoutsAfter } = await settledRead(page, async () => ({
    afterDigest: await stateDigest(session.root),
    afterState: await controlStateOf(session.root, session.selector, plan.target),
    readoutsAfter: await readReadouts(session.root),
  }));
  const announcements = await spokenSince(page, mark);
  const focus = await page.evaluate(() => {
    const active = document.activeElement;
    const target = (window as unknown as { __ledgerTarget: Element }).__ledgerTarget;
    return {
      retained: active === target,
      visible: active?.matches(':focus-visible') ?? false,
      after:
        active === target
          ? 'the operated control'
          : active
            ? `${active.tagName.toLowerCase()} "${(active.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40)}"`
            : 'nothing',
    };
  });
  if (facts.kind === 'radio' && focus.retained && !session.arrowRings.has(plan.target)) {
    const info = await activeInfo(page, session.root, session.selector);
    if (info.index === plan.target) session.arrowRings.set(info.index, { focusVisible: info.focusVisible, ring: info.ring });
  }
  const valueText = facts.kind === 'slider' ? await controlAt(session, facts.index).getAttribute('aria-valuetext') : null;
  const ids = await duplicateIds(page);
  const seriesAfter = plan.readSeries ? await series(session.root) : null;
  const changes = differences(beforeReading, await flatReading(session.root));

  const beforeByKey = new Map(readoutsBefore.map((reading) => [reading.key, reading]));
  const afterByKey = new Map(readoutsAfter.map((reading) => [reading.key, reading]));
  const keys = [...new Set([...beforeByKey.keys(), ...afterByKey.keys()])];
  const readouts = keys.map((key) => {
    const before = beforeByKey.get(key)?.text ?? '';
    const reading = afterByKey.get(key) ?? beforeByKey.get(key)!;
    const after = afterByKey.get(key)?.text ?? '';
    let announced: LedgerTransition['readouts'][number]['announced'];
    if (before === after) announced = 'unchanged';
    else if (!afterByKey.get(key)?.shown) announced = 'hidden';
    else if (reading.live && announcements.some(({ region }) => region.startsWith(`${reading.live}[`))) announced = 'live-region';
    else if (
      facts.kind === 'slider' &&
      (reading.controlIndex === facts.index || valueTextCovers(valueText, after))
    ) {
      announced = 'value-text';
    } else if (!beforeByKey.has(key) && reading.controlIndex === -1 && reading.controlSays && speaks(reading.controlSays, after)) {
      // The value readout of a control the action added: the new control says it when it is reached.
      announced = 'value-text';
    } else if (after && announcements.some(({ text }) => speaks(text, after))) announced = 'announcer';
    else if (!after && announcements.length > 0) announced = 'announcer';
    else announced = 'none';
    return { key, before, after, announced };
  });

  const ownStateMoved = beforeState !== afterState;
  const stateExposed =
    facts.kind === 'action'
      ? ownStateMoved || (afterDigest !== beforeDigest && announcements.length > 0) || afterDigest === beforeDigest
      : facts.kind === 'toggle'
        ? ownStateMoved || /aria-(pressed|selected)=true/.test(afterState)
        : facts.kind === 'radio'
          ? /checked=true|aria-checked=true/.test(afterState)
          : ownStateMoved;

  const returned = await returnTo(session, facts, plan, pressedBefore, slidersBefore, base, beforeDigest, beforeReading, afterDigest);

  let pointer: LedgerTransition['pointer'];
  if ('reason' in plan.pointer) {
    pointer = plan.pointer;
  } else {
    await ensureBase(session, base.path);
    await quiet(page, 150);
    const action = await plan.pointer(session);
    await page.mouse.move(2, 2);
    // Read after the same wait as the keyboard's result, so a run is compared where it ends.
    const digest = await settledRead(page, () => stateDigest(session.root));
    pointer = { action, digest, matches: digest === afterDigest };
    if (digest !== beforeDigest) await returnTo(session, facts, plan, pressedBefore, slidersBefore, base, beforeDigest, beforeReading, digest);
  }
  // Whatever the steps above left to say is said before the next transition listens.
  await quiet(page, ANNOUNCEMENT_WINDOW_MS);
  await ensureBase(session, base.path);

  return {
    caseId: plan.caseId,
    control: plan.target,
    fold: base.path.length ? base.path[base.path.length - 1] : null,
    keys: compress(plan.keys).length ? compress(plan.keys) : ['(none)'],
    before: { digest: beforeDigest, control: beforeState },
    after: { digest: afterDigest, control: afterState },
    stateExposed,
    readouts,
    announcements,
    focus,
    duplicateIds: ids,
    pointer,
    changes,
    returned,
    series: seriesAfter,
    durationMs: Date.now() - started,
  };
}

/**
 * Returns the mount to the state a transition left, by keyboard: through
 * the control itself first, then through any other slider the action moved
 * (a step button advances a slider; a slider clamps its partner), and,
 * where the figure registers a reset, through the reset when the controls
 * alone do not restore the exact state.
 */
async function returnTo(
  session: Session,
  facts: ControlFacts,
  plan: Plan,
  pressedBefore: number[],
  slidersBefore: ReadonlyMap<number, number>,
  base: Base,
  beforeDigest: string,
  beforeReading: ReadonlyMap<string, string>,
  fromDigest: string,
): Promise<LedgerTransition['returned']> {
  const keys: string[] = [];
  if (fromDigest !== beforeDigest) {
    keys.push(...(await runReturn(session, await returnKeys(session, facts, plan, pressedBefore))));
  }
  let digest = await stateDigest(session.root);
  if (digest !== beforeDigest) {
    const now = await sliderValues(session);
    const moved = [...slidersBefore].filter(([index, value]) => index !== facts.index && now.has(index) && now.get(index) !== value);
    keys.push(
      ...(await runReturn(
        session,
        moved.map(([index, value]) => ({ focus: index, keys: sliderReturnKeys(now.get(index)!, value, session.controls[index].value!) })),
      )),
    );
    digest = await stateDigest(session.root);
  }
  let via: LedgerTransition['returned']['via'] = digest === beforeDigest ? (keys.length ? 'control' : 'none-needed') : 'control';
  if (digest !== beforeDigest && session.mount.hasReset) {
    keys.push(...(await pressReset(session, base.path)));
    digest = await stateDigest(session.root);
    via = 'reset';
  }
  const restored = digest === beforeDigest;
  return { keys, digest, restored, via, residue: restored ? [] : differences(beforeReading, await flatReading(session.root)) };
}

/** Presses the figure's reset by keyboard, opening and closing any fold it sits in. */
async function pressReset(session: Session, path: readonly number[]): Promise<string[]> {
  const reset = session.controls.find((control) => control.kind === 'reset');
  if (!reset) return [];
  const toOpen = reset.foldPath.filter((summary) => !path.includes(summary));
  const record: string[] = [];
  for (const summary of toOpen) {
    await focusControl(session, summary);
    await session.page.keyboard.press('Enter');
    record.push(`focus c${summary}`, 'Enter');
  }
  await focusControl(session, reset.index);
  await session.page.keyboard.press('Enter');
  record.push(`focus c${reset.index}`, 'Enter');
  await quiet(session.page, SETTLE_MS);
  for (const summary of toOpen.toReversed()) {
    await focusControl(session, summary);
    await session.page.keyboard.press('Enter');
    record.push(`focus c${summary}`, 'Enter');
  }
  await quiet(session.page, SETTLE_MS);
  return record;
}

async function hoverReading(session: Session, target: Locator, label: string, control: number | null, base: Base): Promise<LedgerHover> {
  const { page } = session;
  session.trace.step = `hover ${label}`;
  await ensureBase(session, base.path);
  await page.mouse.move(2, 2);
  await page.waitForTimeout(100);
  await target.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  const runs = new Set(await visibleRuns(session.root));
  const baseDigest = await stateDigest(session.root);
  const revealed = async () => {
    const digest = await stateDigest(session.root);
    const now = await visibleRuns(session.root);
    return [...(digest !== baseDigest ? [`dom ${digest.slice(0, 12)}`] : []), ...now.filter((run) => !runs.has(run))];
  };
  const box = await target.boundingBox();
  let hoverRevealed: string[] = [];
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(200);
    hoverRevealed = await revealed();
    await page.mouse.move(2, 2);
    await page.waitForTimeout(150);
  }
  let focusRevealed: string[] = [];
  const focusable = await target.evaluate((element) => (element as HTMLElement).tabIndex >= 0 && !(element as HTMLButtonElement).disabled);
  if (focusable) {
    await target.evaluate((element) => (element as HTMLElement).focus());
    await page.waitForTimeout(200);
    focusRevealed = await revealed();
    await target.evaluate((element) => (element as HTMLElement).blur());
    await page.waitForTimeout(100);
  }
  return { target: label, control, hoverRevealed, focusRevealed };
}

/** The Tab walk: focus order, which controls the keyboard reaches, and their rings. */
async function traverse(session: Session) {
  const { page, root, selector } = session;
  session.trace.step = 'tab walk';
  await root.evaluate((element, attribute) => {
    const sentinel = document.createElement('button');
    sentinel.setAttribute(attribute, '');
    sentinel.textContent = 'ledger sentinel';
    element.before(sentinel);
    sentinel.focus();
  }, SENTINEL_ATTRIBUTE);
  const visited: string[] = [];
  const rings = new Map<number, { focusVisible: boolean; ring: ActiveInfo['ring'] }>();
  const opened: number[] = [];
  for (let step = 0; step < 600; step += 1) {
    await page.keyboard.press('Tab');
    const info = await activeInfo(page, root, selector);
    if (!info.inRoot) break;
    visited.push(info.descriptor);
    if (info.index >= 0 && !rings.has(info.index)) rings.set(info.index, { focusVisible: info.focusVisible, ring: info.ring });
    if (info.closedSummary) {
      await page.keyboard.press('Enter');
      opened.push(info.index);
      await page.waitForTimeout(80);
    }
  }
  const expected = await documentTabOrder(root);
  await page.evaluate((attribute) => document.querySelector(`[${attribute}]`)?.remove(), SENTINEL_ATTRIBUTE);
  for (const summary of opened.toReversed()) {
    await focusControl(session, summary);
    await page.keyboard.press('Enter');
  }
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
  await quiet(page, ANNOUNCEMENT_WINDOW_MS);
  return { visited, expected: expected.order, positive: expected.positive, rings };
}

/** Whether a slider's value as loaded is printed in its visible label or value readout. */
async function defaultStated(session: Session, index: number): Promise<boolean> {
  return controlAt(session, index).evaluate((element) => {
    const input = element as HTMLInputElement;
    const numbers = (text: string) =>
      (text.replace(/[\u2212\u2013]/g, '-').match(/-?\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => n.replace(/,/g, ''));
    const visible = (node: Element | null) =>
      node && node.checkVisibility({ opacityProperty: true, visibilityProperty: true }) ? (node as HTMLElement).innerText : '';
    // The visible value readout states the default when it prints a number
    // the slider itself says (its value or value text), and every other
    // number it prints is one of those or an end of the range ("3 of 12").
    const field = input.closest('[data-figure-control-field]') ?? input.labels?.[0] ?? null;
    const readout = field?.querySelector('[data-figure-control-value]') ?? null;
    const shown = readout ? visible(readout) : [...(input.labels ?? [])].map(visible).join(' ');
    const said = new Set([...numbers(input.getAttribute('aria-valuetext') ?? ''), ...numbers(input.value)].map(Number));
    const ends = new Set([Number(input.min), Number(input.max)]);
    const printed = numbers(shown).map(Number);
    return printed.some((number) => said.has(number)) && printed.every((number) => said.has(number) || ends.has(number));
  });
}

async function telemetryOf(root: Locator, mount: LedgerPlanMount, readouts: ReadoutReading[]) {
  const text = await root.evaluate((element) => (element.textContent ?? '').replace(/\s+/g, ' ').trim());
  return {
    kind: INTERACTIVE_DATA_CLASSIFICATION[mount.sourceId]?.kind ?? null,
    numericReadouts: readouts.filter(({ text: value }) => /\d/.test(value)).map(({ key, text: value }) => `${key}: ${value}`),
    selfLabelled: STATUS_LABEL_VOCABULARY.source.test(text),
  };
}

async function defaultReading(root: Locator, selector: string) {
  const readouts = await readReadouts(root);
  const controls = await readControls(root, selector, []);
  const extra = await root.evaluate((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      tokens: {
        color: style.color,
        signal: style.getPropertyValue('--color-signal').trim(),
        fontFamily: style.fontFamily.split(',')[0].replace(/["']/g, '').trim(),
      },
      geometry: {
        widthPx: Math.round(rect.width * 10) / 10,
        heightPx: Math.round(rect.height * 10) / 10,
        viewBoxes: [...element.querySelectorAll('svg[viewBox]')].map((svg) => svg.getAttribute('viewBox') ?? ''),
      },
    };
  });
  return { readouts, controls, ...extra };
}

/** The main reading of one mount: controls, transitions, hover, reset and pairwise. */
export async function measureLedgerMount(
  browser: Browser,
  staticBase: string,
  plan: InteractiveLedgerPlan,
  mount: LedgerPlanMount,
  plant?: LedgerPlant,
): Promise<Omit<LedgerObservation, 'idle'>> {
  const trace = { step: 'open' };
  return inOwnContext(
    browser,
    async (page) => {
      // Six figures are driven at once, and a heavy redraw can hold a page's main thread.
      page.setDefaultTimeout(30_000);
      try {
        return await measureOn(page, staticBase, plan, mount, plant, trace);
      } catch (error) {
        const roots = await page.locator(`[${MOUNT_ATTRIBUTE}]`).count().catch(() => -1);
        const message = error instanceof Error ? error.message.split('\n')[0] : String(error);
        const frames = error instanceof Error ? (error.stack ?? '').split('\n').filter((line) => line.includes('interactive-ledger-driver')) : [];
        const where = frames
          .slice(0, 3)
          .map((line) => line.trim().replace(/^at /, '').replace(/\(.*interactive-ledger-driver\.ts:(\d+):\d+\)/, 'line $1'))
          .join(' < ');
        throw new Error(`${message} [at ${trace.step}; ${where}; ${page.url()}; ${roots} marked root(s)]`, { cause: error });
      }
    },
    { ...PLAIN_CONTEXT, viewport: INTERACTIVE_LEDGER_VIEWPORT, reducedMotion: 'reduce' },
  );
}

async function measureOn(
  page: Page,
  staticBase: string,
  plan: InteractiveLedgerPlan,
  mount: LedgerPlanMount,
  plant: LedgerPlant | undefined,
  trace: { step: string },
): Promise<Omit<LedgerObservation, 'idle'>> {
    const opened = await openMount(page, staticBase, plan, mount);
    await plant?.(page, opened.root);
    await installRecorder(opened.root);
    const focusCase = mount.cases.find(({ kind, selector }) => kind === 'focus' && selector);
    if (!focusCase?.selector) throw new Error(`${mount.mountId} registers no focus case to enumerate controls by`);
    const caseSelectors = mount.cases
      .filter(({ selector, notApplicableReason }) => selector && !notApplicableReason)
      .map(({ id, selector }) => [id, selector!] as [string, string]);
    const session: Session = {
      page,
      root: opened.root,
      status: opened.status,
      staticBase,
      plan,
      mount,
      selector: focusCase.selector,
      controls: [],
      bases: new Map(),
      baseReadings: new Map(),
      restores: 0,
      plant,
      arrowRings: new Map(),
      signatures: [],
      trace,
    };
    session.controls = await readControls(session.root, session.selector, caseSelectors);
    session.signatures = await controlSignatures(session.root);
    const defaultDigest = await stateDigest(session.root);
    session.bases.set('', defaultDigest);
    session.baseReadings.set('', await flatReading(session.root));
    const reading = await defaultReading(session.root, session.selector);
    const defaultSeries = await series(session.root);

    const order = await traverse(session);
    await ensureBase(session, []);

    const names = new Map<number, string>();
    const stated = new Map<number, boolean>();
    const transitions: LedgerTransition[] = [];
    const hover: LedgerHover[] = [];
    const reachedByArrow = new Set<number>();

    const hoverSelector = mount.cases.find(({ kind, selector, notApplicableReason }) => kind === 'hover' && selector && !notApplicableReason)?.selector;

    const visit = async (path: number[]) => {
      const base: Base = { path, digest: session.bases.get(pathKey(path))! };
      const here = session.controls.filter((control) => pathKey(control.foldPath) === pathKey(path));
      for (const [index, name] of await accessibleNames(session, here.map(({ index }) => index))) names.set(index, name);
      for (const facts of here) {
        if (facts.kind === 'slider') stated.set(facts.index, await defaultStated(session, facts.index));
      }
      for (const facts of here) {
        if (!facts.disabled) {
          for (const transitionPlan of transitionPlans(session, facts)) {
            const transition = await runTransition(session, facts, transitionPlan, base);
            if (facts.kind === 'radio' && transition.focus.retained && transition.focus.visible) reachedByArrow.add(facts.index);
            transitions.push(transition);
          }
          await relink(session);
        }
        // An aria-disabled button still matches a hover case's selector and
        // still takes a pointer, so it is hovered like any other.
        if (hoverSelector && (await controlAt(session, facts.index).evaluate((element, hoverCase) => element.matches(hoverCase), hoverSelector))) {
          hover.push(await hoverReading(session, controlAt(session, facts.index), `c${facts.index}`, facts.index, base));
        }
      }
      const legend = session.root.locator('[data-legend-item]');
      const legendCount = await legend.count();
      for (let item = 0; item < legendCount; item += 1) {
        const entry = legend.nth(item);
        const inPath = await entry.evaluate((element) => {
          for (let details = element.closest('details'); details; details = details.parentElement?.closest('details') ?? null) {
            if (!details.open) return false;
          }
          return true;
        });
        if (!inPath || !(await entry.isVisible())) continue;
        if (hover.some(({ target }) => target === `legend ${item}`)) continue;
        hover.push(await hoverReading(session, entry, `legend ${item}`, null, base));
      }
      const folds = here.filter((control) => control.isSummary && /open=false/.test(control.state));
      for (const fold of folds) {
        const inner = [...path, fold.index];
        if (!session.controls.some((control) => within(control.foldPath, inner))) continue;
        await ensureBase(session, path);
        await openPath(session, [fold.index]);
        session.bases.set(pathKey(inner), await stateDigest(session.root));
        session.baseReadings.set(pathKey(inner), await flatReading(session.root));
        await visit(inner);
        await ensureBase(session, inner);
        await focusControl(session, fold.index);
        await page.keyboard.press('Enter');
        await quiet(page, ANNOUNCEMENT_WINDOW_MS);
        await ensureBase(session, path);
      }
    };
    await visit([]);

    // The reset, pressed by keyboard from a state a transition left.
    let reset: LedgerObservation['reset'] = null;
    const resetControl = session.controls.find((control) => control.kind === 'reset');
    if (mount.hasReset && resetControl) {
      trace.step = 'reset';
      await ensureBase(session, []);
      const changing = transitions.filter(
        (transition) => transition.fold === null && transition.after.digest !== transition.before.digest && transition.control !== resetControl.index,
      );
      let fromDigest = defaultDigest;
      // A run that ends back on the default frame leaves nothing to reset, so the next change is taken.
      for (const transition of changing) {
        const facts = session.controls[transition.control];
        const changePlan = transitionPlans(session, facts).find((candidate) => compress(candidate.keys).join() === transition.keys.join());
        if (!changePlan) continue;
        await ensureBase(session, []);
        await focusControl(session, changePlan.focusFirst ?? facts.index);
        await press(page, changePlan.keys);
        await quiet(page, SETTLE_MS);
        fromDigest = await stateDigest(session.root);
        if (fromDigest !== defaultDigest) break;
      }
      const keys = await pressReset(session, []);
      const digest = await stateDigest(session.root);
      const ring = order.rings.get(resetControl.index);
      reset = {
        reached: Boolean(ring),
        focusVisible: ring?.focusVisible ?? false,
        fromDigest,
        keys,
        digest,
        restored: digest === defaultDigest,
      };
      await quiet(page, ANNOUNCEMENT_WINDOW_MS);
      await ensureBase(session, []);
    }

    // Pairwise: a slider and a discrete control, both by keyboard, independently.
    let pairwise: LedgerObservation['pairwise'] = null;
    if (mount.cases.some(({ kind, notApplicableReason }) => kind === 'pairwise' && !notApplicableReason)) {
      trace.step = 'pairwise';
      await ensureBase(session, []);
      const slider = session.controls.find((control) => control.kind === 'slider' && !control.disabled);
      const options = session.controls.filter(
        (control) => ['toggle', 'radio', 'checkbox', 'select'].includes(control.kind) && !control.disabled,
      );
      if (slider && options.length > 0) {
        // Both dimensions are reached by keyboard: any fold the slider or an option sits in is opened first.
        const folds = [...new Set([...slider.foldPath, ...options.flatMap(({ foldPath }) => foldPath)])];
        await openPath(session, folds);
        const pairBase = await stateDigest(session.root);
        const sliderLocator = controlAt(session, slider.index);
        const start = await sliderLocator.inputValue();
        await focusControl(session, slider.index);
        await page.keyboard.press(slider.value!.value < slider.value!.max ? 'End' : 'Home');
        await quiet(page, SETTLE_MS);
        const moved = await sliderLocator.inputValue();
        // A discrete option already chosen does nothing when pressed, so the
        // first one not chosen once the slider has moved is taken: moving a
        // slider can choose the option whose value it lands on.
        let discrete = options[0];
        for (const option of options) {
          const state = await controlStateOf(session.root, session.selector, option.index);
          if (!/aria-(pressed|selected)=true|checked=true/.test(state)) {
            discrete = option;
            break;
          }
        }
        const discretePlan = transitionPlans(session, discrete)[0];
        const discreteBefore = await controlStateOf(session.root, session.selector, discretePlan.target);
        const pressedBefore = await pressedSet(session);
        await focusControl(session, discretePlan.focusFirst ?? discrete.index);
        await press(page, discretePlan.keys.length ? discretePlan.keys : ['Space']);
        await quiet(page, SETTLE_MS);
        const discreteAfter = await controlStateOf(session.root, session.selector, discretePlan.target);
        const held = (await sliderLocator.inputValue()) === moved;
        await runReturn(session, await returnKeys(session, discrete, discretePlan, pressedBefore));
        await focusControl(session, slider.index);
        await press(page, sliderReturnKeys(Number(await sliderLocator.inputValue()), Number(start), slider.value!));
        await quiet(page, SETTLE_MS);
        let returned = (await stateDigest(session.root)) === pairBase;
        if (!returned && mount.hasReset) {
          await pressReset(session, folds);
          returned = (await stateDigest(session.root)) === pairBase;
        }
        pairwise = {
          sliderMoved: moved !== start,
          discreteChanged: discreteAfter !== discreteBefore,
          sliderHeld: held,
          returned,
        };
        await quiet(page, ANNOUNCEMENT_WINDOW_MS);
      } else {
        pairwise = { sliderMoved: false, discreteChanged: false, sliderHeld: false, returned: false };
      }
      await ensureBase(session, []);
    }

    const controls: LedgerControl[] = session.controls.map((facts) => {
      const ring = order.rings.get(facts.index) ?? session.arrowRings.get(facts.index);
      const name = names.get(facts.index) ?? '';
      return {
        index: facts.index,
        kind: facts.kind,
        name,
        visibleText: facts.visibleText,
        labelInName: normalize(name).includes(normalize(facts.visibleText)),
        disabled: facts.disabled,
        fold: facts.foldPath.length ? facts.foldPath[facts.foldPath.length - 1] : null,
        reached: Boolean(ring) || reachedByArrow.has(facts.index),
        focusVisible: ring?.focusVisible ?? reachedByArrow.has(facts.index),
        ring: ring?.ring ?? { style: 'none', widthPx: 0, color: '' },
        caseIds: facts.caseIds,
        defaultValue: facts.value ? String(facts.value.value) : null,
        defaultStated: facts.kind === 'slider' ? (stated.get(facts.index) ?? false) : null,
      };
    });

    const source = readFileSync(join(process.cwd(), mount.sourcePath), 'utf8');
    const matched = new Map<string, number>();
    await ensureBase(session, []);
    for (const stateCase of mount.cases) {
      if (stateCase.selector && !stateCase.notApplicableReason) {
        matched.set(stateCase.id, await session.root.locator(stateCase.selector).count());
      }
    }
    const cases: LedgerCaseRecord[] = mount.cases.map((stateCase) => {
      const base = { caseId: stateCase.id, kind: stateCase.kind };
      if (stateCase.notApplicableReason) {
        return { ...base, status: 'not-applicable', matched: null, records: 0, detail: stateCase.notApplicableReason };
      }
      if (stateCase.kind === 'default') {
        return { ...base, status: 'observed', matched: null, records: 1, detail: 'the default state as a fresh load renders it' };
      }
      if (stateCase.kind === 'reset') {
        return {
          ...base,
          status: reset ? 'observed' : 'missing',
          matched: resetControl ? 1 : 0,
          records: reset ? 1 : 0,
          detail: reset ? 'the reset pressed by keyboard from a changed state' : 'no reset in the mount root',
        };
      }
      if (stateCase.kind === 'pairwise') {
        return {
          ...base,
          status: pairwise && pairwise.sliderMoved && pairwise.discreteChanged ? 'observed' : 'missing',
          matched: null,
          records: pairwise ? 1 : 0,
          detail: 'a slider and a discrete control operated by keyboard in turn',
        };
      }
      if (stateCase.selector) {
        const count = matched.get(stateCase.id) ?? 0;
        const records =
          stateCase.kind === 'focus'
            ? controls.length
            : stateCase.kind === 'hover'
              ? hover.filter(({ control }) => control !== null).length
              : transitions.filter(({ caseId }) => caseId === stateCase.id).length;
        return {
          ...base,
          status: count > 0 ? 'observed' : 'missing',
          matched: count,
          records,
          detail: `${count} control(s) match ${stateCase.selector}; ${records} ledger record(s)`,
        };
      }
      const witness = stateCase.id.match(/^(loading|error|empty|unavailable)-witness$/)?.[1] as ImplementedState | undefined;
      if (stateCase.kind === 'discrete-options' && witness) {
        const present = implementsState(source, witness);
        return {
          ...base,
          status: present ? 'source-witness' : 'missing',
          matched: null,
          records: 0,
          detail: present ? `the ${witness} state is implemented in ${mount.sourcePath}` : `${mount.sourcePath} implements no ${witness} state`,
        };
      }
      return { ...base, status: 'missing', matched: null, records: 0, detail: `no ledger rule for a ${stateCase.kind} case` };
    });

    return {
      mountId: mount.mountId,
      status: session.status,
      default: {
        digest: defaultDigest,
        readouts: reading.readouts.map(({ key, text }) => `${key}: ${text}`),
        controls: reading.controls.map(({ index, state }) => `c${index} ${state}`),
        tokens: reading.tokens,
        geometry: reading.geometry,
        series: defaultSeries,
      },
      focusOrder: { expected: order.expected, visited: order.visited, positiveTabindex: order.positive },
      controls,
      transitions,
      hover,
      reset,
      pairwise,
      cases,
      telemetry: await telemetryOf(session.root, mount, reading.readouts),
      restores: session.restores,
    };
}

/**
 * One idle window on a fresh load: nothing pressed, nothing hovered, the
 * mount watched for `IDLE_WINDOW_MS` after it settled.
 */
export async function idleWindow(
  browser: Browser,
  staticBase: string,
  plan: InteractiveLedgerPlan,
  mount: LedgerPlanMount,
  motion: IdleMotion,
  plant?: LedgerPlant,
): Promise<LedgerIdle> {
  return inOwnContext(
    browser,
    async (page) => {
      const { root } = await openMount(page, staticBase, plan, mount);
      await plant?.(page, root);
      await page.waitForTimeout(600);
      const watched = await root.evaluate(
        (element, windowMs) =>
          new Promise<{ mutations: number; samples: string[]; drawnMs: number }>((resolve) => {
            const samples: string[] = [];
            let mutations = 0;
            const describe = (node: Node) => {
              const target = node instanceof Element ? node : node.parentElement;
              if (!target) return 'text';
              const marks = ['data-figure-readout', 'data-readout', 'data-testid', 'data-series', 'aria-live', 'role']
                .filter((name) => target.hasAttribute(name))
                .map((name) => `${name}=${target.getAttribute(name)}`);
              return `${target.tagName.toLowerCase()}${marks.length ? `[${marks.join(' ')}]` : ''}`;
            };
            const observer = new MutationObserver((records) => {
              for (const record of records) {
                mutations += 1;
                if (samples.length < 8) {
                  const what =
                    record.type === 'attributes'
                      ? `${record.attributeName} ${JSON.stringify(record.oldValue)} to ${JSON.stringify((record.target as Element).getAttribute(record.attributeName!))}`
                      : record.type === 'characterData'
                        ? `text ${JSON.stringify(record.oldValue)} to ${JSON.stringify(record.target.textContent)}`
                        : `${record.addedNodes.length} added, ${record.removedNodes.length} removed`;
                  samples.push(`${describe(record.target)} ${what}`);
                }
              }
            });
            observer.observe(element, {
              subtree: true,
              childList: true,
              characterData: true,
              characterDataOldValue: true,
              attributes: true,
              attributeOldValue: true,
            });
            // The window is counted in time the page spent drawing (frames no
            // more than 250 ms apart): a figure that moves on its animation
            // frames cannot sit out a window in which it got none. A page that
            // never gets enough frames ends the window short, and the verdict
            // fails it.
            let previous = performance.now();
            let drawnMs = 0;
            let done = false;
            const finish = () => {
              if (done) return;
              done = true;
              mutations += observer.takeRecords().length;
              observer.disconnect();
              resolve({ mutations, samples, drawnMs });
            };
            const frame = () => {
              if (done) return;
              const now = performance.now();
              if (now - previous <= 250) drawnMs += now - previous;
              previous = now;
              if (drawnMs >= windowMs) finish();
              else requestAnimationFrame(frame);
            };
            requestAnimationFrame(frame);
            setTimeout(finish, windowMs * 10);
          }),
        IDLE_WINDOW_MS,
      );
      const { drawnMs, ...seen } = watched;
      return { motion, windowMs: Math.floor(drawnMs), ...seen, digest: await stateDigest(root) };
    },
    { ...PLAIN_CONTEXT, viewport: INTERACTIVE_LEDGER_VIEWPORT, reducedMotion: motion },
  );
}
