import { deriveEvidenceClosure } from './brand-v2-evidence-closure.ts';

/**
 * Evidence for the home-composition assertions (`VAL-B2-ID-007`,
 * `VAL-B2-SHELL-006` and `VAL-B2-SHELL-007`), and the fail-closed reader
 * that decides whether that evidence may grant a result.
 *
 * All three are claims about a rendered document. Whether the hero carries
 * exactly one dominant lockup, whether the descriptor arrives byte-for-byte
 * on the page rather than only in the source, whether a black action and a
 * lime highlight are actually painted and actually inside the first
 * viewport, and whether all seven domain destinations are visible and
 * correctly named are facts about what a browser laid out. A source grep
 * decides none of them: a `text-transform`, a class that lost the cascade,
 * an element pushed below the fold by a reflow, or a token that resolved to
 * a different colour all leave `app/page.tsx` looking correct.
 *
 * The measurement is therefore a desktop sweep of the built export
 * (`tests/e2e/brand-v2-home.spec.ts`), persisted here. Every reader below
 * throws rather than degrade: a stale fingerprint, the wrong viewport, the
 * wrong route, an empty page, a hero with no lockup, or a sweep that found
 * no sections all refuse the evidence instead of returning a weaker claim.
 */
export const HOME_COMPOSITION_EVIDENCE_PATH =
  'evidence/brand-v2/home-composition.json';

/**
 * The one viewport this sweep covers. `VAL-DESIGN-003` states its bound in
 * literal `1440×900` CSS px, and `VAL-B2-SHELL-006` inherits it: "in the
 * first major composition" is only decidable against a stated viewport.
 * Mobile convergence is a separate feature with its own assertions.
 */
export const HOME_VIEWPORT = {
  id: '1440x900',
  width: 1440,
  height: 900,
} as const;

export const HOME_ROUTE = '/';

/** The exact sealed values the contract names for the two roles measured. */
export const SELECTION_LIME_RGB = 'rgb(198, 255, 25)';
export const ACTION_INK_RGB = 'rgb(11, 11, 12)';
export const ON_ACTION_RGB = 'rgb(255, 255, 255)';

/** Minimum ratio of the identity to the largest supporting heading. */
export const HOME_HIERARCHY_RATIO = 1.5;
/** Maximum rendered lines the desktop primary heading may occupy. */
export const HOME_PRIMARY_HEADING_MAX_LINES = 3;
/** Maximum adjacent top-level sections that may share one signature. */
export const MAX_ADJACENT_REPEATED_SIGNATURES = 3;

export type HomeHeroLockup = {
  /** DOM order among the discovered lockups, so a duplicate is nameable. */
  index: number;
  /** innerText, so a casing change made in CSS is visible here. */
  text: string;
  fontFamilyHead: string;
  fontSizePx: number;
  lineHeightPx: number;
  heightPx: number;
  renderedLines: number;
  topPx: number;
  bottomPx: number;
  /** The descriptor rendered inside this lockup's own sheet, if any. */
  descriptorText: string | null;
  descriptorFontFamilyHead: string | null;
};

export type HomeActionObservation = {
  controlId: string | null;
  accessibleName: string;
  href: string | null;
  backgroundColour: string;
  colour: string;
  topPx: number;
  bottomPx: number;
};

export type HomeHighlightObservation = {
  tag: string;
  /** Which CSS properties paint the sealed lime on this element. */
  carriers: string[];
  text: string;
  /**
   * The cue a reader who cannot perceive the lime still gets. `<mark>` is
   * itself that cue and an ARIA state is announced; both survive greyscale
   * and forced colours. A bare `<span>` painted lime has none, and the
   * verdict refuses it rather than counting the colour twice.
   */
  nonColourCue: string | null;
  /**
   * Any `data-brand-highlight` the element carries. Recorded and never
   * credited: an attribute is addressed to the measurement, not to a reader,
   * so counting it as the non-colour cue let the annotation stand in for the
   * thing it was supposed to be evidence of.
   */
  annotation: string | null;
  topPx: number;
  bottomPx: number;
};

export type HomeDomainEntry = {
  name: string;
  href: string;
  /** The entry's own descriptive text, which `VAL-NAV-002` requires. */
  description: string;
  topPx: number;
  bottomPx: number;
  heightPx: number;
  /** Whether the row is a four-sided bordered card rather than an index row. */
  bordered: boolean;
};

export type HomeSectionObservation = {
  index: number;
  label: string;
  /** The registered `surface/heading/form` signature, or null if absent. */
  signature: string | null;
  /**
   * The section's structural form as measured: its painted surface, its
   * heading treatment, the treatment of the actions it offers, and the shape
   * of its content. The repetition bound runs over this rather than over
   * `signature`, because a string the markup writes about itself is not a
   * measurement of the markup: two sections built from one template could
   * declare two different signatures and the bound never saw the repeat.
   */
  derivedSignature: string;
  /**
   * The first three parts of the same reading. `VAL-B2-COMP-016` bounds
   * adjacent siblings sharing one surface/heading/action signature, and
   * content form is the part it deliberately lets vary.
   */
  derivedSurfaceHeadingAction: string;
  headingTag: string | null;
  headingSizePx: number | null;
};

export type HomeCompositionEvidence = {
  version: 1;
  fingerprint: string;
  viewport: string;
  route: string;
  /** Length of the rendered text, so an empty page cannot pass. */
  visibleTextLength: number;
  documentScrollWidthPx: number;
  documentClientWidthPx: number;
  heroLockups: HomeHeroLockup[];
  /** The largest supporting heading, which the hierarchy ratio divides by. */
  largestSupportingHeadingPx: number | null;
  actions: HomeActionObservation[];
  highlights: HomeHighlightObservation[];
  domainEntries: HomeDomainEntry[];
  sections: HomeSectionObservation[];
  /** Headings, labels, buttons, captions and first-party alt text. */
  chromeText: string;
  /** Anchor-text occurrences of each canonical domain display name. */
  domainAnchorCounts: Record<string, number>;
  /** Canonical domain names found in each non-index prose section. */
  proseSectionDomainNames: Array<{ label: string; names: string[] }>;
  /** The home overview paragraph, verbatim. */
  overviewProse: string;
  /** Reader-facing build-progress or planned-work copy the sweep matched. */
  progressMetadataMatches: string[];
  /** Four-sided bordered containers at least 80px tall inside main. */
  borderedCardCount: number;
};

/**
 * The entry points the home composition evidence is about: the page itself
 * and the layout that wraps it, plus the sweep that measures them.
 *
 * The closure of those three is what can change this reading, and it is
 * derived rather than listed. The six-path list this replaces omitted every
 * transitive rendering input the page actually has — `data/domains.ts`,
 * which supplies the seven destinations the domain-index rows are measured
 * against; `components/interactive/reliability-compounding.tsx`, the
 * featured instrument inside the first composition;
 * `components/mdx/image-ref.tsx` and `components/ui/figure.tsx`, which
 * decide how an image lands in the layout; and
 * `components/nav/site-shell.tsx`, the chrome every home geometry reading is
 * relative to. Any of those could move the sections, the fold, or the
 * highlight while the committed artifact still read as current.
 */
export const HOME_CLOSURE_ENTRIES = [
  'app/layout.tsx',
  'app/page.tsx',
  'tests/e2e/brand-v2-home.spec.ts',
] as const;

/**
 * The fingerprint the sweep records and the generator re-derives, over the
 * bytes of the whole home closure plus the exact identity literals the hero
 * has to print. Restyling or rewording the page without re-running the sweep
 * is then a stale-evidence failure rather than a silently preserved green
 * row.
 */
export function homeEvidenceFingerprint(input: {
  root: string;
  identity: string;
  descriptor: string;
}): string {
  return deriveEvidenceClosure({
    root: input.root,
    entries: HOME_CLOSURE_ENTRIES,
    facts: [input.identity, input.descriptor],
  }).fingerprint;
}

/**
 * Accepts the persisted sweep only when it is the sweep this tree needs:
 * current fingerprint, the declared viewport and route, a non-empty rendered
 * page, at least one discovered hero lockup, at least one discovered domain
 * entry, and at least one top-level section. Anything else throws, because a
 * sweep that found nothing is indistinguishable from a page that renders
 * nothing, and only one of those should produce a result.
 */
export function readHomeCompositionEvidence(input: {
  artifact: unknown;
  fingerprint: string;
}): HomeCompositionEvidence {
  const artifact = input.artifact as Partial<HomeCompositionEvidence>;
  if (!artifact || typeof artifact !== 'object') {
    throw new Error('home composition evidence is not an object');
  }
  if (artifact.version !== 1) {
    throw new Error(
      `home composition evidence version ${String(artifact.version)} is not 1`,
    );
  }
  if (artifact.fingerprint !== input.fingerprint) {
    throw new Error(
      'home composition evidence is stale: a home source or an identity literal changed since the sweep ran. Re-run npm run refresh:brand-v2-evidence.',
    );
  }
  if (artifact.viewport !== HOME_VIEWPORT.id) {
    throw new Error(
      `home composition evidence was swept at ${String(artifact.viewport)}, not ${HOME_VIEWPORT.id}`,
    );
  }
  if (artifact.route !== HOME_ROUTE) {
    throw new Error(
      `home composition evidence covers ${String(artifact.route)}, not ${HOME_ROUTE}`,
    );
  }
  if ((artifact.visibleTextLength ?? 0) <= 0) {
    throw new Error(
      'home composition evidence recorded an empty rendered page, so nothing about it was measured',
    );
  }
  if ((artifact.heroLockups ?? []).length === 0) {
    throw new Error(
      'home composition evidence discovered no hero lockup: VAL-B2-ID-007 would quantify over an empty population',
    );
  }
  if ((artifact.domainEntries ?? []).length === 0) {
    throw new Error(
      'home composition evidence discovered no domain entry, so the seven-destination claim was never measured',
    );
  }
  if ((artifact.sections ?? []).length === 0) {
    throw new Error(
      'home composition evidence discovered no top-level section, so the structure claim was never measured',
    );
  }
  return artifact as HomeCompositionEvidence;
}

/** Trailing-slash-insensitive comparison of a route and an href. */
export function sameDestination(left: string, right: string): boolean {
  const trim = (value: string) =>
    value.length > 1 && value.endsWith('/') ? value.slice(0, -1) : value;
  return trim(left) === trim(right);
}

/**
 * The population id of one discovered hero lockup. Named here so the
 * generator's population and its verdicts cannot drift into two spellings
 * of the same member.
 */
export function heroLockupMemberId(index: number): string {
  return `home-hero-lockup:${index}`;
}

export type HeroLockupVerdict = {
  id: string;
  index: number;
  failures: string[];
};

/**
 * Decides `VAL-B2-ID-007` per discovered hero lockup.
 *
 * The population is what the hero actually rendered, not a constant: the
 * assertion prohibits duplicate lockups, so a second one has to become a
 * second member that fails, rather than disappearing into a boolean. The
 * first lockup carries the whole claim (exact identity text, Tektur, the
 * exact descriptor once); every later one fails for existing.
 */
export function heroLockupVerdicts(
  evidence: HomeCompositionEvidence,
  literals: { identity: string; descriptor: string },
): HeroLockupVerdict[] {
  return evidence.heroLockups.map((lockup) => {
    const id = heroLockupMemberId(lockup.index);
    const failures: string[] = [];
    if (lockup.index > 0) {
      failures.push(
        `home renders a duplicate hero lockup at DOM position ${lockup.index} carrying "${lockup.text}"`,
      );
      return { id, index: lockup.index, failures };
    }
    if (lockup.text !== literals.identity) {
      failures.push(
        `the home hero h1 renders "${lockup.text}", not the exact public identity "${literals.identity}"`,
      );
    }
    if (!lockup.fontFamilyHead.toLowerCase().includes('tektur')) {
      failures.push(
        `the home hero h1 resolves ${lockup.fontFamilyHead} as its first family, not Tektur`,
      );
    }
    if (lockup.descriptorText === null) {
      failures.push('the home hero renders no descriptor beside its identity');
    } else if (lockup.descriptorText !== literals.descriptor) {
      failures.push(
        `the home hero descriptor renders "${lockup.descriptorText}", not the exact "${literals.descriptor}"`,
      );
    }
    if (lockup.renderedLines > HOME_PRIMARY_HEADING_MAX_LINES) {
      failures.push(
        `the home hero h1 renders on ${lockup.renderedLines} lines, more than the ${HOME_PRIMARY_HEADING_MAX_LINES} the rubric allows`,
      );
    }
    return { id, index: lockup.index, failures };
  });
}

/**
 * The anchors `VAL-B2-SHELL-006` decomposes into. Declared here rather than
 * derived from the evidence, so an anchor the sweep forgot to measure is a
 * missing member that fails, not a member that never existed.
 */
export const HOME_COMPOSITION_ANCHORS = [
  'anchor:home-dominant-hero',
  'anchor:home-exact-descriptor',
  'anchor:home-black-primary-action',
  'anchor:home-lime-highlight',
  'anchor:home-board-derived-structure',
  'anchor:home-no-fabricated-metrics',
] as const;

export type HomeCompositionAnchor =
  (typeof HOME_COMPOSITION_ANCHORS)[number];

export type HomeAnchorVerdict = {
  id: HomeCompositionAnchor;
  observed: Record<string, unknown>;
  failures: string[];
};

function insideFirstViewport(box: { topPx: number; bottomPx: number }): boolean {
  return box.topPx >= 0 && box.bottomPx <= HOME_VIEWPORT.height;
}

/**
 * Decides `VAL-B2-SHELL-006` anchor by anchor.
 *
 * Each anchor is independent, so a page that gains a black action but loses
 * its descriptor fails one row and passes the other rather than collapsing
 * to a single opaque boolean. The geometry clauses are all measured against
 * the first viewport, because "the first major composition" is the thing the
 * contract bounds and an action scrolled off the fold is not in it.
 */
export function homeCompositionVerdicts(
  evidence: HomeCompositionEvidence,
  literals: { identity: string; descriptor: string },
): HomeAnchorVerdict[] {
  const hero = evidence.heroLockups[0];
  const supporting = evidence.largestSupportingHeadingPx;
  const ratio =
    hero && supporting && supporting > 0 ? hero.fontSizePx / supporting : null;

  const heroFailures: string[] = [];
  if (evidence.heroLockups.length !== 1) {
    heroFailures.push(
      `home renders ${evidence.heroLockups.length} hero lockups, not exactly one`,
    );
  }
  if (!hero) {
    heroFailures.push('home renders no hero lockup at all');
  } else {
    if (hero.text !== literals.identity) {
      heroFailures.push(
        `the hero prints "${hero.text}" rather than "${literals.identity}"`,
      );
    }
    if (!hero.fontFamilyHead.toLowerCase().includes('tektur')) {
      heroFailures.push(
        `the hero resolves ${hero.fontFamilyHead} rather than Tektur`,
      );
    }
    if (!insideFirstViewport(hero)) {
      heroFailures.push(
        `the hero spans ${hero.topPx}px to ${hero.bottomPx}px, outside the first ${HOME_VIEWPORT.height}px`,
      );
    }
    if (ratio === null) {
      heroFailures.push(
        'home renders no supporting heading, so the dominance ratio is undefined',
      );
    } else if (ratio < HOME_HIERARCHY_RATIO) {
      heroFailures.push(
        `the hero is ${ratio.toFixed(2)}x its largest supporting heading, under the ${HOME_HIERARCHY_RATIO}x the rubric requires`,
      );
    }
  }

  const descriptors = evidence.heroLockups
    .map(({ descriptorText }) => descriptorText)
    .filter((text): text is string => text !== null);
  const descriptorFailures: string[] = [];
  if (descriptors.length !== 1) {
    descriptorFailures.push(
      `home renders ${descriptors.length} hero descriptors, not exactly one`,
    );
  }
  for (const text of descriptors) {
    if (text !== literals.descriptor) {
      descriptorFailures.push(
        `a hero descriptor renders "${text}" rather than the exact locked string`,
      );
    }
  }

  const primaryActions = evidence.actions.filter(
    ({ controlId }) => controlId === 'control:primary-action',
  );
  const blackInFirstViewport = primaryActions.filter(
    (action) =>
      action.backgroundColour === ACTION_INK_RGB &&
      insideFirstViewport(action),
  );
  const actionFailures: string[] = [];
  if (primaryActions.length === 0) {
    actionFailures.push('home mounts no registered primary action');
  }
  if (blackInFirstViewport.length === 0) {
    actionFailures.push(
      `no registered primary action is painted ${ACTION_INK_RGB} inside the first ${HOME_VIEWPORT.height}px (observed ${JSON.stringify(primaryActions.map(({ accessibleName, backgroundColour, topPx, bottomPx }) => ({ accessibleName, backgroundColour, topPx, bottomPx })))})`,
    );
  }
  for (const action of blackInFirstViewport) {
    if (action.colour !== ON_ACTION_RGB) {
      actionFailures.push(
        `the black action "${action.accessibleName}" sets its label ${action.colour}, not the on-action white`,
      );
    }
    if (action.accessibleName.trim().length === 0) {
      actionFailures.push('a black primary action carries no accessible name');
    }
  }

  const limeInFirstViewport = evidence.highlights.filter((highlight) =>
    insideFirstViewport(highlight),
  );
  const highlightFailures: string[] = [];
  if (limeInFirstViewport.length === 0) {
    highlightFailures.push(
      `no sealed ${SELECTION_LIME_RGB} highlight is painted inside the first ${HOME_VIEWPORT.height}px`,
    );
  }
  for (const highlight of limeInFirstViewport) {
    if (highlight.carriers.length === 0) {
      highlightFailures.push(
        `the highlight on "${highlight.text}" carries the lime on no measured property`,
      );
    }
    if (highlight.nonColourCue === null) {
      highlightFailures.push(
        highlight.annotation
          ? `the highlight on "${highlight.text}" is carried by colour alone: data-brand-highlight="${highlight.annotation}" is an annotation addressed to this sweep, not a cue a reader meets in greyscale or forced colours`
          : `the highlight on "${highlight.text}" is carried by colour alone, with no semantic or shape cue beside it`,
      );
    }
  }

  const signatures = evidence.sections.map(({ signature }) => signature);
  const structureFailures: string[] = [];
  const unregistered = evidence.sections.filter(
    ({ signature }) => signature === null || signature.trim().length === 0,
  );
  if (unregistered.length > 0) {
    structureFailures.push(
      `${unregistered.length} top-level home section(s) render no registered structural signature, starting with "${unregistered[0]?.label}"`,
    );
  }
  // The bound runs over what the sections measure as, not over what they
  // say about themselves. Two sections built from one template declaring two
  // different `data-brand-module-signature` strings used to count as two
  // forms, which made the bound unenforceable by editing an attribute.
  const run = longestAdjacentRun(
    evidence.sections.map(({ derivedSignature }) => derivedSignature),
  );
  if (run > MAX_ADJACENT_REPEATED_SIGNATURES) {
    structureFailures.push(
      `${run} adjacent top-level sections measure one structural form, over the ${MAX_ADJACENT_REPEATED_SIGNATURES} the rubric allows`,
    );
  }
  const surfaceHeadingRun = longestAdjacentRun(
    evidence.sections.map(
      ({ derivedSurfaceHeadingAction }) => derivedSurfaceHeadingAction,
    ),
  );
  if (surfaceHeadingRun > MAX_ADJACENT_REPEATED_SIGNATURES) {
    structureFailures.push(
      `${surfaceHeadingRun} adjacent top-level sections measure one surface, heading and action treatment, over the ${MAX_ADJACENT_REPEATED_SIGNATURES} the rubric allows`,
    );
  }
  // And the annotation has to agree with the measurement, or it is decoration
  // that other rows read as structure.
  const authoredByForm = new Map<string, HomeSectionObservation[]>();
  for (const section of evidence.sections) {
    const group = authoredByForm.get(section.derivedSignature) ?? [];
    group.push(section);
    authoredByForm.set(section.derivedSignature, group);
  }
  for (const group of authoredByForm.values()) {
    const declared = [
      ...new Set(group.map(({ signature }) => signature ?? '(none)')),
    ].sort();
    if (declared.length > 1) {
      structureFailures.push(
        `sections "${group.map(({ label }) => label).join('", "')}" measure one structural form yet declare ${declared.length} different data-brand-module-signature values (${declared.join(', ')})`,
      );
    }
  }
  const griddedDomainRows = evidence.domainEntries.filter(
    ({ bordered }) => bordered,
  );
  if (griddedDomainRows.length > 0) {
    structureFailures.push(
      `${griddedDomainRows.length} of the ${evidence.domainEntries.length} domain entries render as four-sided bordered cards rather than index rows`,
    );
  }

  const metricFailures: string[] = [];
  if (evidence.progressMetadataMatches.length > 0) {
    metricFailures.push(
      `home renders ${evidence.progressMetadataMatches.length} build-progress or planned-work phrase(s): ${evidence.progressMetadataMatches.join('; ')}`,
    );
  }

  return [
    {
      id: 'anchor:home-dominant-hero',
      observed: {
        lockups: evidence.heroLockups.length,
        fontSizePx: hero?.fontSizePx ?? null,
        largestSupportingHeadingPx: supporting,
        hierarchyRatio: ratio === null ? null : Number(ratio.toFixed(3)),
        renderedLines: hero?.renderedLines ?? null,
      },
      failures: heroFailures,
    },
    {
      id: 'anchor:home-exact-descriptor',
      observed: { descriptors },
      failures: descriptorFailures,
    },
    {
      id: 'anchor:home-black-primary-action',
      observed: {
        registered: primaryActions.length,
        blackInFirstViewport: blackInFirstViewport.map(
          ({ accessibleName, href, backgroundColour, colour }) => ({
            accessibleName,
            href,
            backgroundColour,
            colour,
          }),
        ),
      },
      failures: actionFailures,
    },
    {
      id: 'anchor:home-lime-highlight',
      observed: {
        inFirstViewport: limeInFirstViewport.map(
          ({ tag, carriers, text, nonColourCue, annotation }) => ({
            tag,
            carriers,
            text,
            nonColourCue,
            annotation,
          }),
        ),
      },
      failures: highlightFailures,
    },
    {
      id: 'anchor:home-board-derived-structure',
      observed: {
        signatures,
        // The measured forms as equivalence-class labels rather than as the
        // long strings themselves: which sections measure alike is the fact
        // the bound is about, and it survives an unrelated restyle.
        derivedForms: formLabels(
          evidence.sections.map(({ derivedSignature }) => derivedSignature),
        ),
        derivedSurfaceHeadingActionForms: formLabels(
          evidence.sections.map(
            ({ derivedSurfaceHeadingAction }) => derivedSurfaceHeadingAction,
          ),
        ),
        maximumAdjacentRepeatedSignatures: run,
        maximumAdjacentSurfaceHeadingRun: surfaceHeadingRun,
        borderedCardCount: evidence.borderedCardCount,
        borderedDomainRows: griddedDomainRows.length,
      },
      failures: structureFailures,
    },
    {
      id: 'anchor:home-no-fabricated-metrics',
      observed: { progressMetadataMatches: evidence.progressMetadataMatches },
      failures: metricFailures,
    },
  ];
}

/**
 * Equivalence-class labels for a list of measured forms, in first-seen
 * order. Two entries share a label exactly when they measured identically.
 */
export function formLabels(values: readonly string[]): string[] {
  const labels = new Map<string, string>();
  return values.map((value) => {
    const existing = labels.get(value);
    if (existing) return existing;
    const label = `form:${labels.size + 1}`;
    labels.set(value, label);
    return label;
  });
}

/** Longest run of consecutive equal, non-null values. */
export function longestAdjacentRun(
  values: ReadonlyArray<string | null>,
): number {
  let longest = 0;
  let run = 0;
  let previous: string | null = null;
  for (const value of values) {
    run = value !== null && value === previous ? run + 1 : value !== null ? 1 : 0;
    previous = value;
    longest = Math.max(longest, run);
  }
  return longest;
}

export type DomainDestinationVerdict = {
  id: string;
  domain: string;
  name: string;
  href: string;
  failures: string[];
};

/**
 * Decides `VAL-B2-SHELL-007` per canonical domain destination.
 *
 * The population is the module registry's seven domains, not the links the
 * page happened to render: a destination home dropped has to become a
 * failing member, and it can only do that if the members come from the
 * registry. Each one must be present, named exactly as the registry names
 * it, pointed at its own route, carrying its own descriptive text, and
 * visible rather than merely present in the DOM.
 */
export function domainDestinationVerdicts(
  evidence: HomeCompositionEvidence,
  canonical: ReadonlyArray<{ domain: string; name: string; href: string }>,
): DomainDestinationVerdict[] {
  if (canonical.length === 0) {
    throw new Error(
      'the canonical domain population is empty: VAL-B2-SHELL-007 would quantify over nothing',
    );
  }
  return canonical.map(({ domain, name, href }) => {
    const failures: string[] = [];
    const matches = evidence.domainEntries.filter((entry) =>
      sameDestination(entry.href, href),
    );
    // Prose may link a domain under any wording it likes; the claim is that
    // the index carries a canonical entry point, so the members measured
    // below are the links that print the registry name, not every link that
    // happens to point at the route.
    const named = canonicalDomainEntries(matches, name);
    if (matches.length === 0) {
      failures.push(`home renders no entry point for ${href}`);
    } else if (named.length === 0) {
      failures.push(
        `home links to ${href} only as ${matches.map(({ name: label }) => `"${label}"`).join(', ')}, never under the registry name "${name}"`,
      );
    }
    for (const entry of named) {
      if (entry.description.trim().length === 0) {
        failures.push(`the ${href} entry carries no descriptive text`);
      }
      if (entry.heightPx <= 0) {
        failures.push(`the ${href} entry renders with no box, so it is not visible`);
      }
    }
    return {
      id: `domain-destination:${href}`,
      domain,
      name,
      href,
      failures,
    };
  });
}

/**
 * The links to one destination that print its registry name, which are the
 * ones `VAL-B2-SHELL-007` and `VAL-NAV-002` are about.
 */
export function canonicalDomainEntries(
  entries: readonly HomeDomainEntry[],
  name: string,
): HomeDomainEntry[] {
  return entries.filter((entry) => entry.name === name);
}
