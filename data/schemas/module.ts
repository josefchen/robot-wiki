import { z } from 'zod';
// Extension-ful relative import: this file is executed by plain node
// (scripts/validate-content.ts), which does no extension resolution.
import { ADJACENT_DOMAIN, CORE_DOMAINS, DOMAINS } from '../domains.ts';
import { isoDateSchema, slugSchema } from './shared.ts';

export { ADJACENT_DOMAIN, CORE_DOMAINS, DOMAINS };
export type { CoreDomain, Domain } from '../domains.ts';

export const domainSchema = z.enum(DOMAINS);
export const coreDomainSchema = z.enum(CORE_DOMAINS);
export const moduleStatusSchema = z.enum(['draft', 'published']);

/**
 * Frontmatter contract for content/<domain>/<slug>.mdx files. Parsed with
 * gray-matter and validated by scripts/validate-content.ts during prebuild.
 */
export const moduleFrontmatterSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  domain: domainSchema,
  slug: slugSchema,
  order: z.number().int().positive(),
  status: moduleStatusSchema,
  lastReviewed: isoDateSchema,
  /** Citation registry IDs used by this module. */
  citations: z.array(z.string().min(1)),
  /**
   * Curated "See also" targets: registry keys (`domain/slug`) of related
   * published modules. Constrained to 2-4 entries when present; still
   * optional at the schema level until every published article is
   * backfilled (the wiki-backfill-articles feature). The prebuild
   * validator additionally requires every entry to resolve to a published
   * module, never this module itself, with no duplicates.
   */
  seeAlso: z.array(z.string().min(1)).min(2).max(4).optional(),
});

/**
 * Taxonomy entry in data/modules.ts. The registry is the source of truth for
 * what exists, where it lives, and whether it ships; frontmatter must match.
 */
export const moduleRegistryEntrySchema = z.object({
  domain: domainSchema,
  slug: slugSchema,
  title: z.string().min(1),
  /** One-line summary shown in the sidebar and on domain cards. */
  summary: z.string().min(1),
  order: z.number().int().positive(),
  status: moduleStatusSchema,
});

export type ModuleFrontmatter = z.infer<typeof moduleFrontmatterSchema>;
export type ModuleRegistryEntry = z.infer<typeof moduleRegistryEntrySchema>;
export type ModuleStatus = z.infer<typeof moduleStatusSchema>;
