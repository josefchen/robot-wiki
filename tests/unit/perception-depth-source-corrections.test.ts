import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import { GLOSSARY } from '../../data/glossary';
import { parseCompoundPlans, parseLedger } from '../../lib/audit-ledger';

const read = (name: string) => fs.readFileSync(path.join(process.cwd(), name), 'utf8');
const article = read('content/classical/perception.mdx');
const depth = article.split('## Depth sensing:')[1].split('## Detection:')[0];
const plans = parseCompoundPlans(JSON.parse(read('audit/compound-evidence.json')));
const ordinals = [21, 25, 26, 30, 31, 32];
const selected = plans.filter(p => p.ledgerPath === 'audit/classical.md' &&
  p.articleSlug === 'perception' && ordinals.includes(p.rowOrdinal));

describe('retained primary-source depth corrections', () => {
  it('scopes quadratic error and near-range limits without choosing a conflicting MinZ', () => {
    expect(depth).toContain("RealSense's D415/D435 tuning guide says D400 depth error scales with the square of distance");
    expect(depth).toContain('staying outside the minimum operating distance, MinZ');
    expect(depth).toContain('resolution and range trade-offs');
    expect(depth).toContain('focus and differing left and right views limit very-near matching');
    expect(depth).not.toMatch(/16\.8\s*cm|19\.5\s*cm/);
  });

  it('retains all five Azure invalidations and distinguishes missing data from distance', () => {
    for (const cause of ['outside the IR illumination mask', 'saturated IR signal',
      'low IR signal', 'filter outlier', 'multi-path interference']) expect(depth).toContain(cause);
    expect(depth).toContain('Invalid pixels carry depth zero');
  });

  it('keeps corner, mixed-edge and motion-exposure qualifications together', () => {
    expect(depth).toContain('one wall onto another in a corner');
    expect(depth).toContain('where foreground and background mix at object edges');
    expect(depth).toContain('Fast motion can increase edge invalidation');
  });

  it('distinguishes weak IR, exposure and active illumination from visible darkness', () => {
    expect(depth).toContain('underexposure and overexposure');
    expect(depth).toContain('reducing background light with the projector on');
    expect(depth).not.toContain('return never clears the noise floor');
  });

  it('uses similar match scores and a rejection threshold, not universal thin-object failure', () => {
    expect(depth).toContain('DSSecondPeakThreshold');
    expect(depth).toContain('compares the best and second-best match scores');
    expect(depth).not.toContain('two equally good matches');
  });

  it('corrects the taxonomy and viewpoint inference while preserving the unassigned ToF lead', () => {
    expect(depth).toContain('These are separate specification fields for one model');
    expect(depth).toContain('a surface invalidated by multi-path from one camera view can reappear from another');
    expect(depth).not.toContain('which is why multi-view capture is a standard answer');
    // This held lead is preserved, not scientifically certified by this test.
    expect(depth).toContain('Multi-path interference lets one pixel integrate light that arrived by several routes');
    expect(article).toContain('lastReviewed: "2026-08-22"');
  });

  it('uses the explicit RealSense page authors without manufacturing Azure bibliography', () => {
    expect(CITATIONS.find(c => c.id === 'realsense-tuning-2026')).toMatchObject({
      authors: ['Anders Grunnet-Jepsen', 'John N. Sweetser', 'John Woodfill'],
      year: 2026, url: 'https://dev.realsenseai.com/docs/tuning-depth-cameras-for-best-performance/',
    });
    expect(CITATIONS.find(c => c.id === 'azure-kinect-depth-docs-2026')).toMatchObject({
      authors: ['Microsoft'], year: 2019,
      url: 'https://learn.microsoft.com/en-us/previous-versions/azure/kinect-dk/depth-camera',
    });
    expect(GLOSSARY.filter(t => t.citations.some(id =>
      ['realsense-tuning-2026', 'azure-kinect-depth-docs-2026'].includes(id)))).toEqual([]);
  });

  it('completes exactly the six selected plans with every mandatory source pair', () => {
    expect(selected.map(p => p.rowOrdinal)).toEqual(ordinals);
    expect(selected.reduce((n, p) => n + p.parts.length, 0)).toBe(21);
    expect(selected.reduce((n, p) => n + p.evidence.length, 0)).toBe(22);
    const row30 = selected.find(p => p.rowOrdinal === 30)!;
    expect(row30.parts.find(p => p.id === 'material-illumination-scope')!.requiredCitationIds)
      .toEqual(['azure-kinect-depth-docs-2026', 'realsense-tuning-2026']);
    const section = parseLedger('audit/classical.md', read('audit/classical.md'),
      new Set(CITATIONS.map(c => c.id)), { compoundPlans: plans }).find(s => s.slug === 'perception')!;
    for (const ordinal of ordinals) expect(section.claimRecords[ordinal - 1].evidenceFailures).toEqual([]);
    for (const ordinal of [11, 37, 38, 39, 40, 41]) expect(section.claimRecords[ordinal - 1].evidenceFailures).toEqual([]);
  });
});
