import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { DOMAINS } from '../data/domains.ts';
import { MATERIAL_TEXT_CONTRAST_FLOOR } from './brand-v2-materials.ts';
import { PUBLIC_IDENTITY } from './identity.ts';
import { CASE_SENSITIVE_PATTERN_SOURCE } from './notation-case.ts';
import {
  ARTICLE_BODY_COMPUTED_IMPORT,
  SHIPPED_GEOMETRY_MODEL_CLASS,
  deriveEvidenceClosure,
  evidenceClosureGraph,
  routeEntryModules,
} from './brand-v2-evidence-closure.ts';
import { parseEvidenceArtifact } from './brand-v2-evidence-schema.ts';

/**
 * Evidence for the product-wide colour, component, spacing, type, grid and
 * surface rows: one sweep of every registered public route at the three
 * page-frame widths, read by the browser that laid each page out.
 *
 * None of these rows survives a source read. Whether a primary action is an
 * ink fill with a light label, whether a label clears 4.5:1 on the ground it
 * actually composites onto, whether a section opens 76 px under the last
 * block, whether a heading breaks inside a word, whether a device sits on
 * the line it registers or a rule paints 1 px: each is a computed style or
 * a laid-out box at one width. The collector
 * (`tests/e2e/helpers/global-convergence-collector.ts`) discovers every
 * population structurally, from computed styles and the accessibility tree,
 * before it reads any annotation, and records every finding, exempted or
 * not, so this reader can refuse an exemption the register below does not
 * grant for that predicate, route, property or value.
 *
 * The rows were sealed in brand-v2 terms; their research-page successors
 * (owner decision of 10 October 2026, `PANTHEON-SPEC.md`) are recorded in
 * `contract/design-integrity.md`, and the thresholds below are those
 * successors' numbers.
 */
export const GLOBAL_CONVERGENCE_EVIDENCE_PATH = 'evidence/brand-v2/global-convergence.json';

/** The sweep whose own bytes decide what this evidence recorded. */
export const GLOBAL_CONVERGENCE_SWEEP_MODULE = 'tests/e2e/brand-v2-global-convergence.spec.ts';

export const GLOBAL_CONVERGENCE_VERSION = 2;

/**
 * One width per registered page frame (`contract/brand-v2-registries.json`
 * `pageFrames`), each with the minimum page-inline padding that frame
 * registers (`VAL-B2-SPACE-002`).
 */
export const GLOBAL_CONVERGENCE_VIEWPORTS = [
  { id: '375x812', width: 375, height: 812, frame: 'frame:mobile', minimumInlinePaddingPx: 20 },
  { id: '768x1024', width: 768, height: 1024, frame: 'frame:tablet', minimumInlinePaddingPx: 32 },
  { id: '1440x900', width: 1440, height: 900, frame: 'frame:desktop', minimumInlinePaddingPx: 48 },
] as const;

export type ConvergenceFrameId = (typeof GLOBAL_CONVERGENCE_VIEWPORTS)[number]['frame'];

/** How many keyboard stops the sweep reads on every route at every width. */
export const FOCUS_TAB_STOPS = 30;

/** The executable spacing ladder (`VAL-B2-SPACE-001`), exactly. */
export const SPACING_LADDER_PX = [4, 8, 12, 16, 24, 32, 48, 64, 96, 128] as const;

/**
 * The ladder's half-steps: the midpoint of each pair of neighbouring rungs,
 * and 2 px under the first. The research-page template sets tight label
 * stacks, table cells and block rhythm on them (the `VAL-B2-SPACE-001`
 * successor); anything else off the ladder needs a register entry.
 */
export const SPACING_HALF_STEPS_PX = [
  SPACING_LADDER_PX[0] / 2,
  ...SPACING_LADDER_PX.slice(1).map((rung, index) => (SPACING_LADDER_PX[index] + rung) / 2),
] as const;

/** `VAL-B2-SPACE-003`; the tablet frame takes the union of the two sealed ranges. */
export const SECTION_SEPARATION_PX: Readonly<Record<ConvergenceFrameId, readonly [number, number]>> = {
  'frame:mobile': [48, 80],
  'frame:tablet': [48, 128],
  'frame:desktop': [64, 128],
};
export const COMPONENT_INTERIOR_PX = [12, 24] as const;
export const CONTROL_GAP_PX = [4, 12] as const;
/** Half a pixel of sub-pixel layout either side of a sealed bound. */
export const LAYOUT_TOLERANCE_PX = 0.5;

/** `VAL-B2-SPACE-004` successor: the 1440 px frame geometry. */
export const DESKTOP_FRAME_GEOMETRY = {
  wideEditorialFramePx: [1280, 1440],
  readingColumnPx: [880, 960],
  sheetColumnPx: [880, 960],
  narrowMeasureCh: [62, 68],
  innerRailMaxPx: 960,
} as const;

/** Everything a figure owns: its marks are data, not page chrome. */
export const FIGURE_SELECTOR =
  'svg, canvas, figure, [data-figure-frame], [data-figure-stage], [data-playground], [data-explainer], [data-anatomy], [data-chart-mark]';

/**
 * The page-frame register (`VAL-B2-SPACE-005`): which frame owns a page's
 * h1. A route whose h1 sits in none of these has no frame owner and fails.
 */
export const FRAME_OWNERS = [
  { id: 'frame:article', kind: 'editorial', selector: '[data-prose-column]' },
  { id: 'frame:sheet', kind: 'sheet', selector: '.sheet' },
  { id: 'frame:narrow', kind: 'narrow', selector: '[data-page-frame="frame:narrow"]' },
  { id: 'frame:map', kind: 'full-frame', selector: '[data-page-frame="frame:map"]' },
  { id: 'frame:playground', kind: 'full-frame', selector: '[data-page-frame="frame:playground"]' },
  {
    id: 'frame:explainer',
    kind: 'full-frame',
    selector: 'div:has(> [data-explainers]:not([data-explainer-embed]))',
  },
] as const;

export type ConvergencePredicate =
  | 'primary-ink-fill'
  | 'secondary-quiet'
  | 'action-colour-fill'
  | 'disabled-neutral'
  | 'selection-fill'
  | 'selection-colour-text'
  | 'state-non-colour-cue'
  | 'retired-paint'
  | 'accent-outside-figure'
  | 'accent-as-warning'
  | 'success-in-grey-or-accent'
  | 'link-hue'
  | 'gradient'
  | 'rounded-corner'
  | 'capsule'
  | 'text-contrast'
  | 'boundary-contrast'
  | 'frame-depth'
  | 'nested-frame'
  | 'repeated-signature'
  | 'bento-grid'
  | 'empty-card'
  | 'citation-language'
  | 'citation-target'
  | 'inline-padding'
  | 'text-collision'
  | 'clipped-text'
  | 'broken-word'
  | 'focus-ring'
  | 'focus-offset'
  | 'type-range'
  | 'spacing-ladder'
  | 'section-separation'
  | 'component-interior'
  | 'control-gap'
  | 'composition-offgrid'
  | 'device-under-prose'
  | 'texture'
  | 'device-exposed'
  | 'device-misaligned'
  | 'unregistered-device'
  | 'technical-glyph'
  | 'ambient-animation'
  | 'rail-colour'
  | 'casing-drift'
  | 'border-weight'
  | 'dashed-border'
  | 'shadow'
  | 'glow'
  | 'dark-surface'
  | 'dark-shell'
  | 'material'
  | 'double-rule';

export type ConvergenceExemption = {
  id: string;
  selector: string;
  predicates: readonly ConvergencePredicate[];
  /** Spacing only: the computed properties the reason covers. */
  properties?: readonly string[];
  /** Spacing only: the exact used values the reason covers. */
  valuesPx?: readonly number[];
  /** Route ids the exemption may be used on; every route when absent. */
  routes?: readonly string[];
  reason: string;
};

const OWNER_FREEZE =
  'Josef, 12 October 2026: "Leave /how-robots-work/ exactly as it is." The explainer viewer keeps its frozen look on its own page and as home\'s featured scene (its 2 px focus ring, step dots, rail chips and their 2 px accent current mark, the chart-tone rules around its stage, folds and pager, and its tight control rhythm); each is listed as a known owner-gated difference, not drift.';

/**
 * The checked-in exemption register. Each entry is named, scoped to a
 * selector and to the predicates its reason covers, and every predicate,
 * value and route it lists has to be used by the sweep: an entry or clause
 * nothing needs is refused rather than kept as a standing allowance.
 */
export const CONVERGENCE_EXEMPTIONS: readonly ConvergenceExemption[] = [
  {
    id: 'owner-freeze:explainers',
    selector: '[data-explainers]',
    predicates: [
      'selection-fill',
      'accent-outside-figure',
      'rounded-corner',
      'focus-ring',
      'spacing-ladder',
      'section-separation',
      'inline-padding',
      'type-range',
      'rail-colour',
      'border-weight',
    ],
    routes: ['route:/', 'route:/how-robots-work/'],
    reason: OWNER_FREEZE,
  },
  {
    id: 'owner-freeze:how-robots-work',
    selector: 'div:has(> [data-explainers]:not([data-explainer-embed]))',
    predicates: ['inline-padding', 'type-range'],
    routes: ['route:/how-robots-work/'],
    reason: `${OWNER_FREEZE} The page's own heading block (its 30 px h1 and 17 px introduction) and its 24 px tablet gutter are part of that page.`,
  },
  {
    id: 'focus:inset-ring',
    selector: '[data-map-tile], .pg-stage canvas',
    predicates: ['focus-offset'],
    routes: ['route:/market-map/', 'route:/playground/'],
    reason:
      'The 1 px ink ring is drawn 1 px inside, not 2 px outside: map tiles stack with no row gap, so an outset ring would draw over the next tile\'s name, and the playground stage clips its overflow, so an outset ring on its canvas would be cut away. Only the offset is excused; style, width and ink are still read.',
  },
  {
    id: 'code-block-radius',
    selector: '[data-rehype-pretty-code-figure], pre',
    predicates: ['rounded-corner'],
    reason: 'PANTHEON-SPEC.md: "Radius 0 on figure frames; 7 px only on code blocks."',
  },
  {
    id: 'spacing:optical-hairline',
    selector: 'body',
    predicates: ['spacing-ladder'],
    valuesPx: [1],
    reason:
      'A one-pixel optical correction: the -1 px overlap that lets a chosen tab\'s rule paint over its strip\'s hairline, the 1 px lift that sets a sequence label on the baseline, and the 1 px inset of a superscript citation mark.',
  },
  {
    id: 'spacing:native-choice-in-label',
    selector: 'label input[type="radio"], label input[type="checkbox"]',
    predicates: ['spacing-ladder'],
    properties: ['marginTop'],
    valuesPx: [5],
    reason:
      'Optical: a native 13 px radio inside its 24 px-or-taller label drops 5 px so its box centres on the first 15/1.62 line of the label it answers.',
  },
  {
    id: 'spacing:em-derived',
    selector: 'code, .sidenote',
    predicates: ['spacing-ladder'],
    properties: ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'marginTop'],
    valuesPx: [1.68, 4.48, 4.55],
    reason:
      'Em-derived: inline code pads 0.12em 0.32em of its own 14 px size, and a margin note drops 0.35em of its 13 px size so its first line sits on the line that cites it.',
  },
  {
    id: 'spacing:viewport-derived',
    selector: '.sheet-masthead, .article-masthead, [data-prose-column], .sidenote, .wide-measure',
    predicates: ['spacing-ladder'],
    valuesPx: [61.44, 115.2, 31.68, 211.68, 27.67],
    reason:
      'Viewport-derived: the masthead top is clamp(56px, 8vw, 128px), the article column gap is clamp(24px, 2.2vw, 36px), a margin note is pulled out by its width plus that gap, and a wide figure is centred on the column by min(1020px, ...).',
  },
  {
    id: 'spacing:audit-pinned',
    selector: '[data-self-check], section[aria-labelledby="references-heading"] h3',
    predicates: ['spacing-ladder'],
    properties: ['marginTop', 'marginBottom'],
    valuesPx: [36],
    reason:
      'Byte-pinned by sealed audit evidence: `components/article/commit-to-reveal.tsx` (the self-check\'s 36 px block margin) by the shared-ui continuity records in audit/local-basis.json, and `components/article/references.tsx` (the Further reading head\'s 36 px top) by the industrial correction records 37, 47 and 48. Moving either to 32 px needs an integrator-scale rebind of those pins, not a hand edit.',
  },
  {
    id: 'spacing:research-page-rhythm',
    selector: '.page-lead, .prose h2, .sheet-section, .article-toc, .article-body',
    predicates: ['spacing-ladder'],
    properties: ['marginTop'],
    valuesPx: [30, 72, 76],
    reason:
      'The research-page reference rhythm (PANTHEON-SPEC.md, pantheon-ref/rp1-tokens.json): the lead opens 30 px under the title as the reference lead does; a section opens 76 px before its H2 (the spec\'s "about 86 px before an H2", with the heading\'s half-leading); the contents rail and the body both open 72 px under the masthead so they start on one line.',
  },
];

type Form = {
  families: readonly string[];
  weights: readonly [number, number];
  /** Per page frame, or one range for all three. */
  sizePx: readonly [number, number] | Readonly<Record<ConvergenceFrameId, readonly [number, number]>>;
  lineHeight: readonly [number, number];
  trackingEm: readonly [number, number];
  transforms: readonly string[];
  measurePx: number;
  /** Sub- and superscripts: their size over the line they sit on. */
  parentSizeRatio?: readonly [number, number];
};

const DISPLAY_H1: Form = {
  families: ['DM Sans'],
  weights: [400, 400],
  sizePx: { 'frame:mobile': [40, 48], 'frame:tablet': [40, 92], 'frame:desktop': [84, 92] },
  lineHeight: [0.9, 0.96],
  trackingEm: [-0.03, 0],
  transforms: ['none'],
  measurePx: 1020,
};

/**
 * `VAL-B2-TYPE-018` successor: the sealed ranges per population. The seven
 * the row names, plus the reading body `VAL-B2-TYPE-004` seals, the sub- and
 * superscripts that scale from their line, and the wordmark instance
 * `VAL-B2-TYPE-006`/`-015` seal, so no rendered text falls outside every
 * population. A rendered tuple passes when it matches one sealed form.
 */
export const TYPE_POPULATIONS: Readonly<Record<string, readonly Form[]>> = {
  'page-h1': [DISPLAY_H1],
  'article-h1': [DISPLAY_H1],
  'section-display': [
    {
      families: ['DM Sans'],
      weights: [600, 600],
      sizePx: [20, 20.5],
      lineHeight: [1.2, 1.4],
      trackingEm: [0.05, 0.06],
      transforms: ['uppercase'],
      measurePx: 960,
    },
  ],
  'supporting-heading': [
    {
      families: ['DM Sans'],
      weights: [600, 600],
      sizePx: [14, 18],
      lineHeight: [1.3, 1.55],
      trackingEm: [-0.02, 0.02],
      transforms: ['none'],
      measurePx: 960,
    },
  ],
  'reading-body': [
    {
      families: ['Geist'],
      weights: [400, 400],
      sizePx: [16, 16],
      lineHeight: [1.6, 1.65],
      trackingEm: [0, 0],
      transforms: ['none'],
      measurePx: 960,
    },
  ],
  'ui-body': [
    {
      families: ['Geist'],
      weights: [400, 600],
      sizePx: [11, 16],
      lineHeight: [1, 1.75],
      trackingEm: [-0.01, 0.01],
      transforms: ['none'],
      measurePx: 1020,
    },
    // A listed entry's title, set as the H3 is, or a step under it where an
    // index column holds the longest name on one line (home's contents).
    {
      families: ['DM Sans'],
      weights: [600, 600],
      sizePx: [15, 16],
      lineHeight: [1.3, 1.45],
      trackingEm: [-0.01, 0.01],
      transforms: ['none'],
      measurePx: 1020,
    },
  ],
  'data-control': [
    {
      families: ['Geist Mono'],
      weights: [400, 600],
      sizePx: [11, 24],
      lineHeight: [1, 2],
      trackingEm: [-0.01, 0.01],
      transforms: ['none'],
      measurePx: 1020,
    },
  ],
  'registration-label': [
    {
      families: ['Geist'],
      weights: [500, 500],
      sizePx: [11, 14],
      lineHeight: [1, 1.6],
      trackingEm: [0.075, 0.085],
      transforms: ['uppercase'],
      measurePx: 1020,
    },
  ],
  script: [
    {
      families: ['Geist'],
      weights: [400, 500],
      sizePx: [8, 14],
      lineHeight: [0, 1.75],
      trackingEm: [0, 0],
      transforms: ['none'],
      measurePx: 120,
      parentSizeRatio: [0.6, 0.85],
    },
  ],
  // Home's featured article and scene: the article's title in the display
  // face, then the dek written for home, set as a lead.
  feature: [
    {
      families: ['DM Sans'],
      weights: [600, 600],
      sizePx: [24, 32],
      lineHeight: [1.1, 1.2],
      trackingEm: [-0.015, 0],
      transforms: ['none'],
      measurePx: 960,
    },
    {
      families: ['Geist'],
      weights: [400, 400],
      sizePx: [18, 18],
      lineHeight: [1.5, 1.6],
      trackingEm: [0, 0],
      transforms: ['none'],
      measurePx: 960,
    },
  ],
  'display-instance': [
    {
      families: ['DM Sans'],
      weights: [600, 600],
      sizePx: [14, 18],
      lineHeight: [1, 1.5],
      trackingEm: [-0.02, 0],
      transforms: ['none'],
      measurePx: 200,
    },
  ],
};

/** The text the `feature` population holds. */
export const FEATURE_TEXT_SELECTOR = '.home-feature-title, .home-feature-dek';

export const TYPE_POPULATION_SOURCE =
  'lib/brand-v2-global-convergence-evidence.ts#TYPE_POPULATIONS';

/** The rows each verdict family decides, and the predicates each one owns. */
export const ROUTE_ROW_PREDICATES: Readonly<Record<string, readonly ConvergencePredicate[]>> = {
  'VAL-B2-COL-004': ['primary-ink-fill'],
  'VAL-B2-COL-005': ['selection-fill', 'state-non-colour-cue'],
  'VAL-B2-COL-006': ['accent-outside-figure', 'accent-as-warning', 'link-hue', 'retired-paint', 'focus-ring'],
  'VAL-B2-COL-007': ['success-in-grey-or-accent', 'state-non-colour-cue', 'selection-colour-text'],
  'VAL-B2-COL-008': ['text-contrast', 'boundary-contrast'],
  'VAL-B2-COL-009': ['gradient'],
  'VAL-B2-COMP-001': ['primary-ink-fill', 'secondary-quiet', 'action-colour-fill', 'disabled-neutral'],
  'VAL-B2-COMP-006': ['empty-card', 'bento-grid', 'repeated-signature'],
  'VAL-B2-COMP-008': ['citation-language', 'citation-target'],
  'VAL-B2-COMP-016': ['repeated-signature', 'nested-frame', 'frame-depth', 'capsule', 'rounded-corner'],
  'VAL-B2-GRID-003': ['device-under-prose', 'texture', 'text-contrast'],
  'VAL-B2-GRID-004': ['device-exposed'],
  'VAL-B2-GRID-005': ['device-misaligned'],
  'VAL-B2-GRID-006': ['unregistered-device', 'technical-glyph', 'ambient-animation'],
  'VAL-B2-GRID-008': ['rail-colour'],
  'VAL-B2-GRID-010': ['casing-drift'],
  'VAL-B2-SURF-001': ['rounded-corner', 'capsule'],
  'VAL-B2-SURF-002': ['border-weight'],
  'VAL-B2-SURF-003': ['dashed-border'],
  'VAL-B2-SURF-004': ['shadow'],
  'VAL-B2-SURF-005': ['glow'],
  'VAL-B2-SURF-006': ['dark-surface', 'dark-shell'],
  'VAL-B2-SURF-007': ['texture', 'material'],
  'VAL-B2-SURF-008': ['capsule'],
  'VAL-B2-SURF-009': ['nested-frame', 'frame-depth', 'double-rule'],
};

export const FRAME_ROWS = [
  'VAL-B2-SPACE-001',
  'VAL-B2-SPACE-002',
  'VAL-B2-SPACE-003',
  'VAL-B2-SPACE-004',
  'VAL-B2-SPACE-005',
  'VAL-B2-SPACE-006',
  'VAL-B2-GRID-001',
] as const;

export const TYPE_ROW = 'VAL-B2-TYPE-018';

/**
 * `VAL-B2-GRID-007`: one verdict per public route, comparing the route's
 * own readings at the three widths, so it is neither a route-local finding
 * nor a frame-wide one.
 */
export const VIEWPORT_PAIR_ROW = 'VAL-B2-GRID-007';

/**
 * The surfaces `VAL-B2-GRID-002` names, each with the public routes that
 * make it up. The shell is every route; social artwork is the generated
 * Open Graph/X card corpus, read from its own manifest rather than from a
 * browser page.
 */
export const SURFACE_FAMILIES = [
  'home',
  'shell',
  'article',
  'discovery',
  'market-map',
  'playground',
  'social-artwork',
] as const;
export type SurfaceFamily = (typeof SURFACE_FAMILIES)[number];

/**
 * The surfaces `VAL-B2-SURF-011` names as representative: the same list
 * without the shell, which that row does not name.
 */
export const REPRESENTATIVE_SURFACES = SURFACE_FAMILIES.filter(
  (family): family is Exclude<SurfaceFamily, 'shell'> => family !== 'shell',
);

export const SURFACE_FAMILY_POPULATION_SOURCE =
  'lib/brand-v2-global-convergence-evidence.ts#SURFACE_FAMILIES';
export const REPRESENTATIVE_SURFACE_POPULATION_SOURCE =
  'lib/brand-v2-global-convergence-evidence.ts#REPRESENTATIVE_SURFACES';

/** The rows decided per surface family, with the population each is recorded over. */
export const SURFACE_FAMILY_ROWS: Readonly<Record<string, string>> = {
  'VAL-B2-GRID-002': SURFACE_FAMILY_POPULATION_SOURCE,
  'VAL-B2-SURF-011': REPRESENTATIVE_SURFACE_POPULATION_SOURCE,
};

/** The discovery surfaces: the seven domain landings and the three indexes. */
const DISCOVERY_PATHS: readonly string[] = [
  ...DOMAINS.map((domain) => `/${domain}/`),
  '/a-z/',
  '/glossary/',
  '/search/',
];

/** Whether a public route path belongs to a browser-read surface family. */
export function inSurfaceFamily(family: Exclude<SurfaceFamily, 'social-artwork'>, path: string): boolean {
  const segments = path.split('/').filter(Boolean);
  switch (family) {
    case 'home':
      return path === '/';
    case 'shell':
      return true;
    case 'article':
      return segments.length === 2 && (DOMAINS as readonly string[]).includes(segments[0]);
    case 'discovery':
      return DISCOVERY_PATHS.includes(path);
    case 'market-map':
      return path === '/market-map/';
    case 'playground':
      return path === '/playground/';
  }
}

/** The Open Graph manifest the social-artwork member is read from. */
export const SOCIAL_ARTWORK_MANIFEST_PATH = 'evidence/brand-v2/og-cards/manifest.json';

/**
 * The population each row is recorded over: a route row and the viewport
 * pair row per registered public route, a frame row per registered page
 * frame, the type row per sealed type population, and the two surface rows
 * per surface they name. The verdict keys are these members exactly.
 */
export const GLOBAL_CONVERGENCE_ASSERTION_POPULATION_SOURCES: Readonly<Record<string, string>> = {
  ...Object.fromEntries(
    Object.keys(ROUTE_ROW_PREDICATES).map((id) => [id, 'contract/brand-v2-registries.json#routes.public']),
  ),
  ...Object.fromEntries(FRAME_ROWS.map((id) => [id, 'contract/brand-v2-registries.json#pageFrames'])),
  [TYPE_ROW]: TYPE_POPULATION_SOURCE,
  [VIEWPORT_PAIR_ROW]: 'contract/brand-v2-registries.json#routes.public',
  ...SURFACE_FAMILY_ROWS,
};

/** The page counts each route row needs to be non-empty somewhere in the sweep. */
const ROUTE_ROW_POPULATIONS: Readonly<Record<string, readonly string[]>> = {
  'VAL-B2-GRID-003': ['registeredDevices', 'proseRuns'],
  'VAL-B2-GRID-004': ['registeredDevices', 'decorativeLayers'],
  'VAL-B2-GRID-005': ['registeredDevices'],
  'VAL-B2-GRID-006': ['decorativeLayers', 'hiddenTextRuns'],
  'VAL-B2-GRID-008': ['rails'],
  'VAL-B2-GRID-010': ['transformedLabels'],
  'VAL-B2-SURF-001': ['paintedElements'],
  'VAL-B2-SURF-002': ['borderedSides'],
  'VAL-B2-SURF-003': ['borderedSides'],
  'VAL-B2-SURF-004': ['paintedElements'],
  'VAL-B2-SURF-005': ['paintedElements'],
  'VAL-B2-SURF-006': ['paintedElements', 'shellGrounds'],
  'VAL-B2-SURF-007': ['paintedElements', 'materialSurfaces'],
  'VAL-B2-SURF-008': ['paintedElements'],
  'VAL-B2-SURF-009': ['frames', 'borderedSides'],
  'VAL-B2-COL-004': ['primaryActions'],
  'VAL-B2-COL-005': ['persistentStates'],
  'VAL-B2-COL-006': ['links', 'paintedElements'],
  'VAL-B2-COL-007': ['persistentStates'],
  'VAL-B2-COL-008': ['textRuns', 'fields'],
  'VAL-B2-COL-009': ['paintedElements'],
  'VAL-B2-COMP-001': ['primaryActions', 'secondaryActions', 'disabledActions'],
  'VAL-B2-COMP-006': ['frames', 'cards'],
  'VAL-B2-COMP-008': ['citationMarks', 'citationLabels'],
  'VAL-B2-COMP-016': ['frames', 'cards'],
};

/**
 * `VAL-B2-GRID-001` successor: a major block sits within 4 px of a line of
 * the frame that owns the page (the 4 px fine alignment the row seals).
 */
export const COMPOSITION_TOLERANCE_PX = 4;

/** The registry rows the sweep reads devices and materials against. */
export type ConvergenceRegistry = {
  gridDevices: ReadonlyArray<{ id: string; alignmentTolerancePx: number }>;
  materials: ReadonlyArray<{ id: string }>;
};

export const CONVERGENCE_REGISTRY_PATH = 'contract/brand-v2-registries.json';

/** The device and material rows of the checked-in registry. */
export function readConvergenceRegistry(root: string): ConvergenceRegistry {
  const registry = JSON.parse(readFileSync(join(root, CONVERGENCE_REGISTRY_PATH), 'utf8')) as ConvergenceRegistry;
  if (!Array.isArray(registry.gridDevices) || registry.gridDevices.length === 0) {
    throw new Error(`${CONVERGENCE_REGISTRY_PATH} registers no grid devices`);
  }
  if (!Array.isArray(registry.materials) || registry.materials.length === 0) {
    throw new Error(`${CONVERGENCE_REGISTRY_PATH} registers no materials`);
  }
  return registry;
}

function registryFacts(registry: ConvergenceRegistry): string {
  return JSON.stringify({
    devices: registry.gridDevices.map(({ id, alignmentTolerancePx }) => [id, alignmentTolerancePx]),
    materials: registry.materials.map(({ id }) => id),
  });
}

/** The sweep's collector input, derived from the constants above and the registry. */
export function collectorInput(frame: ConvergenceFrameId, registry: ConvergenceRegistry) {
  const viewport = GLOBAL_CONVERGENCE_VIEWPORTS.find((candidate) => candidate.frame === frame);
  if (!viewport) throw new Error(`${frame} is not a swept page frame`);
  return {
    registeredDevices: registry.gridDevices.map(({ id, alignmentTolerancePx }) => ({
      id,
      tolerancePx: alignmentTolerancePx,
    })),
    materialIds: registry.materials.map(({ id }) => id),
    caseSensitivePattern: CASE_SENSITIVE_PATTERN_SOURCE,
    identityStrings: [PUBLIC_IDENTITY],
    compositionTolerancePx: COMPOSITION_TOLERANCE_PX,
    materialContrastFloor: MATERIAL_TEXT_CONTRAST_FLOOR,
    minimumInlinePaddingPx: viewport.minimumInlinePaddingPx,
    exemptions: CONVERGENCE_EXEMPTIONS.map(({ id, selector, predicates, properties, valuesPx }) => ({
      id,
      selector,
      predicates: [...predicates],
      ...(properties ? { properties: [...properties] } : {}),
      ...(valuesPx ? { valuesPx: [...valuesPx] } : {}),
    })),
    figureSelector: FIGURE_SELECTOR,
    featureSelector: FEATURE_TEXT_SELECTOR,
    frameOwners: FRAME_OWNERS.map(({ id, selector }) => ({ id, selector })),
    ladderPx: [...SPACING_LADDER_PX],
  };
}

/**
 * The fingerprint the sweep records and the generator re-derives: every
 * module a public route reaches, the shipped model no module imports, this
 * sweep (which imports this file and the collector), and the swept routes.
 */
export function globalConvergenceEvidenceFingerprint(input: {
  root: string;
  routeIds: readonly string[];
}): string {
  // The sweep reads devices and materials against the registry, so a
  // registry row that moved has to stale it.
  const registry = readConvergenceRegistry(input.root);
  return deriveEvidenceClosure({
    root: input.root,
    entries: [...routeEntryModules(evidenceClosureGraph(input.root)), GLOBAL_CONVERGENCE_SWEEP_MODULE],
    nonImportClasses: [SHIPPED_GEOMETRY_MODEL_CLASS],
    facts: [[...input.routeIds].sort().join(','), registryFacts(registry)],
    computedSpecifiers: [ARTICLE_BODY_COMPUTED_IMPORT],
  }).fingerprint;
}

const findingSchema = z.object({
  predicate: z.string(),
  element: z.string(),
  detail: z.string(),
  exemption: z.string().nullable(),
});
const typeTupleSchema = z.object({
  population: z.string(),
  family: z.string(),
  weight: z.number(),
  sizePx: z.number(),
  lineHeightRatio: z.number(),
  trackingEm: z.number(),
  transform: z.string(),
  parentSizeRatio: z.number(),
  maxLineWidthPx: z.number(),
  count: z.number(),
  element: z.string(),
  text: z.string(),
  exemption: z.string().nullable(),
});
const spacingValueSchema = z.object({
  valuePx: z.number(),
  property: z.string(),
  count: z.number(),
  element: z.string(),
  exemption: z.string().nullable(),
});
const measuredBoxSchema = z.object({
  element: z.string(),
  exemption: z.string().nullable(),
});
const pageSchema = z.object({
  counts: z.record(z.string(), z.number()),
  findings: z.array(findingSchema),
  typeTuples: z.array(typeTupleSchema),
  spacingTokens: z.array(z.object({ name: z.string(), valuePx: z.number() })),
  offLadderSpacing: z.array(spacingValueSchema),
  frame: z.object({
    owners: z.array(z.string()),
    wideFrameWidthPx: z.number().nullable(),
    readingColumnWidthPx: z.number().nullable(),
    frameContentWidthPx: z.number().nullable(),
    frameCh: z.number().nullable(),
    widestParagraphPx: z.number(),
  }),
  sectionGaps: z.array(measuredBoxSchema.extend({ gapPx: z.number() })),
  componentInteriors: z.array(measuredBoxSchema.extend({ paddingPx: z.array(z.number()) })),
  controlGaps: z.array(measuredBoxSchema.extend({ gapPx: z.number() })),
  content: z.object({ strings: z.number(), digest: z.string().regex(/^[0-9a-f]{8}$/) }),
});
const focusStopSchema = z.object({
  element: z.string(),
  outlineStyle: z.string(),
  outlineWidthPx: z.number(),
  outlineColour: z.string(),
  outlineOffsetPx: z.number(),
  obscuredBy: z.string().nullable(),
  exemption: z.string().nullable(),
  offsetExemption: z.string().nullable(),
});
const observationSchema = z.object({
  routeId: z.string(),
  route: z.string(),
  viewport: z.string(),
  status: z.number(),
  page: pageSchema,
  focus: z.array(focusStopSchema.nullable()),
});

export const globalConvergenceEvidenceSchema = z.object({
  version: z.literal(GLOBAL_CONVERGENCE_VERSION),
  fingerprint: z.string(),
  viewports: z.array(z.string()),
  routeIds: z.array(z.string()),
  observations: z.array(observationSchema),
});

export type GlobalConvergenceEvidence = z.infer<typeof globalConvergenceEvidenceSchema>;
export type GlobalConvergenceObservation = z.infer<typeof observationSchema>;
export type ConvergenceTypeTuple = z.infer<typeof typeTupleSchema>;

/** One member's reading, and every way it failed the requirement. */
export type Verdict<Observed = unknown> = {
  id: string;
  observed: Observed;
  failures: string[];
};

const EXEMPTION_BY_ID = new Map(CONVERGENCE_EXEMPTIONS.map((exemption) => [exemption.id, exemption]));

function frameOf(viewport: string): ConvergenceFrameId {
  const match = GLOBAL_CONVERGENCE_VIEWPORTS.find(({ id }) => id === viewport);
  if (!match) throw new Error(`global convergence evidence names an unswept viewport ${viewport}`);
  return match.frame;
}

/**
 * Every use of an exemption the sweep recorded, by the predicate it was used
 * for. The reader refuses each use the register does not grant.
 */
function* exemptionUses(observation: GlobalConvergenceObservation): Generator<{
  id: string;
  predicate: string;
  property?: string;
  valuePx?: number;
  where: string;
}> {
  const page = observation.page;
  for (const finding of page.findings) {
    if (finding.exemption) yield { id: finding.exemption, predicate: finding.predicate, where: finding.element };
  }
  for (const tuple of page.typeTuples) {
    if (tuple.exemption) yield { id: tuple.exemption, predicate: 'type-range', where: tuple.element };
  }
  for (const value of page.offLadderSpacing) {
    if (value.exemption) {
      yield {
        id: value.exemption,
        predicate: 'spacing-ladder',
        property: value.property,
        valuePx: value.valuePx,
        where: value.element,
      };
    }
  }
  for (const gap of page.sectionGaps) {
    if (gap.exemption) yield { id: gap.exemption, predicate: 'section-separation', where: gap.element };
  }
  for (const box of page.componentInteriors) {
    if (box.exemption) yield { id: box.exemption, predicate: 'component-interior', where: box.element };
  }
  for (const gap of page.controlGaps) {
    if (gap.exemption) yield { id: gap.exemption, predicate: 'control-gap', where: gap.element };
  }
  for (const stop of observation.focus) {
    if (stop?.exemption) yield { id: stop.exemption, predicate: 'focus-ring', where: stop.element };
    if (stop?.offsetExemption) {
      yield { id: stop.offsetExemption, predicate: 'focus-offset', where: stop.element };
    }
  }
}

/** The page counts the reader requires somewhere in the sweep. */
const REQUIRED_COUNTS = [
  ...new Set([
    ...Object.values(ROUTE_ROW_POPULATIONS).flat(),
    'spacingValues',
    'insetTextRuns',
    'collisionTextBoxes',
    'headings',
    'sectionHeads',
    'paragraphs',
    'compositionBlocks',
    'alignedDevices',
  ]),
];

/**
 * Accepts the persisted sweep only when it is the sweep this tree needs:
 * current version and fingerprint, the three page-frame widths, exactly the
 * registered public routes in both directions, one observation per route and
 * width, a served non-empty page with its full keyboard trace behind every
 * one, an exemption only where the register grants it (predicate, route,
 * property, value) with every registered clause used, and every population
 * non-empty. Anything else throws.
 */
export function readGlobalConvergenceEvidence(input: {
  artifact: unknown;
  fingerprint: string;
  routeIds: readonly string[];
}): GlobalConvergenceEvidence {
  const envelope = input.artifact;
  if (!envelope || typeof envelope !== 'object') {
    throw new Error('global convergence evidence is not an object');
  }
  const { version, fingerprint } = envelope as { version?: unknown; fingerprint?: unknown };
  if (version !== GLOBAL_CONVERGENCE_VERSION) {
    throw new Error(`global convergence evidence version ${String(version)} is not ${GLOBAL_CONVERGENCE_VERSION}`);
  }
  if (fingerprint !== input.fingerprint) {
    throw new Error(
      'global convergence evidence is stale: a route, a shared primitive, the register or a sealed threshold changed since the sweep ran. Re-run npm run refresh:brand-v2-evidence.',
    );
  }
  const artifact = parseEvidenceArtifact(globalConvergenceEvidenceSchema, envelope, 'global convergence evidence');

  const expectedRoutes = [...input.routeIds].sort();
  if (expectedRoutes.length === 0) {
    throw new Error('the public route population is empty, so every global verdict would pass vacuously');
  }
  const recordedRoutes = [...artifact.routeIds].sort();
  const dropped = expectedRoutes.filter((id) => !recordedRoutes.includes(id));
  const extra = recordedRoutes.filter((id) => !expectedRoutes.includes(id));
  if (dropped.length > 0 || extra.length > 0 || recordedRoutes.length !== expectedRoutes.length) {
    throw new Error(
      `global convergence evidence covers ${recordedRoutes.length} routes, not the ${expectedRoutes.length} registered public routes (dropped: ${dropped.join(', ') || 'none'}; extra: ${extra.join(', ') || 'none'})`,
    );
  }
  const expectedViewports = GLOBAL_CONVERGENCE_VIEWPORTS.map(({ id }) => id);
  if (JSON.stringify([...artifact.viewports].sort()) !== JSON.stringify([...expectedViewports].sort())) {
    throw new Error(
      `global convergence evidence was swept at ${artifact.viewports.join(', ')}, not ${expectedViewports.join(', ')}`,
    );
  }

  const seen = new Set<string>();
  const used = new Set<string>();
  for (const observation of artifact.observations) {
    const key = `${observation.routeId}|${observation.viewport}`;
    if (seen.has(key)) throw new Error(`global convergence evidence records ${key} twice`);
    seen.add(key);
    if (!expectedRoutes.includes(observation.routeId)) {
      throw new Error(`global convergence evidence records ${observation.routeId}, which is not a registered public route`);
    }
    if (!expectedViewports.includes(observation.viewport as (typeof expectedViewports)[number])) {
      throw new Error(`global convergence evidence records ${key} at an unswept viewport`);
    }
    if (observation.status !== 200) {
      throw new Error(`global convergence evidence records ${key} served with status ${observation.status}`);
    }
    if ((observation.page.counts.paintedElements ?? 0) === 0 || (observation.page.counts.textRuns ?? 0) === 0) {
      throw new Error(`global convergence evidence records an empty page at ${key}: a blank render decides nothing`);
    }
    if (observation.focus.length !== FOCUS_TAB_STOPS || observation.focus.every((stop) => stop === null)) {
      throw new Error(
        `global convergence evidence records ${observation.focus.length} keyboard stop(s) at ${key}, not a ${FOCUS_TAB_STOPS}-stop trace that reached anything`,
      );
    }
    for (const use of exemptionUses(observation)) {
      const registered = EXEMPTION_BY_ID.get(use.id);
      if (!registered) {
        throw new Error(`${key}: ${use.where} claims exemption "${use.id}", which the register does not hold`);
      }
      if (!registered.predicates.includes(use.predicate as ConvergencePredicate)) {
        throw new Error(`${key}: exemption "${use.id}" is not registered for ${use.predicate} (${use.where})`);
      }
      if (registered.routes && !registered.routes.includes(observation.routeId)) {
        throw new Error(`${key}: exemption "${use.id}" is not registered for ${observation.routeId} (${use.where})`);
      }
      if (use.property && registered.properties && !registered.properties.includes(use.property)) {
        throw new Error(`${key}: exemption "${use.id}" does not cover ${use.property} (${use.where})`);
      }
      if (use.valuePx !== undefined && registered.valuesPx && !registered.valuesPx.includes(use.valuePx)) {
        throw new Error(`${key}: exemption "${use.id}" does not cover ${use.valuePx}px (${use.where})`);
      }
      used.add(`${use.id}|predicate:${use.predicate}`);
      used.add(`${use.id}|route:${observation.routeId}`);
      if (use.valuePx !== undefined) used.add(`${use.id}|value:${use.valuePx}`);
    }
  }
  const missing = expectedRoutes
    .flatMap((routeId) => expectedViewports.map((viewport) => `${routeId}|${viewport}`))
    .filter((key) => !seen.has(key));
  if (missing.length > 0) {
    throw new Error(
      `global convergence evidence is missing ${missing.length} route/viewport reading(s), starting with ${missing[0]}`,
    );
  }

  for (const exemption of CONVERGENCE_EXEMPTIONS) {
    const clauses = [
      ...exemption.predicates.map((predicate) => `predicate:${predicate}`),
      ...(exemption.routes ?? []).map((route) => `route:${route}`),
      ...(exemption.valuesPx ?? []).map((value) => `value:${value}`),
    ];
    const unused = clauses.filter((clause) => !used.has(`${exemption.id}|${clause}`));
    if (unused.length > 0) {
      throw new Error(
        `exemption "${exemption.id}" registers ${unused.join(', ')}, which the sweep never needed: narrow the register`,
      );
    }
  }

  for (const count of REQUIRED_COUNTS) {
    if (artifact.observations.every(({ page }) => (page.counts[count] ?? 0) === 0)) {
      throw new Error(`the sweep found no ${count} anywhere, so the verdicts over it would pass vacuously`);
    }
  }
  for (const population of Object.keys(TYPE_POPULATIONS)) {
    if (artifact.observations.every(({ page }) => page.typeTuples.every((tuple) => tuple.population !== population))) {
      throw new Error(`the ${population} type population is empty, so its verdict would pass vacuously`);
    }
  }
  for (const [label, pick] of [
    ['section-separation', (page: GlobalConvergenceObservation['page']) => page.sectionGaps.length],
    ['component-interior', (page: GlobalConvergenceObservation['page']) => page.componentInteriors.length],
    ['control-gap', (page: GlobalConvergenceObservation['page']) => page.controlGaps.length],
    ['spacing-token', (page: GlobalConvergenceObservation['page']) => page.spacingTokens.length],
  ] as const) {
    for (const viewport of expectedViewports) {
      if (artifact.observations.filter((o) => o.viewport === viewport).every(({ page }) => pick(page) === 0)) {
        throw new Error(`the ${label} population is empty at ${viewport}, so its verdict would pass vacuously`);
      }
    }
  }
  return artifact;
}

function observationsByRoute(evidence: GlobalConvergenceEvidence) {
  const byRoute = new Map<string, GlobalConvergenceObservation[]>();
  for (const observation of evidence.observations) {
    const list = byRoute.get(observation.routeId) ?? [];
    list.push(observation);
    byRoute.set(observation.routeId, list);
  }
  return byRoute;
}

const INK_RING = /^rgba?\(28, 28, 26(, 1)?\)$/;

/** The keyboard ring the research-page standard sets: 1 px solid ink, 2 px out. */
export const FOCUS_RING = { style: 'solid', widthPx: 1, offsetPx: 2 } as const;

/** A focus stop's failures against the ink keyboard ring (`VAL-B2-COL-006`). */
function focusRingFailures(observation: GlobalConvergenceObservation): string[] {
  const failures: string[] = [];
  for (const stop of observation.focus) {
    if (!stop || stop.exemption) continue;
    if (stop.outlineStyle === 'none' || stop.outlineWidthPx < 1) {
      failures.push(`${observation.viewport}: ${stop.element} shows no keyboard ring`);
      continue;
    }
    if (!INK_RING.test(stop.outlineColour)) {
      failures.push(`${observation.viewport}: ${stop.element} draws its ring in ${stop.outlineColour}, not ink`);
    }
    if (stop.outlineStyle !== FOCUS_RING.style || stop.outlineWidthPx !== FOCUS_RING.widthPx) {
      failures.push(
        `${observation.viewport}: ${stop.element} draws a ${stop.outlineWidthPx}px ${stop.outlineStyle} ring, not ${FOCUS_RING.widthPx}px ${FOCUS_RING.style}`,
      );
    }
    if (stop.outlineOffsetPx !== FOCUS_RING.offsetPx && !stop.offsetExemption) {
      failures.push(
        `${observation.viewport}: ${stop.element} offsets its ring ${stop.outlineOffsetPx}px, not ${FOCUS_RING.offsetPx}px`,
      );
    }
  }
  return failures;
}

/**
 * The colour and component rows, one verdict per registered public route
 * over its three widths: every unexempted finding the row's predicates own
 * is a failure.
 */
export function routeRowVerdicts(
  evidence: GlobalConvergenceEvidence,
  assertionId: string,
): Map<string, Verdict> {
  const predicates = ROUTE_ROW_PREDICATES[assertionId];
  if (!predicates) throw new Error(`${assertionId} is not a route row of the global convergence sweep`);
  const counts = ROUTE_ROW_POPULATIONS[assertionId];
  const verdicts = new Map<string, Verdict>();
  for (const [routeId, observations] of observationsByRoute(evidence)) {
    const failures: string[] = [];
    const observed: Record<string, number> = {};
    for (const observation of observations) {
      for (const finding of observation.page.findings) {
        if (!predicates.includes(finding.predicate as ConvergencePredicate)) continue;
        if (finding.exemption) {
          const key = `exempted:${finding.exemption}`;
          observed[key] = (observed[key] ?? 0) + 1;
          continue;
        }
        failures.push(`${observation.viewport}: ${finding.predicate} on ${finding.element}: ${finding.detail}`);
      }
      if (predicates.includes('focus-ring')) {
        failures.push(...focusRingFailures(observation));
        observed.focusStops = (observed.focusStops ?? 0) + observation.focus.filter(Boolean).length;
        for (const stop of observation.focus) {
          for (const exemption of [stop?.exemption, stop?.offsetExemption]) {
            if (!exemption) continue;
            const key = `exempted:${exemption}`;
            observed[key] = (observed[key] ?? 0) + 1;
          }
        }
      }
      for (const count of counts) {
        observed[count] = (observed[count] ?? 0) + (observation.page.counts[count] ?? 0);
      }
    }
    observed.viewports = observations.length;
    verdicts.set(routeId, { id: routeId, observed, failures });
  }
  if (verdicts.size === 0) throw new Error(`the ${assertionId} route population is empty`);
  return verdicts;
}

const within = (value: number, [low, high]: readonly [number, number], tolerance = 0) =>
  value >= low - tolerance && value <= high + tolerance;

function spacingFailures(observation: GlobalConvergenceObservation): string[] {
  const failures: string[] = [];
  const tokens = [...observation.page.spacingTokens].sort((a, b) => a.valuePx - b.valuePx);
  const expectedTokens = SPACING_LADDER_PX.map((value) => `--space-${value}=${value}`);
  const actualTokens = tokens.map(({ name, valuePx }) => `${name}=${valuePx}`);
  if (JSON.stringify(actualTokens) !== JSON.stringify(expectedTokens)) {
    failures.push(`${observation.route}: the spacing tokens are [${actualTokens.join(', ')}], not the ladder`);
  }
  for (const value of observation.page.offLadderSpacing) {
    if (value.exemption) continue;
    if ((SPACING_HALF_STEPS_PX as readonly number[]).includes(value.valuePx)) continue;
    failures.push(
      `${observation.route}: ${value.property} ${value.valuePx}px on ${value.element} (${value.count}x) is off the ladder and unregistered`,
    );
  }
  return failures;
}

function separationFailures(observation: GlobalConvergenceObservation): string[] {
  const failures: string[] = [];
  const range = SECTION_SEPARATION_PX[frameOf(observation.viewport)];
  for (const gap of observation.page.sectionGaps) {
    if (gap.exemption || within(gap.gapPx, range, LAYOUT_TOLERANCE_PX)) continue;
    failures.push(`${observation.route}: ${gap.element} opens ${gap.gapPx}px under the last block, outside ${range[0]}-${range[1]}px`);
  }
  for (const box of observation.page.componentInteriors) {
    if (box.exemption) continue;
    const off = box.paddingPx.filter((value) => !within(value, COMPONENT_INTERIOR_PX, LAYOUT_TOLERANCE_PX));
    if (off.length > 0) {
      failures.push(`${observation.route}: ${box.element} pads [${box.paddingPx.join(', ')}]px, outside ${COMPONENT_INTERIOR_PX.join('-')}px`);
    }
  }
  for (const gap of observation.page.controlGaps) {
    if (gap.exemption || within(gap.gapPx, CONTROL_GAP_PX, LAYOUT_TOLERANCE_PX)) continue;
    failures.push(`${observation.route}: ${gap.element} sits ${gap.gapPx}px from its neighbour, outside ${CONTROL_GAP_PX.join('-')}px`);
  }
  return failures;
}

function frameGeometryFailures(observation: GlobalConvergenceObservation): string[] {
  const failures: string[] = [];
  const frame = observation.page.frame;
  const owner = FRAME_OWNERS.find(({ id }) => id === frame.owners[0]);
  if (frame.widestParagraphPx > DESKTOP_FRAME_GEOMETRY.innerRailMaxPx + LAYOUT_TOLERANCE_PX) {
    failures.push(`${observation.route}: a paragraph runs ${frame.widestParagraphPx}px wide, past the ${DESKTOP_FRAME_GEOMETRY.innerRailMaxPx}px rail`);
  }
  if (!owner || frameOf(observation.viewport) !== 'frame:desktop') return failures;
  if (owner.kind === 'editorial') {
    if (frame.wideFrameWidthPx === null || !within(frame.wideFrameWidthPx, DESKTOP_FRAME_GEOMETRY.wideEditorialFramePx)) {
      failures.push(`${observation.route}: the wide editorial frame is ${frame.wideFrameWidthPx}px, outside ${DESKTOP_FRAME_GEOMETRY.wideEditorialFramePx.join('-')}px`);
    }
    if (frame.readingColumnWidthPx === null || !within(frame.readingColumnWidthPx, DESKTOP_FRAME_GEOMETRY.readingColumnPx)) {
      failures.push(`${observation.route}: the reading column is ${frame.readingColumnWidthPx}px, outside ${DESKTOP_FRAME_GEOMETRY.readingColumnPx.join('-')}px`);
    }
  } else if (owner.kind === 'sheet') {
    if (frame.frameContentWidthPx === null || !within(frame.frameContentWidthPx, DESKTOP_FRAME_GEOMETRY.sheetColumnPx)) {
      failures.push(`${observation.route}: the sheet column is ${frame.frameContentWidthPx}px, outside ${DESKTOP_FRAME_GEOMETRY.sheetColumnPx.join('-')}px`);
    }
  } else if (owner.kind === 'narrow') {
    const measure = frame.frameContentWidthPx !== null && frame.frameCh ? frame.frameContentWidthPx / frame.frameCh : null;
    if (measure === null || !within(measure, DESKTOP_FRAME_GEOMETRY.narrowMeasureCh)) {
      failures.push(`${observation.route}: the narrow frame measures ${measure?.toFixed(1)}ch, outside ${DESKTOP_FRAME_GEOMETRY.narrowMeasureCh.join('-')}ch`);
    }
  }
  return failures;
}

function ownershipFailures(observation: GlobalConvergenceObservation): string[] {
  const owners = observation.page.frame.owners;
  if (owners.length === 0) return [`${observation.route}: no registered page frame owns the h1`];
  if (!FRAME_OWNERS.some(({ id }) => id === owners[0])) {
    return [`${observation.route}: the h1 sits in ${owners[0]}, which the frame register does not hold`];
  }
  return [];
}

function findingFailures(observation: GlobalConvergenceObservation, predicates: readonly string[]): string[] {
  return observation.page.findings
    .filter((finding) => !finding.exemption && predicates.includes(finding.predicate))
    .map((finding) => `${observation.route}: ${finding.predicate} on ${finding.element}: ${finding.detail}`);
}

function obscuredFocusFailures(observation: GlobalConvergenceObservation): string[] {
  return observation.focus
    .filter((stop) => stop && !stop.exemption && stop.obscuredBy)
    .map((stop) => `${observation.route}: focused ${stop!.element} is covered by ${stop!.obscuredBy}`);
}

/**
 * The spacing and frame rows, one verdict per registered page frame over
 * every public route at that frame's width.
 */
export function frameRowVerdicts(
  evidence: GlobalConvergenceEvidence,
  assertionId: (typeof FRAME_ROWS)[number],
): Map<string, Verdict> {
  const verdicts = new Map<string, Verdict>();
  for (const viewport of GLOBAL_CONVERGENCE_VIEWPORTS) {
    const observations = evidence.observations.filter((observation) => observation.viewport === viewport.id);
    const failures: string[] = [];
    const observed: Record<string, number | string> = { viewport: viewport.id, routes: observations.length };
    for (const observation of observations) {
      if (assertionId === 'VAL-B2-SPACE-001') failures.push(...spacingFailures(observation));
      if (assertionId === 'VAL-B2-SPACE-002') failures.push(...findingFailures(observation, ['inline-padding']));
      if (assertionId === 'VAL-B2-SPACE-003') failures.push(...separationFailures(observation));
      if (assertionId === 'VAL-B2-SPACE-004') failures.push(...frameGeometryFailures(observation));
      if (assertionId === 'VAL-B2-SPACE-005') {
        failures.push(
          ...ownershipFailures(observation),
          ...spacingFailures(observation),
          ...findingFailures(observation, ['text-collision']),
        );
      }
      if (assertionId === 'VAL-B2-SPACE-006') {
        failures.push(
          ...findingFailures(observation, ['text-collision', 'clipped-text', 'broken-word']),
          ...obscuredFocusFailures(observation),
        );
      }
      // The research-page successor: every major block on a line of the
      // frame that owns the page, and the 8 px base rhythm is the ladder.
      if (assertionId === 'VAL-B2-GRID-001') {
        failures.push(
          ...findingFailures(observation, ['composition-offgrid']),
          ...spacingFailures(observation),
        );
      }
      const page = observation.page;
      const add = (key: string, by: number) => {
        observed[key] = Number(observed[key] ?? 0) + by;
      };
      add('compositionBlocks', page.counts.compositionBlocks ?? 0);
      add(
        'exemptedCompositionBlocks',
        page.findings.filter(({ predicate, exemption }) => predicate === 'composition-offgrid' && exemption).length,
      );
      add('spacingValues', page.counts.spacingValues ?? 0);
      add('insetTextRuns', page.counts.insetTextRuns ?? 0);
      add('sectionGaps', page.sectionGaps.length);
      add('componentInteriors', page.componentInteriors.length);
      add('controlGaps', page.controlGaps.length);
      add('collisionTextBoxes', page.counts.collisionTextBoxes ?? 0);
      add('focusStops', observation.focus.filter(Boolean).length);
      add('exemptedSpacingValues', page.offLadderSpacing.filter(({ exemption }) => exemption).length);
      add('exemptedSectionGaps', page.sectionGaps.filter(({ exemption }) => exemption).length);
      add(
        'exemptedInsetFindings',
        page.findings.filter(({ predicate, exemption }) => predicate === 'inline-padding' && exemption).length,
      );
    }
    verdicts.set(viewport.frame, { id: viewport.frame, observed, failures });
  }
  return verdicts;
}

function formFailure(tuple: ConvergenceTypeTuple, form: Form, frame: ConvergenceFrameId): string | null {
  const size = Array.isArray(form.sizePx)
    ? (form.sizePx as readonly [number, number])
    : (form.sizePx as Record<ConvergenceFrameId, readonly [number, number]>)[frame];
  if (!form.families.includes(tuple.family)) return `family ${tuple.family}`;
  if (!within(tuple.weight, form.weights)) return `weight ${tuple.weight}`;
  if (form.parentSizeRatio) {
    if (!within(tuple.parentSizeRatio, form.parentSizeRatio)) return `size ratio ${tuple.parentSizeRatio}`;
  }
  if (!within(tuple.sizePx, size, 0.01)) return `size ${tuple.sizePx}px`;
  if (!within(tuple.lineHeightRatio, form.lineHeight, 0.005)) return `line height ${tuple.lineHeightRatio}`;
  if (!within(tuple.trackingEm, form.trackingEm, 0.001)) return `tracking ${tuple.trackingEm}em`;
  if (!form.transforms.includes(tuple.transform)) return `transform ${tuple.transform}`;
  if (tuple.maxLineWidthPx > form.measurePx + LAYOUT_TOLERANCE_PX) return `measure ${tuple.maxLineWidthPx}px`;
  return null;
}

/**
 * `VAL-B2-TYPE-018`: one verdict per type population, over every route at
 * every width. A tuple outside every sealed form of its population fails.
 */
export function typePopulationVerdicts(evidence: GlobalConvergenceEvidence): Map<string, Verdict> {
  const verdicts = new Map<string, Verdict>();
  for (const [population, forms] of Object.entries(TYPE_POPULATIONS)) {
    const failures: string[] = [];
    let elements = 0;
    let exempted = 0;
    const tuples = new Set<string>();
    for (const observation of evidence.observations) {
      const frame = frameOf(observation.viewport);
      for (const tuple of observation.page.typeTuples) {
        if (tuple.population !== population) continue;
        elements += tuple.count;
        tuples.add(`${tuple.family} ${tuple.weight} ${tuple.sizePx}/${tuple.lineHeightRatio}`);
        if (tuple.exemption) {
          exempted += tuple.count;
          continue;
        }
        const misses = forms.map((form) => formFailure(tuple, form, frame));
        if (misses.every((miss) => miss !== null)) {
          failures.push(
            `${observation.route} ${observation.viewport}: ${tuple.element} "${tuple.text}" (${tuple.family} ${tuple.weight} ${tuple.sizePx}px/${tuple.lineHeightRatio}, ${tuple.trackingEm}em, ${tuple.transform}, ${tuple.maxLineWidthPx}px line) is outside the sealed ${population} range: ${misses.join(' / ')}`,
          );
        }
      }
    }
    if (elements === 0) {
      failures.push(`the ${population} population is empty`);
    }
    verdicts.set(population, {
      id: population,
      observed: { elements, forms: tuples.size, exempted },
      failures,
    });
  }
  return verdicts;
}

/**
 * `VAL-B2-GRID-007`: one verdict per public route. The phone and tablet
 * readings may carry no more registered devices than the desktop reading,
 * and every width has to reach the same content.
 */
export function viewportPairVerdicts(evidence: GlobalConvergenceEvidence): Map<string, Verdict> {
  const verdicts = new Map<string, Verdict>();
  const desktop = GLOBAL_CONVERGENCE_VIEWPORTS.find(({ frame }) => frame === 'frame:desktop')!.id;
  for (const [routeId, observations] of observationsByRoute(evidence)) {
    const failures: string[] = [];
    const wide = observations.find(({ viewport }) => viewport === desktop);
    const observed: Record<string, number | string> = {};
    if (!wide) {
      failures.push(`no ${desktop} reading to compare the narrower widths against`);
    } else {
      const wideDevices = wide.page.counts.registeredDevices ?? 0;
      observed[`devices@${desktop}`] = wideDevices;
      observed.contentStrings = wide.page.content.strings;
      for (const observation of observations) {
        if (observation === wide) continue;
        const devices = observation.page.counts.registeredDevices ?? 0;
        observed[`devices@${observation.viewport}`] = devices;
        if (devices > wideDevices) {
          failures.push(`${observation.viewport} shows ${devices} registered devices, more than the ${wideDevices} at ${desktop}`);
        }
        if (observation.page.content.digest !== wide.page.content.digest) {
          failures.push(
            `${observation.viewport} reaches ${observation.page.content.strings} distinct strings (digest ${observation.page.content.digest}), not the ${wide.page.content.strings} (digest ${wide.page.content.digest}) at ${desktop}`,
          );
        }
      }
    }
    observed.viewports = observations.length;
    if (observations.length !== GLOBAL_CONVERGENCE_VIEWPORTS.length) {
      failures.push(`read at ${observations.length} widths, not ${GLOBAL_CONVERGENCE_VIEWPORTS.length}`);
    }
    verdicts.set(routeId, { id: routeId, observed, failures });
  }
  if (verdicts.size === 0) throw new Error(`the ${VIEWPORT_PAIR_ROW} route population is empty`);
  return verdicts;
}

const socialCardSchema = z.object({
  cardId: z.string(),
  devices: z.array(z.string()),
  paintedTokens: z.array(z.string()),
  asset: z.object({ sha256: z.string() }),
  pixels: z.object({
    secondRenderSha256: z.string(),
    offPalettePixels: z.number(),
    translucentPixels: z.number(),
    anchorsFailed: z.array(z.unknown()),
  }),
});
const socialManifestSchema = z.object({
  cards: z.array(socialCardSchema),
  styleTokens: z.array(z.object({ token: z.string() })),
  fonts: z.array(z.object({ faceId: z.string(), sha256: z.string(), registeredSha256: z.string() })),
});

/** The generated card corpus, as the social-artwork member reads it. */
export type SocialArtwork = z.infer<typeof socialManifestSchema> & {
  registeredDeviceIds: readonly string[];
};

/**
 * Reads the Open Graph manifest for the social-artwork member. The manifest's
 * own freshness and pixel truth are the Open Graph rows' reader's to decide;
 * this reads only what the two family rows need, and refuses an empty corpus.
 */
export function readSocialArtwork(manifest: unknown, registry: ConvergenceRegistry): SocialArtwork {
  const parsed = parseEvidenceArtifact(socialManifestSchema, manifest, 'Open Graph card manifest');
  if (parsed.cards.length === 0) {
    throw new Error('the Open Graph card corpus is empty, so the social-artwork member would pass vacuously');
  }
  return { ...parsed, registeredDeviceIds: registry.gridDevices.map(({ id }) => id) };
}

/** Each social card's failures against the shared-treatment and material rows. */
function socialArtworkFailures(social: SocialArtwork, assertionId: string): string[] {
  const failures: string[] = [];
  const tokens = new Set(social.styleTokens.map(({ token }) => token));
  for (const card of social.cards) {
    if (assertionId === 'VAL-B2-GRID-002') {
      if (card.devices.length === 0) failures.push(`${card.cardId} carries no registered device`);
      for (const device of card.devices) {
        const id = device.split('#')[0];
        if (!social.registeredDeviceIds.includes(id)) {
          failures.push(`${card.cardId} draws ${device}, which is not a registered grid device`);
        }
      }
      continue;
    }
    if (card.pixels.secondRenderSha256 !== card.asset.sha256) {
      failures.push(`${card.cardId} renders differently the second time: not deterministic`);
    }
    if (card.pixels.offPalettePixels > 0 || card.pixels.translucentPixels > 0) {
      failures.push(
        `${card.cardId} paints ${card.pixels.offPalettePixels} off-palette and ${card.pixels.translucentPixels} translucent pixels: a texture or wash the tokens do not name`,
      );
    }
    if (card.pixels.anchorsFailed.length > 0) {
      failures.push(`${card.cardId} fails ${card.pixels.anchorsFailed.length} contrast/colour anchor(s)`);
    }
    for (const token of card.paintedTokens) {
      if (!tokens.has(token)) failures.push(`${card.cardId} paints ${token}, which no style token declares`);
    }
  }
  if (assertionId === 'VAL-B2-SURF-011') {
    for (const font of social.fonts) {
      if (font.sha256 !== font.registeredSha256) {
        failures.push(`${font.faceId} is not the registered binary: its provenance record does not hold`);
      }
    }
  }
  return failures;
}

/**
 * `VAL-B2-GRID-002` and `VAL-B2-SURF-011`: one verdict per named surface.
 * A browser-read surface passes when every route that makes it up carries,
 * at every width, a registered, aligned, pointer-inert device (`GRID-002`)
 * or a declared, deterministic, contrast-safe material surface clear of
 * prose with no texture or material finding (`SURF-011`). Social artwork is
 * read off the generated card corpus.
 */
export function surfaceFamilyVerdicts(
  evidence: GlobalConvergenceEvidence,
  assertionId: string,
  social: SocialArtwork,
): Map<string, Verdict> {
  const families = assertionId === 'VAL-B2-GRID-002' ? SURFACE_FAMILIES : assertionId === 'VAL-B2-SURF-011' ? REPRESENTATIVE_SURFACES : null;
  if (!families) throw new Error(`${assertionId} is not a surface-family row of the global convergence sweep`);
  const verdicts = new Map<string, Verdict>();
  for (const family of families) {
    const failures: string[] = [];
    const observed: Record<string, number> = {};
    if (family === 'social-artwork') {
      failures.push(...socialArtworkFailures(social, assertionId));
      observed.cards = social.cards.length;
      observed.devices = social.cards.reduce((sum, card) => sum + card.devices.length, 0);
      verdicts.set(family, { id: family, observed, failures });
      continue;
    }
    const observations = evidence.observations.filter(({ route }) => inSurfaceFamily(family, route));
    if (observations.length === 0) failures.push(`no public route makes up the ${family} surface`);
    observed.routes = new Set(observations.map(({ routeId }) => routeId)).size;
    observed.readings = observations.length;
    for (const observation of observations) {
      const counts = observation.page.counts;
      if (assertionId === 'VAL-B2-GRID-002') {
        observed.alignedDevices = (observed.alignedDevices ?? 0) + (counts.alignedDevices ?? 0);
        if ((counts.alignedDevices ?? 0) === 0) {
          failures.push(`${observation.route} at ${observation.viewport} carries no registered, aligned, pointer-inert device`);
        }
      } else {
        observed.materialSurfaces = (observed.materialSurfaces ?? 0) + (counts.materialSurfaces ?? 0);
        if ((counts.materialSurfaces ?? 0) === 0) {
          failures.push(`${observation.route} at ${observation.viewport} declares no sound material surface`);
        }
        failures.push(
          ...findingFailures(observation, ['material', 'texture']).map((failure) => `${failure} (${observation.viewport})`),
        );
      }
    }
    verdicts.set(family, { id: family, observed, failures });
  }
  return verdicts;
}

/** Every verdict this evidence decides, by assertion and member. */
export function globalConvergenceVerdicts(
  evidence: GlobalConvergenceEvidence,
  social: SocialArtwork,
): Readonly<Record<string, Map<string, Verdict>>> {
  return {
    ...Object.fromEntries(
      Object.keys(ROUTE_ROW_PREDICATES).map((assertionId) => [assertionId, routeRowVerdicts(evidence, assertionId)]),
    ),
    ...Object.fromEntries(FRAME_ROWS.map((assertionId) => [assertionId, frameRowVerdicts(evidence, assertionId)])),
    [TYPE_ROW]: typePopulationVerdicts(evidence),
    [VIEWPORT_PAIR_ROW]: viewportPairVerdicts(evidence),
    ...Object.fromEntries(
      Object.keys(SURFACE_FAMILY_ROWS).map((assertionId) => [
        assertionId,
        surfaceFamilyVerdicts(evidence, assertionId, social),
      ]),
    ),
  };
}
