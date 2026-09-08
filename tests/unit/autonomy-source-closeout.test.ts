import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import { GLOSSARY } from '../../data/glossary';
import {
  compoundPartDigest,
  compoundPlanDigest,
  parseCompoundPlans,
  parseLedger,
} from '../../lib/audit-ledger';

const article = readFileSync('content/rl-sim2real/rl-for-robotics.mdx', 'utf8');
const ledger = readFileSync('audit/rl-sim2real.md', 'utf8');
const plans = parseCompoundPlans(JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8')));
const citationIds = new Set(CITATIONS.map((citation) => citation.id));
const selected = [44, 45, 46];
const prefix = 'rl-autonomy-applied-';
const parse = (candidate = plans, text = ledger) =>
  parseLedger('audit/rl-sim2real.md', text, citationIds, { compoundPlans: candidate })
    .find((section) => section.slug === 'rl-for-robotics')!.claimRecords;

describe('source-scoped autonomous and reset-free RL corrections', () => {
  it('closes exactly the three assigned originals with all 20 AND-parts and 23 paired items', () => {
    const applied = plans.filter((plan) => plan.id.startsWith(prefix));
    expect(applied.map((plan) => plan.rowOrdinal)).toEqual(selected);
    expect(applied.map((plan) => plan.parts.length)).toEqual([6, 8, 6]);
    expect(applied.map((plan) => plan.evidence.length)).toEqual([7, 9, 7]);
    for (const ordinal of selected) expect(parse()[ordinal - 1].evidenceFailures).toEqual([]);
  });

  it('keeps capability, evaluation, intervention and hardware setup qualifications visible', () => {
    for (const phrase of [
      'learning from raw sensory inputs',
      'manual resets for bead manipulation',
      '**deployed-policy evaluation**',
      '**continuing-policy evaluation**',
      '`h - c(s,a) <= 0`',
      'Interventions are therefore constrained costs, not the evaluation metric',
      'scheduled resets during training',
      'final deployed-policy returns',
      'designer-provided task graph',
      'motion capture',
      'scripted arm motion',
      'frozen fingers',
      'does not guarantee coverage of every downstream starting state',
    ]) expect(article).toContain(phrase);
    expect(article).not.toContain('missing pieces are mostly not the learning algorithm');
    expect(article).not.toContain('the system trains without human intervention');
  });

  it('publishes full source-ordered bylines without changing stable identities', () => {
    const authors: Record<string, string[]> = {
      'real-world-rl-ingredients-2020': ['Henry Zhu', 'Justin Yu', 'Abhishek Gupta', 'Dhruv Shah', 'Kristian Hartikainen', 'Avi Singh', 'Vikash Kumar', 'Sergey Levine'],
      'autonomous-rl-2022': ['Archit Sharma', 'Kelvin Xu', 'Nikhil Sardana', 'Abhishek Gupta', 'Karol Hausman', 'Sergey Levine', 'Chelsea Finn'],
      'reset-free-rl-2021': ['Abhishek Gupta', 'Justin Yu', 'Tony Z. Zhao', 'Vikash Kumar', 'Aaron Rovinsky', 'Kelvin Xu', 'Thomas Devlin', 'Sergey Levine'],
    };
    for (const [id, expected] of Object.entries(authors)) expect(CITATIONS.find((citation) => citation.id === id)?.authors).toEqual(expected);
    const glossary = GLOSSARY.find((term) => term.id === 'reset-free-learning')!;
    expect(glossary.definition).toContain('cost-decremented intervention budget');
    expect(glossary.definition).toContain('motion capture');
  });

  it('rejects missing evidence, stale tuple, and stale adjudication mutations', () => {
    for (const ordinal of selected) {
      const index = plans.findIndex((plan) => plan.id === `${prefix}${ordinal}-20260908`);
      expect(index).toBeGreaterThanOrEqual(0);
      const candidate = structuredClone(plans);
      const plan = candidate[index];
      plan.evidence = plan.evidence.filter((item) => item.partId !== plan.parts[1].id);
      plan.planReview!.planDigest = compoundPlanDigest(plan);
      for (const review of plan.adjudications) review.evidenceDigest = compoundPartDigest(plan, review.partId);
      expect(parse(candidate)[ordinal - 1].evidenceFailures.length).toBeGreaterThan(0);
      const stale = structuredClone(plans);
      stale[index].adjudications[0].evidenceDigest = '0'.repeat(64);
      expect(parse(stale)[ordinal - 1].evidenceFailures.length).toBeGreaterThan(0);
      const claim = parse()[ordinal - 1].claim;
      expect(parse(plans, ledger.replace(claim, `${claim} STALE`))[ordinal - 1].evidenceFailures.length).toBeGreaterThan(0);
    }
  });
});
