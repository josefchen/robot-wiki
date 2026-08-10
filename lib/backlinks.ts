/**
 * The wiki's internal article-link graph and its inverse ("Linked from").
 *
 * Derived at build time from data already in the repo (architecture.md
 * section 6b): every published article's MDX source is scanned for
 * internal links (markdown `[text](/domain/slug)` and JSX `href`/`to`
 * attributes), unioned with the curated `seeAlso` edges from frontmatter,
 * and inverted. The prebuild validator (lib/validate-content.ts) enforces
 * that every internal link and every seeAlso entry resolves, so this
 * module only ever sees well-formed edges; unresolvable ids are skipped
 * defensively rather than rendered as broken links.
 *
 * The validator and the backlink list must agree exactly (the list is the
 * inverse of the graph the validator checks), so check 6 of the validator
 * reuses the extraction helpers exported here.
 *
 * Runtime imports carry explicit .ts extensions because this file is
 * executed by plain node (type stripping, no extension resolution) as well
 * as Vitest and Next.js.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { publishedModules } from '../data/modules.ts';
import type { ModuleRegistryEntry } from '../data/schemas/module.ts';

const MD_LINK = /\[[^\]]*\]\(\s*(\/[^)\s"']+)[^)]*\)/g;
const JSX_LINK = /\b(?:href|to)\s*=\s*["'](\/[^"']+)["']/g;

// Code masking mirrors lib/references.ts: blank (not remove) masked
// regions so match indices keep their positions. Link syntax shown inside
// code spans or fences does not render as a link, so it must not produce
// a backlink either.
const FENCED_CODE = /```[\s\S]*?```/g;
const INLINE_CODE = /`[^`\n]*`/g;

/** Strip fragment, query, and trailing slash from an internal path. */
export function normalizeInternalPath(raw: string): string {
  const withoutQuery = raw.split('#')[0].split('?')[0];
  if (withoutQuery.length > 1 && withoutQuery.endsWith('/')) {
    return withoutQuery.slice(0, -1);
  }
  return withoutQuery;
}

/**
 * Internal link targets in an MDX body: normalized, deduped, in
 * first-seen order per link syntax (markdown first, then JSX attributes).
 * External URLs never match (both patterns anchor on a leading slash);
 * links to non-article routes such as `/` or `/playground` are returned
 * too and filtered by the caller, which knows what counts as an article.
 */
export function internalLinkTargets(body: string): string[] {
  const blank = (match: string) => match.replace(/[^\n]/g, ' ');
  const masked = body.replace(FENCED_CODE, blank).replace(INLINE_CODE, blank);
  const targets: string[] = [];
  const seen = new Set<string>();
  for (const re of [MD_LINK, JSX_LINK]) {
    re.lastIndex = 0;
    for (const match of masked.matchAll(re)) {
      const path = normalizeInternalPath(match[1]);
      if (!seen.has(path)) {
        seen.add(path);
        targets.push(path);
      }
    }
  }
  return targets;
}

/** One published article as a node of the link graph. */
export interface LinkGraphArticle {
  /** Registry key: `domain/slug`. */
  key: string;
  /** MDX body with the frontmatter block stripped. */
  body: string;
  /** Curated seeAlso registry keys from frontmatter, if declared. */
  seeAlso?: readonly string[];
}

/** Registry key for an article route (`/domain/slug`), or null otherwise. */
function routeToKey(path: string): string | null {
  const segments = path.split('/').filter(Boolean);
  if (segments.length !== 2) return null;
  return `${segments[0]}/${segments[1]}`;
}

/**
 * Invert the article link graph. For every article, the articles that
 * link to it via an in-prose internal link or a seeAlso edge. Self-edges
 * never produce backlinks, and edges to routes outside the given article
 * set (static routes, drafts, anchors) are dropped. Each source list is
 * sorted by `orderBy` (registry position), so the output is identical
 * across builds. Articles with no inbound links have no entry in the map:
 * the template renders no "Linked from" section for them.
 */
export function buildBacklinkGraph(
  articles: readonly LinkGraphArticle[],
  orderBy: (key: string) => number,
): Map<string, string[]> {
  const known = new Set(articles.map((a) => a.key));
  const inbound = new Map<string, Set<string>>();

  const addEdge = (from: string, to: string) => {
    if (from === to || !known.has(to)) return;
    const sources = inbound.get(to) ?? new Set<string>();
    sources.add(from);
    inbound.set(to, sources);
  };

  for (const article of articles) {
    for (const path of internalLinkTargets(article.body)) {
      const target = routeToKey(path);
      if (target) addEdge(article.key, target);
    }
    for (const target of article.seeAlso ?? []) {
      addEdge(article.key, target);
    }
  }

  const graph = new Map<string, string[]>();
  const targets = [...inbound.keys()].sort((a, b) => orderBy(a) - orderBy(b));
  for (const target of targets) {
    const sources = inbound.get(target);
    if (sources) graph.set(target, [...sources].sort((a, b) => orderBy(a) - orderBy(b)));
  }
  return graph;
}

/** A renderable link to one article: registry data, nothing invented. */
export interface ArticleLinkEntry {
  /** Registry key: `domain/slug`. */
  key: string;
  href: string;
  title: string;
  summary: string;
}

/**
 * Resolve registry keys to renderable entries, preserving order and
 * dropping unknown keys (the prebuild gate already fails the build on
 * them, so they can never reach a rendered page).
 */
export function resolveArticleEntries(
  keys: readonly string[],
  registry: readonly ModuleRegistryEntry[],
): ArticleLinkEntry[] {
  const byKey = new Map(registry.map((m) => [`${m.domain}/${m.slug}`, m]));
  const entries: ArticleLinkEntry[] = [];
  const seen = new Set<string>();
  for (const key of keys) {
    if (seen.has(key)) continue;
    seen.add(key);
    const target = byKey.get(key);
    if (!target) continue;
    entries.push({
      key,
      href: `/${key}`,
      title: target.title,
      summary: target.summary,
    });
  }
  return entries;
}

/**
 * The backlink graph over the shipped wiki, read from the content tree.
 * Memoized per process: every article page rendered in a build needs the
 * same graph, and reading ~30 content files once keeps the prerender
 * cheap. Reading sources at prerender time is safe because check 3 of the
 * prebuild validator guarantees a content file for every published module.
 */
let cachedGraph: Map<string, string[]> | null = null;

export function publishedBacklinkGraph(): Map<string, string[]> {
  if (cachedGraph) return cachedGraph;
  const published = publishedModules();
  const orderOf = new Map(published.map((m, index) => [`${m.domain}/${m.slug}`, index]));
  const articles: LinkGraphArticle[] = published.map((m) => {
    const source = readFileSync(
      join(process.cwd(), 'content', m.domain, `${m.slug}.mdx`),
      'utf8',
    );
    const parsed = matter(source);
    const rawSeeAlso = parsed.data.seeAlso;
    const seeAlso = Array.isArray(rawSeeAlso)
      ? rawSeeAlso.filter((v): v is string => typeof v === 'string')
      : undefined;
    return { key: `${m.domain}/${m.slug}`, body: parsed.content, seeAlso };
  });
  cachedGraph = buildBacklinkGraph(articles, (key) => orderOf.get(key) ?? Number.MAX_SAFE_INTEGER);
  return cachedGraph;
}
