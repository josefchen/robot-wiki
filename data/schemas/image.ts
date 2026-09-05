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
 * terms permit editorial reuse, documented permission grants, and
 * official company marks whose reuse grant is unnamed. NC and ND
 * variants are deliberately absent from the reusable set: they are
 * incompatible with the site's CC BY 4.0 content licence. Market-map
 * logos may still be registered as `unlicensed` or `unknown` so every
 * company can plot a real mark; do not invent a Commons licence to
 * avoid those values.
 */
export const IMAGE_LICENCES = [
  'cc0',
  'cc-by-4.0',
  'cc-by-sa-4.0',
  'public-domain',
  'press-kit',
  'permission',
  'unlicensed',
  'unknown',
] as const;

export const imageLicenceSchema = z.enum(IMAGE_LICENCES);

/**
 * The closed legal-basis enum of `contract/design-integrity.md` §1.13.
 *
 * It is deliberately not the same list as `IMAGE_LICENCES`. A licence names
 * the instrument ("CC BY-SA 4.0", with a deed to link); a legal basis names
 * the ground on which this site reuses the asset at all, and the contract
 * fixes those eight strings. Recording both, and requiring them to agree,
 * is what stops a mark with no reuse grant from being filed under a
 * reusable-content basis: `unlicensed` and `unknown` map only to
 * `official-identification-use`, which is the mark path in `VAL-B2-MAP-010`
 * and never a licence for editorial reuse.
 */
export const LEGAL_BASES = [
  'owned',
  'cc-by',
  'cc-by-sa',
  'cc0',
  'public-domain',
  'press-kit-editorial-reuse',
  'documented-permission',
  'official-identification-use',
] as const;

export const legalBasisSchema = z.enum(LEGAL_BASES);
export type LegalBasis = (typeof LEGAL_BASES)[number];

/**
 * The legal basis each licence value is allowed to claim.
 *
 * A one-to-one map rather than a free field: the licence is already read off
 * the asset's own page under the anti-fabrication rule in
 * `library/imagery.md`, so the basis is a restatement of that reading in the
 * contract's vocabulary and must not be able to disagree with it.
 */
export const LEGAL_BASIS_BY_LICENCE: Readonly<
  Record<(typeof IMAGE_LICENCES)[number], LegalBasis>
> = {
  cc0: 'cc0',
  'cc-by-4.0': 'cc-by',
  'cc-by-sa-4.0': 'cc-by-sa',
  'public-domain': 'public-domain',
  'press-kit': 'press-kit-editorial-reuse',
  permission: 'documented-permission',
  unlicensed: 'official-identification-use',
  unknown: 'official-identification-use',
};

/**
 * What a registered image *is*, declared rather than inferred.
 *
 * The rendered credit used to pick its noun from the file extension, so an
 * `.svg` company mark was credited as `Diagram: Fox Robotics` on `/credits`
 * while a `.png` mark beside it was credited as `Photo:`. Neither is true,
 * and no extension can decide it: a schematic, a photograph and a company
 * mark are three different things that all ship as vectors or rasters.
 */
export const FIGURE_KINDS = [
  'photograph',
  'original-schematic',
  'official-mark',
] as const;

export const figureKindSchema = z.enum(FIGURE_KINDS);
export type FigureKind = (typeof FIGURE_KINDS)[number];

/**
 * What may happen to the shipped bytes after registration.
 *
 * `external-bytes-preserved` is the promise `VAL-B2-IMG-009` measures: the
 * file on disk is the file that was retrieved, so a recolour, crop, filter
 * or redraw would show up as a byte-hash mismatch.
 * `first-party-restyled-semantics-preserved` is the weaker promise the two
 * original diagrams need, because brand-v2 restyles them: their bytes may
 * change, and `VAL-B2-VIZ-014` holds the normalized semantic geometry and
 * label text against the immutable baseline so only the allowlisted style
 * attributes can move.
 */
export const PRESERVATION_POLICIES = [
  'external-bytes-preserved',
  'first-party-restyled-semantics-preserved',
] as const;

export const preservationPolicySchema = z.enum(PRESERVATION_POLICIES);
export type PreservationPolicy = (typeof PRESERVATION_POLICIES)[number];

/** Market-map company marks; their provenance row is owned by VAL-B2-MAP-010. */
export function isCompanyMarkFile(file: string): boolean {
  return file.startsWith('/images/logos/');
}

/** The display label a credit line and /credits show for a licence. */
export const LICENCE_LABELS: Readonly<
  Record<(typeof IMAGE_LICENCES)[number], string>
> = {
  cc0: 'CC0 1.0',
  'cc-by-4.0': 'CC BY 4.0',
  'cc-by-sa-4.0': 'CC BY-SA 4.0',
  'public-domain': 'Public domain',
  'press-kit': 'Press kit',
  permission: 'Used with permission',
  unlicensed: 'Unlicensed',
  unknown: 'Unknown',
};

/** The noun a credit opens with, chosen by what the figure is. */
export const CREDIT_NOUNS: Readonly<Record<FigureKind, string>> = {
  photograph: 'Photo',
  'original-schematic': 'Diagram',
  'official-mark': 'Logo',
};

/**
 * The attribution sentence for an entry, in the exact wording the visible
 * credit renders. Derived rather than typed twice so the record cannot drift
 * from the page, and cross-checked against the declared `attributionText`
 * below so a hand-edit of either one fails the build.
 */
export function attributionSentence(image: {
  file: string;
  figureKind?: FigureKind;
  creator: string;
  sourceName: string;
  licence: (typeof IMAGE_LICENCES)[number];
}): string {
  const kind: FigureKind =
    image.figureKind ??
    (isCompanyMarkFile(image.file) ? 'official-mark' : 'photograph');
  return `${CREDIT_NOUNS[kind]}: ${image.creator} / ${image.sourceName}. Licence: ${LICENCE_LABELS[image.licence]}.`;
}

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
    /**
     * The §1.13 record. Required on every editorial image; the market-map
     * marks carry it derived rather than declared, because their provenance
     * row is `VAL-B2-MAP-010` and this feature must not restate a hundred
     * approvals it did not make.
     */
    figureKind: figureKindSchema.optional(),
    legalBasis: legalBasisSchema.optional(),
    /**
     * The exact attribution sentence the visible credit renders, so the
     * record and the page can be compared instead of trusted separately.
     */
    attributionText: z.string().min(1).optional(),
    preservationPolicy: preservationPolicySchema.optional(),
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
    if (
      (image.licence === 'unlicensed' || image.licence === 'unknown') &&
      !image.sourceUrl
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `licence "${image.licence}" requires sourceUrl recording where the mark was fetched`,
      });
    }

    const isMark = isCompanyMarkFile(image.file);
    if (!isMark) {
      for (const field of [
        'figureKind',
        'legalBasis',
        'attributionText',
        'preservationPolicy',
      ] as const) {
        if (image[field] === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `editorial image "${image.id}" must record ${field} (contract/design-integrity.md §1.13)`,
          });
        }
      }
      if (image.figureKind === 'official-mark') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `"${image.id}" is not under /images/logos/, so it cannot be an official-mark`,
        });
      }
    } else if (image.figureKind !== undefined && image.figureKind !== 'official-mark') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `"${image.id}" is a market-map mark and may only declare figureKind "official-mark"`,
      });
    }

    // `VAL-B2-IMG-008`: reusable editorial content needs an approved
    // reusable-content basis, and `unlicensed` is never one. The
    // identification path exists for company marks and stops there, so an
    // editorial photograph cannot borrow it by leaving its licence unknown.
    if (
      !isMark &&
      (image.licence === 'unlicensed' || image.licence === 'unknown')
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `editorial image "${image.id}" cannot rest on licence "${image.licence}"; official-identification-use is the mark path in VAL-B2-MAP-010`,
      });
    }

    // A first-party diagram is used on the ground that this site drew it,
    // not on the ground of the licence it is published under, so `owned` is
    // the second admissible basis there and nowhere else.
    const grounded: LegalBasis[] = [LEGAL_BASIS_BY_LICENCE[image.licence]];
    if (image.figureKind === 'original-schematic') grounded.push('owned');
    if (image.legalBasis !== undefined && !grounded.includes(image.legalBasis)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `"${image.id}" claims legal basis "${image.legalBasis}" where licence "${image.licence}" grounds ${grounded.map((b) => `"${b}"`).join(' or ')}`,
      });
    }

    // A first-party diagram is the only thing that may be restyled in place,
    // because it is the only thing whose semantics this repository owns and
    // can pin against a baseline. Letting a photograph claim the same policy
    // would license a recolour of somebody else's photograph.
    if (
      image.preservationPolicy === 'first-party-restyled-semantics-preserved' &&
      image.figureKind !== 'original-schematic'
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `"${image.id}" is not an original schematic, so its shipped bytes must be external-bytes-preserved`,
      });
    }

    const derived = attributionSentence(image);
    if (image.attributionText !== undefined && image.attributionText !== derived) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `"${image.id}" records attribution "${image.attributionText}" where its own creator, source, kind and licence read "${derived}"`,
      });
    }
  });

export type SiteImage = z.infer<typeof imageSchema>;
