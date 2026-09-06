import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { publishedModules } from '../data/modules.ts';
import {
  buildManifest,
  type JsonValue,
  type ManifestInput,
} from './brand-v2-baseline.ts';

/**
 * The relationship half of an article's truth, in the exact shape the
 * migration sealed it: the curated `seeAlso` list, the citation ids the body
 * cites, the glossary terms it marks, and the internal links it follows.
 *
 * This lives in `lib/` rather than in the baseline script because two
 * different gates need it and only one of them may reach a script.
 * `scripts/brand-v2-baseline.ts` builds the sealed manifests from it, and
 * `VAL-B2-ART-010` binds the rendered apparatus to those same hashes from
 * inside the evidence closure, which refuses to fingerprint a sweep that
 * imports a module outside `app/ components/ lib/ content/ data/`. A second
 * copy of the collector would be a second definition of what "unchanged"
 * means, and the two would agree until the day they did not.
 */

/** Sorted, because a hash over a set must not depend on discovery order. */
function sortedMatches(body: string, pattern: RegExp): string[] {
  return [...body.matchAll(pattern)].map((match) => match[1] as string).sort();
}

export function relationshipManifestInputs(
  root: string,
): ManifestInput[] {
  return publishedModules().map(({ domain, slug }) => {
    const parsed = matter(
      readFileSync(join(root, 'content', domain, `${slug}.mdx`), 'utf8'),
    );
    const body = parsed.content.trim();
    const data = parsed.data as Record<string, unknown>;
    return {
      id: `article:${domain}/${slug}`,
      value: {
        seeAlso: JSON.parse(
          JSON.stringify(data.seeAlso ?? []),
        ) as JsonValue,
        citations: sortedMatches(body, /<Cite\s+id=["']([^"']+)["']/g),
        terms: sortedMatches(body, /<Term\s+id=["']([^"']+)["']/g),
        internalLinks: sortedMatches(body, /\]\((\/[^)#?]+\/?)(?:#[^)]+)?\)/g),
      },
    };
  });
}

/** The rebuilt members, hashed the way the sealed manifest hashed them. */
export function currentRelationshipMembers(
  root: string,
): Array<{ id: string; hash: string }> {
  return buildManifest('relationships', relationshipManifestInputs(root)).members.map(
    ({ id, hash }) => ({ id, hash }),
  );
}

/**
 * The frontmatter facts the title sheet prints and the References list is
 * generated from: the review date and the declared source list.
 *
 * This is the same collector `scripts/brand-v2-baseline.ts` seals as the
 * `article-fact-frontmatter:` members of the `article-metadata` manifest,
 * and it lives here for the same reason `relationshipManifestInputs` does.
 * `VAL-B2-ART-010` needs it because the bibliography a page renders is
 * derived from `frontmatter.citations` on both sides of its comparison:
 * adding a valid registry id to that list moves the rendered References
 * and the derived expectation together, and the `relationships` manifest
 * hashes only the `<Cite>` markers the body writes, so nothing that row
 * reads can see the addition. A script may not be imported from inside the
 * evidence closure, so a second copy of this shape would become a second
 * definition of the sealed value.
 */
export function articleFactFrontmatterInputs(root: string): ManifestInput[] {
  return publishedModules().map(({ domain, slug }) => {
    const path = `content/${domain}/${slug}.mdx`;
    const data = matter(
      readFileSync(join(root, path), 'utf8').replace(/\r\n/g, '\n'),
    ).data as Record<string, unknown>;
    return {
      id: `article-fact-frontmatter:${domain}/${slug}`,
      value: {
        path,
        lastReviewed: String(data.lastReviewed ?? ''),
        citations: JSON.parse(
          JSON.stringify(data.citations ?? []),
        ) as JsonValue,
      },
    };
  });
}

/** The rebuilt frontmatter-fact members, hashed as the seal hashed them. */
export function currentArticleFactFrontmatterMembers(
  root: string,
): Array<{ id: string; hash: string }> {
  return buildManifest(
    'article-metadata',
    articleFactFrontmatterInputs(root),
  ).members.map(({ id, hash }) => ({ id, hash }));
}
