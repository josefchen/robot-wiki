import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
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
    const reverted = component.replace(newComponentCopy, oldComponentCopy);
    expect(reverted).toBe(committedSource(RELEASE_BASE, 'components/interactive/perception-error-budget.tsx'));
    expect(hash(reverted.replace(
      "from '@/components/article/citation-records'",
      "from '@/components/mdx/cite-ref'",
    )))
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
    expect(hash(committedSource('a4381e8', 'audit/compound-evidence.json')))
      .toBe('fdb5956ab68cfdd003b205134112f197131bc7f39d8c0426e81810e859709a49');
    preservedCompoundPacket('a4381e8');
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
    expect(row('audit/data-hardware.md', 'industrial-deployment', 32).outcome).toBe('unresolved');
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

  it.each(outcomes)('records exactly one current disposition for %s', (id, verdict) => {
    const selected = rows.filter((row) => row.id === id);
    expect(selected).toHaveLength(1);
    expect(selected[0].verdict).toBe(verdict);
    expect(selected[0].url).toBe(CITATIONS.find((citation) => citation.id === id)?.url);
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

  it('keeps all three external failures unresolved and without exception coverage', () => {
    const rows = parseCitationLedgerRows(read('audit/citations.md'));
    for (const [id, verdict] of [
      ['astrom-murray-2008', 'FAIL (unresolved transport; 2026-09-23)'],
      ['technology-org-deployed-2026', 'FAIL (unresolved access; HTTP 403; 2026-09-23)'],
      ['kroger-ocado-closures-2025', 'FAIL (unresolved access; HTTP 403; 2026-09-23)'],
    ]) {
      expect(rows.find((row) => row.id === id)?.verdict).toBe(verdict);
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
