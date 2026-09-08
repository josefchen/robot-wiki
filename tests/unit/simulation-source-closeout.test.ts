import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getCitation } from '../../data/citations';

const prose = readFileSync('content/world-models/generative-sim.mdx', 'utf8');

describe('Generative simulation retained-source corrections', () => {
  it('keeps RoboCasa v1 inventory separate from the held 365 figures', () => {
    expect(prose).toContain('2,509 objects and 153 categories');
    expect(prose).toContain('25 atomic tasks and 75 composite tasks');
    expect(prose).toContain('not RoboCasa365 <Cite id="robocasa-2024" />');
  });

  it('binds generated-data scaling to the task, robot and evaluation protocol', () => {
    for (const value of [
      'Franka Panda on an Omron mobile base',
      '100, 300, or 3,000 generated demonstrations per task',
      '24 atomic manipulation tasks; navigation is excluded',
      '50 trials per task across five fixed kitchen scenes',
      '26.3%, 35.0%, and 47.6%',
      'Individual tasks do not improve monotonically',
      'Section VIII-C refers broadly to datasets over 25 tasks',
    ]) expect(prose).toContain(value);
  });

  it('distinguishes RoboGen algorithm framing from its locomotion implementation', () => {
    expect(prose).toContain('cross-entropy-method planning with the ground-truth simulator');
    expect(prose).toContain('Manipulation uses SAC');
    expect(prose).toContain('human inspection of scenes, rewards, and learned skills');
    expect(prose).not.toContain('reinforcement learning for locomotion and contact-rich skills');
  });

  it('does not turn Holodeck navigation and soft constraints into physical guarantees', () => {
    expect(prose).toContain('soft relational constraints');
    expect(prose).toContain('pretrained on ProcTHOR-10K');
    expect(prose).toContain('not a test of physically valid manipulation');
    expect(prose).not.toContain('without any human-constructed data');
  });

  it('binds both generator-prior statements rather than retaining the unsupported analogy', () => {
    const item = prose.split('3. **Scene diversity has specific design sources.**')[1]?.split('\n\n')[0];
    expect(item).toContain('cultural biases from the LLM and the asset-retrieval component');
    expect(item).toContain('home-design and architecture magazines');
    expect(item).toContain('<Cite id="holodeck-2024" />');
    expect(item).toContain('<Cite id="robocasa-2024" />');
    expect(prose).not.toContain('kitchens look like kitchen magazines');
  });

  it('preserves full registered source bylines and the unrefreshed partial-audit date', () => {
    expect(getCitation('robocasa-2024')?.authors).toHaveLength(8);
    expect(getCitation('robogen-2024')?.authors).toHaveLength(9);
    expect(getCitation('holodeck-2024')?.authors).toHaveLength(14);
    expect(getCitation('holodeck-2024')?.authors[3]).toBe('Eli VanderBilt');
    expect(prose).toContain('lastReviewed: "2026-08-17"');
  });
});
