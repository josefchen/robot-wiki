import { readFileSync } from 'node:fs';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import { parseLedger } from '../../lib/audit-ledger';

const read = (path: string) => readFileSync(path, 'utf8');
const video = read('content/world-models/generative-video.mdx');
const taxonomy = read('content/world-models/taxonomy.mdx');
const plans = JSON.parse(read('audit/compound-evidence.json'));
const sections = parseLedger(
  'audit/world-models.md',
  read('audit/world-models.md'),
  new Set(CITATIONS.map(c => c.id)),
  {
    compoundPlans: plans,
    articleCitations: {
      'generative-video': matter(video).data.citations,
      taxonomy: matter(taxonomy).data.citations,
    },
  },
);

describe('Genie and IWS retained-primary closeouts', () => {
  it.each([
    ['taxonomy', 13],
    ['generative-video', 2],
    ['generative-video', 3],
    ['generative-video', 4],
    ['generative-video', 13],
    ['generative-video', 14],
    ['generative-video', 18],
    ['generative-video', 19],
  ] as const)('binds every required part of original %s:%i', (slug, ordinal) => {
    const row = sections.find(s => s.slug === slug)!.claimRecords[ordinal - 1];
    expect(row.evidenceFailures).toEqual([]);
  });

  it('bounds Genie capability, interventions and the SIMA demonstration', () => {
    for (const phrase of [
      'August 5, 2025', 'limited research preview', "without knowing the agent's goal",
      'geographic accuracy', 'the test involved no robot manipulation',
    ]) expect(video).toContain(phrase);
    expect(video).not.toContain('cannot score candidate grasps');
    expect(taxonomy).not.toContain('the most honest accounting in this area');
  });

  it('does not turn IWS video speed or generated-data scores into universal control results', () => {
    for (const phrase of [
      'up to 15 FPS on a single RTX 4090', '192 steps (19.2 seconds)',
      '100-episode mixtures',
      '87.9% versus 90.3% for DP', '76.2% versus 73.6% for ACT',
      '73.1% to 88.8%', '10 physical evaluations',
      '20 initial configurations', 'positively biased simulator scores',
    ]) expect(video).toContain(phrase);
  });

  it('keeps RoboWorld policy aggregates, judge bias and open-loop scope distinct', () => {
    for (const phrase of [
      'eight policy-level scores', '26 February 2026 RoboArena leaderboard',
      'the eight aggregates are the correlation points', 'GPT-4o',
      'about one point above human scores',
    ]) expect(video).toContain(phrase);
  });

  it('does not refresh partial article review dates', () => {
    expect(matter(video).data.lastReviewed).toBe('2026-08-17');
    expect(matter(taxonomy).data.lastReviewed).toBe('2026-08-17');
  });
});
