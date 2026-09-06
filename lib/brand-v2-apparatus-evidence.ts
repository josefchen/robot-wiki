import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import matter from 'gray-matter';
import { z } from 'zod';
import { DOMAIN_META, modules, publishedModules } from '../data/modules.ts';
import { getCitation } from '../data/citations.ts';
import { DEFAULT_THESIS_ID, THESES } from './competing-theses.ts';
import { MILESTONES } from './bear-case.ts';
import { publishedBacklinkGraph, resolveArticleEntries } from './backlinks.ts';
import {
  ARTICLE_BODY_COMPUTED_IMPORT,
  deriveEvidenceClosure,
  evidenceClosureGraph,
  routeEntryModules,
} from './brand-v2-evidence-closure.ts';
import { parseEvidenceArtifact } from './brand-v2-evidence-schema.ts';
import { inlineCitationIds, moduleBody, resolveReferences } from './references.ts';
import {
  currentArticleFactFrontmatterMembers,
  currentRelationshipMembers,
} from './relationship-manifest.ts';

/**
 * Evidence for the wiki apparatus an article carries around its prose:
 * breadcrumbs, inline citation chips, inline glossary terms, See also,
 * Linked from and References.
 *
 * The rows this decides split into two kinds and they need opposite
 * treatment.
 *
 * `VAL-B2-ART-010` is a PRESERVATION row: the relationship graph must be
 * what it was before the rollout. The tempting way to check it is to store
 * a copy of the rendered lists and compare, which can only ever detect
 * drift away from the copy and would happily bless a wrong list that was
 * wrong when the copy was taken. So the expectation here is DERIVED from
 * the same registry the template renders from — `resolveArticleEntries` over
 * the frontmatter `seeAlso`, `publishedBacklinkGraph` for the inbound
 * edges, `resolveReferences` over the declared citations, and
 * `inlineCitationIds` over the MDX body — and the sweep compares the
 * rendered DOM against that. The immutable migration manifests
 * (`evidence/brand-v2/baseline/{prose,relationships}.json`) pin the source
 * side; this pins the rendered side, which is the half a source manifest
 * cannot see. A rollout that dropped a chip or reordered a bibliography
 * while leaving every MDX file untouched passes the manifest and fails
 * here.
 *
 * The rest are TREATMENT rows, and they are measured, never asserted from
 * source: a link's colour and its underline are whatever won the cascade,
 * and `VAL-WIKI-006`'s overflow clause has no answer at all until a
 * viewport is chosen.
 *
 * Every reader below throws rather than degrade. A stale fingerprint, a
 * missing route, a missing viewport, an empty population or a page that
 * rendered no apparatus refuses the evidence instead of returning a
 * weaker claim.
 */
export const APPARATUS_RUNTIME_EVIDENCE_PATH =
  'evidence/brand-v2/article-apparatus.json';

/**
 * The two viewports `VAL-WIKI-006` names literally ("At 375px and 1440px")
 * and the two `VAL-GLOSS-007` names for the same apparatus.
 */
export const APPARATUS_VIEWPORTS = [
  { id: '375x812', width: 375, height: 812 },
  { id: '1440x900', width: 1440, height: 900 },
] as const;

export const APPARATUS_MOBILE_VIEWPORT_ID = '375x812';
export const APPARATUS_DESKTOP_VIEWPORT_ID = '1440x900';

/** Signal blue as the browser reports it, plus both hex spellings shipped. */
export const SIGNAL_BLUE_RENDERED = 'rgb(36, 95, 255)';

/** WCAG AA for the apparatus, which is all normal-sized text. */
export const APPARATUS_CONTRAST_FLOOR = 4.5;

/** The sweep whose own bytes decide what this evidence recorded. */
export const APPARATUS_SWEEP_MODULE =
  'tests/e2e/brand-v2-article-apparatus.spec.ts';

function apparatusClosureEntries(root: string): string[] {
  return [
    ...routeEntryModules(evidenceClosureGraph(root)),
    APPARATUS_SWEEP_MODULE,
  ].sort();
}

/**
 * The fingerprint the sweep records and the generator re-derives.
 *
 * The derived relationship graph is hashed in as a fact rather than left
 * implicit. Every other input is a module the closure already walks, but
 * the graph is a function of the MDX frontmatter and bodies, and an article
 * that gained a `seeAlso` edge must invalidate this evidence even though no
 * `.ts` byte moved.
 */
export function apparatusEvidenceFingerprint(input: { root: string }): string {
  const graph = expectedApparatusGraph(input.root);
  const facts = [
    `contrast-floor:${APPARATUS_CONTRAST_FLOOR}`,
    `signal-blue:${SIGNAL_BLUE_RENDERED}`,
    ...APPARATUS_VIEWPORTS.map(({ id }) => `viewport:${id}`),
    ...[...graph.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([route, expected]) =>
        [
          `graph:${route}`,
          `crumbs=${expected.breadcrumb.map((c) => `${c.label}@${c.href ?? '-'}`).join('>')}`,
          `see=${expected.seeAlso.join(',')}`,
          `from=${expected.linkedFrom.join(',')}`,
          `refs=${expected.references.join(',')}`,
          `cites=${expected.citationMarkers.join(',')}`,
          `sites=${expected.componentCitationSites
            .map(({ mountId, id, spelling }) => `${mountId}#${id}@${spelling}`)
            .join(',')}`,
          `dynamic=${expected.dynamicCitationSites
            .map(({ mountId, expression, occurrences }) =>
              `${mountId}#${expression}:${occurrences.map(({ key, id }) => `${key}=${id}`).join('+')}`,
            )
            .join(',')}`,
          `owners=${expected.mountCitationOwners
            .map(({ mountId, ids }) => `${mountId}#${ids.join('+')}`)
            .join(',')}`,
        ].join('|'),
      ),
  ];
  return deriveEvidenceClosure({
    root: input.root,
    entries: apparatusClosureEntries(input.root),
    facts,
    computedSpecifiers: [ARTICLE_BODY_COMPUTED_IMPORT],
  }).fingerprint;
}

/** One crumb as the template builds it: the trailing one carries no href. */
export type ExpectedCrumb = { label: string; href: string | null };

export type ExpectedApparatus = {
  /** `domain/slug`, the registry key the DOM exposes as `data-article-key`. */
  key: string;
  breadcrumb: ExpectedCrumb[];
  /** Curated forward edges, in frontmatter order, as registry keys. */
  seeAlso: string[];
  /** Derived inbound edges, in graph order, as registry keys. */
  linkedFrom: string[];
  /** Bibliography entry ids in rendered order. */
  references: string[];
  /** Inline `<Cite>` ids in body order, chips included more than once. */
  citationMarkers: string[];
  /** Citation ids that carry no inline chip: the "Further reading" set. */
  furtherReading: string[];
  /**
   * One entry per fixed `<CiteRef id="..."/>` site written in a component
   * this route mounts, whether the id is quoted at the site or held in a
   * constant the site names. These chips are as fixed as the body's: the id
   * is in the component's own module graph, so the page owes one rendered
   * chip per site on top of whatever the body cites.
   */
  componentCitationSites: ComponentCitationSite[];
  /**
   * One entry per `<CiteRef id={expression}/>` site whose id is chosen at
   * render time from a data row. Each site carries the COMPLETE default-state
   * occurrence population derived from its data, not a one-per-expression
   * floor. Unrecognised mapped sources fail closed.
   */
  dynamicCitationSites: DynamicCitationSite[];
  /**
   * Per mount, every citation id reachable from that component's own module
   * tree. This is the vocabulary a mount may draw from, not a promise about
   * what it renders: a data-driven panel shows the ids of whatever row is
   * selected. It is what makes a chip the body never declared attributable
   * to something on the page rather than to nothing at all.
   */
  mountCitationOwners: MountCitationOwner[];
};

export type ComponentCitationSite = {
  mountId: string;
  sourcePath: string;
  id: string;
  /** How the site spells the id: quoted at the site, or through a constant. */
  spelling: 'literal' | 'identifier';
};

export type DynamicCitationSite = {
  mountId: string;
  sourcePath: string;
  /** The expression as written, so the failure can name the site. */
  expression: string;
  /** Default selection, side, evidence row and citation position. */
  occurrences: Array<{ key: string; id: string }>;
};

export type MountCitationOwner = {
  mountId: string;
  sourcePath: string;
  ids: string[];
};

let cachedGraph: Map<string, ExpectedApparatus> | null = null;

const REGISTRIES_PATH = 'contract/brand-v2-registries.json';

/**
 * The citation registry is the vocabulary these scans are read against, so
 * scanning it would report every id in the wiki as declared by whatever
 * component imports it.
 */
const CITATION_VOCABULARY_MODULE = 'data/citations.ts';

/** A literal chip site: `<Cite id="x"/>` or `<CiteRef id="x"/>` in JSX. */
const LITERAL_CITE_SITE = /<Cite(?:Ref)?\s+[^>]*?\bid=["']([^"']+)["']/g;

/** An expression chip site: `<CiteRef id={SOMETHING}/>`. */
const EXPRESSION_CITE_SITE = /<Cite(?:Ref)?\s+[^>]*?\bid=\{([^}]+)\}/g;

/** A bare identifier, the only expression a constant can be read out of. */
const BARE_IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/**
 * The registered citation id a named constant holds, following first-party
 * imports.
 *
 * `<CiteRef id={TRANSIENT_CONTACT_LIMIT_CITATION} />` renders exactly the
 * same fixed chip as `<CiteRef id="han-force-pain-2024" />`; only the
 * spelling differs. A scanner that recognised only the quoted spelling gave
 * the constant-valued sites no floor at all, so the chip could disappear
 * with every preservation row still green.
 */
function resolveCitationIdentifier(
  root: string,
  sourcePath: string,
  name: string,
  depth = 3,
  seen = new Set<string>(),
): string | null {
  const key = `${sourcePath}#${name}`;
  if (depth < 0 || seen.has(key) || !BARE_IDENTIFIER.test(name)) return null;
  seen.add(key);
  const text = withoutComments(readFileSync(join(root, sourcePath), 'utf8'));
  const declared = new RegExp(
    `\\bconst\\s+${name}\\s*(?::[^=\\n]+)?=\\s*['"]([^'"]+)['"]`,
  ).exec(text);
  if (declared && getCitation(declared[1] as string)) {
    return declared[1] as string;
  }
  for (const match of text.matchAll(
    /import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g,
  )) {
    const binding = (match[1] as string)
      .split(',')
      .map((entry) => entry.trim())
      .find(
        (entry) => entry === name || new RegExp(`\\bas\\s+${name}$`).test(entry),
      );
    if (binding === undefined) continue;
    const original = binding.includes(' as ')
      ? (binding.split(/\s+as\s+/)[0] as string).trim()
      : name;
    const next = resolveFirstPartyImport(root, match[2] as string, sourcePath);
    if (next === null) continue;
    const resolved = resolveCitationIdentifier(
      root,
      next,
      original,
      depth - 1,
      seen,
    );
    if (resolved !== null) return resolved;
  }
  return null;
}

/**
 * Source with comments blanked.
 *
 * `components/mdx/cite-ref.tsx` documents itself with `<Cite
 * id="act-aloha-2023" />`, and every component that imports it would
 * otherwise inherit that id as a chip it owes the page.
 */
function withoutComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
}

function resolveFirstPartyImport(
  root: string,
  specifier: string,
  fromPath: string,
): string | null {
  const base = specifier.startsWith('@/')
    ? join(root, specifier.slice(2))
    : specifier.startsWith('.')
      ? resolve(dirname(join(root, fromPath)), specifier)
      : null;
  if (base === null) return null;
  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.mjs`,
    join(base, 'index.ts'),
    join(base, 'index.tsx'),
  ]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return relative(root, candidate);
    }
  }
  return null;
}

/**
 * Every citation id reachable from one module's own source and the
 * first-party modules it imports, three levels deep.
 *
 * The ids are recognised by the registry rather than by the shape of the
 * call that renders them: a chip whose id arrives through a data row
 * (`lib/competing-theses.ts` holds twenty) is as owned as one written in
 * the JSX, and a rule that only saw the JSX would call the data-driven ones
 * unowned.
 */
function citationIdsReachableFrom(
  root: string,
  sourcePath: string,
  depth = 3,
  seen = new Set<string>(),
): Set<string> {
  const ids = new Set<string>();
  if (
    depth < 0 ||
    seen.has(sourcePath) ||
    sourcePath === CITATION_VOCABULARY_MODULE
  ) {
    return ids;
  }
  seen.add(sourcePath);
  const text = withoutComments(readFileSync(join(root, sourcePath), 'utf8'));
  for (const match of text.matchAll(/['"]([A-Za-z0-9][A-Za-z0-9._-]{3,})['"]/g)) {
    if (getCitation(match[1] as string)) ids.add(match[1] as string);
  }
  for (const match of text.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    const next = resolveFirstPartyImport(root, match[1] as string, sourcePath);
    if (next === null) continue;
    for (const id of citationIdsReachableFrom(root, next, depth - 1, seen)) {
      ids.add(id);
    }
  }
  return ids;
}

type RegisteredMount = {
  id: string;
  route: string;
  sourceId: string;
};

/**
 * Data-row expansion is specific to the component's state model, not to
 * JSX site count. These are the two mapped citation sources in the current
 * census. Another source must supply its own derivation, never
 * fall back to one arbitrary citation from its reachable vocabulary.
 */
function mappedCitationOccurrences(
  sourcePath: string,
  expression: string,
): DynamicCitationSite['occurrences'] {
  if (sourcePath === 'components/interactive/milestones-watchlist.tsx' && expression === 'id') {
    const selected = MILESTONES[0];
    if (!selected || selected.citationIds.length === 0) {
      throw new Error('the default milestone has no citation occurrences');
    }
    return selected.citationIds.map((id, index) => ({
      key: `${selected.id}/citationIds/${index}`,
      id,
    }));
  }
  if (sourcePath !== 'components/interactive/thesis-explorer.tsx' || expression !== 'id') {
    throw new Error(
      `${sourcePath} has an unmodelled mapped citation id={${expression}}; derive its complete default-state occurrences before grading it`,
    );
  }
  const selected = THESES.find(({ id }) => id === DEFAULT_THESIS_ID);
  if (!selected) throw new Error('the default thesis has no data row');
  const occurrences = (['evidenceFor', 'evidenceAgainst'] as const).flatMap((side) =>
    selected[side].flatMap((row, rowIndex) =>
      row.citationIds.map((id, citationIndex) => ({
        key: `${selected.id}/${side}/${rowIndex}/${citationIndex}`,
        id,
      })),
    ),
  );
  if (occurrences.length === 0) throw new Error('the default thesis has no citation occurrences');
  return occurrences;
}

/**
 * The interactive mounts the census registered, by route.
 *
 * The registry is the same one `VAL-B2-STATE-*` quantifies over, so a
 * component that renders chips on a route it is not registered on is a
 * census failure there and an unowned chip here.
 */
function mountsByRoute(
  root: string,
): Map<string, Array<RegisteredMount & { sourcePath: string }>> {
  const registries = JSON.parse(
    readFileSync(join(root, REGISTRIES_PATH), 'utf8'),
  ) as {
    interactive: {
      sources: Array<{ id: string; sourcePath: string }>;
      mounts: RegisteredMount[];
    };
  };
  const sourcePathById = new Map(
    registries.interactive.sources.map(({ id, sourcePath }) => [id, sourcePath]),
  );
  const byRoute = new Map<
    string,
    Array<RegisteredMount & { sourcePath: string }>
  >();
  for (const mount of registries.interactive.mounts) {
    const sourcePath = sourcePathById.get(mount.sourceId);
    if (!sourcePath) {
      throw new Error(
        `${REGISTRIES_PATH} mounts ${mount.sourceId} at ${mount.route} without registering its source`,
      );
    }
    const list = byRoute.get(mount.route) ?? [];
    list.push({ ...mount, sourcePath });
    byRoute.set(mount.route, list);
  }
  return byRoute;
}

/**
 * The apparatus every published article is supposed to render, derived from
 * the registry exactly the way `app/(content)/[domain]/[slug]/page.tsx`
 * derives it. Keyed by route path so a sweep observation can be matched to
 * it without re-deriving the key.
 */
export function expectedApparatusGraph(
  root: string,
): Map<string, ExpectedApparatus> {
  if (cachedGraph) return cachedGraph;
  const backlinks = publishedBacklinkGraph();
  const mounts = mountsByRoute(root);
  const graph = new Map<string, ExpectedApparatus>();
  for (const entry of publishedModules()) {
    const key = `${entry.domain}/${entry.slug}`;
    const source = readFileSync(
      join(root, 'content', entry.domain, `${entry.slug}.mdx`),
      'utf8',
    );
    const frontmatter = matter(source).data as {
      seeAlso?: unknown;
      citations?: unknown;
    };
    const seeAlsoKeys = Array.isArray(frontmatter.seeAlso)
      ? frontmatter.seeAlso.filter((v): v is string => typeof v === 'string')
      : [];
    const declared = Array.isArray(frontmatter.citations)
      ? frontmatter.citations.filter((v): v is string => typeof v === 'string')
      : [];
    const body = moduleBody(source);
    const inline = inlineCitationIds(body);
    const references = resolveReferences(declared, inline, getCitation);
    const routeMounts = mounts.get(`/${key}/`) ?? [];
    const componentCitationSites: ComponentCitationSite[] = [];
    const dynamicCitationSites: DynamicCitationSite[] = [];
    const mountCitationOwners: MountCitationOwner[] = [];
    for (const mount of routeMounts) {
      const componentSource = withoutComments(
        readFileSync(join(root, mount.sourcePath), 'utf8'),
      );
      for (const match of componentSource.matchAll(LITERAL_CITE_SITE)) {
        componentCitationSites.push({
          mountId: mount.id,
          sourcePath: mount.sourcePath,
          id: match[1] as string,
          spelling: 'literal',
        });
      }
      for (const match of componentSource.matchAll(EXPRESSION_CITE_SITE)) {
        const expression = (match[1] as string).trim();
        const resolved = resolveCitationIdentifier(
          root,
          mount.sourcePath,
          expression,
        );
        if (resolved !== null) {
          componentCitationSites.push({
            mountId: mount.id,
            sourcePath: mount.sourcePath,
            id: resolved,
            spelling: 'identifier',
          });
          continue;
        }
        dynamicCitationSites.push({
          mountId: mount.id,
          sourcePath: mount.sourcePath,
          expression,
          occurrences: mappedCitationOccurrences(mount.sourcePath, expression),
        });
      }
      mountCitationOwners.push({
        mountId: mount.id,
        sourcePath: mount.sourcePath,
        ids: [...citationIdsReachableFrom(root, mount.sourcePath)].sort(),
      });
    }
    graph.set(`/${key}/`, {
      key,
      breadcrumb: [
        { label: 'Home', href: '/' },
        { label: DOMAIN_META[entry.domain].name, href: `/${entry.domain}/` },
        { label: entry.title, href: null },
      ],
      seeAlso: resolveArticleEntries(seeAlsoKeys, modules).map(
        (item) => item.key,
      ),
      linkedFrom: resolveArticleEntries(backlinks.get(key) ?? [], modules).map(
        (item) => item.key,
      ),
      references: references.map(({ citation }) => citation.id),
      citationMarkers: [...body.matchAll(/<Cite\s+id=["']([^"']+)["']/g)].map(
        (match) => match[1] as string,
      ),
      furtherReading: references
        .filter(({ furtherReading }) => furtherReading)
        .map(({ citation }) => citation.id),
      componentCitationSites,
      dynamicCitationSites,
      mountCitationOwners,
    });
  }
  if (graph.size === 0) {
    throw new Error(
      'the expected apparatus graph is empty: no published article was derived, so every preservation verdict would pass vacuously',
    );
  }
  // Three site populations, and each one is a scanner that can go quiet
  // instead of red: a regex that stops matching, a constant resolver that
  // stops resolving, or an expression classifier that files every dynamic
  // site as fixed. A silent scanner turns a floor into no floor at all,
  // which is the exact failure this row was reopened for, so each is
  // required to find members rather than merely to run.
  const sites = [...graph.values()].flatMap(
    ({ componentCitationSites: own }) => own,
  );
  const counts = {
    literal: sites.filter(({ spelling }) => spelling === 'literal').length,
    identifier: sites.filter(({ spelling }) => spelling === 'identifier').length,
    dynamic: [...graph.values()].flatMap(
      ({ dynamicCitationSites: own }) => own,
    ).length,
  };
  for (const [kind, count] of Object.entries(counts)) {
    if (count === 0) {
      throw new Error(
        `the component citation scan found no ${kind} <CiteRef> site in any mounted component, so that spelling imposes no floor on any article`,
      );
    }
  }
  cachedGraph = graph;
  return graph;
}

const crumbSchema = z.object({
  text: z.string(),
  tag: z.string(),
  href: z.string().nullable(),
  isLink: z.boolean(),
  ariaCurrent: z.string().nullable(),
  /** Computed treatment, so a colour-only link affordance is visible here. */
  colour: z.string(),
  decorationLine: z.string(),
});

const referenceEntrySchema = z.object({
  id: z.string(),
  index: z.number(),
  sourceHref: z.string(),
  title: z.string(),
  colour: z.string(),
  decorationLine: z.string(),
  contrast: z.number(),
  furtherReading: z.boolean(),
  /** How far the entry's box extends past the article column, in px. */
  overflowPx: z.number(),
  focusable: z.boolean(),
});

const citationChipSchema = z.object({
  id: z.string(),
  label: z.string(),
  href: z.string(),
  opensExternally: z.boolean(),
  /**
   * The metadata the chip's tooltip carries. It lives in the DOM at rest
   * and is revealed by CSS, so its content is readable without driving a
   * pointer; the reveal itself is asserted by the interaction spec.
   */
  tooltipText: z.string(),
  /** Whether `aria-describedby` resolves to the element holding that text. */
  describedByResolves: z.boolean(),
  referenceHref: z.string().nullable(),
  inProse: z.boolean(),
});

const termSchema = z.object({
  id: z.string(),
  text: z.string(),
  href: z.string(),
  focusable: z.boolean(),
  describedByResolves: z.boolean(),
  tooltipText: z.string(),
  decorationLine: z.string(),
  decorationStyle: z.string(),
  /** Distinguishable from surrounding prose by something other than hue. */
  distinguishedWithoutColour: z.boolean(),
});

const furnitureLinkSchema = z.object({
  section: z.string(),
  href: z.string(),
  text: z.string(),
  /** Position among the page's focusable elements, in document order. */
  documentOrder: z.number(),
  /**
   * Which Tab press focused this link, or -1 if the walk never reached it.
   * A real key press, so an ancestor that is `inert`, a trap above the
   * link or a positive `tabindex` that reordered the page all show up here
   * as they would for a reader.
   */
  tabStop: z.number(),
  /** How many times Tab was pressed, so an unreached link is falsifiable. */
  tabPresses: z.number(),
  restingRing: z.string(),
  /** The ring at the moment the keyboard focused it; null if never reached. */
  focusedRing: z.string().nullable(),
  /** Whether `:focus-visible` matched under the real keyboard press. */
  focusVisible: z.boolean(),
});

export type FurnitureLinkObservation = z.infer<typeof furnitureLinkSchema>;

const observationSchema = z.object({
  route: z.string(),
  viewport: z.string(),
  documentScrollWidth: z.number(),
  viewportWidth: z.number(),
  visibleTextLength: z.number(),
  breadcrumb: z.object({
    landmarkCount: z.number(),
    label: z.string().nullable(),
    distinctFromTaxonomyNav: z.boolean(),
    items: z.array(crumbSchema),
  }),
  /** Every `aria-current="page"` in the document, as a short outline. */
  ariaCurrentPage: z.array(
    z.object({
      outline: z.string(),
      /** Absolute href when the marked element is an anchor. */
      href: z.string().nullable(),
      insideNavLandmark: z.boolean(),
      matchesRoute: z.boolean(),
    }),
  ),
  /** Whether the route has a matching shell navigation link. */
  hasMatchingNavLink: z.boolean(),
  references: z.object({
    present: z.boolean(),
    headingId: z.string().nullable(),
    headingText: z.string().nullable(),
    entries: z.array(referenceEntrySchema),
  }),
  seeAlso: z.object({ present: z.boolean(), keys: z.array(z.string()) }),
  linkedFrom: z.object({ present: z.boolean(), keys: z.array(z.string()) }),
  citations: z.array(citationChipSchema),
  terms: z.array(termSchema),
  furnitureLinks: z.array(furnitureLinkSchema),
});

export const apparatusRuntimeEvidenceSchema = z.object({
  version: z.literal(1),
  fingerprint: z.string(),
  viewports: z.array(z.string()),
  articleRoutes: z.array(z.string()),
  observations: z.array(observationSchema),
});

export type ApparatusRuntimeEvidence = z.infer<
  typeof apparatusRuntimeEvidenceSchema
>;
export type ApparatusObservation = z.infer<typeof observationSchema>;
export type ReferenceEntryObservation = z.infer<typeof referenceEntrySchema>;
export type CitationChipObservation = z.infer<typeof citationChipSchema>;
export type TermObservation = z.infer<typeof termSchema>;

/** One member's reading, and every way it failed the requirement. */
export type Verdict<Observed> = {
  id: string;
  observed: Observed;
  failures: string[];
};

/**
 * Accepts the persisted sweep only when it is the sweep this tree needs:
 * current fingerprint, both declared viewports, exactly the registered
 * article routes in both directions, one observation per route and
 * viewport, a non-empty rendered page behind every one, and a route set
 * that agrees with the derived graph. Anything else throws.
 */
export function readApparatusRuntimeEvidence(input: {
  artifact: unknown;
  articleRoutes: string[];
  fingerprint: string;
  root: string;
}): ApparatusRuntimeEvidence {
  const envelope = input.artifact;
  if (!envelope || typeof envelope !== 'object') {
    throw new Error('apparatus runtime evidence is not an object');
  }
  const { version, fingerprint } = envelope as {
    version?: unknown;
    fingerprint?: unknown;
  };
  if (version !== 1) {
    throw new Error(
      `apparatus runtime evidence version ${String(version)} is not 1`,
    );
  }
  if (fingerprint !== input.fingerprint) {
    throw new Error(
      'apparatus runtime evidence is stale: an article, a relationship edge, or a sealed threshold changed since the sweep ran. Re-run npm run refresh:brand-v2-evidence.',
    );
  }
  const artifact = parseEvidenceArtifact(
    apparatusRuntimeEvidenceSchema,
    envelope,
    'apparatus runtime evidence',
  );

  if (input.articleRoutes.length === 0) {
    throw new Error('apparatus evidence article-route population is empty');
  }
  const expectedViewports = APPARATUS_VIEWPORTS.map(({ id }) => id);
  if (
    JSON.stringify([...artifact.viewports].sort()) !==
    JSON.stringify([...expectedViewports].sort())
  ) {
    throw new Error(
      `apparatus runtime evidence was swept at ${artifact.viewports.join(', ')}, not ${expectedViewports.join(', ')}`,
    );
  }
  if (
    JSON.stringify([...artifact.articleRoutes].sort()) !==
    JSON.stringify([...input.articleRoutes].sort())
  ) {
    throw new Error(
      `apparatus runtime evidence covers ${artifact.articleRoutes.length} article routes, not the ${input.articleRoutes.length} registered ones`,
    );
  }

  // The registry and the derived graph are two independent statements about
  // which routes are articles. A disagreement means one of them is wrong and
  // neither can be trusted to bound the sweep.
  const graph = expectedApparatusGraph(input.root);
  const ungraphed = artifact.articleRoutes.filter((route) => !graph.has(route));
  if (ungraphed.length > 0) {
    throw new Error(
      `apparatus runtime evidence sweeps ${ungraphed[0]}, which the derived apparatus graph does not contain`,
    );
  }
  const unswept = [...graph.keys()].filter(
    (route) => !artifact.articleRoutes.includes(route),
  );
  if (unswept.length > 0) {
    throw new Error(
      `the derived apparatus graph contains ${unswept[0]}, which the sweep never visited`,
    );
  }

  const seen = new Set<string>();
  for (const observation of artifact.observations) {
    const key = `${observation.route}|${observation.viewport}`;
    if (seen.has(key)) {
      throw new Error(`apparatus runtime evidence records ${key} twice`);
    }
    seen.add(key);
    if (!artifact.articleRoutes.includes(observation.route)) {
      throw new Error(
        `apparatus runtime evidence records ${observation.route}, which is not a registered article route`,
      );
    }
    if (observation.visibleTextLength <= 0) {
      throw new Error(
        `apparatus runtime evidence records an empty page at ${key}: a blank render cannot decide an apparatus claim`,
      );
    }
    if (observation.breadcrumb.items.length === 0) {
      throw new Error(
        `apparatus runtime evidence found no breadcrumb trail at ${key}, so the trail it is evidence about did not render`,
      );
    }
    if (!observation.references.present) {
      throw new Error(
        `apparatus runtime evidence found no References section at ${key}: every published article carries a bibliography, so a missing one is a broken sweep or a broken page, never a passing member`,
      );
    }
  }
  const missing = artifact.articleRoutes
    .flatMap((route) => expectedViewports.map((v) => `${route}|${v}`))
    .filter((key) => !seen.has(key));
  if (missing.length > 0) {
    throw new Error(
      `apparatus runtime evidence is missing ${missing.length} route/viewport reading(s), starting with ${missing[0]}`,
    );
  }
  return artifact;
}

function observationsBy(
  evidence: ApparatusRuntimeEvidence,
): Map<string, ApparatusObservation> {
  return new Map(
    evidence.observations.map((observation) => [
      `${observation.route}|${observation.viewport}`,
      observation,
    ]),
  );
}

function at(
  evidence: ApparatusRuntimeEvidence,
  route: string,
  viewport: string,
): ApparatusObservation {
  const observation = observationsBy(evidence).get(`${route}|${viewport}`);
  if (!observation) {
    throw new Error(`the apparatus sweep did not visit ${route} at ${viewport}`);
  }
  return observation;
}

function sameSequence(observed: string[], expected: string[]): boolean {
  return JSON.stringify(observed) === JSON.stringify(expected);
}

/**
 * The first member of `required` that `observed` does not carry, in order.
 * `null` when `required` is an ordered subsequence of `observed`.
 *
 * Used where the rendered set is legitimately larger than the derived one
 * and the claim is containment plus order, not equality.
 */
function subsequenceGap(
  observed: string[],
  required: string[],
): string | null {
  let cursor = 0;
  for (const wanted of required) {
    const found = observed.indexOf(wanted, cursor);
    if (found === -1) return wanted;
    cursor = found + 1;
  }
  return null;
}

export type RelationshipManifestMember = { id: string; hash: string };

export type RelationshipDelta = {
  id: string;
  manifest: string;
  memberId: string;
  oldHash: string;
  newHash: string;
};

export const RELATIONSHIP_BASELINE_PATH =
  'evidence/brand-v2/baseline/relationships.json';

/**
 * What the v2 rollout did to the source side of each article's relationships.
 *
 * `VAL-B2-ART-010` says the relationships are "unchanged by the v2
 * rollout", and everything else in this file compares the rendered page
 * against the graph derived from the tree that is shipping now. Those two
 * sides move together: an edit that dropped a `seeAlso` edge or a `<Cite>`
 * from an MDX body changes the page and the expectation at once, and the
 * comparison stays green over a relationship the rollout was not allowed to
 * touch. The immutable manifest sealed before the rollout is the only side
 * that cannot move, so the row is bound to it here: the rebuilt member hash
 * must equal the sealed one, or an approved delta must name that exact
 * change.
 *
 * The hashes are rebuilt by the same collector the baseline was sealed with
 * (`scripts/brand-v2-baseline.ts#collectArticleTruthManifests`), passed in
 * rather than imported so this module stays loadable without dragging the
 * whole census collection behind it.
 */
/** The sealed pre-rollout relationship members, as the migration wrote them. */
export function readSealedRelationshipMembers(
  root: string,
): RelationshipManifestMember[] {
  const manifest = JSON.parse(
    readFileSync(join(root, RELATIONSHIP_BASELINE_PATH), 'utf8'),
  ) as { kind?: string; members?: RelationshipManifestMember[] };
  if (manifest.kind !== 'relationships' || !Array.isArray(manifest.members)) {
    throw new Error(
      `${RELATIONSHIP_BASELINE_PATH} is not a sealed relationships manifest`,
    );
  }
  return manifest.members;
}

/** The approved deltas, read where every other consumer reads them. */
export function readRelationshipDeltas(
  root: string,
  manifest = 'relationships',
): RelationshipDelta[] {
  const file = JSON.parse(
    readFileSync(
      join(root, 'contract', 'brand-v2-approved-deltas.json'),
      'utf8',
    ),
  ) as { entries?: RelationshipDelta[] };
  return (file.entries ?? []).filter((entry) => entry.manifest === manifest);
}

export const ARTICLE_METADATA_BASELINE_PATH =
  'evidence/brand-v2/baseline/article-metadata.json';

/** The sealed pre-rollout frontmatter facts, as the migration wrote them. */
export function readSealedFrontmatterFactMembers(
  root: string,
): RelationshipManifestMember[] {
  const manifest = JSON.parse(
    readFileSync(join(root, ARTICLE_METADATA_BASELINE_PATH), 'utf8'),
  ) as { kind?: string; members?: RelationshipManifestMember[] };
  if (manifest.kind !== 'article-metadata' || !Array.isArray(manifest.members)) {
    throw new Error(
      `${ARTICLE_METADATA_BASELINE_PATH} is not a sealed article-metadata manifest`,
    );
  }
  return manifest.members.filter(({ id }) =>
    id.startsWith('article-fact-frontmatter:'),
  );
}

/**
 * The half of "references ... unchanged" that lives in the frontmatter.
 *
 * `expectedApparatusGraph` resolves the References list from the frontmatter
 * the tree is shipping now, so an added or removed declared source moves the
 * rendered bibliography and the expectation it is compared against in the
 * same commit. The sealed `article-fact-frontmatter:` members are the side
 * that cannot move with it.
 */
export function frontmatterFactDrift(input: {
  sealed: readonly RelationshipManifestMember[];
  current: readonly RelationshipManifestMember[];
  deltas: readonly RelationshipDelta[];
}): Map<string, string[]> {
  const routeOf = (memberId: string) =>
    `/${memberId.replace(/^article-fact-frontmatter:/, '')}/`;
  if (input.sealed.length === 0 || input.current.length === 0) {
    throw new Error(
      'the frontmatter-fact comparison has an empty side, so every article would read as preserving its declared References',
    );
  }
  const sealedByMember = new Map(
    input.sealed.map((member) => [member.id, member]),
  );
  const deltaByMember = new Map(
    input.deltas.map((delta) => [delta.memberId, delta]),
  );
  const drift = new Map<string, string[]>();
  const add = (route: string, failure: string) => {
    drift.set(route, [...(drift.get(route) ?? []), failure]);
  };
  const currentIds = new Set(input.current.map(({ id }) => id));
  for (const sealed of input.sealed) {
    if (currentIds.has(sealed.id)) continue;
    throw new Error(
      `${sealed.id} is sealed in ${ARTICLE_METADATA_BASELINE_PATH} and absent from the tree, so its declared References cannot be compared at all`,
    );
  }
  for (const member of input.current) {
    const route = routeOf(member.id);
    const sealed = sealedByMember.get(member.id);
    const delta = deltaByMember.get(member.id);
    if (!sealed) {
      if (!delta) {
        add(
          route,
          `${route} declares frontmatter References the migration baseline never sealed, and no approved delta adds ${member.id}`,
        );
      }
      continue;
    }
    if (sealed.hash === member.hash) continue;
    if (!delta) {
      add(
        route,
        `${route} changed the frontmatter review date or declared References the migration sealed (${sealed.hash.slice(0, 12)} -> ${member.hash.slice(0, 12)}), and no approved delta names the change`,
      );
      continue;
    }
    if (delta.oldHash !== sealed.hash || delta.newHash !== member.hash) {
      add(
        route,
        `${route} is covered by approved delta ${delta.id} for ${delta.oldHash.slice(0, 12)} -> ${delta.newHash.slice(0, 12)}, but its frontmatter moved ${sealed.hash.slice(0, 12)} -> ${member.hash.slice(0, 12)}`,
      );
    }
  }
  return drift;
}

/** The drift map every caller of `VAL-B2-ART-010` passes, built once here. */
export function relationshipSourceDrift(root: string): Map<string, string[]> {
  const drift = relationshipBaselineDrift({
    sealed: readSealedRelationshipMembers(root),
    current: currentRelationshipMembers(root),
    deltas: readRelationshipDeltas(root),
  });
  const frontmatter = frontmatterFactDrift({
    sealed: readSealedFrontmatterFactMembers(root),
    current: currentArticleFactFrontmatterMembers(root),
    deltas: readRelationshipDeltas(root, 'article-metadata'),
  });
  for (const [route, failures] of frontmatter) {
    drift.set(route, [...(drift.get(route) ?? []), ...failures]);
  }
  return drift;
}

export function relationshipBaselineDrift(input: {
  sealed: readonly RelationshipManifestMember[];
  current: readonly RelationshipManifestMember[];
  deltas: readonly RelationshipDelta[];
}): Map<string, string[]> {
  const routeOf = (memberId: string) => `/${memberId.replace(/^article:/, '')}/`;
  const sealedByMember = new Map(
    input.sealed.map((member) => [member.id, member]),
  );
  const deltaByMember = new Map(
    input.deltas
      .filter(({ manifest }) => manifest === 'relationships')
      .map((delta) => [`article:${delta.memberId.replace(/^article:/, '')}`, delta]),
  );
  const drift = new Map<string, string[]>();
  const add = (route: string, failure: string) => {
    drift.set(route, [...(drift.get(route) ?? []), failure]);
  };
  if (input.sealed.length === 0 || input.current.length === 0) {
    throw new Error(
      'the relationships baseline comparison has an empty side, so every article would read as preserved',
    );
  }
  const currentIds = new Set(input.current.map(({ id }) => id));
  for (const sealed of input.sealed) {
    if (currentIds.has(sealed.id)) continue;
    throw new Error(
      `${sealed.id} is sealed in ${RELATIONSHIP_BASELINE_PATH} and absent from the tree, so its relationships cannot be compared at all`,
    );
  }
  for (const member of input.current) {
    const route = routeOf(member.id);
    const sealed = sealedByMember.get(member.id);
    const delta = deltaByMember.get(member.id);
    if (!sealed) {
      if (!delta) {
        add(
          route,
          `${route} carries relationships the migration baseline never sealed, and no approved delta adds ${member.id}`,
        );
      }
      continue;
    }
    if (sealed.hash === member.hash) continue;
    if (!delta) {
      add(
        route,
        `${route} changed the relationships the migration sealed (${sealed.hash.slice(0, 12)} -> ${member.hash.slice(0, 12)}), and no approved delta names the change`,
      );
      continue;
    }
    if (delta.oldHash !== sealed.hash || delta.newHash !== member.hash) {
      add(
        route,
        `${route} is covered by approved delta ${delta.id} for ${delta.oldHash.slice(0, 12)} -> ${delta.newHash.slice(0, 12)}, but the tree moved ${sealed.hash.slice(0, 12)} -> ${member.hash.slice(0, 12)}`,
      );
    }
  }
  return drift;
}

/**
 * Which chip occurrences the page owes, and who owns the rest.
 *
 * Occurrences, not ids: an article that cites one source in three sentences
 * renders three chips, and a component that adds a fourth for the same
 * source is adding a chip, not repeating one. Counting ids would hide
 * exactly the disappearance this is here to catch.
 */
function citationOwnershipFailures(
  route: string,
  rendered: string[],
  expected: ExpectedApparatus,
): string[] {
  const failures: string[] = [];
  const tally = (ids: readonly string[]) => {
    const counts = new Map<string, number>();
    for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
    return counts;
  };
  const renderedCounts = tally(rendered);
  const owed = tally(expected.citationMarkers);
  for (const site of expected.componentCitationSites) {
    owed.set(site.id, (owed.get(site.id) ?? 0) + 1);
  }
  for (const site of expected.componentCitationSites) {
    const want = owed.get(site.id) ?? 0;
    const got = renderedCounts.get(site.id) ?? 0;
    if (got < want) {
      failures.push(
        `${route} renders ${got} chip(s) for "${site.id}" where the body and ${site.sourcePath} write ${want}: the ${site.spelling}-spelled chip ${site.mountId} cites is gone`,
      );
    }
  }
  const ownedByMount = new Set(
    expected.mountCitationOwners.flatMap(({ ids }) => ids),
  );
  const surplus = new Map<string, number>();
  for (const [id, count] of renderedCounts) {
    const floor = owed.get(id) ?? 0;
    if (count <= floor) continue;
    surplus.set(id, count - floor);
    if (!ownedByMount.has(id)) {
      failures.push(
        `${route} renders ${count - floor} citation chip(s) for "${id}" that neither its body nor any component it mounts sources`,
      );
    }
  }
  // A mapped expression can render many chips, including ids already cited
  // by body prose. Expand every data row and account for each occurrence
  // above the body/fixed-site counts. Seven surviving chips cannot cover an
  // eighth missing chip, nor can another id replace it.
  const dynamicPerMount = new Map<string, DynamicCitationSite[]>();
  for (const site of expected.dynamicCitationSites) {
    dynamicPerMount.set(site.mountId, [
      ...(dynamicPerMount.get(site.mountId) ?? []),
      site,
    ]);
  }
  for (const owner of expected.mountCitationOwners) {
    const sites = dynamicPerMount.get(owner.mountId) ?? [];
    if (sites.length === 0) continue;
    const rendered = owner.ids.reduce(
      (sum, id) => sum + (surplus.get(id) ?? 0),
      0,
    );
    const occurrences = sites.flatMap((site) => site.occurrences);
    if (rendered !== occurrences.length) {
      failures.push(
        `${route} renders ${rendered} chip(s) sourced by ${owner.sourcePath} where its ${sites.length} data-driven site(s) [${sites
          .map(({ expression }) => `id={${expression}}`)
          .join(', ')}] expand to ${occurrences.length} mapped occurrences`,
      );
    }
    for (const [id, count] of tally(occurrences.map((occurrence) => occurrence.id))) {
      const got = surplus.get(id) ?? 0;
      if (got !== count) {
        failures.push(
          `${route} mapped citation "${id}" in ${owner.sourcePath} renders ${got} occurrence(s), expected ${count} from data rows [${occurrences.filter((occurrence) => occurrence.id === id).map(({ key }) => key).join(', ')}]`,
        );
      }
    }
  }
  return failures;
}

/**
 * `VAL-B2-ART-010`: the rendered relationship graph is the graph the
 * registry derives. Order matters on all four lists: a bibliography whose
 * entries are the right set in the wrong order renumbers every chip's
 * target, and a `See also` reordered by the rollout is a curation change
 * the rollout was not allowed to make.
 *
 * The member is the route, and the observation is read at desktop. The
 * relationship graph is a property of the document, not of the viewport, so
 * grading it twice would double every failure without adding a check; the
 * mobile reading is still swept, and `apparatusViewportAgreement` below
 * asserts the two agree, which is the check that a responsive branch did
 * not quietly drop a section.
 *
 * `sourceDrift` is the other half of the word "unchanged": the rendered
 * side answers to the derived graph, and the derived graph answers to the
 * sealed migration manifest through `relationshipBaselineDrift`.
 */
export function relationshipPreservationVerdicts(
  evidence: ApparatusRuntimeEvidence,
  root: string,
  sourceDrift: Map<string, string[]>,
): Map<string, Verdict<Record<string, string[]>>> {
  const graph = expectedApparatusGraph(root);
  const verdicts = new Map<string, Verdict<Record<string, string[]>>>();
  for (const route of evidence.articleRoutes) {
    const expected = graph.get(route);
    if (!expected) {
      throw new Error(`no derived apparatus expectation for ${route}`);
    }
    const desktop = at(evidence, route, APPARATUS_DESKTOP_VIEWPORT_ID);
    const mobile = at(evidence, route, APPARATUS_MOBILE_VIEWPORT_ID);
    const failures: string[] = [];

    const renderedReferences = desktop.references.entries.map(({ id }) => id);
    if (!sameSequence(renderedReferences, expected.references)) {
      failures.push(
        `${route} renders references [${renderedReferences.join(', ')}] where the registry derives [${expected.references.join(', ')}]`,
      );
    }
    // The rendered chips are a SUPERSET of the ones the MDX declares, and
    // that is correct rather than drift: six routes mount a component that
    // renders chips of its own (`lib/competing-theses.ts` feeds the largest,
    // eight), so a body-only expectation is the incomplete side of the
    // comparison. Equality here would fail six healthy articles.
    //
    // A superset with nothing said about the surplus is the other error, and
    // it is the one that shipped: nineteen chip occurrences on six routes
    // belonged to no expectation at all, so a component could stop rendering
    // its chips - or start rendering one for an id nothing on the page
    // sources - and this row would still pass. Every occurrence is now
    // accounted for. The floor is the body's chips plus one per literal
    // `<CiteRef id="..."/>` site in a component the route mounts, and
    // anything above the floor has to be an id one of those mounts can
    // reach.
    const renderedMarkers = desktop.citations.map(({ id }) => id);
    const missingInline = subsequenceGap(
      renderedMarkers,
      expected.citationMarkers,
    );
    if (missingInline !== null) {
      failures.push(
        `${route} no longer renders the inline citation marker "${missingInline}" the body declares, in body order (${expected.citationMarkers.length} declared, ${renderedMarkers.length} rendered)`,
      );
    }
    failures.push(...citationOwnershipFailures(route, renderedMarkers, expected));
    const unregistered = renderedMarkers.filter((id) => !getCitation(id));
    if (unregistered.length > 0) {
      failures.push(
        `${route} renders citation marker(s) [${[...new Set(unregistered)].join(', ')}] that the citation registry does not hold`,
      );
    }
    failures.push(...(sourceDrift.get(route) ?? []));
    if (!sameSequence(desktop.seeAlso.keys, expected.seeAlso)) {
      failures.push(
        `${route} renders See also [${desktop.seeAlso.keys.join(', ')}] where the frontmatter curates [${expected.seeAlso.join(', ')}]`,
      );
    }
    if (!sameSequence(desktop.linkedFrom.keys, expected.linkedFrom)) {
      failures.push(
        `${route} renders Linked from [${desktop.linkedFrom.keys.join(', ')}] where the link graph derives [${expected.linkedFrom.join(', ')}]`,
      );
    }
    // An empty section renders nothing at all, so presence is decided by the
    // expectation rather than assumed. Asserting both directions is what
    // stops a template that dropped the section from passing on the routes
    // whose list happens to be empty.
    if (desktop.seeAlso.present !== expected.seeAlso.length > 0) {
      failures.push(
        `${route} ${desktop.seeAlso.present ? 'renders' : 'omits'} a See also section for ${expected.seeAlso.length} curated edge(s)`,
      );
    }
    if (desktop.linkedFrom.present !== expected.linkedFrom.length > 0) {
      failures.push(
        `${route} ${desktop.linkedFrom.present ? 'renders' : 'omits'} a Linked from section for ${expected.linkedFrom.length} inbound edge(s)`,
      );
    }
    const furtherReading = desktop.references.entries
      .filter(({ furtherReading: flag }) => flag)
      .map(({ id }) => id);
    if (!sameSequence(furtherReading, expected.furtherReading)) {
      failures.push(
        `${route} marks [${furtherReading.join(', ')}] as further reading where the body scan derives [${expected.furtherReading.join(', ')}]`,
      );
    }
    for (const [family, desktopValue, mobileValue] of [
      ['references', renderedReferences, mobile.references.entries.map((e) => e.id)],
      ['see-also', desktop.seeAlso.keys, mobile.seeAlso.keys],
      ['linked-from', desktop.linkedFrom.keys, mobile.linkedFrom.keys],
      ['citations', renderedMarkers, mobile.citations.map(({ id }) => id)],
    ] as const) {
      if (!sameSequence([...mobileValue], [...desktopValue])) {
        failures.push(
          `${route} renders a different ${family} list at 375px than at 1440px`,
        );
      }
    }

    verdicts.set(route, {
      id: route,
      observed: {
        references: renderedReferences,
        citationMarkers: renderedMarkers,
        seeAlso: desktop.seeAlso.keys,
        linkedFrom: desktop.linkedFrom.keys,
      },
      failures,
    });
  }
  if (verdicts.size === 0) {
    throw new Error(
      'the relationship-preservation population is empty, so its verdicts would pass vacuously',
    );
  }
  return verdicts;
}

/**
 * `VAL-WIKI-016`: the trail is `home > domain > article`, the domain crumb
 * points at `/<domain>/`, the current crumb is not a link, and the
 * document's `aria-current="page"` inventory is truthful.
 *
 * Graded per route and viewport, because a wrapped trail at 375px is where
 * a level goes missing.
 */
export function breadcrumbTruthVerdicts(
  evidence: ApparatusRuntimeEvidence,
  root: string,
): Map<string, Verdict<ApparatusObservation['breadcrumb']>> {
  const graph = expectedApparatusGraph(root);
  const verdicts = new Map<
    string,
    Verdict<ApparatusObservation['breadcrumb']>
  >();
  for (const observation of evidence.observations) {
    const expected = graph.get(observation.route);
    if (!expected) {
      throw new Error(`no derived apparatus expectation for ${observation.route}`);
    }
    const id = `${observation.route}|${observation.viewport}`;
    const failures: string[] = [];
    const { breadcrumb } = observation;

    if (breadcrumb.landmarkCount !== 1) {
      failures.push(
        `${id} exposes ${breadcrumb.landmarkCount} breadcrumb landmarks, not exactly one`,
      );
    }
    if (!breadcrumb.label) {
      failures.push(`${id} exposes an unlabeled breadcrumb landmark`);
    }
    if (!breadcrumb.distinctFromTaxonomyNav) {
      failures.push(
        `${id} exposes the breadcrumb trail inside the taxonomy navigation instead of as its own landmark`,
      );
    }
    if (breadcrumb.items.length !== expected.breadcrumb.length) {
      failures.push(
        `${id} renders ${breadcrumb.items.length} crumbs, not the ${expected.breadcrumb.length} the trail declares`,
      );
    }
    expected.breadcrumb.forEach((want, index) => {
      const got = breadcrumb.items[index];
      if (!got) {
        failures.push(`${id} is missing crumb ${index + 1} (${want.label})`);
        return;
      }
      if (got.text !== want.label) {
        failures.push(
          `${id} crumb ${index + 1} reads "${got.text}", not "${want.label}"`,
        );
      }
      if (want.href === null) {
        if (got.isLink) {
          failures.push(`${id} renders the current crumb as a link`);
        }
        if (got.ariaCurrent !== null) {
          failures.push(
            `${id} puts aria-current="${got.ariaCurrent}" on the non-link current crumb`,
          );
        }
      } else {
        if (!got.isLink) {
          failures.push(`${id} renders the ${want.label} crumb as plain text`);
        }
        if (got.href !== want.href) {
          failures.push(
            `${id} points the ${want.label} crumb at ${got.href ?? 'nothing'}, not ${want.href}`,
          );
        }
        // design-system 4.4: a link's affordance must be carried by more
        // than hue, and an ancestor crumb differs from the non-link current
        // crumb by colour alone without it.
        if (!got.decorationLine.includes('underline')) {
          failures.push(
            `${id} gives the ${want.label} crumb no non-colour link affordance (text-decoration: ${got.decorationLine})`,
          );
        }
      }
    });

    // The article route has no shell navigation item of its own on some
    // routes; the contract allows exactly one aria-current="page" and only
    // when a matching navigation link exists.
    const allowed = observation.hasMatchingNavLink ? 1 : 0;
    if (observation.ariaCurrentPage.length !== allowed) {
      failures.push(
        `${id} exposes ${observation.ariaCurrentPage.length} aria-current="page" element(s) where ${allowed} is truthful for this route`,
      );
    }
    // The count is only half of it. The marker has to be ON the navigation
    // link that leads here: a marker parked on some other element still
    // counts as one, and a screen reader is then told the wrong item is the
    // current page while the real one is announced as an ordinary link.
    for (const marker of observation.ariaCurrentPage) {
      if (!marker.insideNavLandmark) {
        failures.push(
          `${id} marks an element outside every navigation landmark as the current page: ${marker.outline}`,
        );
      }
      if (!marker.matchesRoute) {
        failures.push(
          `${id} marks ${marker.href ?? 'a non-link element'} as the current page, which is not this route`,
        );
      }
    }

    verdicts.set(id, { id, observed: breadcrumb, failures });
  }
  if (verdicts.size === 0) {
    throw new Error(
      'the breadcrumb population is empty, so its verdicts would pass vacuously',
    );
  }
  return verdicts;
}

/**
 * `VAL-WIKI-006`: the bibliography is readable at both widths. Entries meet
 * AA, long titles and URLs wrap inside the article column instead of
 * widening the document, and every source link is keyboard reachable.
 *
 * The member is the reference ENTRY, not the route. A route with nine
 * wrapping entries and one that overflows is not a route that passes, and
 * grading by route would let the nine outvote the one.
 */
export function referenceSheetVerdicts(
  evidence: ApparatusRuntimeEvidence,
): Map<string, Verdict<ReferenceEntryObservation>> {
  const verdicts = new Map<string, Verdict<ReferenceEntryObservation>>();
  for (const observation of evidence.observations) {
    for (const entry of observation.references.entries) {
      const id = `${observation.route}|${observation.viewport}|${entry.id}`;
      const failures: string[] = [];
      if (entry.contrast < APPARATUS_CONTRAST_FLOOR) {
        failures.push(
          `${id} renders its source link at ${entry.contrast.toFixed(2)}:1, below the ${APPARATUS_CONTRAST_FLOOR}:1 floor`,
        );
      }
      if (entry.overflowPx > 0) {
        failures.push(
          `${id} overflows the article column by ${entry.overflowPx.toFixed(1)}px`,
        );
      }
      if (!entry.focusable) {
        failures.push(`${id} exposes a source link that Tab cannot reach`);
      }
      // design-system 4.4: source links are signal blue plus underline.
      if (entry.colour !== SIGNAL_BLUE_RENDERED) {
        failures.push(
          `${id} sets its source link in ${entry.colour}, not signal blue ${SIGNAL_BLUE_RENDERED}`,
        );
      }
      if (!entry.decorationLine.includes('underline')) {
        failures.push(
          `${id} gives its source link no underline to supplement the hue`,
        );
      }
      if (!entry.sourceHref) {
        failures.push(`${id} renders an unresolved source link`);
      }
      verdicts.set(id, { id, observed: entry, failures });
    }
    if (observation.documentScrollWidth > observation.viewportWidth) {
      const id = `${observation.route}|${observation.viewport}|document`;
      verdicts.set(id, {
        id,
        observed: {
          id: 'document',
          index: -1,
          sourceHref: '',
          title: '',
          colour: '',
          decorationLine: '',
          contrast: 0,
          furtherReading: false,
          overflowPx:
            observation.documentScrollWidth - observation.viewportWidth,
          focusable: true,
        },
        failures: [
          `${id} scrolls to ${observation.documentScrollWidth}px inside a ${observation.viewportWidth}px viewport`,
        ],
      });
    }
  }
  if (verdicts.size === 0) {
    throw new Error(
      'the reference-entry population is empty, so its verdicts would pass vacuously',
    );
  }
  return verdicts;
}

/**
 * `VAL-WIKI-018`: every furniture link is reachable by Tab in document
 * order and shows a focus indicator that differs from its resting state.
 *
 * Graded from a real Tab walk: the sweep presses the key and records which
 * press focused which link, the ring the browser painted at that instant,
 * and whether `:focus-visible` matched. A selector list of things that
 * look focusable is a model of the focus order, not the focus order, and
 * a scripted `focus()` sets a different ring than a keyboard press does.
 *
 * The member is the link. The axe half of the row is carried by the
 * registry-wide sweep in `tests/e2e/axe-registry-sweep.spec.ts`, which
 * visits every published route; duplicating it here would run axe twice per
 * route and prove the same thing.
 */
export function furnitureReachVerdicts(
  evidence: ApparatusRuntimeEvidence,
): Map<string, Verdict<z.infer<typeof furnitureLinkSchema>>> {
  const verdicts = new Map<
    string,
    Verdict<z.infer<typeof furnitureLinkSchema>>
  >();
  const sectionsSeen = new Set<string>();
  let reachedAnywhere = 0;
  for (const observation of evidence.observations) {
    let previousStop = -1;
    let previousId = '';
    for (const link of observation.furnitureLinks) {
      const id = `${observation.route}|${observation.viewport}|${link.section}|${link.href}`;
      const failures: string[] = [];
      sectionsSeen.add(link.section);
      if (link.tabStop < 0) {
        failures.push(
          `${id} is never focused: ${link.tabPresses} Tab presses walked the page without reaching it`,
        );
      } else {
        reachedAnywhere += 1;
        if (link.tabStop < previousStop) {
          failures.push(
            `${id} takes focus at Tab stop ${link.tabStop}, before ${previousId} at stop ${previousStop}, so the keyboard order contradicts the order the page reads in`,
          );
        }
        previousStop = link.tabStop;
        previousId = id;
        if (link.focusedRing === link.restingRing) {
          failures.push(
            `${id} paints the same outline and shadow focused as at rest (${link.restingRing}), so a keyboard reader cannot see where they are`,
          );
        }
        if (!link.focusVisible) {
          failures.push(
            `${id} does not match :focus-visible under a real Tab press, so its ring is not the one a keyboard reader gets`,
          );
        }
      }
      verdicts.set(id, { id, observed: link, failures });
    }
  }
  // A walk that reached nothing would report a full population of links
  // whose every clause was skipped for want of a stop to grade.
  if (reachedAnywhere === 0) {
    throw new Error(
      'the Tab walk focused no furniture link anywhere in the corpus, so the reachability clauses graded nothing',
    );
  }
  if (verdicts.size === 0) {
    throw new Error(
      'the wiki-furniture link population is empty, so its verdicts would pass vacuously',
    );
  }
  // Every furniture family the template can render must appear somewhere in
  // the corpus. A collector that silently matched only breadcrumbs would
  // otherwise report a large, healthy population and check nothing else.
  for (const section of ['breadcrumb', 'see-also', 'linked-from', 'references']) {
    if (!sectionsSeen.has(section)) {
      throw new Error(
        `the furniture sweep never found a ${section} link anywhere in the corpus, so that family is unmeasured`,
      );
    }
  }
  return verdicts;
}

/**
 * `VAL-GLOSS-004`: an inline term is a distinguishable, focusable affordance
 * wired by `aria-describedby` to an element that really holds its
 * definition. The member is the term occurrence.
 */
export function termAffordanceVerdicts(
  evidence: ApparatusRuntimeEvidence,
): Map<string, Verdict<TermObservation>> {
  const verdicts = new Map<string, Verdict<TermObservation>>();
  for (const observation of evidence.observations) {
    observation.terms.forEach((term, index) => {
      const id = `${observation.route}|${observation.viewport}|${term.id}#${index}`;
      const failures: string[] = [];
      if (!term.focusable) failures.push(`${id} is not focusable`);
      if (!term.describedByResolves) {
        failures.push(
          `${id} points aria-describedby at an element that is missing or empty`,
        );
      }
      if (term.tooltipText.trim().length === 0) {
        failures.push(`${id} exposes an empty definition`);
      }
      if (!term.distinguishedWithoutColour) {
        failures.push(
          `${id} renders as prose: no underline, weight or other non-colour mark separates it from the sentence around it`,
        );
      }
      if (!term.href.startsWith('/glossary')) {
        failures.push(
          `${id} links to ${term.href} rather than its glossary entry, so the definition is unavailable without hover`,
        );
      }
      verdicts.set(id, { id, observed: term, failures });
    });
  }
  if (verdicts.size === 0) {
    throw new Error(
      'the inline-term population is empty, so its verdicts would pass vacuously',
    );
  }
  return verdicts;
}

/**
 * `VAL-NAV-022`: every citation chip sits inline next to its claim, carries
 * resolvable source metadata, and activates to the external source. The
 * member is the chip occurrence, not the page: the row says "every `<Cite>`
 * chip", and one broken chip on a page of nine is a broken page.
 */
export function citationChipVerdicts(
  evidence: ApparatusRuntimeEvidence,
): Map<string, Verdict<CitationChipObservation>> {
  const verdicts = new Map<string, Verdict<CitationChipObservation>>();
  for (const observation of evidence.observations) {
    observation.citations.forEach((chip, index) => {
      const id = `${observation.route}|${observation.viewport}|${chip.id}#${index}`;
      const failures: string[] = [];
      if (!chip.inProse) {
        failures.push(`${id} renders outside the prose column, away from its claim`);
      }
      if (!/^https?:\/\//.test(chip.href)) {
        failures.push(
          `${id} points at "${chip.href}", which is not an external source URL`,
        );
      }
      // The chip must go to ITS OWN source, not merely to some external
      // URL. A shape-only check passed a chip whose href had drifted to a
      // different registry entry's document: the reader is then sent to a
      // paper that does not make the claim the chip is standing next to,
      // which is the failure the row exists to prevent.
      const registered = getCitation(chip.id);
      if (registered === undefined) {
        failures.push(
          `${id} names a citation id the registry does not hold, so nothing can say where it should point`,
        );
      } else if (chip.href !== registered.url) {
        failures.push(
          `${id} points at "${chip.href}" where the registry records "${registered.url}" for ${chip.id}`,
        );
      }
      if (!chip.opensExternally) {
        failures.push(`${id} does not open its source in a new context`);
      }
      if (chip.label.trim().length === 0) {
        failures.push(`${id} renders an unresolved reference with no label`);
      }
      if (!chip.describedByResolves) {
        failures.push(
          `${id} points aria-describedby at an element that is missing or empty`,
        );
      }
      // The row asks for title, authors and year. A tooltip carrying only
      // the title would satisfy a presence check and tell a reader nothing
      // they could not already see in the chip label.
      if (chip.tooltipText.trim().length <= chip.label.trim().length) {
        failures.push(
          `${id} exposes metadata no longer than its own label, so it adds no title, authors or year`,
        );
      }
      if (!/\d{4}/.test(chip.tooltipText)) {
        failures.push(`${id} exposes metadata carrying no year`);
      }
      verdicts.set(id, { id, observed: chip, failures });
    });
  }
  if (verdicts.size === 0) {
    throw new Error(
      'the citation-chip population is empty, so its verdicts would pass vacuously',
    );
  }
  return verdicts;
}

/** Members `VAL-B2-ART-010` quantifies over: the published article routes. */
export function apparatusAssertionMembers(root: string): string[] {
  return [...expectedApparatusGraph(root).keys()].sort();
}
