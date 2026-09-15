import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { CITATIONS } from '../../data/citations';
import {
  compoundPartDigest, compoundPlanDigest, originalClaimDigest,
  parseCompoundPlans, parseLedger,
} from '../../lib/audit-ledger';

const text = readFileSync('content/frontier/dexterity.mdx', 'utf8');
const ledger = readFileSync('audit/frontier.md', 'utf8');
const plans = parseCompoundPlans(JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8')));
const ids = new Set(CITATIONS.map(c => c.id));
const holsonURL = 'https://generalrobots.substack.com/p/benjies-humanoid-olympic-games';
const outlookAbsURL = 'https://arxiv.org/abs/2508.11261';
const outlookHtmlURL = 'https://arxiv.org/html/2508.11261';
const records = (catalog = plans) => parseLedger('audit/frontier.md', ledger, ids, {
  compoundPlans: catalog,
}).find(s => s.slug === 'dexterity')!.claimRecords;
const plan = (id: string) => {
  const selected = plans.filter(p => p.id === id);
  expect(selected).toHaveLength(1);
  return selected[0];
};
const holsonPlan = () => plan('dexterity-holson-pipeline-source-20260915');
const outlookPlan = () => plan('dexterity-tactile-outlook-source-20260915');
const keyringPlan = () => plan('dexterity-keyring-rules-source-20260915');

describe('Holson pipeline original10 correction', () => {
  test('completes exactly native original10 with a reviewed C, not its historical V', () => {
    expect(records()).toHaveLength(30);
    expect(records()[9].verdict).toBe('C');
    expect(records()[9].evidenceFailures).toEqual([]);
    const p = holsonPlan();
    expect(p.rowOrdinal).toBe(10);
    expect(p.originalCellsDigest).toBe(originalClaimDigest(records()[9]));
  });

  test('retains all seven mandatory parts and part-source pairs', () => {
    const p = holsonPlan();
    expect(p.parts.map(part => part.id)).toEqual([
      'holson-identity', 'dated-setup-and-exceptions', 'operator-force-feedback',
      'finger-control', 'touch-for-puppeteer', 'video-based-precision-guess',
      'precision-qualification-and-counterexample',
    ]);
    expect(p.evidence).toHaveLength(7);
    for (const e of p.evidence) {
      expect(e.citationId).toBe('holson-olympics-2025');
      expect(e.sourceUrl).toBe(holsonURL);
      expect(e.supportingPassage.length).toBeGreaterThan(40);
    }
  });

  test('keeps the operator-interface, exception and guessed-precision distinctions', () => {
    const e = holsonPlan().evidence;
    expect(e.find(x => x.partId === 'operator-force-feedback')!.supportingPassage)
      .toContain("we don’t yet have good standard ways of getting force information to the human teleoperator");
    expect(e.find(x => x.partId === 'dated-setup-and-exceptions')!.supportingPassage)
      .toContain('Each of these has exceptions, but form a general trend.');
    expect(e.find(x => x.partId === 'video-based-precision-guess')!.supportingPassage)
      .toContain('Guessing based on videos I think we’ve got about 1-3 cm precision for tasks.');
    expect(e.find(x => x.partId === 'precision-qualification-and-counterexample')!.supportingPassage)
      .toContain('likely more a teleoperation precision limitation than a model limitation');
  });

  test('applies the dated, exception-qualified article prose and removes the analogy', () => {
    expect(text).toContain('In his September 8, 2025 post, Benjie Holson described limitations of the learning-from-demonstration setups he was seeing');
    expect(text).toContain('explicitly calling them a general trend with exceptions');
    expect(text).toContain('His estimate of about 1 to 3 cm of task precision was a guess from videos');
    expect(text).not.toContain('Each limitation is a tactile limitation');
    expect(text).not.toContain('cataloged the limitations');
  });
});

describe('Tactile outlook original11 correction', () => {
  test('completes exactly native original11 with a reviewed C', () => {
    expect(records()[10].verdict).toBe('C');
    expect(records()[10].evidenceFailures).toEqual([]);
    const p = outlookPlan();
    expect(p.rowOrdinal).toBe(11);
    expect(p.originalCellsDigest).toBe(originalClaimDigest(records()[10]));
  });

  test('retains all seven mandatory parts with both outlook URLs', () => {
    const p = outlookPlan();
    expect(p.parts.map(part => part.id)).toEqual([
      'outlook-bibliographic-identity', 'outlook-version-and-venue-scope',
      'outlook-definition', 'outlook-plural-framing', 'outlook-challenge-areas',
      'outlook-integration-substance', 'outlook-coverage-limits',
    ]);
    expect(p.evidence).toHaveLength(7);
    const urls = new Set(p.evidence.map(e => e.sourceUrl));
    expect(urls).toEqual(new Set([outlookAbsURL, outlookHtmlURL]));
  });

  test('binds the definition, plural challenges and coverage limits, not stick-slip', () => {
    const e = outlookPlan().evidence;
    expect(e.find(x => x.partId === 'outlook-definition')!.supportingPassage)
      .toContain('we define tactile robotics as a field of robotics that focuses on the development');
    expect(e.find(x => x.partId === 'outlook-plural-framing')!.supportingPassage)
      .toContain('numerous emerging applications');
    expect(e.find(x => x.partId === 'outlook-coverage-limits')!.supportingPassage)
      .toContain('Due to space limitations, several important topics have not been covered');
    for (const item of e) {
      expect(item.supportingPassage.toLowerCase()).not.toContain('stick-slip');
    }
  });

  test('applies the plural-challenge article prose and cuts the amplification attribution', () => {
    expect(text).toContain('Luo and colleagues define tactile robotics as developing and integrating tactile-sensing technologies into robotic systems.');
    expect(text).toContain('challenges across sensor materials, networks, simulation, benchmarking, data interpretation, multimodal learning, and active touch');
    expect(text).not.toContain('the 2025 tactile robotics outlook defines the field as integrating touch sensing into robotic systems and works through its open challenges');
    expect(text).not.toContain('stick flips to slip across a friction boundary, so a small sensing error at the fingertip becomes a large error at the task level');
  });
});

describe('Holson keyring original28 correction', () => {
  test('completes exactly native original28 with a reviewed C, not its historical V', () => {
    expect(records()[27].verdict).toBe('C');
    expect(records()[27].evidenceFailures).toEqual([]);
    const p = keyringPlan();
    expect(p.rowOrdinal).toBe(28);
    expect(p.originalCellsDigest).toBe(originalClaimDigest(records()[27]));
  });

  test('retains all six mandatory parts and part-source pairs', () => {
    const p = keyringPlan();
    expect(p.parts.map(part => part.id)).toEqual([
      'keyring-author-and-date', 'gold-tool-use-initial-condition',
      'keyring-action-sequence', 'author-described-task-difficulty',
      'general-eligibility-context', 'challenge-not-performance',
    ]);
    expect(p.evidence).toHaveLength(6);
    for (const e of p.evidence) {
      expect(e.citationId).toBe('holson-olympics-2025');
      expect(e.sourceUrl).toBe(holsonURL);
    }
  });

  test('binds the initial condition, no-putting-down rule and challenge framing', () => {
    const e = keyringPlan().evidence;
    expect(e.find(x => x.partId === 'keyring-action-sequence')!.supportingPassage)
      .toContain('A keyring with at least 2 keys and a keychain is dropped into the robot’s waiting palm/gripper');
    expect(e.find(x => x.partId === 'keyring-action-sequence')!.supportingPassage)
      .toContain('Without putting the keys down,');
    expect(e.find(x => x.partId === 'challenge-not-performance')!.supportingPassage)
      .toContain('I will update this post as folks achieve');
  });

  test('applies both atomic article endpoints together', () => {
    expect(text).toContain('a keyring with at least two keys and a keychain is dropped into the robot\'s waiting palm or gripper');
    expect(text).toContain('Without putting the keys down, the robot must align, insert, and turn the correct key in a lock');
    expect(text).toContain('These are challenge rules, not a report that a robot completed the task.');
    expect(text).toContain('Each is a task or a task family with its own training run.');
    expect(text).not.toContain('the key-in-lock gold medal sat unclaimed');
    expect(text).not.toContain('the robot is handed a keyring and must align and turn the correct key without putting it down');
    expect(text).not.toContain("or not run at all. Holson's Robot Olympics makes it the gold-medal bar for tool use");
  });
});

describe('Shared review, adjudication and preservation bindings', () => {
  test.each([
    ['dexterity-holson-pipeline-source-20260915', 7],
    ['dexterity-tactile-outlook-source-20260915', 7],
    ['dexterity-keyring-rules-source-20260915', 6],
  ] as const)('%s has a genuine plan review and %i digest-bound supported adjudications',
    (id, adjudicationCount) => {
      const p = plan(id);
      expect(p.planReview?.planDigest).toBe(compoundPlanDigest(p));
      expect(p.planReview?.rationale.length).toBeGreaterThan(100);
      expect(p.adjudications).toHaveLength(adjudicationCount);
      for (const a of p.adjudications) {
        expect(a.outcome).toBe('supported');
        expect(a.evidenceDigest).toBe(compoundPartDigest(p, a.partId));
        expect(a.rationale.length).toBeGreaterThan(100);
      }
    });

  test('preserves the exact original rows as non-counted history and the review date', () => {
    expect(ledger).toContain('Non-counted exact original/current row history:');
    expect(records()[9].sourceChecked).toContain('2026-09-14');
    expect(records()[10].sourceChecked).toContain('2026-09-14');
    expect(records()[27].sourceChecked).toContain('2026-09-14');
    expect(text).toContain('lastReviewed: "2026-08-18"');
  });

  test.each(['review', 'adjudication', 'pair', 'url', 'stale', 'passage'] as const)(
    'native gate refuses missing or stale %s on each new plan',
    mutation => {
      for (const id of ['dexterity-holson-pipeline-source-20260915',
        'dexterity-tactile-outlook-source-20260915',
        'dexterity-keyring-rules-source-20260915']) {
        const mutated = structuredClone(plans);
        const q = mutated.find(candidate => candidate.id === id)!;
        if (mutation === 'review') q.planReview = null;
        if (mutation === 'adjudication') q.adjudications = q.adjudications.slice(1);
        if (mutation === 'pair') q.evidence = q.evidence.slice(1);
        if (mutation === 'url') q.evidence[0].sourceUrl = 'https://example.org/wrong';
        if (mutation === 'stale') q.originalCellsDigest = '0'.repeat(64);
        if (mutation === 'passage') q.evidence[0].supportingPassage += ' invented';
        const row = q.rowOrdinal === 10 ? 9 : q.rowOrdinal === 11 ? 10 : 27;
        expect(records(mutated)[row].evidenceFailures.length).toBeGreaterThan(0);
      }
    },
  );
});
