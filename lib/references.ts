/**
 * References bibliography helpers, shared by the build-time content
 * validator (check 8: inline cites must be declared in frontmatter) and the
 * article template (which renders the References section).
 *
 * Inline <Cite id="..."/> chips are the short form of a citation; the
 * References section at the end of every article is the long form, derived
 * from the citation registry via the frontmatter `citations` list. See
 * architecture.md section 6b.
 *
 * gray-matter is the only dependency; registry lookup is injected so this
 * module stays loadable under plain node, Vitest, and Next.js alike.
 */
import matter from 'gray-matter';
import type { Citation } from '../data/schemas/citation.ts';

/** A References entry: the registry record plus how the article uses it. */
export interface ResolvedReference {
  citation: Citation;
  /**
   * Declared in frontmatter but never cited inline. The entry still belongs
   * in References (frontmatter is the source of truth) but must carry an
   * explicit "Further reading" marker rather than appear silently orphaned
   */
  furtherReading: boolean;
}

/*
 * Code masking mirrors the currency-hygiene check in lib/validate-content.ts:
 * blank (not remove) masked regions so match indices keep their line
 * positions. remark/MDX renders JSX in prose and JSX children, but never
 * fenced code or inline code spans, so <Cite> syntax inside those is
 * documentation, not a citation.
 */
const FENCED_CODE = /```[\s\S]*?```/g;
const INLINE_CODE = /`[^`\n]*`/g;

/** <Cite id="..."> with either quote style and any sibling attributes. */
const CITE_ELEMENT = /<Cite\b[^>]*?\bid\s*=\s*(["'])([^"']+)\1/g;

/**
 * Registry ids cited inline in an MDX body, in order of first use, deduped.
 * Cites shown inside code spans or fenced blocks are ignored.
 */
export function inlineCitationIds(body: string): string[] {
  const blank = (match: string) => match.replace(/[^\n]/g, ' ');
  const masked = body.replace(FENCED_CODE, blank).replace(INLINE_CODE, blank);
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const match of masked.matchAll(CITE_ELEMENT)) {
    const id = match[2];
    if (!seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

/** The MDX body with the frontmatter block stripped (gray-matter semantics). */
export function moduleBody(source: string): string {
  return matter(source).content;
}

/**
 * Resolve a module's frontmatter `citations` list into rendered References
 * entries: frontmatter declaration order (deterministic), deduped, mapped
 * through the injected registry lookup. Ids missing from the registry are
 * skipped here because the prebuild validator already fails the build on
 * them (check 5); they can never reach a rendered page.
 */
export function resolveReferences(
  declaredIds: readonly string[],
  inlineIds: readonly string[],
  lookup: (id: string) => Citation | undefined,
): ResolvedReference[] {
  const inline = new Set(inlineIds);
  const seen = new Set<string>();
  const entries: ResolvedReference[] = [];
  for (const id of declaredIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    const citation = lookup(id);
    if (!citation) continue;
    entries.push({ citation, furtherReading: !inline.has(id) });
  }
  return entries;
}
