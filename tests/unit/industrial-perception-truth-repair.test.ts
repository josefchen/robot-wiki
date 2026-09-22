import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import { GLOSSARY } from '../../data/glossary';
import { parseCompoundPlans, parseLedger } from '../../lib/audit-ledger';
import { parseCitationLedgerRows, reconcileCitationCoverage } from '../../lib/audit-citation-coverage';
import { validateApprovedDeltas, type ApprovedDelta } from '../../lib/brand-v2-baseline';
import { DEFAULT_PARAMS, SLIDER_SPECS, composeBudget, handEyeErrorMm } from '../../lib/perception-error';

const read = (path: string) => readFileSync(path, 'utf8');
const hash = (text: string) => createHash('sha256').update(text).digest('hex');
const industrial = read('content/data-hardware/industrial-deployment.mdx');
const perception = read('content/classical/perception.mdx');
const component = read('components/interactive/perception-error-budget.tsx');
const library = read('lib/perception-error.ts');
const planText = read('audit/compound-evidence.json');
const plans = parseCompoundPlans(JSON.parse(planText));
const registryIds = new Set(CITATIONS.map(({ id }) => id));
const nasaId = 'nasa-availability-prediction-analysis';
const nasaUrl = 'https://llis.nasa.gov/lesson/841';
const row = (ledgerPath: string, slug: string, ordinal: number) => parseLedger(
  ledgerPath, read(ledgerPath), registryIds, { compoundPlans: plans },
).find((section) => section.slug === slug)!.claimRecords[ordinal - 1];
const selected = [
  ['audit/data-hardware.md', 'industrial-deployment', 32,
    '5fcd56e813852a8ea8d58750e61e040f38d44b78f1da4bf446d2f3926133a3e4'],
  ['audit/classical.md', 'perception', 2,
    'ff0857820d7640fb63c0cdf7f8d3f78f63c79f9fed512e9ac45aac298be75221'],
  ['audit/classical.md', 'perception', 19,
    'f44359936c1c85d67c959bad349a60a7ed2f1db49d9832a703e056f11321ad1a'],
] as const;
const oldComponentCopy = `because the point of this instrument is that independent error
        sources compose into one budget, and the hand-eye rotation is the
        term whose distance dependence carries that lesson. A second
        distance-dependent term would swamp it.`;
const newComponentCopy = `to isolate how the hand-eye term changes with working distance.
        Root-sum-of-squares is an authored rule here: these slider values
        are not established standard deviations, and the instrument does
        not establish independence or a real-system error bound.`;

describe('industrial32 and perception2/19: zero-completion truth repairs', () => {
  it('registers the NASA lesson date, not the scrape date or an inferred memorandum date', () => {
    expect(CITATIONS.find(({ id }) => id === nasaId)).toEqual({
      id: nasaId,
      title: 'Availability Prediction and Analysis',
      authors: ['NASA'],
      year: 1994,
      venue: 'NASA Lessons Learned Information System, Lesson 841, 1994-12-01; submitting organization: jsc',
      url: nasaUrl,
      type: 'docs',
    });
    const fm = matter(industrial).data;
    expect(fm.citations).toContain(nasaId);
    expect(fm.citations).toContain('ohno-tps-1988');
    expect(fm.lastReviewed).toBe('2026-08-22');
  });

  it('distinguishes inherent from operational availability without claiming unread equations', () => {
    expect(industrial).toContain('NASA distinguishes inherent availability');
    expect(industrial).toContain('The inherent measure excludes administrative and logistics delays and preventive maintenance');
    expect(industrial).toContain('the operational measure includes corrective and preventive maintenance');
    expect(industrial).toContain(`time in an operable state, not necessarily time spent producing <Cite id="${nasaId}" />`);
    expect(industrial).not.toContain('MTBF over MTBF plus MTTR');
    expect(industrial).not.toContain('a cell that fails weekly buries any per-pick success rate');
  });

  it('corrects only the MTBF definition and source, retaining its limitations', () => {
    const term = GLOSSARY.find(({ id }) => id === 'mean-time-between-failures')!;
    expect(term.citations).toEqual([nasaId]);
    expect(term.definition).toContain('reliability parameter for repairable systems');
    expect(term.definition).toContain('when estimating inherent availability');
    expect(term.definition).toContain('operational availability includes those times');
    expect(term.definition).not.toContain('total operating time divided by the number of failures');
    expect(term.definition).not.toContain('MTBF over the sum');
  });

  it('labels the calculator capital-only without changing either implementation file', () => {
    expect(industrial).toContain('capital cost per modeled pick: robot price times the integration multiple');
    expect(industrial).toContain('It does not include running costs.');
    expect(industrial).toContain('not a measured deployment result');
    expect(industrial).not.toContain("capital plus running cost over its lifetime of good picks");
    expect(hash(read('lib/deployment-economics.ts')))
      .toBe('ddf25da06dd0a3b26230ea183aaccc9a2574679612fca2292e8cd8437e37113e');
    expect(hash(read('components/interactive/deployment-economics.tsx')))
      .toBe('0e982f1dde7f8be7fb5c1d70bda395dc80c403fbdda210b703a45d2870bf6756');
  });

  it('does not register an invented LEI year or apply held cycle/takt changes', () => {
    expect(CITATIONS.some(({ id }) => id.startsWith('lei-'))).toBe(false);
    expect(industrial).toContain('Cycle time</Term> is the elapsed time of one complete repetition of the task');
    expect(industrial).toContain("Takt time</Term>, from Ohno's Toyota Production System");
    expect(GLOSSARY.find(({ id }) => id === 'cycle-time')?.citations).toEqual(['evst-cell-cost-2026']);
  });

  it('withdraws the independence and real-system bound assertions in the approved article span', () => {
    expect(perception).toContain('root-sum-of-squares as an illustrative modelling choice');
    expect(perception).toContain('does not establish that calibration, depth and pose errors are statistically independent');
    expect(perception).toContain('or that its output bounds the positioning error of a real pipeline');
    expect(perception).not.toContain('the errors are independent, so they compose in quadrature');
  });

  it('states the ray-plane geometry while retaining formula and numerical examples as local evaluations', () => {
    expect(perception).toContain('not a full three-dimensional hand-eye error model');
    expect(perception).toContain('separation along the normal to a target plane');
    expect(perception).toContain('inclination of a ray relative to that normal');
    expect(perception).toContain('\n$$\ne_\\theta(d) = d \\, \\tan \\theta\n$$\n');
    expect(perception).toContain('about 1.7 mm at 10 cm and 17 mm at 1 m');
    expect(perception).toContain('not measurements reported by the calibration paper');
    expect(perception).toContain('not a general norm of a rigid-transform error');
    expect(perception).not.toContain('which is a missed grasp');
  });

  it('changes exactly the explanatory component copy, not controls or chart geometry', () => {
    expect(component).toContain(newComponentCopy);
    expect(component).not.toContain(oldComponentCopy);
    expect(hash(component.replace(newComponentCopy, oldComponentCopy)))
      .toBe('f80245399a8015a30a7946f2c304541e97edbc84de6f67dfff7fd8787b3977c7');
  });

  it('changes library comments only and uses plain formula-versus-measurement language', () => {
    expect(library).toContain('does not establish their distributions');
    expect(library).toContain('not a full 3D rigid-transform error norm');
    expect(library).toContain('local examples evaluate the formula, not measured calibration results');
    expect(library).not.toContain('unevidenced under P2');
    expect(hash(library.replace(/\/\*[\s\S]*?\*\//g, '')))
      .toBe('a789fa96a3dd5e32e3f9cb50bb74afb75b7ac66305abd79d1564444571fd3851');
  });

  it('preserves formula evaluations, default inputs and slider ranges', () => {
    expect(handEyeErrorMm(1, 0.1)).toBeCloseTo(1.7455064928217585, 10);
    expect(handEyeErrorMm(1, 1)).toBeCloseTo(17.455064928217585, 10);
    expect(DEFAULT_PARAMS).toEqual({
      handEyeDeg: 0.5, depthPct: 2, poseMm: 3, workingDistanceM: 0.5, target: 'opaque',
    });
    expect(SLIDER_SPECS.distance).toEqual({ min: 0.15, max: 1.5, step: 0.05 });
    const budget = composeBudget(DEFAULT_PARAMS);
    expect(budget.totalMm).toBeCloseTo(Math.hypot(handEyeErrorMm(0.5, 0.5), 10, 3), 12);
  });

  for (const [ledgerPath, slug, ordinal, oldDigest] of selected) {
    it(`keeps ${slug}:${ordinal} unresolved and incomplete with exact old-tuple history`, () => {
      const record = row(ledgerPath, slug, ordinal);
      expect(record.verdict).toMatch(/^UNRESOLVED\b/);
      expect(record.outcome).toBe('unresolved');
      expect(record.evidenceFailures).toHaveLength(3);
      expect(record.citationId).toBe('');
      expect(record.sourceUrl).toBe('');
      expect(record.supportingPassage).toBe('');
      expect(record.compound).toBeUndefined();
      expect(record.note).toContain('Original four-cell tuple (JSON):');
      expect(record.note).toContain(oldDigest);
      expect(record.note).toContain('zero completion credit');
    });
  }

  it('does not manufacture plans or alter the existing native catalog', () => {
    expect(hash(planText)).toBe('fdb5956ab68cfdd003b205134112f197131bc7f39d8c0426e81810e859709a49');
    expect(plans.every((plan) => plan.parts.every((part) => part.requiredCitationIds.length > 0))).toBe(true);
  });

  it('records retained NASA identity and missing liveness without creating an uncovered registry entry', () => {
    const text = read('audit/citations.md');
    const rows = parseCitationLedgerRows(text);
    const nasa = rows.filter(({ id }) => id === nasaId);
    expect(nasa).toHaveLength(1);
    expect(nasa[0].url).toBe(nasaUrl);
    expect(nasa[0].verdict).toMatch(/^unresolved/i);
    expect(text).toContain('Lesson Number841Lesson Date1994-12-01Submitting Organizationjsc');
    expect(text).toContain('2026-09-22T22:28:18.417Z');
    expect(text).toContain('No origin HTTP status was exposed');
    expect(reconcileCitationCoverage({ registry: CITATIONS, rows }).failures).toEqual([]);
  });

  it('appends exactly eight necessary member approvals after the unchanged prefix', () => {
    const entries = (JSON.parse(read('contract/brand-v2-approved-deltas.json')) as {
      entries: ApprovedDelta[];
    }).entries;
    expect(hash(JSON.stringify(entries.slice(0, 1018))))
      .toBe('6470a16f8a527af438b36f9ac4b780e344a441abe8c0f6998aa9c34ea0c16ad6');
    const mine = entries.filter(({ id }) => id.startsWith('industrial-perception-zero-credit-20260922-'));
    expect(mine.map(({ manifest, memberId }) => [manifest, memberId])).toEqual([
      ['prose', 'article:data-hardware/industrial-deployment'],
      ['prose', 'article:classical/perception'],
      ['relationships', 'article:data-hardware/industrial-deployment'],
      ['article-metadata', 'article-fact-frontmatter:data-hardware/industrial-deployment'],
      ['article-metadata', `citation:${nasaId}`],
      ['article-metadata', 'citation-rendering:label-and-meta'],
      ['article-metadata', 'canonical-metadata-source:data/glossary.ts'],
      ['interactive-sources-mounts', 'source:components/interactive/perception-error-budget.tsx'],
    ]);
    expect(validateApprovedDeltas(mine)).toEqual([]);
    for (const delta of mine) {
      expect(delta.oldHash).not.toBe(delta.newHash);
      expect(delta.ownerApproval).toContain('zero completion credit');
    }
  });
});
