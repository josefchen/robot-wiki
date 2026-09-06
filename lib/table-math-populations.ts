/**
 * Canonical populations for the two dense-surface article rows.
 *
 * Neither quantifies over routes. A route with nine sound tables and one
 * that scrolls inside an unreachable box is not a route that passes, and
 * grading by route would let the nine outvote the one, which is exactly how
 * the four interactive comparison tables stayed broken: the existing
 * `VAL-B2-COMP-009` gate collected only scroll containers that were ALREADY
 * keyboard-reachable, so a container with no tab stop was filtered out of
 * the population before the check ran, and it swept at 1440px only, where
 * those tables do not overflow at all. A member set derived from every
 * rendered table, at the width where the overflow exists, cannot be escaped
 * that way.
 *
 * The same argument applies to equations: an article with thirty typeset
 * expressions and one that rendered a parse error is not an accessible
 * article.
 */
export const TABLE_OCCURRENCE_POPULATION_SOURCE =
  'evidence/brand-v2/article-tables-math.json#tables';
export const EQUATION_OCCURRENCE_POPULATION_SOURCE =
  'evidence/brand-v2/article-tables-math.json#equations';

export const TABLE_MATH_ASSERTION_POPULATION_SOURCES: Readonly<
  Record<string, string>
> = {
  'VAL-B2-ART-007': EQUATION_OCCURRENCE_POPULATION_SOURCE,
  'VAL-B2-ART-008': TABLE_OCCURRENCE_POPULATION_SOURCE,
};

/** What each row means when its member passes, in the row's own terms. */
export const TABLE_MATH_ASSERTION_ACTUALS: Readonly<Record<string, string>> = {
  'VAL-B2-ART-007':
    'emits MathML with a TeX annotation behind a hidden glyph layer, shows the reader no raw TeX, is reachable by keyboard wherever it is wide enough to scroll, and where it is a display block names the region a keyboard reader lands on',
  'VAL-B2-ART-008':
    'is a named table with scoped headers that stays inside the viewport by scrolling in its own keyboard-reachable container, on a page with no horizontal document overflow and no clipped root or body, beside a reading column still inside the sealed measure',
};
