import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { THESES } from '@/lib/competing-theses';
import { committedSource } from '../helpers/continuation-integration';
import { parseCompoundPlans, compoundPlanDigest, compoundPartDigest } from '@/lib/audit-ledger';

const article = readFileSync('content/frontier/competing-theses.mdx', 'utf8');
const teleop = THESES.find(t => t.id === 'teleop-bridge')!;
const flywheel = teleop.evidenceFor.find(e => e.citationIds.includes('bessemer-robotics-2026'))!;
const glow = teleop.evidenceAgainst.find(e => e.citationIds.includes('bessemer-robotics-2026'))!;
const plans = parseCompoundPlans(JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8')));

describe('two economics originals retain the source position and its scope', () => {
  it('names both flywheel speakers and their companies on both surfaces', () => {
    for (const text of [article, flywheel.text]) {
      for (const fragment of ['Voxel51’s Brian Moore', 'Foxglove’s Adrian Macneil']) expect(text).toContain(fragment);
    }
  });
  it('quotes the actual model-improvements formulation, not a sharpened paraphrase', () => {
    for (const text of [article, flywheel.text]) {
      expect(text).toContain('better decisions, better model improvements, and better deployments faster than everyone else.');
      expect(text).not.toContain('in its words turning robot data into better decisions, better models');
    }
  });
  it('discloses portfolio interests and does not certify a financing law', () => {
    expect(article).toContain('Bessemer lists both companies in its portfolio');
    expect(flywheel.text).toContain('Both are disclosed portfolio companies');
    for (const text of [article, flywheel.text]) expect(text).toContain('an attributed investment thesis, not evidence that deployment revenue');
  });
  it('keeps Glow’s named scale AND diversity argument about teleop ALONE', () => {
    for (const text of [article, glow.text]) {
      expect(text).toContain('Ian Glow');
      expect(text).toContain('Zeromatter');
      expect(text).toContain("you'll never get the scale or diversity you need from teleop alone.");
    }
  });
  it('retains the proposed alternatives and their counterqualifications', () => {
    for (const text of [article, glow.text]) {
      expect(text).toContain('internet data or simulators with reinforcement learning');
      expect(text).toContain('world models are expensive');
      expect(text).toContain('sim-to-real manipulation remains an open research problem');
    }
  });
  it('does not turn the quotation into a generic measured cost or speed claim', () => {
    expect(article).not.toContain('is expensive and slow, and Bessemer');
    expect(glow.text).not.toContain('Teleoperation is expensive and slow');
    expect(glow.text).toContain('not a measured teleop cost or speed law');
  });
  it('preserves citations, term occurrence, article date and deterministic explorer defaults', () => {
    expect(flywheel.citationIds).toEqual(['bessemer-robotics-2026']);
    expect(glow.citationIds).toEqual(['bessemer-robotics-2026']);
    expect(article.match(/<Term id="teleoperation">/g)).toHaveLength(1);
    expect(committedSource('0cbdda1', 'content/frontier/competing-theses.mdx'))
      .toContain('lastReviewed: "2026-08-18"');
    expect(article).toContain('lastReviewed: "2026-09-24"');
    expect(THESES).toHaveLength(6);
  });
  for (const [ordinal, expectedParts] of [[21, 5], [22, 4]]) {
    it(`binds every required native part for original ${ordinal} with genuine hash-bound reviews`, () => {
      const plan = plans.find(p => p.id === `frontier-competing-theses-${ordinal}-economics-20260913`)!;
      expect(plan).toBeDefined();
      expect(plan.rowOrdinal).toBe(ordinal);
      expect(plan.parts).toHaveLength(expectedParts);
      expect(plan.evidence).toHaveLength(expectedParts);
      expect(plan.planReview?.planDigest).toBe(compoundPlanDigest(plan));
      expect(plan.adjudications.map(a => a.partId)).toEqual(plan.parts.map(p => p.id));
      for (const review of plan.adjudications) {
        expect(review.outcome).toBe('supported');
        expect(review.evidenceDigest).toBe(compoundPartDigest(plan, review.partId));
      }
      for (const item of plan.evidence) {
        expect(item.citationId).toBe('bessemer-robotics-2026');
        expect(item.sourceUrl).toBe('https://www.bvp.com/atlas/bessemer-predicts-robotics-and-physical-ai');
      }
    });
  }
  it('does not apply the held Goldberg plan or rewrite its existing explorer sentence', () => {
    expect(plans.some(p => p.id === 'frontier-competing-theses-23-economics-20260913')).toBe(false);
    expect(THESES[0].evidenceAgainst.some(e => e.text.includes('100,000 years of human reading to cover the text used to train LLMs'))).toBe(true);
  });
});
