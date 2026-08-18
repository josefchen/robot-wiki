/**
 * Glossary helpers for the content pipeline. `inlineTermIds` scans an MDX
 * body for <Term id="..."/> usages so the prebuild validator can fail the
 * build on unknown term ids, and so tests can prove the
 * inline id set stays within the glossary.
 *
 * Code masking mirrors inlineCitationIds in lib/references.ts: blank (not
 * remove) masked regions so match indices keep their line positions. MDX
 * renders JSX in prose, but never inside fenced code or inline code spans,
 * so <Term> syntax there is documentation, not a term usage.
 */
const FENCED_CODE = /```[\s\S]*?```/g;
const INLINE_CODE = /`[^`\n]*`/g;

/** <Term id="..."> with either quote style and any sibling attributes. */
const TERM_ELEMENT = /<Term\b[^>]*?\bid\s*=\s*(["'])([^"']+)\1/g;

/**
 * Glossary ids used inline in an MDX body, in order of first use, deduped.
 * Terms shown inside code spans or fenced blocks are ignored.
 */
export function inlineTermIds(body: string): string[] {
  const blank = (match: string) => match.replace(/[^\n]/g, ' ');
  const masked = body.replace(FENCED_CODE, blank).replace(INLINE_CODE, blank);
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const match of masked.matchAll(TERM_ELEMENT)) {
    const id = match[2];
    if (!seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}
