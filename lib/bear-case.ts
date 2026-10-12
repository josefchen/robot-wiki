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
 * The Zod schema (lib/bear-case-schema.ts) is the completeness gate: every
 * milestone must carry non-empty whyItMatters, statusDetail, and howWeKnow,
 * plus at least one citation for the status call. The watchlist renders in
 * the browser, so this module keeps zod out of its import graph: the rows
 * are typed against the schema's inferred type here, and the schema parses
 * them at build time on the server (lib/registry-validation.ts, run while
 * the article routes prerender), so an incomplete row still fails
 * `next build`.
 *
 * Status calls are evidence, not vibes: each statusDetail cites the
 * published record it summarizes. As of writing no milestone is met; the
 * "met" filter in the watchlist deliberately renders an empty state.
 */
import type { Milestone, MilestoneStatus } from './bear-case-schema.ts';

export type { Milestone, MilestoneStatus } from './bear-case-schema.ts';

export const MILESTONE_STATUSES = ['not-met', 'partial', 'met'] as const;

export type MilestoneFilter = 'all' | MilestoneStatus;

const ROWS: Milestone[] = [
  {
    id: 'unseen-homes-policy',
    name: 'One policy, >90% in unseen homes',
    whyItMatters:
      'The generalization test: a single policy succeeding across many homes it has never seen, with no per-site data, is the clearest signal that robot intelligence is actually general.',
    status: 'partial',
    statusDetail:
      'π0.5 cleaned kitchens and bedrooms in homes that were entirely absent from its training data, and Figure reports 56% zero-shot success in 30 unseen homes against 9% without Index pretraining, a company figure with no published trial counts; neither result reaches 90% across more than ten unseen homes on standardized tasks.',
    howWeKnow:
      'A published, reproducible evaluation of one policy across more than ten unseen homes with standardized task definitions and success above 90%.',
    citationIds: ['pi05-2025', 'helix-2-5-2026'],
  },
  {
    id: 'ten-thousand-unit-deployment',
    name: 'Verified 10,000-unit deployment',
    whyItMatters:
      'Commercial viability at scale: five figures of humanoids doing documented productive work would end the pilot-program era.',
    status: 'not-met',
    statusDetail:
      'The inspected company records do not document 10,000 humanoids doing productive work: Agility reports 65,000 hours of Digit production experience without a unit count, while Figure reports 1,250+ hours and 90,000+ parts at BMW. This is an evidence-status call for these records, not a census of every manufacturer.',
    howWeKnow:
      'Company filings or independent reporting confirming 10,000 or more units in productive work, with task performance documented.',
    citationIds: ['agility-digit-production', 'figure-bmw-production-2025'],
  },
  {
    id: 'open-benchmark',
    name: 'Open benchmark, cross-lab agreement',
    whyItMatters:
      'The evaluation crisis: until labs publish comparable numbers on shared tasks, every demo is its own benchmark and progress claims cannot be arbitrated.',
    status: 'partial',
    statusDetail:
      'RoboArena crowd-sources double-blind pairwise evaluations across a distributed network of evaluators instead of standardizing fixed tasks, RoboChallenge runs a reproducible online evaluation system, and ManipulationNet delivers reproducible task setups through standardized hardware kits; none has yet produced comparable absolute success numbers across independent labs.',
    howWeKnow:
      'Multiple independent labs publishing comparable results on the same benchmark, with agreement on what the numbers mean.',
    citationIds: ['roboarena-2025', 'robochallenge-2025', 'manipulationnet-2026'],
  },
  {
    id: 'broad-rl-reliability',
    name: 'RL >99% across a broad task set',
    whyItMatters:
      'The reliability-gap test: reinforcement learning closes the gap to 99%+ one task at a time today; whether it does so across many tasks at once decides if the gap is engineering or science.',
    status: 'partial',
    statusDetail:
      'RL-100 reports 100% success across 1,000 evaluation episodes on eight tasks, and π*0.6 passed 90% on three production-style tasks; both produce per-task specialists, and neither claims transfer to unseen tasks. Generalist reports 99% average success for GEN-1, a company figure from a recipe that is not RL-specific, and says not all tasks reach that rate.',
    howWeKnow:
      'Published results showing better than 99% success across more than twenty diverse tasks from a single training recipe.',
    citationIds: ['rl-100-2025', 'pistar06-2025', 'generalist-gen1-2026'],
  },
  {
    id: 'tactile-foundation-model',
    name: 'Tactile model inside a VLA pipeline',
    whyItMatters:
      "The direct test of Brooks's argument that vision-only training cannot produce dexterity: if touch is the missing channel, integrating it should move contact-rich performance.",
    status: 'partial',
    statusDetail:
      'Sparsh-X (roughly a million contact-rich interactions) and TouchWorld are tactile foundation models, and Figure\'s Helix 02 takes fingertip tactile input. T-Rex, a VLA that reads high-frequency touch, beats its strongest baseline by over 30% on 12 contact-rich tasks, and removing touch drops its six-task average from 65% to 42%; TouchWorld reports that removing touch causes its largest drop. Both are single research benchmarks from mid-2026.',
    howWeKnow:
      'A VLA trained with tactile input outperforming its vision-only counterpart on contact-rich tasks, published with ablations.',
    citationIds: ['sparsh-x-2025', 'touchworld-2026', 'helix-02-2026', 't-rex-2026'],
  },
  {
    id: 'sim-to-real-contact',
    name: 'Contact-rich sim-to-real, zero real data',
    whyItMatters:
      'If simulation fidelity reaches contact-rich manipulation, the data bottleneck breaks: training data becomes cheap, unlimited, and parallel.',
    status: 'not-met',
    statusDetail:
      'Sim-to-real transfer is routine for locomotion but hardest where manipulation makes contact: reality-gap surveys name inaccurate contact modeling, where contact states alternate between sticking, slipping, and separation, as a key contributor to the dynamics gap.',
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
      'The inspected palletising-cell cost guide supplies budget and payback context for a task-specific application, not a head-to-head humanoid comparison. These materials cannot establish humanoid cost-per-task parity; absence from them is not proof that no comparison exists elsewhere.',
    howWeKnow:
      'A published total-cost-of-ownership analysis showing humanoid cost per task at or below a purpose-built system for a specific application.',
    citationIds: ['evst-cell-cost-2026'],
  },
  {
    id: 'data-scaling-law',
    name: '100x data, proportional gain',
    whyItMatters:
      'The scaling-law question: the bull case rests on robot performance scaling with data the way language did; a plateau would vindicate the structure-and-priors camp.',
    status: 'partial',
    statusDetail:
      'EgoScale fit a log-linear scaling law (R² = 0.9983) between egocentric pretraining hours and validation loss, and reports downstream task completion rising from 0.30 at 1k hours to 0.71 at 20k hours; Lin et al. find a roughly power-law relationship for single-task generalization, but no success-rate scaling law across unseen environments has been published.',
    howWeKnow:
      'A systematic evaluation showing a 10 to 100x data increase producing proportional real-world success-rate improvement.',
    citationIds: ['egoscale-2026', 'lin-data-scaling-laws-2024'],
  },
];

/**
 * The eight milestones. lib/registry-validation.ts parses them against
 * milestonesSchema at build time; an incomplete row fails `next build`
 * during static generation of the article routes.
 */
export const MILESTONES: Milestone[] = ROWS;

/** Filter milestones by status; "all" returns the full set. */
export function filterMilestones(
  milestones: Milestone[],
  filter: MilestoneFilter,
): Milestone[] {
  if (filter === 'all') return milestones;
  return milestones.filter((milestone) => milestone.status === filter);
}
