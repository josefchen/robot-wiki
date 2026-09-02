import { z } from 'zod';
import rawMetadata from '../assets/fonts/ibm-plex-mono/metadata.json' with {
  type: 'json',
};

export const plexMonoFontMetadataSchema = z.object({
  schemaVersion: z.literal(1),
  family: z.literal('IBM Plex Mono'),
  license: z.object({
    id: z.literal('OFL-1.1'),
    path: z.string().min(1),
  }),
  upstream: z.object({
    repositoryUrl: z.string().url(),
    revision: z.string().regex(/^[a-f0-9]{40}$/),
    googleFontsMetadataUrl: z.string().url(),
    googleFontsStylesheetUrl: z.string().url(),
    retrieved: z.string().date(),
  }),
  og: z.object({
    path: z.string().min(1),
    sourceUrl: z.string().url(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    format: z.literal('TTF'),
    subset: z.string().min(1),
    style: z.literal('normal'),
    weight: z.literal(400),
    width: z.literal(100),
    widthClass: z.literal(5),
    mappedRoleId: z.literal('data'),
  }),
});

export type PlexMonoFontMetadata = z.infer<typeof plexMonoFontMetadataSchema>;

export const PLEX_MONO_FONT_METADATA =
  plexMonoFontMetadataSchema.parse(rawMetadata);
