import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { CITATIONS } from '../../data/citations';
import {
  compoundPartDigest, compoundPlanDigest, parseCompoundPlans, parseLedger,
} from '../../lib/audit-ledger';

const text = readFileSync('content/frontier/dexterity.mdx', 'utf8');
const ledger = readFileSync('audit/frontier.md', 'utf8');
const plans = parseCompoundPlans(JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8')));
const ids = new Set(CITATIONS.map(c => c.id));
const selected = [2, 3, 5, 6];
const records = (catalog = plans) => parseLedger('audit/frontier.md', ledger, ids, {
  compoundPlans: catalog,
}).find(s => s.slug === 'dexterity')!.claimRecords;
const selectedPlans = () => plans.filter(p =>
  p.ledgerPath === 'audit/frontier.md' && p.articleSlug === 'dexterity' && selected.includes(p.rowOrdinal));

describe('Brooks dexterity source corrections', () => {
  test.each(selected)('original %i has complete reviewed evidence, not only its old verdict', ordinal => {
    expect(records()[ordinal - 1].verdict).toBe('C');
    expect(records()[ordinal - 1].evidenceFailures).toEqual([]);
    const p = selectedPlans().find(p => p.rowOrdinal === ordinal)!;
    expect(p.planReview?.planDigest).toBe(compoundPlanDigest(p));
    expect(p.adjudications).toHaveLength(p.parts.length);
    for (const a of p.adjudications) {
      expect(a.outcome).toBe('supported');
      expect(a.evidenceDigest).toBe(compoundPartDigest(p, a.partId));
    }
  });
  test('retains exactly eleven mandatory parts and source-paired items', () => {
    expect(selectedPlans().map(p => p.parts.length)).toEqual([3, 2, 3, 3]);
    expect(selectedPlans().flatMap(p => p.evidence)).toHaveLength(11);
    for (const e of selectedPlans().flatMap(p => p.evidence)) {
      expect(e.citationId).toBe('brooks-dexterity-2025');
      expect(e.sourceUrl).toBe('https://rodneybrooks.com/why-todays-humanoids-wont-learn-dexterity/');
    }
  });
  test('binds body and Stat to essay-reported timing and residual sensation', () => {
    expect(text).toContain('match lighting (Brooks)');
    expect(text).toContain('his reported first-video time; second described as four times as long');
    expect(text).toContain("These are the essay's descriptions of the demonstration");
    expect(text).toContain('He says she could still sense other things in the rest of her fingers and hand');
    expect(text).not.toContain('Her vision is intact');
    expect(text).not.toContain('Nothing about her plan changed');
  });
  test('retains imagined dialogue, acknowledged successes and likely', () => {
    expect(text).toContain('an imagined inner dialogue');
    expect(text).toContain('end-to-end learning succeeded in speech-to-text, image labeling, and language models');
    expect(text).toContain('will likely require the right sensory data and the right thing to learn');
    expect(text).not.toContain('The strongest counterargument');
    expect(text).not.toContain('states it fairly');
  });
  test('keeps the complete qualifier and cuts the necessity-from-first-deployment inference', () => {
    expect(text).toContain('"It looks like humanoid robots will need a sense of touch');
    expect(text).toContain('for tasks such as the match demonstration');
    expect(text).toContain('his assessment at the time of the essay');
    expect(text).not.toContain('If touch-driven pipelines get there first, Brooks');
    expect(text).not.toContain("Brooks's conclusion is blunt");
  });
  test('preserves original medical wording as non-counted history only', () => {
    expect(ledger).toContain('Non-counted exact before/current row history');
    expect(ledger).toContain('digital-nerve blocks also cut proprioceptive afferents');
    expect(records()[2].claim).not.toContain('Her vision is intact');
    expect(records()[2].note).not.toContain('digital-nerve blocks also cut');
    expect(records()).toHaveLength(30);
  });
  test('preserves the article date and historical Figure15 hold', () => {
    expect(text).toContain('lastReviewed: "2026-08-18"');
    expect(ledger).toContain('Original15 is HELD:');
    // The separately tested Figure15 continuation supersedes the hold, not its history.
  });
  test.each(['review', 'adjudication', 'item', 'source', 'stale'] as const)(
    'native gate rejects missing or stale %s on every assigned original', mutation => {
      expect(selectedPlans()).toHaveLength(4);
      for (const p of selectedPlans()) {
        const mutated = structuredClone(plans);
        const q = mutated.find(candidate => candidate.id === p.id)!;
        if (mutation === 'review') q.planReview = null;
        if (mutation === 'adjudication') q.adjudications = q.adjudications.slice(1);
        if (mutation === 'item') q.evidence = q.evidence.slice(1);
        if (mutation === 'source') q.evidence = q.evidence.map((e, i) => i ? e : { ...e, citationId: 'helix-02-2026' });
        if (mutation === 'stale') q.originalCellsDigest = '0'.repeat(64);
        expect(records(mutated)[p.rowOrdinal - 1].evidenceFailures.length).toBeGreaterThan(0);
      }
    },
  );
});
