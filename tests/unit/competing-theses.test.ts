import { describe, expect, it } from 'vitest';
import { getCitation } from '@/data/citations';
import {
  DEFAULT_THESIS_ID,
  THESES,
  thesisSchema,
} from '@/lib/competing-theses';

const EXPECTED_IDS = [
  'end-to-end-vla',
  'hierarchical-planner',
  'world-model-training',
  'rl-finetuning',
  'teleop-bridge',
  'form-factor',
];

describe('competing theses data', () => {
  it('contains exactly the six live theses, in presentation order', () => {
    expect(THESES.map((t) => t.id)).toEqual(EXPECTED_IDS);
  });

  it('gives every thesis all four required fields, non-empty', () => {
    for (const thesis of THESES) {
      expect(thesis.proponents.length).toBeGreaterThanOrEqual(1);
      expect(thesis.evidenceFor.length).toBeGreaterThanOrEqual(1);
      expect(thesis.evidenceAgainst.length).toBeGreaterThanOrEqual(1);
      expect(thesis.falsification.trim().length).toBeGreaterThan(0);
    }
  });

  it('resolves every citation id used anywhere in the data', () => {
    for (const thesis of THESES) {
      for (const item of [...thesis.evidenceFor, ...thesis.evidenceAgainst]) {
        for (const id of item.citationIds) {
          expect(
            getCitation(id),
            `thesis ${thesis.id} cites unknown id "${id}"`,
          ).toBeDefined();
        }
      }
    }
  });

  it('cites at least two distinct sources per thesis (both-sides discipline)', () => {
    for (const thesis of THESES) {
      const ids = new Set(
        [...thesis.evidenceFor, ...thesis.evidenceAgainst].flatMap(
          (item) => item.citationIds,
        ),
      );
      expect(ids.size, `thesis ${thesis.id}`).toBeGreaterThanOrEqual(2);
    }
  });

  it('keeps the row-level falsification signal compact enough for a table cell', () => {
    for (const thesis of THESES) {
      expect(thesis.falsificationSignal.length).toBeLessThanOrEqual(48);
    }
  });

  it('opens on the end-to-end scaling thesis by default', () => {
    expect(DEFAULT_THESIS_ID).toBe('end-to-end-vla');
  });
});

describe('thesisSchema (the build-time completeness gate)', () => {
  const valid = THESES[0] ?? {
    id: 'x',
    name: 'x',
    claim: 'x',
    proponents: ['x'],
    evidenceFor: [{ text: 'x', citationIds: ['pi07-2026'] }],
    evidenceAgainst: [{ text: 'x', citationIds: ['pi07-2026'] }],
    falsification: 'x',
    falsificationSignal: 'x',
  };

  it('accepts the shipped rows', () => {
    for (const thesis of THESES) {
      expect(thesisSchema.safeParse(thesis).success).toBe(true);
    }
  });

  it('rejects a row with no proponents', () => {
    expect(thesisSchema.safeParse({ ...valid, proponents: [] }).success).toBe(
      false,
    );
  });

  it('rejects a row with no evidence for the thesis', () => {
    expect(thesisSchema.safeParse({ ...valid, evidenceFor: [] }).success).toBe(
      false,
    );
  });

  it('rejects a row with no evidence against the thesis', () => {
    expect(
      thesisSchema.safeParse({ ...valid, evidenceAgainst: [] }).success,
    ).toBe(false);
  });

  it('rejects a row with an empty falsification criterion', () => {
    expect(thesisSchema.safeParse({ ...valid, falsification: '' }).success).toBe(
      false,
    );
  });

  it('rejects an evidence item with no citation', () => {
    expect(
      thesisSchema.safeParse({
        ...valid,
        evidenceFor: [{ text: 'unsourced claim', citationIds: [] }],
      }).success,
    ).toBe(false);
  });
});
