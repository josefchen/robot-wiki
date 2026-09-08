import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import { parseLedger } from '../../lib/audit-ledger';

const text = (path: string) => readFileSync(path, 'utf8');
const simulation = () => text('content/world-models/generative-sim.mdx');
const reward = () => text('content/rl-sim2real/reward-design-mpc.mdx');

describe('GRS and Eureka retained source scope', () => {
  it('bounds GRS task authoring and separates transfer from the reported experiment', () => {
    expect(simulation()).toContain('depth and a calibrated robot-frame transform');
    expect(simulation()).toContain('exclude runtime-error cases from the reported reward average');
    expect(simulation()).toContain('Sim-to-real training and transfer remain future work');
    expect(simulation()).not.toContain('generating solvable simulation tasks from single real-world RGB-D images');
  });

  it('distinguishes human feedback from a universal manual-inspection requirement', () => {
    expect(simulation()).toContain('Task fitness need not capture human intent');
    expect(simulation()).toContain('this is an interpretability claim, not a requirement');
    expect(simulation()).not.toContain("Eureka's own accounting includes the need for human inspection");
  });

  it('separates reward-code search, PPO learning and task fitness', () => {
    expect(reward()).toContain('Eureka searches over reward code; PPO learns the policies.');
    expect(reward()).toContain('environment observation code with the existing reward excluded');
    expect(reward()).toContain('last reward/reflection pair');
  });

  it('preserves headline-versus-detailed result and normalization distinctions', () => {
    expect(reward()).toContain('not strict wins everywhere');
    expect(reward()).toContain('maximum task fitness over ten fixed-interval checkpoints');
    expect(reward()).toContain('adjusts each score to lie in `[0, 3]`');
    expect(reward()).toContain('not a 52-percentage-point increase');
    expect(reward()).not.toContain('label="Eureka wins"');
  });

  for (const [ledger, slug, ordinals] of [
    ['audit/world-models.md', 'generative-sim', [11, 12]],
    ['audit/rl-sim2real.md', 'reward-design-mpc', [9, 10]],
  ] as const) {
    it(`retains complete source pairs for ${slug} selected originals`, () => {
      const plans = JSON.parse(text('audit/compound-evidence.json'));
      const sections = parseLedger(ledger, text(ledger), new Set(CITATIONS.map(c => c.id)), {
        compoundPlans: plans,
      });
      const section = sections.find(s => s.slug === slug)!;
      for (const ordinal of ordinals) {
        expect(section.claimRecords[ordinal - 1].evidenceFailures).toEqual([]);
        const evidence = section.claimRecords[ordinal - 1].compound!.evidence;
        expect(evidence.some(e => e.sourceUrl.includes('/abs/'))).toBe(true);
        expect(evidence.some(e => e.sourceUrl.includes('/pdf/'))).toBe(true);
      }
    });
  }
});
