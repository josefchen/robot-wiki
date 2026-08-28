import registry from './type-roles.json' with { type: 'json' };
import { z } from 'zod';
import { DOMAIN_META, publishedModules } from './modules.ts';

const firstPartyTypeRoleSchema = z.object({
  id: z.enum(['display', 'interface', 'reading', 'data']),
  family: z.enum([
    'Tektur Variable',
    'IBM Plex Sans',
    'Newsreader',
    'IBM Plex Mono',
  ]),
});

const tekturRoleInstanceSchema = z.object({
  id: z.enum([
    'home-wordmark',
    'shell-wordmark',
    'page-h1',
    'article-h1',
    'section-display',
    'display-numerals',
  ]),
  wght: z.number().int(),
  wdth: z.number().int(),
  cssClass: z.string().min(1),
});

const tekturAssignedStringSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  targets: z.array(z.enum(['web', 'og'])).min(1),
});

export const typeRoleRegistrySchema = z.object({
  schemaVersion: z.literal(1),
  firstPartyRoles: z.array(firstPartyTypeRoleSchema).length(4),
  tekturRoleInstances: z.array(tekturRoleInstanceSchema).length(6),
  tekturOgRoleId: z.literal('home-wordmark'),
  fixedAssignedStrings: z.array(tekturAssignedStringSchema).min(1),
});

export type FirstPartyTypeRole = z.infer<typeof firstPartyTypeRoleSchema>;
export type TekturRoleInstance = z.infer<typeof tekturRoleInstanceSchema>;
export type TekturAssignedString = z.infer<
  typeof tekturAssignedStringSchema
>;

export const TYPE_ROLE_REGISTRY = typeRoleRegistrySchema.parse(registry);
export const FIRST_PARTY_TYPE_ROLES = TYPE_ROLE_REGISTRY.firstPartyRoles;
export const TEKTUR_ROLE_INSTANCES =
  TYPE_ROLE_REGISTRY.tekturRoleInstances;

const derivedAssignedStrings: TekturAssignedString[] = [
  ...Object.entries(DOMAIN_META).map(([domain, meta]) => ({
    id: `domain:${domain}`,
    text: meta.name,
    targets: ['web', 'og'] as Array<'web' | 'og'>,
  })),
  ...publishedModules().map(({ domain, slug, title }) => ({
    id: `article:${domain}/${slug}`,
    text: title,
    targets: ['web', 'og'] as Array<'web' | 'og'>,
  })),
];

export const TEKTUR_ASSIGNED_STRINGS: TekturAssignedString[] = [
  ...TYPE_ROLE_REGISTRY.fixedAssignedStrings,
  ...derivedAssignedStrings,
];

export const TEKTUR_OG_ROLE_ID = TYPE_ROLE_REGISTRY.tekturOgRoleId;
