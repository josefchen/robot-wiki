import { z } from 'zod';
import { DOMAINS, modulesByDomain, publishedModules } from '../data/modules.ts';
import { GLOSSARY } from '../data/glossary.ts';
import { IMAGES } from '../data/images.ts';
import {
  buildAzIndex,
  letterAnchorId,
  type AzIndexSourceEntry,
} from './az-index.ts';
import { deriveEvidenceClosure } from './brand-v2-evidence-closure.ts';
import { parseEvidenceArtifact } from './brand-v2-evidence-schema.ts';

/**
 * Evidence for the discovery-index assertions this feature owns
 * (`VAL-B2-SHELL-008`, `VAL-B2-DISC-005` and `VAL-B2-DISC-006`), and the
 * fail-closed reader that decides whether that evidence may grant a result.
 *
 * All three are claims about rendered documents. Whether a domain landing
 * renders its inventory as ruled editorial rows or as a grid of equal
 * marketing cards, whether an A-Z or glossary fragment moves keyboard focus
 * to its target, and whether every index still derives its rows from the
 * registries are facts about what a browser laid out and where focus actually
 * went. A source grep decides none of them: a class that lost the cascade, a
 * fragment target that is an id with no tabindex, or a registry entry that
 * stopped rendering all leave the page source looking correct.
 *
 * The measurement is a desktop sweep of the built export
 * (`tests/e2e/brand-v2-index-rows.spec.ts`), persisted here. Every reader
 * below throws rather than degrade: a stale fingerprint, the wrong viewport,
 * a missing surface, an empty page, a surface with no row list, or a
 * fragment-keyboard reading that never ran all refuse the evidence instead
 * of returning a weaker claim.
 */
export const INDEX_ROWS_EVIDENCE_PATH = 'evidence/brand-v2/index-rows.json';

/** The canonical population sources the three assertions quantify over. */
export const INDEX_EDITORIAL_SURFACE_POPULATION_SOURCE =
  'evidence/brand-v2/index-rows.json#editorialRowSurfaces';
export const INDEX_DISCOVERY_ANCHOR_POPULATION_SOURCE =
  'evidence/brand-v2/index-rows.json#discoveryIndexAnchors';
export const INDEX_ROW_RHYTHM_POPULATION_SOURCE =
  'evidence/brand-v2/index-rows.json#rowRhythmSurfaces';

/** The one viewport this sweep covers, matching the sealed shell sweeps. */
export const INDEX_VIEWPORT = {
  id: '1440x900',
  width: 1440,
  height: 900,
} as const;

/** The home route, whose domain index SHELL-008 also quantifies over. */
export const HOME_ROUTE = '/';

/** The seven domain landing routes, derived from the canonical registry. */
export const DOMAIN_LANDING_ROUTES: readonly string[] = DOMAINS.map(
  (domain) => `/${domain}/`,
);

/** The A-Z and glossary routes DISC-005 names verbatim. */
export const DISCOVERY_ROUTES = ['/a-z/', '/glossary/'] as const;

/**
 * The index-family surfaces DISC-006 quantifies over: the seven domain
 * landings, the A-Z index, the glossary and the credits page. Search-result
 * rows are owned by the search-states feature and join this family when
 * their convergence lands; they are not silently absorbed here.
 */
export const ROW_RHYTHM_ROUTES: readonly string[] = [
  ...DOMAIN_LANDING_ROUTES,
  '/a-z/',
  '/glossary/',
  '/credits/',
];

/** Every surface this sweep must carry, in canonical order. */
export const INDEX_SURFACE_ROUTES: readonly string[] = [
  HOME_ROUTE,
  ...ROW_RHYTHM_ROUTES,
];

/** The registered Tektur role every index-family h1 must resolve to. */
export const INDEX_H1_TEKTUR_ROLE = 'page-h1';

/** The only padding values the spacing ladder permits for index rows. */
export const SPACING_LADDER = [0, 4, 8, 12, 16, 24, 32, 48, 64, 96, 128] as const;

/** One measured row list on one surface. */
export type IndexRowListObservation = {
  /** Stable measurement key, e.g. `domain-article` or `glossary-term`. */
  key: string;
  rowCount: number;
  /** Computed display of the list container the rows live in. */
  containerDisplay: string;
  /** Distinct computed display values across the rows. */
  rowDisplayKinds: string[];
  /** Distinct computed padding-top values across the rows. */
  rowPaddingTopPx: number[];
  /** Distinct non-zero border widths found on the rows or the container. */
  separatorRuleWidthPx: number[];
  /** Distinct styles of those separator rules. */
  separatorRuleStyles: string[];
  /** Rows carrying a four-sided border, a radius and a painted ground. */
  boxedRowCount: number;
};

/** One measured index surface. */
export type IndexSurfaceObservation = {
  route: string;
  /** Length of main's rendered text, so an empty page cannot pass. */
  visibleTextLength: number;
  documentScrollWidthPx: number;
  documentClientWidthPx: number;
  h1Text: string;
  /** First family of the h1's computed font stack. */
  h1FontFamilyHead: string;
  h1SizePx: number;
  /** Elements in main carrying the mono metadata treatment. */
  monoMetadataCount: number;
  rowLists: IndexRowListObservation[];
  /**
   * Fragment targets this surface owes its deep links, reconciled against
   * the registries by the sweep: the letter anchors for /a-z/ and every
   * term id for /glossary/. Empty elsewhere.
   */
  deepLinkTargets: {
    kind: 'az-letters' | 'glossary-terms';
    expectedCount: number;
    missing: string[];
  } | null;
};

/** One fragment-navigation keyboard reading. */
export type FragmentKeyboardObservation = {
  route: string;
  fragment: string;
  initiator: 'direct-url' | 'cross-route-link' | 'in-page-jump';
  activeElementTag: string;
  activeElementId: string;
  /** Whether focus ended on the fragment target itself. */
  targetReceivedFocus: boolean;
  /** Whether the target's top edge landed inside the viewport. */
  targetScrolledIntoView: boolean;
  /**
   * Whether keyboard navigation continues at the target: either focus is
   * already on the target, or the first Tab after the navigation lands on
   * a tab stop inside the target's own row. Chromium focuses a
   * `tabindex="-1"` fragment target on a direct load but leaves focus on
   * the body after a link-initiated navigation while still setting the
   * sequential focus navigation starting point at the target; both are
   * correct keyboard behavior, and neither is "focus restarted at the
   * page top", which is the defect this clause exists to catch.
   */
  nextTabContinuesAtTarget: boolean;
};

/** The complete persisted shape of the index-rows sweep. */
export type IndexRowsEvidence = {
  version: 1;
  fingerprint: string;
  viewport: string;
  surfaces: IndexSurfaceObservation[];
  fragmentKeyboard: FragmentKeyboardObservation[];
};

/**
 * The entry points this evidence is about: the five index pages, the home
 * page whose domain index SHELL-008 shares, and the sweep that measures
 * them. The import closure walk reaches every component and data module
 * these pages render from, so restyling a row primitive or rewording a
 * header without re-running the sweep is a stale-evidence failure.
 */
export const INDEX_CLOSURE_ENTRIES = [
  'app/layout.tsx',
  'app/page.tsx',
  'app/(content)/[domain]/page.tsx',
  'app/a-z/page.tsx',
  'app/glossary/page.tsx',
  'app/credits/page.tsx',
  'tests/e2e/brand-v2-index-rows.spec.ts',
] as const;

export function indexRowsEvidenceFingerprint(input: { root: string }): string {
  return deriveEvidenceClosure({
    root: input.root,
    entries: INDEX_CLOSURE_ENTRIES,
    facts: [PUBLIC_IDENTITY_FOR_FACTS],
  }).fingerprint;
}

/** The identity literal the index headers print, pinned into the fingerprint. */
const PUBLIC_IDENTITY_FOR_FACTS = 'Robot Wiki';

const rowListSchema = z.object({
  key: z.string(),
  rowCount: z.number(),
  containerDisplay: z.string(),
  rowDisplayKinds: z.array(z.string()),
  rowPaddingTopPx: z.array(z.number()),
  separatorRuleWidthPx: z.array(z.number()),
  separatorRuleStyles: z.array(z.string()),
  boxedRowCount: z.number(),
});

const surfaceSchema = z.object({
  route: z.string(),
  visibleTextLength: z.number(),
  documentScrollWidthPx: z.number(),
  documentClientWidthPx: z.number(),
  h1Text: z.string(),
  h1FontFamilyHead: z.string(),
  h1SizePx: z.number(),
  monoMetadataCount: z.number(),
  rowLists: z.array(rowListSchema),
  deepLinkTargets: z
    .object({
      kind: z.enum(['az-letters', 'glossary-terms']),
      expectedCount: z.number(),
      missing: z.array(z.string()),
    })
    .nullable(),
});

const fragmentKeyboardSchema = z.object({
  route: z.string(),
  fragment: z.string(),
  initiator: z.enum(['direct-url', 'cross-route-link', 'in-page-jump']),
  activeElementTag: z.string(),
  activeElementId: z.string(),
  targetReceivedFocus: z.boolean(),
  targetScrolledIntoView: z.boolean(),
  nextTabContinuesAtTarget: z.boolean(),
});

export const indexRowsEvidenceSchema = z.object({
  version: z.literal(1),
  fingerprint: z.string(),
  viewport: z.string(),
  surfaces: z.array(surfaceSchema),
  fragmentKeyboard: z.array(fragmentKeyboardSchema),
});

/**
 * Accepts the persisted sweep only when it is the sweep this tree needs:
 * current fingerprint, the declared viewport, exactly the surfaces this
 * feature quantifies over (in neither direction may a surface be missing or
 * extra), a non-empty rendered page, at least one row list per surface, and
 * a fragment-keyboard section that measured every required reading.
 */
export function readIndexRowsEvidence(input: {
  artifact: unknown;
  fingerprint: string;
}): IndexRowsEvidence {
  const envelope = input.artifact;
  if (!envelope || typeof envelope !== 'object') {
    throw new Error('index-rows evidence is not an object');
  }
  const { version, fingerprint } = envelope as {
    version?: unknown;
    fingerprint?: unknown;
  };
  if (version !== 1) {
    throw new Error(
      `index-rows evidence version ${String(version)} is not 1`,
    );
  }
  if (fingerprint !== input.fingerprint) {
    throw new Error(
      'index-rows evidence is stale: an index page, a shared primitive or the sweep itself changed since it ran. Re-run npm run refresh:brand-v2-evidence.',
    );
  }
  const artifact = parseEvidenceArtifact(
    indexRowsEvidenceSchema,
    envelope,
    'index-rows evidence',
  );
  if (artifact.viewport !== INDEX_VIEWPORT.id) {
    throw new Error(
      `index-rows evidence was swept at ${String(artifact.viewport)}, not ${INDEX_VIEWPORT.id}`,
    );
  }
  const swept = artifact.surfaces.map(({ route }) => route);
  const expected = [...INDEX_SURFACE_ROUTES];
  const missing = expected.filter((route) => !swept.includes(route));
  const extra = swept.filter((route) => !expected.includes(route));
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `index-rows evidence covers [${swept.join(', ')}], not the exact index-family population (missing: [${missing.join(', ')}], extra: [${extra.join(', ')}])`,
    );
  }
  for (const surface of artifact.surfaces) {
    if (surface.visibleTextLength <= 0) {
      throw new Error(
        `index-rows evidence recorded an empty rendered page at ${surface.route}, so nothing about it was measured`,
      );
    }
    if (surface.rowLists.length === 0) {
      throw new Error(
        `index-rows evidence discovered no row list at ${surface.route}, so the row claims were never measured there`,
      );
    }
  }
  const requiredReadings = requiredFragmentReadings();
  const readings = new Set(
    artifact.fragmentKeyboard.map(
      ({ route, initiator }) => `${route}:${initiator}`,
    ),
  );
  for (const required of requiredReadings) {
    if (!readings.has(required)) {
      throw new Error(
        `index-rows evidence is missing the ${required.split(':')[1]} fragment reading for ${required.split(':')[0]}, so keyboard reachability was never measured there`,
      );
    }
  }
  return artifact;
}

/** The fragment readings the sweep owes: per discovery route, per initiator. */
export function requiredFragmentReadings(): string[] {
  return [
    '/a-z/:direct-url',
    '/a-z/:in-page-jump',
    '/glossary/:direct-url',
    '/glossary/:cross-route-link',
  ];
}

// ---------------------------------------------------------------------------
// Registry-derived expectations. Every verdict below compares the rendered
// page against these, never against a count copied out of a previous run.
// ---------------------------------------------------------------------------

/** The published-article inventory each domain landing must render. */
export function expectedDomainInventory(): Record<string, number> {
  const grouped = modulesByDomain();
  return Object.fromEntries(
    DOMAINS.map((domain) => [
      `/${domain}/`,
      (grouped[domain] ?? []).filter((m) => m.status === 'published').length,
    ]),
  );
}

/** The row count each surface's primary list must render. */
export function expectedRowCounts(): Record<string, number> {
  const azEntries: AzIndexSourceEntry[] = [
    ...publishedModules().map((m) => ({
      kind: 'article' as const,
      label: m.title,
      href: `/${m.domain}/${m.slug}/`,
      group: m.domain,
    })),
    ...GLOSSARY.map((t) => ({
      kind: 'term' as const,
      label: t.term,
      href: `/glossary/#${t.id}`,
      group: 'Glossary',
    })),
  ];
  return {
    [HOME_ROUTE]: DOMAINS.length,
    ...expectedDomainInventory(),
    '/a-z/': azEntries.length,
    '/glossary/': GLOSSARY.length,
    '/credits/': IMAGES.length,
  };
}

/** Every letter-anchor id the A-Z index must expose for its deep links. */
export function expectedAzLetterIds(): string[] {
  const entries: AzIndexSourceEntry[] = [
    ...publishedModules().map((m) => ({
      kind: 'article' as const,
      label: m.title,
      href: `/${m.domain}/${m.slug}/`,
      group: m.domain,
    })),
    ...GLOSSARY.map((t) => ({
      kind: 'term' as const,
      label: t.term,
      href: `/glossary/#${t.id}`,
      group: 'Glossary',
    })),
  ];
  return buildAzIndex(entries).groups.map(({ letter }) =>
    letterAnchorId(letter),
  );
}

/** Every term-id fragment target the glossary must expose. */
export function expectedGlossaryIds(): string[] {
  return GLOSSARY.map(({ id }) => id);
}

// ---------------------------------------------------------------------------
// Member ids. Named here so the sweep, the verdicts and the generator
// cannot drift into two spellings of the same member.
// ---------------------------------------------------------------------------

export function indexSurfaceMemberId(route: string): string {
  return `index-surface:${route}`;
}

export function discoveryAnchorMemberId(
  route: string,
  anchor: DiscoveryAnchor,
): string {
  return `discovery-anchor:${route}:${anchor}`;
}

export function rowRhythmMemberId(route: string): string {
  return `row-rhythm:${route}`;
}

// ---------------------------------------------------------------------------
// VAL-B2-SHELL-008: home and the seven domain landings render indexed
// editorial rows rather than a universal grid of equal marketing cards.
// ---------------------------------------------------------------------------

export type EditorialSurfaceVerdict = {
  id: string;
  route: string;
  observed: Record<string, unknown>;
  failures: string[];
};

/** The primary row-list key each SHELL-008 surface is measured through. */
export function primaryRowKey(route: string): string {
  if (route === HOME_ROUTE) return 'home-domain-index';
  if (route === '/a-z/') return 'az-entry';
  if (route === '/glossary/') return 'glossary-term';
  if (route === '/credits/') return 'credits-entry';
  return 'domain-article';
}

export function editorialRowSurfaceVerdicts(
  evidence: IndexRowsEvidence,
): EditorialSurfaceVerdict[] {
  const expected = expectedRowCounts();
  return [HOME_ROUTE, ...DOMAIN_LANDING_ROUTES].map((route) => {
    const id = indexSurfaceMemberId(route);
    const surface = evidence.surfaces.find((s) => s.route === route);
    const failures: string[] = [];
    const observed: Record<string, unknown> = { route };
    if (!surface) {
      return {
        id,
        route,
        observed,
        failures: [`the sweep carried no reading for ${route}`],
      };
    }
    const key = primaryRowKey(route);
    const list = surface.rowLists.find((l) => l.key === key);
    observed.primaryRowKey = key;
    if (!list) {
      failures.push(
        `${route} rendered no ${key} row list, so its inventory was never laid out as rows`,
      );
    } else {
      observed.rowCount = list.rowCount;
      const expectedCount = expected[route];
      if (expectedCount === undefined) {
        failures.push(`${route} has no registry-derived expected row count`);
      } else if (list.rowCount !== expectedCount) {
        failures.push(
          `${route} renders ${list.rowCount} ${key} rows, not the ${expectedCount} the registry derives`,
        );
      }
      observed.separatorRuleWidthPx = list.separatorRuleWidthPx;
      if (!list.separatorRuleWidthPx.includes(1)) {
        failures.push(
          `${route}'s ${key} rows carry no 1px separator rule, so the inventory is not an indexed editorial run`,
        );
      }
      if (list.separatorRuleStyles.length > 0 && !list.separatorRuleStyles.every((s) => s === 'solid')) {
        failures.push(
          `${route}'s ${key} separator rules are ${list.separatorRuleStyles.join('/')}, not solid hairlines`,
        );
      }
      observed.boxedRowCount = list.boxedRowCount;
      if (list.boxedRowCount > 0) {
        failures.push(
          `${list.boxedRowCount} of ${route}'s ${key} rows render as four-sided bordered boxes, not index rows`,
        );
      }
      observed.containerDisplay = list.containerDisplay;
      if (list.containerDisplay === 'grid' || list.containerDisplay.includes('flow')) {
        failures.push(
          `${route}'s ${key} container lays out as ${list.containerDisplay}, a multi-column arrangement rather than a single ruled run`,
        );
      }
    }
    return { id, route, observed, failures };
  });
}

// ---------------------------------------------------------------------------
// VAL-B2-DISC-005: /a-z/ and /glossary/ retain deep links, keyboard
// reachability, source wording and the shared v2 index treatment.
// ---------------------------------------------------------------------------

export const DISCOVERY_ANCHORS = [
  'deep-links',
  'keyboard-reachability',
  'source-wording',
  'shared-index-treatment',
] as const;

export type DiscoveryAnchor = (typeof DISCOVERY_ANCHORS)[number];

export type DiscoveryAnchorVerdict = {
  id: string;
  route: string;
  anchor: DiscoveryAnchor;
  observed: Record<string, unknown>;
  failures: string[];
};

export function discoveryIndexVerdicts(
  evidence: IndexRowsEvidence,
): DiscoveryAnchorVerdict[] {
  const expected = expectedRowCounts();
  const verdicts: DiscoveryAnchorVerdict[] = [];
  for (const route of DISCOVERY_ROUTES) {
    const surface = evidence.surfaces.find((s) => s.route === route);
    const readings = evidence.fragmentKeyboard.filter((f) => f.route === route);
    const base = { route };
    if (!surface) {
      for (const anchor of DISCOVERY_ANCHORS) {
        verdicts.push({
          id: discoveryAnchorMemberId(route, anchor),
          route,
          anchor,
          observed: base,
          failures: [`the sweep carried no reading for ${route}`],
        });
      }
      continue;
    }

    // --- deep-links: every registry fragment target exists on the page. ---
    const deepFailures: string[] = [];
    const deepObserved: Record<string, unknown> = { route };
    if (!surface.deepLinkTargets) {
      deepFailures.push(`the sweep recorded no fragment-target census for ${route}`);
    } else {
      deepObserved.expectedCount = surface.deepLinkTargets.expectedCount;
      deepObserved.missing = surface.deepLinkTargets.missing;
      if (surface.deepLinkTargets.missing.length > 0) {
        deepFailures.push(
          `${route} is missing fragment target(s) ${surface.deepLinkTargets.missing.join(', ')}`,
        );
      }
    }
    verdicts.push({
      id: discoveryAnchorMemberId(route, 'deep-links'),
      route,
      anchor: 'deep-links',
      observed: deepObserved,
      failures: deepFailures,
    });

    // --- keyboard: fragment navigation moves focus to the target. ---
    const kbFailures: string[] = [];
    const kbObserved: Record<string, unknown> = {
      readings: readings.map(
        ({
          initiator,
          targetReceivedFocus,
          nextTabContinuesAtTarget,
          targetScrolledIntoView,
        }) => ({
          initiator,
          targetReceivedFocus,
          nextTabContinuesAtTarget,
          targetScrolledIntoView,
        }),
      ),
    };
    for (const reading of readings) {
      if (reading.initiator === 'in-page-jump') {
        // A same-page jump keeps focus on the initiating link, which is the
        // correct behavior; the clause it owes is that the hash applied and
        // the target scrolled into view.
        if (!reading.targetScrolledIntoView) {
          kbFailures.push(
            `${route}'s jump link to ${reading.fragment} did not scroll the target into view`,
          );
        }
        continue;
      }
      if (!reading.targetScrolledIntoView) {
        kbFailures.push(
          `following ${route}${reading.fragment} by ${reading.initiator.replace(/-/g, ' ')} did not scroll the target into view`,
        );
      }
      if (!reading.targetReceivedFocus && !reading.nextTabContinuesAtTarget) {
        kbFailures.push(
          `following ${route}${reading.fragment} by ${reading.initiator.replace(/-/g, ' ')} left focus on <${reading.activeElementTag || 'unknown'}>, not on the fragment target, and the next Tab did not continue inside the target's row`,
        );
      }
    }
    if (readings.length === 0) {
      kbFailures.push(`the sweep recorded no fragment-keyboard reading for ${route}`);
    }
    verdicts.push({
      id: discoveryAnchorMemberId(route, 'keyboard-reachability'),
      route,
      anchor: 'keyboard-reachability',
      observed: kbObserved,
      failures: kbFailures,
    });

    // --- source wording: the inventory stays registry-derived. ---
    const wordingFailures: string[] = [];
    const wordingObserved: Record<string, unknown> = { route };
    const key = primaryRowKey(route);
    const list = surface.rowLists.find((l) => l.key === key);
    if (!list) {
      wordingFailures.push(`${route} rendered no ${key} row list to count`);
    } else {
      wordingObserved.rowCount = list.rowCount;
      if (list.rowCount !== expected[route]) {
        wordingFailures.push(
          `${route} renders ${list.rowCount} rows, not the ${expected[route]} the registry derives`,
        );
      }
    }
    wordingObserved.monoMetadataCount = surface.monoMetadataCount;
    if (surface.monoMetadataCount <= 0) {
      wordingFailures.push(
        `${route} renders no mono count metadata, so its inventory line is no longer data-derived`,
      );
    }
    verdicts.push({
      id: discoveryAnchorMemberId(route, 'source-wording'),
      route,
      anchor: 'source-wording',
      observed: wordingObserved,
      failures: wordingFailures,
    });

    // --- shared index treatment: Tektur h1, ruled rows, no boxed cards. ---
    const sharedFailures: string[] = [];
    const sharedObserved: Record<string, unknown> = {
      h1FontFamilyHead: surface.h1FontFamilyHead,
    };
    if (!surface.h1FontFamilyHead.toLowerCase().includes('tektur')) {
      sharedFailures.push(
        `${route}'s h1 resolves ${surface.h1FontFamilyHead} as its first family, not Tektur`,
      );
    }
    if (list && !list.separatorRuleWidthPx.includes(1)) {
      sharedFailures.push(
        `${route}'s rows carry no 1px separator rule, so its index treatment diverges from the family`,
      );
    }
    if (list && list.boxedRowCount > 0) {
      sharedFailures.push(
        `${route} renders ${list.boxedRowCount} boxed card rows inside its index`,
      );
    }
    if (surface.documentScrollWidthPx > surface.documentClientWidthPx) {
      sharedFailures.push(
        `${route} overflows horizontally at ${INDEX_VIEWPORT.id}`,
      );
    }
    verdicts.push({
      id: discoveryAnchorMemberId(route, 'shared-index-treatment'),
      route,
      anchor: 'shared-index-treatment',
      observed: sharedObserved,
      failures: sharedFailures,
    });
  }
  return verdicts;
}

// ---------------------------------------------------------------------------
// VAL-B2-DISC-006: result/index rows use rules and editorial rhythm; they
// are not converted into a universal bento-card grid.
// ---------------------------------------------------------------------------

export type RowRhythmVerdict = {
  id: string;
  route: string;
  observed: Record<string, unknown>;
  failures: string[];
};

export function rowRhythmVerdicts(
  evidence: IndexRowsEvidence,
): RowRhythmVerdict[] {
  return ROW_RHYTHM_ROUTES.map((route) => {
    const id = rowRhythmMemberId(route);
    const surface = evidence.surfaces.find((s) => s.route === route);
    const observed: Record<string, unknown> = { route };
    if (!surface) {
      return {
        id,
        route,
        observed,
        failures: [`the sweep carried no reading for ${route}`],
      };
    }
    const failures: string[] = [];
    const key = primaryRowKey(route);
    const list = surface.rowLists.find((l) => l.key === key);
    if (!list) {
      return {
        id,
        route,
        observed,
        failures: [`${route} rendered no ${key} row list`],
      };
    }
    observed.rowPaddingTopPx = list.rowPaddingTopPx;
    if (list.rowPaddingTopPx.length !== 1) {
      failures.push(
        `${route}'s ${key} rows use ${list.rowPaddingTopPx.length} distinct padding values (${list.rowPaddingTopPx.join('/')}px), so the run has no single editorial rhythm`,
      );
    } else if (
      !(SPACING_LADDER as readonly number[]).includes(list.rowPaddingTopPx[0])
    ) {
      failures.push(
        `${route}'s ${key} row padding ${list.rowPaddingTopPx[0]}px is off the spacing ladder`,
      );
    }
    observed.separatorRuleWidthPx = list.separatorRuleWidthPx;
    if (!list.separatorRuleWidthPx.includes(1)) {
      failures.push(
        `${route}'s ${key} rows are separated by no 1px rule; whitespace alone is not the family's rhythm`,
      );
    }
    observed.boxedRowCount = list.boxedRowCount;
    if (list.boxedRowCount > 0) {
      failures.push(
        `${route} renders ${list.boxedRowCount} boxed card rows, a bento conversion of an index run`,
      );
    }
    observed.containerDisplay = list.containerDisplay;
    if (list.containerDisplay === 'grid') {
      failures.push(
        `${route}'s ${key} container is a CSS grid, the universal equal-card arrangement DISC-006 prohibits`,
      );
    }
    return { id, route, observed, failures };
  });
}
