import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { z } from 'zod';
import { getCitation } from '../data/citations.ts';
import { publishedModules } from '../data/modules.ts';
import { TEKTUR_ROLE_INSTANCES } from '../data/type-roles.ts';
import { formatLongDate } from './dates.ts';
import { inlineCitationIds, moduleBody, resolveReferences } from './references.ts';
import {
  ARTICLE_BODY_COMPUTED_IMPORT,
  deriveEvidenceClosure,
  evidenceClosureGraph,
  routeEntryModules,
} from './brand-v2-evidence-closure.ts';
import { parseEvidenceArtifact } from './brand-v2-evidence-schema.ts';

/**
 * Evidence for the article reading sheet and the site's type hierarchy
 * (`VAL-B2-ART-001/002/003/009` and `VAL-B2-TYPE-003` through `-010`), and
 * the fail-closed reader that decides whether that evidence may grant a
 * result.
 *
 * Every one of the twelve is a claim about a rendered document and none of
 * them survives a source read. A measure written `max-w-[65ch]` is a
 * different width depending on which face the element wears, because `ch`
 * resolves against the element's own font: the column that declared 65ch in
 * IBM Plex Sans around Newsreader prose rendered 60.2ch, and the stylesheet
 * looked correct the whole time. A `clamp()` title has no size at all until
 * a viewport is chosen for it. A heading's underline can be written and lose
 * the cascade. A paragraph's face is whatever won, not whatever was asked
 * for. So the measurement is a two-viewport sweep of the built export
 * (`tests/e2e/brand-v2-article.spec.ts`), persisted here.
 *
 * Discovery is structural first. The prose paragraphs are every `<p>` inside
 * the reading column, not the ones a class names; the registration labels
 * are every small mono element that renders in caps, not the ones carrying
 * the class that sets their tracking; the rules are every element that
 * paints a hairline, registered or not. A query that asked only for the
 * annotated members would never see the member that lost its annotation,
 * which is the failure these rows exist to catch.
 *
 * Every reader below throws rather than degrade: a stale fingerprint, a
 * missing route, a missing viewport, an empty page, or an empty population
 * refuses the evidence instead of returning a weaker claim.
 */
export const ARTICLE_RUNTIME_EVIDENCE_PATH =
  'evidence/brand-v2/article-typography.json';

/**
 * The two viewports the contract names for this family.
 *
 * `VAL-B2-TYPE-006` and `VAL-B2-TYPE-007` both state their ranges "on 375px
 * viewport" and "on 1440px viewport", and `VAL-B2-ART-002` splits its two
 * clauses across mobile and desktop. A third width would measure something
 * no row asks about; measuring only one would leave half of three rows
 * unmeasured while they read as decided.
 */
export const ARTICLE_VIEWPORTS = [
  { id: '375x812', width: 375, height: 812 },
  { id: '1440x900', width: 1440, height: 900 },
] as const;

export const MOBILE_VIEWPORT_ID = '375x812';
export const DESKTOP_VIEWPORT_ID = '1440x900';

/**
 * Signal blue, in the rendered form and the hex spelling shipped here.
 *
 * `#245edb` is NOT here. It is the superseded v1 blue that
 * `contract/brand-v2-enforcement-map.json` lists under "Previous signal
 * values ... Zero runtime/generated matches", so a link that still paints
 * it is residue the rollout was supposed to remove, not an accepted form.
 */
export const SIGNAL_BLUE_FORMS = ['rgb(36, 95, 255)', '#245fff'] as const;

/** The sealed ranges, read off the contract rows they belong to. */
export const ARTICLE_H1_SIZE_PX = {
  [MOBILE_VIEWPORT_ID]: { min: 34, max: 44 },
  [DESKTOP_VIEWPORT_ID]: { min: 48, max: 64 },
} as const;
export const ARTICLE_H1_LINE_HEIGHT = { min: 1.0, max: 1.1 } as const;
export const HOME_WORDMARK_SIZE_PX = {
  [MOBILE_VIEWPORT_ID]: { min: 52, max: 68 },
  [DESKTOP_VIEWPORT_ID]: { min: 88, max: 120 },
} as const;
export const HOME_WORDMARK_LINE_HEIGHT = { min: 0.88, max: 0.98 } as const;
export const PROSE_SIZE_PX = { min: 18, max: 21 } as const;
export const PROSE_LINE_HEIGHT = { min: 1.6, max: 1.8 } as const;
export const PROSE_MEASURE_CH = { min: 62, max: 68 } as const;
export const MOBILE_SIDE_PADDING_PX = 20;
export const DESKTOP_BREATHING_ROOM_PX = 32;
export const REGISTRATION_TRACKING_EM = { min: 0.08, max: 0.14 } as const;
export const REGISTRATION_TRACKING_SPREAD_EM = 0.01;
/** How far a registered rule may sit from its declared anchor edge. */
export const RULE_ALIGNMENT_TOLERANCE_PX = 2;

/** The sweep whose own bytes decide what this evidence recorded. */
export const ARTICLE_SWEEP_MODULE = 'tests/e2e/brand-v2-article.spec.ts';

/**
 * Every module any public route reaches, plus the sweep that measures them.
 *
 * A narrower list would be a guess about which modules can move a rendered
 * type reading, and the guess is always wrong in the same direction: the
 * sweep visits all 61 public routes at two widths, so a heading in a shell
 * primitive, a label in an instrument panel and a paragraph in an article
 * body are all subjects of it.
 */
function articleClosureEntries(root: string): string[] {
  return [
    ...routeEntryModules(evidenceClosureGraph(root)),
    ARTICLE_SWEEP_MODULE,
  ].sort();
}

/**
 * What the three facts on an article's title sheet are supposed to say,
 * derived from the sources that produce them.
 *
 * `VAL-B2-ART-001` asks for the article's "existing factual review date,
 * reading time, and citation count", and existing and factual are the whole
 * requirement: a sheet printing today's date, `1 min`, and `0` renders three
 * values of the right shape and none of the right content. The template
 * derives all three (`app/(content)/[domain]/[slug]/page.tsx`) from the
 * frontmatter `lastReviewed`, the measurement in `data/reading-times.json`,
 * and the resolved References list, so those are the three sources read
 * here - by the same functions the template uses, not by a reimplementation
 * that could agree with a broken header.
 *
 * `readingMinutes` is null where no measurement exists: the template then
 * prints a word-count estimate, and a shipped article whose reading time is
 * an estimate is a defect this file must be able to name rather than one it
 * silently accepts.
 */
export type TitleSheetSourceFacts = {
  route: string;
  source: string;
  lastReviewed: string | null;
  reviewDateText: string | null;
  readingMinutes: number | null;
  /** Resolved reference ids in the order the bibliography renders them. */
  citationIds: string[];
};

export const READING_TIMES_PATH = 'data/reading-times.json';

function readingTimeMeasurements(
  root: string,
): Map<string, { words: number; minutes: number }> {
  const raw = JSON.parse(readFileSync(join(root, READING_TIMES_PATH), 'utf8')) as
    | Record<string, { words?: unknown; minutes?: unknown }>
    | null;
  const measurements = new Map<string, { words: number; minutes: number }>();
  for (const [key, value] of Object.entries(raw ?? {})) {
    if (typeof value?.minutes !== 'number' || typeof value?.words !== 'number') {
      continue;
    }
    measurements.set(key, { words: value.words, minutes: value.minutes });
  }
  return measurements;
}

export function titleSheetSourceFacts(
  root: string,
): Map<string, TitleSheetSourceFacts> {
  const measurements = readingTimeMeasurements(root);
  const facts = new Map<string, TitleSheetSourceFacts>();
  for (const { domain, slug } of publishedModules()) {
    const source = `content/${domain}/${slug}.mdx`;
    const raw = readFileSync(join(root, source), 'utf8');
    const frontmatter = matter(raw).data as {
      lastReviewed?: unknown;
      citations?: unknown;
    };
    const lastReviewed =
      typeof frontmatter.lastReviewed === 'string' &&
      frontmatter.lastReviewed.length > 0
        ? frontmatter.lastReviewed
        : null;
    const declared = Array.isArray(frontmatter.citations)
      ? frontmatter.citations.filter(
          (id): id is string => typeof id === 'string',
        )
      : [];
    const citationIds = resolveReferences(
      declared,
      inlineCitationIds(moduleBody(raw)),
      getCitation,
    ).map(({ citation }) => citation.id);
    facts.set(`/${domain}/${slug}/`, {
      route: `/${domain}/${slug}/`,
      source,
      lastReviewed,
      reviewDateText: lastReviewed === null ? null : formatLongDate(lastReviewed),
      readingMinutes: measurements.get(`${domain}/${slug}`)?.minutes ?? null,
      citationIds,
    });
  }
  if (facts.size === 0) {
    throw new Error(
      'no published article was read for its title-sheet facts, so ART-001 would reconcile nothing',
    );
  }
  return facts;
}

/**
 * The fingerprint the sweep records and the generator re-derives, over the
 * bytes of the whole closure plus the sealed ranges the verdicts apply.
 *
 * The ranges are hashed in as facts because they are the other half of every
 * verdict: widening one without re-running the sweep would otherwise leave a
 * measurement that was taken against the old range reading as current. The
 * derived title-sheet facts are hashed in for the same reason and one more:
 * `data/reading-times.json` is written by postbuild and reaches the header
 * without ever entering the module graph, so a re-measured article moves the
 * rendered sheet while every byte in the closure stays put.
 */
export function articleEvidenceFingerprint(input: { root: string }): string {
  const ranges = [
    `h1-mobile:${ARTICLE_H1_SIZE_PX[MOBILE_VIEWPORT_ID].min}-${ARTICLE_H1_SIZE_PX[MOBILE_VIEWPORT_ID].max}`,
    `h1-desktop:${ARTICLE_H1_SIZE_PX[DESKTOP_VIEWPORT_ID].min}-${ARTICLE_H1_SIZE_PX[DESKTOP_VIEWPORT_ID].max}`,
    `h1-leading:${ARTICLE_H1_LINE_HEIGHT.min}-${ARTICLE_H1_LINE_HEIGHT.max}`,
    `wordmark-mobile:${HOME_WORDMARK_SIZE_PX[MOBILE_VIEWPORT_ID].min}-${HOME_WORDMARK_SIZE_PX[MOBILE_VIEWPORT_ID].max}`,
    `wordmark-desktop:${HOME_WORDMARK_SIZE_PX[DESKTOP_VIEWPORT_ID].min}-${HOME_WORDMARK_SIZE_PX[DESKTOP_VIEWPORT_ID].max}`,
    `wordmark-leading:${HOME_WORDMARK_LINE_HEIGHT.min}-${HOME_WORDMARK_LINE_HEIGHT.max}`,
    `prose:${PROSE_SIZE_PX.min}-${PROSE_SIZE_PX.max}`,
    `prose-leading:${PROSE_LINE_HEIGHT.min}-${PROSE_LINE_HEIGHT.max}`,
    `measure:${PROSE_MEASURE_CH.min}-${PROSE_MEASURE_CH.max}`,
    `padding:${MOBILE_SIDE_PADDING_PX}/${DESKTOP_BREATHING_ROOM_PX}`,
    `tracking:${REGISTRATION_TRACKING_EM.min}-${REGISTRATION_TRACKING_EM.max}@${REGISTRATION_TRACKING_SPREAD_EM}`,
    `rule-tolerance:${RULE_ALIGNMENT_TOLERANCE_PX}`,
    ...ARTICLE_VIEWPORTS.map(({ id }) => `viewport:${id}`),
    ...[...titleSheetSourceFacts(input.root).values()]
      .sort((left, right) => left.route.localeCompare(right.route))
      .map(
        (fact) =>
          `title-sheet:${fact.route}=${fact.lastReviewed ?? 'none'}/${
            fact.readingMinutes ?? 'unmeasured'
          }/${fact.citationIds.join(',')}`,
      ),
  ];
  return deriveEvidenceClosure({
    root: input.root,
    entries: articleClosureEntries(input.root),
    facts: ranges,
    computedSpecifiers: [ARTICLE_BODY_COMPUTED_IMPORT],
  }).fingerprint;
}

const typeFaceSchema = z.object({
  /** First family in the computed stack, lower-cased and unquoted. */
  familyHead: z.string(),
  sizePx: z.number(),
  lineHeightRatio: z.number(),
  trackingEm: z.number(),
  weight: z.number(),
  variationSettings: z.string(),
});

const tekturRoleSchema = z.object({
  role: z.string(),
  tag: z.string(),
  text: z.string(),
  face: typeFaceSchema,
});

const proseParagraphSchema = z.object({
  familyHead: z.string(),
  sizePx: z.number(),
  lineHeightRatio: z.number(),
  /** Rendered width and the `0` advance of the paragraph's own font. */
  widthPx: z.number(),
  zeroAdvancePx: z.number(),
  /**
   * Whether the paragraph sits inside a registered surface or control.
   * A live instrument readout and a chip label are registered technical
   * values, which the type contract assigns to the mono face; the article's
   * running text is not inside either.
   */
  insideRegisteredFrame: z.boolean(),
  text: z.string(),
});

const sectionLinkSchema = z.object({
  headingId: z.string(),
  headingTag: z.string(),
  /** Whether the heading carries a self-link at all. */
  linked: z.boolean(),
  colour: z.string(),
  decorationLine: z.string(),
  decorationColour: z.string(),
  decorationThicknessPx: z.number(),
  /** Whether the anchor itself is in the sequential tab order. */
  keyboardFocusable: z.boolean(),
  /** The non-colour affordance riding on the heading, when one renders. */
  affordance: z
    .object({
      tag: z.string(),
      accessibleName: z.string(),
      widthPx: z.number(),
      heightPx: z.number(),
      opacity: z.number(),
      visibility: z.string(),
    })
    .nullable(),
});

const linkVariantSchema = z.object({
  signature: z.string(),
  count: z.number().int().positive(),
  colour: z.string(),
  decorationLine: z.string(),
  decorationStyle: z.string(),
  decorationColour: z.string(),
  familyHead: z.string(),
  shape: z.string(),
});

const linkTreatmentSchema = z.object({
  kind: z.enum([
    'section',
    'citation',
    'glossary',
    'external',
    'internal',
    'reference',
  ]),
  count: z.number(),
  colour: z.string(),
  decorationLine: z.string(),
  decorationStyle: z.string(),
  decorationColour: z.string(),
  familyHead: z.string(),
  /** A bordered chip, a glyph, or another shape the treatment carries. */
  shape: z.string(),
  /**
   * Every distinct painting the class contains, not the first member's.
   * A class whose members disagree renders more than one row here.
   */
  variants: z.array(linkVariantSchema),
});

const registrationLabelSchema = z.object({
  text: z.string(),
  familyHead: z.string(),
  sizePx: z.number(),
  trackingEm: z.number(),
});

const ruleSchema = z.object({
  tag: z.string(),
  outline: z.string(),
  deviceId: z.string().nullable(),
  anchorSelector: z.string().nullable(),
  deviceEdge: z.string().nullable(),
  anchorEdge: z.string().nullable(),
  /**
   * Distance between the rule's declared edge and its anchor's declared
   * edge. `null` where the rule declares no anchor at all, which is a
   * different failure from a rule that declares one and misses it.
   */
  alignmentErrorPx: z.number().nullable(),
  widthPx: z.number(),
  heightPx: z.number(),
});

const titleBlockSchema = z.object({
  present: z.boolean(),
  h1Count: z.number(),
  h1Text: z.string(),
  summaryCount: z.number(),
  summaryText: z.string(),
  breadcrumbLabels: z.array(z.string()),
  lastReviewed: z.string().nullable(),
  readingMinutes: z.number().nullable(),
  citationCount: z.number().nullable(),
  /**
   * The same three facts as a reader meets them.
   *
   * The `data-header-*` attributes above are the machine spelling and the
   * text below is the human one. Reading only the attribute would let a
   * sheet carry a correct date in an attribute nobody renders and print a
   * different one in the `<time>` beside it.
   */
  reviewDateText: z.string(),
  reviewDateTime: z.string(),
  readingTimeText: z.string(),
  citationCountText: z.string(),
  /**
   * The ids of the bibliography entries the same page renders, in order.
   * The header's count claims to be the length of this list.
   */
  bibliographyIds: z.array(z.string()),
  /** Anything a title sheet must not carry, counted as it renders. */
  imageCount: z.number(),
  badgeCount: z.number(),
  eyebrowTexts: z.array(z.string()),
  backgroundImage: z.string(),
});

const observationSchema = z.object({
  route: z.string(),
  viewport: z.string(),
  isArticle: z.boolean(),
  visibleTextLength: z.number(),
  tekturRoles: z.array(tekturRoleSchema),
  titleBlock: titleBlockSchema,
  sheet: z.object({
    columnFound: z.boolean(),
    viewportWidthPx: z.number(),
    columnLeftPx: z.number(),
    columnWidthPx: z.number(),
    paddingLeftPx: z.number(),
    paddingRightPx: z.number(),
    mainLeftPx: z.number(),
    mainWidthPx: z.number(),
  }),
  proseParagraphs: z.array(proseParagraphSchema),
  sectionLinks: z.array(sectionLinkSchema),
  linkTreatments: z.array(linkTreatmentSchema),
  registrationLabels: z.array(registrationLabelSchema),
  monoRequired: z.array(z.object({ tag: z.string(), familyHead: z.string() })),
  interfaceControls: z.array(
    z.object({
      tag: z.string(),
      text: z.string(),
      familyHead: z.string(),
      sizePx: z.number(),
      inProse: z.boolean(),
    }),
  ),
  rules: z.array(ruleSchema),
});

export const articleRuntimeEvidenceSchema = z.object({
  version: z.literal(1),
  fingerprint: z.string(),
  viewports: z.array(z.string()),
  routes: z.array(z.string()),
  articleRoutes: z.array(z.string()),
  observations: z.array(observationSchema),
});

export type ArticleRuntimeEvidence = z.infer<
  typeof articleRuntimeEvidenceSchema
>;
export type ArticleObservation = z.infer<typeof observationSchema>;
export type ProseParagraph = z.infer<typeof proseParagraphSchema>;
export type SectionLink = z.infer<typeof sectionLinkSchema>;
export type ArticleRule = z.infer<typeof ruleSchema>;

/** One member's reading, and every way it failed the requirement. */
export type Verdict<Observed> = {
  id: string;
  observed: Observed;
  failures: string[];
};

/**
 * Accepts the persisted sweep only when it is the sweep this tree needs:
 * current fingerprint, both declared viewports, exactly the registered
 * public routes in both directions, an article subset that is really a
 * subset, one observation per route and viewport, and a non-empty rendered
 * page behind every one. Anything else throws.
 */
export function readArticleRuntimeEvidence(input: {
  artifact: unknown;
  routes: string[];
  articleRoutes: string[];
  fingerprint: string;
}): ArticleRuntimeEvidence {
  const envelope = input.artifact;
  if (!envelope || typeof envelope !== 'object') {
    throw new Error('article runtime evidence is not an object');
  }
  const { version, fingerprint } = envelope as {
    version?: unknown;
    fingerprint?: unknown;
  };
  if (version !== 1) {
    throw new Error(
      `article runtime evidence version ${String(version)} is not 1`,
    );
  }
  if (fingerprint !== input.fingerprint) {
    throw new Error(
      'article runtime evidence is stale: an article source, the type scale, or a sealed range changed since the sweep ran. Re-run npm run refresh:brand-v2-evidence.',
    );
  }
  const artifact = parseEvidenceArtifact(
    articleRuntimeEvidenceSchema,
    envelope,
    'article runtime evidence',
  );

  const expectedViewports = ARTICLE_VIEWPORTS.map(({ id }) => id);
  if (
    JSON.stringify([...artifact.viewports].sort()) !==
    JSON.stringify([...expectedViewports].sort())
  ) {
    throw new Error(
      `article runtime evidence was swept at ${artifact.viewports.join(', ')}, not ${expectedViewports.join(', ')}`,
    );
  }
  if (input.routes.length === 0) {
    throw new Error('article evidence route population is empty');
  }
  if (input.articleRoutes.length === 0) {
    throw new Error('article evidence article-route population is empty');
  }
  const expectedRoutes = [...input.routes].sort();
  if (
    JSON.stringify([...artifact.routes].sort()) !== JSON.stringify(expectedRoutes)
  ) {
    throw new Error(
      `article runtime evidence covers ${artifact.routes.length} routes, not the ${expectedRoutes.length} registered public routes`,
    );
  }
  if (
    JSON.stringify([...artifact.articleRoutes].sort()) !==
    JSON.stringify([...input.articleRoutes].sort())
  ) {
    throw new Error(
      `article runtime evidence covers ${artifact.articleRoutes.length} article routes, not the ${input.articleRoutes.length} registered ones`,
    );
  }
  const outside = artifact.articleRoutes.filter(
    (route) => !artifact.routes.includes(route),
  );
  if (outside.length > 0) {
    throw new Error(
      `article runtime evidence calls ${outside[0]} an article route while never sweeping it as a public route`,
    );
  }

  const seen = new Set<string>();
  for (const observation of artifact.observations) {
    const key = `${observation.route}|${observation.viewport}`;
    if (seen.has(key)) {
      throw new Error(`article runtime evidence records ${key} twice`);
    }
    seen.add(key);
    if (!artifact.routes.includes(observation.route)) {
      throw new Error(
        `article runtime evidence records ${observation.route}, which is not a registered public route`,
      );
    }
    if (observation.visibleTextLength <= 0) {
      throw new Error(
        `article runtime evidence records an empty page at ${key}: a blank render cannot decide a typography claim`,
      );
    }
    if (
      observation.isArticle !== artifact.articleRoutes.includes(observation.route)
    ) {
      throw new Error(
        `article runtime evidence disagrees with the registry about whether ${observation.route} is an article`,
      );
    }
    if (observation.isArticle && !observation.sheet.columnFound) {
      throw new Error(
        `article runtime evidence found no reading column at ${key}, so the sheet it is evidence about did not render`,
      );
    }
  }
  const expectedKeys = artifact.routes.flatMap((route) =>
    expectedViewports.map((viewport) => `${route}|${viewport}`),
  );
  const missing = expectedKeys.filter((key) => !seen.has(key));
  if (missing.length > 0) {
    throw new Error(
      `article runtime evidence is missing ${missing.length} route/viewport reading(s), starting with ${missing[0]}`,
    );
  }
  return artifact;
}

function observationsBy(
  evidence: ArticleRuntimeEvidence,
): Map<string, ArticleObservation> {
  return new Map(
    evidence.observations.map((observation) => [
      `${observation.route}|${observation.viewport}`,
      observation,
    ]),
  );
}

function at(
  evidence: ArticleRuntimeEvidence,
  route: string,
  viewport: string,
): ArticleObservation {
  const observation = observationsBy(evidence).get(`${route}|${viewport}`);
  if (!observation) {
    throw new Error(`the sweep did not visit ${route} at ${viewport}`);
  }
  return observation;
}

function inRange(value: number, range: { min: number; max: number }): boolean {
  return value >= range.min && value <= range.max;
}

const TEKTUR_HEAD = 'tektur';
const NEWSREADER_HEAD = 'newsreader';
const PLEX_SANS_HEAD = 'ibm plex sans';
const PLEX_MONO_HEAD = 'ibm plex mono';

/**
 * `VAL-B2-ART-001`: an article's title sheet renders its context, one Tektur
 * title, one summary, and its EXISTING FACTUAL review date, reading time and
 * citation count.
 *
 * Presence was never the requirement. A sheet that printed a review date
 * nobody published, a reading time nothing measured, or a count that did not
 * match its own bibliography would satisfy every non-empty check and would
 * still be exactly the fabrication the row forbids - the same class of
 * defect as `VAL-B2-ART-009`'s fabricated badge, one step further in. So
 * each of the three is reconciled against the source that produced it
 * (`titleSheetSourceFacts`), in both spellings the sheet carries, and the
 * count is reconciled against the bibliography rendered below it as well.
 */
export function titleSheetVerdicts(
  evidence: ArticleRuntimeEvidence,
  sourceFacts: Map<string, TitleSheetSourceFacts>,
): Map<string, Verdict<ArticleObservation['titleBlock']>> {
  const verdicts = new Map<string, Verdict<ArticleObservation['titleBlock']>>();
  for (const route of evidence.articleRoutes) {
    const observation = at(evidence, route, DESKTOP_VIEWPORT_ID);
    const block = observation.titleBlock;
    const failures: string[] = [];
    if (!block.present) failures.push(`${route} renders no title sheet`);
    if (block.h1Count !== 1) {
      failures.push(`${route} renders ${block.h1Count} h1 elements, not one`);
    }
    const titleRole = observation.tekturRoles.find(
      ({ tag }) => tag === 'h1',
    );
    if (!titleRole) {
      failures.push(`${route} carries no Tektur role on its h1`);
    } else if (!titleRole.face.familyHead.includes(TEKTUR_HEAD)) {
      failures.push(
        `${route} renders its h1 in ${titleRole.face.familyHead}, not Tektur`,
      );
    }
    if (block.summaryCount !== 1) {
      failures.push(
        `${route} renders ${block.summaryCount} summary paragraphs, not one`,
      );
    }
    if (block.breadcrumbLabels.length < 2) {
      failures.push(
        `${route} renders ${block.breadcrumbLabels.length} breadcrumb crumbs, so it names no domain context`,
      );
    }
    const facts = sourceFacts.get(route);
    if (!facts) {
      failures.push(
        `${route} renders a title sheet no published module accounts for, so its facts have no source`,
      );
    } else {
      failures.push(...reviewDateFailures(route, block, facts));
      failures.push(...readingTimeFailures(route, block, facts));
      failures.push(...citationCountFailures(route, block, facts));
    }
    verdicts.set(route, { id: route, observed: block, failures });
  }
  if (verdicts.size === 0) {
    throw new Error('no article route was measured for its title sheet');
  }
  const unrendered = [...sourceFacts.keys()].filter(
    (route) => !verdicts.has(route),
  );
  if (unrendered.length > 0) {
    throw new Error(
      `${unrendered.length} published article(s) carry title-sheet facts no sweep reconciled, starting with ${unrendered[0]}`,
    );
  }
  return verdicts;
}

function reviewDateFailures(
  route: string,
  block: ArticleObservation['titleBlock'],
  facts: TitleSheetSourceFacts,
): string[] {
  const failures: string[] = [];
  if (facts.lastReviewed === null) {
    failures.push(
      `${route} publishes with no lastReviewed date in ${facts.source}, so its sheet has no review date to print`,
    );
    return failures;
  }
  if (block.lastReviewed === null || block.lastReviewed.length === 0) {
    failures.push(`${route} prints no review date`);
  } else if (block.lastReviewed !== facts.lastReviewed) {
    failures.push(
      `${route} prints review date ${block.lastReviewed} where ${facts.source} records ${facts.lastReviewed}`,
    );
  }
  if (block.reviewDateTime !== facts.lastReviewed) {
    failures.push(
      `${route} dates its review "${block.reviewDateTime}" in machine-readable form, not ${facts.lastReviewed}`,
    );
  }
  if (block.reviewDateText !== facts.reviewDateText) {
    failures.push(
      `${route} shows the reader review date "${block.reviewDateText}", not "${facts.reviewDateText}"`,
    );
  }
  return failures;
}

function readingTimeFailures(
  route: string,
  block: ArticleObservation['titleBlock'],
  facts: TitleSheetSourceFacts,
): string[] {
  const failures: string[] = [];
  if (facts.readingMinutes === null) {
    // The template's fallback is a word-count estimate over the MDX source,
    // which is a different number from the measured one and is meant for a
    // dev server, not for a shipped sheet.
    failures.push(
      `${route} has no entry in ${READING_TIMES_PATH}, so its sheet prints an unmeasured estimate`,
    );
    return failures;
  }
  if (block.readingMinutes === null || block.readingMinutes <= 0) {
    failures.push(`${route} prints no reading time`);
  } else if (block.readingMinutes !== facts.readingMinutes) {
    failures.push(
      `${route} prints a ${block.readingMinutes} min read where ${READING_TIMES_PATH} measured ${facts.readingMinutes}`,
    );
  }
  if (block.readingTimeText !== `${facts.readingMinutes} min`) {
    failures.push(
      `${route} shows the reader "${block.readingTimeText}", not "${facts.readingMinutes} min"`,
    );
  }
  return failures;
}

function citationCountFailures(
  route: string,
  block: ArticleObservation['titleBlock'],
  facts: TitleSheetSourceFacts,
): string[] {
  const failures: string[] = [];
  const expected = facts.citationIds.length;
  if (block.citationCount === null) {
    failures.push(`${route} prints no citation count`);
  } else if (block.citationCount !== expected) {
    failures.push(
      `${route} claims ${block.citationCount} citation(s) where its resolved References list holds ${expected}`,
    );
  }
  if (block.citationCountText !== String(expected)) {
    failures.push(
      `${route} shows the reader "${block.citationCountText}" citations, not "${expected}"`,
    );
  }
  const rendered = block.bibliographyIds;
  if (rendered.join('|') !== facts.citationIds.join('|')) {
    const lost = facts.citationIds.filter((id) => !rendered.includes(id));
    const extra = rendered.filter((id) => !facts.citationIds.includes(id));
    failures.push(
      `${route} renders a bibliography of ${rendered.length} entries that is not its resolved References list (${
        lost.length > 0 ? `missing ${lost.join(', ')}; ` : ''
      }${extra.length > 0 ? `unaccounted ${extra.join(', ')}; ` : ''}order ${
        lost.length === 0 && extra.length === 0 ? 'differs' : 'aside'
      })`,
    );
  }
  return failures;
}

export type MeasureObservation = {
  measureCh: number;
  proseWidthPx: number;
  zeroAdvancePx: number;
  mobilePaddingLeftPx: number;
  mobilePaddingRightPx: number;
  desktopPaddingLeftPx: number;
  desktopPaddingRightPx: number;
  desktopBreathingRoomPx: number;
};

/**
 * The measure a paragraph actually occupies, in its own `ch`.
 *
 * The widest paragraph is the one that decides it: a short closing line is
 * narrower than the cap and would report a measure the sheet never sets.
 */
function widestRunningParagraph(
  observation: ArticleObservation,
): ProseParagraph | null {
  const running = observation.proseParagraphs.filter(
    ({ insideRegisteredFrame, zeroAdvancePx }) =>
      !insideRegisteredFrame && zeroAdvancePx > 0,
  );
  if (running.length === 0) return null;
  return running.reduce((widest, candidate) =>
    candidate.widthPx > widest.widthPx ? candidate : widest,
  );
}

/**
 * `VAL-B2-ART-002`: the reading sheet's measure and its gutters. The measure
 * is read at the desktop width, where the cap is what binds it; the mobile
 * clause is read at the mobile width, where the viewport is.
 */
export function readingSheetVerdicts(
  evidence: ArticleRuntimeEvidence,
): Map<string, Verdict<MeasureObservation>> {
  const verdicts = new Map<string, Verdict<MeasureObservation>>();
  for (const route of evidence.articleRoutes) {
    const mobile = at(evidence, route, MOBILE_VIEWPORT_ID);
    const desktop = at(evidence, route, DESKTOP_VIEWPORT_ID);
    const failures: string[] = [];
    const paragraph = widestRunningParagraph(desktop);
    const measureCh =
      paragraph === null
        ? 0
        : Math.round((paragraph.widthPx / paragraph.zeroAdvancePx) * 100) / 100;
    if (paragraph === null) {
      failures.push(
        `${route} renders no running prose paragraph, so it has no measure`,
      );
    } else if (!inRange(measureCh, PROSE_MEASURE_CH)) {
      failures.push(
        `${route} sets its prose measure at ${measureCh}ch, outside ${PROSE_MEASURE_CH.min}-${PROSE_MEASURE_CH.max}ch`,
      );
    }
    const mobilePadding = Math.min(
      mobile.sheet.paddingLeftPx,
      mobile.sheet.paddingRightPx,
    );
    if (mobilePadding < MOBILE_SIDE_PADDING_PX) {
      failures.push(
        `${route} leaves ${mobilePadding}px of side padding at ${MOBILE_VIEWPORT_ID}, under the ${MOBILE_SIDE_PADDING_PX}px floor`,
      );
    }
    // Breathing room on the desktop sheet is the gutter the column carries
    // plus whatever the main region leaves beside it, because a reader sees
    // the whole distance between the text and the next painted thing.
    const desktopGutter = Math.min(
      desktop.sheet.paddingLeftPx,
      desktop.sheet.paddingRightPx,
    );
    const asideRoom = Math.round(
      (desktop.sheet.columnLeftPx - desktop.sheet.mainLeftPx) * 100,
    ) / 100;
    const breathingRoom = Math.round((desktopGutter + Math.max(asideRoom, 0)) * 100) / 100;
    if (breathingRoom < DESKTOP_BREATHING_ROOM_PX) {
      failures.push(
        `${route} leaves ${breathingRoom}px between its text and the region edge at ${DESKTOP_VIEWPORT_ID}, under the ${DESKTOP_BREATHING_ROOM_PX}px floor`,
      );
    }
    verdicts.set(route, {
      id: route,
      observed: {
        measureCh,
        proseWidthPx: paragraph?.widthPx ?? 0,
        zeroAdvancePx: paragraph?.zeroAdvancePx ?? 0,
        mobilePaddingLeftPx: mobile.sheet.paddingLeftPx,
        mobilePaddingRightPx: mobile.sheet.paddingRightPx,
        desktopPaddingLeftPx: desktop.sheet.paddingLeftPx,
        desktopPaddingRightPx: desktop.sheet.paddingRightPx,
        desktopBreathingRoomPx: breathingRoom,
      },
      failures,
    });
  }
  if (verdicts.size === 0) {
    throw new Error('no article route was measured for its reading sheet');
  }
  return verdicts;
}

/** A treatment reduced to the marks a reader can tell apart. */
function treatmentSignature(
  treatment: z.infer<typeof linkVariantSchema>,
): string {
  return [
    treatment.colour,
    treatment.decorationLine,
    treatment.decorationStyle,
    treatment.decorationColour,
    treatment.shape,
  ].join('|');
}

/**
 * The four classes `VAL-B2-ART-003` names, and the collected kinds that
 * realise each one. A plain internal cross-reference is collected too and
 * travels in the observation, but it is not one of the four and holding it
 * apart from an external source would be a rule this file invented: both
 * are links to a document.
 *
 * "External sources" is realised by two kinds. Only 14 of 47 articles write
 * a bare external URL in prose, so a population that recognised only that
 * kind left the criterion's fourth class absent on 33 articles - and absent
 * classes were tolerated by a floor of two. Every article's generated
 * References list is the class's guaranteed realisation.
 */
const DISTINGUISHED_LINK_CLASSES = {
  'section links': ['section'],
  'inline citations': ['citation'],
  'glossary definitions': ['glossary'],
  'external sources': ['external', 'reference'],
} as const;

const DISTINGUISHED_LINK_KINDS = Object.values(
  DISTINGUISHED_LINK_CLASSES,
).flat() as readonly string[];

/**
 * `VAL-B2-ART-003`: the four link classes an article writes are told apart
 * by their own marks. Distinguishability is decided by comparing the
 * rendered signatures, not by checking each against a value typed here: two
 * classes that both drift to the same treatment still differ from the
 * constants and no longer differ from each other.
 */
export function linkTreatmentVerdicts(
  evidence: ArticleRuntimeEvidence,
): Map<string, Verdict<z.infer<typeof linkTreatmentSchema>[]>> {
  const verdicts = new Map<
    string,
    Verdict<z.infer<typeof linkTreatmentSchema>[]>
  >();
  for (const route of evidence.articleRoutes) {
    const observation = at(evidence, route, DESKTOP_VIEWPORT_ID);
    const present = observation.linkTreatments.filter(
      ({ count, kind }) => count > 0 && DISTINGUISHED_LINK_KINDS.includes(kind),
    );
    const failures: string[] = [];
    for (const [className, kinds] of Object.entries(
      DISTINGUISHED_LINK_CLASSES,
    )) {
      if (
        !present.some(({ kind }) => (kinds as readonly string[]).includes(kind))
      ) {
        failures.push(
          `${route} renders no ${className}, so one of the four classes the row tells apart is not on the page`,
        );
      }
    }
    // Every distinct painting inside every class, not one sample per class.
    // A class whose members disagree is reported by the collision that
    // disagreement causes, which is the reader-visible harm.
    const bySignature = new Map<string, Set<string>>();
    for (const treatment of present) {
      for (const variant of treatment.variants) {
        const signature = treatmentSignature(variant);
        bySignature.set(
          signature,
          (bySignature.get(signature) ?? new Set()).add(treatment.kind),
        );
      }
    }
    for (const [signature, kinds] of bySignature) {
      const classes = new Set(
        [...kinds].map(
          (kind) =>
            Object.entries(DISTINGUISHED_LINK_CLASSES).find(([, members]) =>
              (members as readonly string[]).includes(kind),
            )?.[0] ?? kind,
        ),
      );
      if (classes.size > 1) {
        failures.push(
          `${route} paints ${[...classes].sort().join(' and ')} identically (${signature})`,
        );
      }
    }
    for (const treatment of present.filter(({ kind }) => kind === 'glossary')) {
      for (const variant of treatment.variants) {
        if (variant.decorationStyle !== 'dotted') {
          failures.push(
            `${route} draws ${variant.count} glossary definition(s) with a ${variant.decorationStyle} underline, which does not read as a definition`,
          );
        }
      }
    }
    for (const treatment of present.filter(
      ({ kind }) => kind === 'external' || kind === 'reference',
    )) {
      for (const variant of treatment.variants) {
        if (
          !SIGNAL_BLUE_FORMS.includes(
            variant.colour.toLowerCase() as (typeof SIGNAL_BLUE_FORMS)[number],
          )
        ) {
          failures.push(
            `${route} paints ${variant.count} ${treatment.kind} source link(s) ${variant.colour}, not the signal blue reserved for information paths`,
          );
        }
      }
    }
    verdicts.set(route, { id: route, observed: present, failures });
  }
  if (verdicts.size === 0) {
    throw new Error('no article route was measured for its link treatments');
  }
  return verdicts;
}

/**
 * `VAL-B2-ART-009`: the title sheet carries nothing it invented. Counts come
 * from the rendered sheet, so an image mounted by a component the source
 * scan never opened is still counted.
 */
export function titleSheetResidueVerdicts(
  evidence: ArticleRuntimeEvidence,
): Map<string, Verdict<ArticleObservation['titleBlock']>> {
  const verdicts = new Map<string, Verdict<ArticleObservation['titleBlock']>>();
  for (const route of evidence.articleRoutes) {
    const observation = at(evidence, route, DESKTOP_VIEWPORT_ID);
    const block = observation.titleBlock;
    const failures: string[] = [];
    if (block.imageCount > 0) {
      failures.push(
        `${route} mounts ${block.imageCount} image(s) in its title sheet`,
      );
    }
    if (block.badgeCount > 0) {
      failures.push(
        `${route} mounts ${block.badgeCount} badge(s) in its title sheet`,
      );
    }
    if (block.backgroundImage !== 'none') {
      failures.push(
        `${route} paints ${block.backgroundImage} behind its title sheet`,
      );
    }
    const domainCrumb = block.breadcrumbLabels.at(-2) ?? '';
    const repeated = block.eyebrowTexts.filter(
      (text) => text.toLowerCase() === domainCrumb.toLowerCase(),
    );
    if (repeated.length > 0) {
      failures.push(
        `${route} repeats the domain "${domainCrumb}" as a title-sheet eyebrow`,
      );
    }
    verdicts.set(route, { id: route, observed: block, failures });
  }
  if (verdicts.size === 0) {
    throw new Error('no article route was measured for title-sheet residue');
  }
  return verdicts;
}

/**
 * `VAL-B2-TYPE-003`: every element that claims a Tektur display role renders
 * in Tektur once the face has loaded. The population is the roles the pages
 * actually wrote, so a role that stopped being written is an empty
 * population rather than a route that passed by having nothing to check.
 */
export function displayFaceVerdicts(
  evidence: ArticleRuntimeEvidence,
): Map<string, Verdict<ArticleObservation['tekturRoles']>> {
  const verdicts = new Map<string, Verdict<ArticleObservation['tekturRoles']>>();
  for (const route of evidence.routes) {
    const roles = ARTICLE_VIEWPORTS.flatMap(({ id }) =>
      at(evidence, route, id).tekturRoles.map((role) => ({ ...role, id })),
    );
    const failures: string[] = [];
    if (roles.length === 0) {
      failures.push(`${route} writes no Tektur display role at all`);
    }
    for (const role of roles) {
      if (!role.face.familyHead.includes(TEKTUR_HEAD)) {
        failures.push(
          `${route} renders its ${role.role} <${role.tag}> in ${role.face.familyHead} at ${role.id}, not Tektur`,
        );
      }
    }
    verdicts.set(route, {
      id: route,
      observed: at(evidence, route, DESKTOP_VIEWPORT_ID).tekturRoles,
      failures,
    });
  }
  if (verdicts.size === 0) {
    throw new Error('no route was measured for its display face');
  }
  return verdicts;
}

export type ProseFaceObservation = {
  paragraphCount: number;
  familyHeads: string[];
  sizePx: number;
  lineHeightRatio: number;
  measureCh: number;
};

/**
 * `VAL-B2-TYPE-004`: long-form prose is Newsreader, at the sealed size,
 * leading and measure. Read at the desktop width, where the measure cap is
 * what binds the column rather than the viewport.
 */
export function proseFaceVerdicts(
  evidence: ArticleRuntimeEvidence,
): Map<string, Verdict<ProseFaceObservation>> {
  const verdicts = new Map<string, Verdict<ProseFaceObservation>>();
  for (const route of evidence.articleRoutes) {
    const observation = at(evidence, route, DESKTOP_VIEWPORT_ID);
    const running = observation.proseParagraphs.filter(
      ({ insideRegisteredFrame }) => !insideRegisteredFrame,
    );
    const failures: string[] = [];
    if (running.length === 0) {
      failures.push(`${route} renders no running prose paragraph`);
    }
    const widest = widestRunningParagraph(observation);
    const measureCh =
      widest === null
        ? 0
        : Math.round((widest.widthPx / widest.zeroAdvancePx) * 100) / 100;
    for (const paragraph of running) {
      if (!paragraph.familyHead.includes(NEWSREADER_HEAD)) {
        failures.push(
          `${route} sets "${paragraph.text}" in ${paragraph.familyHead}, not Newsreader`,
        );
      }
      if (!inRange(paragraph.sizePx, PROSE_SIZE_PX)) {
        failures.push(
          `${route} sets prose at ${paragraph.sizePx}px, outside ${PROSE_SIZE_PX.min}-${PROSE_SIZE_PX.max}px`,
        );
      }
      if (!inRange(paragraph.lineHeightRatio, PROSE_LINE_HEIGHT)) {
        failures.push(
          `${route} sets prose leading at ${paragraph.lineHeightRatio}, outside ${PROSE_LINE_HEIGHT.min}-${PROSE_LINE_HEIGHT.max}`,
        );
      }
    }
    if (widest !== null && !inRange(measureCh, PROSE_MEASURE_CH)) {
      failures.push(
        `${route} sets its maximum measure at ${measureCh}ch, outside ${PROSE_MEASURE_CH.min}-${PROSE_MEASURE_CH.max}ch`,
      );
    }
    verdicts.set(route, {
      id: route,
      observed: {
        paragraphCount: running.length,
        familyHeads: [...new Set(running.map(({ familyHead }) => familyHead))],
        sizePx: widest?.sizePx ?? 0,
        lineHeightRatio: widest?.lineHeightRatio ?? 0,
        measureCh,
      },
      failures,
    });
  }
  if (verdicts.size === 0) {
    throw new Error('no article route was measured for its prose face');
  }
  return verdicts;
}

export type RoleFaceObservation = {
  monoRequiredCount: number;
  interfaceControlCount: number;
  controlsInProse: number;
  registrationLabelCount: number;
};

/**
 * The sizes at which `library/design-system.md` specifies IBM Plex Mono for
 * a control's own label: the `Data/control` row of §4.3 at 11-14px ("IBM
 * Plex Mono where fixed-width scanning helps") and the `Registration label`
 * row directly beneath it at 9-11px, which is the face §4.1 assigns to
 * "labels, coordinates, sequence numbers, chart annotations" - the 10px tick
 * captions and sort arrows an instrument's own controls carry.
 */
const MONO_CONTROL_SIZE_PX = { min: 9, max: 14 } as const;

/**
 * `VAL-B2-TYPE-005`: the supporting faces sit where the contract assigns
 * them. Three populations, each discovered by what an element is rather than
 * by the face it wears: code and sample elements, every control a reader can
 * operate, and the registration labels that name measured values.
 *
 * The criterion reads "Interface copy and controls compute to IBM Plex Sans;
 * code, source metadata, technical values, and registration labels compute
 * to IBM Plex Mono WHERE SPECIFIED", so the mono side is whatever the design
 * system specifies. §4.3 specifies a `Data/control` role at 11-14px in Plex
 * Mono, which is the instrument-panel control label. A control is therefore
 * graded against Plex Sans unless it sits inside that specified band, and
 * any third face - Tektur, Newsreader, a system fallback - fails outright.
 */
export function roleFaceVerdicts(
  evidence: ArticleRuntimeEvidence,
): Map<string, Verdict<RoleFaceObservation>> {
  const verdicts = new Map<string, Verdict<RoleFaceObservation>>();
  for (const route of evidence.routes) {
    const observation = at(evidence, route, DESKTOP_VIEWPORT_ID);
    const failures: string[] = [];
    for (const element of observation.monoRequired) {
      if (!element.familyHead.includes(PLEX_MONO_HEAD)) {
        failures.push(
          `${route} sets <${element.tag}> in ${element.familyHead}, not IBM Plex Mono`,
        );
      }
    }
    for (const control of observation.interfaceControls) {
      if (control.familyHead.includes(PLEX_SANS_HEAD)) continue;
      const dataControl =
        control.familyHead.includes(PLEX_MONO_HEAD) &&
        control.sizePx >= MONO_CONTROL_SIZE_PX.min &&
        control.sizePx <= MONO_CONTROL_SIZE_PX.max;
      if (dataControl) continue;
      failures.push(
        `${route} sets the control "${control.text}" (<${control.tag}>, ${control.sizePx}px) in ${control.familyHead}, which is neither IBM Plex Sans nor the specified ${MONO_CONTROL_SIZE_PX.min}-${MONO_CONTROL_SIZE_PX.max}px Plex Mono data/control or registration-label role`,
      );
    }
    for (const label of observation.registrationLabels) {
      if (!label.familyHead.includes(PLEX_MONO_HEAD)) {
        failures.push(
          `${route} sets the registration label "${label.text}" in ${label.familyHead}, not IBM Plex Mono`,
        );
      }
    }
    verdicts.set(route, {
      id: route,
      observed: {
        monoRequiredCount: observation.monoRequired.length,
        interfaceControlCount: observation.interfaceControls.length,
        controlsInProse: observation.interfaceControls.filter(
          ({ inProse }) => inProse,
        ).length,
        registrationLabelCount: observation.registrationLabels.length,
      },
      failures,
    });
  }
  // A family of four populations that all emptied would leave every route
  // passing on nothing at all. `controlsInProse` is counted separately
  // because it is the half that used to be excluded outright: if the
  // embedded instruments ever stop being collected, the sweep goes quiet
  // rather than red.
  const totals = evidence.observations.reduce(
    (sum, observation) => ({
      mono: sum.mono + observation.monoRequired.length,
      controls: sum.controls + observation.interfaceControls.length,
      controlsInProse:
        sum.controlsInProse +
        observation.interfaceControls.filter(({ inProse }) => inProse).length,
      labels: sum.labels + observation.registrationLabels.length,
    }),
    { mono: 0, controls: 0, controlsInProse: 0, labels: 0 },
  );
  for (const [name, total] of Object.entries(totals)) {
    if (total === 0) {
      throw new Error(
        `the ${name} population of the role-face rows is empty across the whole sweep, so those clauses check nothing`,
      );
    }
  }
  return verdicts;
}

export type TitleSizeObservation = {
  mobileSizePx: number;
  desktopSizePx: number;
  mobileLineHeight: number;
  desktopLineHeight: number;
};

function registeredInstance(roleId: string): { wght: number; wdth: number } {
  const instance = TEKTUR_ROLE_INSTANCES.find(({ id }) => id === roleId);
  if (!instance) {
    throw new Error(
      `${roleId} is not a registered Tektur role instance, so there is no approved axis instance to hold its rendering to`,
    );
  }
  return { wght: instance.wght, wdth: instance.wdth };
}

/**
 * The variable-font instance a rendered role is actually wearing. `wght`
 * comes from `font-variation-settings` when the role names it there and from
 * the computed weight otherwise, because a role can reach the same instance
 * either way and a reading that only trusted one of them would call the
 * other a drift.
 */
function axisInstanceOf(face: {
  weight: number;
  variationSettings: string;
}): { wght: number; wdth: number } {
  const axis = (tag: string) => {
    const match = face.variationSettings.match(
      new RegExp(`["']${tag}["']\\s*(-?[\\d.]+)`),
    );
    return match ? Number.parseFloat(match[1] ?? '') : null;
  };
  return { wght: axis('wght') ?? face.weight, wdth: axis('wdth') ?? 100 };
}

function sizeVerdicts(input: {
  evidence: ArticleRuntimeEvidence;
  routes: readonly string[];
  select: (observation: ArticleObservation) => z.infer<typeof tekturRoleSchema>[];
  sizes: Record<string, { min: number; max: number }>;
  lineHeight: { min: number; max: number };
  label: string;
  /**
   * The axis instance the role registry approves for this role. It is read
   * out of `data/type-roles.json` rather than written here, so an
   * owner-approved replacement moves the requirement instead of failing it.
   */
  instance: { wght: number; wdth: number };
}): Map<string, Verdict<TitleSizeObservation>> {
  const verdicts = new Map<string, Verdict<TitleSizeObservation>>();
  for (const route of input.routes) {
    const mobile = input.select(at(input.evidence, route, MOBILE_VIEWPORT_ID));
    const desktop = input.select(
      at(input.evidence, route, DESKTOP_VIEWPORT_ID),
    );
    const failures: string[] = [];
    if (mobile.length === 0 || desktop.length === 0) {
      failures.push(
        `${route} renders no ${input.label} at ${mobile.length === 0 ? MOBILE_VIEWPORT_ID : DESKTOP_VIEWPORT_ID}`,
      );
    }
    for (const [viewport, roles] of [
      [MOBILE_VIEWPORT_ID, mobile],
      [DESKTOP_VIEWPORT_ID, desktop],
    ] as const) {
      for (const role of roles) {
        if (!inRange(role.face.sizePx, input.sizes[viewport])) {
          failures.push(
            `${route} renders its ${input.label} at ${role.face.sizePx}px on ${viewport}, outside ${input.sizes[viewport].min}-${input.sizes[viewport].max}px`,
          );
        }
        if (!inRange(role.face.lineHeightRatio, input.lineHeight)) {
          failures.push(
            `${route} sets its ${input.label} leading to ${role.face.lineHeightRatio} on ${viewport}, outside ${input.lineHeight.min}-${input.lineHeight.max}`,
          );
        }
        const axes = axisInstanceOf(role.face);
        if (
          axes.wght !== input.instance.wght ||
          axes.wdth !== input.instance.wdth
        ) {
          failures.push(
            `${route} renders its ${input.label} at wght=${axes.wght} wdth=${axes.wdth} on ${viewport}, not the registered instance wght=${input.instance.wght} wdth=${input.instance.wdth}`,
          );
        }
      }
    }
    verdicts.set(route, {
      id: route,
      observed: {
        mobileSizePx: mobile[0]?.face.sizePx ?? 0,
        desktopSizePx: desktop[0]?.face.sizePx ?? 0,
        mobileLineHeight: mobile[0]?.face.lineHeightRatio ?? 0,
        desktopLineHeight: desktop[0]?.face.lineHeightRatio ?? 0,
      },
      failures,
    });
  }
  if (verdicts.size === 0) {
    throw new Error(`no route was measured for its ${input.label}`);
  }
  return verdicts;
}

/** `VAL-B2-TYPE-006`: the home wordmark's two sealed sizes and its leading. */
export function homeWordmarkVerdicts(
  evidence: ArticleRuntimeEvidence,
): Map<string, Verdict<TitleSizeObservation>> {
  const routes = evidence.routes.filter((route) =>
    ARTICLE_VIEWPORTS.some(
      ({ id }) =>
        at(evidence, route, id).tekturRoles.some(
          ({ role }) => role === 'home-wordmark',
        ),
    ),
  );
  if (routes.length === 0) {
    throw new Error(
      'no route in the sweep writes the home-wordmark role, so its sizes check nothing',
    );
  }
  return sizeVerdicts({
    evidence,
    routes,
    select: (observation) =>
      observation.tekturRoles.filter(({ role }) => role === 'home-wordmark'),
    sizes: HOME_WORDMARK_SIZE_PX,
    lineHeight: HOME_WORDMARK_LINE_HEIGHT,
    label: 'home wordmark',
    instance: registeredInstance('home-wordmark'),
  });
}

/** `VAL-B2-TYPE-007`: the article title's two sealed sizes and its leading. */
export function articleTitleVerdicts(
  evidence: ArticleRuntimeEvidence,
): Map<string, Verdict<TitleSizeObservation>> {
  return sizeVerdicts({
    evidence,
    routes: evidence.articleRoutes,
    select: (observation) =>
      observation.tekturRoles.filter(({ tag }) => tag === 'h1'),
    sizes: ARTICLE_H1_SIZE_PX,
    lineHeight: ARTICLE_H1_LINE_HEIGHT,
    label: 'article title',
    instance: registeredInstance('article-h1'),
  });
}

export type ProseResidueObservation = {
  paragraphCount: number;
  registeredFrameParagraphCount: number;
  offendingFamilies: string[];
};

/**
 * `VAL-B2-TYPE-008`: no running prose paragraph wears the display or the
 * data face.
 *
 * Every paragraph in the reading column is measured; a paragraph inside a
 * registered surface or control is classified rather than dropped, because
 * the contract assigns technical values and instrument readouts to the mono
 * face and those are exactly the paragraphs that sit inside one. The count
 * of both classes travels with the verdict, so the exemption is visible in
 * the row rather than hidden inside the query that produced it.
 */
export function proseResidueVerdicts(
  evidence: ArticleRuntimeEvidence,
): Map<string, Verdict<ProseResidueObservation>> {
  const verdicts = new Map<string, Verdict<ProseResidueObservation>>();
  for (const route of evidence.routes) {
    const failures: string[] = [];
    const offending: string[] = [];
    let running = 0;
    let framed = 0;
    for (const { id } of ARTICLE_VIEWPORTS) {
      for (const paragraph of at(evidence, route, id).proseParagraphs) {
        if (paragraph.insideRegisteredFrame) {
          framed += 1;
          continue;
        }
        running += 1;
        const head = paragraph.familyHead;
        if (head.includes(TEKTUR_HEAD) || head.includes(PLEX_MONO_HEAD)) {
          offending.push(head);
          failures.push(
            `${route} sets the prose paragraph "${paragraph.text}" in ${head} at ${id}`,
          );
        }
      }
    }
    if (running === 0 && framed > 0) {
      failures.push(
        `${route} renders only framed paragraphs, so nothing on it is running prose`,
      );
    }
    verdicts.set(route, {
      id: route,
      observed: {
        paragraphCount: running,
        registeredFrameParagraphCount: framed,
        offendingFamilies: [...new Set(offending)],
      },
      failures,
    });
  }
  const measured = [...verdicts.values()].reduce(
    (sum, { observed }) => sum + observed.paragraphCount,
    0,
  );
  if (measured === 0) {
    throw new Error(
      'the sweep found no running prose paragraph on any route, so this row checks nothing',
    );
  }
  return verdicts;
}

/**
 * `VAL-B2-TYPE-009`: a linked section heading says so with two marks, one of
 * which is not a colour, and stays reachable by keyboard. Members are the
 * headings themselves, not the routes that hold them: a route with one
 * correct heading and four bare ones is not a route that passes.
 */
export function sectionHeadingVerdicts(
  evidence: ArticleRuntimeEvidence,
): Map<string, Verdict<SectionLink>> {
  const verdicts = new Map<string, Verdict<SectionLink>>();
  for (const route of evidence.articleRoutes) {
    for (const link of at(evidence, route, DESKTOP_VIEWPORT_ID).sectionLinks) {
      const id = `${route}#${link.headingId}`;
      const failures: string[] = [];
      if (!link.linked) {
        failures.push(`${id} is addressable but carries no self-link`);
      }
      if (!link.decorationLine.includes('underline')) {
        failures.push(
          `${id} draws no underline (text-decoration-line: ${link.decorationLine})`,
        );
      }
      if (
        !SIGNAL_BLUE_FORMS.includes(
          link.decorationColour.toLowerCase() as (typeof SIGNAL_BLUE_FORMS)[number],
        )
      ) {
        failures.push(
          `${id} underlines in ${link.decorationColour}, not signal blue`,
        );
      }
      if (link.decorationThicknessPx <= 0) {
        failures.push(`${id} draws an underline of zero thickness`);
      }
      if (link.affordance === null) {
        failures.push(`${id} carries no non-colour link affordance`);
      } else {
        if (link.affordance.opacity <= 0.5) {
          failures.push(
            `${id} holds its link affordance at opacity ${link.affordance.opacity}, so it is not there at rest`,
          );
        }
        if (link.affordance.visibility !== 'visible') {
          failures.push(
            `${id} hides its link affordance (visibility: ${link.affordance.visibility})`,
          );
        }
        if (
          link.affordance.widthPx <= 0 ||
          link.affordance.heightPx <= 0
        ) {
          failures.push(`${id} renders its link affordance at zero size`);
        }
        if (link.affordance.accessibleName.trim().length === 0) {
          failures.push(`${id} renders an unnamed link affordance`);
        }
      }
      if (!link.keyboardFocusable) {
        failures.push(`${id} is not reachable by keyboard`);
      }
      verdicts.set(id, { id, observed: link, failures });
    }
  }
  if (verdicts.size === 0) {
    throw new Error(
      'the sweep found no addressable section heading on any article, so this row checks nothing',
    );
  }
  return verdicts;
}

/**
 * The members of `VAL-B2-TYPE-009`: every addressable section heading the
 * sweep found, named `route#heading-id`. It is the heading ledger, not the
 * link ledger, so a heading that loses its anchor stays a member and fails.
 */
export function sectionHeadingMembers(
  evidence: ArticleRuntimeEvidence,
): string[] {
  const members = evidence.articleRoutes.flatMap((route) =>
    at(evidence, route, DESKTOP_VIEWPORT_ID).sectionLinks.map(
      ({ headingId }) => `${route}#${headingId}`,
    ),
  );
  if (members.length === 0) {
    throw new Error(
      'the sweep found no addressable section heading, so the population of the heading row would be empty',
    );
  }
  return [...members].sort();
}

export type TrackingObservation = {
  labelCount: number;
  trackingEm: number[];
  siteWideTrackingEm: number;
  spreadEm: number;
};

/**
 * The one tracking ratio the whole sweep uses for registration labels, and
 * the spread around it.
 *
 * Derived from every label the sweep found rather than declared, so a second
 * ratio appearing anywhere moves the number every route is compared with.
 */
export function siteWideTracking(evidence: ArticleRuntimeEvidence): {
  ratio: number;
  spread: number;
  ratios: number[];
} {
  const ratios = evidence.observations
    .flatMap(({ registrationLabels }) => registrationLabels)
    .map(({ trackingEm }) => trackingEm);
  if (ratios.length === 0) {
    throw new Error(
      'the sweep found no registration label, so there is no site-wide tracking ratio to hold anything to',
    );
  }
  const counts = new Map<number, number>();
  for (const ratio of ratios) counts.set(ratio, (counts.get(ratio) ?? 0) + 1);
  const ratio = [...counts].sort(
    (left, right) => right[1] - left[1] || left[0] - right[0],
  )[0][0];
  const spread =
    Math.round(
      (Math.max(...ratios) - Math.min(...ratios)) * 10000,
    ) / 10000;
  return { ratio, spread, ratios: [...new Set(ratios)].sort() };
}

/**
 * `VAL-B2-TYPE-010` and `VAL-DESIGN-021`: one tracking ratio for the whole
 * class of registration labels, inside the sealed band.
 */
export function registrationTrackingVerdicts(
  evidence: ArticleRuntimeEvidence,
): Map<string, Verdict<TrackingObservation>> {
  const site = siteWideTracking(evidence);
  const verdicts = new Map<string, Verdict<TrackingObservation>>();
  for (const route of evidence.routes) {
    const labels = ARTICLE_VIEWPORTS.flatMap(
      ({ id }) => at(evidence, route, id).registrationLabels,
    );
    const failures: string[] = [];
    for (const label of labels) {
      if (Math.abs(label.trackingEm - site.ratio) > REGISTRATION_TRACKING_SPREAD_EM) {
        failures.push(
          `${route} tracks the label "${label.text}" at ${label.trackingEm}em, more than ${REGISTRATION_TRACKING_SPREAD_EM}em from the site-wide ${site.ratio}em`,
        );
      }
      if (!inRange(label.trackingEm, REGISTRATION_TRACKING_EM)) {
        failures.push(
          `${route} tracks the label "${label.text}" at ${label.trackingEm}em, outside ${REGISTRATION_TRACKING_EM.min}-${REGISTRATION_TRACKING_EM.max}em`,
        );
      }
    }
    verdicts.set(route, {
      id: route,
      observed: {
        labelCount: labels.length,
        trackingEm: [...new Set(labels.map(({ trackingEm }) => trackingEm))].sort(),
        siteWideTrackingEm: site.ratio,
        spreadEm: site.spread,
      },
      failures,
    });
  }
  const measured = [...verdicts.values()].reduce(
    (sum, { observed }) => sum + observed.labelCount,
    0,
  );
  if (measured === 0) {
    throw new Error('no route in the sweep renders a registration label');
  }
  return verdicts;
}

export type RuleObservation = {
  ruleCount: number;
  registeredCount: number;
  worstAlignmentErrorPx: number;
  unregistered: string[];
};

/**
 * `VAL-DESIGN-018`: every rule an article draws has a registry owner, a
 * declared anchor, and lands on it.
 *
 * The population is every element in the reading column that paints a
 * hairline, discovered from its own rendered geometry rather than from the
 * annotation it may or may not carry: a query for annotated rules could
 * never see the unannotated one.
 */
export function articleRuleVerdicts(
  evidence: ArticleRuntimeEvidence,
): Map<string, Verdict<RuleObservation>> {
  const verdicts = new Map<string, Verdict<RuleObservation>>();
  for (const route of evidence.articleRoutes) {
    const rules = at(evidence, route, DESKTOP_VIEWPORT_ID).rules;
    const failures: string[] = [];
    const unregistered: string[] = [];
    let worst = 0;
    for (const rule of rules) {
      if (rule.deviceId === null) {
        unregistered.push(rule.outline);
        failures.push(
          `${route} draws a rule no registry owns: ${rule.outline}`,
        );
        continue;
      }
      if (rule.anchorSelector === null) {
        failures.push(
          `${route} draws ${rule.deviceId} with no declared anchor, so nothing decides where it belongs`,
        );
        continue;
      }
      if (rule.alignmentErrorPx === null) {
        failures.push(
          `${route} declares ${rule.deviceId} against ${rule.anchorSelector}, which resolves to nothing`,
        );
        continue;
      }
      worst = Math.max(worst, rule.alignmentErrorPx);
      if (rule.alignmentErrorPx > RULE_ALIGNMENT_TOLERANCE_PX) {
        failures.push(
          `${route} sets ${rule.deviceId} ${rule.alignmentErrorPx}px from its ${rule.anchorSelector} anchor, over the ${RULE_ALIGNMENT_TOLERANCE_PX}px tolerance`,
        );
      }
    }
    verdicts.set(route, {
      id: route,
      observed: {
        ruleCount: rules.length,
        registeredCount: rules.filter(({ deviceId }) => deviceId !== null)
          .length,
        worstAlignmentErrorPx: Math.round(worst * 100) / 100,
        unregistered,
      },
      failures,
    });
  }
  if (verdicts.size === 0) {
    throw new Error('no article route was measured for its rules');
  }
  // Routes are recorded whether or not they draw a rule, so the route set
  // alone cannot tell a clean corpus from one where the collector stopped
  // finding rules at all. The corpus-wide count is what separates them.
  const drawn = [...verdicts.values()].reduce(
    (total, { observed }) => total + observed.ruleCount,
    0,
  );
  if (drawn === 0) {
    throw new Error(
      'no article route drew a single rule, so this family asserted nothing',
    );
  }
  return verdicts;
}
