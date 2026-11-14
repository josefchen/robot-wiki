import { z } from 'zod';
import { httpsUrlSchema, isoDateSchema, slugSchema } from './shared.ts';

/**
 * The two debate tables of /now/: "Open questions" (the best published
 * evidence each way) and "What people argue about" (named people, one
 * sentence each, linked to where they said it). Data: data/now-debates.ts.
 *
 * Rules every row follows:
 * - Evidence is a result or a filing, never a person's opinion. A side with
 *   no sourced evidence is 'none published'.
 * - A quote is copied character for character from the post or article,
 *   one sentence at most, cut only at a sentence or word boundary, with no
 *   ellipsis. Paraphrase is never a quote.
 * - A quote reached through a press article is 'reported' and names the
 *   article. A figure from a press report or an analyst estimate is
 *   'reported'.
 * - Copy written for the site (questions, labels, evidence sentences,
 *   context) carries no dash characters.
 */

export const NONE_PUBLISHED = 'none published';
export const NOT_DISCLOSED = 'not disclosed';
export const NOT_STATED = 'not stated';
export const QUOTE_MAX_LENGTH = 240;

export const debateSourceTypeSchema = z.enum(['primary', 'reported']);

/** Figure dash, en dash, em dash, horizontal bar, minus sign. */
export const DASH_CHARACTERS = /[‒–—―−]/;

/** True when the text uses no dash character and no spaced hyphen. */
export function isDashFree(text: string): boolean {
  return !DASH_CHARACTERS.test(text) && !/\s-\s/.test(text);
}

/**
 * Sentence-ending marks in a quote. A period between two digits is a
 * decimal point ("2.5", "15.6x"), not a sentence end.
 */
export function terminalMarks(text: string): number {
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char !== '.' && char !== '!' && char !== '?') continue;
    if (char === '.' && /\d/.test(text[i - 1] ?? '') && /\d/.test(text[i + 1] ?? '')) continue;
    count++;
  }
  return count;
}

export function hasEllipsis(text: string): boolean {
  return text.includes('…') || text.includes('...');
}

/** One sentence: exactly one sentence-ending mark, and it ends the quote. */
export function isOneSentence(text: string): boolean {
  return terminalMarks(text) === 1 && /[.!?]$/.test(text.trimEnd()) && !hasEllipsis(text);
}

/** Copy written for the site. */
export const siteCopySchema = z
  .string()
  .min(1)
  .refine((value) => value === value.trim(), { message: 'no leading or trailing space' })
  .refine(isDashFree, { message: 'site copy carries no dashes' });

/** A quote as published: one sentence, no ellipsis, at most 240 characters. */
export const quoteSchema = z
  .string()
  .min(1)
  .max(QUOTE_MAX_LENGTH)
  .refine(isOneSentence, { message: 'a quote is one sentence with one terminal mark and no ellipsis' });

/**
 * A date as precise as its source states it: YYYY, YYYY-MM or YYYY-MM-DD,
 * or 'not disclosed' for an undated page.
 */
export const debateDateSchema = z.union([
  z.literal(NOT_DISCLOSED),
  z
    .string()
    .regex(/^\d{4}(-\d{2}(-\d{2})?)?$/, 'dates must be YYYY, YYYY-MM or YYYY-MM-DD')
    .refine(
      (value) => {
        const [year, month, day] = value.split('-').map(Number);
        if (month === undefined) return year >= 1900 && year <= 2100;
        if (month < 1 || month > 12) return false;
        if (day === undefined) return true;
        const probe = new Date(Date.UTC(year, month - 1, day));
        return probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day;
      },
      { message: 'not a calendar date' },
    ),
]);

/** ISO timestamp in UTC to the second, e.g. "2026-11-09T19:50:30Z". */
export const utcTimestampSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/, 'timestamps are UTC, YYYY-MM-DDTHH:MM:SSZ');

/** One side of an open question: a sourced result, or nothing published. */
export const evidenceSchema = z.union([
  z.literal(NONE_PUBLISHED),
  z.object({
    /** One sentence of site copy, with its number. */
    text: siteCopySchema
      .refine(isOneSentence, { message: 'evidence is one sentence' })
      .refine((value) => /\d/.test(value), { message: 'evidence carries its number' }),
    sourceType: debateSourceTypeSchema,
    sourceTitle: z.string().min(1),
    sourceUrl: httpsUrlSchema,
    /** Who published or measured it. */
    publisher: z.string().min(1),
    published: debateDateSchema,
    /** What the source says, copied from the page on the checked date. */
    passages: z.array(z.string().min(1)).min(1),
    checked: isoDateSchema,
  }),
]);

/** One of the open questions (trends pack, section 3). */
export const openQuestionSchema = z.object({
  id: slugSchema,
  rank: z.number().int().positive(),
  question: siteCopySchema.refine((value) => value.endsWith('?'), { message: 'a question ends in ?' }),
  /** What each side means for this question, e.g. "measured" against "unmeasured". */
  labels: z.object({ for: siteCopySchema, against: siteCopySchema }),
  evidenceFor: evidenceSchema,
  evidenceAgainst: evidenceSchema,
});

/** One named person's (or organization's) position, in their own words. */
export const positionSchema = z
  .object({
    id: slugSchema,
    /** The research pack's row key, for tracing the row back. */
    packKey: z.string().min(1),
    /** The pack's side label, one of the argument's sides. */
    side: z.string().min(1),
    person: z.string().min(1),
    speaker: z.enum(['person', 'organization']),
    /** Role as the pack records it, checked against the bio; 'not stated' when the bio gives none. */
    role: z.string().min(1),
    quote: quoteSchema,
    /** Where it was said: the post, or the article for a quote reached through the press. */
    channel: z.enum(['x', 'press']),
    /** X handle without the @; null for a quote reached through the press. */
    handle: z.string().regex(/^\w{1,15}$/).nullable(),
    postUrl: httpsUrlSchema,
    /** The date X shows a US Eastern reader, or the article's date. */
    postedDate: isoDateSchema,
    postedUtc: utcTimestampSchema,
    sourceType: debateSourceTypeSchema,
    /** The article a press quote came through. */
    article: z.object({ title: z.string().min(1), publisher: z.string().min(1) }).optional(),
    /** 'reopened': the post or article was opened again on the checked date; 'pack': rests on the research pack. */
    opened: z.enum(['reopened', 'pack']),
    checked: isoDateSchema,
    /** One clause of site copy where the quote needs its setting. */
    context: siteCopySchema.optional(),
  })
  .superRefine((position, ctx) => {
    if (position.channel === 'press') {
      if (position.sourceType !== 'reported') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['sourceType'],
          message: `${position.id}: a quote reached through the press is reported`,
        });
      }
      if (position.article === undefined || position.handle !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['article'],
          message: `${position.id}: a press quote names its article and has no handle`,
        });
      }
    } else {
      if (position.handle === null || position.article !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['handle'],
          message: `${position.id}: a post has a handle and no article`,
        });
      }
      const handle = position.handle ?? '';
      if (!position.postUrl.startsWith(`https://x.com/${handle}/status/`)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['postUrl'],
          message: `${position.id}: a post links to its own status on x.com`,
        });
      }
    }
    if (position.postedUtc.slice(0, 4) !== position.postedDate.slice(0, 4)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['postedDate'],
        message: `${position.id}: posted date and timestamp disagree on the year`,
      });
    }
  });

/** One of the arguments (discourse pack, ranked by how much the field argued it). */
export const nowArgumentSchema = z
  .object({
    id: slugSchema,
    rank: z.number().int().positive(),
    title: siteCopySchema,
    question: siteCopySchema.refine((value) => value.endsWith('?'), { message: 'a question ends in ?' }),
    /** The open question on the same subject, so the page shows the subject once. */
    questionId: slugSchema.optional(),
    /** The pack's side labels, in display order. */
    sides: z.array(z.string().min(1)).min(2),
    positions: z.array(positionSchema).min(2).max(4),
  })
  .superRefine((argument, ctx) => {
    const sides = new Set(argument.sides);
    if (sides.size !== argument.sides.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['sides'], message: `${argument.id}: duplicate side` });
    }
    for (const position of argument.positions) {
      if (!sides.has(position.side)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['positions'],
          message: `${argument.id}: ${position.id} takes side "${position.side}", which the argument does not list`,
        });
      }
    }
    const taken = new Set(argument.positions.map((position) => position.side));
    if (taken.size < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['positions'],
        message: `${argument.id}: positions on at least two sides`,
      });
    }
    for (const side of argument.sides) {
      if (!taken.has(side)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['sides'],
          message: `${argument.id}: side "${side}" has no position`,
        });
      }
    }
  });

export const nowDebatesSchema = z
  .object({
    asOf: isoDateSchema,
    questions: z.array(openQuestionSchema).min(1),
    arguments: z.array(nowArgumentSchema).min(1),
  })
  .superRefine((debates, ctx) => {
    const questionIds = new Set<string>();
    for (const question of debates.questions) {
      if (questionIds.has(question.id)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['questions'], message: `duplicate question ${question.id}` });
      }
      questionIds.add(question.id);
    }
    const argumentIds = new Set<string>();
    const positionIds = new Set<string>();
    const linked = new Set<string>();
    for (const argument of debates.arguments) {
      if (argumentIds.has(argument.id)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['arguments'], message: `duplicate argument ${argument.id}` });
      }
      argumentIds.add(argument.id);
      if (argument.questionId !== undefined) {
        if (!questionIds.has(argument.questionId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['arguments'],
            message: `${argument.id}: question ${argument.questionId} does not exist`,
          });
        }
        if (linked.has(argument.questionId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['arguments'],
            message: `${argument.id}: question ${argument.questionId} is already linked`,
          });
        }
        linked.add(argument.questionId);
      }
      for (const position of argument.positions) {
        if (positionIds.has(position.id)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['arguments'], message: `duplicate position ${position.id}` });
        }
        positionIds.add(position.id);
      }
    }
    for (const [name, rows] of [
      ['questions', debates.questions],
      ['arguments', debates.arguments],
    ] as const) {
      const ranks = rows.map((row) => row.rank).sort((a, b) => a - b);
      if (ranks.some((rank, i) => rank !== i + 1)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [name], message: `${name} ranks run 1 to ${rows.length}` });
      }
    }
  });

export type DebateSourceType = z.infer<typeof debateSourceTypeSchema>;
export type Evidence = z.infer<typeof evidenceSchema>;
export type SourcedEvidence = Exclude<Evidence, typeof NONE_PUBLISHED>;
export type OpenQuestion = z.infer<typeof openQuestionSchema>;
export type Position = z.infer<typeof positionSchema>;
export type NowArgument = z.infer<typeof nowArgumentSchema>;
export type NowDebates = z.infer<typeof nowDebatesSchema>;
