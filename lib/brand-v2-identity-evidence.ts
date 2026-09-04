import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { extractBrandV2Assertions } from './brand-v2-enforcement.ts';
import {
  ARTICLE_BODY_COMPUTED_IMPORT,
  deriveEvidenceClosure,
  evidenceClosureGraph,
  routeEntryModules,
} from './brand-v2-evidence-closure.ts';
import { PUBLIC_DESCRIPTOR, PUBLIC_IDENTITY } from './identity.ts';
import { stripComments } from './source-comments.ts';
import { isSyncConflictDuplicate } from './sync-duplicates.ts';

/**
 * Evidence for the six public-identity assertions (`VAL-B2-ID-001` through
 * `VAL-B2-ID-006`), and the fail-closed reader that decides whether that
 * evidence may grant a result.
 *
 * The identity claims are claims about what a browser renders and what a
 * crawler reads, so a source grep cannot decide them: a `text-transform`, a
 * hidden duplicate lockup, or a metadata template can all make the rendered
 * bytes differ from the authored ones while the source still looks correct.
 * The measurement is therefore a two-viewport sweep of the built export
 * (`tests/e2e/brand-v2-identity.spec.ts`), persisted here, and every reader
 * below throws rather than degrade: a stale fingerprint, a missing route, a
 * missing viewport, an empty page, or an unannotated lockup all refuse the
 * evidence instead of returning a weaker claim.
 *
 * Discovery is structural first, annotation second. The sweep finds brand
 * display text by matching every rendered leaf whose text is any spelling in
 * the `robot wiki` family — v1 hyphenated, all-caps, title-hyphenated, and
 * v2 — and only then requires the wordmark role annotation on what it found.
 * A sweep that queried the annotation first could not see an unannotated v1
 * lockup at all, which is the failure the assertion exists to catch.
 */
export const IDENTITY_RUNTIME_EVIDENCE_PATH =
  'evidence/brand-v2/identity-runtime.json';

/** The viewports the sweep must cover, and why each one is load-bearing. */
export const IDENTITY_VIEWPORTS = [
  // Desktop shell: the sidebar lockup renders and the mobile header is
  // display:none, so this pass is the only one that sees the shell wordmark.
  { id: '1440x900', width: 1440, height: 900 },
  // Mobile header: the sidebar is display:none and the compact header
  // lockup renders, so this pass is the only one that sees it.
  { id: '375x812', width: 375, height: 812 },
] as const;

export type IdentityViewportId = (typeof IDENTITY_VIEWPORTS)[number]['id'];

/**
 * Every spelling of the product name a rendered leaf can carry, v1 and v2
 * alike. The sweep discovers with this and the assertion decides with exact
 * equality against `PUBLIC_IDENTITY`, so a non-compliant spelling is found
 * and then failed rather than never being looked at.
 */
export const BRAND_NAME_FAMILY = /^robot[\s\-_]*wiki$/i;

/** The v1 descriptor, in both spellings, anywhere in rendered text. */
export const V1_DESCRIPTOR_PATTERN = /robotics\s+encyclopa?edia/i;

/**
 * The sealed technical identifiers, parsed out of the `VAL-B2-ID-004`
 * requirement row rather than typed here, so the population cannot drift
 * away from the row it is evidence for.
 */
export function deriveTechnicalIdentifiers(requirement: string): string[] {
  // Built from a string rather than written as a regex literal: the repo's
  // comment stripper and source tokenizer are quote-aware but not
  // regex-aware, so a backtick inside a literal would put every scanner that
  // reads this file into template-literal state for the rest of it.
  const backticked = new RegExp('`([^`]+)`', 'g');
  const literals = [...requirement.matchAll(backticked)].map(
    ([, value]) => value,
  );
  if (literals.length === 0) {
    throw new Error(
      'VAL-B2-ID-004 names no backticked technical identifier; the population would be empty',
    );
  }
  return [...new Set(literals)].sort();
}

/**
 * The sealed identifiers, read from the contract row itself so the sweep and
 * the generator quantify over one population rather than two lists that can
 * drift apart.
 */
export function sealedTechnicalIdentifiers(root: string): string[] {
  const requirement = extractBrandV2Assertions(
    readFileSync(join(root, 'contract', 'design-integrity.md'), 'utf8'),
  ).find(({ id }) => id === 'VAL-B2-ID-004')?.requirement;
  if (!requirement) {
    throw new Error('VAL-B2-ID-004 has no requirement row to derive from');
  }
  return deriveTechnicalIdentifiers(requirement);
}

export type IdentityLockupObservation = {
  /** The `data-tektur-role` the lockup carries, or null when unannotated. */
  role: string | null;
  selector: string;
  /**
   * What the reader meets: the element's rendered text with `text-transform`
   * applied and its `::before`/`::after` content included. Not `textContent`,
   * which a stylesheet can leave correct while the page shows something else.
   */
  text: string;
  /** What the document stores, kept only to expose divergence from `text`. */
  domText: string;
  /** Text the lockup's own pseudo-elements add to the render. */
  pseudoText: { before: string; after: string };
  fontFamilyHead: string;
  fontVariationSettings: string;
  textTransform: string;
  /** Tag names of any non-text node rendered inside the lockup. */
  symbolChildren: string[];
  /** Rendered text inside the lockup container that is not the wordmark. */
  descriptorTexts: string[];
};

export type IdentityRouteObservation = {
  route: string;
  viewport: IdentityViewportId;
  /** Every rendered leaf whose text is in the brand-name family. */
  brandDisplayTexts: IdentityLockupObservation[];
  /** Rendered nodes whose whole text is exactly the locked descriptor. */
  exactDescriptorNodes: string[];
  /** Rendered text matching the v1 descriptor in either spelling. */
  v1DescriptorMatches: string[];
  /** Visible text carrying a technical identifier as product identity. */
  technicalIdentifierVisibleMatches: string[];
  /** `<link rel>` icon declarations: a symbol slot the repo must leave empty. */
  iconDeclarations: string[];
  /** Non-text nodes rendered inside a brand lockup. */
  symbolNodesInLockups: string[];
  metadata: {
    title: string;
    description: string | null;
    ogSiteName: string | null;
    ogTitle: string | null;
    ogDescription: string | null;
    ogImageAlt: string | null;
    ogImage: string | null;
    twitterTitle: string | null;
    twitterDescription: string | null;
    canonical: string | null;
  };
  /** Where the footer sends a reader for source; a technical destination. */
  repositoryHref: string | null;
  authorProfileHref: string | null;
  /** Length of the route's rendered text, so an empty page cannot pass. */
  visibleTextLength: number;
};

/**
 * What the built export still carries for one sealed technical identifier.
 *
 * The source scan alone cannot decide `VAL-B2-ID-004`: it proves an
 * identifier is written down, not that anything the product ships still
 * resolves through it. This second population is derived from the shipped
 * bytes instead of from the sources, so the row reconciles two independent
 * measurements, and an identifier that survives in source while every
 * shipped use of it disappeared has an empty witness rather than a pass.
 */
export type TechnicalIdentifierExportWitness = {
  literal: string;
  /** Shipped files whose bytes still carry the identifier. */
  fileCount: number;
  /** The kinds of shipped file carrying it, so the witness names itself. */
  fileKinds: string[];
  occurrences: number;
};

export type IdentityRuntimeEvidence = {
  version: 1;
  fingerprint: string;
  identity: string;
  descriptor: string;
  routes: string[];
  viewports: string[];
  observations: IdentityRouteObservation[];
  /** One row per sealed technical identifier; none of them may be empty. */
  technicalIdentifierWitnesses: TechnicalIdentifierExportWitness[];
};

export type IdentityEvidenceSources = {
  root: string;
  /** Every file that owns a public metadata surface, from the registry. */
  metadataOwnerPaths: string[];
  /** Every file that renders a shell or hero identity lockup. */
  lockupSourcePaths: string[];
};


/**
 * The fingerprint the sweep records and the generator re-derives, over the
 * two locked strings and the bytes of everything any public route reaches.
 *
 * The list this replaces hashed only the registered metadata owners and the
 * modules that define a wordmark role, which is where the identity is
 * *authored* rather than where it can *appear*. The sweep visits all
 * sixty-one routes at two viewports and fails on a legacy public string
 * anywhere in the document, so an article's trajectory instrument, a
 * WebGL-unavailable fallback, the EgoScale figure or an image credit could
 * reintroduce one and the committed artifact still read as current. The
 * registered metadata owners and the role-defining modules stay as entries,
 * so a metadata owner that no route reaches is still covered.
 *
 * Note what a closure does not fix: covering a file is not the same as
 * visiting a state. The sweep loads each route once in its default state,
 * so a fallback that only paints when WebGL is unavailable, and an
 * instrument state that only exists after interaction, are inside the
 * fingerprint and outside the sweep. That gap is recorded honestly rather
 * than closed here; see `IDENTITY_SWEEP_UNVISITED_STATES`.
 */
export function identityEvidenceFingerprint(
  sources: IdentityEvidenceSources,
): string {
  const declared = [
    ...new Set([...sources.metadataOwnerPaths, ...sources.lockupSourcePaths]),
  ].sort();
  if (declared.length === 0) {
    throw new Error(
      'identity fingerprint has no source files: the staleness check would accept any artifact',
    );
  }
  return deriveEvidenceClosure({
    root: sources.root,
    entries: [
      ...routeEntryModules(evidenceClosureGraph(sources.root)),
      ...declared,
      'tests/e2e/brand-v2-identity.spec.ts',
    ],
    facts: [PUBLIC_IDENTITY, PUBLIC_DESCRIPTOR],
    computedSpecifiers: [ARTICLE_BODY_COMPUTED_IMPORT],
  }).fingerprint;
}

/**
 * Identity-bearing render paths the closure covers but the sweep never
 * observes, named so the rows do not read as a complete sweep.
 *
 * Covering a file is not the same as visiting a state, and the two halves
 * of that need separate answers. The closure is the drift half: an edit to
 * either module below invalidates the artifact, so a legacy public string
 * added there cannot ride along on stale evidence. It is not the observation
 * half, and claiming it would be the failure this milestone keeps finding —
 * evidence about something adjacent to its subject.
 *
 * Both entries are measured rather than assumed. The other paths that look
 * like they belong here do not: the EgoScale legend prints the public
 * identity in the default render (`completion fit (Robot Wiki, R² = …)` is
 * in the shipped `frontier/generalization` document), and `Figure` renders
 * its `data-image-credit` line visibly rather than behind a disclosure, so
 * both are inside the residue scan on the routes that carry them.
 */
export const IDENTITY_SWEEP_UNVISITED_STATES = [
  {
    state: 'webgl-unavailable-fallback',
    definedIn: 'components/three/webgl-unavailable.tsx',
    reason:
      'the fallback prints the public identity and paints only when the browser refuses a WebGL context, which the sweep never provokes: the shipped /playground/ document carries none of its text',
  },
  {
    state: 'trajectory-export-format-discriminator',
    definedIn: 'lib/trajectory.ts',
    reason:
      'the robot-atlas-trajectory identifier is written into a downloaded file and never into a document, so no DOM sweep can observe it; VAL-B2-ID-004 covers it through the shipped-bytes witness instead',
  },
] as const;

export type IdentityEvidenceInput = {
  artifact: unknown;
  routes: string[];
  fingerprint: string;
  /** The sealed identifiers the witness rows must cover, exactly. */
  technicalIdentifiers: string[];
};

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${label} is not a string`);
  }
  return value;
}

/**
 * Accepts the persisted sweep only when it is the sweep this tree needs:
 * current fingerprint, both locked strings, exactly the registered public
 * routes in both directions, both viewports for every route, a non-empty
 * rendered page behind every observation, and at least one discovered brand
 * lockup on every route and viewport. Anything else throws.
 */
export function readIdentityRuntimeEvidence(
  input: IdentityEvidenceInput,
): IdentityRuntimeEvidence {
  const artifact = input.artifact as Partial<IdentityRuntimeEvidence>;
  if (!artifact || typeof artifact !== 'object') {
    throw new Error('identity runtime evidence is not an object');
  }
  if (artifact.version !== 1) {
    throw new Error(
      `identity runtime evidence version ${String(artifact.version)} is not 1`,
    );
  }
  if (requireString(artifact.fingerprint, 'fingerprint') !== input.fingerprint) {
    throw new Error(
      'identity runtime evidence is stale: an identity or metadata source changed since the sweep ran. Re-run npm run refresh:brand-v2-evidence.',
    );
  }
  if (artifact.identity !== PUBLIC_IDENTITY) {
    throw new Error(
      `identity runtime evidence measured ${String(artifact.identity)}, not ${PUBLIC_IDENTITY}`,
    );
  }
  if (artifact.descriptor !== PUBLIC_DESCRIPTOR) {
    throw new Error(
      'identity runtime evidence measured a descriptor other than the locked one',
    );
  }
  const expectedRoutes = [...input.routes].sort();
  if (expectedRoutes.length === 0) {
    throw new Error('identity evidence route population is empty');
  }
  const recordedRoutes = [...(artifact.routes ?? [])].sort();
  if (JSON.stringify(recordedRoutes) !== JSON.stringify(expectedRoutes)) {
    throw new Error(
      `identity runtime evidence covers ${recordedRoutes.length} routes, not the ${expectedRoutes.length} registered public routes`,
    );
  }
  const expectedViewports = IDENTITY_VIEWPORTS.map(({ id }) => id);
  if (
    JSON.stringify([...(artifact.viewports ?? [])].sort()) !==
    JSON.stringify([...expectedViewports].sort())
  ) {
    throw new Error(
      'identity runtime evidence does not cover both required viewports',
    );
  }
  const observations = artifact.observations ?? [];
  const seen = new Set<string>();
  for (const observation of observations) {
    const key = `${observation.route}@${observation.viewport}`;
    if (seen.has(key)) {
      throw new Error(`identity runtime evidence records ${key} twice`);
    }
    seen.add(key);
    if (observation.visibleTextLength <= 0) {
      throw new Error(
        `${key} recorded an empty rendered page, so nothing about it was measured`,
      );
    }
    if (observation.brandDisplayTexts.length === 0) {
      throw new Error(
        `${key} discovered no brand display text; every route renders a shell lockup, so the sweep did not measure what it claims`,
      );
    }
  }
  const expectedKeys = expectedRoutes.flatMap((route) =>
    expectedViewports.map((viewport) => `${route}@${viewport}`),
  );
  const missing = expectedKeys.filter((key) => !seen.has(key));
  if (missing.length > 0) {
    throw new Error(
      `identity runtime evidence is missing ${missing.length} route/viewport observations, starting with ${missing[0]}`,
    );
  }
  if (input.technicalIdentifiers.length === 0) {
    throw new Error('sealed technical identifier population is empty');
  }
  const witnesses = artifact.technicalIdentifierWitnesses ?? [];
  const witnessed = [...new Set(witnesses.map(({ literal }) => literal))].sort();
  const expectedLiterals = [...new Set(input.technicalIdentifiers)].sort();
  if (JSON.stringify(witnessed) !== JSON.stringify(expectedLiterals)) {
    throw new Error(
      `identity runtime evidence witnesses ${witnessed.length} technical identifiers in the built export, not the ${expectedLiterals.length} sealed by VAL-B2-ID-004`,
    );
  }
  for (const witness of witnesses) {
    if (witness.fileCount <= 0 || witness.occurrences <= 0) {
      throw new Error(
        `the built export carries no file containing \`${witness.literal}\`, so nothing shipped still resolves through it and an empty witness cannot read as compliance`,
      );
    }
  }
  return artifact as IdentityRuntimeEvidence;
}

export type RouteIdentityVerdict = {
  route: string;
  /** Observations for this route, one per viewport. */
  observations: IdentityRouteObservation[];
  /** Distinct rendered brand display strings across both viewports. */
  renderedNames: string[];
  /** Lockups whose rendered text is not exactly the locked identity. */
  wrongNames: string[];
  /**
   * Lockups the reader meets as the locked identity only because CSS put it
   * there. The stored text is something else, so the source is not compliant
   * and the next stylesheet edit changes the name on the page.
   */
  cssSubstitutedNames: string[];
  /** Discovered lockups carrying no wordmark role annotation. */
  unannotatedLockups: string[];
  /** Rendered strings that are a forbidden v1 identity or descriptor. */
  forbiddenRenders: string[];
  /** Metadata values carrying a forbidden v1 identity or descriptor. */
  forbiddenMetadata: string[];
  /** Distinct wordmark font families resolved across both viewports. */
  wordmarkFamilies: string[];
  lockupCount: number;
};

const FORBIDDEN_IDENTITY_RENDERS = [
  'robot-wiki',
  'ROBOT WIKI',
  'Robot-Wiki',
] as const;

function metadataValues(observation: IdentityRouteObservation): string[] {
  const { metadata } = observation;
  return [
    metadata.title,
    metadata.description,
    metadata.ogSiteName,
    metadata.ogTitle,
    metadata.ogDescription,
    metadata.ogImageAlt,
    metadata.twitterTitle,
    metadata.twitterDescription,
  ].filter((value): value is string => typeof value === 'string');
}

/**
 * A metadata value carries a forbidden identity when a v1 spelling appears
 * as prose rather than inside a URL. `og:image` legitimately points at
 * `/og/robot-wiki.png` and `canonical` at `robot-wiki.com`, which is exactly
 * the separation `VAL-B2-ID-004` requires, so URL-valued fields are not
 * scanned as display text at all.
 */
function forbiddenInMetadata(observation: IdentityRouteObservation): string[] {
  return metadataValues(observation).filter(
    (value) =>
      FORBIDDEN_IDENTITY_RENDERS.some((spelling) => value.includes(spelling)) ||
      V1_DESCRIPTOR_PATTERN.test(value),
  );
}

/**
 * Why a rendered string is not the stored one, named so a failure points at
 * the declaration that caused it rather than at the wordmark generally.
 */
function renderCause(lockup: IdentityLockupObservation): string {
  const causes: string[] = [];
  if (lockup.textTransform && lockup.textTransform !== 'none') {
    causes.push(`text-transform: ${lockup.textTransform}`);
  }
  if (lockup.pseudoText?.before) {
    causes.push(`::before content ${JSON.stringify(lockup.pseudoText.before)}`);
  }
  if (lockup.pseudoText?.after) {
    causes.push(`::after content ${JSON.stringify(lockup.pseudoText.after)}`);
  }
  return causes.join(' and ');
}

export function routeVerdicts(
  evidence: IdentityRuntimeEvidence,
): Map<string, RouteIdentityVerdict> {
  const verdicts = new Map<string, RouteIdentityVerdict>();
  for (const route of evidence.routes) {
    const observations = evidence.observations.filter(
      (observation) => observation.route === route,
    );
    const lockups = observations.flatMap(
      (observation) => observation.brandDisplayTexts,
    );
    verdicts.set(route, {
      route,
      observations,
      renderedNames: [...new Set(lockups.map(({ text }) => text))].sort(),
      wrongNames: [
        ...new Set(
          lockups
            .filter(({ text }) => text !== PUBLIC_IDENTITY)
            .map((lockup) => {
              const cause = renderCause(lockup);
              return `${lockup.selector} renders ${lockup.text}${
                cause ? ` through ${cause}` : ''
              }`;
            }),
        ),
      ].sort(),
      cssSubstitutedNames: [
        ...new Set(
          lockups
            .filter(
              (lockup) =>
                lockup.text === PUBLIC_IDENTITY &&
                lockup.domText !== PUBLIC_IDENTITY,
            )
            .map(
              (lockup) =>
                `${lockup.selector} renders ${PUBLIC_IDENTITY} only through ${
                  renderCause(lockup) || 'CSS'
                }; the document stores ${lockup.domText}`,
            ),
        ),
      ].sort(),
      unannotatedLockups: [
        ...new Set(
          lockups
            .filter(({ role }) => !role?.endsWith('wordmark'))
            .map(({ selector }) => selector),
        ),
      ].sort(),
      forbiddenRenders: [
        ...new Set(
          observations.flatMap((observation) => [
            ...observation.v1DescriptorMatches,
            ...observation.technicalIdentifierVisibleMatches,
          ]),
        ),
      ].sort(),
      forbiddenMetadata: [
        ...new Set(observations.flatMap(forbiddenInMetadata)),
      ].sort(),
      wordmarkFamilies: [
        ...new Set(lockups.map(({ fontFamilyHead }) => fontFamilyHead)),
      ].sort(),
      lockupCount: lockups.length,
    });
  }
  return verdicts;
}

export type DescriptorSurface = {
  id: string;
  /** `rendered` compares the whole node; `metadata` compares the field. */
  kind: 'rendered' | 'metadata';
  route: string;
  sourcePath: string;
  value: string;
};

/**
 * The descriptor surfaces, discovered rather than listed: every rendered
 * text inside a brand lockup that is not the wordmark, plus the site-level
 * description fields owned by the root layout. Routes that legitimately omit
 * the descriptor (design-system 3.5 makes the shell and article lockups
 * omit it) contribute no member, so no row claims to have checked a surface
 * that does not exist.
 */
export function descriptorSurfaces(
  evidence: IdentityRuntimeEvidence,
  siteMetadataOwnerPath: string,
): DescriptorSurface[] {
  const surfaces: DescriptorSurface[] = [];
  const seen = new Set<string>();
  for (const observation of evidence.observations) {
    for (const lockup of observation.brandDisplayTexts) {
      for (const [index, text] of lockup.descriptorTexts.entries()) {
        const id = `descriptor-surface:rendered:${observation.route}:${lockup.role ?? lockup.selector}:${index}`;
        if (seen.has(id)) continue;
        seen.add(id);
        surfaces.push({
          id,
          kind: 'rendered',
          route: observation.route,
          sourcePath: IDENTITY_RUNTIME_EVIDENCE_PATH,
          value: text,
        });
      }
    }
  }
  const site = evidence.observations.find(
    (observation) => observation.route === '/',
  );
  if (!site) {
    throw new Error('the identity sweep did not visit the site root');
  }
  for (const [field, value] of [
    ['description', site.metadata.description],
    ['og:description', site.metadata.ogDescription],
    ['twitter:description', site.metadata.twitterDescription],
  ] as const) {
    if (typeof value !== 'string') {
      throw new Error(`the site root ships no ${field}`);
    }
    surfaces.push({
      id: `descriptor-surface:metadata:/#${field}`,
      kind: 'metadata',
      route: '/',
      sourcePath: siteMetadataOwnerPath,
      value,
    });
  }
  return surfaces.sort((left, right) => left.id.localeCompare(right.id));
}

/**
 * The first-party runtime tree. A technical identifier that survives only in
 * a test fixture or a comment is not still doing technical work, so the
 * occurrence count that decides `VAL-B2-ID-004` is taken from the modules
 * the product actually ships.
 */
const RUNTIME_SOURCE_ROOTS = ['app/', 'components/', 'data/', 'lib/'];
const RUNTIME_SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.css', '.mdx']);

export type TechnicalIdentifierOccurrence = {
  path: string;
  line: number;
  text: string;
};

/**
 * Every occurrence of a sealed technical identifier in tracked first-party
 * runtime source, comments removed. Tracked-only and sync-shadow-filtered so
 * a clean clone reproduces the same count; comment-free so prose about the
 * rename cannot stand in for a live use.
 */
export function deriveTechnicalIdentifierOccurrences(
  root: string,
  literal: string,
): TechnicalIdentifierOccurrence[] {
  const tracked = execFileSync('git', ['ls-files'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
    .split('\n')
    .filter(Boolean)
    .filter((path) => !isSyncConflictDuplicate(path))
    .filter((path) => RUNTIME_SOURCE_ROOTS.some((dir) => path.startsWith(dir)))
    .filter((path) => RUNTIME_SOURCE_EXTENSIONS.has(extname(path)));
  const occurrences: TechnicalIdentifierOccurrence[] = [];
  for (const path of tracked) {
    const source = readFileSync(join(root, path), 'utf8');
    const scanned = extname(path) === '.mdx' ? source : stripComments(source);
    for (const [index, line] of scanned.split('\n').entries()) {
      if (line.includes(literal)) {
        occurrences.push({ path, line: index + 1, text: line.trim() });
      }
    }
  }
  return occurrences;
}

export type TechnicalIdentifierVerdict = {
  id: string;
  literal: string;
  /** Tracked first-party files that still carry the identifier. */
  sourceFiles: string[];
  occurrences: number;
  /** Destinations in the built export that still resolve through it. */
  destinations: string[];
  /** Routes rendering it as visible product identity. Must be empty. */
  displayMatches: string[];
};

/**
 * Which measured destinations still resolve through each identifier.
 *
 * Every recorded URL-valued field is scanned rather than three named ones:
 * a hand-written list of fields is checker vocabulary, and a destination
 * that moves to a field the list does not mention silently stops being
 * looked at. `og:image` at `/og/robot-wiki.png`, `canonical` at
 * `robot-wiki.com` and the footer's repository href are what that separation
 * looks like today, not what it is defined as.
 */
export function technicalIdentifierDestinations(
  literal: string,
  evidence: IdentityRuntimeEvidence,
): string[] {
  const destinations = new Set<string>();
  for (const observation of evidence.observations) {
    const values = [
      ...Object.values(observation.metadata),
      observation.repositoryHref,
      observation.authorProfileHref,
    ];
    for (const value of values) {
      if (typeof value !== 'string' || !value.includes(literal)) continue;
      // Prose carrying the identifier is a display failure, not a technical
      // destination, and `forbiddenMetadata` already fails on it.
      if (!/^(https?:)?\/\//.test(value) && !value.startsWith('/')) continue;
      destinations.add(value);
    }
  }
  return [...destinations].sort();
}

/** Shipped-artifact file kinds a technical identifier can resolve through. */
const EXPORT_TEXT_EXTENSIONS = new Set([
  '.html',
  '.js',
  '.json',
  '.txt',
  '.xml',
  '.css',
  '.webmanifest',
]);

/**
 * The second, independent population behind `VAL-B2-ID-004`: which shipped
 * files still carry each sealed identifier. Derived from the built export
 * rather than from the sources the first population already scanned, so the
 * row reconciles two measurements instead of restating one.
 */
export function deriveTechnicalIdentifierExportWitnesses(
  exportRoot: string,
  literals: readonly string[],
): TechnicalIdentifierExportWitness[] {
  if (literals.length === 0) {
    throw new Error(
      'no sealed technical identifiers to witness: the export scan would be vacuous',
    );
  }
  const tally = new Map(
    literals.map((literal) => [
      literal,
      { fileCount: 0, kinds: new Set<string>(), occurrences: 0 },
    ]),
  );
  const walk = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const full = join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      const extension = extname(entry.name);
      if (!EXPORT_TEXT_EXTENSIONS.has(extension)) continue;
      const source = readFileSync(full, 'utf8');
      for (const literal of literals) {
        const hits = source.split(literal).length - 1;
        if (hits === 0) continue;
        const row = tally.get(literal);
        if (!row) continue;
        row.fileCount += 1;
        row.kinds.add(extension);
        row.occurrences += hits;
      }
    }
  };
  walk(exportRoot);
  return [...literals]
    .sort()
    .map((literal) => {
      const row = tally.get(literal);
      return {
        literal,
        fileCount: row?.fileCount ?? 0,
        fileKinds: [...(row?.kinds ?? [])].sort(),
        occurrences: row?.occurrences ?? 0,
      };
    });
}

/**
 * The witness row for one identifier. Throws rather than returning an empty
 * default: a missing row is the measurement not having happened, which must
 * not be reportable as a technical use that survived.
 */
export function technicalIdentifierWitness(
  literal: string,
  evidence: IdentityRuntimeEvidence,
): TechnicalIdentifierExportWitness {
  const witness = evidence.technicalIdentifierWitnesses.find(
    (row) => row.literal === literal,
  );
  if (!witness) {
    throw new Error(
      `the identity sweep recorded no built-export witness for \`${literal}\``,
    );
  }
  if (witness.fileCount <= 0 || witness.occurrences <= 0) {
    throw new Error(
      `\`${literal}\` occurs in no shipped file of the built export, so no technical use of it survived`,
    );
  }
  return witness;
}
