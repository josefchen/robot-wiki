import { DASH_PATTERN, findBannedVocabulary } from './no-slop.ts';

/**
 * Wording the home page may not show. Build-progress copy is refused by the
 * home composition sweep (tests/e2e/brand-v2-home.spec.ts); banned
 * vocabulary and dash characters by VAL-DESIGN-011; reading guidance by
 * VAL-NAV-005, which keeps it on /about/. Text picked for home by code,
 * such as the featured lead, is screened with the same lists.
 */
export const HOME_PROGRESS_PHRASES = [
  'coming soon',
  'under construction',
  'work in progress',
  'in progress',
  'planned',
  'to be written',
  'not yet written',
  'stay tuned',
  'watch this space',
  'more to come',
  'placeholder',
  'roadmap',
  'milestone 1',
  'phase 1',
] as const;

export const HOME_READING_GUIDE_PHRASES = [
  'how to read',
  'reading order',
  'prerequisite',
] as const;

/** Every reason `text` could not be shown on home; empty when it can. */
export function homeCopyProblems(text: string): string[] {
  const problems: string[] = [];
  if (DASH_PATTERN.test(text)) problems.push('an em or en dash');
  for (const { word } of findBannedVocabulary(text)) {
    problems.push(`banned wording "${word}"`);
  }
  const lower = text.toLowerCase();
  for (const phrase of HOME_PROGRESS_PHRASES) {
    if (lower.includes(phrase)) problems.push(`progress wording "${phrase}"`);
  }
  for (const phrase of HOME_READING_GUIDE_PHRASES) {
    if (lower.includes(phrase)) problems.push(`reading-guide wording "${phrase}"`);
  }
  return problems;
}
