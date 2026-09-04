import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Evidence for the desktop shell and navigation assertions
 * (`VAL-B2-SHELL-002`, `-003` and `-005`), and the fail-closed reader that
 * decides whether that evidence may grant a result.
 *
 * All three are claims about a rendered document. Whether exactly one
 * `aria-current="page"` sits on the link that matches the route, whether the
 * current-route marker is a registered device painted in the sealed lime and
 * carried by a non-colour cue as well, whether the skip link is the first
 * thing a Tab reaches, and whether the taxonomy still resolves the same
 * hrefs and accessible names are all facts about the DOM a browser built.
 * A source grep decides none of them: a `text-transform`, a class that never
 * won the cascade, or a marker that never mounted all leave the source
 * looking right.
 *
 * The measurement is therefore a desktop sweep of the built export
 * (`tests/e2e/brand-v2-shell.spec.ts`), persisted here. Every reader below
 * throws rather than degrade: a stale fingerprint, a missing route, an empty
 * page, a sweep that discovered no navigation, or a ledger that lost entries
 * all refuse the evidence instead of returning a weaker claim.
 *
 * Discovery is structural first, annotation second. The sweep collects every
 * element carrying `aria-current` whatever its tag, so a heading that took
 * the state to satisfy a count is found and then failed, rather than never
 * looked at because the query asked only for links.
 */
export const SHELL_RUNTIME_EVIDENCE_PATH =
  'evidence/brand-v2/shell-navigation.json';

/**
 * The one viewport this sweep covers. `VAL-B2-SHELL-002` is a claim about
 * the shell's navigation, and below `lg` the taxonomy lives inside a closed
 * drawer that renders no links at all, so a mobile pass would record an
 * absent navigation rather than a navigation that lost its marker. The
 * drawer is measured by its own assertion, `VAL-B2-SHELL-004`.
 */
export const SHELL_VIEWPORT = { id: '1440x900', width: 1440, height: 900 } as const;

/** The exact lime and ink the contract seals for the current-route mark. */
export const SELECTION_LIME_RGB = 'rgb(198, 255, 25)';
export const INK_RGB = 'rgb(11, 11, 12)';
/**
 * Signal blue, in the rendered form and in both hex spellings the repository
 * has shipped. Section 11 reserves it for focus and link behaviour, so its
 * appearance on a current-route treatment is the drift these rows catch.
 */
export const SIGNAL_BLUE_FORMS = ['rgb(36, 95, 255)', '#245fff', '#245edb'] as const;

/** How a navigation entry sits in the taxonomy, from its own geometry. */
export type NavEntryCategory =
  | 'lockup'
  | 'domain-overview'
  | 'module'
  | 'standalone';

export type ShellMarkerObservation = {
  deviceId: string | null;
  anchorSelector: string | null;
  ariaHidden: string | null;
  pointerEvents: string;
  borderLeftColour: string;
  borderLeftWidthPx: number;
  leftPx: number;
  heightPx: number;
  /** Distance between the marker edge and its registered anchor edge. */
  alignmentErrorPx: number;
  /** Height of the row the marker marks, so a stub marker cannot pass. */
  ownerHeightPx: number;
  /** Text the marker contributes to its link's accessible name. */
  contributedText: string;
};

export type ShellNavEntry = {
  index: number;
  href: string;
  name: string;
  category: NavEntryCategory;
  leftPx: number;
  colour: string;
  fontWeight: number;
  fontFamilyHead: string;
  ariaCurrent: string | null;
  marker: ShellMarkerObservation | null;
};

export type ShellAriaCurrentNode = {
  tag: string;
  href: string | null;
  /** Whether the node is a link inside the shell's navigation chrome. */
  navigationLink: boolean;
  accessibleName: string;
  outline: string;
};

export type ShellSkipLinkObservation = {
  /** What the first Tab from the document start actually focused. */
  firstTabStopTag: string;
  firstTabStopHref: string | null;
  firstTabStopText: string;
  /** Vertical offset at rest; the link is parked off-screen until focused. */
  restTopPx: number;
  focusedTopPx: number;
  visibleWhenFocused: boolean;
  colour: string;
  borderColour: string;
  /** Where focus landed after the skip link was activated. */
  activatedFocusId: string | null;
};

export type ShellRouteObservation = {
  route: string;
  /** Length of the rendered text, so an empty page cannot pass. */
  visibleTextLength: number;
  /** Every element carrying aria-current, whatever its tag. */
  ariaCurrentNodes: ShellAriaCurrentNode[];
  /** The taxonomy entries this route rendered, in DOM order. */
  navEntries: ShellNavEntry[];
  skipLink: ShellSkipLinkObservation;
  railGeometry: {
    asideRightPx: number;
    navLeftPx: number;
    mainLeftPx: number;
    documentScrollWidthPx: number;
    documentClientWidthPx: number;
  };
  /** Mono registration labels the shell renders, with their metrics. */
  registrationLabels: Array<{
    text: string;
    fontSizePx: number;
    trackingEm: number;
  }>;
};

export type ShellRuntimeEvidence = {
  version: 1;
  fingerprint: string;
  viewport: string;
  routes: string[];
  observations: ShellRouteObservation[];
  /**
   * The taxonomy with every group expanded, captured once. Only an expanded
   * sidebar exposes all sixty destinations, and `VAL-B2-SHELL-005` is a
   * claim about all of them.
   */
  expandedLedger: ShellNavEntry[];
};

/**
 * Every tracked file whose bytes can change what the shell renders. Listed
 * rather than derived because these are exactly the modules that build the
 * chrome: the sidebar and drawer, the taxonomy, the search entry, the device
 * component the markers come from, the stylesheet that owns the tokens and
 * the skip link, the layout that mounts the shell, and the module registry
 * the taxonomy is built from.
 */
export const SHELL_SOURCE_PATHS = [
  'app/globals.css',
  'app/layout.tsx',
  'app/search/page.tsx',
  'components/nav/nav-tree.tsx',
  'components/nav/search-box.tsx',
  'components/nav/site-shell.tsx',
  'components/ui/brand-device.tsx',
  'data/modules.ts',
] as const;

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * The fingerprint the sweep records and the generator re-derives, over the
 * bytes of every shell source plus the registered geometry of the two
 * devices the shell mounts. Restyling the taxonomy without re-running the
 * sweep is then a stale-evidence failure rather than a silently preserved
 * green row.
 */
export function shellEvidenceFingerprint(input: {
  root: string;
  deviceRegistryRows: ReadonlyArray<{ id: string; fingerprint: string }>;
}): string {
  const parts = [...SHELL_SOURCE_PATHS].sort().map(
    (path) => `${path}:${sha256(readFileSync(join(input.root, path), 'utf8'))}`,
  );
  const devices = [...input.deviceRegistryRows]
    .filter(({ id }) => id.endsWith('rail'))
    .sort((left, right) => left.id.localeCompare(right.id))
    .map(({ id, fingerprint }) => `${id}:${fingerprint}`);
  if (devices.length === 0) {
    throw new Error(
      'the shell fingerprint covers no rail device: the staleness check would miss a registry edit',
    );
  }
  return sha256([...parts, ...devices].join('\n'));
}

/**
 * Accepts the persisted sweep only when it is the sweep this tree needs:
 * current fingerprint, the declared viewport, exactly the registered public
 * routes in both directions, a non-empty rendered page behind every
 * observation, a skip-link reading on every route, and an expanded ledger
 * that actually found the taxonomy. Anything else throws.
 */
export function readShellRuntimeEvidence(input: {
  artifact: unknown;
  routes: string[];
  fingerprint: string;
}): ShellRuntimeEvidence {
  const artifact = input.artifact as Partial<ShellRuntimeEvidence>;
  if (!artifact || typeof artifact !== 'object') {
    throw new Error('shell runtime evidence is not an object');
  }
  if (artifact.version !== 1) {
    throw new Error(
      `shell runtime evidence version ${String(artifact.version)} is not 1`,
    );
  }
  if (artifact.fingerprint !== input.fingerprint) {
    throw new Error(
      'shell runtime evidence is stale: a shell source or a rail device registration changed since the sweep ran. Re-run npm run refresh:brand-v2-evidence.',
    );
  }
  if (artifact.viewport !== SHELL_VIEWPORT.id) {
    throw new Error(
      `shell runtime evidence was swept at ${String(artifact.viewport)}, not ${SHELL_VIEWPORT.id}`,
    );
  }
  const expectedRoutes = [...input.routes].sort();
  if (expectedRoutes.length === 0) {
    throw new Error('shell evidence route population is empty');
  }
  const recordedRoutes = [...(artifact.routes ?? [])].sort();
  if (JSON.stringify(recordedRoutes) !== JSON.stringify(expectedRoutes)) {
    throw new Error(
      `shell runtime evidence covers ${recordedRoutes.length} routes, not the ${expectedRoutes.length} registered public routes`,
    );
  }
  const observations = artifact.observations ?? [];
  const seen = new Set<string>();
  for (const observation of observations) {
    if (seen.has(observation.route)) {
      throw new Error(
        `shell runtime evidence records ${observation.route} twice`,
      );
    }
    seen.add(observation.route);
    if (observation.visibleTextLength <= 0) {
      throw new Error(
        `${observation.route} recorded an empty rendered page, so nothing about it was measured`,
      );
    }
    if (observation.navEntries.length === 0) {
      throw new Error(
        `${observation.route} discovered no navigation entry; every public route renders the shell taxonomy, so the sweep did not measure what it claims`,
      );
    }
    if (observation.skipLink.firstTabStopTag.length === 0) {
      throw new Error(
        `${observation.route} recorded no first keyboard destination`,
      );
    }
  }
  const missing = expectedRoutes.filter((route) => !seen.has(route));
  if (missing.length > 0) {
    throw new Error(
      `shell runtime evidence is missing ${missing.length} route observations, starting with ${missing[0]}`,
    );
  }
  const ledger = artifact.expandedLedger ?? [];
  if (ledger.length === 0) {
    throw new Error(
      'shell runtime evidence recorded an empty expanded taxonomy ledger',
    );
  }
  return artifact as ShellRuntimeEvidence;
}

/** Trailing-slash-insensitive comparison of a route and an href. */
export function sameDestination(left: string, right: string): boolean {
  const trim = (value: string) =>
    value.length > 1 && value.endsWith('/') ? value.slice(0, -1) : value;
  return trim(left) === trim(right);
}

export type CurrentRouteVerdict = {
  route: string;
  /** Whether the taxonomy exposes an entry for this route at all. */
  hasNavigationItem: boolean;
  ariaCurrentCount: number;
  /** aria-current found on something that is not a navigation link. */
  misplaced: string[];
  /** The entry that should carry the state, when one exists. */
  matchingEntry: ShellNavEntry | null;
  /** Why the route is not compliant. Empty means it is. */
  failures: string[];
  markerColour: string | null;
  markerDeviceId: string | null;
  markerAlignmentErrorPx: number | null;
  activeWeight: number | null;
  idleWeight: number | null;
};

/**
 * Decides `VAL-B2-SHELL-002` per route from what the sweep recorded.
 *
 * A route with a taxonomy entry must put exactly one `aria-current="page"`
 * on that entry, paint it in ink, and mark it with the registered lime rail
 * at full row height plus one weight step over its idle siblings, with the
 * marker contributing nothing to the accessible name. A route without an
 * entry must expose none at all. Colour alone never carries the state, and
 * signal blue never carries it.
 */
export function currentRouteVerdicts(
  evidence: ShellRuntimeEvidence,
): Map<string, CurrentRouteVerdict> {
  const destinations = new Set(evidence.expandedLedger.map(({ href }) => href));
  const verdicts = new Map<string, CurrentRouteVerdict>();
  for (const observation of evidence.observations) {
    const { route } = observation;
    const hasNavigationItem = [...destinations].some((href) =>
      sameDestination(href, route),
    );
    const misplaced = observation.ariaCurrentNodes
      .filter((node) => !node.navigationLink)
      .map((node) => `${node.tag} carries aria-current: ${node.outline}`);
    const failures = [...misplaced];
    const matchingEntry =
      observation.navEntries.find(
        (entry) =>
          sameDestination(entry.href, route) && entry.ariaCurrent === 'page',
      ) ?? null;
    const count = observation.ariaCurrentNodes.length;
    if (!hasNavigationItem) {
      if (count > 0) {
        failures.push(
          `${route} has no taxonomy entry yet exposes ${count} aria-current node(s)`,
        );
      }
    } else if (count !== 1) {
      failures.push(
        `${route} has a taxonomy entry and exposes ${count} aria-current node(s), not exactly one`,
      );
    } else if (!matchingEntry) {
      failures.push(
        `${route} puts aria-current on ${observation.ariaCurrentNodes[0]?.href ?? 'no href'}, which is not the entry that matches the route`,
      );
    }
    const marker = matchingEntry?.marker ?? null;
    const siblings = matchingEntry
      ? observation.navEntries.filter(
          (entry) =>
            entry.category === matchingEntry.category &&
            entry.ariaCurrent !== 'page',
        )
      : [];
    const idleWeight = siblings.length > 0
      ? Math.max(...siblings.map(({ fontWeight }) => fontWeight))
      : null;
    if (matchingEntry) {
      if (!marker) {
        failures.push(`${route} marks the current entry with no rail device`);
      } else {
        if (marker.deviceId === null) {
          failures.push(
            `${route} marks the current entry with an unregistered element`,
          );
        }
        if (marker.borderLeftColour !== SELECTION_LIME_RGB) {
          failures.push(
            `${route} paints the current-route rail ${marker.borderLeftColour}, not the sealed ${SELECTION_LIME_RGB}`,
          );
        }
        if (marker.alignmentErrorPx > 2) {
          failures.push(
            `${route} sets the current-route rail ${marker.alignmentErrorPx}px from its registered anchor`,
          );
        }
        if (marker.heightPx + 0.5 < marker.ownerHeightPx) {
          failures.push(
            `${route} renders a ${marker.heightPx}px rail on a ${marker.ownerHeightPx}px row, so the mark is not full-row`,
          );
        }
        if (marker.contributedText.length > 0) {
          failures.push(
            `${route} lets the current-route rail contribute "${marker.contributedText}" to the accessible name`,
          );
        }
        if (marker.ariaHidden !== 'true' || marker.pointerEvents !== 'none') {
          failures.push(
            `${route} renders the current-route rail exposed or pointer-active`,
          );
        }
      }
      if (matchingEntry.colour !== INK_RGB) {
        failures.push(
          `${route} paints the current entry ${matchingEntry.colour}, not ink`,
        );
      }
      if (idleWeight !== null && matchingEntry.fontWeight <= idleWeight) {
        failures.push(
          `${route} gives the current ${matchingEntry.category} entry weight ${matchingEntry.fontWeight}, no more than its idle siblings at ${idleWeight}, so colour is the only difference`,
        );
      }
      const signal = [
        matchingEntry.colour,
        marker?.borderLeftColour ?? '',
      ].filter((value) =>
        SIGNAL_BLUE_FORMS.some((form) => value.toLowerCase().includes(form)),
      );
      if (signal.length > 0) {
        failures.push(
          `${route} carries signal blue on the current-route treatment (${signal.join(', ')})`,
        );
      }
    }
    verdicts.set(route, {
      route,
      hasNavigationItem,
      ariaCurrentCount: count,
      misplaced,
      matchingEntry,
      failures,
      markerColour: marker?.borderLeftColour ?? null,
      markerDeviceId: marker?.deviceId ?? null,
      markerAlignmentErrorPx: marker?.alignmentErrorPx ?? null,
      activeWeight: matchingEntry?.fontWeight ?? null,
      idleWeight,
    });
  }
  return verdicts;
}

export type SkipLinkVerdict = {
  route: string;
  observation: ShellSkipLinkObservation;
  failures: string[];
};

/**
 * Decides `VAL-B2-SHELL-003` per route: the first Tab has to land on the
 * skip link, the link has to be off-screen until it holds focus and inside
 * the viewport once it does, and activating it has to move focus to the main
 * landmark rather than only change the URL.
 */
export function skipLinkVerdicts(
  evidence: ShellRuntimeEvidence,
): Map<string, SkipLinkVerdict> {
  const verdicts = new Map<string, SkipLinkVerdict>();
  for (const { route, skipLink } of evidence.observations) {
    const failures: string[] = [];
    if (skipLink.firstTabStopTag !== 'a') {
      failures.push(
        `${route} gives the first Tab to <${skipLink.firstTabStopTag}>, not a link`,
      );
    }
    if (skipLink.firstTabStopHref !== '#main-content') {
      failures.push(
        `${route} gives the first Tab to ${String(skipLink.firstTabStopHref)}, not the skip destination`,
      );
    }
    if (skipLink.restTopPx >= 0) {
      failures.push(
        `${route} paints the skip link at ${skipLink.restTopPx}px before it is focused`,
      );
    }
    if (!skipLink.visibleWhenFocused || skipLink.focusedTopPx < 0) {
      failures.push(`${route} keeps the skip link off-screen while focused`);
    }
    if (skipLink.activatedFocusId !== 'main-content') {
      failures.push(
        `${route} leaves focus on ${String(skipLink.activatedFocusId)} after the skip link is activated`,
      );
    }
    verdicts.set(route, { route, observation: skipLink, failures });
  }
  return verdicts;
}

/**
 * The rendered taxonomy keyed by the baseline member id it is evidence for.
 * `VAL-B2-SHELL-005` compares this against the sealed navigation manifest,
 * so a renamed entry, a moved entry or a redirected href is a hash
 * disagreement rather than a silently green row.
 */
export function ledgerByBaselineMember(
  evidence: ShellRuntimeEvidence,
): Map<string, ShellNavEntry> {
  const byMember = new Map<string, ShellNavEntry>();
  for (const entry of evidence.expandedLedger) {
    const id = `nav:${entry.href}`;
    if (byMember.has(id)) {
      throw new Error(
        `the expanded taxonomy ledger renders ${entry.href} twice, so no single entry is the evidence for ${id}`,
      );
    }
    byMember.set(id, entry);
  }
  return byMember;
}
