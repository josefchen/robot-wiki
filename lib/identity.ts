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
