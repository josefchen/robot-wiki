import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
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

export type IdentityLockupObservation = {
  /** The `data-tektur-role` the lockup carries, or null when unannotated. */
  role: string | null;
  selector: string;
  text: string;
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

export type IdentityRuntimeEvidence = {
  version: 1;
  fingerprint: string;
  identity: string;
  descriptor: string;
  routes: string[];
  viewports: string[];
  observations: IdentityRouteObservation[];
};

export type IdentityEvidenceSources = {
  root: string;
  /** Every file that owns a public metadata surface, from the registry. */
  metadataOwnerPaths: string[];
  /** Every file that renders a shell or hero identity lockup. */
  lockupSourcePaths: string[];
};

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * The fingerprint the sweep records and the generator re-derives. It covers
 * the two locked strings plus the bytes of every file that can change what
 * an identity or metadata surface renders, so editing a route's metadata
 * owner without re-running the sweep is a stale-evidence failure rather than
 * a silently preserved green row.
 */
export function identityEvidenceFingerprint(
  sources: IdentityEvidenceSources,
): string {
  const paths = [
    ...new Set([...sources.metadataOwnerPaths, ...sources.lockupSourcePaths]),
  ].sort();
  if (paths.length === 0) {
    throw new Error(
      'identity fingerprint has no source files: the staleness check would accept any artifact',
    );
  }
  const parts = paths.map(
    (path) => `${path}:${sha256(readFileSync(join(sources.root, path), 'utf8'))}`,
  );
  return sha256(
    [PUBLIC_IDENTITY, PUBLIC_DESCRIPTOR, ...parts].join('\n'),
  );
}

export type IdentityEvidenceInput = {
  artifact: unknown;
  routes: string[];
  fingerprint: string;
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
  return artifact as IdentityRuntimeEvidence;
}

export type RouteIdentityVerdict = {
  route: string;
  /** Observations for this route, one per viewport. */
  observations: IdentityRouteObservation[];
  /** Distinct rendered brand display strings across both viewports. */
  renderedNames: string[];
  /** Lockups whose text is not exactly the locked identity. */
  wrongNames: string[];
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
            .map(({ selector, text }) => `${selector} renders ${text}`),
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
 * Which export-derived destinations prove each identifier is still doing
 * technical work. A `passed` row that only counted source occurrences would
 * accept an identifier that survives in a comment while every real
 * destination moved.
 */
export function technicalIdentifierDestinations(
  literal: string,
  evidence: IdentityRuntimeEvidence,
): string[] {
  const destinations = new Set<string>();
  for (const observation of evidence.observations) {
    for (const value of [
      observation.metadata.canonical,
      observation.metadata.ogImage,
      observation.repositoryHref,
    ]) {
      if (typeof value === 'string' && value.includes(literal)) {
        destinations.add(value);
      }
    }
  }
  return [...destinations].sort();
}
