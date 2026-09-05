import { z } from 'zod';
import {
  SHIPPED_GEOMETRY_MODEL_CLASS,
  WEB_FONT_BINARY_CLASS,
  deriveEvidenceClosure,
} from './brand-v2-evidence-closure.ts';
import {
  numberRecordSchema,
  parseEvidenceArtifact,
} from './brand-v2-evidence-schema.ts';
import {
  SECTION_SIGNATURE_REGISTRY_PATH,
  reconcileSectionSignatures,
  type SectionSignature,
} from './brand-v2-section-signatures.ts';

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

/**
 * The ARIA states a lime highlight may earn its non-colour cue from, the
 * values that are positive assertions of those states, and the roles that
 * may carry each one.
 *
 * The reading this replaces credited the mere *presence* of one of these
 * attributes, so `aria-selected="false"` counted as a cue. A false state is
 * the absence of the thing it names: a screen reader announces nothing for
 * it, and a reader in greyscale or forced colours is left with the lime
 * alone, which is precisely the case the anchor exists to refuse. `mixed` is
 * positive for a tri-state toggle and is announced as such. `aria-current`
 * is a global state, so any element may carry it; `aria-selected` and
 * `aria-pressed` are only announced on the roles that define them, so an
 * `aria-pressed="true"` on a `<span>` is an attribute with no state behind
 * it.
 */
export const HIGHLIGHT_ARIA_STATE_CUES = {
  'aria-current': {
    values: ['page', 'step', 'location', 'date', 'time', 'true'],
    roles: null,
  },
  'aria-selected': {
    values: ['true'],
    roles: [
      'option',
      'tab',
      'row',
      'gridcell',
      'treeitem',
      'columnheader',
      'rowheader',
    ],
  },
  'aria-pressed': { values: ['true', 'mixed'], roles: ['button'] },
} as const satisfies Record<
  string,
  { values: readonly string[]; roles: readonly string[] | null }
>;

/**
 * Implicit ARIA roles for the elements a state cue can sit on, so a role
 * requirement is decided from the element rather than only from an explicit
 * `role` attribute. Kept to the tags that carry one of the states above; an
 * unlisted tag has no implicit role here and satisfies no role requirement.
 */
export const IMPLICIT_ROLE_BY_TAG: Readonly<Record<string, string>> = {
  button: 'button',
  option: 'option',
  summary: 'button',
  th: 'columnheader',
  td: 'cell',
  tr: 'row',
};

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
   * The cue a reader who cannot perceive the lime still gets: the `<mark>`
   * treatment, which a screen reader announces and forced colours preserve,
   * or a positive ARIA state on a role that can carry it. Nothing else
   * counts, and a bare `<span>` painted lime has none.
   */
  nonColourCue: string | null;
  /**
   * ARIA state attributes the element carries that are not cues, with the
   * reason. A false or unsupported state is the absence of the thing it
   * names, and recording it is what lets the verdict say so by name rather
   * than reporting a bare "no cue".
   */
  rejectedStateCues: string[];
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

/**
 * One row of the structural-variety table: what a single top-level section
 * is, in document order, joining what it declares to what is registered for
 * that declaration and to what the browser measured it as.
 *
 * `VAL-DESIGN-009` ("home sections do not all share one structural template")
 * is a negative, and a negative is supported by exhibiting the positive
 * facts it denies rather than by reporting that a search found nothing. The
 * reading this belongs to already computed every part of that support — the
 * declared signature, the registry entry behind it, and the measured form —
 * and then reduced them to a maximum run length and a list of anonymous
 * equivalence-class labels, so the only way to see which section is which
 * was to re-run the sweep. Each row is therefore carried whole, in order,
 * into both the persisted artifact and the generated result.
 */
export type HomeStructureRow = {
  /** Position in document order among `main`'s top-level sections. */
  index: number;
  label: string;
  /** The `data-brand-module-signature` the section declares, if any. */
  declaredSignature: string | null;
  /** Who answers for that signature existing, from the registry. */
  registeredOwner: string | null;
  /** What that structure is for, from the registry. */
  registeredPurpose: string | null;
  /**
   * The measured surface/heading/action/content reading, verbatim: the form
   * the repetition bound actually runs over.
   */
  derivedStructuralForm: string;
  /** The same reading as an equivalence-class label, for reading at a glance. */
  derivedForm: string;
  /** The surface/heading/action prefix as an equivalence-class label. */
  derivedSurfaceHeadingActionForm: string;
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
  /**
   * The ordered structural-variety table, one row per top-level section in
   * document order, persisted rather than recomputed so the support for
   * `VAL-DESIGN-009` can be read off the artifact.
   */
  structureTable: HomeStructureRow[];
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
 * The dependency classes home renders from without importing them.
 *
 * The import closure alone still could not see two of this page's real
 * inputs. The wordmark, every heading and the descriptor are drawn with the
 * checked-in Tektur binary that `app/layout.tsx` names as a path string, and
 * the hardware card's drawing and all five of its printed figures are
 * derived from the shipped URDF that `lib/so101-kinematics.ts` reads off
 * disk. Either could be replaced wholesale while the committed sweep still
 * read as current, which is the same omission a handwritten path list makes.
 */
export const HOME_NON_IMPORT_CLASSES = [
  WEB_FONT_BINARY_CLASS,
  SHIPPED_GEOMETRY_MODEL_CLASS,
] as const;

/**
 * The fingerprint the sweep records and the generator re-derives, over the
 * bytes of the whole home closure, the font binary and shipped model it
 * renders from without importing them, and the exact identity literals the
 * hero has to print. Restyling or rewording the page without re-running the
 * sweep is then a stale-evidence failure rather than a silently preserved
 * green row.
 */
export function homeEvidenceFingerprint(input: {
  root: string;
  identity: string;
  descriptor: string;
}): string {
  return deriveEvidenceClosure({
    root: input.root,
    entries: HOME_CLOSURE_ENTRIES,
    nonImportClasses: HOME_NON_IMPORT_CLASSES,
    facts: [input.identity, input.descriptor],
  }).fingerprint;
}

const sectionObservationSchema = z.object({
  index: z.number(),
  label: z.string(),
  signature: z.string().nullable(),
  derivedSignature: z.string(),
  derivedSurfaceHeadingAction: z.string(),
  headingTag: z.string().nullable(),
  headingSizePx: z.number().nullable(),
});

const structureRowSchema = z.object({
  index: z.number(),
  label: z.string(),
  declaredSignature: z.string().nullable(),
  registeredOwner: z.string().nullable(),
  registeredPurpose: z.string().nullable(),
  derivedStructuralForm: z.string(),
  derivedForm: z.string(),
  derivedSurfaceHeadingActionForm: z.string(),
});

/** The complete nested shape of the persisted home composition sweep. */
export const homeCompositionEvidenceSchema = z.object({
  version: z.literal(1),
  fingerprint: z.string(),
  viewport: z.string(),
  route: z.string(),
  visibleTextLength: z.number(),
  documentScrollWidthPx: z.number(),
  documentClientWidthPx: z.number(),
  heroLockups: z.array(
    z.object({
      index: z.number(),
      text: z.string(),
      fontFamilyHead: z.string(),
      fontSizePx: z.number(),
      lineHeightPx: z.number(),
      heightPx: z.number(),
      renderedLines: z.number(),
      topPx: z.number(),
      bottomPx: z.number(),
      descriptorText: z.string().nullable(),
      descriptorFontFamilyHead: z.string().nullable(),
    }),
  ),
  largestSupportingHeadingPx: z.number().nullable(),
  actions: z.array(
    z.object({
      controlId: z.string().nullable(),
      accessibleName: z.string(),
      href: z.string().nullable(),
      backgroundColour: z.string(),
      colour: z.string(),
      topPx: z.number(),
      bottomPx: z.number(),
    }),
  ),
  highlights: z.array(
    z.object({
      tag: z.string(),
      carriers: z.array(z.string()),
      text: z.string(),
      nonColourCue: z.string().nullable(),
      rejectedStateCues: z.array(z.string()),
      annotation: z.string().nullable(),
      topPx: z.number(),
      bottomPx: z.number(),
    }),
  ),
  domainEntries: z.array(
    z.object({
      name: z.string(),
      href: z.string(),
      description: z.string(),
      topPx: z.number(),
      bottomPx: z.number(),
      heightPx: z.number(),
      bordered: z.boolean(),
    }),
  ),
  sections: z.array(sectionObservationSchema),
  structureTable: z.array(structureRowSchema),
  chromeText: z.string(),
  domainAnchorCounts: numberRecordSchema,
  proseSectionDomainNames: z.array(
    z.object({ label: z.string(), names: z.array(z.string()) }),
  ),
  overviewProse: z.string(),
  progressMetadataMatches: z.array(z.string()),
  borderedCardCount: z.number(),
});

/**
 * Builds the ordered structural-variety table from the measured sections and
 * the signature registry.
 *
 * Exported so the sweep can persist exactly the table the verdict
 * recomputes: the artifact carries the reader-facing evidence, and the
 * verdict re-derives it from the same two inputs and fails when the two
 * disagree, so the persisted table cannot be edited into agreement with a
 * page it no longer describes.
 */
export function homeStructureTable(input: {
  route: string;
  sections: readonly HomeSectionObservation[];
  registry: readonly SectionSignature[];
}): HomeStructureRow[] {
  const registered = new Map(
    input.registry
      .filter(({ route }) => route === input.route)
      .map((entry) => [entry.signature, entry] as const),
  );
  const forms = formLabels(
    input.sections.map(({ derivedSignature }) => derivedSignature),
  );
  const surfaceForms = formLabels(
    input.sections.map(
      ({ derivedSurfaceHeadingAction }) => derivedSurfaceHeadingAction,
    ),
  );
  return input.sections.map((section, index) => {
    const entry = section.signature
      ? (registered.get(section.signature) ?? null)
      : null;
    return {
      index: section.index,
      label: section.label,
      declaredSignature: section.signature,
      registeredOwner: entry?.owner ?? null,
      registeredPurpose: entry?.purpose ?? null,
      derivedStructuralForm: section.derivedSignature,
      derivedForm: forms[index] ?? 'form:0',
      derivedSurfaceHeadingActionForm: surfaceForms[index] ?? 'form:0',
    };
  });
}

/**
 * Accepts the persisted sweep only when it is the sweep this tree needs:
 * current fingerprint, the declared viewport and route, a non-empty rendered
 * page, at least one discovered hero lockup, at least one discovered domain
 * entry, at least one top-level section, and a structural-variety table that
 * describes exactly those sections in their document order. Anything else
 * throws, because a sweep that found nothing is indistinguishable from a
 * page that renders nothing, and only one of those should produce a result.
 */
export function readHomeCompositionEvidence(input: {
  artifact: unknown;
  fingerprint: string;
}): HomeCompositionEvidence {
  const envelope = input.artifact;
  if (!envelope || typeof envelope !== 'object') {
    throw new Error('home composition evidence is not an object');
  }
  const { version, fingerprint } = envelope as {
    version?: unknown;
    fingerprint?: unknown;
  };
  if (version !== 1) {
    throw new Error(
      `home composition evidence version ${String(version)} is not 1`,
    );
  }
  if (fingerprint !== input.fingerprint) {
    throw new Error(
      'home composition evidence is stale: a home source or an identity literal changed since the sweep ran. Re-run npm run refresh:brand-v2-evidence.',
    );
  }
  const artifact = parseEvidenceArtifact(
    homeCompositionEvidenceSchema,
    envelope,
    'home composition evidence',
  );
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
  if (artifact.visibleTextLength <= 0) {
    throw new Error(
      'home composition evidence recorded an empty rendered page, so nothing about it was measured',
    );
  }
  if (artifact.heroLockups.length === 0) {
    throw new Error(
      'home composition evidence discovered no hero lockup: VAL-B2-ID-007 would quantify over an empty population',
    );
  }
  if (artifact.domainEntries.length === 0) {
    throw new Error(
      'home composition evidence discovered no domain entry, so the seven-destination claim was never measured',
    );
  }
  if (artifact.sections.length === 0) {
    throw new Error(
      'home composition evidence discovered no top-level section, so the structure claim was never measured',
    );
  }
  // The table is the reader-facing support for VAL-DESIGN-009, so it has to
  // be about the sections this artifact measured rather than about whatever
  // page it was copied from. Order is part of that: the claim is that
  // adjacent sections differ, and a table in another order says nothing
  // about adjacency.
  if (artifact.structureTable.length !== artifact.sections.length) {
    throw new Error(
      `home composition evidence carries ${artifact.structureTable.length} structural-variety row(s) for ${artifact.sections.length} measured section(s), so the table does not describe the page. Re-run npm run refresh:brand-v2-evidence.`,
    );
  }
  for (const [position, section] of artifact.sections.entries()) {
    const row = artifact.structureTable[position];
    if (
      row.index !== section.index ||
      row.label !== section.label ||
      row.declaredSignature !== section.signature ||
      row.derivedStructuralForm !== section.derivedSignature
    ) {
      throw new Error(
        `structural-variety row ${position} describes "${row.label}" (${String(row.declaredSignature)}) where the sweep measured "${section.label}" (${String(section.signature)}) in that position`,
      );
    }
  }
  return artifact;
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
  sectionSignatures: readonly SectionSignature[],
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
      const rejected = highlight.rejectedStateCues ?? [];
      highlightFailures.push(
        rejected.length > 0
          ? `the highlight on "${highlight.text}" is carried by colour alone: ${rejected.join('; ')}`
          : highlight.annotation
            ? `the highlight on "${highlight.text}" is carried by colour alone: data-brand-highlight="${highlight.annotation}" is an annotation addressed to this sweep, not a cue a reader meets in greyscale or forced colours`
            : `the highlight on "${highlight.text}" is carried by colour alone, with no semantic or shape cue beside it`,
      );
    }
  }

  const signatures = evidence.sections.map(({ signature }) => signature);
  const structureFailures: string[] = [];
  // Which signatures may exist, and what each is for, is decided by a
  // checked-in registry rather than by the string a section types about
  // itself. Reconciled in both directions, so an unregistered signature and
  // an approved structure nobody renders are both failures.
  structureFailures.push(
    ...reconcileSectionSignatures({
      route: evidence.route,
      registry: sectionSignatures,
      measured: evidence.sections.map(({ label, signature }) => ({
        label,
        signature,
      })),
    }),
  );
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
  // The ordered support for VAL-DESIGN-009, rebuilt from the sections and
  // the registry rather than trusted from the artifact, and then compared
  // with what the artifact carries. Persisting a table nobody re-derives
  // would make it prose; re-deriving one nobody persists is what the reading
  // this replaces did, and it left the support unreadable after the run.
  const structureTable = homeStructureTable({
    route: evidence.route,
    sections: evidence.sections,
    registry: sectionSignatures,
  });
  for (const [position, row] of structureTable.entries()) {
    const persisted = evidence.structureTable[position];
    if (JSON.stringify(persisted) !== JSON.stringify(row)) {
      structureFailures.push(
        `structural-variety row ${position} was persisted as ${JSON.stringify(persisted)} where the sections and ${SECTION_SIGNATURE_REGISTRY_PATH} derive ${JSON.stringify(row)}`,
      );
    }
  }
  // The claim stated positively: more than one structural form is present.
  // The run bound alone cannot say this — six sections in three alternating
  // forms and six sections in one form both keep every run at or under the
  // bound if the forms alternate, and one form repeated across all of them
  // is exactly the template VAL-DESIGN-009 forbids.
  const distinctForms = new Set(
    structureTable.map(({ derivedForm }) => derivedForm),
  );
  if (structureTable.length > 1 && distinctForms.size < 2) {
    structureFailures.push(
      `all ${structureTable.length} top-level sections on ${evidence.route} measure one structural form (${structureTable[0]?.derivedStructuralForm ?? 'unknown'}), so the page is one template repeated`,
    );
  }
  for (const row of structureTable) {
    if (row.declaredSignature !== null && row.registeredOwner === null) {
      structureFailures.push(
        `the "${row.label}" section declares "${row.declaredSignature}", which ${SECTION_SIGNATURE_REGISTRY_PATH} gives no owner or purpose, so its row states a structure nobody answers for`,
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
        registeredSignatures: sectionSignatures
          .filter(({ route }) => route === evidence.route)
          .map(({ signature, owner }) => `${signature} (${owner})`),
        // One row per top-level section in document order, carrying what it
        // declares, who registered that declaration and what for, and what
        // it measured as. This is the support VAL-DESIGN-009 rests on, and
        // it is emitted whole so the result states which sections differ
        // and how, rather than only that a maximum run length was not
        // exceeded.
        structuralVarietyTable: structureTable,
        // The measured forms as equivalence-class labels rather than as the
        // long strings themselves: which sections measure alike is the fact
        // the bound is about, and it survives an unrelated restyle.
        derivedForms: structureTable.map(({ derivedForm }) => derivedForm),
        derivedSurfaceHeadingActionForms: structureTable.map(
          ({ derivedSurfaceHeadingActionForm }) =>
            derivedSurfaceHeadingActionForm,
        ),
        distinctStructuralForms: distinctForms.size,
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
