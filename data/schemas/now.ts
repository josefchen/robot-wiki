import { z } from 'zod';
import { httpsUrlSchema, isoDateSchema, slugSchema } from './shared.ts';

/**
 * Records behind /now/ (data/now.ts): trajectories, dated developments and
 * announced against delivered.
 *
 * Every cited fact carries the page it was read on (`sourceUrl`,
 * `sourceTitle`), whether that page is the measurer's own (`primary`) or a
 * report of it (`reported`), and `wording`: the passage on that page, quoted.
 * Derived numbers are never stored. A computed trajectory end stores its
 * stated inputs, and lib/now.ts derives the value.
 */

export const sourceTypeSchema = z.enum(['primary', 'reported']);
export type SourceType = z.infer<typeof sourceTypeSchema>;

const sourceFields = {
  sourceUrl: httpsUrlSchema,
  sourceTitle: z.string().min(1),
  sourceType: sourceTypeSchema,
  /** The passage read on the page, quoted. */
  wording: z.string().min(1),
};

/** A page and the passage on it that supports one fact. */
export const citedSchema = z.object(sourceFields);
export type Cited = z.infer<typeof citedSchema>;

/** A number the page states, with its label. */
export const statedNumberSchema = z.object({
  label: z.string().min(1),
  value: z.number().finite(),
  ...sourceFields,
});
export type StatedNumber = z.infer<typeof statedNumberSchema>;

/** A date the page states, with its label. */
export const statedDateSchema = z.object({
  label: z.string().min(1),
  date: isoDateSchema,
  ...sourceFields,
});
export type StatedDate = z.infer<typeof statedDateSchema>;

/** One slice of a pretraining mixture; hours null when the page gives none. */
export const dataPartSchema = z.object({
  label: z.string().min(1),
  hours: z.number().positive().nullable(),
  /** Robot data (teleoperation on a robot) as against human video or handheld recordings. */
  robot: z.boolean(),
  ...sourceFields,
});
export type DataPart = z.infer<typeof dataPartSchema>;

/** How lib/now.ts derives a computed end from its stated inputs. */
export const computationSchema = z.discriminatedUnion('kind', [
  z.object({
    /** The earlier value implied by a later value and its stated growth. */
    kind: z.literal('implied-by-growth'),
    later: statedNumberSchema,
    growthPercent: statedNumberSchema,
  }),
  z.object({
    kind: z.literal('sum'),
    parts: z.array(statedNumberSchema).min(2),
  }),
  z.object({
    /** Percent of a mixture's hours that are robot data. */
    kind: z.literal('robot-share'),
    parts: z.array(dataPartSchema).min(1),
  }),
  z.object({
    kind: z.literal('days-between'),
    from: statedDateSchema,
    to: statedDateSchema,
  }),
  z.object({
    kind: z.literal('gpu-hours'),
    gpus: statedNumberSchema,
    days: statedNumberSchema,
  }),
]);
export type Computation = z.infer<typeof computationSchema>;

/** Where an end's date comes from when its value is read on another page. */
const dateSourceSchema = citedSchema.optional();

export const statedEndSchema = z.object({
  basis: z.literal('stated'),
  /** The last day of the period the value describes. */
  date: isoDateSchema,
  /** The period as a reader names it, e.g. "Q3 2026". */
  period: z.string().min(1),
  label: z.string().min(1),
  value: z.number().finite(),
  /** The page's own hedge on the value. */
  qualifier: z.enum(['more than']).optional(),
  /** Successes and episodes behind a stated success rate. */
  episodes: z
    .object({ successes: z.number().int().nonnegative(), total: z.number().int().positive() })
    .optional(),
  dateSource: dateSourceSchema,
  ...sourceFields,
});
export type StatedEnd = z.infer<typeof statedEndSchema>;

export const computedEndSchema = z.object({
  basis: z.literal('computed'),
  date: isoDateSchema,
  period: z.string().min(1),
  label: z.string().min(1),
  computation: computationSchema,
  dateSource: dateSourceSchema,
});
export type ComputedEnd = z.infer<typeof computedEndSchema>;

export const trajectoryEndSchema = z.discriminatedUnion('basis', [statedEndSchema, computedEndSchema]);
export type TrajectoryEnd = z.infer<typeof trajectoryEndSchema>;

export const trajectoryUnitSchema = z.enum([
  'humanoids per quarter',
  'hours',
  'percent of hours',
  'days',
  'GPU-hours',
  'percent success',
  'USD billions per quarter',
  'rides per week',
  'missions per month',
  'systems installed',
]);
export type TrajectoryUnit = z.infer<typeof trajectoryUnitSchema>;

export const trajectorySchema = z.object({
  id: slugSchema,
  title: z.string().min(1),
  unit: trajectoryUnitSchema,
  measuredBy: z.string().min(1),
  /** One clause a reader needs before comparing the two ends. */
  caveat: z.string().min(1),
  earlier: trajectoryEndSchema,
  later: trajectoryEndSchema,
  /** Stated values shown beside the two ends, never between them. */
  alongside: z.array(statedEndSchema).optional(),
  /** The scores are from a simulator, not a real robot. */
  simulation: z.boolean().optional(),
  /** A ratio in the source's own words; never a computed multiple. */
  ratio: z.object({ text: z.string().min(1), ...sourceFields }).optional(),
  note: z.object({ text: z.string().min(1), ...sourceFields }).optional(),
});
export type Trajectory = z.infer<typeof trajectorySchema>;

export const developmentAreaSchema = z.enum(['models', 'deployments', 'policy', 'money']);
export type DevelopmentArea = z.infer<typeof developmentAreaSchema>;

export const DEVELOPMENT_WHAT_MAX = 110;

export const developmentSchema = z.object({
  id: slugSchema,
  date: isoDateSchema,
  area: developmentAreaSchema,
  /** One sentence that reads alone on the home page. */
  what: z.string().min(1).max(DEVELOPMENT_WHAT_MAX),
  means: z.string().min(1),
  doesNotMean: z.string().min(1),
  ...sourceFields,
  /** A second page a clause rests on, when the main source does not say it. */
  alsoCited: z.array(citedSchema).optional(),
});
export type Development = z.infer<typeof developmentSchema>;

/** What a count counts. */
export const countKindSchema = z.enum([
  'registered',
  'built',
  'produced',
  'sold',
  'delivered',
  'ordered (committed)',
  'ordered (binding)',
  'ordered (non-binding)',
  'in service',
  'daily active',
  'paid rides',
  'all rides',
  'fleet total',
  'target',
  'milestone',
]);
export type CountKind = z.infer<typeof countKindSchema>;

const gapSideFields = {
  what: z.string().min(1),
  /** null when the source gives no figure; it renders as "not disclosed". */
  value: z.number().positive().nullable(),
  qualifier: z.enum(['more than', 'up to', 'about']).optional(),
  countKind: countKindSchema,
  ...sourceFields,
};

export const deliveryGapSchema = z.object({
  id: slugSchema,
  who: z.string().min(1),
  /** The research pack's unit field, copied. */
  unit: z.string().min(1),
  /** The promise or the announced figure. */
  promised: z.object({ said: isoDateSchema, ...gapSideFields }),
  /** What has been delivered, as the latest source puts it. */
  delivered: z.object({ asOf: isoDateSchema, ...gapSideFields }),
});
export type DeliveryGap = z.infer<typeof deliveryGapSchema>;
