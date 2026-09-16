import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { CITATIONS } from '../../data/citations';
import { DEXTEROUS_HANDS } from '../../lib/dexterous-hands';
import {
  compoundPartDigest, compoundPlanDigest, originalClaimDigest,
  parseCompoundPlans, parseLedger,
} from '../../lib/audit-ledger';

const text = readFileSync('content/frontier/dexterity.mdx', 'utf8');
const ledger = readFileSync('audit/frontier.md', 'utf8');
const rawPlans = JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8'));
const plans = parseCompoundPlans(rawPlans);
const deltas = JSON.parse(
  readFileSync('contract/brand-v2-approved-deltas.json', 'utf8'),
) as { entries: Array<Record<string, unknown>> };
const ids = new Set(CITATIONS.map((c) => c.id));
const records = parseLedger('audit/frontier.md', ledger, ids, {
  compoundPlans: plans,
}).find((s) => s.slug === 'dexterity')!.claimRecords;

/** The 15 dispatched ordinals, exercised through the BINDINGS table below. */
const byOrdinal = (n: number) => records[n - 1];
const plan = (id: string) => {
  const selected = plans.filter((p) => p.id === id);
  expect(selected).toHaveLength(1);
  return selected[0];
};

const BINDINGS: ReadonlyArray<{
  ordinal: number;
  planId: string;
  verdict: string;
  passage: string;
}> = [
  { ordinal: 9, planId: 'dexterity-9-macefield-receptors-20260915', verdict: 'V', passage: 'about 17,000 low-threshold mechanoreceptors in the glabrous skin' },
  { ordinal: 13, planId: 'dexterity-13-fishel-wells-quotes-20260915', verdict: 'C', passage: 'a key enabler for creating human-level dexterity in robots and critical for physical AI' },
  { ordinal: 14, planId: 'dexterity-14-phoenix-hydraulic-tactile-20260915', verdict: 'C', passage: 'seven-cell tactile array to each fingerpad' },
  { ordinal: 16, planId: 'dexterity-16-shadow-specs-cost-20260915', verdict: 'V', passage: 'over 100 sensors running at up to 1KHz' },
  { ordinal: 17, planId: 'dexterity-17-sparsh-x-20260915', verdict: 'C', passage: 'boosts policy success rates by 63% over an end-to-end model using tactile images' },
  { ordinal: 18, planId: 'dexterity-18-touchworld-20260915', verdict: 'C', passage: 'achieves 65.0% success in the clean setting' },
  { ordinal: 19, planId: 'dexterity-19-gr2-multifinger-20260915', verdict: 'V', passage: '22 degree-of-freedom SharpaWave hand' },
  { ordinal: 20, planId: 'dexterity-20-optimus-v3-20260915', verdict: 'C', passage: "This one didn't actually work." },
  { ordinal: 21, planId: 'dexterity-21-sanctuary-pivot-20260915', verdict: 'V', passage: 'pivoted to deploying its "Physical AI" software on other companies' },
  { ordinal: 22, planId: 'dexterity-22-unitree-h2-20260915', verdict: 'V', passage: 'non-functional placeholder hands' },
  { ordinal: 24, planId: 'dexterity-24-table-synthesis-20260915', verdict: 'C', passage: "about five millinewtons against a human finger's roughly three" },
  { ordinal: 26, planId: 'dexterity-26-inhand-20260915', verdict: 'C', passage: '21 degrees of freedom (DOF) dexterous robotic hands can perform in-hand manipulation' },
  { ordinal: 27, planId: 'dexterity-27-hydraulic-rl-20260915', verdict: 'V', passage: 'against gravity and with 500 grams of weight added' },
  { ordinal: 29, planId: 'dexterity-29-rl100-pi07-20260915', verdict: 'V', passage: 'The same π0.7 model can perform the laundry folding, espresso making' },
  { ordinal: 30, planId: 'dexterity-30-pi-olympics-20260915', verdict: 'C', passage: 'under 9 hours for most' },
];

describe('dexterity originals integration (packet convergence-source-c-dexterity-20260915)', () => {
  test('all 30 dexterity rows carry complete compound evidence', () => {
    expect(records).toHaveLength(30);
    for (const record of records) {
      expect(record.evidenceFailures).toEqual([]);
    }
  });

  test.each(BINDINGS)(
    'row $ordinal binds $planId with reviewed plan and supported adjudications',
    ({ ordinal, planId, verdict, passage }) => {
      const record = byOrdinal(ordinal);
      expect(record.verdict).toBe(verdict);
      expect(record.citationId).toBe('');
      expect(record.sourceUrl).toBe('');
      expect(record.supportingPassage).toBe('');
      const p = plan(planId);
      expect(p.rowOrdinal).toBe(ordinal);
      expect(p.ledgerPath).toBe('audit/frontier.md');
      expect(p.articleSlug).toBe('dexterity');
      expect(p.kind).toBe('explicit-parts');
      expect(p.originalCellsDigest).toBe(originalClaimDigest(record));
      expect(p.planReview?.planDigest).toBe(compoundPlanDigest(p));
      expect(p.planReview?.reviewedBy).toContain('dexterity-integrator-20260915');
      expect(p.planReview?.reviewedBy).toContain('custom:GLM-[Z.AI-Coding-Plan]---Anthropic-2');
      expect(p.adjudications.map((a) => a.partId)).toEqual(p.parts.map((part) => part.id));
      for (const adjudication of p.adjudications) {
        expect(adjudication.outcome).toBe('supported');
        expect(adjudication.evidenceDigest).toBe(compoundPartDigest(p, adjudication.partId));
        expect(adjudication.rationale).toContain('needle-verified');
      }
      const covering = p.evidence.filter(
        (item) => item.partId === p.parts[0]!.id,
      );
      expect(covering.length).toBeGreaterThanOrEqual(1);
      expect(
        p.evidence.some((item) => item.supportingPassage.includes(passage)),
      ).toBe(true);
      for (const item of p.evidence) {
        expect(ids.has(item.citationId)).toBe(true);
        expect(item.sourceUrl).toMatch(/^https?:\/\//);
        expect(item.supportingPassage.length).toBeGreaterThan(30);
      }
    },
  );

  test('packet source-cell corrections are recorded in the row notes', () => {
    expect(byOrdinal(13).note).toContain('a key enabler for creating human-level dexterity in robots');
    expect(byOrdinal(14).note).toContain('fingerpad, not fingertip');
    expect(byOrdinal(17).note).toContain("drop 'raw'");
    expect(byOrdinal(18).note).toContain('Tactile-Conditioned Refinement Policy');
    expect(byOrdinal(19).note).toContain("page's own text");
    expect(byOrdinal(21).note).toContain('June 17');
    expect(byOrdinal(22).note).toContain('July 17, 2026');
    expect(byOrdinal(26).note).toContain('never uses "zero-shot"');
    expect(byOrdinal(30).note).toContain('for most tasks');
  });

  test('row 20 keeps the Teslarati/DROIDS provenance distinction', () => {
    const p = plan('dexterity-20-optimus-v3-20260915');
    const quote = p.evidence.find((item) => item.partId === 'd20-musk-quote')!;
    expect(quote.citationId).toBe('teslarati-optimus-hand-2026');
    expect(quote.sourceUrl).toBe(
      'https://www.teslarati.com/elon-musk-reveals-shocking-tesla-optimus-patent-detail/',
    );
    expect(quote.supportingPassage).toContain('11:58 PM · Apr 19, 2026');
    const tendon = p.evidence.find((item) => item.partId === 'd20-22dof-tendon')!;
    expect(tendon.citationId).toBe('droids-optimus-v3-hand-2026');
    expect(byOrdinal(20).note).toContain('Apr 21');
  });

  test('row 24 local AND: 3 g converts to 29.4 mN and ~6x against 5 mN', () => {
    const millinewtons = 3 * 9.80665;
    expect(millinewtons.toFixed(1)).toBe('29.4');
    expect(millinewtons / 5).toBeGreaterThan(5.5);
    expect(millinewtons / 5).toBeLessThan(6.5);
    const figure = DEXTEROUS_HANDS.find((hand) => hand.id === 'figure-02-03')!;
    expect(figure.tactileSort).toBe(29.4);
    expect(figure.tactileDisplay).toBe('3 g');
    const sanctuary = DEXTEROUS_HANDS.find((hand) => hand.id === 'sanctuary-phoenix')!;
    expect(sanctuary.tactileSort).toBe(5);
    expect(sanctuary.sourceId).toBe('robozaps-phoenix-2026');
    const tesla = DEXTEROUS_HANDS.find((hand) => hand.id === 'tesla-optimus-gen3')!;
    expect(tesla.secondarySourceId).toBe('teslarati-optimus-hand-2026');
    const unitree = DEXTEROUS_HANDS.find((hand) => hand.id === 'unitree-h2')!;
    expect(unitree.secondarySourceId).toBe('wikipedia-humanoid-hand-2026');
    expect(byOrdinal(24).note).toContain('only maker here publishing a force threshold on its own product page');
  });

  test('article endpoints applied: new spans present, old spans gone', () => {
    expect(text).toContain('calls touch a key enabler for creating human-level dexterity in robots');
    expect(text).not.toContain('calls touch the key enabler for human-level dexterity');
    expect(text).toContain('fingerpad arrays of micro-barometer cells');
    expect(text).not.toContain('fingertip arrays of micro-barometer');
    expect(text).toContain('using tactile images');
    expect(text).not.toContain('using raw tactile images');
    expect(text).toContain('a fast tactile refinement policy');
    expect(text).not.toContain('a fast reflexive policy');
    expect(text).toContain('with under nine hours of data for most tasks');
  });

  test('append-only catalog and approvals preserve every prior object', () => {
    expect(plans).toHaveLength(657 + 15);
    expect(deltas.entries).toHaveLength(731 + 15);
    const mine = new Set(BINDINGS.map((b) => b.planId));
    const deltaIds = new Set(
      deltas.entries.slice(731).map((entry) => entry.id as string),
    );
    expect(deltaIds.size).toBe(15);
    for (const entry of deltas.entries.slice(731)) {
      expect(entry.manifest).toBe('prose');
      expect(entry.memberId).toBe('article:frontier/dexterity');
      expect(entry.disposition).toBe('permanent');
    }
    const endpointEntries = deltas.entries
      .slice(731)
      .filter((entry) => entry.oldHash !== entry.newHash);
    expect(endpointEntries).toHaveLength(4);
    const sealed = '4d026108b52862335e8cb734302d77aa271ce33ffb94bdd36d80d98c3b2cb4f4';
    for (const entry of endpointEntries) {
      expect(entry.oldHash).toBe(sealed);
    }
    const newHashes = new Set(
      deltas.entries.slice(731).map((entry) => entry.newHash as string),
    );
    expect(newHashes.size).toBe(1);
    expect(plans.filter((p) => mine.has(p.id)).length).toBe(15);
  });
});
