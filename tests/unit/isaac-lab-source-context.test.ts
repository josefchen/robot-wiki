import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getCitation } from '../../data/citations';
import { CITATIONS } from '../../data/citations';
import { parseLedger, type CompoundPlan } from '../../lib/audit-ledger';

describe('Isaac Lab v1 source scope', () => {
  it('retains the full credited population without old incomplete-author exceptions', () => {
    const citation = getCitation('isaac-lab-2025');
    expect(citation?.authors).toEqual([
  "NVIDIA",
  "Mayank Mittal",
  "Yunrong Guo",
  "Pascal Roth",
  "David Hoeller",
  "James Tigue",
  "Antoine Richard",
  "Octi Zhang",
  "Peter Du",
  "Antonio Serrano-Muñoz",
  "Xinjie Yao",
  "René Zurbrügg",
  "Nikita Rudin",
  "Lukasz Wawrzyniak",
  "Milad Rakhsha",
  "Alain Denzler",
  "Eric Heiden",
  "Ales Borovicka",
  "Ossama Ahmed",
  "Iretiayo Akinola",
  "Abrar Anwar",
  "Mark T. Carlson",
  "Ji Yuan Feng",
  "Animesh Garg",
  "Renato Gasoto",
  "Lionel Gulich",
  "Yijie Guo",
  "M. Gussert",
  "Ankur Handa",
  "Alex Hansen",
  "Mihir Kulkarni",
  "Chenran Li",
  "Wei Liu",
  "Viktor Makoviychuk",
  "Grzegorz Malczyk",
  "Hammad Mazhar",
  "Masoud Moghani",
  "Adithyavairavan Murali",
  "Michael Noseworthy",
  "Alexander Poddubny",
  "Nathan Ratliff",
  "Welf Rehberg",
  "Clemens Schwarke",
  "Ritvik Singh",
  "James Latham Smith",
  "Bingjie Tang",
  "Ruchik Thaker",
  "Matthew Trepte",
  "Karl Van Wyk",
  "Fangzhou Yu",
  "Alex Millane",
  "Vikram Ramasamy",
  "Remo Steiner",
  "Sangeeta Subramanian",
  "Clemens Volk",
  "CY Chen",
  "Neel Jawale",
  "Ashwin Varghese Kuruttukulam",
  "Michael A. Lin",
  "Ajay Mandlekar",
  "Karsten Patzwaldt",
  "John Welsh",
  "Huihua Zhao",
  "Fatima Anes",
  "Jean-Francois Lafleche",
  "Nicolas Moënne-Loccoz",
  "Soowan Park (박수완)",
  "Rob Stepinski",
  "Dirk Van Gelder",
  "Chris Amevor",
  "Jan Carius",
  "Jumyung Chang",
  "Anka He Chen",
  "Pablo de Heras Ciechomski",
  "Gilles Daviet",
  "Mohammad Mohajerani",
  "Julia von Muralt",
  "Viktor Reutskyy",
  "Michael Sauter",
  "Simon Schirm",
  "Eric L. Shi",
  "Pierre Terdiman",
  "Kenny Vilella",
  "Tobias Widmer",
  "Gordon Yeoman",
  "Tiffany Chen",
  "Sergey Grizan",
  "Cathy Li",
  "Lotus Li",
  "Connor Smith",
  "Rafael Wiltz",
  "Kostas Alexis",
  "Yan Chang",
  "David Chu",
  "Linxi “Jim” Fan",
  "Farbod Farshidian",
  "Spencer Huang",
  "Marco Hutter",
  "Yashraj Narang",
  "Soha Pouya",
  "Shiwei Sheng",
  "Yuke Zhu",
  "Miles Macklin",
  "Adam Moravanszky",
  "Philipp Reist",
  "Gavriel State"
]);
    expect(citation?.year).toBe(2025);
    expect(citation?.url).toBe('https://arxiv.org/abs/2511.04831');
    const exceptions = readFileSync('data/crossref-author-exceptions.ts', 'utf8');
    expect(exceptions).not.toContain("id: 'isaac-lab-2025'");
  });
  it('keeps throughput bounds and distinguishes runtime randomization from reset-only', () => {
    const parallel = readFileSync('content/rl-sim2real/parallel-sim-rl.mdx', 'utf8');
    expect(parallel).toContain('exceeds 900,000 frames per second');
    expect(parallel).toContain('exceeds 1.6 million');
    expect(parallel).toContain('simulation plus learning time');
    expect(parallel).toContain('two AMD EPYC 9554');
    expect(parallel).not.toContain('which is why randomization happens on episode reset');
    const transfer = readFileSync('content/rl-sim2real/sim2real-transfer.mdx', 'utf8');
    expect(transfer).toContain('Most other physics parameters can be randomized at runtime');
    expect(transfer).toContain('information gap due to input mismatch');
    expect(transfer).not.toContain('the first system to map stereo images');
  });
});

const targets = [
  ['audit/world-models.md', 'generative-sim', 10],
  ['audit/rl-sim2real.md', 'why-rl-locomotion', 3],
  ['audit/rl-sim2real.md', 'why-rl-locomotion', 6],
  ['audit/rl-sim2real.md', 'parallel-sim-rl', 8],
  ['audit/rl-sim2real.md', 'parallel-sim-rl', 9],
  ['audit/rl-sim2real.md', 'parallel-sim-rl', 10],
  ['audit/rl-sim2real.md', 'parallel-sim-rl', 16],
  ['audit/rl-sim2real.md', 'sim2real-transfer', 2],
  ['audit/rl-sim2real.md', 'sim2real-transfer', 8],
  ['audit/rl-sim2real.md', 'sim2real-transfer', 12],
  ['audit/rl-sim2real.md', 'sim2real-transfer', 13],
  ['audit/rl-sim2real.md', 'reward-design-mpc', 15],
] as const;

describe('Isaac original whole-record bindings', () => {
  it.each(targets)('%s:%s:%i has all reviewed parts and rejects stale evidence', (ledger, slug, ordinal) => {
    const plans: CompoundPlan[] = JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8'));
    const plan = plans.find(p => p.ledgerPath === ledger && p.articleSlug === slug && p.rowOrdinal === ordinal);
    expect(plan).toBeDefined();
    if (!plan) throw new Error('Missing assigned original plan');
    const text = readFileSync(ledger, 'utf8');
    const record = (catalog: CompoundPlan[], markdown = text) =>
      parseLedger(ledger, markdown, new Set(CITATIONS.map(c => c.id)), { compoundPlans: catalog })
        .find(s => s.slug === slug)!.claimRecords[ordinal - 1];
    expect(record(plans).evidenceFailures).toEqual([]);
    expect(plan.evidence.length).toBe(plan.parts.length);
    expect(plan.evidence.every(e => e.citationId === 'isaac-lab-2025' &&
      e.sourceUrl === 'https://arxiv.org/html/2511.04831v1')).toBe(true);
    for (const part of plan.parts) {
      const changed = structuredClone(plans);
      const selected = changed.find(p => p.id === plan.id)!;
      selected.evidence = selected.evidence.filter(e => e.partId !== part.id);
      expect(record(changed).evidenceFailures.length, `missing ${part.id}`).toBeGreaterThan(0);
    }
    for (const mutation of ['duplicate', 'source', 'passage', 'plan', 'verdict'] as const) {
      const changed = structuredClone(plans);
      const selected = changed.find(p => p.id === plan.id)!;
      if (mutation === 'duplicate') selected.evidence.push({ ...selected.evidence[0] });
      if (mutation === 'source') selected.evidence[0].sourceUrl = 'https://arxiv.org/html/2511.04831v2';
      if (mutation === 'passage') selected.evidence[0].supportingPassage += ' Unsupported addition.';
      if (mutation === 'plan') selected.parts[0].text += ' Additional unsupported scope.';
      if (mutation === 'verdict') selected.adjudications[0].outcome = 'unresolved';
      expect(record(changed).evidenceFailures.length, mutation).toBeGreaterThan(0);
    }
    const original = record(plans);
    const lines = text.split('\n');
    lines[original.line - 1] = lines[original.line - 1].replace(original.claim, original.claim + ' Stale claim.');
    expect(record(plans, lines.join('\n')).evidenceFailures.length).toBeGreaterThan(0);
  });

  it('separates human-seeded Mimic, dexterous embodiment and illustrative CPU costs', () => {
    const sim = readFileSync('content/world-models/generative-sim.mdx', 'utf8');
    expect(sim).toContain('Mimic segments human demonstrations into object-centric subtasks');
    expect(sim).toContain('not a promise of unlimited successful demonstrations');
    const why = readFileSync('content/rl-sim2real/why-rl-locomotion.mdx', 'utf8');
    expect(why).toContain('KUKA arm and Allegro hand');
    expect(why).not.toContain('the first system to map stereo images');
    const chart = readFileSync('components/interactive/training-time-chart.tsx', 'utf8');
    expect(chart).toContain('Neither this curve nor its CPU-cost constant is measured by that benchmark.');
    const reward = readFileSync('content/rl-sim2real/reward-design-mpc.mdx', 'utf8');
    expect(reward).toContain('approximately 16 hours on NVIDIA OVX L40 hardware');
    expect(reward).not.toContain('DexPBT evolves hyperparameters and reward weights');
  });
});
