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
 *   8. Inline citation declaration: every <Cite id="..."> in the MDX body
 *      must be declared in that module's frontmatter citations list. An
 *      undeclared inline cite would render as a chip with no entry in the
 *      References bibliography (VAL-WIKI-005).
 *   9. seeAlso curation: every seeAlso frontmatter entry must be a
 *      registry key of a published module, never the article itself, with
 *      no duplicates (VAL-WIKI-009, VAL-WIKI-010). The 2-4 entry bounds
 *      are enforced by the frontmatter schema when the field is present.
 *  10. Glossary (when `terms` is given): every entry is schema-valid with
 *      a unique id, and every citation id it references resolves to the
 *      citation registry. Every <Term id="..."> in an MDX body must resolve
 *      to a glossary entry; an unknown term id fails the build, naming the
 *      article and the id (VAL-GLOSS-008, VAL-GLOSS-010).
 *  11. Imagery (when `images` is given): every entry is schema-valid with
 *      a unique id, so a missing or unrecognised licence fails the build
 *      naming the image id and the problem (VAL-IMG-007, VAL-IMG-008), and
 *      every entry's file exists under public/. Every <Image id="..."> in
 *      an MDX body (and in any extra scanned source, such as the home
 *      page's tsx) must resolve to a registry entry; an unregistered id
 *      fails the build naming the file and the id, and a registered image
 *      no page references fails the build, so the registry, the rendered
 *      set, and /credits cannot drift apart (VAL-IMG-006). Provenance
 *      fields are scanned for synthesis markers (VAL-IMG-013).
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
import {
  glossaryTermSchema,
  type GlossaryTerm,
} from '../data/schemas/glossary.ts';
import { imageSchema, type SiteImage } from '../data/schemas/image.ts';
import { internalLinkTargets, normalizeInternalPath } from './backlinks.ts';
import { hasSynthesisMarker, referencedImageIds } from './images.ts';
import { inlineCitationIds } from './references.ts';
import { inlineTermIds } from './glossary.ts';

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
  /** Glossary registry. When given, glossary hygiene and <Term> checks run. */
  terms?: readonly GlossaryTerm[];
  /** Image registry. When given, imagery hygiene and <Image> checks run. */
  images?: readonly SiteImage[];
  /**
   * Extra sources scanned for <Image>/<ImageRef> usages alongside the MDX
   * tree (for example the home page's tsx). `label` names the file in
   * failure messages.
   */
  imageSources?: ReadonlyArray<{ label: string; body: string }>;
  /** Non-module routes that internal links may target. */
  staticRoutes?: readonly string[];
}

const DEFAULT_STATIC_ROUTES = ['/', '/search', '/market-map', '/playground', '/glossary', '/credits'];

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

  // 10a. Glossary hygiene (VAL-GLOSS-002): schema-valid entries with unique
  // ids, and every citation id a definition leans on must resolve to the
  // citation registry. The schema itself rejects uncited definitions.
  const termIds = new Set<string>();
  for (const term of opts.terms ?? []) {
    const parsed = glossaryTermSchema.safeParse(term);
    if (!parsed.success) {
      push(null, `glossary term ${term.id}: ${parsed.error.message}`);
      continue;
    }
    if (termIds.has(term.id)) {
      push(null, `duplicate glossary term id ${term.id}`);
    }
    termIds.add(term.id);
    for (const citationId of term.citations) {
      if (!citationIds.has(citationId)) {
        push(
          null,
          `glossary term ${term.id} cites "${citationId}", which is not in the citation registry`,
        );
      }
    }
  }

  // 11a. Imagery hygiene (VAL-IMG-007, VAL-IMG-008): schema-valid entries
  // with unique ids. The schema's licence enum is the hard gate: a missing
  // or unrecognised licence fails safeParse here, and the message names
  // the image id and the rejected value. Each entry's file must exist
  // under public/, and no provenance field may carry a synthesis marker
  // (VAL-IMG-013).
  const imageIds = new Set<string>();
  const usedImageIds = new Set<string>();
  for (const image of opts.images ?? []) {
    const parsed = imageSchema.safeParse(image);
    if (!parsed.success) {
      push(
        null,
        `image ${image.id}: ${parsed.error.message}`,
      );
      continue;
    }
    if (imageIds.has(image.id)) {
      push(null, `duplicate image id ${image.id}`);
    }
    imageIds.add(image.id);
    if (opts.publicDir && !existsSync(join(opts.publicDir, image.file))) {
      push(
        null,
        `image ${image.id}: file ${image.file} does not exist under public/`,
      );
    }
    if (hasSynthesisMarker(image)) {
      push(
        null,
        `image ${image.id}: provenance carries a synthesis marker; AI-generated imagery is not permitted`,
      );
    }
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

    // 8. Inline citation declaration (VAL-WIKI-005): every <Cite id> used in
    // the prose must be declared in frontmatter, or the chip would render
    // with no matching References entry.
    const declared = new Set(fm.data.citations);
    for (const id of inlineCitationIds(body)) {
      if (!declared.has(id)) {
        push(
          rel,
          `inline <Cite id="${id}"> is not declared in this module's frontmatter citations list, so it would render with no References entry`,
        );
      }
    }

    // 10b. Unknown term ids (VAL-GLOSS-008, VAL-GLOSS-010): every <Term id>
    // used in the prose must resolve to a glossary entry, so an inline
    // definition always matches its glossary entry and a reader who follows
    // a term to /glossary always finds it.
    if (opts.terms) {
      for (const id of inlineTermIds(body)) {
        if (!termIds.has(id)) {
          push(rel, `unknown <Term id="${id}">: no glossary entry with that id`);
        }
      }
    }

    // 11b. Unregistered image ids (VAL-IMG-006): every <Image id> used in
    // the prose must resolve to the image registry, so a rendered image
    // always has a licence record, a credit, and a /credits entry.
    if (opts.images) {
      for (const id of referencedImageIds(body)) {
        if (!imageIds.has(id)) {
          push(rel, `image id "${id}" is not in the image registry`);
        } else {
          usedImageIds.add(id);
        }
      }
    }

    for (const link of internalLinkTargets(body)) {
      if (!isValidInternalTarget(link)) {
        push(rel, `broken internal link: ${link}`);
      }
    }

    // 9. seeAlso curation (VAL-WIKI-009, VAL-WIKI-010): every entry is the
    // registry key of a published module, never this article itself, with
    // no duplicates. The 2-4 entry bounds are the schema's job; the
    // renderer resolves these keys to titles and summaries, and the
    // backlink graph unions them with in-prose links.
    const seenSeeAlso = new Set<string>();
    for (const id of fm.data.seeAlso ?? []) {
      if (seenSeeAlso.has(id)) {
        push(rel, `duplicate seeAlso entry "${id}"`);
        continue;
      }
      seenSeeAlso.add(id);
      if (id === key) {
        push(rel, `seeAlso entry "${id}" references the article itself`);
        continue;
      }
      const target = moduleByKey.get(id);
      if (!target) {
        push(rel, `seeAlso entry "${id}" does not resolve to a module in the registry`);
      } else if (target.status !== 'published') {
        push(rel, `seeAlso entry "${id}" points at a draft module; targets must be published`);
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

  // 11c. Extra scanned sources (the home page's tsx, and any future tsx
  // surface that renders registry images) get the same unregistered-id
  // check as MDX bodies.
  if (opts.images) {
    for (const source of opts.imageSources ?? []) {
      for (const id of referencedImageIds(source.body)) {
        if (!imageIds.has(id)) {
          push(source.label, `image id "${id}" is not in the image registry`);
        } else {
          usedImageIds.add(id);
        }
      }
    }

    // 11d. Stale-registry guard (VAL-IMG-006): a registered image that no
    // page references would render on /credits but nowhere else, which is
    // exactly the drift the three-way agreement check forbids.
    for (const image of opts.images) {
      if (imageIds.has(image.id) && !usedImageIds.has(image.id)) {
        push(
          null,
          `image ${image.id} is registered but no page references it; /credits would list an image the site does not render`,
        );
      }
    }
  }

  return issues;
}
