import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '@/data/citations';
import { THESES } from '@/lib/competing-theses';
import {
  compoundPartDigest,
  compoundPlanDigest,
  parseCompoundPlans,
  parseLedger,
} from '@/lib/audit-ledger';

const ordinals = [3, 4, 5, 10, 11, 24];
const expectedParts = [
  ['paraphrase', 'length'],
  ['cnn'],
  ['cnn', 'extension', 'speech', 'success'],
  ['paraphrase', 'length'],
  ['cnn', 'extension', 'speech', 'success'],
  ['humanoid-opinion', 'industrial-fingers', 'deployment', 'warehouse', 'robust', 'earlier-deployment', 'future'],
];
const urls: Record<string, string> = {
  'brooks-better-lesson-2019': 'https://rodneybrooks.com/a-better-lesson/',
  'brooks-dexterity-2025': 'https://rodneybrooks.com/why-todays-humanoids-wont-learn-dexterity/',
};
const read = (file: string) => readFileSync(file, 'utf8');
const plans = parseCompoundPlans(JSON.parse(read('audit/compound-evidence.json')));
const ledger = read('audit/frontier.md');
const article = read('content/frontier/competing-theses.mdx');
const ids = new Set(CITATIONS.map((citation) => citation.id));
const records = (catalog = plans) => parseLedger('audit/frontier.md', ledger, ids, {
  compoundPlans: catalog,
}).find((section) => section.slug === 'competing-theses')!.claimRecords;

describe('Brooks source-backed thesis corrections', () => {
  it.each(ordinals)('preserves original %i with complete, reviewed mandatory parts', (ordinal) => {
    const plan = plans.find((candidate) => candidate.id === `competing-theses-brooks-${ordinal}-20260913`);
    expect(plan).toBeDefined();
    if (!plan) return;
    expect(plan.parts.map((part) => part.id)).toEqual(expectedParts[ordinals.indexOf(ordinal)]);
    expect(plan.planReview?.planDigest).toBe(compoundPlanDigest(plan));
    expect(records()[ordinal - 1].evidenceFailures).toEqual([]);
    expect(records()[ordinal - 1].note).toContain('Original four-cell tuple (JSON):');
    for (const item of plan.evidence) {
      expect(item.sourceUrl).toBe(urls[item.citationId]);
      expect(item.supportingPassage.length).toBeGreaterThan(60);
    }
    for (const adjudication of plan.adjudications) {
      expect(adjudication.outcome).toBe('supported');
      expect(adjudication.evidenceDigest).toBe(compoundPartDigest(plan, adjudication.partId));
    }
  });

  it('keeps repeated historical claims as distinct immutable originals', () => {
    const selected = records();
    for (const [first, second] of [[3, 10], [5, 11]]) {
      expect(selected[first - 1].compound?.planId).toBeDefined();
      expect(selected[first - 1].compound?.planId).not.toBe(selected[second - 1].compound?.planId);
      expect(selected[first - 1].note).not.toBe(selected[second - 1].note);
    }
  });

  it('attributes the word comparison to Brooks rather than recounting Sutton', () => {
    expect(article).toContain('paraphrases Sutton and describes itself, including its closing comment');
    expect(article).not.toContain("in a reply he kept seventy-six words shorter");
    expect(article).toContain('lastReviewed: "2026-08-18"');
  });

  it('preserves implementation variation and the acknowledged learning gains', () => {
    const against = THESES[0].evidenceAgainst[0];
    expect(against.citationIds).toEqual(['brooks-better-lesson-2019', 'brooks-dexterity-2025']);
    expect(against.text).toContain('lists FFTs and Mel filter banks among');
    expect(against.text).toContain('implementation-dependent');
    expect(against.text).toContain('leaving as much as possible to learning was critical');
    expect(article).toContain('implementations use different selections');
    expect(article).toContain('He also acknowledges');
    expect(article).not.toMatch(/\bMFCCs?\b/);
  });

  it('limits the humanoid forecast while retaining its counterqualifications', () => {
    const against = THESES[5].evidenceAgainst[0];
    expect(against.citationIds).toEqual(['brooks-dexterity-2025']);
    for (const term of ['plug-compatible', 'lower prices', 'equal competence', 'robustness, force and lifetime', 'Baxter and Sawyer', 'task-specialized', 'fifteen years']) {
      expect(against.text).toContain(term);
    }
    expect(against.text).toContain('his assessments rather than an industry census');
    expect(article).toContain('plug-compatible humanoids replacing people');
    expect(article).not.toContain('Brooks calls practical humanoids within decades');
    expect(article).toContain('Figure, Tesla, 1X, Apptronik, and Unitree');
  });
});
