import { z } from 'zod';
import { httpsUrlSchema, isoDateSchema, slugSchema } from './shared.ts';

/**
 * Image registry entry (library/imagery.md). Every content image on the
 * site is registered here; the prebuild validator fails the build on an
 * entry whose licence is missing or outside the permitted set, exactly the
 * way an unknown <Term> id fails.
 */

/**
 * The permitted licences (contract/imagery.md): the CC-BY family members
 * the site can honour, CC0, public domain, named press kits whose stated
 * terms permit editorial reuse, and documented permission grants. NC and
 * ND variants are deliberately absent: they are incompatible with the
 * site's CC BY 4.0 content licence.
 */
export const IMAGE_LICENCES = [
  'cc0',
  'cc-by-4.0',
  'cc-by-sa-4.0',
  'public-domain',
  'press-kit',
  'permission',
] as const;

export const imageLicenceSchema = z.enum(IMAGE_LICENCES);

/** Alt text that names no content. */
const GENERIC_ALT =
  /^(image|photo|picture|screenshot|diagram|figure|graphic|illustration|img)$/i;

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export const imageSchema = z
  .object({
    /** Stable slug referenced by <Image id="..."/> in MDX and the resolver. */
    id: slugSchema,
    /** Path under public/; the static export serves it as-is. */
    file: z
      .string()
      .min(1)
      .regex(
        /^\/images\/(?:logos\/)?[\w.-]+$/,
        'image files live under public/images/ or public/images/logos/',
      ),
    /**
     * Meaningful description: at least 15 characters, never
     * the filename, never a generic placeholder, and dash-free per the
     * zero-dash rule for UI text.
     */
    alt: z
      .string()
      .min(15, 'alt text must describe the image (15+ characters)')
      .refine((v) => !GENERIC_ALT.test(v.trim()), {
        message: 'alt text must not be a generic placeholder',
      })
      .refine((v) => !/[—–]/.test(v), {
        message: 'alt text carries no em or en dashes',
      }),
    /** What the reader is looking at and why it matters. */
    caption: z.string().min(1),
    /** The lab, company, publication, or archive the asset came from. */
    sourceName: z.string().min(1),
    /**
     * The page the asset came from, not a hotlink to the binary. Optional:
     * an original diagram this site created has no external original, so
     * the credit names the creator in text instead of linking out.
     * Never point this at a URL
     * readers cannot open.
     */
    sourceUrl: httpsUrlSchema.optional(),
    /** Photographer, author, or organisation credited by the licence. */
    creator: z.string().min(1),
    licence: imageLicenceSchema,
    /** The licence deed, or the page stating the permission. */
    licenceUrl: httpsUrlSchema,
    /** ISO date the asset was fetched. */
    retrieved: isoDateSchema,
    /** Intrinsic pixel dimensions, so layout reserves the space. */
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    /**
     * Where a press-kit or permission grant is stated (required for those
     * licences). A press kit that says nothing about reuse is
     * not a press kit for our purposes.
     */
    permissionNote: z.string().min(1).optional(),
  })
  .superRefine((image, ctx) => {
    const base = image.file.split('/').pop() ?? '';
    const stem = base.replace(/\.[a-z0-9]+$/i, '');
    // The alt must not match the filename, with or without
    // its extension.
    if ([base, stem].some((name) => normalize(image.alt) === normalize(name))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'alt text must not be the filename',
      });
    }
    if (
      (image.licence === 'press-kit' || image.licence === 'permission') &&
      !image.permissionNote
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `licence "${image.licence}" requires permissionNote recording where the grant is stated`,
      });
    }
  });

export type SiteImage = z.infer<typeof imageSchema>;
