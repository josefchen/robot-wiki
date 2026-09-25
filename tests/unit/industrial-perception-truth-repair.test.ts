import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import matter from 'gray-matter';
import { beforeAll, describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import { loadLocalBasisContext } from '../../lib/audit-local-basis';
import { publishedModules } from '../../data/modules';
import { GLOSSARY } from '../../data/glossary';
import { LINK_CHECK_EXCEPTIONS } from '../../data/link-check-exceptions';
import { parseCompoundPlans, parseLedger } from '../../lib/audit-ledger';
import { parseCitationLedgerRows, reconcileCitationCoverage } from '../../lib/audit-citation-coverage';
import { validateApprovedDeltas, type ApprovedDelta } from '../../lib/brand-v2-baseline';
import { applyTitleMismatchException, compareTitles, isAuditFailure, type CitationAuditResult } from '../../lib/citation-audit';
import { applyException, classifyStatus } from '../../lib/citation-links';
import { DEFAULT_PARAMS, SLIDER_SPECS, composeBudget, handEyeErrorMm } from '../../lib/perception-error';
import { committedSource, preservedApprovalPacket, preservedCompoundPacket, RELEASE_BASE } from '../helpers/continuation-integration';

const read = (path: string) => readFileSync(path, 'utf8');
const hash = (text: string) => createHash('sha256').update(text).digest('hex');
const industrial = read('content/data-hardware/industrial-deployment.mdx');
const perception = read('content/classical/perception.mdx');
const component = read('components/interactive/perception-error-budget.tsx');
const library = read('lib/perception-error.ts');
const planText = read('audit/compound-evidence.json');
const plans = parseCompoundPlans(JSON.parse(planText));
const registryIds = new Set(CITATIONS.map(({ id }) => id));
const krogerCurrentVerdict = 'ok (archival HTTPS 200, current registry 2026-09-24)';
const nasaId = 'nasa-availability-prediction-analysis';
const nasaUrl = 'https://llis.nasa.gov/lesson/841';
const row = (ledgerPath: string, slug: string, ordinal: number) => parseLedger(
  ledgerPath, read(ledgerPath), registryIds, { compoundPlans: plans, localBasis: loadLocalBasisContext(process.cwd(), publishedModules().map(m => `/${m.domain}/${m.slug}/`)) },
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
  beforeAll(() => {
    // Warm the neutral history renders once; catalog renders are expensive
    // and individual tests must stay under 5s.
    void committedSource('a4381e8', 'audit/compound-evidence.json');
    void committedSource('714cf3a', 'audit/compound-evidence.json');
  }, 120_000);

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
    expect(fm.citations).not.toContain('ohno-tps-1988');
    expect(fm.citations).toContain('lei-takt-time-definition');
    expect(fm.citations).toContain('lei-cycle-time-definition');
    expect(fm.lastReviewed).toBe('2026-09-24');
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
    expect(hash(committedSource('a4381e8', 'components/interactive/deployment-economics.tsx')))
      .toBe('0e982f1dde7f8be7fb5c1d70bda395dc80c403fbdda210b703a45d2870bf6756');
    expect(read('components/interactive/deployment-economics.tsx'))
      .toBe(committedSource('358f505', 'components/interactive/deployment-economics.tsx'));
    expect(hash(read('components/interactive/deployment-economics.tsx')))
      .toBe('af7a4c70caaa5d401a94ed7eadd0a2232940360f946e0434525681e7f01e029f');
  });

  it('uses truthful undated LEI definitions under the controlling closure decision', () => {
    for (const id of ['lei-cycle-time-definition', 'lei-takt-time-definition']) {
      expect(CITATIONS.find(c => c.id === id)).toMatchObject({ year: 'n.d.', accessedOn: '2026-09-22' });
    }
    expect(industrial).toContain('Cycle time</Term> is the time required to produce a part or complete a process');
    expect(industrial).not.toContain("Takt time</Term>, from Ohno's Toyota Production System");
    expect(GLOSSARY.find(({ id }) => id === 'cycle-time')?.citations).toEqual(['lei-cycle-time-definition']);
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

  it('retains the independence withdrawal while qualifying authored model readouts', () => {
    expect(component).toContain(newComponentCopy.slice(newComponentCopy.indexOf('Root-sum-of-squares')));
    expect(component).not.toContain(oldComponentCopy);
    const reverted = committedSource('a4381e8', 'components/interactive/perception-error-budget.tsx')
      .replace("from '@/components/mdx/cite-ref'", "from '@/components/article/citation-records'")
      .replace(newComponentCopy, oldComponentCopy);
    expect(reverted).toBe(committedSource(RELEASE_BASE, 'components/interactive/perception-error-budget.tsx'));
    expect(hash(reverted.replace(
      "from '@/components/article/citation-records'",
      "from '@/components/mdx/cite-ref'",
    )))
      .toBe('f80245399a8015a30a7946f2c304541e97edbc84de6f67dfff7fd8787b3977c7');
    expect(component).toContain('sum of squared inputs');
    expect(component).not.toContain('of the variance');
    expect(component).toContain('above model band');
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
    it(`preserves ${slug}:${ordinal} history and its current disposition`, () => {
      const record = row(ledgerPath, slug, ordinal);
      if (slug === 'industrial-deployment') {
        expect(record.outcome).toBe('passing');
        expect(record.evidenceFailures).toEqual([]);
        const history = read('audit/evidence/industrial-closure-20260923/row-history.json');
        expect(history).toContain(oldDigest);
        expect(history).toContain('zero completion credit');
        return;
      }
      expect(record.verdict).toBe('C');
      expect(record.outcome).toBe('passing');
      expect(record.evidenceFailures).toEqual([]);
      expect(record.citationId).toBe('');
      expect(record.supportingPassage).toBe('');
      expect(record.localBasis).toBeDefined();
      const history = read('audit/evidence/classical-closure-20260923/row-history.json');
      expect(history).toContain(oldDigest);
      expect(history).toContain('zero completion credit');
    });
  }

  it('preserves historical plans and every plan outside the four Control originals', { timeout: 60_000 }, () => {
    expect(hash(committedSource('a4381e8', 'audit/compound-evidence.json')))
      .toBe('6c1289de546d4bfc08fb66769da6ebb7ad809e92c950de1fdbaf2782bae75ee9');
    preservedCompoundPacket('a4381e8');
    // The 2026-09-24 Technology.org withdrawal additionally superseded twelve
    // plans (industrial-deployment 5-8, reliability-gap 6/9/10/13,
    // bear-case 4/5/14/15); they are preserved verbatim in the withdrawal
    // evidence against their committed bytes, and the 837 pre-packet plans
    // are byte-unchanged. The 2026-09-24 imported-manipulation packet then
    // appended seventeen new manipulation compound plans (robot-learning-
    // roadmap 4, action-spaces 7, foundation-models 6), making 854. The
    // 2026-09-24 imported stack-classical packet appended eight more
    // (robot-learning-stack 5, calibration 2, ros2-for-ml-engineers 1),
    // making 862. The 2026-09-24 imported world-rl packet then appended
    // five more (world-models-vs-simulators 4, offline-rl 1), making 867.
    const superseded = (plan: { ledgerPath: string; articleSlug: string; rowOrdinal: number }) => (
      (plan.ledgerPath === 'audit/classical.md' && plan.articleSlug === 'control'
        && [1, 2, 3, 7].includes(plan.rowOrdinal)) ||
      (plan.ledgerPath === 'audit/data-hardware.md' && plan.articleSlug === 'industrial-deployment'
        && [5, 6, 7, 8].includes(plan.rowOrdinal)) ||
      (plan.ledgerPath === 'audit/frontier.md' && plan.articleSlug === 'reliability-gap'
        && [6, 9, 10, 13].includes(plan.rowOrdinal)) ||
      (plan.ledgerPath === 'audit/frontier.md' && plan.articleSlug === 'bear-case'
        && [4, 5, 14, 15].includes(plan.rowOrdinal))
    );
    const unselected = plans.filter((plan) => !superseded(plan));
    expect(unselected.slice(0, 862)).toHaveLength(862);
    expect(hash(JSON.stringify(unselected.slice(0, 862))))
      .toBe('9181c2064d2bef787c7a81a28a4cd4db79ccbb81fe2b0060477db8095f7356e8');
    expect(unselected.slice(862).map((plan) => plan.id)).toEqual([
      'world-rl-wmv-mujoco-isaac-20260924',
      'world-rl-wmv-cosmos-stack-20260924',
      'world-rl-wmv-neural-simulators-20260924',
      'world-rl-wmv-generative-content-20260924',
      'world-rl-offline-bc-evidence-20260924',
    ]);
    expect(unselected).toHaveLength(867);
    expect(hash(JSON.stringify(unselected)))
      .toBe('2776fe76f484c1e94bd24d330ca05aae7588938cf3604b4c31de5e0201990105');
    const committed = JSON.parse(committedSource(
      '714cf3a', 'audit/compound-evidence.json')) as typeof plans;
    const prior = JSON.parse(read(
      'audit/evidence/technology-withdrawal-20260924/prior-plans.json')) as { plans: typeof plans };
    expect(prior.plans).toHaveLength(12);
    for (const entry of prior.plans) {
      expect(hash(JSON.stringify(entry)))
        .toBe(hash(JSON.stringify(committed.find((plan) => plan.id === entry.id))));
      expect(plans.some((plan) => plan.id === entry.id)).toBe(false);
      expect(entry.parts.some((part) => part.requiredCitationIds.includes('technology-org-deployed-2026')) ||
        entry.evidence.some((item) => item.citationId === 'technology-org-deployed-2026')).toBe(true);
    }
    expect(selected.every(([ledgerPath, slug, ordinal]) => !plans.some((plan) =>
      plan.ledgerPath === ledgerPath && plan.articleSlug === slug && plan.rowOrdinal === ordinal))).toBe(true);
    expect(plans.every((plan) => plan.parts.every((part) => part.requiredCitationIds.length > 0))).toBe(true);
  });

  it('records observed NASA liveness with its title exception and preserves the prior unresolved history', () => {
    const text = read('audit/citations.md');
    const rows = parseCitationLedgerRows(text);
    const nasa = rows.filter(({ id }) => id === nasaId);
    expect(nasa).toHaveLength(1);
    expect(nasa[0].url).toBe(nasaUrl);
    expect(nasa[0].verdict).toBe('ok (documented title-mismatch exception; HTTP 200; 2026-09-23)');
    expect(text).toContain('unresolved (current liveness not checked)');
    expect(text).toContain('2026-09-23T00:17:45.540729Z');
    expect(text).toContain('2026-09-23T00:21:38.319939Z');
    expect(text).toContain('titleComparison=mismatch');
    expect(text).toContain('resolvedBy=exception');
    expect(text).toContain('Lesson Number841Lesson Date1994-12-01Submitting Organizationjsc');
    expect(text).toContain('2026-09-22T22:28:18.417Z');
    expect(text).toContain('No origin HTTP status was exposed');
    expect(reconcileCitationCoverage({ registry: CITATIONS, rows }).failures).toEqual([]);
  });

  it('appends exactly eight necessary member approvals after the unchanged prefix', () => {
    const entries = (JSON.parse(read('contract/brand-v2-approved-deltas.json')) as {
      entries: ApprovedDelta[];
    }).entries;
    expect(hash(JSON.stringify(preservedApprovalPacket('660ad53'))))
      .toBe('4095727751a3cf0d01dd883d997f4660fef840c52886663679fa4c592382b67a');
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


describe('two new citation links: scoped observations, not whole-corpus acceptance', () => {
  const exception = LINK_CHECK_EXCEPTIONS.find(({ id }) => id === nasaId);
  const observed: CitationAuditResult = {
    id: nasaId,
    url: nasaUrl,
    verdict: 'live',
    status: 200,
    chain: [{ status: 200, url: nasaUrl }],
    finalUrl: nasaUrl,
    fetchedTitle: 'Llis',
    titleCheckedBy: 'html',
    titleComparison: 'mismatch',
  };

  it('keeps the deed observation separate from the undated page and license-version year', () => {
    const text = read('audit/citations.md');
    const deeds = parseCitationLedgerRows(text).filter(({ id }) => id === 'cc-by-4-0-deed');
    expect(deeds).toHaveLength(1);
    expect(deeds[0].url).toBe('https://creativecommons.org/licenses/by/4.0/');
    expect(deeds[0].verdict).toBe('ok (HTTP 200; 2026-09-23)');
    expect(text).toContain('Deed - Attribution 4.0 International - Creative Commons');
    expect(text).toContain('2026-09-23T00:17:28.727644Z');
    expect(text).toContain('retained primary identity; no fresh reachability probe');
    expect(text).toContain('NOT publication or update of the undated deed webpage');
    expect(CITATIONS.find(({ id }) => id === 'cc-by-4-0-deed')?.year).toBe(2013);
    expect(LINK_CHECK_EXCEPTIONS.some(({ id }) => id === 'cc-by-4-0-deed')).toBe(false);
  });

  it('documents only the exact NASA title divergence, with distinct retrieval and observation dates', () => {
    expect(LINK_CHECK_EXCEPTIONS.filter(({ id }) => id === nasaId)).toHaveLength(1);
    expect(exception?.covers).toEqual(['title-mismatch']);
    expect(exception?.reason).toContain(nasaUrl);
    expect(exception?.reason).toContain('"Llis"');
    expect(exception?.reason).toContain('"Availability Prediction and Analysis"');
    expect(exception?.verifiedOn).toBe('2026-09-23');
    for (const value of [
      'HTTP 200 with no redirect',
      '00:17:45.540729Z',
      '2026-09-22T22:28:18.417Z',
      'Lesson Number841Lesson Date1994-12-01Submitting Organizationjsc',
      '40f19efe4b87d4195a4e1a31257c8b5b30391019038f6b9a96e94769d0c483f6',
      '27b4ccd2a68179b1b8a23adb6d9f0fe65f4281652c71ac459b0d78d30a2e8cae',
      'no origin HTTP status',
    ]) expect(exception?.verifiedBy).toContain(value);
  });

  it('resolves the documented divergence without claiming the HTML title matches', () => {
    expect(compareTitles('Availability Prediction and Analysis', 'Llis', 'docs')).toBe('mismatch');
    expect(isAuditFailure(observed)).toBe(true);
    const resolved = applyTitleMismatchException(applyException(observed, exception), exception);
    expect(resolved.titleComparison).toBe('mismatch');
    expect(resolved.fetchedTitle).toBe('Llis');
    expect(resolved.resolvedBy).toBe('exception');
    expect(isAuditFailure(resolved)).toBe(false);
  });

  it.each([404, 410, 403, 500, 0])('does not excuse a NASA dead/blocked/error result with status %i', (status) => {
    // The native checker reads titles only for live responses; no title is
    // available from these failure paths. No failure-mode coverage is added.
    const failed: CitationAuditResult = {
      ...observed,
      status,
      verdict: classifyStatus(status),
      chain: status ? [{ status, url: nasaUrl }] : [],
      titleComparison: 'unavailable',
      fetchedTitle: undefined,
      titleCheckedBy: undefined,
    };
    const resolved = applyTitleMismatchException(applyException(failed, exception), exception);
    expect(resolved.resolvedBy).toBeUndefined();
    expect(isAuditFailure(resolved)).toBe(true);
  });

  it('does not excuse another citation or convert link success to a completed original claim', () => {
    const other: CitationAuditResult = { ...observed, id: 'cc-by-4-0-deed' };
    expect(applyTitleMismatchException(other, exception)).toBe(other);
    expect(isAuditFailure(other)).toBe(true);
    expect(row('audit/data-hardware.md', 'industrial-deployment', 32).localBasis?.kind).toBe('mixed-local');
    expect(read('audit/citations.md')).toContain('do not establish VAL-AUDIT-008 full-corpus acceptance');
  });
});


describe('prior citation links: nine-obligation follow-up', () => {
  const text = read('audit/citations.md');
  const rows = parseCitationLedgerRows(text);
  const outcomes = [
    ['ng-reward-shaping-1999', 'ok (HTTP 200; 2026-09-23)'],
    ['seeed-so-arm101-pro-2026', 'ok (documented title-mismatch exception; HTTP 200; 2026-09-23)'],
    ['astrom-murray-2008', 'FAIL (unresolved transport; 2026-09-23)'],
    ['mcgee-schmidt-1985', 'ok (HTTP 200; 2026-09-23)'],
    ['technology-org-deployed-2026', 'FAIL (unresolved access; HTTP 403; 2026-09-23)'],
    ['hinterstoisser-2012', 'ok (crossref; 2026-09-23)'],
    ['gsn-standard-v3', 'ok (documented title-mismatch exception; HTTP 200; 2026-09-23)'],
    ['symbotic-10k-2025', 'ok (documented title-mismatch exception; HTTP 200; 2026-09-23)'],
    ['kroger-ocado-closures-2025', 'FAIL (unresolved access; HTTP 403; 2026-09-23)'],
  ] as const;
  const symId = 'symbotic-10k-2025';
  const symUrl = 'https://www.sec.gov/Archives/edgar/data/1837240/000183724025000278/sym-20250927.htm';
  const exception = LINK_CHECK_EXCEPTIONS.find(({ id }) => id === symId);
  const observed: CitationAuditResult = {
    id: symId, url: symUrl, verdict: 'live', status: 200,
    chain: [{ status: 200, url: symUrl }], finalUrl: symUrl,
    fetchedTitle: 'sym-20250927', titleCheckedBy: 'html', titleComparison: 'mismatch',
  };

  it.each(outcomes.filter(([id]) => id !== 'astrom-murray-2008' && id !== 'technology-org-deployed-2026'))('records exactly one current disposition for %s', (id, historicalVerdict) => {
    const selected = rows.filter((row) => row.id === id);
    expect(selected).toHaveLength(1);
    const historical = parseCitationLedgerRows(committedSource('4695852', 'audit/citations.md'))
      .filter((row) => row.id === id);
    expect(historical).toHaveLength(1);
    expect(historical[0].verdict).toBe(historicalVerdict);
    expect(selected[0].verdict).toBe(id === 'kroger-ocado-closures-2025' ? krogerCurrentVerdict : historicalVerdict);
    expect(selected[0].url).toBe(CITATIONS.find((citation) => citation.id === id)?.url);
  });

  it('keeps the old Åström fetch failure as history, not an active unregistered row', () => {
    expect(CITATIONS.some(c => c.id === 'astrom-murray-2008')).toBe(false);
    expect(rows.some(row => row.id === 'astrom-murray-2008')).toBe(false);
    expect(text).toContain('status 0 is absence of an observed HTTP response');
    expect(text).toContain('"id": "astrom-murray-2008"');
  });

  it('preserves all nine failed original rows as history, not active duplicate coverage', () => {
    const addendum = text.split('## Nine prior citation-link obligations, 2026-09-23')[1];
    const json = addendum.split('Historical rows exactly as at this slice')[1]
      .split('```json\n')[1].split('\n```')[0];
    const history = JSON.parse(json) as Array<{ id: string; originalRow: string }>;
    expect(history.map(({ id }) => id)).toEqual(outcomes.map(([id]) => id));
    for (const item of history) {
      expect(item.originalRow).toContain(`| ${item.id} |`);
      expect(item.originalRow).toContain('| FAIL |');
    }
    expect(addendum).toContain('four pass the native integration');
    expect(addendum).toContain('five remain unresolved');
  });

  it('documents only the exact Symbotic filename-title divergence with preserved source identity', () => {
    expect(LINK_CHECK_EXCEPTIONS.filter(({ id }) => id === symId)).toHaveLength(1);
    expect(exception?.covers).toEqual(['title-mismatch']);
    expect(exception?.reason).toContain(symUrl);
    expect(exception?.reason).toContain('"sym-20250927"');
    expect(exception?.verifiedOn).toBe('2026-09-23');
    for (const literal of [
      '2026-09-23T00:36:40.889288Z', '2026-09-12T21:03:19.099Z',
      'FORM 10-K', 'For the fiscal year ended September 27, 2025', 'SYMBOTIC INC.',
      'b7f7f0a7cdbd4eacff3520b4ca7f25f91e64cf49f3fc0e1907727d93088cb32b',
      'origin headers/redirects were not exposed',
    ]) expect(exception?.verifiedBy).toContain(literal);
    for (const id of ['astrom-murray-2008', 'technology-org-deployed-2026',
      'kroger-ocado-closures-2025']) {
      expect(LINK_CHECK_EXCEPTIONS.some((item) => item.id === id)).toBe(false);
    }
    for (const id of ['seeed-so-arm101-pro-2026', 'gsn-standard-v3']) {
      expect(LINK_CHECK_EXCEPTIONS.filter((item) => item.id === id)).toHaveLength(1);
      expect(LINK_CHECK_EXCEPTIONS.find((item) => item.id === id)?.covers)
        .toEqual(['title-mismatch']);
    }
  });

  it('resolves only documented identity divergence without relabelling the fetched title as a match', () => {
    const citation = CITATIONS.find(({ id }) => id === symId)!;
    expect(compareTitles(citation.title, 'sym-20250927', citation.type)).toBe('mismatch');
    expect(isAuditFailure(observed)).toBe(true);
    const resolved = applyTitleMismatchException(applyException(observed, exception), exception);
    expect(resolved.resolvedBy).toBe('exception');
    expect(resolved.titleComparison).toBe('mismatch');
    expect(resolved.fetchedTitle).toBe('sym-20250927');
    expect(isAuditFailure(resolved)).toBe(false);
  });

  it.each([0, 403, 404, 410, 500])('leaves native failed-response status %i unresolved', (status) => {
    const failed: CitationAuditResult = {
      ...observed, status, verdict: classifyStatus(status),
      chain: status ? [{ status, url: symUrl }] : [],
      titleComparison: 'unavailable', fetchedTitle: undefined, titleCheckedBy: undefined,
    };
    const resolved = applyTitleMismatchException(applyException(failed, exception), exception);
    expect(resolved.resolvedBy).toBeUndefined();
    expect(isAuditFailure(resolved)).toBe(true);
  });

  it('does not reuse the Symbotic exception for another selected document', () => {
    for (const [id] of outcomes.filter(([id]) => id !== symId)) {
      const other = { ...observed, id };
      expect(applyTitleMismatchException(other, exception)).toBe(other);
      expect(isAuditFailure(other)).toBe(true);
    }
  });

  it('keeps publisher challenges, missing HTTP and unverified redirects explicit', () => {
    const addendum = text.split('## Nine prior citation-link obligations, 2026-09-23')[1];
    expect(addendum).toContain('Client Challenge');
    expect(addendum).toContain('native Crossref success is not a fetched paper');
    expect(CITATIONS.find(({ id }) => id === 'hinterstoisser-2012')?.year).toBe(2013);
    expect(addendum).toContain('status 0 is absence of an observed HTTP response');
    expect(addendum).toContain('unverified candidate only');
    expect(addendum).toContain('no company claim or original row is completed');
  });
});


describe('two identity exceptions integration', () => {
  const targets = [
    {
      id: 'seeed-so-arm101-pro-2026',
      url: 'https://www.seeedstudio.com/SO-ARM-101-Assembled-Kit-Pro-p-6691.html',
      finalUrl: 'https://www.seeedstudio.com/SO-101-Assembled-Kit-Pro-p-6691.html',
      fetchedTitle: 'SO-101 3D-Printed Robotic Arm Frame | Open-Source Robotics Kit for DIY Projects',
      identity: ['SO-ARM101 Pro Assembled Kit', '100046482', 'pre-assembled with a camera'],
      sourceDate: '2026-09-23T00:59:34.892Z',
      sourceHash: '43677acd47565968adae07fedd8ae1f98cfea80bf0c5e9bc9a731e2e6ffdcfee',
      sourceLimit: 'Scrape success is not origin HTTP 200',
      hops: [301, 200],
    },
    {
      id: 'gsn-standard-v3', url: 'https://scsc.uk/scsc-141c',
      finalUrl: 'https://scsc.uk/index.php/publications/download?ref=1386',
      fetchedTitle: 'Download',
      identity: ['Community Standard Version 3', 'May 2021', 'SCSC ACWG'],
      sourceDate: '2026-09-15T10:23:35.084Z',
      sourceHash: '7b5acead31e173bc33448da216c2c84d9b4699a389ab48edbc4f42ecbb1b6210',
      sourceLimit: 'tool-reported, not origin headers',
      hops: [302, 302, 200],
    },
  ];
  const observation = (target: typeof targets[number]): CitationAuditResult => ({
    id: target.id, url: target.url, finalUrl: target.finalUrl,
    verdict: 'live', status: 200,
    chain: target.hops.map((status, index) => ({
      status,
      url: index === 0 ? target.url : index === target.hops.length - 1
        ? target.finalUrl : 'https://scsc.uk/forward?scsc=141c',
    })),
    fetchedTitle: target.fetchedTitle, titleCheckedBy: 'html', titleComparison: 'mismatch',
  });

  it.each(targets)('documents the exact primary identity and source limits for $id', (target) => {
    const matches = LINK_CHECK_EXCEPTIONS.filter(({ id }) => id === target.id);
    expect(matches).toHaveLength(1);
    expect(matches[0].covers).toEqual(['title-mismatch']);
    expect(matches[0].verifiedOn).toBe('2026-09-23');
    for (const literal of target.identity) expect(matches[0].reason).toContain(literal);
    for (const literal of [target.sourceDate, target.sourceHash, target.sourceLimit]) {
      expect(matches[0].verifiedBy).toContain(literal);
    }
  });

  it.each(targets)('resolves only the documented title divergence for $id', (target) => {
    const citation = CITATIONS.find(({ id }) => id === target.id)!;
    expect(compareTitles(citation.title, target.fetchedTitle, citation.type)).toBe('mismatch');
    const observed = observation(target);
    expect(isAuditFailure(observed)).toBe(true);
    const exception = LINK_CHECK_EXCEPTIONS.find(({ id }) => id === target.id);
    const resolved = applyTitleMismatchException(applyException(observed, exception), exception);
    expect(resolved.resolvedBy).toBe('exception');
    expect(resolved.titleComparison).toBe('mismatch');
    expect(resolved.fetchedTitle).toBe(target.fetchedTitle);
    expect(resolved.chain.map(({ status }) => status)).toEqual(target.hops);
    expect(isAuditFailure(resolved)).toBe(false);
  });

  it.each(targets.flatMap((target) => [0, 403, 404, 410, 500].map((status) => ({
    ...target, status,
  }))))('does not excuse response status $status for $id', (target) => {
    const failed: CitationAuditResult = {
      ...observation(target), status: target.status, verdict: classifyStatus(target.status),
      chain: target.status ? [{ status: target.status, url: target.url }] : [],
      titleComparison: 'unavailable', fetchedTitle: undefined, titleCheckedBy: undefined,
    };
    const exception = LINK_CHECK_EXCEPTIONS.find(({ id }) => id === target.id);
    const resolved = applyTitleMismatchException(applyException(failed, exception), exception);
    expect(resolved.resolvedBy).toBeUndefined();
    expect(isAuditFailure(resolved)).toBe(true);
  });

  it.each(targets)('does not apply another document identity exception to $id', (target) => {
    const other = targets.find(({ id }) => id !== target.id)!;
    const exception = LINK_CHECK_EXCEPTIONS.find(({ id }) => id === other.id);
    const observed = observation(target);
    expect(applyTitleMismatchException(observed, exception)).toBe(observed);
    expect(isAuditFailure(observed)).toBe(true);
  });

  it('retains both exact previous failures as history and reports exception-resolved observations', () => {
    const addendum = read('audit/citations.md')
      .split('## Seeed and GSN identity integration, 2026-09-23')[1];
    const json = addendum.split('Exact pre-integration rows:')[1]
      .split('```json\n')[1].split('\n```')[0];
    const history = JSON.parse(json) as Array<{ id: string; originalRow: string }>;
    expect(history.map(({ id }) => id)).toEqual(targets.map(({ id }) => id));
    expect(history[0].originalRow).toContain('FAIL (unresolved product identity; 2026-09-23)');
    expect(history[1].originalRow).toContain('FAIL (unresolved document identity; 2026-09-23)');
    expect(addendum).toContain('2026-09-23T01:13:52.914633+00:00');
    expect(addendum).toContain('2026-09-23T01:13:54.151910+00:00');
    expect(addendum).toContain('excepted=1 and ok=0');
    expect(addendum).toContain('Zero original claim completions');
  });

  it('withdraws the Technology.org sweep and keeps only its first-party replacements active', () => {
    const rows = parseCitationLedgerRows(read('audit/citations.md'));
    expect(rows.find((row) => row.id === 'astrom-murray-2008')).toBeUndefined();
    expect(rows.find((row) => row.id === 'technology-org-deployed-2026')).toBeUndefined();
    expect(CITATIONS.some(({ id }) => id === 'technology-org-deployed-2026')).toBe(false);
    expect(rows.find((row) => row.id === 'kroger-ocado-closures-2025')?.verdict)
      .toBe(krogerCurrentVerdict);
    for (const [id, url] of [
      ['agility-digit-production', 'https://www.agilityrobotics.com/'],
      ['figure-bmw-production-2025', 'https://www.figure.ai/news/production-at-bmw'],
      ['tesla-q1-2026-update', 'https://assets-ir.tesla.com/tesla-contents/IR/TSLA-Q1-2026-Update.pdf'],
    ] as const) {
      const row = rows.find((candidate) => candidate.id === id);
      expect(row?.url).toBe(url);
      expect(row?.verdict).toMatch(/^ok \(retained 2026-09-24/);
      expect(CITATIONS.find((citation) => citation.id === id)?.url).toBe(url);
    }
    for (const id of ['astrom-murray-2008', 'technology-org-deployed-2026', 'kroger-ocado-closures-2025']) {
      expect(LINK_CHECK_EXCEPTIONS.some((item) => item.id === id)).toBe(false);
    }
  });

  it('preserves the two exact registry entries rather than replacing metadata to force a match', () => {
    expect(CITATIONS.find(({ id }) => id === targets[0].id)).toEqual({
      id: targets[0].id, title: 'SO-ARM101 Pro Kits', authors: ['Seeed Studio'],
      year: 2026, url: targets[0].url, type: 'docs',
    });
    expect(CITATIONS.find(({ id }) => id === targets[1].id)).toEqual({
      id: targets[1].id, title: 'Goal Structuring Notation Community Standard (Version 3)',
      authors: ['SCSC Assurance Case Working Group'], year: 2021,
      venue: 'Safety-Critical Systems Club', url: targets[1].url, type: 'docs',
    });
    expect(committedSource('c624fab', 'data/citations.ts'))
      .toContain("title: 'Goal Structuring Notation Community Standard Version 3'");
    expect(committedSource(RELEASE_BASE, 'data/citations.ts'))
      .toContain("title: 'Goal Structuring Notation Community Standard (Version 3)'");
  });
});
