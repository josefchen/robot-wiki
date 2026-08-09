/**
 * Core content-pipeline validation, shared by scripts/validate-content.ts
 * (prebuild gate) and the Vitest suite.
 *
 * Checks, per the validation contract (VAL-NAV-026, VAL-NAV-027, VAL-BUILD-001):
 *   1. Registry hygiene: schema-valid entries, unique domain/slug pairs,
 *      unique order within a domain, every core domain populated, at least
 *      one published module.
 *   2. Citation registry hygiene: schema-valid entries, unique ids.
 *   3. Every published registry entry has a content file at
 *      content/<domain>/<slug>.mdx.
 *   4. Every content file has schema-valid frontmatter that matches its path
 *      and its registry entry (title, order, status).
 *   5. Every frontmatter citation id resolves to the citation registry, and
 *      every published module declares at least one citation.
 *   6. Internal links in shipped content resolve to a known route (published
 *      module, declared static route, or a file in public/).
 *   7. Currency hygiene: no unescaped dollar sign before a digit in MDX
 *      prose. remark-math parses "$1.4B ... $14B" as an inline KaTeX span,
 *      garbling the sentence and overflowing the mobile column; prices are
 *      written \$1.4B instead (library/content-quality.md gotcha).
 *
 * Runtime imports carry explicit .ts extensions because this file is executed
 * by plain node (type stripping, no extension resolution) as well as Vitest.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { CORE_DOMAINS } from '../data/domains.ts';
import {
  moduleFrontmatterSchema,
  moduleRegistryEntrySchema,
  type ModuleRegistryEntry,
} from '../data/schemas/module.ts';
import { citationSchema, type Citation } from '../data/schemas/citation.ts';

export interface ValidationIssue {
  /** Content file the issue belongs to, or null for registry-level issues. */
  file: string | null;
  message: string;
}

export interface ValidateContentOptions {
  contentRoot: string;
  /** When given, internal links that match a file under public/ are valid. */
  publicDir?: string;
  modules: readonly ModuleRegistryEntry[];
  citations: readonly Citation[];
  /** Non-module routes that internal links may target. */
  staticRoutes?: readonly string[];
}

const DEFAULT_STATIC_ROUTES = ['/', '/search', '/market-map', '/playground'];

const MD_LINK = /\[[^\]]*\]\(\s*(\/[^)\s"']+)[^)]*\)/g;
const JSX_LINK = /\b(?:href|to)\s*=\s*["'](\/[^"']+)["']/g;

// Currency hygiene (check 7). remark-math sees MDX prose, JSX children text,
// and math spans, but never fenced code, inline code spans, or JSX attribute
// strings, so those three are masked before scanning. An unescaped dollar
// sign immediately followed by a digit is the currency pattern ($269, $1.4B,
// $20,000); genuine math delimiters start with letters or symbols
// ($O(\varepsilon T^2)$, $$...$$) and do not match.
const FENCED_CODE = /```[\s\S]*?```/g;
const INLINE_CODE = /`[^`\n]*`/g;
const JSX_ATTR_STRING = /\b[A-Za-z_][\w-]*\s*=\s*(["'])[\s\S]*?\1/g;
const UNESCAPED_CURRENCY = /(?<!\\)\$(?=\d)/g;

/** 1-based line numbers of unescaped currency dollar signs in an MDX body. */
export function unescapedCurrencyLines(body: string): number[] {
  // Blank (not remove) masked regions so match indices keep their line numbers.
  const blank = (match: string) => match.replace(/[^\n]/g, ' ');
  const masked = body
    .replace(FENCED_CODE, blank)
    .replace(INLINE_CODE, blank)
    .replace(JSX_ATTR_STRING, blank);
  const lines: number[] = [];
  for (const match of masked.matchAll(UNESCAPED_CURRENCY)) {
    lines.push(masked.slice(0, match.index).split('\n').length);
  }
  return lines;
}

function listMdxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listMdxFiles(full));
    else if (entry.isFile() && /\.mdx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

function normalizeInternalPath(raw: string): string {
  const withoutQuery = raw.split('#')[0].split('?')[0];
  if (withoutQuery.length > 1 && withoutQuery.endsWith('/')) {
    return withoutQuery.slice(0, -1);
  }
  return withoutQuery;
}

function internalLinks(body: string): string[] {
  const links: string[] = [];
  for (const re of [MD_LINK, JSX_LINK]) {
    re.lastIndex = 0;
    for (const match of body.matchAll(re)) links.push(match[1]);
  }
  return links;
}

export function validateContent(opts: ValidateContentOptions): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const staticRoutes = opts.staticRoutes ?? DEFAULT_STATIC_ROUTES;
  const push = (file: string | null, message: string) =>
    issues.push({ file, message });

  // 1. Registry hygiene.
  const seenKeys = new Set<string>();
  const ordersByDomain = new Map<string, Set<number>>();
  let publishedCount = 0;
  for (const entry of opts.modules) {
    const parsed = moduleRegistryEntrySchema.safeParse(entry);
    if (!parsed.success) {
      push(null, `registry entry ${entry.domain}/${entry.slug}: ${parsed.error.message}`);
      continue;
    }
    const key = `${entry.domain}/${entry.slug}`;
    if (seenKeys.has(key)) push(null, `duplicate registry entry ${key}`);
    seenKeys.add(key);
    const orders = ordersByDomain.get(entry.domain) ?? new Set<number>();
    if (orders.has(entry.order)) {
      push(null, `duplicate order ${entry.order} in domain ${entry.domain}`);
    }
    orders.add(entry.order);
    ordersByDomain.set(entry.domain, orders);
    if (entry.status === 'published') publishedCount += 1;
  }
  for (const domain of CORE_DOMAINS) {
    if (!opts.modules.some((m) => m.domain === domain)) {
      push(null, `core domain ${domain} has no modules in the registry`);
    }
  }
  if (publishedCount === 0) {
    push(null, 'registry has no published module (the sample page)');
  }

  // 2. Citation registry hygiene.
  const citationIds = new Set<string>();
  for (const citation of opts.citations) {
    const parsed = citationSchema.safeParse(citation);
    if (!parsed.success) {
      push(null, `citation ${citation.id}: ${parsed.error.message}`);
      continue;
    }
    if (citationIds.has(citation.id)) {
      push(null, `duplicate citation id ${citation.id}`);
    }
    citationIds.add(citation.id);
  }

  // Routes that internal links may target.
  const moduleByKey = new Map(opts.modules.map((m) => [`${m.domain}/${m.slug}`, m]));
  const validRoutes = new Set<string>([
    ...staticRoutes.map(normalizeInternalPath),
    ...opts.modules
      .filter((m) => m.status === 'published')
      .map((m) => `/${m.domain}/${m.slug}`),
  ]);

  const isValidInternalTarget = (raw: string): boolean => {
    const path = normalizeInternalPath(raw);
    if (validRoutes.has(path)) return true;
    if (opts.publicDir && existsSync(join(opts.publicDir, path))) return true;
    return false;
  };

  // 3+4+5+6. Content files.
  const files = existsSync(opts.contentRoot) ? listMdxFiles(opts.contentRoot) : [];
  const seenContentKeys = new Set<string>();

  for (const file of files) {
    const rel = file.slice(opts.contentRoot.length + 1);
    const parts = rel.split('/');
    const domainFromPath = parts.length > 1 ? parts[0] : '';
    const slugFromPath = (parts.at(-1) ?? '').replace(/\.mdx?$/, '');

    let body: string;
    let frontmatter: unknown;
    try {
      const parsed = matter(readFileSync(file, 'utf8'));
      frontmatter = parsed.data;
      body = parsed.content;
    } catch (error) {
      push(rel, `unparseable frontmatter: ${(error as Error).message}`);
      continue;
    }

    const fm = moduleFrontmatterSchema.safeParse(frontmatter);
    if (!fm.success) {
      push(rel, `invalid frontmatter: ${fm.error.message}`);
      continue;
    }

    if (fm.data.domain !== domainFromPath || fm.data.slug !== slugFromPath) {
      push(
        rel,
        `frontmatter domain/slug (${fm.data.domain}/${fm.data.slug}) do not match the file path`,
      );
    }

    const key = `${fm.data.domain}/${fm.data.slug}`;
    seenContentKeys.add(key);
    const entry = moduleByKey.get(key);
    if (!entry) {
      push(rel, `no registry entry for ${key} (orphan content file)`);
    } else {
      if (entry.title !== fm.data.title) {
        push(rel, `title mismatch: registry "${entry.title}" vs frontmatter "${fm.data.title}"`);
      }
      if (entry.order !== fm.data.order) {
        push(rel, `order mismatch: registry ${entry.order} vs frontmatter ${fm.data.order}`);
      }
      if (entry.status !== fm.data.status) {
        push(
          rel,
          `status mismatch: registry "${entry.status}" vs frontmatter "${fm.data.status}"`,
        );
      }
    }

    for (const id of fm.data.citations) {
      if (!citationIds.has(id)) {
        push(rel, `citation id "${id}" is not in the citation registry`);
      }
    }
    if (fm.data.status === 'published' && fm.data.citations.length === 0) {
      push(rel, 'published module declares no citations');
    }

    for (const link of internalLinks(body)) {
      if (!isValidInternalTarget(link)) {
        push(rel, `broken internal link: ${link}`);
      }
    }

    for (const line of unescapedCurrencyLines(body)) {
      push(
        rel,
        `unescaped currency dollar sign at line ${line}: write prices as \\$ (remark-math parses unescaped $ amounts as inline KaTeX; see library/content-quality.md)`,
      );
    }
  }

  // 3. Every published registry entry ships a content file.
  for (const entry of opts.modules) {
    if (entry.status === 'published' && !seenContentKeys.has(`${entry.domain}/${entry.slug}`)) {
      push(null, `published module ${entry.domain}/${entry.slug} has no content file`);
    }
  }

  return issues;
}
