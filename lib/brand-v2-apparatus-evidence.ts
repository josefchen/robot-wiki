import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { z } from 'zod';
import { DOMAIN_META, modules, publishedModules } from '../data/modules.ts';
import { getCitation } from '../data/citations.ts';
import { publishedBacklinkGraph, resolveArticleEntries } from './backlinks.ts';
import {
  ARTICLE_BODY_COMPUTED_IMPORT,
  deriveEvidenceClosure,
  evidenceClosureGraph,
  routeEntryModules,
} from './brand-v2-evidence-closure.ts';
import { parseEvidenceArtifact } from './brand-v2-evidence-schema.ts';
import { inlineCitationIds, moduleBody, resolveReferences } from './references.ts';

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
};

let cachedGraph: Map<string, ExpectedApparatus> | null = null;

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
    });
  }
  if (graph.size === 0) {
    throw new Error(
      'the expected apparatus graph is empty: no published article was derived, so every preservation verdict would pass vacuously',
    );
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
  /** Index in the document's sequential focus order, -1 when unreachable. */
  tabIndex: z.number(),
  focusVisible: z.boolean(),
});

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
  ariaCurrentPage: z.array(z.string()),
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
 */
export function relationshipPreservationVerdicts(
  evidence: ApparatusRuntimeEvidence,
  root: string,
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
    // renders chips from a curated data module (`lib/competing-theses.ts` is
    // the largest, adding eight), so a body-only expectation is the
    // incomplete side of the comparison. Equality here would have failed six
    // healthy articles. What preservation actually needs is that every chip
    // the body declares still renders, in body order, and that no rendered
    // chip points at an id the citation registry does not hold.
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
    const unregistered = renderedMarkers.filter((id) => !getCitation(id));
    if (unregistered.length > 0) {
      failures.push(
        `${route} renders citation marker(s) [${[...new Set(unregistered)].join(', ')}] that the citation registry does not hold`,
      );
    }
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
  for (const observation of evidence.observations) {
    let previous = -1;
    for (const link of observation.furnitureLinks) {
      const id = `${observation.route}|${observation.viewport}|${link.section}|${link.href}`;
      const failures: string[] = [];
      sectionsSeen.add(link.section);
      if (link.tabIndex < 0) {
        failures.push(`${id} is not in the sequential focus order`);
      } else if (link.tabIndex < previous) {
        failures.push(
          `${id} takes focus at position ${link.tabIndex}, before the furniture link above it at ${previous}`,
        );
      }
      if (link.tabIndex >= 0) previous = link.tabIndex;
      if (!link.focusVisible) {
        failures.push(`${id} shows no focus indicator distinct from its resting state`);
      }
      verdicts.set(id, { id, observed: link, failures });
    }
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
