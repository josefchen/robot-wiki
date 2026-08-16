/**
 * Milestones-watchlist data for the frontier/bear-case module.
 *
 * Eight falsifiable milestones that would settle the bear case one way or
 * the other, each with the question it answers, a current-status call
 * (not met / partial / met), the published evidence behind that call, and
 * the observation that would flip it to met. Row data lives here (not in
 * the component) so the module's prose, the watchlist, and the tests share
 * one source, and so the unit suite can assert that every citation id
 * resolves in the registry.
 *
 * The Zod schema is the completeness gate: every milestone must carry
 * non-empty whyItMatters, statusDetail, and howWeKnow, plus at least one
 * citation for the status call. The array is parsed at module scope, so an
 * incomplete row throws during static generation and fails `next build`.
 *
 * Status calls are evidence, not vibes: each statusDetail cites the
 * published record it summarizes. As of writing no milestone is met; the
 * "met" filter in the watchlist deliberately renders an empty state.
 */
import { z } from 'zod';

export const MILESTONE_STATUSES = ['not-met', 'partial', 'met'] as const;

export const milestoneStatusSchema = z.enum(MILESTONE_STATUSES);

export type MilestoneStatus = z.infer<typeof milestoneStatusSchema>;

export type MilestoneFilter = 'all' | MilestoneStatus;

export const milestoneSchema = z.object({
  /** Stable row id, used for test selectors. */
  id: z.string().min(1),
  /** Short milestone name for the table row. */
  name: z.string().min(1),
  /** The question the milestone settles. */
  whyItMatters: z.string().min(1),
  status: milestoneStatusSchema,
  /** The published evidence behind the status call. */
  statusDetail: z.string().min(1),
  /** The observation that would flip the status to met. */
  howWeKnow: z.string().min(1),
  /** Citation registry ids backing the status detail. */
  citationIds: z.array(z.string().min(1)).min(1),
});

export type Milestone = z.infer<typeof milestoneSchema>;

const ROWS: Milestone[] = [
  {
    id: 'unseen-homes-policy',
    name: 'One policy, >90% in unseen homes',
    whyItMatters:
      'The generalization test: a single policy succeeding across many homes it has never seen, with no per-site data, is the clearest signal that robot intelligence is actually general.',
    status: 'partial',
    statusDetail:
      'π0.5 cleaned kitchens and bedrooms in homes that were entirely absent from its training data, but the published evaluation covered a small number of homes; no lab has run a systematic multi-home evaluation with standardized tasks.',
    howWeKnow:
      'A published, reproducible evaluation of one policy across more than ten unseen homes with standardized task definitions and success above 90%.',
    citationIds: ['pi05-2025'],
  },
  {
    id: 'ten-thousand-unit-deployment',
    name: 'Verified 10,000-unit deployment',
    whyItMatters:
      'Commercial viability at scale: five figures of humanoids doing documented productive work would end the pilot-program era.',
    status: 'not-met',
    statusDetail:
      "No manufacturer has deployed more than 1,000 units with documented task performance; the strongest verified records are Agility's 65,000+ operating hours across nine facilities and Unitree's roughly 5,500 units shipped in 2025.",
    howWeKnow:
      'Company filings or independent reporting confirming 10,000 or more units in productive work, with task performance documented.',
    citationIds: ['technology-org-deployed-2026'],
  },
  {
    id: 'open-benchmark',
    name: 'Open benchmark, cross-lab agreement',
    whyItMatters:
      'The evaluation crisis: until labs publish comparable numbers on shared tasks, every demo is its own benchmark and progress claims cannot be arbitrated.',
    status: 'partial',
    statusDetail:
      'RoboArena, RoboChallenge, and ManipulationNet all launched with standardized tasks or hardware kits, but none has yet drawn convergent numbers from multiple independent labs.',
    howWeKnow:
      'Multiple independent labs publishing comparable results on the same benchmark, with agreement on what the numbers mean.',
    citationIds: [
      'roboarena-2025',
      'robochallenge-2025',
      'manipulationnet-2026',
    ],
  },
  {
    id: 'broad-rl-reliability',
    name: 'RL >99% across a broad task set',
    whyItMatters:
      'The reliability-gap test: reinforcement learning closes the gap to 99%+ one task at a time today; whether it does so across many tasks at once decides if the gap is engineering or science.',
    status: 'partial',
    statusDetail:
      'RL-100 reports 100% success across 1,000 evaluation episodes on eight tasks, and π*0.6 passed 90% on three production-style tasks; both produce per-task specialists, and neither claims transfer to unseen tasks.',
    howWeKnow:
      'Published results showing better than 99% success across more than twenty diverse tasks from a single training recipe.',
    citationIds: ['rl-100-2025', 'pistar06-2025'],
  },
  {
    id: 'tactile-foundation-model',
    name: 'Tactile model inside a VLA pipeline',
    whyItMatters:
      "The direct test of Brooks's argument that vision-only training cannot produce dexterity: if touch is the missing channel, integrating it should move contact-rich performance.",
    status: 'not-met',
    statusDetail:
      'Tactile foundation models exist (Sparsh-X trained on roughly a million contact-rich interactions; TouchWorld for contact-rich manipulation), but no major VLA pipeline integrates tactile input at scale.',
    howWeKnow:
      'A VLA trained with tactile input outperforming its vision-only counterpart on contact-rich tasks, published with ablations.',
    citationIds: ['sparsh-x-2025', 'touchworld-2026'],
  },
  {
    id: 'sim-to-real-contact',
    name: 'Contact-rich sim-to-real, zero real data',
    whyItMatters:
      'If simulation fidelity reaches contact-rich manipulation, the data bottleneck breaks: training data becomes cheap, unlimited, and parallel.',
    status: 'not-met',
    statusDetail:
      'Sim-to-real transfer is reliable for locomotion but not for contact-rich manipulation; reality-gap surveys still treat contact dynamics as the unsolved case, and no policy trained entirely in simulation has been shown on a real contact-rich task.',
    howWeKnow:
      'A policy trained entirely in simulation achieving above 90% on a real contact-rich task, replicated outside the originating lab.',
    citationIds: ['reality-gap-survey-2026'],
  },
  {
    id: 'cost-per-task-parity',
    name: 'Humanoid cost-per-task parity',
    whyItMatters:
      "The form-factor question in one number: if a humanoid's total cost per task matches a purpose-built system in the same application, the general-purpose thesis survives contact with accounting.",
    status: 'not-met',
    statusDetail:
      'No published cost analysis shows parity; the verified deployment economics belong to purpose-built systems, and task-specific robots remain cheaper for known tasks.',
    howWeKnow:
      'A published total-cost-of-ownership analysis showing humanoid cost per task at or below a purpose-built system for a specific application.',
    citationIds: ['technology-org-deployed-2026'],
  },
  {
    id: 'data-scaling-law',
    name: '100x data, proportional gain',
    whyItMatters:
      'The scaling-law question: the bull case rests on robot performance scaling with data the way language did; a plateau would vindicate the structure-and-priors camp.',
    status: 'partial',
    statusDetail:
      'EgoScale fit a log-linear scaling law (R² = 0.9983) from egocentric pretraining hours to downstream performance, but the law is measured on validation loss; no real-world success-rate scaling law has been published.',
    howWeKnow:
      'A systematic evaluation showing a 10 to 100x data increase producing proportional real-world success-rate improvement.',
    citationIds: ['egoscale-2026'],
  },
];

/**
 * The eight milestones, schema-validated at module load. An incomplete row
 * throws here, which fails `next build` during static generation of the
 * module page.
 */
export const MILESTONES: Milestone[] = z
  .array(milestoneSchema)
  .length(8)
  .parse(ROWS);

/** Filter milestones by status; "all" returns the full set. */
export function filterMilestones(
  milestones: Milestone[],
  filter: MilestoneFilter,
): Milestone[] {
  if (filter === 'all') return milestones;
  return milestones.filter((milestone) => milestone.status === filter);
}
