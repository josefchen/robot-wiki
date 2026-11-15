import { z } from 'zod';
import { httpsUrlSchema, isoDateSchema, slugSchema } from './shared.ts';

/**
 * One row of data/maker-model-sources.ts: where a robot maker publishes its
 * own 3D model files, at which commit, and under which licence.
 *
 * One row per maker, licence and repository, never per robot. Status:
 *   - official: the maker's own files with a licence that permits
 *     redistribution with notices kept;
 *   - restricted: published, with terms that limit use or redistribution
 *     (the limiting clause is quoted);
 *   - no-licence: published with no licence file, so all rights reserved;
 *   - none-found: no maker file found where the maker publishes code.
 */

export const makerModelStatusSchema = z.enum([
  'official',
  'restricted',
  'no-licence',
  'none-found',
]);
export type MakerModelStatus = z.infer<typeof makerModelStatusSchema>;

/** STEP marks a maker's CAD download, not a simulation description. */
export const modelFormatSchema = z.enum(['URDF', 'MJCF', 'USD', 'STEP']);
export type ModelFormat = z.infer<typeof modelFormatSchema>;

export const makerModelSourceRefSchema = z.object({
  url: httpsUrlSchema,
  title: z.string().min(1),
  /** primary: the maker's or licensor's own page or file. */
  kind: z.enum(['primary', 'reported']),
});

export const makerModelSourceSchema = z
  .object({
    id: slugSchema,
    maker: z.string().min(1),
    robots: z.array(z.string().min(1)).min(1),
    status: makerModelStatusSchema,
    /** Git repository or the maker's download page; null when none-found. */
    repository: httpsUrlSchema.nullable(),
    /** Pinned commit, UTC committer date; null off git and when none-found. */
    commit: z
      .object({
        hash: z.string().regex(/^[0-9a-f]{40}$/),
        date: isoDateSchema,
      })
      .nullable(),
    formats: z.array(modelFormatSchema),
    /** Licence name (SPDX where one exists) and its text at the commit. */
    licence: z
      .object({ name: z.string().min(1), url: httpsUrlSchema })
      .nullable(),
    /** restricted rows only: the limiting clause, verbatim. */
    clause: z.string().min(1).optional(),
    /** Id in data/models-3d.ts when the site ships this source's files. */
    hostedModelId: slugSchema.optional(),
    checked: isoDateSchema,
    sources: z.array(makerModelSourceRefSchema).min(1),
    /** One sentence at most. */
    note: z.string().min(1),
  })
  .superRefine((row, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: 'custom', message });
    const found = row.status !== 'none-found';
    if (found !== (row.repository !== null)) {
      fail(`${row.id}: repository must be set unless none-found`);
    }
    if (found !== row.formats.length > 0) {
      fail(`${row.id}: formats must be listed unless none-found`);
    }
    const licensed = row.status === 'official' || row.status === 'restricted';
    if (licensed !== (row.licence !== null)) {
      fail(`${row.id}: only official and restricted rows carry a licence`);
    }
    if ((row.status === 'restricted') !== (row.clause !== undefined)) {
      fail(`${row.id}: restricted rows, and only they, quote a clause`);
    }
    if (row.repository?.startsWith('https://github.com/') && !row.commit) {
      fail(`${row.id}: a GitHub repository needs a pinned commit`);
    }
    if (!found && row.commit) {
      fail(`${row.id}: a none-found row has no commit`);
    }
  });

export type MakerModelSource = z.infer<typeof makerModelSourceSchema>;
