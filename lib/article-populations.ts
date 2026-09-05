/**
 * Canonical populations for the article-sheet and type-hierarchy assertions.
 *
 * Most of them quantify over article routes, because the sheet they describe
 * is rendered by one shared template on every published article and a claim
 * decided on the one route a sentence happens to name would be decided by
 * whichever article the author had open. Three do not, and giving them the
 * route population would emit a row per route for a claim never checked
 * against that route (R8a):
 *
 * - `VAL-B2-TYPE-005` is about every public route, not only the articles:
 *   the interface controls and registration labels it governs live in the
 *   shell and the instruments as well as in the reading column.
 * - `VAL-B2-TYPE-006` is about one registered role instance. It is named by
 *   the role registry rather than by the routes that mount it, so the
 *   population cannot quietly empty if home stops rendering the wordmark.
 * - `VAL-B2-TYPE-009` is about section headings. A route with one correct
 *   heading and four bare ones is not a route that passes, so the members
 *   are the headings themselves.
 */
export const ARTICLE_ROUTE_POPULATION_SOURCE =
  'contract/brand-v2-registries.json#routes.public:article';
export const ARTICLE_TYPE_ROUTE_POPULATION_SOURCE =
  'contract/brand-v2-registries.json#routes.public';
export const HOME_WORDMARK_ROLE_POPULATION_SOURCE =
  'data/type-roles.json#tekturRoleInstances:home-wordmark';
export const SECTION_HEADING_POPULATION_SOURCE =
  'evidence/brand-v2/article-typography.json#sectionHeadings';

export const ARTICLE_ASSERTION_POPULATION_SOURCES: Readonly<
  Record<string, string>
> = {
  'VAL-B2-ART-001': ARTICLE_ROUTE_POPULATION_SOURCE,
  'VAL-B2-ART-002': ARTICLE_ROUTE_POPULATION_SOURCE,
  'VAL-B2-ART-003': ARTICLE_ROUTE_POPULATION_SOURCE,
  'VAL-B2-ART-009': ARTICLE_ROUTE_POPULATION_SOURCE,
  'VAL-B2-TYPE-003': ARTICLE_TYPE_ROUTE_POPULATION_SOURCE,
  'VAL-B2-TYPE-004': ARTICLE_ROUTE_POPULATION_SOURCE,
  'VAL-B2-TYPE-005': ARTICLE_TYPE_ROUTE_POPULATION_SOURCE,
  'VAL-B2-TYPE-006': HOME_WORDMARK_ROLE_POPULATION_SOURCE,
  'VAL-B2-TYPE-007': ARTICLE_ROUTE_POPULATION_SOURCE,
  'VAL-B2-TYPE-008': ARTICLE_ROUTE_POPULATION_SOURCE,
  'VAL-B2-TYPE-009': SECTION_HEADING_POPULATION_SOURCE,
  'VAL-B2-TYPE-010': ARTICLE_TYPE_ROUTE_POPULATION_SOURCE,
};

/**
 * `VAL-B2-ART-010` is a preservation claim about one article's rendered
 * apparatus, so its members are the article routes. It is kept out of the
 * map above because it is decided by a different sweep: the typography
 * evidence measures a painted type scale and has nothing to say about
 * whether a bibliography still lists the entries the registry derives.
 */
export const APPARATUS_ASSERTION_POPULATION_SOURCES: Readonly<
  Record<string, string>
> = {
  'VAL-B2-ART-010': ARTICLE_ROUTE_POPULATION_SOURCE,
};

/** The one member `VAL-B2-TYPE-006` quantifies over. */
export const HOME_WORDMARK_ROLE_ID = 'home-wordmark';
