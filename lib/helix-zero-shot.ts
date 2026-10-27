/**
 * Zero-shot success in 30 unseen homes, as Figure's Helix 2.5 post
 * (17 September 2026, read 2026-10-27) reports it: "In blind evaluations,
 * the policy trained from scratch succeeded on 9% of zero-shot trials. The
 * Index-pretrained policy succeeded on 56%". Both policies were trained on
 * the same task data; "The only difference was Index pretraining". The
 * rates pool three tasks (living-room tidy, towel folding, bed making),
 * success needed the whole task ("We give no partial credit"), and the post
 * prints no trial counts and no per-task rates.
 *
 * The 90 percent bar is this wiki's definition of solved generalization
 * (frontier/generalization, "What solved would look like"), not a number
 * any source sets.
 */

export interface ZeroShotResult {
  id: string;
  label: string;
  row: string;
  successPercent: number;
}

export const HELIX_ZERO_SHOT_CITATION_ID = 'helix-2-5-2026';
export const HELIX_ID = 'index-pretrained';
export const SOLVED_BAR_PERCENT = 90;

export const HELIX_ZERO_SHOT: readonly ZeroShotResult[] = [
  {
    id: 'from-scratch',
    label: 'Trained from scratch, same task data',
    row: 'Trained from scratch',
    successPercent: 9,
  },
  {
    id: HELIX_ID,
    label: 'Helix 2.5, pretrained on human data',
    row: 'Helix 2.5, pretrained on Index',
    successPercent: 56,
  },
];

export function zeroShotOf(id: string): number {
  const row = HELIX_ZERO_SHOT.find((r) => r.id === id);
  if (!row) throw new Error(`helix-zero-shot: no result "${id}"`);
  return row.successPercent;
}
