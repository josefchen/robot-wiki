/**
 * Public brand identity, locked by `library/design-system.md` §3.1 and
 * measured by `VAL-B2-ID-001`/`VAL-B2-ID-002`. Capital `R`, capital `W`,
 * one literal space, no hyphen, no terminal punctuation; the descriptor's
 * terminal period is part of the descriptor. Every public lockup, metadata
 * title, site name, and descriptor surface imports these rather than
 * restating them, because the assertions compare byte equality.
 *
 * These are display identity only. The repository slug, the production
 * domain `robot-wiki.com`, the generated card path `/og/robot-wiki.png`,
 * and `robot-atlas-trajectory` are technical identifiers and stay
 * unchanged (`VAL-B2-ID-004`, design-system §3.2).
 */
export const PUBLIC_IDENTITY = 'Robot Wiki';
export const PUBLIC_DESCRIPTOR =
  'Citation-first encyclopedia of modern robot learning.';

/**
 * Site identity, supplied verbatim by the owner on 2026-08-20. Do not
 * reword, embellish, or paraphrase these strings: the author name renders
 * in three places that must stay byte-identical after whitespace collapse
 * (meta[name=author] on every route, the site footer on every route, and
 * /credits, per VAL-DIST-009), so every surface imports these constants
 * instead of restating the string.
 */
export const AUTHOR_NAME = 'Josef Chen';
export const AUTHOR_HANDLE = '@josefchen';
export const AUTHOR_BIO =
  'Spent 3 years building and deploying robots at KAIKAKU (acquired by REEF)';
/**
 * External author profile. Verified to resolve 200 on 2026-08-20 and used
 * as the anchor around the author name (VAL-DIST-009 clause c).
 */
export const AUTHOR_PROFILE_URL = 'https://github.com/josefchen';
/**
 * Source repository, linked from the footer on every route (VAL-DIST-007).
 */
export const REPOSITORY_URL = 'https://github.com/josefchen/robot-wiki';
