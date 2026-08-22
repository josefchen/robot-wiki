import { z } from 'zod';
import { httpsUrlSchema, slugSchema } from './shared.ts';

/** Hardware families the buyer's guide covers. */
export const hardwareCategorySchema = z.enum([
  'arm',
  'humanoid',
  'hand',
  'sensor',
  'compute',
  'wheelbase',
  'lidar',
  'camera',
  'imu',
  'mobile-manipulator',
  'quadruped',
]);

/** Sourcing states a buyer actually encounters. */
export const hardwareAvailabilitySchema = z.enum([
  'buy',
  'preorder',
  'contact',
  'closed',
]);

/**
 * A product photo stored under public/images/hardware/. This field is
 * deliberately outside the licensed site image registry: the buyer's
 * guide records vendor, press, and Wikimedia shots, including official
 * photos whose reuse terms are unpublished. Licence is never a reason
 * to omit a photo. The sourceUrl is the page the binary was taken from.
 */
export const hardwareImageSchema = z.object({
  file: z
    .string()
    .min(1)
    .regex(
      /^\/images\/hardware\/[\w.-]+$/,
      'hardware photos live under public/images/hardware/',
    ),
  sourceUrl: httpsUrlSchema,
  alt: z
    .string()
    .min(15, 'alt text must describe the photo (15+ characters)')
    .max(220)
    .refine((v) => !/[—–]/.test(v), {
      message: 'alt text carries no em or en dashes',
    }),
});

/**
 * One row of the hardware buyer's guide. Hardware categories vary widely
 * (a 6-DoF arm, a 56-DoF humanoid, a fingertip sensor, an edge SoC), so the
 * numeric fields are the union that matters to a buyer: price, degrees of
 * freedom, and availability. Anything a source does not state stays null;
 * the table renders null as "not disclosed" and never invents a figure.
 */
export const hardwareEntrySchema = z
  .object({
    id: slugSchema,
    name: z.string().min(2).max(80),
    maker: z.string().min(2).max(80),
    category: hardwareCategorySchema,
    /** USD list or quoted price. Null when no public price exists. */
    priceUsd: z.number().int().positive().nullable(),
    /** Upper bound when the source gives a range; null otherwise. */
    priceMaxUsd: z.number().int().positive().nullable(),
    /**
     * Free-text price context (original currency, bundle contents, discounts).
     * Must not contradict priceUsd.
     */
    priceNote: z.string().max(220).nullable(),
    /**
     * When the price was observed, e.g. "Aug 2026" or "2023". Required
     * whenever priceUsd is set; every price in the guide carries an as-of
     * date because hardware pricing moves fast.
     */
    priceAsOf: z
      .string()
      .regex(/^(?:[A-Z][a-z]{2} \d{4}|\d{4})$/)
      .nullable(),
    /** Degrees of freedom where the concept applies. Null when undisclosed. */
    dof: z.number().int().min(0).max(500).nullable(),
    /** Qualifier for the DoF figure (configuration-dependent counts etc.). */
    dofNote: z.string().max(160).nullable(),
    availability: hardwareAvailabilitySchema.nullable(),
    /** Sourcing detail: shipping state, deposit terms, quote-only, etc. */
    availabilityNote: z.string().max(220).nullable(),
    /** One-line distinction; numbers allowed. */
    highlight: z.string().max(200).nullable(),
    url: httpsUrlSchema,
    sources: z.array(slugSchema).min(1),
    /**
     * Product, press, vendor, or Wikimedia photo. Null only after a real
     * hunt found no public still; licence is not a reason to leave this
     * empty. Imageless rows must say so in imageNote.
     */
    image: hardwareImageSchema.nullable(),
    /** Why no public photo was found, or extra photo provenance. */
    imageNote: z.string().max(160).nullable(),
  })
  .superRefine((entry, ctx) => {
    if (entry.image === null && (entry.imageNote === null || entry.imageNote.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'imageless rows must set imageNote saying no public photo was found',
        path: ['imageNote'],
      });
    }
  });

export type HardwareImage = z.infer<typeof hardwareImageSchema>;
export type HardwareEntry = z.infer<typeof hardwareEntrySchema>;
