import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import { GLOSSARY } from '../../data/glossary';
import {
  parseCompoundPlans,
  parseLedger,
  type CompoundPlan,
} from '../../lib/audit-ledger';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const article = read('content/classical/state-estimation.mdx');
const ledger = read('audit/classical.md');
const plans = parseCompoundPlans(JSON.parse(read('audit/compound-evidence.json')));
const ids = new Set(CITATIONS.map((source) => source.id));
const ordinals = [11, 13, 16];
const rows = (catalog: CompoundPlan[]) =>
  parseLedger('audit/classical.md', ledger, ids, { compoundPlans: catalog })
    .find((section) => section.slug === 'state-estimation')!.claimRecords;
const selected = (catalog = plans) =>
  catalog.filter((plan) => plan.id.startsWith('state-smoothing-'));

describe('state smoothing scientific corrections', () => {
  it('replaces one-shot SAM with qualified joint MAP and correct matrix roles', () => {
    for (const phrase of [
      'trajectory and landmark map',
      'known data associations',
      'Gaussian process and measurement models',
      'uniform landmark prior',
      'initial reference frame fixed',
      'successive linearized systems',
      'QR acts on the measurement Jacobian',
      'Cholesky acts on the information matrix',
      'Variable ordering controls fill-in',
    ]) expect(article).toContain(phrase);
    expect(article).not.toContain('factor it once');
  });

  it('does not equate unaffected subtrees with fixed estimates or bounded update cost', () => {
    for (const phrase of [
      'affected cliques and their ancestors',
      'reattaches unaffected subtrees',
      'Changes in estimates can still propagate',
      'thresholds trade accuracy for computation',
      'large loop closures can be as expensive as a batch solution',
    ]) expect(article).toContain(phrase);
    expect(article).not.toContain('updates stay local even as the map grows');
  });

  it('qualifies marginalization, chronology, convergence and resource comparisons', () => {
    for (const phrase of [
      'In EKF-based SLAM',
      'cannot later relinearize those discarded pose variables',
      'does not guarantee that nonlinear optimization reaches the global minimum',
      '1986 to 2004',
      '2004 to 2015',
      'EKF-based systems with state-of-the-art performance',
      'information-loss tradeoffs in sparsification',
    ]) expect(article).toContain(phrase);
    expect(article).not.toContain('impossible once the past has been marginalized');
    expect(article).not.toContain('smoothing wins almost everywhere else');
  });

  it('replaces the entire SLAM definition with both required source identities', () => {
    const slam = GLOSSARY.find((term) => term.id === 'slam')!;
    expect(slam.citations).toEqual(['cadena-2016', 'dellaert-kaess-2006']);
    for (const phrase of [
      'known data associations',
      'uniform landmark prior',
      'joint MAP estimation',
      'high-performing EKF-based systems',
    ]) expect(slam.definition).toContain(phrase);
    expect(slam.definition).not.toContain('The two halves cannot be solved separately');
  });

  it('preserves dates, adjacent iSAM/GTSAM/Forster citations and estimator mount', () => {
    expect(article).toContain('lastReviewed: "2026-08-17"');
    expect(article).toContain('<KalmanTracker className="my-6" />');
    for (const id of ['kaess-2008', 'gtsam-2026', 'forster-2017', 'mcgee-schmidt-1985']) {
      expect(article).toContain(`<Cite id="${id}" />`);
    }
  });

  it('records exactly three complete original conjunctions, with 18 parts and 21 URL triples', () => {
    const group = selected();
    expect(group.map((plan) => plan.rowOrdinal)).toEqual(ordinals);
    expect(group.map((plan) => plan.parts.length)).toEqual([7, 5, 6]);
    expect(group.map((plan) => plan.evidence.length)).toEqual([9, 6, 6]);
    expect(group.flatMap((plan) => plan.parts.flatMap((part) => part.requiredCitationIds))).toHaveLength(19);
    for (const ordinal of ordinals) {
      expect(rows(plans)[ordinal - 1].evidenceFailures).toEqual([]);
      expect(rows(plans)[ordinal - 1].verdict).toBe('C');
    }
  });

  for (const [index, ordinal] of ordinals.entries()) {
    const partCounts = [7, 5, 6];
    const itemCounts = [9, 6, 6];
    it(`rejects missing atomic member ${ordinal}`, () => {
      expect(selected()).toHaveLength(3);
      const catalog = plans.filter((plan) => plan.id !== `state-smoothing-${ordinal}-20260913`);
      expect(rows(catalog)[ordinal - 1].evidenceFailures.length).toBeGreaterThan(0);
    });
    for (let part = 0; part < partCounts[index]; part++) {
      it(`rejects stale adjudication for original ${ordinal}, part ${part}`, () => {
        const catalog = structuredClone(plans);
        const plan = selected(catalog)[index];
        expect(plan).toBeDefined();
        plan.adjudications[part].evidenceDigest = '0'.repeat(64);
        expect(rows(catalog)[ordinal - 1].evidenceFailures.length).toBeGreaterThan(0);
      });
    }
    for (let item = 0; item < itemCounts[index]; item++) {
      it(`rejects a missing source triple for original ${ordinal}, item ${item}`, () => {
        const catalog = structuredClone(plans);
        const plan = selected(catalog)[index];
        expect(plan).toBeDefined();
        plan.evidence.splice(item, 1);
        expect(rows(catalog)[ordinal - 1].evidenceFailures.length).toBeGreaterThan(0);
      });
    }
    it(`rejects duplicate source triples and reduced parts for original ${ordinal}`, () => {
      const catalog = structuredClone(plans);
      const plan = selected(catalog)[index];
      expect(plan).toBeDefined();
      plan.evidence.push(structuredClone(plan.evidence[0]));
      expect(rows(catalog)[ordinal - 1].evidenceFailures.length).toBeGreaterThan(0);
      plan.evidence.pop();
      plan.parts.pop();
      expect(rows(catalog)[ordinal - 1].evidenceFailures.length).toBeGreaterThan(0);
    });
  }
});
