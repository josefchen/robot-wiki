import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Browser, BrowserContextOptions, Page } from '@playwright/test';
import { test, expect, brandV2Registry } from './brand-v2-static-fixture';
import { inOwnContext } from './helpers/per-route-context';
import { waitForArm } from './helpers/playground';
import { derivePrimitiveSweepRouteStates } from '../../lib/brand-v2-primitive-reconciliation';
import {
  CONTROL_STATES_EVIDENCE_PATH,
  CONTROL_STATES_SWEEP_MODULE,
  CONTROL_STATES_VERSION,
  CONTROL_STATE_ASSERTIONS,
  CONTROL_STATE_EXEMPTIONS,
  CONTROL_STATE_VIEWPORTS,
  RETIRED_LIME_RGB,
  actionFailures,
  chipFailures,
  controlStateVerdict,
  controlStatesEvidenceFingerprint,
  disabledFailures,
  iconFailures,
  readControlStatesEvidence,
  transientAriaFailures,
  variantStateFailures,
  type ControlActionKind,
  type ControlActionObservation,
  type ControlDisabledObservation,
  type ControlIconObservation,
  type ControlPageObservation,
  type ControlSelectionObservation,
  type ControlStateRegistry,
  type ControlStatesEvidence,
  type ControlVariantObservation,
  type StatusChipObservation,
} from '../../lib/brand-v2-control-states-evidence';

/**
 * Every registered control, in every state the contract names, on every
 * registered route state at 375 and 1440 px.
 *
 * The population is the controls registry joined to what each route
 * actually renders, with every figure fold opened as a reader would open
 * it: a control is found structurally (native controls,
 * widget roles, keyboard stops) and by its registry annotation, and an
 * unannotated structural control is reported rather than skipped. Each
 * distinct rendered variant (registry id, element, role, class, disabled
 * and selected state) is read at rest, under a real pointer, with the
 * pointer held down, and under keyboard focus; the ARIA of the whole
 * document is compared across those moments; selected states are read
 * against their unselected sibling or by activating them from the keyboard
 * and undoing it; disabled controls are clicked and keyed; icons are
 * reconciled with their owner's name; and every clear, copy, sort, reset,
 * disclosure and close action is performed from the keyboard and checked
 * for its effect. The verdicts live in the evidence module the enforcement
 * generator reads, so the test and the generator decide each row the same
 * way.
 *
 * The suite name is repeated as a literal in `test.describe` below because
 * the enforcement target inventory reads reporter titles out of the source.
 */

const ROUTES = derivePrimitiveSweepRouteStates(brandV2Registry);
const REGISTRY = brandV2Registry as unknown as ControlStateRegistry;
const EVIDENCE_FILE = join(process.cwd(), CONTROL_STATES_EVIDENCE_PATH);
const PARK = { x: -10, y: -10 } as const;

type Viewport = (typeof CONTROL_STATE_VIEWPORTS)[number];

function contextOptions(viewport: Viewport): BrowserContextOptions {
  return {
    viewport: { width: viewport.width, height: viewport.height },
    reducedMotion: 'reduce',
    permissions: ['clipboard-read', 'clipboard-write'],
  };
}

/* ------------------------------------------------------------------ */
/* In-page probe                                                       */
/* ------------------------------------------------------------------ */

type ProbeControl = {
  n: number;
  member: string | null;
  key: string;
  tag: string;
  disabled: boolean;
  native: boolean;
  ariaDisabled: boolean;
  selected: 'selected' | 'unselected' | 'none';
  semantic: ControlSelectionObservation['semantic'];
  name: string;
  element: string;
  exemption: string | null;
  input: boolean;
  group: string | null;
};

type ProbeDiscovery = {
  controls: ProbeControl[];
  counts: Record<string, number>;
  unregistered: string[];
  codeBlocks: number;
  unexposedDisabled: Array<{ member: string; element: string; cue: string }>;
  icons: Array<Omit<ControlIconObservation, 'route' | 'viewport'>>;
  statusChips: Array<Omit<StatusChipObservation, 'route' | 'viewport'>>;
};

type Paint = {
  colour: string;
  background: string;
  decorationLine: string;
  decorationColour: string;
  borders: Array<[number, string]>;
  weight: number;
  radiusPx: number;
  heightPx: number;
  nodes: number;
  pseudo: string;
  lime: boolean;
  nativeCheckable: boolean;
};

type ProbeApi = {
  discover(): ProbeDiscovery;
  snap(n: number, label: string): void;
  diff(n: number, a: string, b: string): { changed: string[]; changedCount: number };
  aria(): string[];
  geometry(n: number): { x: number; y: number; inViewport: boolean; reachable: boolean; coveredBy: string | null };
  focus(n: number): { matched: boolean; tabbable: boolean };
  onscreen(n: number): boolean;
  blur(): void;
  paint(n: number): Paint;
  selectionState(n: number): 'selected' | 'unselected' | 'none';
  state(n: number): string;
  setDisabled(n: number, disabled: boolean): void;
  computed(n: number): { cursor: string; opacity: number; colour: string; background: string };
  actions(): Array<{ n: number; kind: ControlActionKind; member: string; name: string; visibleText: string; key: string }>;
  name(n: number): string;
  visibleText(n: number): string;
  expanded(n: number): string;
  expectedCopy(n: number): string;
  attr(n: number, name: string): string | null;
  connected(n: number): boolean;
  relocate(n: number): boolean;
  outline(n: number): string;
  findAction(pattern: string): number | null;
  segmentedOf(n: number): number | null;
  blockActivation(on: boolean): void;
};

declare global {
  interface Window {
    __cs?: ProbeApi;
  }
}

type ProbeArgs = {
  route: string;
  exemptions: Array<{ id: string; selector: string; routes: string[] }>;
  lime: string;
};

function installProbe(args: ProbeArgs): void {
  const NATIVE = 'a[href], button, input:not([type="hidden"]), select, textarea, summary';
  const WIDGET_ROLES = new Set([
    'button', 'checkbox', 'combobox', 'link', 'menuitem', 'menuitemcheckbox', 'menuitemradio',
    'option', 'radio', 'slider', 'spinbutton', 'switch', 'tab', 'textbox',
  ]);
  const MEDIA = new Set(['AREA', 'AUDIO', 'CANVAS', 'IFRAME', 'IMG', 'MAP', 'PICTURE', 'SOURCE', 'TRACK', 'VIDEO']);
  const PROPS = [
    'color', 'background-color', 'background-image',
    'border-top-color', 'border-top-width', 'border-top-style',
    'border-right-color', 'border-right-width', 'border-right-style',
    'border-bottom-color', 'border-bottom-width', 'border-bottom-style',
    'border-left-color', 'border-left-width', 'border-left-style',
    'outline-style', 'outline-width', 'outline-color', 'outline-offset',
    'text-decoration-line', 'text-decoration-color', 'text-decoration-thickness', 'text-decoration-style',
    'text-underline-offset', 'font-weight', 'opacity', 'fill', 'stroke', 'stroke-width', 'r',
    'transform', 'box-shadow', 'filter', 'visibility', 'display',
  ];
  const PSEUDO_PROPS = ['content', 'color', 'background-color', 'border-bottom-color', 'border-bottom-width', 'opacity', 'transform', 'width'];
  const hiddenByClosedDisclosure = (element: Element): boolean => {
    for (let details = element.closest('details'); details !== null; details = details.parentElement?.closest('details') ?? null) {
      if ((details as HTMLDetailsElement).open) continue;
      const summary = element.closest('summary');
      if (summary !== null && summary.closest('details') === details) continue;
      return true;
    }
    return false;
  };
  const exposed = (element: Element) =>
    element.closest('[aria-hidden="true"], [inert]') === null && !hiddenByClosedDisclosure(element);
  const boxVisible = (element: Element) => {
    const rect = element.getBoundingClientRect();
    const computed = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && computed.display !== 'none' && computed.visibility !== 'hidden';
  };
  const labelsOf = (element: Element): Element[] =>
    'labels' in element && (element as HTMLInputElement).labels ? [...(element as HTMLInputElement).labels!] : [];
  // An opacity-0 native input that fills its label or card is the control
  // a pointer and the keyboard reach; its paint lives on that card.
  const transparentOverlay = (element: Element) =>
    element.tagName === 'INPUT' && getComputedStyle(element).opacity === '0';
  const visible = (element: Element) => {
    if (!boxVisible(element)) return false;
    if (getComputedStyle(element).opacity !== '0') return true;
    return transparentOverlay(element) && element.parentElement !== null && boxVisible(element.parentElement);
  };
  const outline = (element: Element) => element.outerHTML.replace(/\s+/g, ' ').slice(0, 160);
  const classOf = (element: Element) => (element.getAttribute('class') ?? '').trim().replace(/\s+/g, ' ');
  const textOf = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
    if (!(node instanceof Element)) return '';
    if (node.getAttribute('aria-hidden') === 'true') return '';
    if (node instanceof HTMLElement && getComputedStyle(node).display === 'none') return '';
    if (node.tagName === 'IMG') return node.getAttribute('alt') ?? '';
    if (node.tagName.toLowerCase() === 'svg') {
      const label = node.getAttribute('aria-label') ?? node.querySelector('title')?.textContent ?? '';
      return label;
    }
    return [...node.childNodes].map(textOf).join('');
  };
  const nameOf = (element: Element): string => {
    const labelledby = element.getAttribute('aria-labelledby');
    if (labelledby) {
      const text = labelledby
        .split(/\s+/)
        .map((id) => document.getElementById(id))
        .filter((node): node is HTMLElement => node !== null)
        .map((node) => textOf(node))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (text) return text;
    }
    const label = element.getAttribute('aria-label');
    if (label && label.trim()) return label.trim();
    const labels = labelsOf(element);
    if (labels.length > 0) return labels.map((node) => textOf(node)).join(' ').replace(/\s+/g, ' ').trim();
    const text = textOf(element).replace(/\s+/g, ' ').trim();
    if (text) return text;
    return (element.getAttribute('title') ?? element.getAttribute('placeholder') ?? '').trim();
  };
  const clipped = (element: Element) => {
    const computed = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return (rect.width <= 1 && rect.height <= 1) || computed.clipPath === 'inset(50%)' || computed.clip === 'rect(0px, 0px, 0px, 0px)';
  };
  const visibleTextOf = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentElement;
      return parent && !clipped(parent) ? node.textContent ?? '' : '';
    }
    if (!(node instanceof Element)) return '';
    if (getComputedStyle(node).display === 'none' || clipped(node)) return '';
    return [...node.childNodes].map(visibleTextOf).join('');
  };
  const semanticOf = (element: Element, member: string | null): ProbeControl['semantic'] => {
    for (const attribute of ['aria-pressed', 'aria-selected', 'aria-checked', 'aria-current'] as const) {
      if (element.getAttribute(attribute) !== null) return attribute;
    }
    if (element instanceof HTMLInputElement && (element.type === 'radio' || element.type === 'checkbox')) return 'checked';
    if (member === 'control:selection' && element.getAttribute('aria-expanded') !== null) return 'aria-expanded';
    return null;
  };
  const selectionOf = (element: Element, member: string | null): ProbeControl['selected'] => {
    const semantic = semanticOf(element, member);
    if (semantic === null) return 'none';
    if (semantic === 'aria-current') return 'none';
    if (semantic === 'checked') return (element as HTMLInputElement).checked ? 'selected' : 'unselected';
    const value = element.getAttribute(semantic);
    return value === null || value === 'false' ? 'unselected' : 'selected';
  };
  const isDisabled = (element: Element) =>
    (element as HTMLButtonElement).disabled === true || element.getAttribute('aria-disabled') === 'true';
  const groupIds = new Map<Element, number>();
  const groupOf = (element: Element): string | null => {
    const group =
      element.closest('[role="group"], [role="radiogroup"], [role="tablist"], [data-preset-group], .figure-tab-row, fieldset, [data-brand-control-id="control:segmented"]') ??
      element.parentElement;
    if (!group) return null;
    if (!groupIds.has(group)) groupIds.set(group, groupIds.size + 1);
    return `${group.tagName.toLowerCase()}.${classOf(group)}#${groupIds.get(group)}`;
  };

  const controls: Element[] = [];
  const saved = new Map<string, Array<{ tag: string; values: string[] }>>();
  const nativeDisabled = new WeakMap<Element, boolean>();
  const ariaSerials = new WeakMap<Element, number>();
  let nextSerial = 0;
  let blocker: ((event: Event) => void) | null = null;

  const scopeOf = (element: Element): Element[] => {
    if (element instanceof SVGElement && element.ownerSVGElement) {
      const svg = element.ownerSVGElement;
      return [svg, ...svg.querySelectorAll('*')];
    }
    const root = transparentOverlay(element) && element.parentElement ? element.parentElement : element;
    const nodes = [root, ...root.querySelectorAll('*')].slice(0, 80);
    for (const label of labelsOf(element)) {
      if (!root.contains(label)) nodes.push(label, ...label.querySelectorAll('*'));
    }
    // A wrapper that holds nothing but the control paints with it: a list
    // row whose rule answers the pointer over its one button is that
    // button's hover, as a reader sees it.
    const wrapper = root.parentElement;
    if (
      wrapper &&
      wrapper.childElementCount === 1 &&
      ![...wrapper.childNodes].some((child) => child.nodeType === Node.TEXT_NODE && (child.textContent ?? '').trim().length > 0) &&
      !wrapper.matches('body, main, article, section, [data-article-body]')
    ) {
      nodes.push(wrapper);
    }
    return nodes;
  };
  const read = (element: Element) =>
    scopeOf(element).map((node, index) => {
      const computed = getComputedStyle(node);
      // An outline or a decoration that is not drawn paints nothing, so its
      // offset, width or colour changing is not a visible state.
      const noOutline = computed.outlineStyle === 'none' || (Number.parseFloat(computed.outlineWidth) || 0) === 0;
      const noDecoration = computed.textDecorationLine === 'none';
      const values = PROPS.map((property) => {
        if (noOutline && property.startsWith('outline-') && property !== 'outline-style') return '';
        if (noDecoration && property.startsWith('text-decoration-') && property !== 'text-decoration-line') return '';
        if (noDecoration && property === 'text-underline-offset') return '';
        return computed.getPropertyValue(property);
      });
      if (index === 0) {
        for (const pseudo of ['::before', '::after']) {
          const pseudoStyle = getComputedStyle(node, pseudo);
          values.push(PSEUDO_PROPS.map((property) => pseudoStyle.getPropertyValue(property)).join(';'));
        }
      }
      return { tag: node.tagName.toLowerCase(), values };
    });
  const api: ProbeApi = {
    discover() {
      controls.length = 0;
      for (const stale of document.querySelectorAll('[data-cs-probe]')) stale.removeAttribute('data-cs-probe');
      const counts: Record<string, number> = {};
      const unregistered: string[] = [];
      const found: ProbeControl[] = [];
      const unexposedDisabled: ProbeDiscovery['unexposedDisabled'] = [];
      for (const element of document.querySelectorAll('body *')) {
        if (MEDIA.has(element.tagName)) continue;
        const role = element.getAttribute('role') ?? '';
        const tabindex = element.getAttribute('tabindex');
        const native = element.matches(NATIVE);
        const widget = WIDGET_ROLES.has(role);
        const keyboard = tabindex !== null && !tabindex.trim().startsWith('-');
        const annotated = element.hasAttribute('data-brand-control-id');
        if (!native && !widget && !keyboard && !annotated) continue;
        if (!exposed(element) || !visible(element)) continue;
        if (!native && !widget && !annotated) {
          const computed = getComputedStyle(element);
          if (['auto', 'scroll'].includes(computed.overflowX) || ['auto', 'scroll'].includes(computed.overflowY)) continue;
        }
        const member = (element as HTMLElement | SVGElement).dataset.brandControlId ?? null;
        if (member === null) {
          unregistered.push(outline(element));
          continue;
        }
        counts[member] = (counts[member] ?? 0) + 1;
        const n = controls.length;
        controls.push(element);
        element.setAttribute('data-cs-probe', String(n));
        const exemption =
          args.exemptions.find(({ selector, routes }) => routes.includes(args.route) && element.closest(selector) !== null)?.id ?? null;
        const disabled = isDisabled(element);
        const selected = selectionOf(element, member);
        const tag = element.tagName.toLowerCase();
        const group = groupOf(element);
        found.push({
          n,
          member,
          key: [member, tag, role, element.getAttribute('type') ?? '', classOf(element), disabled, selected, exemption].join('|'),
          tag,
          disabled,
          native: (element as HTMLButtonElement).disabled === true,
          ariaDisabled: element.getAttribute('aria-disabled') === 'true',
          selected,
          semantic: semanticOf(element, member),
          name: nameOf(element),
          element: outline(element),
          exemption,
          input:
            member === 'control:input' ||
            (['input', 'select', 'textarea'].includes(tag) &&
              !(element instanceof HTMLInputElement && ['radio', 'checkbox', 'button', 'submit'].includes(element.type))),
          group,
        });
        if (!disabled && getComputedStyle(element).cursor === 'not-allowed') {
          unexposedDisabled.push({ member, element: outline(element), cue: 'cursor: not-allowed' });
        }
      }

      const codeBlocks = [...document.querySelectorAll('[data-rehype-pretty-code-figure], figure[data-brand-frame-interior-registered="code"]')].filter(
        (element) => exposed(element) && boxVisible(element),
      ).length;

      const iconGroups = new Map<string, ProbeDiscovery['icons'][number]>();
      const CONTROL_OWNER = 'a[href], button, summary, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [role="radio"], [role="checkbox"], [role="switch"], [role="option"]';
      for (const icon of document.querySelectorAll('svg, img')) {
        const tag = icon.tagName.toLowerCase();
        if (tag === 'svg' && icon.parentElement?.closest('svg')) continue;
        if (!boxVisible(icon) || hiddenByClosedDisclosure(icon)) continue;
        const owner = icon.parentElement?.closest(CONTROL_OWNER) ?? null;
        if (tag === 'img' && owner === null) continue;
        const hiddenAncestor = icon.closest('[aria-hidden="true"], [inert]');
        const hidden =
          hiddenAncestor !== null ||
          ['presentation', 'none'].includes(icon.getAttribute('role') ?? '') ||
          (tag === 'img' && icon.getAttribute('alt') === '');
        const focusable =
          icon.matches('[tabindex]:not([tabindex^="-"])') ||
          icon.querySelector('a[href], [tabindex]:not([tabindex^="-"])') !== null;
        let role: ControlIconObservation['role'];
        let member: string | null = null;
        let ownerName = '';
        if (owner !== null && !(hiddenAncestor !== null && hiddenAncestor.contains(owner))) {
          role = 'functional';
          member = (owner as HTMLElement).dataset.brandControlId ?? null;
          ownerName = nameOf(owner);
        } else if (
          icon.closest('[data-figure-frame], [data-figure-stage]') !== null ||
          // A chart drawn as one SVG whose marks are themselves registered
          // controls is a figure; its marks are judged as controls.
          (tag === 'svg' && icon.querySelector('[data-brand-control-id]') !== null)
        ) {
          role = 'figure';
        } else if (hidden) {
          role = 'decorative';
        } else {
          const named =
            (icon.getAttribute('aria-label') ?? '').trim().length > 0 ||
            (icon.getAttribute('aria-labelledby') ?? '').trim().length > 0 ||
            (tag === 'svg' && (icon.querySelector(':scope > title')?.textContent ?? '').trim().length > 0) ||
            (tag === 'img' && (icon.getAttribute('alt') ?? '').trim().length > 0);
          role = named ? 'informative' : 'exposed-unnamed';
        }
        const signature = `${member}|${role}|${tag}|${classOf(icon)}|${owner ? classOf(owner) : ''}|${ownerName.length > 0}|${hidden}|${focusable}`;
        const existing = iconGroups.get(signature);
        if (existing) {
          existing.count += 1;
          continue;
        }
        iconGroups.set(signature, {
          member,
          role,
          count: 1,
          element: outline(owner ?? icon),
          ownerName,
          hidden,
          focusable,
        });
      }

      const chipGroups = new Map<string, ProbeDiscovery['statusChips'][number]>();
      for (const chip of document.querySelectorAll('span[data-variant][data-brand-surface-id]')) {
        const variant = chip.getAttribute('data-variant') ?? '';
        if (!['default', 'accent', 'ok', 'warn', 'err'].includes(variant)) continue;
        if (!exposed(chip) || !boxVisible(chip)) continue;
        const computed = getComputedStyle(chip);
        const rect = chip.getBoundingClientRect();
        const kind = computed.textTransform === 'uppercase' ? 'badge' : 'stage';
        const lime = [chip, ...chip.querySelectorAll('*')].some((node) => {
          const style = getComputedStyle(node);
          return [style.color, style.backgroundColor, style.borderTopColor, style.borderBottomColor, style.outlineColor].includes(args.lime);
        });
        const text = (chip.textContent ?? '').replace(/\s+/g, ' ').trim();
        const entry = {
          kind: kind as 'badge' | 'stage',
          variant,
          count: 1,
          text,
          colour: computed.color,
          background: computed.backgroundColor,
          radiusPx: Number.parseFloat(computed.borderTopLeftRadius) || 0,
          heightPx: Math.round(rect.height * 10) / 10,
          lime,
          borderStyle: Number.parseFloat(computed.borderTopWidth) > 0 ? computed.borderTopStyle : 'none',
          fontWeight: Number.parseFloat(computed.fontWeight),
        };
        const signature = JSON.stringify({ ...entry, text: text.length > 0, count: 0 });
        const existing = chipGroups.get(signature);
        if (existing) existing.count += 1;
        else chipGroups.set(signature, entry);
      }

      return {
        controls: found,
        counts,
        unregistered,
        codeBlocks,
        unexposedDisabled,
        icons: [...iconGroups.values()],
        statusChips: [...chipGroups.values()],
      };
    },
    snap(n, label) {
      saved.set(`${n}:${label}`, read(controls[n]));
    },
    diff(n, a, b) {
      const left = saved.get(`${n}:${a}`);
      const right = saved.get(`${n}:${b}`);
      if (!left || !right) throw new Error(`no snapshot ${n}:${a} or ${n}:${b}`);
      const changed: string[] = [];
      if (left.length !== right.length) changed.push(`scope ${left.length} -> ${right.length} nodes`);
      const pseudoNames = ['::before', '::after'];
      for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
        const before = left[index].values;
        const after = right[index].values;
        for (let property = 0; property < Math.max(before.length, after.length); property += 1) {
          if (before[property] === after[property]) continue;
          const name = property < PROPS.length ? PROPS[property] : pseudoNames[property - PROPS.length];
          changed.push(`${left[index].tag}[${index}].${name}: ${before[property]} -> ${after[property]}`);
        }
      }
      return { changed: changed.slice(0, 6), changedCount: changed.length };
    },
    aria() {
      const state: string[] = [];
      // Each element keeps one serial for the page's life, so an attribute
      // appearing on one element never reads as its neighbours' changing.
      const all = document.querySelectorAll('[aria-pressed], [aria-selected], [aria-current], [aria-checked]');
      all.forEach((element) => {
        if (!ariaSerials.has(element)) ariaSerials.set(element, nextSerial++);
        const serial = ariaSerials.get(element);
        for (const attribute of ['aria-pressed', 'aria-selected', 'aria-current', 'aria-checked']) {
          const value = element.getAttribute(attribute);
          if (value !== null) state.push(`${serial}:${element.tagName.toLowerCase()}:${attribute}=${value}`);
        }
      });
      for (const input of document.querySelectorAll<HTMLInputElement>('input[type="radio"], input[type="checkbox"]')) {
        if (input.checked) state.push(`checked:${input.name}:${input.value}`);
      }
      return state;
    },
    geometry(n) {
      const element = controls[n];
      element.scrollIntoView({ block: 'center', inline: 'center' });
      // A segmented container is pointed at through one of its unselected
      // segments, the part a reader hovers and presses.
      const segment =
        element.matches('[data-brand-control-id="control:segmented"]') && !element.matches(NATIVE)
          ? [...element.querySelectorAll('button, [role="radio"], [role="tab"], input[type="radio"]')].find(
              (child) => !isDisabled(child) && selectionOf(child, 'control:selection') !== 'selected' && boxVisible(child),
            ) ?? null
          : null;
      // A link that wraps has an L-shaped box whose centre can fall outside
      // it; aim at the middle of its first line box instead.
      const aim = segment ?? element;
      const rect = [...aim.getClientRects()].find((box) => box.width > 0 && box.height > 0) ?? aim.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const inViewport = x >= 0 && y >= 0 && x < innerWidth && y < innerHeight;
      if (!inViewport) return { x, y, inViewport, reachable: false, coveredBy: 'outside the viewport' };
      const owns = (hit: Element | null) =>
        hit !== null &&
        (hit === element || element.contains(hit) || labelsOf(element).some((label) => label.contains(hit)));
      const hit = document.elementFromPoint(x, y);
      if (owns(hit)) return { x, y, inViewport, reachable: true, coveredBy: null };
      // A reader points at any visible part of a control, not only its
      // centre: a chart mark overlapped by a neighbour's hit ring is still
      // reached from its open side.
      for (const fy of [0.5, 0.25, 0.75, 0.1, 0.9]) {
        for (const fx of [0.5, 0.25, 0.75, 0.1, 0.9]) {
          const px = rect.left + rect.width * fx;
          const py = rect.top + rect.height * fy;
          if (px < 0 || py < 0 || px >= innerWidth || py >= innerHeight) continue;
          if (owns(document.elementFromPoint(px, py))) {
            return { x: px, y: py, inViewport, reachable: true, coveredBy: null };
          }
        }
      }
      return { x, y, inViewport, reachable: false, coveredBy: hit === null ? null : outline(hit) };
    },
    focus(n) {
      const element = controls[n];
      const target =
        element.matches('[data-brand-control-id="control:segmented"]') && !element.matches(NATIVE)
          ? element.querySelector<HTMLElement>('button:not(:disabled), [tabindex]:not([tabindex^="-"]), input:not(:disabled)') ?? (element as HTMLElement)
          : (element as HTMLElement);
      target.focus();
      return {
        matched: document.activeElement === target && target.matches(':focus-visible'),
        tabbable: target.tabIndex >= 0,
      };
    },
    onscreen(n) {
      const rect = controls[n].getBoundingClientRect();
      return rect.right > 0 && rect.bottom > 0 && rect.left < innerWidth && rect.top < innerHeight;
    },
    blur() {
      (document.activeElement as HTMLElement | null)?.blur?.();
    },
    paint(n) {
      const element = controls[n];
      const root = transparentOverlay(element) && element.parentElement ? element.parentElement : element;
      const computed = getComputedStyle(root);
      const scope = scopeOf(element);
      const lime = scope.some((node) => {
        const style = getComputedStyle(node);
        return [style.color, style.backgroundColor, style.borderTopColor, style.borderBottomColor, style.borderLeftColor, style.outlineColor, style.fill, style.stroke, style.textDecorationColor].includes(args.lime);
      });
      const before = getComputedStyle(root, '::before').content;
      const after = getComputedStyle(root, '::after').content;
      const sides = ['Top', 'Right', 'Bottom', 'Left'] as const;
      // The text a reader reads as the control's label carries its ink and
      // underline: the control itself when it holds its text, otherwise the
      // first visible, exposed element inside it that does.
      const ownsText = (node: Element) =>
        [...node.childNodes].some((child) => child.nodeType === Node.TEXT_NODE && (child.textContent ?? '').trim().length > 0);
      const label = ownsText(root)
        ? root
        : [...root.querySelectorAll('*')].find(
            (node) => ownsText(node) && node.closest('[aria-hidden="true"]') === null && boxVisible(node),
          ) ?? root;
      const text = getComputedStyle(label);
      return {
        colour: text.color,
        background: computed.backgroundColor,
        decorationLine: text.textDecorationLine,
        decorationColour: text.textDecorationColor,
        borders: sides.map((side) => [
          Number.parseFloat(computed.getPropertyValue(`border-${side.toLowerCase()}-width`)) || 0,
          computed.getPropertyValue(`border-${side.toLowerCase()}-style`) === 'none' ? 'none' : computed.getPropertyValue(`border-${side.toLowerCase()}-color`),
        ]) as Array<[number, string]>,
        weight: Number.parseFloat(text.fontWeight),
        radiusPx: Number.parseFloat(computed.borderTopLeftRadius) || 0,
        heightPx: Math.round(root.getBoundingClientRect().height * 10) / 10,
        nodes: scope.length,
        pseudo: `${before}|${after}`,
        lime,
        nativeCheckable: element instanceof HTMLInputElement && ['radio', 'checkbox'].includes(element.type) && !transparentOverlay(element),
      };
    },
    selectionState(n) {
      const element = controls[n];
      return selectionOf(element, (element as HTMLElement).dataset.brandControlId ?? null);
    },
    state(n) {
      const element = controls[n];
      const root =
        element.closest('[data-figure-frame], .pg-section, form, section, main') ?? document.body;
      const parts = [location.href, (root as HTMLElement).innerText];
      for (const node of root.querySelectorAll('[aria-pressed], [aria-checked], [aria-selected], [aria-expanded], [aria-valuenow], [aria-valuetext], input, select, textarea, details')) {
        parts.push(
          [
            node.getAttribute('aria-pressed'),
            node.getAttribute('aria-checked'),
            node.getAttribute('aria-selected'),
            node.getAttribute('aria-expanded'),
            node.getAttribute('aria-valuenow'),
            node.getAttribute('aria-valuetext'),
            'value' in node ? String((node as HTMLInputElement).value) : '',
            node instanceof HTMLInputElement ? String(node.checked) : '',
            node instanceof HTMLDetailsElement ? String(node.open) : '',
          ].join(','),
        );
      }
      return parts.join('\n');
    },
    setDisabled(n, disabled) {
      const element = controls[n] as HTMLButtonElement;
      if (!nativeDisabled.has(element)) nativeDisabled.set(element, element.disabled === true);
      if (element.hasAttribute('aria-disabled')) element.setAttribute('aria-disabled', String(disabled));
      if (nativeDisabled.get(element)) element.disabled = disabled;
    },
    computed(n) {
      const element = controls[n];
      const computed = getComputedStyle(element);
      return {
        cursor: computed.cursor,
        opacity: Number.parseFloat(computed.opacity),
        colour: computed.color,
        background: computed.backgroundColor,
      };
    },
    actions() {
      const found: ReturnType<ProbeApi['actions']> = [];
      controls.forEach((element, n) => {
        if (!element.isConnected || !exposed(element) || !visible(element)) return;
        const member = (element as HTMLElement).dataset.brandControlId ?? '';
        const name = nameOf(element);
        let kind: ControlActionKind | null = null;
        if (/^copy link\b/i.test(name)) kind = 'copy-link';
        else if (/^copy\b/i.test(name) && element.closest('[data-rehype-pretty-code-figure], figure[data-brand-frame-interior-registered="code"]')) kind = 'copy-code';
        else if (/^sort by\b/i.test(name) || (element.closest('th') !== null && element.tagName === 'BUTTON')) kind = 'sort';
        // A link that names a reset-free method navigates; only a button resets.
        else if (element.hasAttribute('data-instrument-reset') || (element.tagName !== 'A' && /^(reset|start over)(\s|$)/i.test(name))) kind = 'reset';
        else if (/^clear\b/i.test(name)) kind = 'clear';
        else if (/^close\b/i.test(name)) kind = 'close';
        else if (element.tagName === 'SUMMARY' || (element.getAttribute('aria-expanded') !== null && element.getAttribute('aria-controls') !== null && element.getAttribute('aria-haspopup') === null)) kind = 'disclosure';
        if (kind === null) return;
        found.push({
          n,
          kind,
          member,
          name,
          visibleText: visibleTextOf(element).replace(/\s+/g, ' ').trim(),
          key: `${kind}|${element.tagName}|${classOf(element)}|${kind === 'sort' ? classOf(element.closest('table') ?? element) : ''}`,
        });
      });
      return found;
    },
    name(n) {
      return nameOf(controls[n]);
    },
    visibleText(n) {
      return visibleTextOf(controls[n]).replace(/\s+/g, ' ').trim();
    },
    expanded(n) {
      const element = controls[n];
      if (element.tagName === 'SUMMARY') return String((element.closest('details') as HTMLDetailsElement | null)?.open ?? false);
      return element.getAttribute('aria-expanded') ?? 'none';
    },
    expectedCopy(n) {
      const element = controls[n];
      const permalink = element.getAttribute('data-heading-permalink');
      if (permalink !== null) return `${location.origin}${location.pathname}#${permalink}`;
      const block = element.closest('[data-rehype-pretty-code-figure], figure[data-brand-frame-interior-registered="code"]');
      return block?.querySelector('pre code')?.textContent ?? '';
    },
    attr(n, name) {
      const element = controls[n];
      if (name === 'th:aria-sort') return element.closest('th')?.getAttribute('aria-sort') ?? null;
      if (name === 'disabled') return String(isDisabled(element));
      return element.getAttribute(name);
    },
    connected(n) {
      const element = controls[n];
      return element.isConnected && visible(element) && exposed(element);
    },
    relocate(n) {
      // A figure that swaps its whole frame on first use (a motion poster
      // that becomes its player) replaces the control with its successor:
      // the control of the same frame id, role and name.
      const element = controls[n];
      if (element.isConnected) return true;
      const frameId = element.closest('[data-figure-frame]')?.getAttribute('data-figure-frame');
      if (!frameId) return false;
      const name = nameOf(element);
      const successor = [...document.querySelectorAll(`[data-figure-frame="${CSS.escape(frameId)}"] ${element.tagName.toLowerCase()}`)].find(
        (candidate) =>
          candidate.hasAttribute('data-instrument-reset') === element.hasAttribute('data-instrument-reset') &&
          nameOf(candidate) === name &&
          exposed(candidate) &&
          visible(candidate),
      );
      if (!successor) return false;
      controls[n] = successor;
      successor.setAttribute('data-cs-probe', String(n));
      return true;
    },
    outline(n) {
      return controls[n].outerHTML.replace(/\s+/g, ' ').slice(0, 160);
    },
    findAction(pattern) {
      const match = api.actions().find((action) => new RegExp(pattern, 'i').test(action.name) && action.kind !== 'disclosure');
      return match ? match.n : null;
    },
    segmentedOf(n) {
      const container = controls[n].parentElement?.closest('[data-brand-control-id="control:segmented"]') ?? null;
      if (container === null) return null;
      const index = controls.indexOf(container);
      return index === -1 ? null : index;
    },
    blockActivation(on) {
      if (on && blocker === null) {
        blocker = (event: Event) => {
          event.preventDefault();
          event.stopImmediatePropagation();
        };
        for (const type of ['click', 'auxclick', 'dragstart']) window.addEventListener(type, blocker, true);
      } else if (!on && blocker !== null) {
        for (const type of ['click', 'auxclick', 'dragstart']) window.removeEventListener(type, blocker, true);
        blocker = null;
      }
    },
  };
  window.__cs = api;
}

/* ------------------------------------------------------------------ */
/* Node-side measurement                                               */
/* ------------------------------------------------------------------ */

/** Calls one method of the installed probe with serializable arguments. */
function call<Method extends keyof ProbeApi>(
  page: Page,
  method: Method,
  ...args: Parameters<ProbeApi[Method]>
): Promise<ReturnType<ProbeApi[Method]>> {
  return page.evaluate(
    ([name, values]) => {
      const api = window.__cs as unknown as Record<string, (...input: unknown[]) => unknown>;
      return api[name](...values);
    },
    [method, args] as [string, unknown[]],
  ) as Promise<ReturnType<ProbeApi[Method]>>;
}

async function settle(page: Page): Promise<void> {
  await page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
  );
}

async function park(page: Page): Promise<void> {
  await page.mouse.move(PARK.x, PARK.y);
  await call(page, 'blur');
  await settle(page);
}

async function keyboardModality(page: Page): Promise<void> {
  await page.keyboard.press('Shift');
}

const ariaChanges = (before: string[], after: string[]) => {
  const left = new Set(before);
  const right = new Set(after);
  return [
    ...before.filter((entry) => !right.has(entry)).map((entry) => `${entry} (removed)`),
    ...after.filter((entry) => !left.has(entry)).map((entry) => `${entry} (added)`),
  ].slice(0, 6);
};

type PageContext = { route: string; viewport: string };

async function installOn(page: Page, route: string): Promise<void> {
  await page.evaluate(installProbe, {
    route,
    exemptions: CONTROL_STATE_EXEMPTIONS.map(({ id, selector, routes }) => ({ id, selector, routes: [...routes] })),
    lime: RETIRED_LIME_RGB,
  });
}

async function measureVariant(
  page: Page,
  at: PageContext,
  control: ProbeControl,
  instances: number,
): Promise<ControlVariantObservation> {
  const n = control.n;
  await park(page);
  const geometry = await call(page, 'geometry', n);
  await settle(page);
  await call(page, 'snap', n, 'rest');
  const restAria = await call(page, 'aria');
  let pointer: ControlVariantObservation['pointer'] = geometry.reachable ? 'reachable' : 'covered';
  let coveredBy = geometry.coveredBy;
  let hover: ControlVariantObservation['hover'] = null;
  let pressed: ControlVariantObservation['pressed'] = null;
  const transientAria = { hover: [] as string[], pressed: [] as string[] };

  if (geometry.reachable) {
    await page.mouse.move(geometry.x, geometry.y);
    await settle(page);
    await call(page, 'snap', n, 'hover');
    hover = await call(page, 'diff', n, 'rest', 'hover');
    transientAria.hover = ariaChanges(restAria, await call(page, 'aria'));
    if (!control.input) {
      await call(page, 'blockActivation', true);
      try {
        await page.mouse.down();
        await settle(page);
        await call(page, 'snap', n, 'pressed');
        pressed = await call(page, 'diff', n, 'rest', 'pressed');
        transientAria.pressed = ariaChanges(restAria, await call(page, 'aria'));
        await page.mouse.up();
        await settle(page);
      } finally {
        await call(page, 'blockActivation', false);
      }
    }
    await park(page);
  }

  let focusVisible: ControlVariantObservation['focusVisible'] = null;
  if (!control.disabled || control.ariaDisabled) {
    await keyboardModality(page);
    const focus = await call(page, 'focus', n);
    await settle(page);
    await call(page, 'snap', n, 'focus');
    focusVisible = { matched: focus.matched, ...(await call(page, 'diff', n, 'rest', 'focus')) };
    // Read after the frame settles: a focus-revealed control moves in on a
    // (reduced-motion) transition, so its box is still offscreen synchronously.
    if (!geometry.inViewport && (await call(page, 'onscreen', n))) {
      pointer = 'offscreen-until-focus';
      coveredBy = null;
    }
    await park(page);
  }

  await call(page, 'snap', n, 'rest-after');
  const restAfter = await call(page, 'diff', n, 'rest', 'rest-after');
  return {
    route: at.route,
    viewport: at.viewport,
    member: control.member!,
    variant: control.key,
    instances,
    element: control.element,
    name: control.name,
    disabled: control.disabled,
    selected: control.selected,
    exemption: control.exemption,
    pointer,
    coveredBy,
    hover,
    pressed,
    focusVisible,
    transientAria,
    restStable: restAfter.changedCount === 0,
  };
}

const INK_LUMINANCE = 0.08;
function luminance(colour: string): number {
  const match = colour.match(/rgba?\(([^)]+)\)/);
  if (!match) return 1;
  const parts = match[1].split(',').map((part) => Number.parseFloat(part));
  if (parts.length === 4 && parts[3] === 0) return 1;
  // A translucent paint reads as what it composites to on the paper ground,
  // so a 0.22-alpha hairline is a grey rule, not an ink one.
  const alpha = parts.length === 4 ? parts[3] : 1;
  const PAPER = [250, 250, 248];
  const channel = (raw: number, index: number) => {
    const value = alpha * raw + (1 - alpha) * PAPER[index];
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(parts[0], 0) + 0.7152 * channel(parts[1], 1) + 0.0722 * channel(parts[2], 2);
}
const inkLike = (colour: string) => colour !== 'none' && luminance(colour) < INK_LUMINANCE;

function cuesBetween(off: Paint, on: Paint): ControlSelectionObservation['cues'] {
  // An underline is a cue only where the unselected state shows none: an
  // underline drawn in both states that merely follows the text colour is
  // the colour cue, not a second one.
  const underline =
    on.decorationLine.includes('underline') &&
    luminance(on.decorationColour) < 1 &&
    (!off.decorationLine.includes('underline') || luminance(off.decorationColour) === 1);
  const rule = on.borders.some(([width, colour], index) => {
    const [offWidth, offColour] = off.borders[index];
    return width >= 1 && inkLike(colour) && (offWidth < 1 || !inkLike(offColour));
  });
  return {
    underline,
    rule,
    weightStep: on.weight - off.weight,
    glyph: on.nodes > off.nodes || (on.pseudo !== off.pseudo && on.pseudo !== 'none|none'),
    colour: on.colour !== off.colour,
    nativeMark: on.nativeCheckable,
  };
}

async function activate(page: Page, control: ProbeControl): Promise<void> {
  await keyboardModality(page);
  await call(page, 'focus', control.n);
  const key = control.tag === 'input' ? 'Space' : 'Enter';
  await page.keyboard.press(key);
  await settle(page);
}

async function measureSelections(
  page: Page,
  at: PageContext,
  controls: ProbeControl[],
): Promise<ControlSelectionObservation[]> {
  const results: ControlSelectionObservation[] = [];
  const byGroup = new Map<string, ProbeControl[]>();
  for (const control of controls) {
    if (control.member !== 'control:selection' || control.disabled) continue;
    const key = control.group ?? `solo:${control.n}`;
    byGroup.set(key, [...(byGroup.get(key) ?? []), control]);
  }
  const seenKinds = new Set<string>();
  for (const [group, members] of byGroup) {
    const kind = `${members[0].key.split('|').slice(0, 5).join('|')}|${group.replace(/#\d+$/, '')}`;
    if (seenKinds.has(kind)) continue;
    seenKinds.add(kind);
    const on = members.find((control) => control.selected === 'selected');
    const off = members.find((control) => control.selected !== 'selected');
    const segmentedN = await call(page, 'segmentedOf', members[0].n);
    if (on && off && segmentedN === null) {
      await park(page);
      const offPaint = await call(page, 'paint', off.n);
      const onPaint = await call(page, 'paint', on.n);
      const cues = cuesBetween(offPaint, onPaint);
      const changed: string[] = [];
      if (offPaint.colour !== onPaint.colour) changed.push(`colour ${offPaint.colour} -> ${onPaint.colour}`);
      if (offPaint.background !== onPaint.background) changed.push(`background ${offPaint.background} -> ${onPaint.background}`);
      if (offPaint.decorationLine !== onPaint.decorationLine) changed.push(`text-decoration ${offPaint.decorationLine} -> ${onPaint.decorationLine}`);
      if (JSON.stringify(offPaint.borders) !== JSON.stringify(onPaint.borders)) changed.push(`borders ${JSON.stringify(offPaint.borders)} -> ${JSON.stringify(onPaint.borders)}`);
      if (offPaint.weight !== onPaint.weight) changed.push(`font-weight ${offPaint.weight} -> ${onPaint.weight}`);
      if (offPaint.nodes !== onPaint.nodes) changed.push(`scope ${offPaint.nodes} -> ${onPaint.nodes} nodes`);
      if (offPaint.pseudo !== onPaint.pseudo) changed.push(`pseudo ${offPaint.pseudo} -> ${onPaint.pseudo}`);
      results.push({
        route: at.route,
        viewport: at.viewport,
        member: on.member!,
        variant: on.key,
        element: on.element,
        name: on.name,
        semantic: on.semantic,
        method: 'rendered-pair',
        diff: { changed: changed.slice(0, 6), changedCount: changed.length },
        cues,
        paint: { background: onPaint.background, colour: onPaint.colour, lime: onPaint.lime, radiusPx: onPaint.radiusPx, heightPx: onPaint.heightPx },
        restored: true,
        exemption: on.exemption,
      });
      continue;
    }
    if (!off) continue;
    // Activate the first unselected member, read it selected, and undo.
    await park(page);
    const before = await call(page, 'paint', off.n);
    await call(page, 'snap', off.n, 'unselected');
    if (segmentedN !== null) await call(page, 'snap', segmentedN, 'unselected');
    const routeBefore = page.url();
    await activate(page, off);
    await park(page);
    if (page.url() !== routeBefore && !page.url().startsWith(routeBefore.split('#')[0])) break;
    const stillThere = await call(page, 'connected', off.n);
    if (!stillThere) {
      // An opener whose sheet replaced the page region: close it and move on.
      await page.keyboard.press('Escape');
      await settle(page);
      continue;
    }
    const after = await call(page, 'paint', off.n);
    await call(page, 'snap', off.n, 'selected');
    const diff = await call(page, 'diff', off.n, 'unselected', 'selected');
    const state = await call(page, 'selectionState', off.n);
    const semantic = state === 'selected' ? off.semantic : null;
    let segmentedDiff: { changed: string[]; changedCount: number } | null = null;
    if (segmentedN !== null) {
      await call(page, 'snap', segmentedN, 'selected');
      segmentedDiff = await call(page, 'diff', segmentedN, 'unselected', 'selected');
    }
    // Undo: an opener closes on Escape; a radio-like group returns to the
    // member that was on; a toggle is pressed again, and a group that had
    // nothing chosen goes back through its instrument's reset.
    if (off.semantic === 'aria-expanded') {
      await page.keyboard.press('Escape');
      await settle(page);
    } else if (on) {
      await activate(page, on);
    } else {
      await activate(page, off);
    }
    await park(page);
    let restoredState = await call(page, 'selectionState', off.n);
    let usedReset = false;
    if (!on && restoredState !== off.selected) {
      const reset = await page.evaluate((i) => {
        const control = document.querySelector(`[data-cs-probe="${i}"]`);
        // Only the reset of the control's own figure undoes it: a check that
        // shares a section with an unrelated figure is not reset by it.
        const frame = control?.closest('[data-figure-frame]') ?? null;
        for (let root = control?.parentElement ?? null; root !== null; root = root.parentElement) {
          if (root.matches('[data-article-body], main, body')) return false;
          const button = [...root.querySelectorAll<HTMLElement>('[data-instrument-reset]:not(:disabled)')].find(
            (candidate) => candidate.closest('details:not([open])') === null && candidate.closest('[data-figure-frame]') === frame,
          );
          if (button) {
            button.setAttribute('data-cs-undo', '');
            return true;
          }
          if (root.matches('[data-figure-frame], .pg-section, section')) return false;
        }
        return false;
      }, off.n);
      if (reset) {
        usedReset = true;
        await keyboardModality(page);
        await page.locator('[data-cs-undo]').first().focus();
        await page.keyboard.press('Enter');
        await settle(page);
        await page.evaluate(() => document.querySelector('[data-cs-undo]')?.removeAttribute('data-cs-undo'));
        await park(page);
        restoredState = await call(page, 'selectionState', off.n);
      }
    }
    const restoredOn = on ? await call(page, 'selectionState', on.n) : 'selected';
    // A native radio group that had nothing chosen and has no reset (a
    // commit-to-reveal check) cannot be returned to "nothing chosen" by any
    // input: that one-way choice is recorded as null, not as a failure.
    const oneWay = !on && !usedReset && off.tag === 'input' && restoredState !== off.selected;
    const restored: boolean | null = oneWay ? null : restoredState === off.selected && restoredOn === 'selected';
    const cues = cuesBetween(before, after);
    const paint = { background: after.background, colour: after.colour, lime: after.lime, radiusPx: after.radiusPx, heightPx: after.heightPx };
    results.push({
      route: at.route,
      viewport: at.viewport,
      member: off.member!,
      variant: off.key,
      element: off.element,
      name: off.name,
      semantic,
      method: 'activated',
      diff,
      cues,
      paint,
      restored,
      exemption: off.exemption,
    });
    if (segmentedN !== null && segmentedDiff !== null) {
      const container = controls.find((control) => control.n === segmentedN);
      results.push({
        route: at.route,
        viewport: at.viewport,
        member: 'control:segmented',
        variant: container?.key ?? `segmented:${segmentedN}`,
        element: container?.element ?? off.element,
        name: off.name,
        semantic,
        method: 'activated',
        diff: segmentedDiff,
        cues,
        paint,
        restored,
        exemption: container?.exemption ?? off.exemption,
      });
    }
  }
  return results;
}

async function measureDisabled(
  page: Page,
  at: PageContext,
  control: ProbeControl,
): Promise<ControlDisabledObservation> {
  const n = control.n;
  await park(page);
  const geometry = await call(page, 'geometry', n);
  await settle(page);
  await call(page, 'snap', n, 'disabled');
  const disabledPaint = await call(page, 'computed', n);
  await call(page, 'setDisabled', n, false);
  await settle(page);
  await call(page, 'snap', n, 'enabled');
  const enabledPaint = await call(page, 'computed', n);
  await call(page, 'setDisabled', n, true);
  await settle(page);
  const enabledDiff = await call(page, 'diff', n, 'enabled', 'disabled');

  const before = await call(page, 'state', n);
  const urlBefore = page.url();
  let navigated = false;
  const onNavigate = () => {
    navigated = true;
  };
  page.on('framenavigated', onNavigate);
  let pointerChanged = false;
  let keyboardChanged: boolean | null = null;
  try {
    if (geometry.reachable) {
      await page.mouse.click(geometry.x, geometry.y);
      await settle(page);
      pointerChanged = (await call(page, 'state', n)) !== before;
    }
    if (control.ariaDisabled && !control.native) {
      await keyboardModality(page);
      await call(page, 'focus', n);
      await page.keyboard.press('Enter');
      await page.keyboard.press('Space');
      await settle(page);
      keyboardChanged = (await call(page, 'state', n)) !== before;
    }
  } finally {
    page.off('framenavigated', onNavigate);
  }
  await park(page);
  const colourLighter = luminance(disabledPaint.colour) > luminance(enabledPaint.colour) + 0.02;
  const attenuated = disabledPaint.opacity < enabledPaint.opacity - 0.05 || colourLighter;
  const activeFill = ['rgb(28, 28, 26)', 'rgb(59, 110, 168)'].includes(disabledPaint.background);
  return {
    route: at.route,
    viewport: at.viewport,
    member: control.member!,
    element: control.element,
    name: control.name,
    native: control.native,
    ariaDisabled: control.ariaDisabled,
    enabledDiff,
    neutral: {
      cursor: disabledPaint.cursor,
      opacity: disabledPaint.opacity,
      enabledOpacity: enabledPaint.opacity,
      colour: disabledPaint.colour,
      enabledColour: enabledPaint.colour,
      background: disabledPaint.background,
      attenuated,
      activeFill,
    },
    activation: { pointerChanged, keyboardChanged, navigated: navigated || page.url() !== urlBefore },
    exemption: control.exemption,
  };
}

async function readClipboard(page: Page): Promise<string> {
  return page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
}

async function performAction(
  page: Page,
  at: PageContext,
  action: ReturnType<ProbeApi['actions']>[number],
): Promise<ControlActionObservation> {
  const n = action.n;
  await park(page);
  const visibleText = action.visibleText;
  const nameContainsVisibleText =
    visibleText.length === 0 || action.name.toLowerCase().includes(visibleText.toLowerCase());
  const base = {
    route: at.route,
    viewport: at.viewport,
    member: action.member,
    kind: action.kind,
    element: await call(page, 'outline', n),
    name: action.name,
    visibleText,
    nameContainsVisibleText,
  };
  const focusKeyboard = async () => {
    await keyboardModality(page);
    const focus = await call(page, 'focus', n);
    return focus.matched && focus.tabbable;
  };

  if (action.kind === 'copy-link' || action.kind === 'copy-code') {
    await page.evaluate(() => navigator.clipboard.writeText('').catch(() => undefined));
    const expected = await call(page, 'expectedCopy', n);
    const focusVisible = await focusKeyboard();
    await page.keyboard.press('Enter');
    let copied = '';
    for (let attempt = 0; attempt < 20 && copied !== expected; attempt += 1) {
      await page.waitForTimeout(50);
      copied = await readClipboard(page);
    }
    const afterText = await call(page, 'visibleText', n);
    const afterName = await call(page, 'name', n);
    const nameHoldsAfter = afterText.length === 0 || afterName.toLowerCase().includes(afterText.toLowerCase());
    await park(page);
    return {
      ...base,
      nameContainsVisibleText: nameContainsVisibleText && nameHoldsAfter,
      focusVisible,
      performed: expected.length > 0 && copied === expected,
      restored: null,
      detail: `clipboard ${copied === expected ? 'equals' : 'differs from'} the ${action.kind === 'copy-code' ? 'block code' : 'section URL'} (${expected.length} characters expected, ${copied.length} read)${nameHoldsAfter ? '' : `; after copying its name "${afterName}" lacks its visible text "${afterText}"`}`,
    };
  }

  if (action.kind === 'disclosure') {
    const before = await call(page, 'expanded', n);
    const focusVisible = await focusKeyboard();
    await page.keyboard.press('Enter');
    await settle(page);
    const opened = await call(page, 'expanded', n);
    const focusStayed = await page.evaluate((i) => document.activeElement?.getAttribute('data-cs-probe') === String(i), n);
    if (focusStayed) await page.keyboard.press('Enter');
    else await page.keyboard.press('Escape');
    await settle(page);
    let after = await call(page, 'expanded', n);
    if (after !== before && !focusStayed) {
      await call(page, 'focus', n);
      await page.keyboard.press('Enter');
      await settle(page);
      after = await call(page, 'expanded', n);
    }
    await park(page);
    return {
      ...base,
      focusVisible,
      performed: opened !== before && before !== 'none',
      restored: after === before,
      detail: `expanded ${before} -> ${opened} -> ${after}`,
    };
  }

  if (action.kind === 'sort') {
    const before = await call(page, 'attr', n, 'th:aria-sort');
    const focusVisible = await focusKeyboard();
    await page.keyboard.press('Enter');
    await settle(page);
    const first = await call(page, 'attr', n, 'th:aria-sort');
    await page.keyboard.press('Enter');
    await settle(page);
    const second = await call(page, 'attr', n, 'th:aria-sort');
    await park(page);
    const sorted = (value: string | null) => value === 'ascending' || value === 'descending';
    return {
      ...base,
      focusVisible,
      performed: sorted(first) && sorted(second) && first !== second && (before !== first || before === null),
      restored: null,
      detail: `aria-sort ${before} -> ${first} -> ${second}`,
    };
  }

  if (action.kind === 'reset') {
    const before = await call(page, 'state', n);
    // Change the mount by the keyboard first, so the reset has something to undo.
    const changeByKeyboard = () => page.evaluate((i) => {
      const reset = document.querySelector(`[data-cs-probe="${i}"]`);
      if (!reset) return null;
      const changers = (root: Element) =>
        [
          ...root.querySelectorAll<HTMLElement>('input[type="range"]:not(:disabled)'),
          ...root.querySelectorAll<HTMLElement>('button[aria-pressed="false"]:not(:disabled), [role="radio"][aria-checked="false"], input[type="radio"]:not(:checked):not(:disabled)'),
          ...root.querySelectorAll<HTMLElement>('.figure-action:not([data-instrument-reset]):not(:disabled):not([aria-disabled="true"])'),
        ].filter((element) => element !== reset && element.getBoundingClientRect().width > 0 && element.closest('details:not([open])') === null);
      // The reset belongs to the nearest enclosing widget that holds a
      // control it can reset: a figure frame or section bounds the walk, and
      // a reset in a bare toolbar (a filtered table) climbs only until its
      // filters are in reach, never past the article body.
      let candidates: HTMLElement[] = [];
      for (let root = reset.parentElement; root !== null; root = root.parentElement) {
        if (root.matches('[data-article-body], main, body')) break;
        candidates = changers(root);
        if (candidates.length > 0 || root.matches('[data-figure-frame], .pg-section, section')) break;
      }
      const target = candidates[0];
      if (!target) return null;
      target.setAttribute('data-cs-changer', '');
      return target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'range' ? 'range' : target.tagName === 'INPUT' ? 'radio' : 'button';
    }, n).then(async (changer) => {
      if (changer === null) return false;
      await keyboardModality(page);
      await page.locator('[data-cs-changer]').first().focus();
      if (changer === 'range') {
        const atMax = await page.locator('[data-cs-changer]').first().evaluate((element) => {
          const input = element as HTMLInputElement;
          return input.value === input.max;
        });
        await page.keyboard.press(atMax ? 'Home' : 'End');
      } else {
        await page.keyboard.press(changer === 'radio' ? 'Space' : 'Enter');
      }
      await settle(page);
      await page.evaluate(() => document.querySelector('[data-cs-changer]')?.removeAttribute('data-cs-changer'));
      await park(page);
      return call(page, 'relocate', n);
    });
    const pressReset = async () => {
      const focusVisible = await focusKeyboard();
      await page.keyboard.press('Enter');
      await settle(page);
      await park(page);
      return focusVisible;
    };
    if (!(await changeByKeyboard())) {
      return { ...base, focusVisible: await focusKeyboard(), performed: false, restored: null, detail: 'no keyboard-changeable control in the reset mount, or no reset left in it after the change' };
    }
    const changed = await call(page, 'state', n);
    const focusVisible = await pressReset();
    const after = await call(page, 'state', n);
    if (changed === before || after === before) {
      return {
        ...base,
        focusVisible,
        performed: changed !== before && after === before,
        restored: after === before,
        detail: changed === before ? 'the keyboard change did not move the mount state' : 'reset returned the mount to its default state digest',
      };
    }
    // A reset may restart the instrument at a fixed state other than the
    // first frame (a "Start over" that rewinds a curriculum to round 0), the
    // same rule the interactive capture sweep applies. It passes only when a
    // second change and a second reset land on exactly the same state.
    const changedAgain = (await changeByKeyboard()) ? await call(page, 'state', n) : after;
    await pressReset();
    const restarted = await call(page, 'state', n);
    const restart = changedAgain !== after && restarted === after;
    return {
      ...base,
      focusVisible,
      performed: restart,
      restored: restart ? null : false,
      detail: restart
        ? 'reset restarts the mount at one fixed state, reached again after a second change'
        : 'the state digest after reset differs from the default and from a second reset',
    };
  }

  // clear and close are exercised by the prepared flows below.
  return { ...base, focusVisible: false, performed: false, restored: null, detail: `${action.kind} reached outside a prepared flow` };
}

/** The flows that make a conditional clear or close action appear. */
async function preparedActions(page: Page, at: PageContext): Promise<ControlActionObservation[]> {
  const results: ControlActionObservation[] = [];
  const record = async (
    kind: ControlActionKind,
    locate: () => Promise<number | null>,
    verify: () => Promise<{ performed: boolean; restored: boolean | null; detail: string }>,
  ) => {
    const n = await locate();
    if (n === null) {
      results.push({ route: at.route, viewport: at.viewport, member: 'control:secondary-action', kind, element: '(not rendered)', name: '', visibleText: '', nameContainsVisibleText: true, focusVisible: false, performed: false, restored: null, detail: 'the prepared state did not render the action' });
      return;
    }
    const name = await call(page, 'name', n);
    const visibleText = await call(page, 'visibleText', n);
    const member = (await call(page, 'attr', n, 'data-brand-control-id')) ?? '';
    const element = await call(page, 'outline', n);
    await keyboardModality(page);
    const focus = await call(page, 'focus', n);
    await page.keyboard.press('Enter');
    await settle(page);
    const outcome = await verify();
    await park(page);
    results.push({
      route: at.route,
      viewport: at.viewport,
      member,
      kind,
      element,
      name,
      visibleText,
      nameContainsVisibleText: visibleText.length === 0 || name.toLowerCase().includes(visibleText.toLowerCase()),
      focusVisible: focus.matched && focus.tabbable,
      ...outcome,
    });
  };
  const rediscover = async (pattern: string) => {
    await call(page, 'discover');
    return call(page, 'findAction', pattern);
  };

  if (at.route === '/search/') {
    const input = page.locator('#search-page-input');
    // Clear belongs to a typed query: it must be absent while the box is empty.
    const shownWhileEmpty = await page.getByRole('button', { name: 'Clear search' }).count();
    await input.focus();
    await page.keyboard.type('robot');
    await expect(page.getByRole('button', { name: 'Clear search' })).toBeVisible();
    await record(
      'clear',
      () => rediscover('^clear search$'),
      async () => {
        const value = await input.inputValue();
        const gone = (await page.getByRole('button', { name: 'Clear search' }).count()) === 0;
        const focused = await input.evaluate((element) => document.activeElement === element);
        return {
          performed: shownWhileEmpty === 0 && value === '' && gone,
          restored: !new URL(page.url()).searchParams.has('q'),
          detail: `clear ${shownWhileEmpty === 0 ? 'absent' : 'already shown'} before typing; after it, input "${value}", clear ${gone ? 'gone' : 'still shown'}, focus ${focused ? 'held on the input' : 'moved'}`,
        };
      },
    );
  }

  if (at.route === '/market-map/') {
    const countBefore = await page.locator('[data-result-count]').first().innerText();
    const segment = page.locator('[role="group"][aria-label="Segment"] button[aria-pressed="false"]').first();
    await keyboardModality(page);
    await segment.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Clear filters' }).first()).toBeVisible();
    await record(
      'clear',
      () => rediscover('^clear filters$'),
      async () => {
        const countAfter = await page.locator('[data-result-count]').first().innerText();
        const gone = (await page.getByRole('button', { name: 'Clear filters' }).count()) === 0;
        return { performed: countAfter === countBefore && gone, restored: countAfter === countBefore, detail: `result count "${countBefore}" -> "${countAfter}", clear ${gone ? 'gone' : 'still shown'}` };
      },
    );
    const tile = page.locator('[data-map-tile]').first();
    await keyboardModality(page);
    await tile.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog').first()).toBeVisible();
    await record(
      'close',
      () => rediscover('^close\\b'),
      async () => {
        await settle(page);
        const open = await page.getByRole('dialog').count();
        const focusBack = await tile.evaluate((element) => document.activeElement === element);
        return { performed: open === 0, restored: focusBack, detail: `${open} dialog(s) open after Close, focus ${focusBack ? 'returned to the tile' : 'elsewhere'}` };
      },
    );
  }

  if (at.route === '/playground/') {
    const count = page.getByTestId('trajectory-count');
    const countBefore = await count.innerText();
    await keyboardModality(page);
    await page.getByTestId('trajectory-record').focus();
    await page.keyboard.press('Enter');
    await expect(count).not.toHaveText(countBefore);
    await record(
      'clear',
      () => rediscover('^clear the recorded poses$'),
      async () => {
        const after = await count.innerText();
        return { performed: after === countBefore, restored: after === countBefore, detail: `pose count "${countBefore}" -> "${after}"` };
      },
    );
    const fields = ['forward', 'left', 'up'] as const;
    const values = { forward: '20', left: '5', up: '15' };
    for (const field of fields) {
      await page.getByTestId(`reach-input-${field}`).fill(values[field]);
    }
    await page.getByTestId(`reach-input-up`).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('reach-clear')).toBeEnabled();
    await record(
      'clear',
      () => rediscover('^clear target$'),
      async () => {
        const disabled = await page.getByTestId('reach-clear').isDisabled();
        return { performed: disabled, restored: disabled, detail: disabled ? 'the target cleared and Clear target is unavailable again' : 'Clear target is still available' };
      },
    );
  }
  return results;
}

type PageResult = {
  page: ControlPageObservation;
  variants: ControlVariantObservation[];
  selections: ControlSelectionObservation[];
  disabled: ControlDisabledObservation[];
  unexposedDisabled: ControlStatesEvidence['unexposedDisabled'];
  actions: ControlActionObservation[];
  icons: ControlIconObservation[];
  statusChips: StatusChipObservation[];
};

async function openRoute(page: Page, base: string, route: string): Promise<number> {
  const response = await page.goto(`${base}${route}`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  if (route === '/playground/') await waitForArm(page);
  await page.waitForTimeout(150);
  // Every further figure control (sliders, the reset) sits in a collapsed
  // "Adjust more" fold, and a figure's method in another. A reader opens
  // them, so the sweep does too: a control hidden by a closed fold is still
  // a registered member that must be measured.
  const opened = await page.evaluate(() => {
    let count = 0;
    for (const fold of document.querySelectorAll<HTMLDetailsElement>('details[data-figure-fold]:not([open])')) {
      fold.open = true;
      count += 1;
    }
    return count;
  });
  if (opened > 0) await page.waitForTimeout(100);
  await installOn(page, route);
  return response?.status() ?? 0;
}

async function sweepPage(page: Page, base: string, route: string, viewport: Viewport): Promise<PageResult> {
  const at = { route, viewport: viewport.id };
  const status = await openRoute(page, base, route);
  const discovery = await call(page, 'discover');
  const instances = new Map<string, number>();
  for (const control of discovery.controls) instances.set(control.key, (instances.get(control.key) ?? 0) + 1);
  const firsts = new Map<string, ProbeControl>();
  for (const control of discovery.controls) if (!firsts.has(control.key)) firsts.set(control.key, control);

  const variants: ControlVariantObservation[] = [];
  for (const control of firsts.values()) {
    variants.push(await measureVariant(page, at, control, instances.get(control.key) ?? 1));
  }
  const disabled: ControlDisabledObservation[] = [];
  for (const control of firsts.values()) {
    if (control.disabled) disabled.push(await measureDisabled(page, at, control));
  }
  const selections = await measureSelections(page, at, discovery.controls);

  // Actions mutate the page, so they run on a fresh load.
  await openRoute(page, base, route);
  await call(page, 'discover');
  const found = await call(page, 'actions');
  const ordinalOf = (list: typeof found, action: (typeof found)[number]) =>
    list.filter((entry) => entry.key === action.key).indexOf(action);
  let current = found;
  const actionKeys = new Set<string>();
  const actions: ControlActionObservation[] = [];
  for (const action of found) {
    if (action.kind === 'clear' || action.kind === 'close') continue;
    if (action.kind !== 'copy-code' && action.kind !== 'reset') {
      if (actionKeys.has(action.key)) continue;
      actionKeys.add(action.key);
    }
    // An earlier action can re-render the region that holds a later one (a
    // figure reset that remounts the table it filters); the later action
    // then runs on a fresh load, found again by its key and order.
    let target = current === found ? action : current.filter((entry) => entry.key === action.key)[ordinalOf(found, action)];
    if (target === undefined || !(await call(page, 'connected', target.n))) {
      await openRoute(page, base, route);
      await call(page, 'discover');
      current = await call(page, 'actions');
      target = current.filter((entry) => entry.key === action.key)[ordinalOf(found, action)] ?? action;
    }
    actions.push(await performAction(page, at, target));
  }
  if (['/search/', '/market-map/', '/playground/'].includes(route)) {
    await openRoute(page, base, route);
    await call(page, 'discover');
    actions.push(...(await preparedActions(page, at)));
  }

  return {
    page: {
      route,
      viewport: viewport.id,
      status,
      controls: discovery.counts,
      unregistered: discovery.unregistered,
      codeBlocks: discovery.codeBlocks,
    },
    variants,
    selections,
    disabled,
    unexposedDisabled: discovery.unexposedDisabled.map((record) => ({ ...at, ...record })),
    actions,
    icons: discovery.icons.map((icon) => ({ ...at, ...icon })),
    statusChips: discovery.statusChips.map((chip) => ({ ...at, ...chip })),
  };
}

let cached: ControlStatesEvidence | null = null;

async function sweep(browser: Browser, base: string): Promise<ControlStatesEvidence> {
  if (cached) return cached;
  const evidence: ControlStatesEvidence = {
    version: CONTROL_STATES_VERSION,
    generatedBy: CONTROL_STATES_SWEEP_MODULE,
    fingerprint: controlStatesEvidenceFingerprint({ root: process.cwd(), routes: ROUTES, registry: REGISTRY }),
    viewports: CONTROL_STATE_VIEWPORTS.map(({ id }) => id),
    routes: [...ROUTES],
    pages: [],
    variants: [],
    selections: [],
    disabled: [],
    unexposedDisabled: [],
    actions: [],
    icons: [],
    statusChips: [],
  };
  for (const viewport of CONTROL_STATE_VIEWPORTS) {
    for (const route of ROUTES) {
      const result = await inOwnContext(browser, (page) => sweepPage(page, base, route, viewport), contextOptions(viewport));
      evidence.pages.push(result.page);
      evidence.variants.push(...result.variants);
      evidence.selections.push(...result.selections);
      evidence.disabled.push(...result.disabled);
      evidence.unexposedDisabled.push(...result.unexposedDisabled);
      evidence.actions.push(...result.actions);
      evidence.icons.push(...result.icons);
      evidence.statusChips.push(...result.statusChips);
    }
  }
  mkdirSync(dirname(EVIDENCE_FILE), { recursive: true });
  writeFileSync(EVIDENCE_FILE, `${JSON.stringify(evidence, null, 1)}\n`);
  cached = evidence;
  return evidence;
}

function verdictFailures(assertionId: (typeof CONTROL_STATE_ASSERTIONS)[number], evidence: ControlStatesEvidence) {
  return REGISTRY.controls.flatMap(({ id }) => controlStateVerdict(assertionId, id, evidence, REGISTRY).failures);
}

/* ------------------------------------------------------------------ */
/* Planted mutations                                                   */
/* ------------------------------------------------------------------ */

const PLANT_ROUTE = '/manipulation/action-chunking/';
const PLANT_VIEWPORT = CONTROL_STATE_VIEWPORTS[1];

async function plantedVariant(
  browser: Browser,
  base: string,
  plant: (page: Page) => Promise<void>,
  pick: (control: ProbeControl) => boolean,
): Promise<{ variant: ControlVariantObservation; supported: readonly string[] }> {
  return inOwnContext(
    browser,
    async (page) => {
      await openRoute(page, base, PLANT_ROUTE);
      await plant(page);
      const discovery = await call(page, 'discover');
      const control = discovery.controls.find(pick);
      expect(control, 'the planted route renders the control the mutation targets').toBeDefined();
      const variant = await measureVariant(page, { route: PLANT_ROUTE, viewport: PLANT_VIEWPORT.id }, control!, 1);
      const supported = REGISTRY.controls.find(({ id }) => id === control!.member)!.supportedStates;
      return { variant, supported };
    },
    contextOptions(PLANT_VIEWPORT),
  );
}

const isPermalink = (control: ProbeControl) => control.element.includes('data-heading-permalink');

test.describe('brand-v2 control states sweep', () => {
  test.describe.configure({ mode: 'serial' });

  test('sweeps every registered control at 375 and 1440 px and persists the control-states evidence', async ({ browser, staticBase }) => {
    test.setTimeout(90 * 60_000);
    const evidence = await sweep(browser, staticBase);
    const read = readControlStatesEvidence({
      artifact: evidence,
      fingerprint: controlStatesEvidenceFingerprint({ root: process.cwd(), routes: ROUTES, registry: REGISTRY }),
      routes: ROUTES,
      registry: REGISTRY,
    });
    expect(read.pages).toHaveLength(ROUTES.length * CONTROL_STATE_VIEWPORTS.length);
    // Non-empty populations, derived from the registry rather than typed here.
    for (const row of REGISTRY.controls) {
      for (const viewport of CONTROL_STATE_VIEWPORTS) {
        const rendered = read.pages
          .filter((page) => page.viewport === viewport.id)
          .reduce((sum, page) => sum + (page.controls[row.id] ?? 0), 0);
        if (row.mountState === 'production') {
          expect(rendered, `${row.id} renders at ${viewport.id}`).toBeGreaterThan(0);
          expect(read.variants.filter((variant) => variant.member === row.id && variant.viewport === viewport.id).length, `${row.id} variants measured at ${viewport.id}`).toBeGreaterThan(0);
        } else {
          expect(rendered, `${row.id} is ${row.mountState} and renders nowhere at ${viewport.id}`).toBe(0);
        }
      }
    }
    expect(read.selections.length, 'selected states measured').toBeGreaterThan(0);
    expect(read.disabled.length, 'disabled controls measured').toBeGreaterThan(0);
    expect(read.actions.length, 'actions performed').toBeGreaterThan(0);
    expect(read.icons.length, 'icons reconciled').toBeGreaterThan(0);
    expect(read.statusChips.length, 'status chips read').toBeGreaterThan(0);
    for (const kind of ['clear', 'copy-link', 'copy-code', 'sort', 'reset', 'disclosure', 'close'] as const) {
      expect(read.actions.filter((action) => action.kind === kind).length, `${kind} actions performed`).toBeGreaterThan(0);
    }
    expect(read.pages.flatMap((page) => page.unregistered.map((element) => `${page.route} @ ${page.viewport}: ${element}`)), 'every structural control is registered').toEqual([]);
  });

  test('VAL-B2-COMP-002 every registered control paints hover, pressed, focus-visible, selected and disabled distinctly from rest at 375 and 1440 px', async ({ browser, staticBase }) => {
    test.setTimeout(90 * 60_000);
    const evidence = await sweep(browser, staticBase);
    expect(verdictFailures('VAL-B2-COMP-002', evidence)).toEqual([]);
  });

  test('VAL-B2-COMP-005 every clear, copy, sort, reset, disclosure and close action works from the keyboard, code-block copy included', async ({ browser, staticBase }) => {
    test.setTimeout(90 * 60_000);
    const evidence = await sweep(browser, staticBase);
    expect(verdictFailures('VAL-B2-COMP-005', evidence)).toEqual([]);
  });

  test('VAL-B2-COMP-007 every selected chip is unfilled ink with a non-colour cue and a semantic state, and every status chip carries text', async ({ browser, staticBase }) => {
    test.setTimeout(90 * 60_000);
    const evidence = await sweep(browser, staticBase);
    expect(verdictFailures('VAL-B2-COMP-007', evidence)).toEqual([]);
  });

  test('VAL-B2-COMP-011 every functional icon is named and every decorative icon is hidden', async ({ browser, staticBase }) => {
    test.setTimeout(90 * 60_000);
    const evidence = await sweep(browser, staticBase);
    expect(verdictFailures('VAL-B2-COMP-011', evidence)).toEqual([]);
  });

  test('VAL-B2-COMP-015 transient paint never becomes persistent ARIA and disabled controls are exposed, inert and neutral', async ({ browser, staticBase }) => {
    test.setTimeout(90 * 60_000);
    const evidence = await sweep(browser, staticBase);
    expect(verdictFailures('VAL-B2-COMP-015', evidence)).toEqual([]);
  });

  test('a stripped focus outline fails only the focus-visible clause', async ({ browser, staticBase }) => {
    const { variant, supported } = await plantedVariant(
      browser,
      staticBase,
      (page) => page.addStyleTag({ content: '[data-heading-permalink]:focus-visible { outline: none !important; opacity: 0.35 !important; }' }).then(() => undefined),
      isPermalink,
    );
    const failures = variantStateFailures(variant, supported);
    expect(failures.length).toBeGreaterThan(0);
    expect(failures.every((failure) => /keyboard focus paints the same as rest/.test(failure))).toBe(true);
    expect(transientAriaFailures(variant)).toEqual([]);
  });

  test('aria-pressed set on hover fails only the transient ARIA clause', async ({ browser, staticBase }) => {
    const { variant, supported } = await plantedVariant(
      browser,
      staticBase,
      (page) =>
        page.evaluate(() => {
          for (const button of document.querySelectorAll('[data-heading-permalink]')) {
            button.addEventListener('mouseenter', () => button.setAttribute('aria-pressed', 'true'));
            button.addEventListener('mouseleave', () => button.removeAttribute('aria-pressed'));
          }
        }),
      isPermalink,
    );
    expect(variantStateFailures(variant, supported)).toEqual([]);
    const failures = transientAriaFailures(variant);
    expect(failures.length).toBeGreaterThan(0);
    expect(failures.every((failure) => /hover changed .*aria-pressed=true|pressing changed .*aria-pressed=true/.test(failure))).toBe(true);
  });

  test('an icon-only button stripped of its name fails only the functional icon clause', async ({ browser, staticBase }) => {
    const icons = await inOwnContext(
      browser,
      async (page) => {
        await openRoute(page, staticBase, PLANT_ROUTE);
        await page.evaluate(() => document.querySelector('[data-heading-permalink]')?.removeAttribute('aria-label'));
        return (await call(page, 'discover')).icons.map((icon) => ({ route: PLANT_ROUTE, viewport: PLANT_VIEWPORT.id, ...icon }));
      },
      contextOptions(PLANT_VIEWPORT),
    );
    const failures = icons.flatMap(iconFailures);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatch(/a functional icon's control has no accessible name/);
    expect(failures[0]).toMatch(/data-heading-permalink/);
  });

  test('a filled selected chip, an active disabled control and a broken copy each fail their own clause', async ({ browser, staticBase }) => {
    test.setTimeout(5 * 60_000);
    const viewport = PLANT_VIEWPORT;
    const outcome = await inOwnContext(
      browser,
      async (page) => {
        await openRoute(page, staticBase, '/market-map/');
        await page.addStyleTag({ content: '[data-brand-control-id="control:selection"][aria-pressed="true"] { background-color: rgb(198, 255, 25) !important; }' });
        const discovery = await call(page, 'discover');
        const selections = await measureSelections(page, { route: '/market-map/', viewport: viewport.id }, discovery.controls);
        await openRoute(page, staticBase, '/playground/');
        const playground = await call(page, 'discover');
        const target = playground.controls.find((control) => control.disabled && control.element.includes('trajectory-export'));
        expect(target, 'the playground renders its unavailable Export action').toBeDefined();
        // The look stays disabled while the element is made activatable: the
        // stylesheet keys the attenuated look on :disabled, so the planted
        // aria-disabled state carries the same look, and only activation is
        // broken.
        await page.addStyleTag({ content: '[data-testid="trajectory-export"][aria-disabled="true"] { opacity: 0.45 !important; cursor: not-allowed !important; }' });
        await page.evaluate((i) => {
          const button = document.querySelector<HTMLButtonElement>(`[data-cs-probe="${i}"]`)!;
          button.disabled = false;
          button.setAttribute('aria-disabled', 'true');
          button.addEventListener('click', () => {
            document.querySelector('[data-testid="trajectory-count"]')!.textContent = 'planted';
          });
        }, target!.n);
        const disabled = await measureDisabled(page, { route: '/playground/', viewport: viewport.id }, { ...target!, native: false, ariaDisabled: true });
        await openRoute(page, staticBase, PLANT_ROUTE);
        await page.evaluate(() => {
          navigator.clipboard.writeText = () => Promise.resolve();
        });
        await call(page, 'discover');
        const copy = (await call(page, 'actions')).find((action) => action.kind === 'copy-code');
        expect(copy, 'the planted route renders a code-block copy action').toBeDefined();
        const action = await performAction(page, { route: PLANT_ROUTE, viewport: viewport.id }, copy!);
        return { selections, disabled, action };
      },
      contextOptions(viewport),
    );
    const chip = outcome.selections.filter((selection) => selection.method === 'rendered-pair' || selection.semantic === 'aria-pressed').flatMap(chipFailures);
    expect(chip.length).toBeGreaterThan(0);
    expect(chip.every((failure) => /is filled|retired lime/.test(failure))).toBe(true);
    const disabled = disabledFailures(outcome.disabled, 'exposure');
    expect(disabled.length).toBeGreaterThan(0);
    expect(disabled.every((failure) => /changed the page state/.test(failure))).toBe(true);
    const copy = actionFailures(outcome.action);
    expect(copy).toHaveLength(1);
    expect(copy[0]).toMatch(/did not perform its labelled action/);
  });

  test('an empty population and a stale or incomplete artifact are refused', async () => {
    const empty: ControlStatesEvidence = {
      version: CONTROL_STATES_VERSION,
      generatedBy: CONTROL_STATES_SWEEP_MODULE,
      fingerprint: 'x',
      viewports: CONTROL_STATE_VIEWPORTS.map(({ id }) => id),
      routes: [...ROUTES],
      pages: [],
      variants: [],
      selections: [],
      disabled: [],
      unexposedDisabled: [],
      actions: [],
      icons: [],
      statusChips: [],
    };
    expect(() => readControlStatesEvidence({ artifact: empty, fingerprint: 'x', routes: [], registry: REGISTRY })).toThrow(/population is empty/);
    expect(() => readControlStatesEvidence({ artifact: empty, fingerprint: 'y', routes: ROUTES, registry: REGISTRY })).toThrow(/stale/);
    expect(() => readControlStatesEvidence({ artifact: empty, fingerprint: 'x', routes: ROUTES, registry: REGISTRY })).toThrow(/incomplete/);
    const production = REGISTRY.controls.find(({ mountState }) => mountState === 'production')!;
    const verdict = controlStateVerdict('VAL-B2-COMP-002', production.id, empty, REGISTRY);
    expect(verdict.failures.some((failure) => /rendered none of it/.test(failure))).toBe(true);
  });
});
