import { z } from 'zod';
import rawMetadata from '../assets/fonts/tektur/metadata.json' with {
  type: 'json',
};

const axisSchema = z.object({
  label: z.string().min(1),
  min: z.number(),
  default: z.number(),
  max: z.number(),
});

export const tekturFontMetadataSchema = z.object({
  schemaVersion: z.literal(1),
  family: z.literal('Tektur'),
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
  axisLabels: z.object({
    wdth: z.literal('width axis'),
    wght: z.literal('weight axis'),
  }),
  web: z.object({
    path: z.string().min(1),
    sourceUrl: z.string().url(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    format: z.literal('WOFF2'),
    subset: z.literal('latin'),
    style: z.literal('normal'),
    axes: z
      .object({
        wdth: axisSchema,
        wght: axisSchema,
      })
      .strict(),
  }),
  og: z.object({
    path: z.string().min(1),
    sourceUrl: z.string().url(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    format: z.literal('TTF'),
    subset: z.string().min(1),
    style: z.literal('normal'),
    weight: z.literal(600),
    width: z.literal(100),
    widthClass: z.literal(5),
    mappedRoleId: z.string().min(1),
  }),
});

export type TekturFontMetadata = z.infer<typeof tekturFontMetadataSchema>;

export const TEKTUR_FONT_METADATA =
  tekturFontMetadataSchema.parse(rawMetadata);
