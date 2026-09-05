import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  evidenceResultSchema,
  enforcementMapSchema,
  buildEnforcementPopulationSources,
  extractBrandV2Assertions,
  summarizeEnforcementFailures,
  validateEnforcementCorpus,
  type EvidenceResult,
  type EnforcementMap,
} from '../lib/brand-v2-enforcement.ts';
import {
  readPrimitiveReconciliation,
  type PrimitiveRegistrySlice,
} from '../lib/brand-v2-primitive-reconciliation.ts';
import { BRAND_V2_DEEP_ROWS } from '../lib/brand-v2-runners.ts';
import { assetContentVerdicts } from '../lib/brand-v2-asset-content.ts';
import {
  ASSET_SEAL_PATH,
  readAssetSeal,
  reconcileAssetSeal,
} from '../lib/brand-v2-asset-seal.ts';
import { IMAGES } from '../data/images.ts';
import {
  IDENTITY_RUNTIME_EVIDENCE_PATH,
  deriveTechnicalIdentifierOccurrences,
  identityEvidenceFingerprint,
  IDENTITY_REQUIRED_STATES,
  readIdentityRuntimeEvidence,
  routeVerdicts,
  sealedTechnicalIdentifiers,
  technicalIdentifierDestinations,
  technicalIdentifierWitness,
} from '../lib/brand-v2-identity-evidence.ts';
import {
  IDENTITY_ASSERTION_POPULATION_SOURCES,
  IDENTITY_DESCRIPTOR_POPULATION_SOURCE,
  IDENTITY_FIRST_PARTY_ASSET_POPULATION_SOURCE,
  IDENTITY_TECHNICAL_POPULATION_SOURCE,
  IDENTITY_WORDMARK_ROLE_POPULATION_SOURCE,
  firstPartyVisualAssets,
  identityDescriptorSurfaces,
  expectedIdentitySlots,
  identityLockupSourcePaths,
  identityWordmarkRoles,
} from '../lib/identity-populations.ts';
import {
  SHELL_RUNTIME_EVIDENCE_PATH,
  SHELL_VIEWPORT,
  currentRouteVerdicts,
  ledgerByBaselineMember,
  readShellRuntimeEvidence,
  shellEvidenceFingerprint,
  skipLinkVerdicts,
} from '../lib/brand-v2-shell-evidence.ts';
import {
  MOBILE_SHELL_EVIDENCE_PATH,
  MOBILE_VIEWPORT,
  SCRIM_SEPARATION_FLOOR,
  drawerVerdicts,
  mobileHeaderVerdicts,
  mobileShellEvidenceFingerprint,
  readMobileShellEvidence,
} from '../lib/brand-v2-mobile-shell-evidence.ts';
import {
  SHELL_ASSERTION_POPULATION_SOURCES,
  SHELL_NAV_DESTINATION_POPULATION_SOURCE,
  navigationBaselineMembers,
} from '../lib/shell-populations.ts';
import {
  HOME_COMPOSITION_EVIDENCE_PATH,
  HOME_VIEWPORT,
  canonicalDomainEntries,
  domainDestinationVerdicts,
  heroLockupVerdicts,
  homeCompositionVerdicts,
  homeEvidenceFingerprint,
  readHomeCompositionEvidence,
} from '../lib/brand-v2-home-evidence.ts';
import {
  ARTICLE_RUNTIME_EVIDENCE_PATH,
  ARTICLE_VIEWPORTS,
  articleEvidenceFingerprint,
  articleRuleVerdicts,
  articleTitleVerdicts,
  displayFaceVerdicts,
  homeWordmarkVerdicts,
  linkTreatmentVerdicts,
  proseFaceVerdicts,
  proseResidueVerdicts,
  readArticleRuntimeEvidence,
  readingSheetVerdicts,
  registrationTrackingVerdicts,
  roleFaceVerdicts,
  sectionHeadingMembers,
  sectionHeadingVerdicts,
  titleSheetResidueVerdicts,
  titleSheetVerdicts,
} from '../lib/brand-v2-article-evidence.ts';
import {
  APPARATUS_ASSERTION_POPULATION_SOURCES,
  ARTICLE_ASSERTION_POPULATION_SOURCES,
  HOME_WORDMARK_ROLE_ID,
  HOME_WORDMARK_ROLE_POPULATION_SOURCE,
  SECTION_HEADING_POPULATION_SOURCE,
} from '../lib/article-populations.ts';
import {
  APPARATUS_RUNTIME_EVIDENCE_PATH,
  APPARATUS_VIEWPORTS,
  apparatusEvidenceFingerprint,
  breadcrumbTruthVerdicts,
  citationChipVerdicts,
  furnitureReachVerdicts,
  readApparatusRuntimeEvidence,
  referenceSheetVerdicts,
  relationshipPreservationVerdicts,
  termAffordanceVerdicts,
} from '../lib/brand-v2-apparatus-evidence.ts';
import { readSectionSignatureRegistry } from '../lib/brand-v2-section-signatures.ts';
import {
  HOME_TOOLS_EVIDENCE_PATH,
  homeToolsEvidenceFingerprint,
  readHomeToolsEvidence,
  requiredSweepWidths,
  responsiveOverflowVerdicts,
} from '../lib/brand-v2-home-tools-evidence.ts';
import {
  HOME_ASSERTION_POPULATION_SOURCES,
  HOME_COMPOSITION_ANCHOR_POPULATION_SOURCE,
  HOME_DOMAIN_DESTINATION_POPULATION_SOURCE,
  HOME_HERO_LOCKUP_POPULATION_SOURCE,
  canonicalDomainDestinations,
  homeCompositionAnchorMembers,
  homeHeroLockupMembers,
} from '../lib/home-populations.ts';
import { sha256, stableJson } from '../lib/brand-v2-baseline.ts';
import { PUBLIC_DESCRIPTOR, PUBLIC_IDENTITY } from '../lib/identity.ts';
import { deriveTestTargetInventory } from '../lib/brand-v2-test-inventory.ts';
import { publishedModules } from '../data/modules.ts';
import {
  AUTHORED_TOKEN_SOURCE,
  RENDERER_MIRROR_SOURCE,
  SEMANTIC_COLOUR_ONLY_MARKS_PATH,
  SEMANTIC_ROLE_ASSERTION,
  SEMANTIC_TOKEN_POPULATION_SOURCE,
  TOKEN_ASSERTION_TOKENS,
  TOKEN_RENDERER_EVIDENCE_PATH,
  TOKEN_RUNTIME_EVIDENCE_PATH,
  contrastRatio,
  deriveAuthoredColorTokens,
  deriveContractTokenExpectations,
  deriveRuntimeTokenExpectations,
  deriveSemanticTokenPopulation,
  readTokenRendererEvidence,
  readTokenRuntimeEvidence,
  type SemanticTokenMember,
} from '../lib/brand-v2-token-evidence.ts';
import { TEKTUR_FONT_METADATA } from '../data/tektur-font-metadata.ts';
import { FIRST_PARTY_TYPE_ROLES } from '../data/type-roles.ts';
import {
  TEKTUR_ASSERTION_MODES,
  TEKTUR_DELIVERY_EVIDENCE_PATH,
  fontFamilyKey,
  measureTekturEvidence,
  tekturAssertionEvidence,
} from '../lib/brand-v2-tektur-evidence.ts';
import {
  TEKTUR_ASSIGNED_STRING_POPULATION_SOURCE,
  TEKTUR_BINARY_POPULATION_SOURCE,
  TEKTUR_OG_BINARY_POPULATION_SOURCE,
  TEKTUR_OG_MAPPING_POPULATION_SOURCE,
  TEKTUR_POPULATION_IDS,
  TEKTUR_ROLE_INSTANCE_POPULATION_SOURCE,
  TEKTUR_WEB_BINARY_POPULATION_SOURCE,
} from '../lib/tektur-populations.ts';

const ROOT = process.cwd();
const MAP_PATH = join(ROOT, 'contract', 'brand-v2-enforcement-map.json');
const RESULTS_PATH = join(ROOT, 'evidence', 'brand-v2', 'results.json');
/**
 * The Tektur assertions, routed to the four measurements that decide them.
 *
 * Membership grants nothing. It previously did: the nine IDs were declared
 * complete in a `COMPLETED_TEKTUR_ASSERTIONS` set and the generator then
 * emitted `passed` rows whose payloads were registry and metadata fields, so
 * a route-specific axis defect, a runtime third-party font request, a
 * renderer family mutation or a cmap hole could coexist with freshly
 * regenerated green evidence. Status and payload now come from the persisted
 * all-route browser sweep plus the fontkit binary inspection, its in-memory
 * rejection mutants, and the Open Graph renderer walk, through a reader that
 * throws on stale, incomplete or disagreeing evidence.
 */
const TEKTUR_ASSERTIONS = new Set(Object.keys(TEKTUR_ASSERTION_MODES));
/**
 * The primitive assertions whose evidence is the persisted browser
 * reconciliation (evidence/brand-v2/primitive-reconciliation.json, written
 * by tests/e2e/brand-v2-primitives.spec.ts).
 *
 * Membership here routes an assertion to that artifact; it does not grant a
 * pass. Status is derived per member from what the sweep actually rendered,
 * and a member the sweep never rendered becomes a typed not-applicable row
 * rather than a `passed` one. The previous allowlist did grant the pass: the
 * three IDs were declared complete and the generator then read registry
 * fields and a source regex, so a registered primitive that no route mounts
 * still produced a passing result.
 */
const RECONCILED_PRIMITIVE_ASSERTIONS = new Map<string, PrimitiveRegistryKey>([
  ['VAL-B2-GRID-009', 'gridDevices'],
  ['VAL-B2-SURF-010', 'surfaces'],
  ['VAL-B2-COMP-013', 'controls'],
]);

/**
 * The token assertions, routed to the tokens their own contract rows name.
 *
 * Membership grants nothing. It previously did: the four IDs were declared
 * complete here and the generator then filled each `computed` block by
 * reading the expected colour back out of BRAND_COLORS, so the row asserted
 * that a constant equals itself. Status and payload now come from two
 * persisted measurements — the all-route runtime sweep and the renderer
 * corpus walk — through readers that throw on stale, incomplete or
 * disagreeing evidence.
 */
const TOKEN_ASSERTIONS = new Set(Object.keys(TOKEN_ASSERTION_TOKENS));

/**
 * Whether an assertion's status and payload come from a measurement rather
 * than from the pending-rollout default. It routes; it never grants: every
 * branch below derives the row from an artifact or a re-run inspection, and
 * throws when that evidence is stale, incomplete or disagrees.
 */
function isMeasured(id: string): boolean {
  return (
    TEKTUR_ASSERTIONS.has(id) ||
    RECONCILED_PRIMITIVE_ASSERTIONS.has(id) ||
    TOKEN_ASSERTIONS.has(id) ||
    IDENTITY_ASSERTIONS.has(id) ||
    SHELL_ASSERTIONS.has(id) ||
    MOBILE_SHELL_ASSERTIONS.has(id) ||
    HOME_ASSERTIONS.has(id) ||
    HOME_TOOLS_ASSERTIONS.has(id) ||
    ARTICLE_ASSERTIONS.has(id) ||
    APPARATUS_ASSERTIONS.has(id)
  );
}

/**
 * The wiki-apparatus preservation assertion, routed to the two-width sweep
 * of every published article's rendered furniture.
 *
 * Membership grants nothing. Status and payload come from
 * `evidence/brand-v2/article-apparatus.json` through a reader that throws on
 * a stale fingerprint, the wrong viewports, a route set that disagrees with
 * the derived relationship graph in either direction, a duplicate
 * route/viewport pair, an empty page, an article with no breadcrumb trail or
 * no bibliography, and any missing pair.
 */
const APPARATUS_ASSERTIONS = new Set(
  Object.keys(APPARATUS_ASSERTION_POPULATION_SOURCES),
);

/**
 * The article-sheet and type-hierarchy assertions, routed to the two-width
 * sweep of every public route in the built export.
 *
 * Membership grants nothing. Status and payload come from
 * `evidence/brand-v2/article-typography.json` through a reader that throws
 * on a stale fingerprint, the wrong viewports, a route the registry does not
 * hold, a registry and sweep that disagree about which routes are articles,
 * a duplicate route/viewport pair, an empty page, an article with no reading
 * column, and any missing pair. None of these is decidable from source: a
 * type scale is a computed size, a measure is a width divided by the advance
 * of the paragraph's own font, a link treatment is a painted decoration, and
 * whether a rule lands on its anchor is a difference between two boxes a
 * browser laid out.
 */
const ARTICLE_ASSERTIONS = new Set(
  Object.keys(ARTICLE_ASSERTION_POPULATION_SOURCES),
);

/**
 * The three home-composition assertions, routed to the desktop sweep of the
 * built home page that decides them.
 *
 * Membership grants nothing. Status and payload come from
 * `evidence/brand-v2/home-composition.json` through a reader that throws on
 * a stale fingerprint, the wrong viewport, the wrong route, an empty page, a
 * hero with no lockup, or a sweep that discovered no domain entry and no
 * section. None of the three is decidable from source: whether the hero is
 * dominant is a ratio between two computed font sizes, whether the black
 * action and the lime highlight are in the first major composition is
 * geometry, and whether every domain destination is visible is a fact about
 * boxes a browser laid out.
 */
const HOME_ASSERTIONS = new Set([
  'VAL-B2-ID-007',
  'VAL-B2-SHELL-006',
  'VAL-B2-SHELL-007',
]);

/**
 * The responsive-overflow assertion, routed to the four-width sweep of every
 * public route in the built export.
 *
 * Membership grants nothing. Status and payload come from
 * `evidence/brand-v2/home-tools.json` through a reader that throws on a
 * stale fingerprint, the wrong route or viewport, a sweep with no responsive
 * measurement, and a per-route verdict that throws when a route was measured
 * at fewer than the declared widths. It is not decidable from source: an
 * overflow is a relation between a document's scroll width and the viewport
 * a browser gave it.
 */
const HOME_TOOLS_ASSERTIONS = new Set(['VAL-B2-SHELL-009']);

/**
 * The two mobile shell assertions, routed to the mobile-viewport sweep of
 * the built export that decides them.
 *
 * Membership grants nothing. Status and payload come from
 * `evidence/brand-v2/mobile-shell.json` through a reader that throws on a
 * stale fingerprint, a wrong viewport, a missing route, an empty page, a
 * header the sweep never found, a drawer with no tab stops, a keyboard trace
 * with no destination, or fewer than all three dismissal paths. Neither is
 * decidable from source: whether the header omits the descriptor is a fact
 * about rendered leaf text, and whether the drawer traps focus is a fact
 * about where a real Tab and a real Shift+Tab left `document.activeElement`.
 */
const MOBILE_SHELL_ASSERTIONS = new Set(['VAL-B2-ID-008', 'VAL-B2-SHELL-004']);

/**
 * The desktop shell assertions, routed to the sweep of the built export that
 * decides them.
 *
 * Membership grants nothing. Status and payload come from
 * `evidence/brand-v2/shell-navigation.json` through a reader that throws on
 * a stale fingerprint, a missing route, an empty page, a route with no
 * discovered navigation, or an empty taxonomy ledger. A generator that
 * re-read the class names here would be comparing source with itself; what
 * decides these rows is what a document rendered and what a keyboard reached.
 */
const SHELL_ASSERTIONS = new Set([
  'VAL-B2-SHELL-002',
  'VAL-B2-SHELL-003',
  'VAL-B2-SHELL-005',
]);

type Registry = Parameters<
  typeof buildEnforcementPopulationSources
>[0]['registry'];

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

const REGISTRY = readJson(
  join(ROOT, 'contract', 'brand-v2-registries.json'),
) as Registry & {
  gridDevices: Array<Record<string, unknown>>;
  surfaces: Array<Record<string, unknown>>;
  controls: Array<Record<string, unknown>>;
};
type PrimitiveRegistryKey = 'gridDevices' | 'surfaces' | 'controls';

const RECONCILIATION_PATH = join(
  ROOT,
  'evidence',
  'brand-v2',
  'primitive-reconciliation.json',
);

const RECONCILIATION = readPrimitiveReconciliation({
  artifact: readJson(RECONCILIATION_PATH),
  registry: REGISTRY as unknown as PrimitiveRegistrySlice,
});

const TOKEN_SOURCES = {
  root: ROOT,
  contract: readFileSync(join(ROOT, 'contract', 'design-integrity.md'), 'utf8'),
  css: readFileSync(join(ROOT, AUTHORED_TOKEN_SOURCE), 'utf8'),
};
const TEKTUR_MEASUREMENTS = measureTekturEvidence({
  artifact: readJson(join(ROOT, TEKTUR_DELIVERY_EVIDENCE_PATH)),
  root: ROOT,
  css: TOKEN_SOURCES.css,
});
const PUBLIC_ROUTE_PATH_BY_ID = new Map(
  REGISTRY.routes.public.map(({ id, path }) => [id, path]),
);
const TOKEN_RUNTIME = readTokenRuntimeEvidence({
  artifact: readJson(join(ROOT, TOKEN_RUNTIME_EVIDENCE_PATH)),
  ...TOKEN_SOURCES,
  routes: [...PUBLIC_ROUTE_PATH_BY_ID.values()],
});
const TOKEN_RENDERER = readTokenRendererEvidence({
  artifact: readJson(join(ROOT, TOKEN_RENDERER_EVIDENCE_PATH)),
  ...TOKEN_SOURCES,
  // Counted from the published corpus rather than trusted from the artifact,
  // so a walk that skipped cards cannot certify the cards it never saw.
  cardCount: publishedModules().length + 1,
});
const TOKEN_EXPECTATIONS = deriveContractTokenExpectations(TOKEN_SOURCES);
const RUNTIME_TOKEN_EXPECTATIONS = deriveRuntimeTokenExpectations(TOKEN_SOURCES);
const AUTHORED_TOKENS = deriveAuthoredColorTokens(TOKEN_SOURCES.css);
const SEMANTIC_POPULATION = deriveSemanticTokenPopulation(TOKEN_SOURCES);
const SEMANTIC_MEMBERS = new Map(
  SEMANTIC_POPULATION.map((member) => [member.id, member]),
);
const MIRROR_PARITY = new Map(
  TOKEN_RENDERER.mirrorParity.map((entry) => [entry.token, entry]),
);

/**
 * The public-identity assertions, routed to the two-viewport sweep of the
 * built export that decides them.
 *
 * Membership grants nothing. Status and payload come from
 * `evidence/brand-v2/identity-runtime.json` through a reader that throws on
 * a stale fingerprint, a missing route, a missing viewport, an empty page,
 * or a route with no discovered lockup. A generator that re-read
 * PUBLIC_IDENTITY here would be comparing a constant with itself; what
 * decides these rows is what a document rendered.
 */
const IDENTITY_ASSERTIONS = new Set([
  'VAL-B2-ID-001',
  'VAL-B2-ID-002',
  'VAL-B2-ID-003',
  'VAL-B2-ID-004',
  'VAL-B2-ID-005',
  'VAL-B2-ID-006',
]);

const SITE_METADATA_OWNER_PATH = (() => {
  const site = REGISTRY.metadata.find(
    (row) => (row as unknown as { routeId?: string }).routeId === 'route:/',
  ) as unknown as { ownerPath?: string } | undefined;
  if (!site?.ownerPath) {
    throw new Error('the metadata registry has no owner for route:/');
  }
  return site.ownerPath;
})();

const TECHNICAL_IDENTIFIERS = sealedTechnicalIdentifiers(ROOT);
/**
 * What each route is registered to render, derived here from source rather
 * than read out of the artifact, so the sweep is held to a population it
 * did not get to choose by what it happened to find.
 */
const EXPECTED_IDENTITY_SLOTS = expectedIdentitySlots(
  [...PUBLIC_ROUTE_PATH_BY_ID.values()],
  { root: ROOT },
);
const IDENTITY_EVIDENCE = readIdentityRuntimeEvidence({
  artifact: readJson(join(ROOT, IDENTITY_RUNTIME_EVIDENCE_PATH)),
  routes: [...PUBLIC_ROUTE_PATH_BY_ID.values()],
  technicalIdentifiers: TECHNICAL_IDENTIFIERS,
  expectedSlots: EXPECTED_IDENTITY_SLOTS,
  fingerprint: identityEvidenceFingerprint({
    root: ROOT,
    metadataOwnerPaths: [
      ...new Set(
        REGISTRY.metadata.map(
          (row) => (row as unknown as { ownerPath: string }).ownerPath,
        ),
      ),
    ],
    lockupSourcePaths: identityLockupSourcePaths(),
  }),
});
const IDENTITY_ROUTE_VERDICTS = routeVerdicts(
  IDENTITY_EVIDENCE,
  EXPECTED_IDENTITY_SLOTS,
);
const IDENTITY_SLOT_POPULATION_SOURCE =
  'data/type-roles.json#identityWordmarkRoles x used-import-graph';
const IDENTITY_EXERCISED_STATE_IDS = IDENTITY_REQUIRED_STATES.map(
  ({ state }) => state,
);
const IDENTITY_ROUTE_VERDICT_BY_ID = new Map(
  [...PUBLIC_ROUTE_PATH_BY_ID].map(([id, path]) => {
    const verdict = IDENTITY_ROUTE_VERDICTS.get(path);
    if (!verdict) {
      throw new Error(`the identity sweep did not visit ${path}`);
    }
    return [id, verdict];
  }),
);
const DESCRIPTOR_SURFACES = new Map(
  identityDescriptorSurfaces(IDENTITY_EVIDENCE, SITE_METADATA_OWNER_PATH).map(
    (surface) => [surface.id, surface],
  ),
);
/**
 * A `font-variation-settings` value as sorted `"axis" value` pairs, so a
 * measured setting and a registered one compare on their axes rather than
 * on the order the browser happened to serialize them in.
 */
function serializeVariationAxes(setting: string): string {
  return setting
    .split(',')
    .map((axis) => axis.trim())
    .filter((axis) => axis.length > 0)
    .sort()
    .join(', ');
}

const IDENTITY_WORDMARK_ROLES = new Map(
  identityWordmarkRoles().map((role) => [role.id, role]),
);
/**
 * The runtime face the registered display family is actually published
 * under, taken from the Tektur reconciliation rather than restated here.
 * `next/font/local` serves `Tektur Variable` as the family `tektur`, and
 * that rename is admitted only because a swept document declared the
 * `@font-face` and its same-origin payload hashed to the registered
 * binary. Comparing a lockup's computed head against a hardcoded
 * `Tektur` substring would accept any family whose name contains it.
 */
const DISPLAY_RUNTIME_FACE = (() => {
  const registered = FIRST_PARTY_TYPE_ROLES.filter(({ family }) =>
    fontFamilyKey(family).startsWith(
      fontFamilyKey(TEKTUR_FONT_METADATA.family),
    ),
  );
  if (registered.length !== 1) {
    throw new Error(
      `${registered.length} first-party type roles name the ${TEKTUR_FONT_METADATA.family} family; the identity lockups need exactly one display role`,
    );
  }
  const display = TEKTUR_MEASUREMENTS.families.approved.find(
    ({ roleId }) => roleId === registered[0].id,
  );
  if (!display) {
    throw new Error(
      `The Tektur reconciliation approved no ${registered[0].id} family, so no runtime face is earned for the identity lockups`,
    );
  }
  const runtimeKey = fontFamilyKey(display.runtimeFace);
  return {
    registeredFamily: display.family,
    runtimeKey,
    earnedBy: display.alias
      ? ` by an observed @font-face in ${display.alias.declaredBy.join(', ')} delivering ${display.alias.binarySha256.slice(0, 12)} from ${display.alias.deliveredFrom.join(', ')}`
      : '',
  };
})();
const FIRST_PARTY_VISUAL_ASSETS = new Map(
  firstPartyVisualAssets(
    REGISTRY.assets as unknown as Array<{
      id: string;
      path: string;
      category: string;
    }>,
  ).map((asset) => [asset.id, asset]),
);
const REGISTERED_ASSET_ROWS = new Map(
  (
    REGISTRY.assets as unknown as Array<{
      id: string;
      byteHash: string;
      sourceRegistryId: string | null;
    }>
  ).map((row) => [row.id, row]),
);
/**
 * Every source that owns a metadata surface or renders an identity lockup.
 * An asset referenced from one of these is filling an identity slot whatever
 * its content, so the role clause is checked per asset against these files.
 */
const ASSET_IDENTITY_SOURCE_PATHS = [
  ...new Set([
    ...REGISTRY.metadata.map(
      (row) => (row as unknown as { ownerPath: string }).ownerPath,
    ),
    ...identityLockupSourcePaths(),
  ]),
].sort();
const ASSET_IDENTITY_SOURCE_COUNT = ASSET_IDENTITY_SOURCE_PATHS.length;

/**
 * The approval half of `VAL-B2-ID-006`: exactly which first-party visual
 * assets may ship. Reconciled against the census walk of `public/`, so an
 * asset present in the tree with no sealed entry throws here and stops the
 * corpus, whatever it depicts. This is what decides the row; the content
 * verdict below only describes what a sealed asset is.
 */
const ASSET_SEAL_VERDICTS = reconcileAssetSeal({
  root: ROOT,
  shippedPaths: [...FIRST_PARTY_VISUAL_ASSETS.values()].map(({ path }) => path),
  seal: readAssetSeal(ROOT),
});

/**
 * Per-asset content evidence for `VAL-B2-ID-006`, derived from each asset's
 * own bytes rather than from its filename. The identity-bearing sources are
 * the same registry-derived set the evidence fingerprint uses, so an asset
 * wired into a metadata or lockup surface is caught by the role clause on
 * its own row rather than by a document-wide observation shared by all
 * twenty-one members.
 */
const ASSET_CONTENT_VERDICTS = new Map(
  assetContentVerdicts({
    root: ROOT,
    assets: [...FIRST_PARTY_VISUAL_ASSETS.values()].map((asset) => {
      const row = REGISTERED_ASSET_ROWS.get(asset.id);
      if (!row) {
        throw new Error(`${asset.id} has no registered asset row`);
      }
      return {
        id: asset.id,
        path: asset.path,
        category: asset.category,
        byteHash: row.byteHash,
        sourceRegistryId: row.sourceRegistryId,
      };
    }),
    provenanceById: new Map(
      IMAGES.filter((image) => typeof image.width === 'number').map((image) => [
        image.id,
        {
          sourceName: image.sourceName,
          sourceUrl: image.sourceUrl,
          creator: image.creator,
          licence: image.licence,
          retrieved: image.retrieved,
          width: image.width as number,
          height: image.height as number,
        },
      ]),
    ),
    identitySourcePaths: ASSET_IDENTITY_SOURCE_PATHS,
  }).map((verdict) => [verdict.id, verdict]),
);
const TECHNICAL_IDENTIFIER_BY_MEMBER = new Map(
  TECHNICAL_IDENTIFIERS.map((literal) => [
    `technical-identifier:${literal}`,
    literal,
  ]),
);

const IDENTITY_POPULATIONS: Readonly<Record<string, string[]>> = {
  [IDENTITY_DESCRIPTOR_POPULATION_SOURCE]: [...DESCRIPTOR_SURFACES.keys()],
  [IDENTITY_TECHNICAL_POPULATION_SOURCE]: [
    ...TECHNICAL_IDENTIFIER_BY_MEMBER.keys(),
  ],
  [IDENTITY_WORDMARK_ROLE_POPULATION_SOURCE]: [
    ...IDENTITY_WORDMARK_ROLES.keys(),
  ],
  [IDENTITY_FIRST_PARTY_ASSET_POPULATION_SOURCE]: [
    ...FIRST_PARTY_VISUAL_ASSETS.keys(),
  ],
};

/** Every icon slot and in-lockup symbol node the sweep saw, across all routes. */
const IDENTITY_SYMBOL_SIGHTINGS = IDENTITY_EVIDENCE.observations.flatMap(
  ({ route, iconDeclarations, symbolNodesInLockups }) =>
    [...iconDeclarations, ...symbolNodesInLockups].map(
      (entry) => `${route}: ${entry}`,
    ),
);

const BASELINE = readJson(
  join(ROOT, 'evidence', 'brand-v2', 'baseline', 'baseline.json'),
) as { manifests: Record<string, unknown> };

const NAVIGATION_BASELINE = navigationBaselineMembers(
  BASELINE,
  readJson(join(ROOT, 'contract', 'brand-v2-approved-deltas.json')),
);
const NAVIGATION_BASELINE_BY_ID = new Map(
  NAVIGATION_BASELINE.map((member) => [member.id, member]),
);

const SHELL_EVIDENCE = readShellRuntimeEvidence({
  artifact: readJson(join(ROOT, SHELL_RUNTIME_EVIDENCE_PATH)),
  routes: [...PUBLIC_ROUTE_PATH_BY_ID.values()],
  fingerprint: shellEvidenceFingerprint({
    root: ROOT,
    deviceRegistryRows: REGISTRY.gridDevices as unknown as Array<{
      id: string;
      fingerprint: string;
    }>,
  }),
});
const SHELL_CURRENT_ROUTE_VERDICTS = currentRouteVerdicts(
  SHELL_EVIDENCE,
  (REGISTRY.gridDevices as unknown as Array<{ id: string }>).map(({ id }) => id),
);
const SHELL_SKIP_LINK_VERDICTS = skipLinkVerdicts(SHELL_EVIDENCE);
const SHELL_LEDGER_BY_MEMBER = ledgerByBaselineMember(SHELL_EVIDENCE);

const MOBILE_SHELL_EVIDENCE = readMobileShellEvidence({
  artifact: readJson(join(ROOT, MOBILE_SHELL_EVIDENCE_PATH)),
  routes: [...PUBLIC_ROUTE_PATH_BY_ID.values()],
  fingerprint: mobileShellEvidenceFingerprint({
    root: ROOT,
    deviceRegistryRows: REGISTRY.gridDevices as unknown as Array<{
      id: string;
      fingerprint: string;
    }>,
  }),
});
const MOBILE_HEADER_VERDICTS = mobileHeaderVerdicts(MOBILE_SHELL_EVIDENCE);
const MOBILE_DRAWER_VERDICTS = drawerVerdicts(MOBILE_SHELL_EVIDENCE);

const SHELL_POPULATIONS: Readonly<Record<string, string[]>> = {
  [SHELL_NAV_DESTINATION_POPULATION_SOURCE]: NAVIGATION_BASELINE.map(
    ({ id }) => id,
  ),
};

const ARTICLE_EVIDENCE = readArticleRuntimeEvidence({
  artifact: readJson(join(ROOT, ARTICLE_RUNTIME_EVIDENCE_PATH)),
  routes: [...PUBLIC_ROUTE_PATH_BY_ID.values()],
  articleRoutes: REGISTRY.routes.public
    .filter(({ routeKind }) => routeKind === 'article')
    .map(({ path }) => path),
  fingerprint: articleEvidenceFingerprint({ root: ROOT }),
});


/**
 * One verdict map per assertion, each keyed by the members that assertion
 * quantifies over. The maps are built once so a reading that throws stops
 * the whole corpus rather than one row.
 */
const ARTICLE_VERDICTS = {
  'VAL-B2-ART-001': titleSheetVerdicts(ARTICLE_EVIDENCE),
  'VAL-B2-ART-002': readingSheetVerdicts(ARTICLE_EVIDENCE),
  'VAL-B2-ART-003': linkTreatmentVerdicts(ARTICLE_EVIDENCE),
  'VAL-B2-ART-009': titleSheetResidueVerdicts(ARTICLE_EVIDENCE),
  'VAL-B2-TYPE-003': displayFaceVerdicts(ARTICLE_EVIDENCE),
  'VAL-B2-TYPE-004': proseFaceVerdicts(ARTICLE_EVIDENCE),
  'VAL-B2-TYPE-005': roleFaceVerdicts(ARTICLE_EVIDENCE),
  'VAL-B2-TYPE-006': homeWordmarkVerdicts(ARTICLE_EVIDENCE),
  'VAL-B2-TYPE-007': articleTitleVerdicts(ARTICLE_EVIDENCE),
  'VAL-B2-TYPE-008': proseResidueVerdicts(ARTICLE_EVIDENCE),
  'VAL-B2-TYPE-009': sectionHeadingVerdicts(ARTICLE_EVIDENCE),
  'VAL-B2-TYPE-010': registrationTrackingVerdicts(ARTICLE_EVIDENCE),
} as const satisfies Record<
  string,
  Map<string, { id: string; observed: unknown; failures: string[] }>
>;

// `VAL-DESIGN-018` has no `VAL-B2` row of its own, so it has nowhere to be
// recorded and nothing to turn red. Checking it here is what keeps it
// enforced: an article that drew an unowned rule, or drew a registered one
// off its anchor, stops the corpus from being generated at all.
for (const verdict of articleRuleVerdicts(ARTICLE_EVIDENCE).values()) {
  if (verdict.failures.length > 0) {
    throw new Error(`VAL-DESIGN-018: ${verdict.failures.join('; ')}`);
  }
}

const ARTICLE_POPULATIONS: Readonly<Record<string, string[]>> = {
  [HOME_WORDMARK_ROLE_POPULATION_SOURCE]: [HOME_WORDMARK_ROLE_ID],
  [SECTION_HEADING_POPULATION_SOURCE]: sectionHeadingMembers(ARTICLE_EVIDENCE),
};

const ARTICLE_ROUTES = REGISTRY.routes.public
  .filter(({ routeKind }) => routeKind === 'article')
  .map(({ path }) => path);

const APPARATUS_EVIDENCE = readApparatusRuntimeEvidence({
  artifact: readJson(join(ROOT, APPARATUS_RUNTIME_EVIDENCE_PATH)),
  articleRoutes: ARTICLE_ROUTES,
  fingerprint: apparatusEvidenceFingerprint({ root: ROOT }),
  root: ROOT,
});

const APPARATUS_VERDICTS = {
  'VAL-B2-ART-010': relationshipPreservationVerdicts(APPARATUS_EVIDENCE, ROOT),
} as const satisfies Record<
  string,
  Map<string, { id: string; observed: unknown; failures: string[] }>
>;

// The other five apparatus rows are VAL-WIKI, VAL-GLOSS and VAL-NAV, so they
// have no VAL-B2 row to be recorded in and nothing to turn red. Checking
// them here is what keeps them enforced against the same sweep: a
// bibliography that stopped wrapping at 375px, a crumb that lost its
// non-colour affordance, a furniture link that fell out of the Tab order, a
// term whose definition target went missing, or a chip that stopped naming
// its source stops the corpus from being generated at all.
for (const [assertionId, verdicts] of [
  ['VAL-WIKI-016', breadcrumbTruthVerdicts(APPARATUS_EVIDENCE, ROOT)],
  ['VAL-WIKI-006', referenceSheetVerdicts(APPARATUS_EVIDENCE)],
  ['VAL-WIKI-018', furnitureReachVerdicts(APPARATUS_EVIDENCE)],
  ['VAL-GLOSS-004', termAffordanceVerdicts(APPARATUS_EVIDENCE)],
  ['VAL-NAV-022', citationChipVerdicts(APPARATUS_EVIDENCE)],
] as const) {
  const failures = [...verdicts.values()].flatMap(({ failures: own }) => own);
  if (failures.length > 0) {
    throw new Error(`${assertionId}: ${failures.slice(0, 6).join('; ')}`);
  }
}

const HOME_LITERALS = {
  identity: PUBLIC_IDENTITY,
  descriptor: PUBLIC_DESCRIPTOR,
};
const HOME_EVIDENCE = readHomeCompositionEvidence({
  artifact: readJson(join(ROOT, HOME_COMPOSITION_EVIDENCE_PATH)),
  fingerprint: homeEvidenceFingerprint({ root: ROOT, ...HOME_LITERALS }),
});
const HOME_DOMAIN_DESTINATIONS = canonicalDomainDestinations();
const HOME_HERO_VERDICTS = new Map(
  heroLockupVerdicts(HOME_EVIDENCE, HOME_LITERALS).map((verdict) => [
    verdict.id,
    verdict,
  ]),
);
const HOME_ANCHOR_VERDICTS = new Map(
  homeCompositionVerdicts(
    HOME_EVIDENCE,
    HOME_LITERALS,
    readSectionSignatureRegistry(ROOT),
  ).map((verdict) => [verdict.id as string, verdict]),
);
const HOME_DESTINATION_VERDICTS = new Map(
  domainDestinationVerdicts(HOME_EVIDENCE, HOME_DOMAIN_DESTINATIONS).map(
    (verdict) => [verdict.id, verdict],
  ),
);

const HOME_TOOLS_EVIDENCE = readHomeToolsEvidence({
  artifact: readJson(join(ROOT, HOME_TOOLS_EVIDENCE_PATH)),
  fingerprint: homeToolsEvidenceFingerprint({
    root: ROOT,
    routeIds: REGISTRY.routes.public.map(({ id }) => id),
  }),
});
const HOME_TOOLS_OVERFLOW_VERDICTS = new Map(
  responsiveOverflowVerdicts(HOME_TOOLS_EVIDENCE, REGISTRY.routes.public).map(
    (verdict) => [verdict.id, verdict],
  ),
);

const HOME_POPULATIONS: Readonly<Record<string, string[]>> = {
  [HOME_HERO_LOCKUP_POPULATION_SOURCE]: homeHeroLockupMembers(HOME_EVIDENCE),
  [HOME_COMPOSITION_ANCHOR_POPULATION_SOURCE]: homeCompositionAnchorMembers(),
  [HOME_DOMAIN_DESTINATION_POPULATION_SOURCE]: HOME_DOMAIN_DESTINATIONS.map(
    ({ id }) => id,
  ),
};

function populationSources(assertionIds: string[]) {
  return buildEnforcementPopulationSources({
    registry: REGISTRY,
    baselineManifestIds: Object.keys(BASELINE.manifests).sort(),
    deepRowIds: BRAND_V2_DEEP_ROWS.map(({ id }) => id),
    assertionIds,
    tekturPopulations: TEKTUR_POPULATION_IDS,
    semanticTokenPopulation: SEMANTIC_POPULATION.map(({ id }) => id),
    identityPopulations: IDENTITY_POPULATIONS,
    shellPopulations: SHELL_POPULATIONS,
    homePopulations: HOME_POPULATIONS,
    articlePopulations: ARTICLE_POPULATIONS,
  });
}

function populationSourceFor(id: string): string {
  const identitySource = IDENTITY_ASSERTION_POPULATION_SOURCES[id];
  if (identitySource) return identitySource;
  const shellSource = SHELL_ASSERTION_POPULATION_SOURCES[id];
  if (shellSource) return shellSource;
  const homeSource = HOME_ASSERTION_POPULATION_SOURCES[id];
  if (homeSource) return homeSource;
  const articleSource = ARTICLE_ASSERTION_POPULATION_SOURCES[id];
  if (articleSource) return articleSource;
  const apparatusSource = APPARATUS_ASSERTION_POPULATION_SOURCES[id];
  if (apparatusSource) return apparatusSource;
  if (id === SEMANTIC_ROLE_ASSERTION) {
    return SEMANTIC_TOKEN_POPULATION_SOURCE;
  }
  if (id === 'VAL-B2-TYPE-015') {
    return TEKTUR_ROLE_INSTANCE_POPULATION_SOURCE;
  }
  if (id === 'VAL-B2-TYPE-016') return TEKTUR_OG_MAPPING_POPULATION_SOURCE;
  if (id === 'VAL-B2-TYPE-017') {
    return TEKTUR_ASSIGNED_STRING_POPULATION_SOURCE;
  }
  if (id === 'VAL-B2-TYPE-011') return TEKTUR_WEB_BINARY_POPULATION_SOURCE;
  if (id === 'VAL-B2-TYPE-012') return TEKTUR_OG_BINARY_POPULATION_SOURCE;
  if (
    ['VAL-B2-TYPE-002', 'VAL-B2-TYPE-013', 'VAL-B2-TYPE-014'].includes(id)
  ) {
    return TEKTUR_BINARY_POPULATION_SOURCE;
  }
  const area = id.split('-')[2];
  if (area === 'BASE') {
    return 'evidence/brand-v2/baseline/baseline.json#manifests';
  }
  if (area === 'VIZ') {
    return id === 'VAL-B2-VIZ-012'
      ? 'contract/brand-v2-registries.json#interactive.mounts'
      : 'contract/brand-v2-registries.json#interactive.sources';
  }
  if (area === 'EVID') {
    return 'lib/brand-v2-runners.ts#BRAND_V2_DEEP_ROWS';
  }
  if (area === 'GOV') {
    return 'contract/design-integrity.md#VAL-B2-assertions';
  }
  if (area === 'TYPE') return 'contract/brand-v2-registries.json#typeRoles';
  if (area === 'GRID') return 'contract/brand-v2-registries.json#gridDevices';
  if (area === 'SURF') return 'contract/brand-v2-registries.json#surfaces';
  if (area === 'SPACE') return 'contract/brand-v2-registries.json#pageFrames';
  if (area === 'COMP') return 'contract/brand-v2-registries.json#controls';
  if (area === 'IMG') return 'contract/brand-v2-registries.json#assets';
  if (area === 'OG') return 'contract/brand-v2-registries.json#metadata';
  if (area === 'ART') {
    return 'contract/brand-v2-registries.json#routes.public:article';
  }
  return 'contract/brand-v2-registries.json#routes.public';
}

function modeFor(id: string): EnforcementMap['rows'][number]['enforcementMode'] {
  const area = id.split('-')[2];
  // A token row's evidence is a computed value read out of a live document,
  // and a primitive row's evidence is the persisted browser reconciliation,
  // so both stay browser-state rows rather than becoming source-build ones.
  if (TOKEN_ASSERTIONS.has(id)) return 'browser-state';
  if (RECONCILED_PRIMITIVE_ASSERTIONS.has(id)) return 'browser-state';
  // An identity row's evidence is what a built page rendered at two
  // viewports, so it is a browser-state row even where a supporting clause
  // also counts source occurrences.
  if (IDENTITY_ASSERTIONS.has(id)) return 'browser-state';
  // A shell row's evidence is what a built page rendered and what a keyboard
  // reached on it, so it is a browser-state row. The mobile rows are the
  // same kind of reading at the mobile viewport, with the drawer open.
  if (SHELL_ASSERTIONS.has(id)) return 'browser-state';
  if (MOBILE_SHELL_ASSERTIONS.has(id)) return 'browser-state';
  // An article row's evidence is what the shared template rendered at two
  // widths, down to the advance of the paragraph's own font, so it is a
  // browser-state row.
  if (ARTICLE_ASSERTIONS.has(id)) return 'browser-state';
  // The apparatus row's evidence is the rendered furniture of every
  // published article at two widths, compared against the graph the registry
  // derives, so it is a browser-state row too.
  if (APPARATUS_ASSERTIONS.has(id)) return 'browser-state';
  // A home row's evidence is what the built home page laid out at
  // 1440x900, so it is a browser-state row.
  if (HOME_ASSERTIONS.has(id)) return 'browser-state';
  // The overflow row reads a document's own scroll width against the
  // viewport a browser gave it, on every public route, so it is the same
  // kind of reading at four widths.
  if (HOME_TOOLS_ASSERTIONS.has(id)) return 'browser-state';
  // A Tektur row whose predicate has a runtime clause is decided by the
  // persisted browser sweep, so it is a browser-state row; the three that
  // are entirely about the checked-in binaries stay machine-inspection rows.
  if (TEKTUR_ASSERTIONS.has(id)) return TEKTUR_ASSERTION_MODES[id];
  if (
    ['GOV', 'BASE'].includes(area) ||
    ['VAL-B2-EVID-014', 'VAL-B2-EVID-016'].includes(id)
  ) {
    return 'automated-machine';
  }
  if (area === 'OG') return 'generated-image';
  if (['EVID', 'IMG', 'TYPE', 'COL', 'GRID', 'SURF'].includes(area)) {
    return 'autonomous-visual';
  }
  return 'browser-state';
}

type TestTarget = Extract<
  EnforcementMap['rows'][number]['enforcementTargets'][number],
  { kind: 'test' }
>;

function testTarget(
  file: string,
  title: string,
  mechanism: string,
): TestTarget {
  return { kind: 'test', file, title, mechanism };
}

const CENSUS_ROUTE_TARGET = testTarget(
  'tests/unit/brand-v2-census.test.ts',
  'brand-v2 canonical census > reconciles fixed, domain, and article routes without counting 404 as public',
  'Derives and reconciles the current public-route population; it does not prove the row’s pending visual outcome.',
);
const ROUTE_FLOW_TARGET = testTarget(
  'tests/e2e/brand-v2-route-flows.spec.ts',
  'brand-v2-route-flows › derives and renders every public destination while keeping 404 separate',
  'Executes navigate, history restoration, and per-route browser-render, computed-style, Axe, keyboard, forced-colours, reflow, overflow, resource/font, and residue profiles for every registry-derived public destination; the row’s brand-v2 visual predicate remains pending.',
);
const CENSUS_INTERACTIVE_TARGET = testTarget(
  'tests/unit/brand-v2-census.test.ts',
  'brand-v2 canonical census > derives every interactive source and production mount from repository source',
  'Derives the current interactive source and production-mount populations from repository source and reconciles their registered cases.',
);
const INTERACTIVE_STATE_TARGET = testTarget(
  'tests/e2e/brand-v2-interactive-states.spec.ts',
  'brand-v2 interactive-state runner › reconciles non-empty registry sources, production mounts, controls, and exact cases',
  'Accounts for every registered interactive case and exercises or explicitly classifies its current milestone-1 mechanism; later visual convergence remains pending.',
);
const PRIMITIVE_REGISTRY_TARGET = testTarget(
  'tests/unit/brand-v2-census.test.ts',
  'brand-v2 canonical census > registers complete grid, surface, and control primitive contracts',
  'Validates every primitive registry row has the sealed owner, geometry, state, target-size, and allowed-owner fields with stable fingerprints.',
);
const PRIMITIVE_BROWSER_TARGETS = {
  'VAL-B2-GRID-009': testTarget(
    'tests/e2e/brand-v2-primitives.spec.ts',
    'brand-v2 shared primitive registry › VAL-B2-GRID-009 renders registered, aligned, pointer-inert devices',
    'Sweeps every registered public route plus the market-map view states and checks rendered device IDs against the registry, pointer and ARIA behavior, the sealed 2px alignment bound, and exact equality with the production-mounted registry rows.',
  ),
  'VAL-B2-SURF-010': testTarget(
    'tests/e2e/brand-v2-primitives.spec.ts',
    'brand-v2 shared primitive registry › VAL-B2-SURF-010 source, registry and rendered surface populations are equal',
    'Sweeps every registered public route plus the market-map view states, discovers surfaces structurally, requires an annotation on every discovered member, and asserts the rendered set equals the production-mounted registry rows exactly while rejecting backdrop blur, filters, and coloured glow.',
  ),
  'VAL-B2-COMP-013': testTarget(
    'tests/e2e/brand-v2-primitives.spec.ts',
    'brand-v2 shared primitive registry › VAL-B2-COMP-013 source, registry and rendered control populations reconcile',
    'Sweeps every registered public route plus the market-map view states, discovers controls structurally including keyboard-operable SVG shapes, asserts the rendered set equals the production-mounted registry rows exactly, checks each row owner list against the route-reachable writers, and rejects persistent selected, pressed, or current ARIA on transient controls.',
  ),
} satisfies Record<string, TestTarget>;
const PRIMITIVE_TARGET_SIZE_TARGET = testTarget(
  'tests/e2e/brand-v2-primitives.spec.ts',
  'brand-v2 shared primitive registry › VAL-B2-COMP-014 undersized targets rely only on registered WCAG exceptions',
  'Measures every structurally discovered control against the registered 24px minimum and admits an undersized target only when the SC 2.5.8 exception it satisfies geometrically is the one its registry row records.',
);
const PRIMITIVE_TABLE_REGION_TARGET = testTarget(
  'tests/e2e/brand-v2-primitives.spec.ts',
  'brand-v2 shared primitive registry › VAL-B2-COMP-009 focusable table scroll regions are named regions',
  'Requires every focusable horizontal table-scroll container to expose the region role with a name that resolves to real text.',
);
const BASELINE_TARGET = testTarget(
  'tests/unit/brand-v2-baseline.test.ts',
  'brand-v2 immutable baseline > fails with a tagged omission when one %s member is deleted',
  'Mutates each immutable baseline manifest class and proves an omitted member produces a tagged baseline failure.',
);
const ASSET_TARGET = testTarget(
  'tests/unit/brand-v2-census.test.ts',
  'brand-v2 canonical census > accounts for every physical asset through a registry or narrow identical-byte exception',
  'Reconciles the git-tracked physical-asset population against registered assets and proves missing and unregistered assets fail.',
);
const TEKTUR_BROWSER_TARGET = testTarget(
  'tests/e2e/brand-v2-tektur-font-delivery.spec.ts',
  'Tektur web delivery › loads the local variable face without a third-party request or glyph fallback',
  'Loads the home route at the widest declared viewport, measures the resolved --font-tektur family and the home-wordmark axes, compares Tektur and monospace text advance for every assigned string, and asserts same-origin WOFF2 delivery with no Google-font or static-OG-TTF request.',
);
const TEKTUR_REQUEST_CLASSIFIER_TARGET = testTarget(
  'tests/e2e/brand-v2-tektur-font-delivery.spec.ts',
  'Tektur web delivery › catches a corrupt third-party font payload by response type or request destination, and leaves an unreadable or unidentifiable one unclassified (VAL-B2-TYPE-002)',
  'Plants third-party font requests that carry only one of the three identifying signals — a font response type, a browser font destination, or a font payload signature — requires each on its own to make the request a font, and requires a request that carries none of them, whether its payload cannot be read at all or arrives in a container that identifies neither a font nor a recognized non-font, to stay unclassified rather than be cleared.',
);
const TEKTUR_FAMILY_POPULATION_TARGET = testTarget(
  'tests/e2e/brand-v2-tektur-font-delivery.spec.ts',
  'Tektur web typography population › resolves exactly the four registered first-party families on every route, with bounded scoped exceptions (VAL-B2-TYPE-001)',
  'Reads the computed font-family of every element on every derived route at every declared width and reconciles the resulting head population exactly, in both directions, against the four registered first-party families plus an enumerated scoped-exception vocabulary each of whose members must stay inside rendered mathematics, so a fifth family on an unannotated surface fails.',
);

function tekturUnitTarget(title: string, mechanism: string): TestTarget {
  return testTarget(
    'tests/unit/tektur-fonts.test.ts',
    `Tektur font delivery contract > ${title}`,
    mechanism,
  );
}

const TEKTUR_ROLE_POPULATION_TARGET = testTarget(
  'tests/e2e/brand-v2-tektur-font-delivery.spec.ts',
  'Tektur role population › renders the derived role occurrences with registry axes on every public route at every declared viewport (VAL-B2-TYPE-015)',
  'Loads every registered public destination plus the 404 document at every declared viewport, measures the computed family and wght/wdth axes of every role annotation the page renders, and requires the rendered role set to equal the occurrence set derived from the annotation writers and the used-import graph exactly, per route and per width.',
);
const TEKTUR_ROLE_OWNERSHIP_TARGET = testTarget(
  'tests/e2e/brand-v2-tektur-font-delivery.spec.ts',
  'Tektur role population › registers exactly the roles first-party source writes, each reaching a public route',
  'Reconciles the registered roles with the annotation assignments in first-party source, each row’s definedIn modules with the modules that write it, and requires every role to be reachable from a route entry.',
);
const TEKTUR_BINARY_TARGET = tekturUnitTarget(
  'inspects checksums, formats, axes, static mapping, and cmap coverage (VAL-B2-TYPE-011 through 017)',
  'Opens both binaries with fontkit and verifies checksums, formats, exact axes, the static OG mapping, license metadata, and assigned-string cmap coverage.',
);
const OG_RENDERER_FAMILY_TARGET = testTarget(
  'tests/unit/og-renderer-fonts.test.ts',
  'OG renderer font delivery contract > registers only first-party role families (VAL-B2-TYPE-001)',
  'Requires every registered OG renderer face to carry the family the first-party registry gives the role it claims, pins the registered family list and both stack heads, and rejects a scoped exception family in a first-party role.',
);
const OG_RENDERER_RUN_TARGET = testTarget(
  'tests/unit/og-renderer-fonts.test.ts',
  'OG renderer font delivery contract > walks every shipped card and covers each painted run (VAL-B2-TYPE-011 through 014)',
  'Walks every shipped card and proves each painted run resolves to a registered static face whose cmap covers its code points.',
);

const TEKTUR_EVIDENCE_READER_TARGET = testTarget(
  'tests/unit/brand-v2-tektur-evidence.test.ts',
  'brand-v2 Tektur delivery evidence > rejects stale, truncated, and disagreeing Tektur evidence',
  'Feeds the reader artifacts with a stale fingerprint, a dropped route, a dropped width, a family record built from fewer widths than declared, a removed role, a drifted axis and a missing axis tuple, and requires each to be rejected instead of read as a measurement.',
);
const TEKTUR_FAMILY_READER_TARGET = testTarget(
  'tests/unit/brand-v2-tektur-evidence.test.ts',
  'brand-v2 Tektur delivery evidence > rejects an unapproved or unscoped font family anywhere in the population',
  'Plants a fifth family in the measured population, unscopes an exception face, scopes a face nothing resolved, deletes a registered family, and empties the exception population, and requires each to be rejected.',
);
const TEKTUR_DELIVERY_READER_TARGET = testTarget(
  'tests/unit/brand-v2-tektur-evidence.test.ts',
  'brand-v2 Tektur delivery evidence > rejects a delivery record that hides a third-party request or a fallback glyph',
  'Plants a third-party font request, a foreign-origin route state, a missing bundled WOFF2, a runtime request for the offline OG binary, a zeroed request count, a drifted wordmark axis, an equal-advance glyph probe, an unloaded probe and a short probe population, and requires each to be rejected.',
);

/**
 * Each Tektur row names the gates that decide its own predicate. Naming only
 * the registry-shaped unit test and the single-route delivery spec left the
 * measuring runs — the per-route viewport sweep, the fontkit binary
 * inspection, and the OG renderer walk — unnamed, so a reader could not
 * reach the evidence from the row.
 */
function tekturTargetsFor(id: string): TestTarget[] {
  if (id === 'VAL-B2-TYPE-001') {
    return [
      tekturUnitTarget(
        'registers exactly four first-party families (VAL-B2-TYPE-001, VAL-A11Y-014)',
        'Pins the four first-party families to their display, interface, reading, and data roles.',
      ),
      OG_RENDERER_FAMILY_TARGET,
      // The family row alone inspects registrations; the renderer walk is
      // what proves the shipped corpus paints nothing outside them, so a
      // role-family claim about the OG path names both.
      OG_RENDERER_RUN_TARGET,
      // The population this row quantifies over is the families production
      // typography resolves, not the four registry rows, so the sweep that
      // measures every element's computed family is the deciding gate.
      TEKTUR_FAMILY_POPULATION_TARGET,
      TEKTUR_ROLE_POPULATION_TARGET,
      TEKTUR_BROWSER_TARGET,
    ];
  }
  if (id === 'VAL-B2-TYPE-002') {
    return [
      TEKTUR_BINARY_TARGET,
      TEKTUR_ROLE_POPULATION_TARGET,
      TEKTUR_BROWSER_TARGET,
      // A sweep that admits no third-party font is only as good as what it
      // counts as a font, so the row names the gate that plants third-party
      // requests the payload table alone cannot recognise.
      TEKTUR_REQUEST_CLASSIFIER_TARGET,
    ];
  }
  if (id === 'VAL-B2-TYPE-015') {
    return [
      tekturUnitTarget(
        'registers measurable Tektur role instances and the exact OG mapping (VAL-B2-TYPE-015, VAL-B2-TYPE-016)',
        'Pins all six measurable wght/wdth role instances and the exact static OG role mapping.',
      ),
      TEKTUR_ROLE_POPULATION_TARGET,
      TEKTUR_ROLE_OWNERSHIP_TARGET,
      TEKTUR_BROWSER_TARGET,
    ];
  }
  if (id === 'VAL-B2-TYPE-016') {
    return [
      tekturUnitTarget(
        'registers measurable Tektur role instances and the exact OG mapping (VAL-B2-TYPE-015, VAL-B2-TYPE-016)',
        'Pins all six measurable wght/wdth role instances and the exact static OG role mapping.',
      ),
      TEKTUR_BINARY_TARGET,
      OG_RENDERER_RUN_TARGET,
      TEKTUR_BROWSER_TARGET,
    ];
  }
  if (id === 'VAL-B2-TYPE-017') {
    return [
      tekturUnitTarget(
        'keeps assigned web and OG strings non-empty and code-point addressable (VAL-B2-TYPE-017)',
        'Derives the assigned identity, descriptor, numeral, domain, and article-title string population before cmap inspection.',
      ),
      TEKTUR_BINARY_TARGET,
      OG_RENDERER_RUN_TARGET,
      TEKTUR_BROWSER_TARGET,
    ];
  }
  return [TEKTUR_BINARY_TARGET, OG_RENDERER_RUN_TARGET, TEKTUR_BROWSER_TARGET];
}
const RUNNER_ROUTE_TARGET = testTarget(
  'tests/unit/brand-v2-runners.test.ts',
  'brand-v2 exhaustive runners > derives one non-empty public-route plan member per registry route and keeps 404 separate',
  'Builds a non-empty execution-plan member for every registered public route while keeping the 404 population separate.',
);
const RUNNER_DEEP_TARGET = testTarget(
  'tests/unit/brand-v2-runners.test.ts',
  'brand-v2 exhaustive runners > defines all 27 sealed deep rows with ordered steps and captures',
  'Proves the sealed deep-row inventory has all 27 members with valid ordered steps and captures.',
);
const DEEP_ROW_TARGET = testTarget(
  'tests/e2e/brand-v2-deep-rows.spec.ts',
  'brand-v2 27-row deep executor › enforces all sealed row interactions and capture populations',
  'Executes every sealed deep-row interaction and capture population and enforces exact archived functional failures; full v2 visual parity remains pending.',
);
const ENFORCEMENT_TARGET = testTarget(
  'tests/unit/brand-v2-enforcement.test.ts',
  'brand-v2 enforcement map and evidence schemas > accepts the checked-in map and tagged result corpus',
  'Validates assertion, population, target, result, payload, and pending-migration relationships in the checked-in enforcement corpus.',
);
const OMISSION_PROOF = {
  testFile: 'tests/unit/brand-v2-enforcement.test.ts',
  testTitle:
    'brand-v2 enforcement map and evidence schemas > reports missing-assertion-row when one row is omitted from a two-row map',
  failureReason: 'missing-assertion-row' as const,
};

const TOKEN_MIRROR_TARGET = testTarget(
  'tests/unit/design-system-contract.test.ts',
  'design tokens stay aligned > compares the shared renderer constants against the sealed values',
  'Compares every renderer mirror constant against the sealed palette and against the matching --color-* declaration in app/globals.css, so a wrong mirror literal fails instead of propagating.',
);
const TOKEN_SEMANTIC_TARGET = testTarget(
  'tests/unit/design-system-contract.test.ts',
  'design tokens stay aligned > uses semantic warning colour in warning primitives',
  'Proves the four semantic tokens are distinct from the brand accents, declared in app/globals.css, carried by the badge and callout non-colour cues, and measured at or above WCAG AA against both reading grounds.',
);
const TOKEN_ROUTE_SWEEP_TARGET = testTarget(
  'tests/e2e/brand-v2.spec.ts',
  'brand-v2 core visual authority › every public route resolves the sealed palette exactly',
  'Loads every registered public route, compares the resolved :root colour tokens and their aliases against the contract-derived values exactly, and persists the observation this row reads.',
);
const TOKEN_RENDERER_PARITY_TARGET = testTarget(
  'tests/unit/brand-v2-token-evidence.test.ts',
  'brand-v2 token evidence > records the colours the shipped card corpus paints and the renderer mirror parity',
  'Walks every shipped Open Graph card, records the painted colours and the mirror-versus-authored-stylesheet comparison this row reads, and fails when the artwork paints a value the stylesheet authors for no token.',
);
const TOKEN_EVIDENCE_READER_TARGET = testTarget(
  'tests/unit/brand-v2-token-evidence.test.ts',
  'brand-v2 token evidence > rejects spoofed, stale, and incomplete token evidence',
  'Feeds the readers artifacts with a stale fingerprint, a missing route, an unmeasured property, a disagreeing hex, a wrong card count, and a drifted mirror, and requires each to be rejected.',
);
const TOKEN_RENDER_BOUNDARY_TARGET = testTarget(
  'tests/unit/brand-v2-token-evidence.test.ts',
  'brand-v2 token evidence > the renderer identity over a fixture tree > fails a render boundary that does not hand the opened tree straight to the renderer',
  'Plants a wrapper at the render call site, a wrapper behind a helper, an in-place edit between opening the seal and rendering, a substituted tree, a boundary that never opens the seal, and a generator that bypasses the boundary, and requires each to be rejected, so the painted tree cannot differ from the corpus tree this row measures.',
);
const OG_CARD_SEAL_TARGET = testTarget(
  'tests/unit/og-card-seal.test.ts',
  'the sealed Open Graph card corpus > refuses a card tree edited in place after it was sealed',
  'Proves the corpus handle carries no route to the element tree, that a forged or copied handle is refused, and that a tree edited after sealing can no longer be opened, which is what leaves the render boundary no reachable tree to transform.',
);
const TOKEN_ACCENT_TARGET = testTarget(
  'tests/e2e/brand-v2.spec.ts',
  'brand-v2 core visual authority › runtime signal token resolves to exact v2 blue',
  'Measures the resolved signal, focus, and selection tokens in a live document.',
);
const TOKEN_FOUNDATION_TARGET = testTarget(
  'tests/e2e/brand-v2.spec.ts',
  'brand-v2 core visual authority › runtime paper token resolves to exact v2 foundation',
  'Measures the resolved foundation, semantic, and spacing tokens in a live document.',
);

function tokenTargetsFor(id: string): TestTarget[] {
  // The renderer-parity walk measures the corpus tree. It is decisive for
  // the shipped cards only while the painted tree is that same tree, so
  // every row reading a renderer number also names the two gates that hold
  // the boundary: the source invariant and the runtime seal.
  const renderer = [
    TOKEN_RENDERER_PARITY_TARGET,
    TOKEN_RENDER_BOUNDARY_TARGET,
    OG_CARD_SEAL_TARGET,
  ];
  if (id === SEMANTIC_ROLE_ASSERTION) {
    return [
      TOKEN_MIRROR_TARGET,
      TOKEN_SEMANTIC_TARGET,
      TOKEN_ROUTE_SWEEP_TARGET,
      TOKEN_FOUNDATION_TARGET,
      ...renderer,
      TOKEN_EVIDENCE_READER_TARGET,
    ];
  }
  return [
    TOKEN_MIRROR_TARGET,
    TOKEN_ROUTE_SWEEP_TARGET,
    id === 'VAL-B2-COL-003' ? TOKEN_FOUNDATION_TARGET : TOKEN_ACCENT_TARGET,
    ...renderer,
    TOKEN_EVIDENCE_READER_TARGET,
  ];
}

const IDENTITY_SWEEP_TARGET = testTarget(
  'tests/e2e/brand-v2-identity.spec.ts',
  'brand-v2 public identity › every public route renders the exact v2 identity at both identity viewports',
  'Sweeps every registry-derived public route at the desktop-shell and mobile-header viewports, discovers brand lockups structurally by the whole `robot wiki` spelling family before reading any annotation, and records the rendered names, descriptor slots, wordmark families and axes, icon declarations, in-lockup symbol nodes, and prose metadata that decide the six identity rows.',
);
const IDENTITY_READER_TARGET = testTarget(
  'tests/unit/brand-v2-identity-evidence.test.ts',
  'identity runtime evidence > refuses stale, incomplete, and unmeasured identity evidence',
  'Proves the reader that gates every identity row throws on a stale fingerprint, a missing route, a missing viewport, an empty page, and a route with no discovered lockup, so a green row cannot survive an artifact that did not measure the tree it is committed against.',
);
const ASSET_SEAL_TARGET = testTarget(
  'tests/unit/brand-v2-asset-seal.test.ts',
  'first-party visual asset seal > ships exactly the approved asset set',
  'Reconciles the first-party visual assets discovered by the census walk of public/ against contract/brand-v2-asset-seal.json in both directions and re-hashes every one, and proves the reconciliation refuses an asset present in the tree with no sealed entry, a sealed entry the tree does not ship, and an approved path carrying different bytes — including the wide, labelled robot-head SVG the deleted subject heuristics accepted.',
);

const SHELL_SWEEP_TARGET = testTarget(
  'tests/e2e/brand-v2-shell.spec.ts',
  'brand-v2 desktop shell and navigation › every public route marks its current route, opens on the skip link, and keeps the sealed taxonomy',
  'Sweeps every registry-derived public route at the desktop-shell viewport, collects every element carrying aria-current whatever its tag before reading any annotation, measures the current-route rail against its registered anchor with its colour, width, row height and accessible-name contribution, runs a Tab-then-Enter keyboard trace for the skip link, and hashes the all-expanded taxonomy against the sealed navigation baseline.',
);
const SHELL_READER_TARGET = testTarget(
  'tests/unit/brand-v2-shell-evidence.test.ts',
  'shell runtime evidence > refuses stale, incomplete, and unmeasured shell evidence',
  'Proves the reader that gates every shell row throws on a stale fingerprint, a wrong viewport, a missing route, an empty page, a route with no discovered navigation, and an empty taxonomy ledger, and proves the current-route verdict fails a signal-blue mark, a colour-only difference, an unregistered marker and aria-current on a heading.',
);

const MOBILE_SHELL_SWEEP_TARGET = testTarget(
  'tests/e2e/brand-v2-mobile-shell.spec.ts',
  'brand-v2 mobile header and drawer › every public route omits the descriptor from the compact header and traps the drawer in both directions',
  'Sweeps every registry-derived public route at the mobile-header viewport, discovers the compact lockup structurally by the whole `robot wiki` spelling family before reading any annotation, reads the header leaf text rather than its source, then opens the drawer three times per route: once to press a real Tab off its last stop and a real Shift+Tab off its first and read where focus landed, once to dismiss it with the close control, and once to dismiss it with the scrim, recording which regions the browser made inert and what the scrim composites to against the panel.',
);
const MOBILE_SHELL_READER_TARGET = testTarget(
  'tests/unit/brand-v2-mobile-shell-evidence.test.ts',
  'mobile shell evidence > refuses stale, incomplete, and unmeasured mobile shell evidence',
  'Proves the reader that gates both mobile rows throws on a stale fingerprint, a wrong viewport, a missing route, an empty page, a header the sweep never found, a drawer with no tab stops, a keyboard trace with no destination and a missing dismissal path, and proves the verdicts fail a one-way trap, an escaped skip link, a descriptor in the header and a scrim that composites to the panel colour.',
);

const HOME_SWEEP_TARGET = testTarget(
  'tests/e2e/brand-v2-home.spec.ts',
  'brand-v2 home composition › home renders one dominant lockup, a black action, a lime highlight, and all seven domain destinations',
  'Loads the built home page at 1440x900, discovers its hero lockups both by heading level and by the wordmark type role so a duplicate that is not an h1 is still found, resolves the descriptor by computed font family rather than by class name, finds the lime highlights by computed paint on every element in main rather than by an annotation the page could omit, reads the registered primary action’s composited background and label colour with the pointer parked off the composition, measures every canonical domain row’s box, and records the section signatures, the taxonomy anchor counts and the progress-copy matches.',
);
const HOME_READER_TARGET = testTarget(
  'tests/unit/brand-v2-home-evidence.test.ts',
  'home composition evidence > refuses stale, incomplete, and unmeasured home evidence',
  'Proves the reader that gates all three home rows throws on a stale fingerprint, a wrong version, a wrong viewport, a wrong route, an empty rendered page, a sweep with no hero lockup, no domain entry and no section, and proves the verdicts fail a duplicate lockup, a reworded descriptor, a hero under the dominance ratio, a black action pushed below the fold, a lime mark carried by colour alone, an unregistered section, a four-run of identical signatures, a bordered domain card, a progress phrase and a dropped domain destination.',
);

const HOME_TOOLS_SWEEP_TARGET = testTarget(
  'tests/e2e/brand-v2-home-tools.spec.ts',
  'brand-v2 home live tools and responsive convergence › no public route overflows horizontally at any declared width',
  'Loads every public route in the built export at each width the contract and the design system both declare, and records the document scroll width against the viewport the browser gave it plus every element laid out past that viewport with no scrolling, clipping, or fixed-position ancestor, so an internal-scroll region stays intended and a page that simply grew past the window does not.',
);
const HOME_TOOLS_READER_TARGET = testTarget(
  'tests/unit/brand-v2-home-tools-evidence.test.ts',
  'home tools evidence > refuses stale, incomplete, and unmeasured home tool evidence',
  'Proves the reader that gates the overflow row throws on a stale fingerprint, a wrong version, a wrong route, a wrong viewport, a sweep with no responsive measurement, no sibling mount, no playground graphic and no swept surface, and proves the per-route verdict fails a route measured at fewer than the declared widths as well as one whose document scrolled wider than its viewport.',
);

function testTargetsFor(id: string): TestTarget[] {
  if (HOME_ASSERTIONS.has(id)) {
    return [HOME_SWEEP_TARGET, HOME_READER_TARGET];
  }
  if (HOME_TOOLS_ASSERTIONS.has(id)) {
    return [HOME_TOOLS_SWEEP_TARGET, HOME_TOOLS_READER_TARGET];
  }
  if (IDENTITY_ASSERTIONS.has(id)) {
    return [
      IDENTITY_SWEEP_TARGET,
      IDENTITY_READER_TARGET,
      // ID-006 is decided by the byte seal rather than by the sweep, so the
      // row names the gate that proves the seal refuses an unapproved asset.
      ...(id === 'VAL-B2-ID-006' ? [ASSET_SEAL_TARGET] : []),
    ];
  }
  if (SHELL_ASSERTIONS.has(id)) {
    return [SHELL_SWEEP_TARGET, SHELL_READER_TARGET];
  }
  if (MOBILE_SHELL_ASSERTIONS.has(id)) {
    return [MOBILE_SHELL_SWEEP_TARGET, MOBILE_SHELL_READER_TARGET];
  }
  if (TEKTUR_ASSERTIONS.has(id)) {
    return [
      ...tekturTargetsFor(id),
      // The measuring runs alone would still pass on a stale artifact, so
      // every Tektur row also names the gate that proves the reader refuses
      // one, plus the mutation gate covering its own clause.
      TEKTUR_EVIDENCE_READER_TARGET,
      ...(id === 'VAL-B2-TYPE-001' ? [TEKTUR_FAMILY_READER_TARGET] : []),
      ...([
        'VAL-B2-TYPE-002',
        'VAL-B2-TYPE-011',
        'VAL-B2-TYPE-012',
        'VAL-B2-TYPE-017',
      ].includes(id)
        ? [TEKTUR_DELIVERY_READER_TARGET]
        : []),
    ];
  }
  if (TOKEN_ASSERTIONS.has(id)) return tokenTargetsFor(id);
  if (id in PRIMITIVE_BROWSER_TARGETS) {
    return [
      PRIMITIVE_REGISTRY_TARGET,
      PRIMITIVE_BROWSER_TARGETS[id as keyof typeof PRIMITIVE_BROWSER_TARGETS],
    ];
  }
  const area = id.split('-')[2];
  if (area === 'BASE') return [BASELINE_TARGET];
  if (area === 'CONT') return [CENSUS_ROUTE_TARGET];
  if (area === 'IMG') return [ASSET_TARGET];
  if (area === 'VIZ') {
    return [CENSUS_INTERACTIVE_TARGET, INTERACTIVE_STATE_TARGET];
  }
  if (area === 'GOV' || ['VAL-B2-EVID-014', 'VAL-B2-EVID-016'].includes(id)) {
    return [ENFORCEMENT_TARGET];
  }
  if (area === 'EVID') {
    if (['VAL-B2-EVID-008', 'VAL-B2-EVID-012'].includes(id)) {
      return [RUNNER_ROUTE_TARGET, ROUTE_FLOW_TARGET];
    }
    if (id === 'VAL-B2-EVID-009') return [INTERACTIVE_STATE_TARGET];
    if (id === 'VAL-B2-EVID-010') {
      return [RUNNER_DEEP_TARGET, DEEP_ROW_TARGET];
    }
    if (id === 'VAL-B2-EVID-011') {
      return [
        testTarget(
          'tests/e2e/brand-v2-reflow-320-200.spec.ts',
          'brand-v2-reflow-320-200 › enforces route loading, zoom-equivalent, and text-only profiles for every route',
          'Exercises every registered route under the milestone-1 reflow, zoom-equivalent, and text-only profiles; archived 320px rollout drift remains separate.',
        ),
        testTarget(
          'tests/e2e/brand-v2-reduced-motion.spec.ts',
          'brand-v2-reduced-motion › keeps every registered mount route interactive under reduce',
          'Checks that every registered interactive mount route remains present and operable under reduced motion.',
        ),
        testTarget(
          'tests/e2e/brand-v2-forced-colours.spec.ts',
          'brand-v2-forced-colours › preserves every derived route in forced-colours mode',
          'Visits the derived route population in forced-colours mode and checks current route preservation.',
        ),
        testTarget(
          'tests/e2e/brand-v2-search-states.spec.ts',
          'brand-v2-search-states › covers deterministic results, Methods facet, URL sync, focus retention, and recovery',
          'Exercises the current search-state flow, including deterministic results, facet state, URL sync, focus retention, and recovery.',
        ),
        testTarget(
          'tests/e2e/brand-v2-search-states.spec.ts',
          'brand-v2-search-states › shows the product unavailable state when both search indexes fail',
          'Forces both search indexes unavailable and asserts the product’s unavailable status and visible recovery witness.',
        ),
        testTarget(
          'tests/e2e/brand-v2-search-states.spec.ts',
          'brand-v2-search-states › keeps the later query when an earlier request resolves after it',
          'Issues a second query while the first request remains in flight, resolves the first last, and asserts the later result remains authoritative.',
        ),
      ];
    }
    if (id === 'VAL-B2-EVID-013') {
      return [
        ROUTE_FLOW_TARGET,
        testTarget(
          'tests/e2e/brand-v2-article-interactions.spec.ts',
          'brand-v2-article-interactions › executes the ordered article interaction flow over the derived article population',
          'Executes the ordered article interaction flow over the registry-derived article population.',
        ),
        testTarget(
          'tests/e2e/brand-v2-market-map-states.spec.ts',
          'brand-v2-market-map-states › executes ordered view, filter, selection, and history phases',
          'Executes the registered market-map view, filter, selection, and history phases in order.',
        ),
        testTarget(
          'tests/e2e/brand-v2-playground-states.spec.ts',
          'brand-v2-playground-states › executes ordered FK/IK, import/error, trajectory, and fallback phases',
          'Executes the registered playground FK/IK, import/error, trajectory, and fallback phases in order.',
        ),
      ];
    }
    if (id === 'VAL-B2-EVID-004') {
      return [testTarget(
        'tests/e2e/brand-v2-reference-rubric.spec.ts',
        'brand-v2 reference-feature rubric › article comparison applies literals and article hierarchy without pixels',
        'Applies every independent reference-feature anchor to the article surface and enforces exact archived anchor drift without cross-composition pixel scoring.',
      )];
    }
    if (id === 'VAL-B2-EVID-015') {
      return [testTarget(
        'tests/e2e/brand-v2-reference-rubric.spec.ts',
        'brand-v2 reference-feature rubric › home comparison applies all independent reference anchors',
        'Applies every independent reference-feature anchor to the home surface and enforces exact archived anchor drift without cross-composition pixel scoring.',
      )];
    }
    return [RUNNER_DEEP_TARGET];
  }
  if (id === 'VAL-B2-COMP-014') {
    return [CENSUS_ROUTE_TARGET, ROUTE_FLOW_TARGET, PRIMITIVE_TARGET_SIZE_TARGET];
  }
  if (id === 'VAL-B2-COMP-009') {
    return [CENSUS_ROUTE_TARGET, ROUTE_FLOW_TARGET, PRIMITIVE_TABLE_REGION_TARGET];
  }
  return [CENSUS_ROUTE_TARGET, ROUTE_FLOW_TARGET];
}

const PRIMITIVE_EVIDENCE_FIELDS = {
  'VAL-B2-GRID-009': {
    registryKey: 'gridDevices' as const,
    fields: [
      'ownerSurface',
      'structuralPurpose',
      'anchorGeometry',
      'classification',
      'ariaBehavior',
      'pointerBehavior',
      'allowedViewports',
      'alignmentTolerancePx',
    ],
    tool: 'brand-v2-census + Playwright brand-v2-primitives',
  },
  'VAL-B2-SURF-010': {
    registryKey: 'surfaces' as const,
    fields: [
      'level',
      'stackingPurpose',
      'allowedRadiusPx',
      'border',
      'shadow',
      'allowedOwners',
    ],
    tool: 'brand-v2-census + Playwright brand-v2-primitives',
  },
  'VAL-B2-COMP-013': {
    registryKey: 'controls' as const,
    fields: [
      'action',
      'statePurpose',
      'persistentAria',
      'supportedStates',
      'ownerRouteOrMount',
      'targetSize',
      'pointerAlternative',
    ],
    tool: 'brand-v2-census + Playwright brand-v2-primitives',
  },
} as const;

/**
 * Per-member registry evidence for a reconciled primitive row, read out of
 * the registry record the browser reconciliation matched. A missing field or
 * an unregistered ID throws rather than producing a `passed` row, because a
 * result the generator could emit without the underlying record being
 * complete would be exactly the unfalsifiable evidence this corpus exists to
 * prevent.
 */
function primitiveRegistryEvidence(
  assertionId: string,
  member: string,
): { sourcePath: string; observed: Record<string, unknown>; tool: string } {
  const spec =
    PRIMITIVE_EVIDENCE_FIELDS[
      assertionId as keyof typeof PRIMITIVE_EVIDENCE_FIELDS
    ];
  if (!spec) throw new Error(`No primitive evidence shape for ${assertionId}`);
  const row = REGISTRY[spec.registryKey].find(
    (candidate) => candidate.id === member,
  );
  if (!row) throw new Error(`${assertionId}: ${member} is not registered`);
  const observed: Record<string, unknown> = {};
  for (const field of spec.fields) {
    const value = (row as Record<string, unknown>)[field];
    const empty =
      value === undefined ||
      value === null ||
      (typeof value === 'string' && value.trim().length === 0) ||
      // A control legitimately carries no persistent ARIA; every other listed
      // field is meaningless when empty.
      (Array.isArray(value) &&
        value.length === 0 &&
        field !== 'persistentAria');
    if (empty) throw new Error(`${assertionId}: ${member} records no ${field}`);
    observed[field] = value;
  }
  return {
    sourcePath: 'contract/brand-v2-registries.json',
    observed,
    tool: spec.tool,
  };
}

type TokenResultCommon = {
  resultId: string;
  assertionId: string;
  populationMemberId: string;
  coveredPopulationMemberIds: string[];
  coverageKind: 'per-member' | 'population-wide';
  status: 'passed' | 'pending';
  expected: string;
  actual: string;
  selectorOrRegistryId: string;
  exceptionVerdict: 'none';
};

const AA_CONTRAST = 4.5;

/**
 * One colour assertion, on one public route, from what that route actually
 * resolved in the recorded sweep — plus the renderer mirror comparison for
 * the same token against the authored declaration.
 */
function routeTokenResult(
  common: TokenResultCommon,
  assertionId: string,
  member: string,
): EvidenceResult {
  const route = PUBLIC_ROUTE_PATH_BY_ID.get(member);
  if (route === undefined) {
    throw new Error(`${assertionId}: ${member} is not a registered public route`);
  }
  const observed = TOKEN_RUNTIME.observedByRoute[route];
  if (!observed) {
    throw new Error(
      `${assertionId}: the recorded sweep has no observation for ${route}`,
    );
  }
  const expectations = TOKEN_EXPECTATIONS[assertionId];
  const tokens = new Set(expectations.map(({ token }) => token));
  const properties = Object.values(RUNTIME_TOKEN_EXPECTATIONS).filter(
    (expectation) => tokens.has(expectation.aliasOf ?? expectation.token),
  );
  const resolved: Record<string, string> = {};
  for (const expectation of properties) {
    const value = observed[expectation.property];
    if (value !== expectation.expectedHex) {
      throw new Error(
        `${assertionId}: ${route} resolved ${expectation.property} to ${String(value)} rather than ${expectation.expectedHex}`,
      );
    }
    resolved[expectation.property] = value;
  }
  const rendererMirror: Record<string, string> = {};
  const paintedInCardCorpus: Record<string, number> = {};
  for (const expectation of expectations) {
    const parity = MIRROR_PARITY.get(expectation.token);
    if (!parity) {
      throw new Error(
        `${assertionId}: ${RENDERER_MIRROR_SOURCE} exports no mirror for ${expectation.token}`,
      );
    }
    rendererMirror[expectation.token] = parity.mirror;
    paintedInCardCorpus[expectation.token] =
      TOKEN_RENDERER.paintedByHex[expectation.authoredHex] ?? 0;
  }
  return {
    ...common,
    actual: `${route} resolved ${Object.keys(resolved).length} token properties to the contract values in a sweep of ${TOKEN_RUNTIME.routes.length} public routes, and the renderer mirror matches the authored declaration`,
    payload: {
      kind: 'browser-state',
      computed: {
        route,
        resolved,
        contract: Object.fromEntries(
          expectations.map(({ token, contractHex }) => [token, contractHex]),
        ),
        rendererMirror,
        paintedInCardCorpus,
        cardsWalked: TOKEN_RENDERER.cardCount,
        evidence: [TOKEN_RUNTIME_EVIDENCE_PATH, TOKEN_RENDERER_EVIDENCE_PATH],
      },
    },
  };
}

/**
 * One member of VAL-B2-COMP-012's own population: a semantic token
 * declaration, a module that uses one, or a renderer that mirrors one. The
 * clause each member answers differs, so the payload differs: a declaration
 * records distinctness and measured contrast, a use site records the
 * non-colour cue carried beside the hue, and a renderer records mirror
 * parity against the authored stylesheet.
 */
function semanticTokenResult(
  common: TokenResultCommon,
  memberId: string,
): EvidenceResult {
  const member = SEMANTIC_MEMBERS.get(memberId) as SemanticTokenMember;
  if (!member) {
    throw new Error(
      `${SEMANTIC_ROLE_ASSERTION}: ${memberId} is not a semantic-token population member`,
    );
  }
  const authoredHex = AUTHORED_TOKENS.hexByToken[member.token];
  const parity = MIRROR_PARITY.get(member.token);
  if (authoredHex === undefined || !parity) {
    throw new Error(
      `${SEMANTIC_ROLE_ASSERTION}: ${member.token} has no authored declaration or renderer mirror`,
    );
  }
  const routesResolved = TOKEN_RUNTIME.routes.filter(
    (route) =>
      TOKEN_RUNTIME.observedByRoute[route][`--color-${member.token}`] ===
      authoredHex,
  ).length;
  if (routesResolved !== TOKEN_RUNTIME.routes.length) {
    throw new Error(
      `${SEMANTIC_ROLE_ASSERTION}: --color-${member.token} resolved to ${authoredHex} on ${routesResolved} of ${TOKEN_RUNTIME.routes.length} swept routes`,
    );
  }
  if (member.kind === 'declaration') {
    const accents = Object.entries(AUTHORED_TOKENS.hexByToken).filter(
      ([token, hex]) =>
        hex === authoredHex &&
        token !== member.token &&
        AUTHORED_TOKENS.aliasTargetByToken[token] !== member.token,
    );
    if (accents.length > 0) {
      throw new Error(
        `--color-${member.token} shares ${authoredHex} with ${accents.map(([token]) => token).join(', ')}, so it is not separate from the other tokens`,
      );
    }
    const grounds = { paper: 'paper', surface: 'white' } as const;
    const contrast: Record<string, number> = {};
    for (const [label, ground] of Object.entries(grounds)) {
      const groundHex = AUTHORED_TOKENS.hexByToken[ground];
      if (groundHex === undefined) {
        throw new Error(`${AUTHORED_TOKEN_SOURCE} authors no --color-${ground}`);
      }
      const ratio = contrastRatio(authoredHex, groundHex);
      if (ratio < AA_CONTRAST) {
        throw new Error(
          `--color-${member.token} measures ${ratio.toFixed(2)}:1 on ${label}, below WCAG AA`,
        );
      }
      contrast[`${label}:${groundHex}`] = Number(ratio.toFixed(2));
    }
    return {
      ...common,
      actual: `declared as ${authoredHex}, distinct from every other authored colour token, at or above WCAG AA on both reading grounds, and resolved on all ${routesResolved} swept public routes`,
      payload: {
        kind: 'browser-state',
        computed: {
          member: member.id,
          token: member.token,
          declaration: member.forms,
          authored: authoredHex,
          rendererMirror: parity.mirror,
          contrastRatios: contrast,
          routesResolved,
          evidence: [TOKEN_RUNTIME_EVIDENCE_PATH, TOKEN_RENDERER_EVIDENCE_PATH],
        },
      },
    };
  }
  if (member.kind === 'renderer') {
    return {
      ...common,
      actual: `${member.module} mirrors ${member.token} as ${parity.mirror}, which equals the ${authoredHex} authored in ${AUTHORED_TOKEN_SOURCE}`,
      payload: {
        kind: 'browser-state',
        computed: {
          member: member.id,
          token: member.token,
          module: member.module,
          forms: member.forms,
          references: member.references,
          rendererMirror: parity.mirror,
          authored: authoredHex,
          paintedInCardCorpus:
            TOKEN_RENDERER.paintedByHex[authoredHex] ?? 0,
          evidence: [TOKEN_RENDERER_EVIDENCE_PATH],
        },
      },
    };
  }
  const cueSubject = {
    member: member.id,
    token: member.token,
    module: member.module,
    forms: member.forms,
    references: member.references,
    viaAlias: member.viaAlias,
    authored: authoredHex,
    marks: member.marks.map(({ id, element, binding, via, cues }) => ({
      id,
      element,
      binding,
      via,
      cues,
    })),
    colourOnlyMarks: member.colourOnlyMarks,
    routesResolved,
    evidence: [TOKEN_RUNTIME_EVIDENCE_PATH, SEMANTIC_COLOUR_ONLY_MARKS_PATH],
  };
  // A mark measured to carry the hue alone is not an unmeasured mark, and it
  // is not a pass either. The cue clause is unsatisfied for it, the exact set
  // is archived, and the remediation belongs to the interactive legends
  // feature that owns chart series differentiation.
  if (member.colourOnlyMarks.length > 0) {
    return {
      ...common,
      status: 'pending' as const,
      actual: `${member.module} paints ${member.token} on ${member.marks.length} marks; ${member.colourOnlyMarks.length} of them (${member.colourOnlyMarks.join(', ')}) carry the hue with no non-colour cue of their own, so the text/icon/shape clause is unsatisfied for those marks`,
      payload: {
        kind: 'browser-state',
        computed: {
          ...cueSubject,
          deferredTo: 'brand-v2-interactive-data-legends-and-render-parity',
        },
      },
    };
  }
  return {
    ...common,
    actual: `${member.module} uses ${member.token} through ${member.forms.join(', ')} on ${member.marks.length} marks, each carrying its own non-colour cue (${[
      ...new Set(member.marks.flatMap(({ cues }) => cues)),
    ]
      .sort()
      .join(', ')}), and the token resolved on all ${routesResolved} swept public routes`,
    payload: { kind: 'browser-state', computed: cueSubject },
  };
}

type IdentityEvidence = {
  actual: string;
  computed: Record<string, unknown>;
};

/**
 * What each identity assertion actually observed about one member. Every
 * branch reads the persisted sweep (or, for the Open Graph clause of
 * `VAL-B2-ID-005`, the persisted Tektur measurement) and throws rather than
 * describe a member it has no observation for. A clause that fails throws
 * too: this generator has no way to emit a red row, so refusing to write is
 * how a real defect stops the build.
 */
function identityAssertionEvidence(
  assertionId: string,
  member: string,
): IdentityEvidence {
  const viewports = IDENTITY_EVIDENCE.viewports.join(' and ');
  if (assertionId === 'VAL-B2-ID-001' || assertionId === 'VAL-B2-ID-003') {
    const verdict = IDENTITY_ROUTE_VERDICT_BY_ID.get(member);
    if (!verdict) {
      throw new Error(`${assertionId}: ${member} has no identity observation`);
    }
    const failures =
      assertionId === 'VAL-B2-ID-001'
        ? [
            // Registration-derived, so a lockup renamed out of the spelling
            // family is still answered for rather than dropped.
            ...verdict.missingSlots,
            ...verdict.renamedSlots,
            ...verdict.wrongNames,
            ...verdict.cssSubstitutedNames,
            ...verdict.unannotatedLockups,
            // Structure-derived, so a lockup that is stripped of its role
            // *and* renamed past the spelling family is answered for by the
            // position it is rendered in rather than dropped by both of the
            // populations above.
            ...verdict.unannotatedStructuralSlots,
            ...verdict.misnamedStructuralSlots,
          ]
        : [...verdict.forbiddenRenders, ...verdict.forbiddenMetadata];
    if (failures.length > 0) {
      throw new Error(
        `${assertionId}: ${verdict.route} failed on ${failures.join('; ')}`,
      );
    }
    const computed = {
      route: verdict.route,
      viewports: IDENTITY_EVIDENCE.viewports,
      expectedWordmarkRoles: verdict.expectedRoles,
      slotPopulationSource: IDENTITY_SLOT_POPULATION_SOURCE,
      lockupsDiscovered: verdict.lockupCount,
      structuralBrandSlots: verdict.structuralSlots,
      renderedNames: verdict.renderedNames,
      forbiddenRenders: verdict.forbiddenRenders,
      forbiddenMetadata: verdict.forbiddenMetadata,
      statesExercised: IDENTITY_EXERCISED_STATE_IDS,
      evidence: [IDENTITY_RUNTIME_EVIDENCE_PATH],
    };
    return assertionId === 'VAL-B2-ID-001'
      ? {
          actual: `${verdict.route} painted every identity slot its modules are registered to render (${verdict.expectedRoles.join(', ')}) at ${viewports}, each one exactly \`${PUBLIC_IDENTITY}\`; the ${verdict.lockupCount} lockup(s) also discovered by the whole \`robot wiki\` spelling family are the same string and carry a registered wordmark role; and the ${verdict.structuralSlots.length} brand slot(s) the page structure puts a lockup in, derived from position and shape without consulting either the annotation or the text, are all annotated with a registered wordmark role and all render exactly \`${PUBLIC_IDENTITY}\``,
          computed,
        }
      : {
          actual: `${verdict.route} rendered no v1 identity spelling and no v1 descriptor in ${verdict.observations.reduce((total, { visibleTextLength }) => total + visibleTextLength, 0)} characters of visible text across ${viewports}, and no prose metadata field carries one; the ${IDENTITY_EXERCISED_STATE_IDS.length} identity-bearing states the default load does not reach (${IDENTITY_EXERCISED_STATE_IDS.join(', ')}) were provoked and swept the same way`,
          computed,
        };
  }
  if (assertionId === 'VAL-B2-ID-002') {
    const surface = DESCRIPTOR_SURFACES.get(member);
    if (!surface) {
      throw new Error(`${assertionId}: ${member} is not a descriptor surface`);
    }
    // A rendered descriptor slot is the descriptor and nothing else; a
    // metadata field may frame it (og:image:alt names the card it describes),
    // so the byte sequence must appear verbatim inside it.
    const exact =
      surface.kind === 'rendered'
        ? surface.value === PUBLIC_DESCRIPTOR
        : surface.value.includes(PUBLIC_DESCRIPTOR);
    if (!exact) {
      throw new Error(
        `${assertionId}: ${member} carries "${surface.value}", not the locked descriptor`,
      );
    }
    return {
      actual:
        surface.kind === 'rendered'
          ? `${surface.id} renders exactly the locked descriptor, byte for byte, on ${surface.route}`
          : `${surface.id} ships the locked descriptor verbatim from ${surface.sourcePath}`,
      computed: {
        surfaceKind: surface.kind,
        route: surface.route,
        sourcePath: surface.sourcePath,
        value: surface.value,
        evidence: [IDENTITY_RUNTIME_EVIDENCE_PATH],
      },
    };
  }
  if (assertionId === 'VAL-B2-ID-004') {
    const literal = TECHNICAL_IDENTIFIER_BY_MEMBER.get(member);
    if (!literal) {
      throw new Error(
        `${assertionId}: ${member} is not a sealed technical identifier`,
      );
    }
    const occurrences = deriveTechnicalIdentifierOccurrences(ROOT, literal);
    if (occurrences.length === 0) {
      throw new Error(
        `${assertionId}: \`${literal}\` no longer occurs in first-party runtime source, so the public-display migration altered a technical identifier`,
      );
    }
    const displayMatches = [
      ...new Set(
        IDENTITY_EVIDENCE.observations.flatMap(
          ({ route, technicalIdentifierVisibleMatches }) =>
            technicalIdentifierVisibleMatches
              .filter((line) => line.includes(literal))
              .map((line) => `${route}: ${line}`),
        ),
      ),
    ];
    if (displayMatches.length > 0) {
      throw new Error(
        `${assertionId}: \`${literal}\` renders as visible product identity on ${displayMatches.join('; ')}`,
      );
    }
    const destinations = technicalIdentifierDestinations(
      literal,
      IDENTITY_EVIDENCE,
    );
    // Throws on an absent or empty row: the source scan proves the
    // identifier is written down, and this proves something the product
    // ships still resolves through it. A row that reported the first
    // population alone accepted an identifier whose every shipped use had
    // gone, because zero destinations read as compliance.
    const witness = technicalIdentifierWitness(literal, IDENTITY_EVIDENCE);
    const files = [...new Set(occurrences.map(({ path }) => path))].sort();
    return {
      actual: `\`${literal}\` still resolves ${occurrences.length} comment-free use(s) across ${files.length} first-party runtime file(s) and ${witness.occurrences} use(s) across ${witness.fileCount} shipped ${witness.fileKinds.join('/')} file(s) of the built export${destinations.length > 0 ? `, including ${destinations.length} measured destination(s)` : ''}, and renders nowhere as visible product identity across ${IDENTITY_EVIDENCE.routes.length} routes at ${viewports}`,
      computed: {
        literal,
        occurrences: occurrences.length,
        files,
        destinations,
        exportFileCount: witness.fileCount,
        exportFileKinds: witness.fileKinds,
        exportOccurrences: witness.occurrences,
        displayMatches,
        evidence: [IDENTITY_RUNTIME_EVIDENCE_PATH],
      },
    };
  }
  if (assertionId === 'VAL-B2-ID-005') {
    const role = IDENTITY_WORDMARK_ROLES.get(member);
    if (!role) {
      throw new Error(`${assertionId}: ${member} is not an identity surface`);
    }
    if (role.kind === 'og-static-instance') {
      const evidence = tekturAssertionEvidence({
        assertionId: 'VAL-B2-TYPE-016',
        populationSource: TEKTUR_OG_MAPPING_POPULATION_SOURCE,
        member: `og-static-mapping:${role.roleId}`,
        measurements: TEKTUR_MEASUREMENTS,
      });
      return {
        actual: `the Open Graph renderer's registered static Tektur instance maps to the approved web role \`${role.roleId}\`: ${evidence.actual}`,
        computed: {
          ...evidence.observed,
          roleId: role.roleId,
          evidence: [evidence.sourcePath],
          tool: evidence.tool,
        },
      };
    }
    const sightings = IDENTITY_EVIDENCE.observations.flatMap(
      ({ route, viewport, brandDisplayTexts }) =>
        brandDisplayTexts
          .filter(({ role: rendered }) => rendered === role.roleId)
          .map((lockup) => ({ route, viewport, ...lockup })),
    );
    if (sightings.length === 0) {
      throw new Error(
        `${assertionId}: the sweep never rendered the ${role.roleId} lockup, so nothing about it was measured`,
      );
    }
    const families = [
      ...new Set(sightings.map(({ fontFamilyHead }) => fontFamilyHead)),
    ].sort();
    const offFamily = families.filter(
      (family) => fontFamilyKey(family) !== DISPLAY_RUNTIME_FACE.runtimeKey,
    );
    if (offFamily.length > 0) {
      throw new Error(
        `${assertionId}: the ${role.roleId} lockup resolved to ${offFamily.join(', ')} rather than the registered ${DISPLAY_RUNTIME_FACE.registeredFamily}`,
      );
    }
    const axes = [
      ...new Set(
        sightings.map(({ fontVariationSettings }) => fontVariationSettings),
      ),
    ].sort();
    const registered = `"wdth" ${role.wdth}, "wght" ${role.wght}`;
    // The browser reports the axes in its own order, so the comparison is
    // over the parsed axis/value pairs; comparing the serialized strings
    // would fail a compliant lockup and pass a reordered wrong one.
    const offAxis = axes.filter(
      (setting) => serializeVariationAxes(setting) !== registered,
    );
    if (offAxis.length > 0) {
      throw new Error(
        `${assertionId}: the ${role.roleId} lockup rendered variation settings ${offAxis.join(' | ')} rather than the registered ${registered}`,
      );
    }
    const routes = [...new Set(sightings.map(({ route }) => route))].sort();
    return {
      actual: `the ${role.roleId} lockup resolved to ${families.join(', ')}, the runtime face the registered ${DISPLAY_RUNTIME_FACE.registeredFamily} is published under${DISPLAY_RUNTIME_FACE.earnedBy}, at the registered ${registered} on ${routes.length} route(s) across ${viewports}, in ${sightings.length} sighting(s)`,
      computed: {
        roleId: role.roleId,
        cssClass: role.cssClass,
        definedIn: role.definedIn,
        registeredFamily: DISPLAY_RUNTIME_FACE.registeredFamily,
        runtimeFamilyKey: DISPLAY_RUNTIME_FACE.runtimeKey,
        families,
        variationSettings: axes,
        routes,
        sightings: sightings.length,
        evidence: [IDENTITY_RUNTIME_EVIDENCE_PATH],
      },
    };
  }
  if (assertionId === 'VAL-B2-ID-006') {
    const asset = FIRST_PARTY_VISUAL_ASSETS.get(member);
    if (!asset) {
      throw new Error(
        `${assertionId}: ${member} is not a first-party visual asset`,
      );
    }
    // The seal decides. A member with no sealed entry never reaches here,
    // because the reconciliation throws while the corpus is being built.
    const seal = ASSET_SEAL_VERDICTS.get(asset.path);
    if (!seal) {
      throw new Error(
        `${assertionId}: ${asset.path} has no sealed byte approval, so nobody signed off on shipping it`,
      );
    }
    const verdict = ASSET_CONTENT_VERDICTS.get(member);
    if (!verdict) {
      throw new Error(
        `${assertionId}: ${member} has no decoded content verdict, so its row would rest on its filename`,
      );
    }
    if (verdict.failures.length > 0) {
      throw new Error(`${assertionId}: ${verdict.failures.join('; ')}`);
    }
    if (IDENTITY_SYMBOL_SIGHTINGS.length > 0) {
      throw new Error(
        `${assertionId}: the sweep found ${IDENTITY_SYMBOL_SIGHTINGS.length} symbol slot(s) filled, starting with ${IDENTITY_SYMBOL_SIGHTINGS[0]}`,
      );
    }
    return {
      actual: `${asset.path} ships exactly the ${seal.byteCount} bytes sealed at ${seal.sealedSha256.slice(0, 12)} in ${ASSET_SEAL_PATH}, approved by ${seal.owner} for: ${seal.purpose} It decodes as ${verdict.decodedFormat} matching its ${verdict.declaredExtension} name and its registered hash ${verdict.byteHash.slice(0, 12)}; ${verdict.established.join('; ')}; no icon, manifest or lockup declaration in the ${ASSET_IDENTITY_SOURCE_COUNT} sources that own a metadata surface or render a lockup names it, and the sweep found no icon declaration and no non-text node inside any lockup on ${IDENTITY_EVIDENCE.routes.length} routes at ${viewports}${verdict.limitations.length > 0 ? `. Not established: ${verdict.limitations.join('; ')}` : ''}`,
      computed: {
        assetPath: asset.path,
        category: asset.category,
        sealedBy: seal.owner,
        sealedPurpose: seal.purpose,
        sealedSha256: seal.sealedSha256,
        shippedSha256: seal.shippedSha256,
        sealedAssetCount: ASSET_SEAL_VERDICTS.size,
        approvalSource: ASSET_SEAL_PATH,
        byteCount: verdict.byteCount,
        byteHash: verdict.byteHash,
        declaredExtension: verdict.declaredExtension,
        decodedFormat: verdict.decodedFormat,
        formatMatchesExtension: verdict.formatMatchesExtension,
        basis: verdict.basis,
        decoded: verdict.decode,
        established: verdict.established,
        limitations: verdict.limitations,
        identitySourcesChecked: ASSET_IDENTITY_SOURCE_COUNT,
        iconDeclarationsAcrossSweep: 0,
        symbolNodesInLockupsAcrossSweep: 0,
        routesSwept: IDENTITY_EVIDENCE.routes.length,
        evidence: [asset.path, ASSET_SEAL_PATH, IDENTITY_RUNTIME_EVIDENCE_PATH],
      },
    };
  }
  throw new Error(`${assertionId} has no identity evidence branch`);
}

/**
 * What the desktop sweep recorded for one shell assertion and one population
 * member. Every branch throws on a member the sweep did not measure and on a
 * member whose reading fails the requirement, because the generator has no
 * way to write a red row: a shell that regressed has to stop the corpus, not
 * appear in it.
 */
function shellAssertionEvidence(
  assertionId: string,
  member: string,
): IdentityEvidence {
  if (assertionId === 'VAL-B2-SHELL-002') {
    const route = PUBLIC_ROUTE_PATH_BY_ID.get(member);
    if (!route) throw new Error(`${assertionId}: ${member} is not a route`);
    const verdict = SHELL_CURRENT_ROUTE_VERDICTS.get(route);
    if (!verdict) {
      throw new Error(`${assertionId}: the sweep did not visit ${route}`);
    }
    if (verdict.failures.length > 0) {
      throw new Error(
        `${assertionId}: ${verdict.failures.join('; ')}`,
      );
    }
    return {
      actual: verdict.hasNavigationItem
        ? `${route} matches the navigation entry ${verdict.matchingEntry?.href}, which alone carries aria-current="page" at ${verdict.ariaCurrentCount} node(s) document-wide, paints ${verdict.matchingEntry?.colour}, and is marked by ${verdict.markerDeviceId} in ${verdict.markerColour} ${verdict.markerAlignmentErrorPx}px from its registered rail anchor, at weight ${verdict.activeWeight} against idle siblings at ${verdict.idleWeight ?? 'no idle sibling'}`
        : `${route} exposes no navigation entry and no aria-current node, so no heading or unrelated element carries the state to satisfy a count`,
      computed: {
        route,
        viewport: SHELL_VIEWPORT.id,
        hasNavigationItem: verdict.hasNavigationItem,
        ariaCurrentCount: verdict.ariaCurrentCount,
        ariaCurrentOnNonLink: verdict.misplaced,
        markerDeviceId: verdict.markerDeviceId,
        markerColour: verdict.markerColour,
        markerAlignmentErrorPx: verdict.markerAlignmentErrorPx,
        activeFontWeight: verdict.activeWeight,
        idleFontWeight: verdict.idleWeight,
        evidence: [SHELL_RUNTIME_EVIDENCE_PATH],
      },
    };
  }
  if (assertionId === 'VAL-B2-SHELL-003') {
    const route = PUBLIC_ROUTE_PATH_BY_ID.get(member);
    if (!route) throw new Error(`${assertionId}: ${member} is not a route`);
    const verdict = SHELL_SKIP_LINK_VERDICTS.get(route);
    if (!verdict) {
      throw new Error(`${assertionId}: the sweep did not visit ${route}`);
    }
    if (verdict.failures.length > 0) {
      throw new Error(`${assertionId}: ${verdict.failures.join('; ')}`);
    }
    const { observation } = verdict;
    return {
      actual: `the first Tab on ${route} focused <${observation.firstTabStopTag} href="${observation.firstTabStopHref}">, which sits at ${observation.restTopPx}px unfocused and ${observation.focusedTopPx}px inside the viewport once focused, and activating it moved focus to #${observation.activatedFocusId}`,
      computed: {
        route,
        viewport: SHELL_VIEWPORT.id,
        firstTabStop: `${observation.firstTabStopTag}[href=${observation.firstTabStopHref}]`,
        firstTabStopText: observation.firstTabStopText,
        restTopPx: observation.restTopPx,
        focusedTopPx: observation.focusedTopPx,
        visibleWhenFocused: observation.visibleWhenFocused,
        activatedFocusId: observation.activatedFocusId,
        evidence: [SHELL_RUNTIME_EVIDENCE_PATH],
      },
    };
  }
  if (assertionId === 'VAL-B2-SHELL-005') {
    const sealed = NAVIGATION_BASELINE_BY_ID.get(member);
    if (!sealed) {
      throw new Error(
        `${assertionId}: ${member} is not a sealed navigation destination`,
      );
    }
    const entry = SHELL_LEDGER_BY_MEMBER.get(member);
    if (!entry) {
      throw new Error(
        `${assertionId}: the expanded taxonomy no longer renders ${member}, so a navigation destination was removed`,
      );
    }
    const rendered = sha256(
      stableJson({ index: entry.index, href: entry.href, name: entry.name }),
    );
    if (rendered !== sealed.hash) {
      throw new Error(
        `${assertionId}: ${member} now renders "${entry.name}" at position ${entry.index} pointing at ${entry.href}, which does not hash to the sealed baseline`,
      );
    }
    return {
      actual: `${member} still renders "${entry.name}" at taxonomy position ${entry.index} pointing at ${entry.href}, hashing to ${sealed.approvedDeltaId === null ? 'the sealed navigation baseline' : `the navigation baseline as moved by the approved delta ${sealed.approvedDeltaId}`}`,
      computed: {
        member,
        href: entry.href,
        accessibleName: entry.name,
        taxonomyIndex: entry.index,
        category: entry.category,
        renderedHash: rendered,
        expectedHash: sealed.hash,
        sealedHash: sealed.sealedHash,
        approvedDeltaId: sealed.approvedDeltaId,
        viewport: SHELL_VIEWPORT.id,
        evidence: [
          SHELL_RUNTIME_EVIDENCE_PATH,
          'evidence/brand-v2/baseline/baseline.json',
        ],
      },
    };
  }
  throw new Error(`${assertionId} has no shell evidence branch`);
}

/**
 * What the two-width article sweep recorded for one assertion and one
 * member. Every branch throws on a member the sweep did not measure and on a
 * member whose reading fails the requirement, because the generator has no
 * way to write a red row: a sheet that regressed has to stop the corpus, not
 * appear in it.
 *
 * The member is a route path for the row families that quantify over routes,
 * the registered role id for the wordmark row, and `route#heading-id` for
 * the section-heading row, which is the key space each verdict map already
 * uses.
 */
function articleAssertionEvidence(
  assertionId: string,
  member: string,
): IdentityEvidence {
  const verdicts =
    ARTICLE_VERDICTS[assertionId as keyof typeof ARTICLE_VERDICTS];
  if (!verdicts) {
    throw new Error(`${assertionId} has no article evidence branch`);
  }
  const keys =
    assertionId === 'VAL-B2-TYPE-006'
      ? (() => {
          if (member !== HOME_WORDMARK_ROLE_ID) {
            throw new Error(
              `${assertionId}: ${member} is not the registered wordmark role`,
            );
          }
          return [...verdicts.keys()];
        })()
      : assertionId === 'VAL-B2-TYPE-009'
        ? [member]
        : (() => {
            const route = PUBLIC_ROUTE_PATH_BY_ID.get(member);
            if (!route) {
              throw new Error(`${assertionId}: ${member} is not a route`);
            }
            return [route];
          })();

  const readings = keys.map((key) => {
    const verdict = verdicts.get(key);
    if (!verdict) {
      throw new Error(`${assertionId}: the sweep did not measure ${key}`);
    }
    if (verdict.failures.length > 0) {
      throw new Error(`${assertionId}: ${verdict.failures.join('; ')}`);
    }
    return verdict;
  });
  if (readings.length === 0) {
    throw new Error(
      `${assertionId}: ${member} resolved to no measured reading, so the row would rest on nothing`,
    );
  }

  const where = readings.map(({ id }) => id).join(', ');
  return {
    actual: `${where} was measured at ${ARTICLE_VIEWPORTS.map(({ width, height }) => `${width}x${height}`).join(' and ')} and every clause of ${assertionId} held against the reading`,
    computed: {
      member,
      measured: readings.map(({ id, observed }) => ({ id, observed })),
      viewports: ARTICLE_VIEWPORTS.map(({ id }) => id),
      evidence: [ARTICLE_RUNTIME_EVIDENCE_PATH],
    },
  };
}

/**
 * What the apparatus sweep recorded for one article route. Throws on a route
 * the sweep did not visit and on a route whose reading fails the
 * requirement: the generator has no way to write a red row, so an article
 * whose bibliography, curated edges or inbound edges no longer match the
 * registry has to stop the corpus rather than appear in it.
 */
function apparatusAssertionEvidence(
  assertionId: string,
  member: string,
): IdentityEvidence {
  const verdicts =
    APPARATUS_VERDICTS[assertionId as keyof typeof APPARATUS_VERDICTS];
  if (!verdicts) {
    throw new Error(`${assertionId} has no apparatus evidence branch`);
  }
  const route = PUBLIC_ROUTE_PATH_BY_ID.get(member);
  if (!route) throw new Error(`${assertionId}: ${member} is not a route`);
  const verdict = verdicts.get(route);
  if (!verdict) {
    throw new Error(`${assertionId}: the apparatus sweep did not measure ${route}`);
  }
  if (verdict.failures.length > 0) {
    throw new Error(`${assertionId}: ${verdict.failures.join('; ')}`);
  }
  return {
    actual: `${route} renders the relationship graph the registry derives — the same bibliography ids in the same order, the same curated See also edges, the same derived Linked from edges and the same inline citation markers — measured at ${APPARATUS_VIEWPORTS.map(({ width, height }) => `${width}x${height}`).join(' and ')}`,
    computed: {
      member,
      measured: [{ id: verdict.id, observed: verdict.observed }],
      viewports: APPARATUS_VIEWPORTS.map(({ id }) => id),
      evidence: [APPARATUS_RUNTIME_EVIDENCE_PATH],
    },
  };
}

/**
 * What the mobile sweep recorded for one mobile shell assertion and one
 * route. Both branches throw on a route the sweep did not visit and on a
 * route whose reading fails the requirement, because the generator has no
 * way to write a red row: a header that gained a descriptor or a drawer that
 * stopped trapping focus has to stop the corpus, not appear in it.
 */
function mobileShellAssertionEvidence(
  assertionId: string,
  member: string,
): IdentityEvidence {
  const route = PUBLIC_ROUTE_PATH_BY_ID.get(member);
  if (!route) throw new Error(`${assertionId}: ${member} is not a route`);
  if (assertionId === 'VAL-B2-ID-008') {
    const verdict = MOBILE_HEADER_VERDICTS.get(route);
    if (!verdict) {
      throw new Error(`${assertionId}: the sweep did not visit ${route}`);
    }
    if (verdict.failures.length > 0) {
      throw new Error(`${assertionId}: ${verdict.failures.join('; ')}`);
    }
    const { observation, lockup } = verdict;
    return {
      actual: `the compact header on ${route} renders \`${lockup?.text}\` on ${lockup?.lineBoxes} line box in ${lockup?.fontFamilyHead} at ${lockup?.fontSizePx}px inside a ${observation.contentWidthPx}px content box, and the whole header renders ${observation.leafTexts.length} leaf text(s) — ${observation.leafTexts.join(', ')} — so no descriptor, and no prose that could stand in for one, reaches it`,
      computed: {
        route,
        viewport: MOBILE_VIEWPORT.id,
        headerDisplay: observation.display,
        headerHeightPx: observation.heightPx,
        headerContentWidthPx: observation.contentWidthPx,
        headerLeafTexts: observation.leafTexts,
        lockupsDiscovered: observation.lockups.length,
        lockupText: lockup?.text ?? null,
        lockupRole: lockup?.tekturRole ?? null,
        lockupFamilyHead: lockup?.fontFamilyHead ?? null,
        lockupFontSizePx: lockup?.fontSizePx ?? null,
        lockupLineBoxes: lockup?.lineBoxes ?? null,
        lockupWidthPx: lockup?.widthPx ?? null,
        descriptorMatches: observation.descriptorMatches,
        triggerAccessibleName: observation.trigger?.accessibleName ?? null,
        triggerAriaControls: observation.trigger?.ariaControls ?? null,
        evidence: [MOBILE_SHELL_EVIDENCE_PATH],
      },
    };
  }
  if (assertionId === 'VAL-B2-SHELL-004') {
    const verdict = MOBILE_DRAWER_VERDICTS.get(route);
    if (!verdict) {
      throw new Error(`${assertionId}: the sweep did not visit ${route}`);
    }
    if (verdict.failures.length > 0) {
      throw new Error(`${assertionId}: ${verdict.failures.join('; ')}`);
    }
    const { focus, inert, dismissals, separation } = verdict.observation;
    return {
      actual: `the drawer on ${route} opened onto ${focus.focusOnOpen?.label} with ${focus.tabStopCount} tab stops, sent a Tab off its last stop (${focus.last?.label}) to its first (${focus.forwardWrap.focused?.label}) and a Shift+Tab off its first to its last (${focus.backwardWrap.focused?.label}), both inside the dialog, made all ${inert.regions.filter(({ present }) => present).length} background regions inert with no tab stop reachable behind it, and returned focus to its trigger from all three of ${dismissals.map(({ via }) => via).join(', ')}`,
      computed: {
        route,
        viewport: MOBILE_VIEWPORT.id,
        closedDrawerTabStops: verdict.observation.closedDrawerTabStops,
        tabStopCount: focus.tabStopCount,
        firstTabStop: focus.first,
        lastTabStop: focus.last,
        focusOnOpen: focus.focusOnOpen,
        forwardWrap: focus.forwardWrap,
        backwardWrap: focus.backwardWrap,
        inertRegions: inert.regions,
        reachableOutsideDrawer: inert.reachableOutsideDrawer,
        dismissals,
        scrimCompositedRgb: separation.scrimCompositedRgb,
        panelRgb: separation.panelRgb,
        scrimSeparationRatio: separation.contrastRatio,
        scrimSeparationFloor: SCRIM_SEPARATION_FLOOR,
        panelBorderLeftPx: separation.panelBorderLeftPx,
        panelBorderRightPx: separation.panelBorderRightPx,
        evidence: [MOBILE_SHELL_EVIDENCE_PATH],
      },
    };
  }
  throw new Error(`${assertionId} has no mobile shell evidence branch`);
}

/**
 * The responsive-overflow rows, read off the persisted four-width sweep.
 * The verdict throws on a route the sweep measured at fewer than the
 * declared widths, so a width nobody visited cannot pass as a width that
 * held.
 */
function homeToolsAssertionEvidence(
  assertionId: string,
  member: string,
): IdentityEvidence {
  const verdict = HOME_TOOLS_OVERFLOW_VERDICTS.get(member);
  if (!verdict) {
    throw new Error(`${assertionId}: the sweep measured no route ${member}`);
  }
  if (verdict.failures.length > 0) {
    throw new Error(`${assertionId}: ${verdict.failures.join('; ')}`);
  }
  const rows = HOME_TOOLS_EVIDENCE.responsive.filter(
    (row) => row.routeId === member,
  );
  return {
    actual: `${verdict.observed.route} lays out inside its viewport at every declared width (${rows.map((row) => `${row.viewportId}: ${row.documentScrollWidthPx}/${row.documentClientWidthPx}px`).join(', ')}), with no element past the viewport that nothing scrolls or clips`,
    computed: {
      route: verdict.observed.route,
      widths: requiredSweepWidths(),
      measurements: rows.map(
        ({ viewportId, documentScrollWidthPx, documentClientWidthPx }) => ({
          viewportId,
          documentScrollWidthPx,
          documentClientWidthPx,
        }),
      ),
      unclippedOverflow: rows.flatMap(({ unclippedOverflow }) =>
        unclippedOverflow,
      ),
      evidence: [HOME_TOOLS_EVIDENCE_PATH],
    },
  };
}

/**
 * The home-composition rows, read off the persisted desktop sweep of the
 * built page. Every branch throws on a member the sweep never decided or a
 * verdict that recorded a failure, so a regressed home stops the corpus
 * rather than appearing in it.
 */
function homeAssertionEvidence(
  assertionId: string,
  member: string,
): IdentityEvidence {
  if (assertionId === 'VAL-B2-ID-007') {
    const verdict = HOME_HERO_VERDICTS.get(member);
    if (!verdict) {
      throw new Error(`${assertionId}: the sweep decided no lockup ${member}`);
    }
    if (verdict.failures.length > 0) {
      throw new Error(`${assertionId}: ${verdict.failures.join('; ')}`);
    }
    const lockup = HOME_EVIDENCE.heroLockups[verdict.index];
    return {
      actual: `the home hero renders exactly ${HOME_EVIDENCE.heroLockups.length} lockup, printing \`${lockup.text}\` in ${lockup.fontFamilyHead} at ${lockup.fontSizePx}px on ${lockup.renderedLines} line(s) beside the one exact descriptor \`${lockup.descriptorText}\``,
      computed: {
        route: HOME_EVIDENCE.route,
        viewport: HOME_EVIDENCE.viewport,
        lockupsDiscovered: HOME_EVIDENCE.heroLockups.length,
        lockupIndex: lockup.index,
        lockupText: lockup.text,
        lockupFamilyHead: lockup.fontFamilyHead,
        lockupFontSizePx: lockup.fontSizePx,
        lockupRenderedLines: lockup.renderedLines,
        descriptorText: lockup.descriptorText,
        descriptorFamilyHead: lockup.descriptorFontFamilyHead,
        evidence: [HOME_COMPOSITION_EVIDENCE_PATH],
      },
    };
  }
  if (assertionId === 'VAL-B2-SHELL-006') {
    const verdict = HOME_ANCHOR_VERDICTS.get(member);
    if (!verdict) {
      throw new Error(`${assertionId}: the sweep decided no anchor ${member}`);
    }
    if (verdict.failures.length > 0) {
      throw new Error(`${assertionId}: ${verdict.failures.join('; ')}`);
    }
    return {
      actual: `${member} holds on the built home page at ${HOME_VIEWPORT.id}: ${JSON.stringify(verdict.observed)}`,
      computed: {
        route: HOME_EVIDENCE.route,
        viewport: HOME_EVIDENCE.viewport,
        anchor: member,
        ...verdict.observed,
        evidence: [HOME_COMPOSITION_EVIDENCE_PATH],
      },
    };
  }
  if (assertionId === 'VAL-B2-SHELL-007') {
    const verdict = HOME_DESTINATION_VERDICTS.get(member);
    if (!verdict) {
      throw new Error(
        `${assertionId}: the sweep decided no destination ${member}`,
      );
    }
    if (verdict.failures.length > 0) {
      throw new Error(`${assertionId}: ${verdict.failures.join('; ')}`);
    }
    const entries = canonicalDomainEntries(
      HOME_EVIDENCE.domainEntries.filter(
        ({ href }) => href === verdict.href,
      ),
      verdict.name,
    );
    const first = entries[0];
    return {
      actual: `home renders \`${verdict.name}\` linking to ${verdict.href} in a ${first?.heightPx}px index row carrying its own description, one of ${HOME_DOMAIN_DESTINATIONS.length} canonical destinations`,
      computed: {
        route: HOME_EVIDENCE.route,
        viewport: HOME_EVIDENCE.viewport,
        domain: verdict.domain,
        name: verdict.name,
        href: verdict.href,
        entriesRendered: entries.length,
        description: first?.description ?? null,
        rowHeightPx: first?.heightPx ?? null,
        rowBottomPx: first?.bottomPx ?? null,
        borderedCard: first?.bordered ?? null,
        canonicalDestinations: HOME_DOMAIN_DESTINATIONS.length,
        evidence: [HOME_COMPOSITION_EVIDENCE_PATH],
      },
    };
  }
  throw new Error(`${assertionId} has no home composition evidence branch`);
}

function resultFor(
  assertionId: string,
  populationMemberIds: string[],
  requirement: string,
  populationSource: string,
  mode: EnforcementMap['rows'][number]['enforcementMode'],
  member?: string,
): EvidenceResult {
  const perMember = member !== undefined;
  const common = {
    resultId: perMember
      ? `result:${assertionId}:${member}`
      : `result:${assertionId}`,
    assertionId,
    populationMemberId: member ?? `population:${populationSource}`,
    coveredPopulationMemberIds: populationMemberIds,
    coverageKind: perMember ? ('per-member' as const) : ('population-wide' as const),
    status: isMeasured(assertionId) ? ('passed' as const) : ('pending' as const),
    expected: requirement,
    // Every measured branch below replaces this with what its measurement
    // actually recorded; a row that reached the generator without one would
    // be asserting its own targets rather than an observation.
    actual: 'awaiting responsible rollout milestone',
    selectorOrRegistryId: populationSource,
    exceptionVerdict: 'none' as const,
  };
  const registryKey = RECONCILED_PRIMITIVE_ASSERTIONS.get(assertionId);
  if (registryKey) {
    if (member === undefined) {
      throw new Error(
        `${assertionId} is reconciled per member and must record per-member evidence`,
      );
    }
    const record = RECONCILIATION.members[member];
    if (!record || record.kind !== registryKey) {
      throw new Error(
        `${assertionId}: ${member} has no ${registryKey} reconciliation record`,
      );
    }
    if (record.renderedOn.length === 0) {
      return {
        ...common,
        status: 'not-applicable' as const,
        actual: `registered and defined in ${record.definedIn.join(', ') || 'no first-party module'}, mounted by no public route`,
        notApplicableReason: {
          code: 'unsupported-state' as const,
          registryId: member,
          detail: `${member} has mount state ${record.mountState}: the reconciliation over ${RECONCILIATION.routes.length} route states rendered it 0 times, so no rendered member exists to measure.`,
        },
      };
    }
    const evidence = primitiveRegistryEvidence(assertionId, member);
    return {
      ...common,
      actual: `rendered on ${record.renderedOn.length} of ${RECONCILIATION.routes.length} swept route states and reconciled exactly against the registry row`,
      payload: {
        kind: 'browser-state',
        computed: {
          ...evidence.observed,
          mountState: record.mountState,
          renderedOn: record.renderedOn,
          sweptRouteStates: RECONCILIATION.routes.length,
          reconciliationSource:
            'evidence/brand-v2/primitive-reconciliation.json',
        },
      },
    };
  }
  if (IDENTITY_ASSERTIONS.has(assertionId)) {
    if (member === undefined) {
      throw new Error(
        `${assertionId} is measured per member and must record per-member evidence`,
      );
    }
    const evidence = identityAssertionEvidence(assertionId, member);
    return {
      ...common,
      actual: evidence.actual,
      payload: { kind: 'browser-state', computed: evidence.computed },
    };
  }
  if (SHELL_ASSERTIONS.has(assertionId)) {
    if (member === undefined) {
      throw new Error(
        `${assertionId} is measured per member and must record per-member evidence`,
      );
    }
    const evidence = shellAssertionEvidence(assertionId, member);
    return {
      ...common,
      actual: evidence.actual,
      payload: { kind: 'browser-state', computed: evidence.computed },
    };
  }
  if (MOBILE_SHELL_ASSERTIONS.has(assertionId)) {
    if (member === undefined) {
      throw new Error(
        `${assertionId} is measured per member and must record per-member evidence`,
      );
    }
    const evidence = mobileShellAssertionEvidence(assertionId, member);
    return {
      ...common,
      actual: evidence.actual,
      payload: { kind: 'browser-state', computed: evidence.computed },
    };
  }
  if (ARTICLE_ASSERTIONS.has(assertionId)) {
    if (member === undefined) {
      throw new Error(
        `${assertionId} is measured per member and must record per-member evidence`,
      );
    }
    const evidence = articleAssertionEvidence(assertionId, member);
    return {
      ...common,
      actual: evidence.actual,
      payload: { kind: 'browser-state', computed: evidence.computed },
    };
  }
  if (APPARATUS_ASSERTIONS.has(assertionId)) {
    if (member === undefined) {
      throw new Error(
        `${assertionId} is measured per member and must record per-member evidence`,
      );
    }
    const evidence = apparatusAssertionEvidence(assertionId, member);
    return {
      ...common,
      actual: evidence.actual,
      payload: { kind: 'browser-state', computed: evidence.computed },
    };
  }
  if (HOME_ASSERTIONS.has(assertionId)) {
    if (member === undefined) {
      throw new Error(
        `${assertionId} is measured per member and must record per-member evidence`,
      );
    }
    const evidence = homeAssertionEvidence(assertionId, member);
    return {
      ...common,
      actual: evidence.actual,
      payload: { kind: 'browser-state', computed: evidence.computed },
    };
  }
  if (HOME_TOOLS_ASSERTIONS.has(assertionId)) {
    if (member === undefined) {
      throw new Error(
        `${assertionId} is measured per member and must record per-member evidence`,
      );
    }
    const evidence = homeToolsAssertionEvidence(assertionId, member);
    return {
      ...common,
      actual: evidence.actual,
      payload: { kind: 'browser-state', computed: evidence.computed },
    };
  }
  if (TOKEN_ASSERTIONS.has(assertionId)) {
    if (member === undefined) {
      throw new Error(
        `${assertionId} is measured per member and must record per-member evidence`,
      );
    }
    return assertionId === SEMANTIC_ROLE_ASSERTION
      ? semanticTokenResult(common, member)
      : routeTokenResult(common, assertionId, member);
  }
  if (TEKTUR_ASSERTIONS.has(assertionId)) {
    if (member === undefined) {
      throw new Error(
        `${assertionId} is measured per member and must record per-member evidence`,
      );
    }
    const evidence = tekturAssertionEvidence({
      assertionId,
      populationSource,
      member,
      measurements: TEKTUR_MEASUREMENTS,
    });
    return {
      ...common,
      actual: evidence.actual,
      payload:
        mode === 'browser-state'
          ? {
              kind: 'browser-state',
              computed: {
                ...evidence.observed,
                evidence: [evidence.sourcePath],
                tool: evidence.tool,
              },
            }
          : {
              kind: 'source-build',
              sourcePath: evidence.sourcePath,
              predicate: requirement,
              observed: evidence.observed,
              tool: evidence.tool,
            },
    };
  }
  if (mode === 'generated-image') {
    return {
      ...common,
      payload: {
        kind: 'generated-image',
        imagePath: `pending://${assertionId}`,
        width: 1200,
        height: 630,
        sha256: '0'.repeat(64),
        generator: 'pending brand-v2 rollout',
      },
    };
  }
  if (mode === 'autonomous-visual') {
    return {
      ...common,
      payload: {
        kind: 'autonomous-reference-comparison',
        rubricVersion: 1,
        comparisonMode: 'feature-anchors-only',
        contractLiteralOverridesApplied: true,
        referenceIds: [
          'library/brand-reference-board.jpeg',
          'library/brand-reference-article.png',
        ],
        surfaceId: `pending:${assertionId}`,
        migrationStatus: 'pending',
        screenshotPaths: [`pending://${assertionId}`],
      },
    };
  }
  if (mode === 'browser-state') {
    return {
      ...common,
      payload: {
        kind: 'browser-state',
        computed: { status: 'pending' },
      },
    };
  }
  return {
    ...common,
    payload: {
      kind: 'source-build',
      sourcePath: 'contract/design-integrity.md',
      predicate: requirement,
      observed: 'pending',
      tool: 'brand-v2-enforcement',
    },
  };
}

function generate() {
  const contract = readFileSync(
    join(ROOT, 'contract', 'design-integrity.md'),
    'utf8',
  );
  const assertions = extractBrandV2Assertions(contract);
  const sources = populationSources(assertions.map(({ id }) => id));
  const results: EvidenceResult[] = [];
  const rows: EnforcementMap['rows'] = assertions.map(
    ({ id, requirement }) => {
      const canonicalPopulationSource = populationSourceFor(id);
      const population = sources[canonicalPopulationSource];
      if (!population?.length) {
        throw new Error(`Population is empty for ${id}: ${canonicalPopulationSource}`);
      }
      const enforcementMode = modeFor(id);
      const assertionResults = isMeasured(id)
        ? population.map((member) =>
            resultFor(
              id,
              [member],
              requirement,
              canonicalPopulationSource,
              enforcementMode,
              member,
            ),
          )
        : [
            resultFor(
              id,
              population,
              requirement,
              canonicalPopulationSource,
              enforcementMode,
            ),
          ];
      results.push(...assertionResults);
      return {
        assertionId: id,
        canonicalPopulationSource,
        enforcementTargets: [
          ...assertionResults.map((assertionResult) => ({
            kind: 'evidence-row' as const,
            evidenceRowId: assertionResult.resultId,
            mechanism: id === 'VAL-B2-ID-006'
              ? `${id} per-member evidence derived from the checked-in byte seal ${ASSET_SEAL_PATH}, reconciled in both directions against ${canonicalPopulationSource} and re-hashed per asset, plus the decoded content description of each sealed asset`
              : IDENTITY_ASSERTIONS.has(id)
              ? `${id} per-member evidence derived from the persisted identity sweep of the built export, over every registered public route at both identity viewports plus every declared interactive identity state, over ${canonicalPopulationSource}`
              : SHELL_ASSERTIONS.has(id)
              ? `${id} per-member evidence derived from the persisted desktop shell sweep of the built export, including its keyboard trace and its expanded taxonomy ledger, over ${canonicalPopulationSource}`
              : MOBILE_SHELL_ASSERTIONS.has(id)
              ? `${id} per-member evidence derived from the persisted mobile shell sweep of the built export, including the drawer's two-directional keyboard trap trace, its three dismissal paths and the composited scrim reading, over ${canonicalPopulationSource}`
              : ARTICLE_ASSERTIONS.has(id)
              ? `${id} per-member evidence derived from the persisted ${ARTICLE_VIEWPORTS.map(({ width, height }) => `${width}x${height}`).join('/')} sweep of every public route in the built export, measuring each reading column's measure in the advance of its own font, over ${canonicalPopulationSource}`
              : APPARATUS_ASSERTIONS.has(id)
              ? `${id} per-member evidence derived from the persisted ${APPARATUS_VIEWPORTS.map(({ width, height }) => `${width}x${height}`).join('/')} sweep of every published article in the built export, reconciled in both directions against the relationship graph the registry derives — bibliography order, curated See also edges, derived Linked from edges and inline citation markers — over ${canonicalPopulationSource}`
              : HOME_ASSERTIONS.has(id)
              ? `${id} per-member evidence derived from the persisted 1440x900 sweep of the built home page, including its hero type scale, its first-viewport paint and geometry readings, and its domain index rows, over ${canonicalPopulationSource}`
              : HOME_TOOLS_ASSERTIONS.has(id)
              ? `${id} per-member evidence derived from the persisted ${requiredSweepWidths().join('/')}px sweep of every public route in the built export, comparing each document's scroll width with its viewport and naming every element laid out past it that nothing scrolls or clips, over ${canonicalPopulationSource}`
              : RECONCILED_PRIMITIVE_ASSERTIONS.has(id)
              ? `${id} per-member status derived from the persisted browser reconciliation over ${canonicalPopulationSource}`
              : TOKEN_ASSERTIONS.has(id)
                ? `${id} per-member evidence derived from the persisted runtime token sweep and renderer corpus walk over ${canonicalPopulationSource}`
                : TEKTUR_ASSERTIONS.has(id)
                ? `${id} per-member evidence derived from the persisted all-route Tektur sweep, the fontkit binary inspection and its rejection mutants, and the Open Graph renderer walk over ${canonicalPopulationSource}`
                : `${id} pending rollout evidence over ${canonicalPopulationSource}`,
          })),
          ...testTargetsFor(id),
        ],
        enforcementMode,
        machinePredicate: {
          statement: requirement,
          expected: requirement,
          actualSource: 'evidence/brand-v2/results.json',
          populationSize: population.length,
          omissionProof: OMISSION_PROOF,
        },
        producedResult: {
          resultIds: assertionResults.map(({ resultId }) => resultId),
        },
      };
    },
  );
  return {
    sources,
    map: enforcementMapSchema.parse({ schemaVersion: 1, rows }),
    results: results.map((result) => evidenceResultSchema.parse(result)),
    colourOnlyMarks: colourOnlyMarkArchive(),
  };
}

/**
 * The archive of marks that paint a semantic hue with no non-colour cue of
 * their own. Written and compared alongside the map and the results, so a
 * newly authored colour-only mark and a remediated one both show up as a
 * stale-artifact failure rather than as silence.
 */
function colourOnlyMarkArchive() {
  return {
    schemaVersion: 1,
    generator: 'scripts/brand-v2-enforcement.ts',
    populationSource: SEMANTIC_TOKEN_POPULATION_SOURCE,
    ownedBy: 'brand-v2-interactive-data-legends-and-render-parity',
    marks: SEMANTIC_POPULATION.flatMap(({ marks }) =>
      marks
        .filter(({ cues }) => cues.length === 0)
        .map(({ id, module, token, element, form, binding, via }) => ({
          id,
          module,
          token,
          element,
          form,
          binding,
          via,
        })),
    ).sort((left, right) => left.id.localeCompare(right.id)),
  };
}

const args = new Set(process.argv.slice(2));
const mode = process.argv.slice(2).find((argument) =>
  ['--write', '--check', '--check-release'].includes(argument),
);
const countOnly = args.has('--count-only');
const generated = generate();
if (mode === '--write') {
  writeFileSync(MAP_PATH, `${JSON.stringify(generated.map, null, 2)}\n`);
  writeFileSync(
    RESULTS_PATH,
    `${JSON.stringify({ schemaVersion: 1, results: generated.results }, null, 2)}\n`,
  );
  writeFileSync(
    join(ROOT, SEMANTIC_COLOUR_ONLY_MARKS_PATH),
    `${JSON.stringify(generated.colourOnlyMarks, null, 2)}\n`,
  );
  console.log(
    `brand-v2-enforcement: wrote ${generated.map.rows.length} assertion rows, ${generated.results.length} tagged results and ${generated.colourOnlyMarks.marks.length} archived colour-only marks`,
  );
} else if (mode === '--check' || mode === '--check-release') {
  const map = enforcementMapSchema.parse(readJson(MAP_PATH));
  const resultDocument = readJson(RESULTS_PATH) as {
    schemaVersion: number;
    results: unknown[];
  };
  if (resultDocument.schemaVersion !== 1) {
    throw new Error('Evidence result document schemaVersion must be 1.');
  }
  const results = resultDocument.results.map((result) =>
    evidenceResultSchema.parse(result),
  );
  const failures = validateEnforcementCorpus({
    assertionIds: generated.map.rows.map(({ assertionId }) => assertionId),
    populationSources: generated.sources,
    map,
    results,
    testTargetInventory: deriveTestTargetInventory(),
    allowPendingResults: mode === '--check',
  });
  if (JSON.stringify(map) !== JSON.stringify(generated.map)) {
    failures.push({
      reason: 'generated-map-drift',
      expected: 'deterministic generated enforcement map',
      actual: MAP_PATH,
    });
  }
  if (JSON.stringify(results) !== JSON.stringify(generated.results)) {
    failures.push({
      reason: 'generated-results-drift',
      expected: 'deterministic generated tagged results',
      actual: RESULTS_PATH,
    });
  }
  if (
    JSON.stringify(readJson(join(ROOT, SEMANTIC_COLOUR_ONLY_MARKS_PATH))) !==
    JSON.stringify(generated.colourOnlyMarks)
  ) {
    failures.push({
      reason: 'colour-only-mark-archive-drift',
      expected: 'archived colour-only marks equal to the measured set',
      actual: SEMANTIC_COLOUR_ONLY_MARKS_PATH,
    });
  }
  if (failures.length > 0) {
    const summary = summarizeEnforcementFailures(failures);
    console.error(
      `brand-v2-enforcement: ${summary.total} failures by class`,
    );
    for (const { reason, count } of summary.counts) {
      console.error(`${reason}: ${count}`);
    }
    if (!countOnly) {
      for (const failure of failures.slice(0, 20)) {
        console.error(JSON.stringify(failure));
      }
      if (failures.length > 20) {
        console.error(`... ${failures.length - 20} more enforcement failures`);
      }
    }
    process.exitCode = 1;
  } else {
    console.log(
      `brand-v2-enforcement: OK (${map.rows.length} assertions, ${results.length} tagged results)`,
    );
  }
} else {
  console.error(
    'Usage: node scripts/brand-v2-enforcement.ts --write|--check|--check-release [--count-only]',
  );
  process.exitCode = 2;
}
