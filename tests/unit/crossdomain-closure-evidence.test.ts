import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GENERALIST_RELEASES } from '../../lib/generalist-policies';
import { WM_PARADIGMS } from '../../lib/world-model-taxonomy';
import { summarise, parseLedger, type DomainCoverage } from '../../lib/audit-ledger';
import { LOCAL_BASIS_REQUIRED_TARGETS, recomputeLocalDerivation } from '../../lib/audit-local-basis';
import { CITATIONS } from '../../data/citations';

const read = (p: string) => readFileSync(p, 'utf8');
const directory = 'audit/evidence/crossdomain-closure-20260923';
const generalist = ['helix', 'gemini-robotics-1', 'gr00t-n1', 'agibot-go1', 'pi05-context',
  'gemini-robotics-15', 'pi06-context', 'helix-02', 'skild-brain', 'gr00t-n17',
  'agibot-go2', 'pi07-context', 'gemini-robotics-2'];
const taxonomy = ['latent-dynamics', 'decoder-free-latent', 'generative-video', 'jepa', 'world-action', 'symbolic'];

describe('crossdomain finite selected-count closure', () => {
  it('binds only the declared two finite selections, not source truth', () => {
    expect(LOCAL_BASIS_REQUIRED_TARGETS['audit/manipulation.md:generalist-policies:19'])
      .toEqual({ component: null, recipe: 'generalist-selection', mounts: [] });
    expect(LOCAL_BASIS_REQUIRED_TARGETS['audit/world-models.md:taxonomy:4'])
      .toEqual({ component: null, recipe: 'taxonomy-selection', mounts: [] });
    expect(GENERALIST_RELEASES.map(r => r.id)).toEqual(generalist);
    expect(WM_PARADIGMS.map(r => r.id)).toEqual(taxonomy);
  });
  it.each([['generalist-selection', generalist], ['taxonomy-selection', taxonomy]] as const)(
    'independently counts %s and rejects reordered, duplicate and invented members', (id, ids) => {
      const recipe = { id, mode: 'derive', inputs: { ids } };
      const result = recomputeLocalDerivation(recipe);
      expect(result.values).toEqual({ ids, count: new Set(ids).size });
      expect(result.units).toBe('author-selected records:count; not scientific/source certification');
      for (const wrong of [[...ids].reverse(), [...ids.slice(0, -1), ids[0]], [...ids, 'invented']]) {
        expect(() => recomputeLocalDerivation({ ...recipe, inputs: { ids: wrong } })).toThrow();
      }
    });
  it('removes unsupported aggregate claims while retaining the approved timeline and entry records', () => {
    const article = read('content/manipulation/generalist-policies.mdx');
    expect(article).toContain('13 selected records, an authored selection');
    for (const absent of ['label="marked downloadable"', 'label="arXiv papers"',
      'label="blog/press sources"', 'Seven of the thirteen timeline entries']) expect(article).not.toContain(absent);
    expect(article).toContain('<GeneralistReleaseTimeline');
    const component = read('components/interactive/generalist-release-timeline.tsx');
    expect(component).toContain('Selected generalist robot policy records.');
    expect(component).not.toContain('sit on a ${GENERALIST_RELEASES[0].dateLabel}');
    expect(read('content/world-models/taxonomy.mdx')).toContain('authored selection, not an exhaustive');
  });
  it.runIf(process.env.CROSSDOMAIN_NUMERIC === '1')('records actual outputs after independent finite-count assertions', () => {
    const results = [ ['generalist-selection', generalist], ['taxonomy-selection', taxonomy] ].flatMap(([id, ids]) =>
      [{ id, mode: 'parameters', inputs: {} }, { id, mode: 'derive', inputs: { ids } }]
        .map(recipe => ({ recipe, output: recomputeLocalDerivation(recipe) })));
    expect(results[1].output.values).toEqual({ ids: generalist, count: 13 });
    expect(results[3].output.values).toEqual({ ids: taxonomy, count: 6 });
    writeFileSync(`${directory}/numeric-results.json`, JSON.stringify({ observedAt: new Date().toISOString(), results }, null, 2) + '\n', { flag: 'wx' });
  });
});

describe('corrected-disposition aggregate accounting', () => {
  const domain = (count: number): DomainCoverage => ({
    domain: 'fixture', assertionId: null, ledgerPath: 'audit/fixture.md', publishedCount: 1, auditedCount: 1,
    claimRows: 5, evidenceKinds: { 'corrected-disposition': count }, failures: [],
  });
  it('counts fully validated corrections in all three aggregate diagnostics', () => {
    expect(summarise([domain(5)])).toMatchObject({ ok: true, claimRows: 5, failures: [] });
  });
  it('still rejects missing corrections and empty coverage', () => {
    expect(summarise([domain(4)]).failures.filter(f => f.kind === 'unevidenced-claim')).toHaveLength(3);
    expect(summarise([]).ok).toBe(false);
  });
  it('native parsing does not credit absent, stale or invalid correction records', () => {
    const records = [
      ...JSON.parse(read('audit/evidence/industrial-release-20260924/corrections.json')),
      ...JSON.parse(read('audit/evidence/classical-closure-20260923/corrections.json')),
    ];
    const ids = new Set(CITATIONS.map(c => c.id));
    const parse = (r: typeof records) => parseLedger('audit/data-hardware.md', read('audit/data-hardware.md'),
      ids, { correctedDispositions: { root: process.cwd(), records: r } }).find(s => s.slug === 'industrial-deployment')!;
    const valid = parse(records);
    expect(valid.evidenceKinds['corrected-disposition']).toBe(2); // P4 AND deliberately lacks other catalogs here.
    for (const mutation of ['missing', 'stale', 'invalid']) {
      const changed = structuredClone(records);
      const index = changed.findIndex(r => r.originalId === 'audit/data-hardware.md:industrial-deployment:37');
      if (mutation === 'missing') changed.splice(index, 1);
      else if (mutation === 'stale') changed[index].currentTupleDigest = '0'.repeat(64);
      else changed[index].requiredPresent.push('invented missing article assertion');
      const bad = parse(changed);
      expect(bad.claimRecords[36].evidenceFailures.length, mutation).toBeGreaterThan(0);
      expect(bad.evidenceKinds['corrected-disposition'], mutation).toBe(1);
    }
  });
});
