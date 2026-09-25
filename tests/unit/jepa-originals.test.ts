import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseLedger, parseCompoundPlans } from '../../lib/audit-ledger.ts';
import { CITATIONS } from '../../data/citations.ts';

/**
 * Pins the 2026-09-16j jepa-originals integration: the five dispatched
 * world-models/jepa rows (originals 4, 9, 10, 11 and 14 — the AMI raise
 * Stat, the LeCun-departure row that required registering the January
 * TechCrunch piece, the raise-terms row, the LeBrun quote and the P5
 * disagreement-representation row) must bind to their compound plans and
 * parse complete (no evidence failures) with supported adjudications, from
 * the committed ledger and catalog exactly as check-audit-coverage reads
 * them. No row was parent-held for this slug; the nine pre-existing
 * jepa bindings from earlier passes must survive untouched.
 */
const ROOT = join(import.meta.dirname, '../..');
const PACKET_SHA = '09d53ff85358962c9df424bf5072c22036d71515873610a62ab1c620a4ffb843';
const MARCH_URL =
  'https://techcrunch.com/2026/03/09/yann-lecuns-ami-labs-raises-1-03-billion-to-build-world-models/';
const JANUARY_URL =
  'https://techcrunch.com/2026/01/23/whos-behind-ami-labs-yann-lecuns-world-model-startup/';
const EXPECTED_20260916J: Readonly<Record<number, string>> = {
  4: 'jepa-4-ami-raise-stat-20260916j',
  9: 'jepa-9-lecun-departure-cofounding-20260916j',
  10: 'jepa-10-raise-terms-20260916j',
  11: 'jepa-11-lebrun-quote-20260916j',
  14: 'jepa-14-disagreement-representation-20260916j',
};
const PREEXISTING_BINDINGS: Readonly<Record<number, string>> = {
  1: 'jepa-source-closeout-jepa-1-20260908',
  12: 'performance-worldmodels-jepa-12-20260908',
  13: 'performance-worldmodels-jepa-13-20260908',
};

const loadSection = () => {
  const markdown = readFileSync(join(ROOT, 'audit/world-models.md'), 'utf8');
  const compoundPlans = parseCompoundPlans(
    JSON.parse(readFileSync(join(ROOT, 'audit/compound-evidence.json'), 'utf8')),
  );
  const registryIds = new Set(CITATIONS.map(({ id }) => id));
  const sections = parseLedger('audit/world-models.md', markdown, registryIds, { compoundPlans });
  const jepa = sections.find((section) => section.slug === 'jepa');
  expect(jepa).toBeDefined();
  return { jepa: jepa!, compoundPlans };
};

describe('jepa originals integration (2026-09-16j evidence completions)', () => {
  it('binds the five applied jepa rows to complete compound evidence', () => {
    const { jepa, compoundPlans } = loadSection();
    expect(jepa.claimRecords).toHaveLength(14);
    for (const [ordinal, planId] of Object.entries(EXPECTED_20260916J)) {
      const record = jepa.claimRecords[Number(ordinal) - 1];
      expect(record.claim).toContain(' ');
      expect(record.compound?.planId ?? '').toBe(planId);
      expect(record.compound?.structuralFailures ?? ['missing']).toEqual([]);
      expect(record.compound?.adjudicationFailures ?? ['missing']).toEqual([]);
      expect(record.evidenceFailures).toEqual([]);
      const plan = compoundPlans.find((p) => p.id === planId)!;
      expect(plan.adjudications.map((a) => a.outcome)).toEqual(
        plan.parts.map(() => 'supported'),
      );
    }
  });

  it('carries the TechCrunch evidence needles in the bound rows and plans', () => {
    const { jepa, compoundPlans } = loadSection();

    // Row 4: evidence completion of the standing C verdict on the AMI-raise
    // Stat; the sourceChecked cell records the registered-URL fetch of
    // record, and the relabel away from "seed" stands.
    const r4 = jepa.claimRecords[3];
    expect(r4.sourceChecked).toContain('ami-labs-2026');
    expect(r4.sourceChecked).toContain(MARCH_URL);
    expect(r4.sourceChecked).toContain('2026-09-16T15:15:32Z');
    expect(r4.note).toContain('Relabeled "AMI raise"');

    // Row 9: both TechCrunch pieces, one registered now (January) and one
    // already registered (March); the CEO-name alias disclosure stays. The
    // prepared cell names ids and dates; both URLs are asserted on the
    // row-9 plan evidence below.
    const r9 = jepa.claimRecords[8];
    expect(r9.sourceChecked).toContain('ami-labs-2026 (2026-03-09, registered)');
    expect(r9.sourceChecked).toContain('ami-labs-founding-2026 (2026-01-23');
    expect(r9.sourceChecked).toContain('both fetched live 2026-09-16');
    expect(r9.note).toContain("January piece prints 'executive chairman, not its CEO'");
    expect(r9.note).toContain("'AMI Labs CEO Alexandre LeBrun'");

    // Row 10: the financial core verified, the cut superlative confirmed
    // absent from the fetched page.
    const r10 = jepa.claimRecords[9];
    expect(r10.sourceChecked).toContain(MARCH_URL);
    expect(r10.note).toContain('"one of the largest seed rounds on record" appears nowhere in the source');

    // Row 11: verbatim quote with the splice disclosed in the note.
    const r11 = jepa.claimRecords[10];
    expect(r11.sourceChecked).toContain(MARCH_URL);
    expect(r11.note).toContain("splices the source's two quote spans with a period");
    expect(r11.note).toContain('no quoted word altered');

    // Row 14: precise source correction — the cell now names the registered
    // evidence set both camps actually carry, and the Table 5 exactness.
    const r14 = jepa.claimRecords[13];
    expect(r14.sourceChecked).toContain('JEPA camp: ami-labs-2026 + vjepa-2024 + vjepa2-2025');
    expect(r14.sourceChecked).toContain(
      'genie-3-2025 + cosmos-3-2026 + odyssey-2-2025 + interactive-world-simulator-2026 + fast-wam-2026',
    );
    expect(r14.sourceChecked).toContain('world-model-survey-2026 Table 5');
    expect(r14.note).toContain('98.5/98.1 vs 97.2/96.4');
    expect(r14.note).toContain('nothing in the numbers adjudicates the argument');

    // The plans carry the exact passages against the fetched URLs.
    const byId = (planId: string) => compoundPlans.find((p) => p.id === planId)!;
    const byPart = (planId: string, partId: string, citationId: string) =>
      byId(planId).evidence.find(
        (item) => item.partId === partId && item.citationId === citationId,
      )!;
    expect(
      byPart(EXPECTED_20260916J[4], 'j4-raise-amount-and-date', 'ami-labs-2026').supportingPassage,
    ).toContain('has raised $1.03 billion at a $3.5 billion pre-money valuation');
    expect(
      byPart(EXPECTED_20260916J[4], 'j4-raise-amount-and-date', 'ami-labs-2026').supportingPassage,
    ).toContain('Anna Heim 10:00 PM PDT · March 9, 2026');
    expect(
      byPart(EXPECTED_20260916J[4], 'j4-not-a-seed', 'ami-labs-2026').supportingPassage,
    ).toContain("SpAItial raised a $13 million seed round");
    expect(
      byPart(EXPECTED_20260916J[9], 'j9-departure-and-cofounding', 'ami-labs-2026').sourceUrl,
    ).toBe(MARCH_URL);
    expect(
      byPart(EXPECTED_20260916J[9], 'j9-departure-and-cofounding', 'ami-labs-2026').supportingPassage,
    ).toContain('after he left Meta');
    const jan = byPart(EXPECTED_20260916J[9], 'j9-ami-expansion', 'ami-labs-founding-2026');
    expect(jan.sourceUrl).toBe(JANUARY_URL);
    expect(jan.supportingPassage).toContain('left Meta to found it');
    expect(jan.supportingPassage).toContain('which stands for Advanced Machine Intelligence');
    expect(
      byPart(EXPECTED_20260916J[10], 'j10-verified-core', 'ami-labs-2026').supportingPassage,
    ).toContain('AMI is working on world models, or AI that learns from reality, not just from language');
    expect(
      byPart(EXPECTED_20260916J[10], 'j10-superlative-cut', 'ami-labs-2026').supportingPassage,
    ).toContain("World Labs secured a whopping $1 billion");
    expect(
      byPart(EXPECTED_20260916J[10], 'j10-superlative-cut', 'ami-labs-2026').supportingPassage,
    ).toContain('seeking just €500 million');
    expect(
      byPart(EXPECTED_20260916J[11], 'j11-quote-verbatim', 'ami-labs-2026').supportingPassage,
    ).toBe(
      `"My prediction is that 'world models' will be the next buzzword," AMI Labs CEO Alexandre LeBrun told TechCrunch. "In six months, every company will call itself a world model to raise funding."`,
    );
    const table5 = byPart(
      EXPECTED_20260916J[14], 'j14-survey-comparability', 'world-model-survey-2026',
    ).supportingPassage;
    for (const seq of [
      '96.2 99.6 97.2 95.8 97.2',
      '97.2 98.0 95.6 94.8 96.4',
      '99.4 99.2 98.6 95.4 98.1',
      '98.1 100.0 98.2 97.6 98.5',
      '98.5 99.6 97.2 98.5 98.5',
    ]) {
      expect(table5).toContain(seq);
    }
    const vjepa1Body = byPart(
      EXPECTED_20260916J[14], 'j14-counterargument-fidelity-vjepa1-body', 'vjepa-2024',
    ).supportingPassage;
    expect(vjepa1Body).toContain('would admit a trivial solution, where the encoder outputs a constant representation');
    expect(vjepa1Body).toContain(
      'V-JEPA is not a generative model and the decoder does not have access to the context',
    );
    // Evidence coverage equals exactly the required (part, citation) pairs.
    const p14 = byId(EXPECTED_20260916J[14]);
    expect(p14.evidence).toHaveLength(10);
    expect(p14.parts).toHaveLength(4);
    expect(new Set(p14.evidence.map((i) => `${i.partId}/${i.citationId}`))).toEqual(new Set([
      'j14-jepa-camp-named-proponent/ami-labs-2026',
      'j14-jepa-camp-named-proponent/vjepa-2024',
      'j14-jepa-camp-named-proponent/vjepa2-2025',
      'j14-generative-camp-named-proponents/genie-3-2025',
      'j14-generative-camp-named-proponents/cosmos-3-2026',
      'j14-generative-camp-named-proponents/odyssey-2-2025',
      'j14-generative-camp-named-proponents/interactive-world-simulator-2026',
      'j14-generative-camp-named-proponents/fast-wam-2026',
      'j14-survey-comparability/world-model-survey-2026',
      'j14-counterargument-fidelity-vjepa1-body/vjepa-2024',
    ]));
  });

  it('registers ami-labs-founding-2026 exactly once and reuses every other id read-only', () => {
    const registered = new Map(CITATIONS.map((c) => [c.id, c]));
    const jan = registered.get('ami-labs-founding-2026')!;
    expect(jan.url).toBe(JANUARY_URL);
    expect(jan.year).toBe(2026);
    expect(jan.venue).toBe('TechCrunch');
    expect(jan.title).toBe("Who's behind AMI Labs, Yann LeCun's 'world model' startup");
    expect(jan.authors).toEqual(['Anna Heim']);
    // The March piece stays the registered raise citation, untouched.
    const mar = registered.get('ami-labs-2026')!;
    expect(mar.url).toBe(MARCH_URL);
    expect(mar.title).toBe("Yann LeCun's AMI Labs raises $1.03B to build world models");
    // The row-14 evidence set resolves read-only.
    for (const id of [
      'vjepa-2024', 'vjepa2-2025', 'world-model-survey-2026', 'genie-3-2025',
      'cosmos-3-2026', 'odyssey-2-2025', 'interactive-world-simulator-2026', 'fast-wam-2026',
    ]) {
      expect(registered.get(id)).toBeDefined();
    }
    // Exactly one registration URL per TechCrunch piece, no duplicates.
    expect(CITATIONS.filter((c) => c.url === JANUARY_URL)).toHaveLength(1);
    expect(CITATIONS.filter((c) => c.url === MARCH_URL)).toHaveLength(1);
  });

  it('keeps the nine pre-existing jepa bindings intact', () => {
    const { jepa } = loadSection();
    for (const [ordinal, planId] of Object.entries(PREEXISTING_BINDINGS)) {
      const record = jepa.claimRecords[Number(ordinal) - 1];
      expect(record.compound?.planId ?? '').toBe(planId);
      expect(record.evidenceFailures).toEqual([]);
    }
  });

  it('records integrator plan review on every 20260916j jepa plan', () => {
    const { compoundPlans } = loadSection();
    for (const planId of Object.values(EXPECTED_20260916J)) {
      const plan = compoundPlans.find((p) => p.id === planId)!;
      expect(plan.planReview?.reviewedBy).toMatch(/^integrator (?:[0-9a-f]{8}|techwithdraw-20260924)\b/);
      expect(plan.planReview?.rationale).toContain(PACKET_SHA);
    }
  });
});
